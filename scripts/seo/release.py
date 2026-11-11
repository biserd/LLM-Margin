"""Gate the agent patch, verify the built and live pages, and persist the run."""

import csv
from datetime import datetime, timezone
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from seo_site import (CONTROL_FILES, DIST, HISTORY, ORIGIN, ROOT, WORK, Page, audit,
                      control_signature, load_history, read, site_url, sitemap_urls, write)


SKILLS = ("seo-autopilot", "blog-refresher", "seo-title-optimization")
SITE = "artifacts/tokencalc/"
TRACKED = {
    SITE + name for name in (
        "index.html", "src/App.tsx", "src/lib/comparePairs.ts", "src/components/Navigation.tsx",
        "src/components/Footer.tsx", "src/components/SeoFooter.tsx", "scripts/seo-routes.mjs",
        "scripts/build-seo-files.mjs", "scripts/prerender.mjs", "public/robots.txt", "public/sitemap.xml",
    )
}
STATE = {"seo/keyword-map.csv", "seo/backlog.md", "seo/context.md"}
PATCH = WORK / "out/changes.patch"
RECORD = WORK / "out/record.json"


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def allowed(path):
    return path in TRACKED | STATE or bool(re.fullmatch(
        re.escape(SITE) + r"src/pages/(?!AccountPage|SignInPage|SignUpPage)[A-Za-z0-9-]+\.tsx", path))


def output(name, value):
    if os.getenv("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as file:
            file.write(f"{name}={value}\n")


def evidence_record(evidence, codex):
    site, gsc = evidence["site"], evidence["search_console"]
    return {
        "run": os.getenv("GITHUB_RUN_ID", "local"),
        "attempt": os.getenv("GITHUB_RUN_ATTEMPT", "1"),
        "started_at": datetime.now(timezone.utc).isoformat(),
        "base_commit": git("rev-parse", "HEAD").decode().strip(),
        "codex": codex,
        "site": {key: site[key] for key in ("sitemap_count", "internal_targets", "issues")},
        "source_status": {name: {key: evidence[name][key] for key in ("status", "reason", "window")
                                 if key in evidence[name]} for name in ("search_console", "indexing", "serp", "analytics")},
        "indexing": evidence["indexing"].get("urls", {}),
        "indexing_regressions": evidence["indexing"].get("regressions", []),
        "observed_query_overlap_count": len(evidence.get("observed_query_overlaps", {})),
        "ai_visibility": evidence["ai_visibility"],
        "measurements_completed": gsc.get("measurements", []),
        "blog_position_progress": gsc.get("blog_position_progress", []),
        "edits": [],
        "stages": {},
    }


def candidate(plan, item, key):
    return next((row for row in plan.get(key + "_candidates", [])
                 if row["url"] == item["url"] and row["query"] == item.get("query")
                 and (key != "title" or row["device"] == item.get("device"))), None)


def validate_plan(plan, evidence, record):
    if set(plan.get("stages", {})) != set(SKILLS):
        raise ValueError("The plan must report all three explicitly invoked skills")
    record["stages"] = {name: str(plan["stages"][name])[:2000] for name in SKILLS}
    console = evidence["search_console"]
    baseline_pages = {**evidence["site"]["pages"], **evidence["site"].get("controls", {})}
    seen = set()
    for item in plan.get("edits", []):
        url, kind = item["url"], item["kind"]
        if not site_url(url) or urlsplit(url).query or url in seen:
            raise ValueError(f"Invalid or duplicate edited URL: {url}")
        seen.add(url)
        reason = item.get("reason", "").strip()
        if not reason:
            raise ValueError(f"Missing evidence rationale for {url}")
        edit = {"url": url, "kind": kind, "reason": reason[:2000], "before_html": baseline_pages.get(url)}
        if kind == "health":
            related = set([url] + item.get("finding_urls", []))
            if not related.intersection(finding["url"] for finding in evidence["site"]["issues"]):
                raise ValueError(f"No verified site finding supports {url}")
        elif kind in {"blog", "title", "comparison"}:
            if kind == "comparison":
                if url in baseline_pages or item.get("query") not in read(ROOT / "seo/queries.json")["comparison_research"]:
                    raise ValueError("Comparison must target a researched query and a new URL")
            else:
                baseline = candidate(console, item, kind)
                if not baseline:
                    raise ValueError(f"No qualifying Search Console row supports {url}")
                edit["baseline"] = baseline
                edit["baseline_window"] = console["window"]
            device = item.get("device", "desktop").lower() if kind == "title" else "desktop"
            serp = evidence["serp"].get("results", {}).get(f"{device}:{item.get('query')}", {})
            top = [result["link"] for result in serp.get("results", []) if result.get("position") in {1, 2, 3}]
            sources = item.get("sources", [])
            if len(top) != 3 or not set(top).issubset(sources) or not all(
                isinstance(source, str) and source.startswith("https://") for source in sources
            ):
                raise ValueError(f"Missing the top three SERP sources for {url}")
            edit["sources"] = sources
            edit["query"] = item["query"]
            if kind == "blog" and item.get("title_device"):
                title = candidate(console, {**item, "device": item["title_device"],
                                           "query": item.get("title_query", item["query"])}, "title")
                if not title:
                    raise ValueError(f"No qualifying CTR row for the combined edit of {url}")
                title_serp = evidence["serp"].get("results", {}).get(
                    f"{title['device'].lower()}:{title['query']}", {}).get("results", [])
                title_top = [result["link"] for result in title_serp if result.get("position") in {1, 2, 3}]
                if len(title_top) != 3 or not set(title_top).issubset(sources):
                    raise ValueError(f"Missing title SERP evidence for the combined edit of {url}")
                edit["title_baseline"] = title
        else:
            raise ValueError(f"Unsupported edit kind {kind}")
        record["edits"].append(edit)
    for kind in ("blog", "title", "comparison"):
        if sum(item["kind"] == kind for item in record["edits"]) > 1:
            raise ValueError(f"At most one {kind} edit per run")
    if any("title_baseline" in item for item in record["edits"]) and any(
        item["kind"] == "title" for item in record["edits"]
    ):
        raise ValueError("A combined blog and title edit uses the title slot")


def capture():
    evidence = read(WORK / "evidence.json")
    status = os.environ["SEO_CODEX_STATUS"]
    record = evidence_record(evidence, status)
    write(RECORD, record)
    if status != "success":
        record["stages"] = {name: f"Editor unavailable: {status}" for name in SKILLS}
        record["stages"]["seo-autopilot"] += "; production crawl and available integrations completed"
        write(RECORD, record)
        return
    try:
        if record["base_commit"] != os.getenv("GITHUB_SHA", record["base_commit"]):
            raise ValueError("The editor changed the base commit")
        validate_plan(read(WORK / "plan.json"), evidence, record)
        paths = set(git("diff", "--name-only", "-z", "HEAD").decode().strip("\0").split("\0"))
        paths.update(git("ls-files", "--others", "--exclude-standard", "-z").decode().strip("\0").split("\0"))
        paths.discard("")
        if any(not allowed(path) or not (ROOT / path).is_file() or (ROOT / path).is_symlink() for path in paths):
            raise ValueError("The editor changed an out-of-scope path, deleted a file, or introduced a symlink")
        if bool(paths - STATE) != bool(record["edits"]):
            raise ValueError("The planned URLs and content patch disagree")
        if paths:
            git("add", "--intent-to-add", "--", *sorted(paths))
            patch = git("diff", "--binary", "HEAD", "--", *sorted(paths))
            if len(patch) > 300_000:
                raise ValueError("The patch exceeds 300 KB")
            PATCH.write_bytes(patch)
        record["paths"] = sorted(paths)
    except (ValueError, KeyError, OSError, TypeError, subprocess.SubprocessError) as error:
        PATCH.unlink(missing_ok=True)
        record["rejected_plan"] = str(error)[:500]
    write(RECORD, record)


def check_patch():
    record = read(RECORD)
    paths = git("diff", "--name-only", "-z", "HEAD").decode().strip("\0").split("\0")
    paths = {path for path in paths if path}
    if paths != set(record.get("paths", [])) or any(
        not allowed(path) or not (ROOT / path).is_file() or (ROOT / path).is_symlink() for path in paths
    ):
        raise ValueError("Applied patch differs from the validated path list")
    git("diff", "--check", "HEAD")
    if SITE + "public/sitemap.xml" in paths:
        sitemap_urls((ROOT / (SITE + "public/sitemap.xml")).read_text(encoding="utf-8"))
    with (ROOT / "seo/keyword-map.csv").open(encoding="utf-8", newline="") as file:
        rows = list(csv.DictReader(file))
    targets = {}
    for row in rows:
        if row["target_url"]:
            if not site_url(row["target_url"]):
                raise ValueError("Keyword map has a nonproduction URL")
            targets.setdefault(row["query"].casefold().strip(), set()).add(row["target_url"])
    record["keyword_overlaps"] = {query: sorted(urls) for query, urls in targets.items() if len(urls) > 1}
    write(RECORD, record)


def built():
    record = read(RECORD)
    urls = sitemap_urls((DIST / "sitemap.xml").read_text(encoding="utf-8"))
    pages = {}
    for url in urls:
        route = urlsplit(url).path.strip("/")
        pages[url] = Page((DIST / route / "index.html").read_text(encoding="utf-8")).signature()
    load_history()
    completed = {item["id"] for item in record["measurements_completed"]}
    pending = {item["url"] for item in read(HISTORY / "measurements.json") if item["id"] not in completed}
    for item in record["edits"]:
        url, before = item["url"], item["before_html"]
        path = urlsplit(url).path
        if path in CONTROL_FILES and item["kind"] == "health":
            item["after_html"] = control_signature(200, (DIST / path.lstrip("/")).read_text(encoding="utf-8"))
            continue
        after = pages.get(url)
        if not after or after["canonical"] != [url] or any(
            len(after[key]) != 1 or not all(after[key]) for key in ("title", "description", "h1")
        ):
            raise ValueError(f"Invalid rendered metadata or missing sitemap route: {url}")
        for key in ("title", "description"):
            if sum(page[key] == after[key] for page in pages.values()) != 1:
                raise ValueError(f"Duplicate rendered {key}: {url}")
        if url in pending and before and any(before[key] != after[key] for key in ("title", "h1")):
            raise ValueError(f"Pending 28-day measurement locks title and H1: {url}")
        if item["kind"] == "title" and (not before or before["title"] == after["title"]):
            raise ValueError(f"Title did not change: {url}")
        if item["kind"] == "blog" and (not before or before["main_sha256"] == after["main_sha256"]):
            raise ValueError(f"Blog body did not change: {url}")
        # Link and redirect fixes can leave the text and metadata unchanged.
        item["after_html"] = after
    write(RECORD, record)


def verify(baseline=False):
    record = read(RECORD)
    live = audit()
    before_findings = {(item["code"], item["url"]) for item in record["site"]["issues"]}
    after_findings = {(item["code"], item["url"]) for item in live["issues"]}
    mismatches = []
    for item in record["edits"]:
        expected = item["before_html" if baseline else "after_html"]
        actual = {**live["pages"], **live["controls"]}.get(item["url"])
        if actual != expected:
            mismatches.append(item["url"])
    if not baseline:
        for finding in sorted(after_findings - before_findings):
            mismatches.append(f"{finding[0]}: {finding[1]}")
        health_urls = {item["url"] for item in record["edits"] if item["kind"] == "health"}
        for code, url in sorted(after_findings & before_findings):
            if url in health_urls:
                mismatches.append(f"Unresolved {code}: {url}")
    write(WORK / "verification.json", {"mismatches": mismatches, "site": {
        key: live[key] for key in ("sitemap_count", "internal_targets", "issues")
    }})
    if mismatches:
        print("\n".join(mismatches))
        raise SystemExit(1)


def log():
    record = read(RECORD)
    status = os.environ["SEO_DEPLOYMENT_STATUS"]
    record["deployment"] = {
        "status": status, "source_commit": os.getenv("SEO_RELEASE_COMMIT", ""),
        "previous_worker_version": os.getenv("SEO_PREVIOUS_VERSION", ""),
        "cloudflare_credential": "configured" if os.getenv("CLOUDFLARE_API_TOKEN") else "CLOUDFLARE_API_TOKEN missing",
        "workflow_run": f"{os.getenv('GITHUB_SERVER_URL', 'https://github.com')}/{os.getenv('GITHUB_REPOSITORY', 'biserd/LLM-Margin')}/actions/runs/{record['run']}",
    }
    if (WORK / "verification.json").exists():
        record["deployment"]["verification"] = read(WORK / "verification.json")
    record["live_urls"] = [item["url"] for item in record["edits"]] if status == "verified" else []
    load_history()
    measurements_path = HISTORY / "measurements.json"
    completed = {item["id"] for item in record["measurements_completed"]}
    pending = [item for item in read(measurements_path) if item["id"] not in completed]
    if status == "verified":
        day = datetime.now(ZoneInfo("America/Los_Angeles")).date().isoformat()
        for edit in record["edits"]:
            for kind, baseline in ((edit["kind"], edit.get("baseline")), ("title", edit.get("title_baseline"))):
                if not baseline:
                    continue
                pending.append({
                    "id": f"{record['run']}-{kind}-{urlsplit(edit['url']).path}",
                    "kind": kind, "url": edit["url"], "query": baseline["query"],
                    "device": baseline.get("device"), "published_pacific": day,
                    "before_window": edit["baseline_window"], "before": baseline,
                })
    write(measurements_path, pending)
    write(HISTORY / "runs" / f"{record['started_at'][:10]}-{record['run']}-{record['attempt']}.json", record)
    print(f"SEO release status: {status}; live URLs: {', '.join(record['live_urls']) or 'none'}")
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
            summary.write(f"## Daily SEO\n\n- Sitemap URLs checked: {record['site']['sitemap_count']}\n"
                          f"- Crawl findings: {len(record['site']['issues'])}\n"
                          f"- Editor: {record['codex']}\n- Build: {record.get('build', 'unknown')}\n"
                          f"- Release: {status}\n- Live URLs: {', '.join(record['live_urls']) or 'none'}\n")


def validation():
    record = read(RECORD)
    status = os.environ["SEO_VALIDATION"]
    record["build"] = status
    if status in {"failure", "cancelled"}:
        record["rejected_plan"] = "Build or rendered SEO validation failed"
        PATCH.unlink(missing_ok=True)
    write(RECORD, record)


if __name__ == "__main__":
    commands = {"capture": capture, "patch": check_patch, "built": built, "verify": verify,
                "verify-rollback": lambda: verify(baseline=True), "log": log, "validation": validation}
    commands[sys.argv[1]]()
