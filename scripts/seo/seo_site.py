"""Read the public site and compare rendered HTML from the existing build."""

from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import subprocess
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[2]
ORIGIN = json.loads((ROOT / "wrangler.jsonc").read_text(encoding="utf-8"))["vars"]["APP_BASE_URL"]
DIST = ROOT / "artifacts/tokencalc/dist/public"
WORK = ROOT / ".seo-work"
HISTORY = WORK / "history"
HISTORY_REF = "refs/remotes/origin/seo-history"
CONTROL_FILES = ("/robots.txt", "/sitemap.xml")
SPA_ROUTES = {"/account", "/sign-in", "/sign-up"}


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def request(url, *, headers=None, data=None):
    req = Request(url, data=data, headers={
        "User-Agent": "LLMMargin-SEO-Audit/1.0",
        "Accept": "text/html",
        **(headers or {}),
    })
    try:
        with build_opener(NoRedirect()).open(req, timeout=20) as res:
            return res.status, dict(res.headers.items()), res.read(4_000_001).decode("utf-8", "replace")
    except HTTPError as err:
        return err.code, dict(err.headers.items()), ""
    except (URLError, TimeoutError, OSError, ValueError):
        return 0, {}, ""


def header(headers, name):
    return next((value for key, value in headers.items() if key.lower() == name.lower()), "")


def normalize(text):
    return " ".join(text.split())


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.titles, self.descriptions, self.canonicals, self.headings = [], [], [], []
        self.links, self.robots, self.content = set(), [], []
        self.target, self.main, self.hidden, self.svg = None, False, False, 0
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        if tag == "svg":
            self.svg += 1
        if self.svg:
            return
        attrs = dict(attrs)
        if tag in {"script", "style"}:
            self.hidden = True
        if tag == "main":
            self.main = True
        if tag in {"title", "h1"}:
            self.target = tag
            self.text = []
        if tag == "meta":
            name = (attrs.get("name") or "").lower()
            if name == "description":
                self.descriptions.append(normalize(attrs.get("content") or ""))
            if name in {"robots", "googlebot"}:
                self.robots.append(attrs.get("content") or "")
        if tag == "link" and "canonical" in (attrs.get("rel") or "").lower().split():
            self.canonicals.append(attrs.get("href") or "")
        if tag == "a" and attrs.get("href") and not attrs["href"].startswith("#"):
            self.links.add(attrs["href"])

    def handle_endtag(self, tag):
        if tag == "svg":
            self.svg -= 1
            return
        if self.svg:
            return
        if tag in {"script", "style"}:
            self.hidden = False
        if tag == "main":
            self.main = False
        if tag == self.target:
            (self.titles if tag == "title" else self.headings).append(normalize(" ".join(self.text)))
            self.target = None

    def handle_data(self, data):
        if self.hidden or self.svg:
            return
        if self.target:
            self.text.append(data)
        if self.main:
            self.content.append(data)

    def signature(self):
        return {
            "title": self.titles, "description": self.descriptions,
            "canonical": self.canonicals, "h1": self.headings,
            "main_sha256": sha256(normalize(" ".join(self.content)).encode()).hexdigest(),
            "links_sha256": sha256("\n".join(sorted(self.links)).encode()).hexdigest(),
        }


def control_signature(status, body):
    return {"status": status, "body_sha256": sha256(body.replace("\r\n", "\n").strip().encode()).hexdigest()}


def site_url(url):
    return url.startswith(ORIGIN + "/") and not urlsplit(url).fragment


def sitemap_urls(body):
    root = ET.fromstring(body)
    if root.tag.split("}")[-1] != "urlset":
        raise ValueError("expected a sitemap URL set")
    return [node.text.strip() for node in root.findall("./{*}url/{*}loc") if node.text]


def robots_allows(body, path):
    groups, agents, rules = [], [], []
    for line in body.splitlines():
        key, _, value = line.split("#", 1)[0].partition(":")
        key, value = key.strip().lower(), value.strip()
        if key == "user-agent":
            if rules:
                groups.append((agents, rules))
                agents, rules = [], []
            agents.append(value.lower())
        elif key in {"allow", "disallow"} and agents:
            rules.append((key, value))
    groups.append((agents, rules))
    selected = "googlebot" if any("googlebot" in names for names, _ in groups) else "*"
    matches = []
    for names, rules in groups:
        if selected not in names:
            continue
        for action, pattern in rules:
            if not pattern:
                continue
            regex = re.escape(pattern.removesuffix("$")).replace(r"\*", ".*")
            if re.match(regex + ("$" if pattern.endswith("$") else ""), path):
                matches.append((len(pattern.replace("*", "").removesuffix("$")), action == "allow"))
    return max(matches, default=(0, True))[1]


def audit():
    issues, pages, controls = [], {}, {}
    def issue(code, url, detail):
        issues.append({"code": code, "url": url, "detail": detail})

    sitemap = ORIGIN + "/sitemap.xml"
    status, _, xml = request(sitemap, headers={"Accept": "application/xml"})
    controls[sitemap] = control_signature(status, xml)
    urls = []
    try:
        if status != 200:
            raise ValueError(f"HTTP {status}")
        urls = sitemap_urls(xml)
        if not urls:
            raise ValueError("empty sitemap")
        if len(urls) != len(set(urls)):
            issue("duplicate-sitemap-url", sitemap, "Duplicate <loc> values")
    except (ET.ParseError, ValueError) as error:
        issue("sitemap", sitemap, str(error))
    expected = (ROOT / "artifacts/tokencalc/public/sitemap.xml").read_text(encoding="utf-8")
    for url in sorted(set(sitemap_urls(expected)) - set(urls)):
        issue("missing-sitemap-url", url, "Present in the repository sitemap")
    for url in set(urls):
        if not site_url(url):
            issue("off-domain-sitemap-url", sitemap, url)

    robots_url = ORIGIN + "/robots.txt"
    status, _, robots = request(robots_url, headers={"Accept": "text/plain"})
    controls[robots_url] = control_signature(status, robots)
    if status != 200 or not re.search(r"^\s*user-agent\s*:", robots, re.I | re.M):
        issue("robots", robots_url, f"HTTP {status}; expected robots directives")
    elif not any(line.strip().lower() == f"sitemap: {sitemap}" for line in robots.splitlines()):
        issue("robots-sitemap", robots_url, f"Missing Sitemap: {sitemap}")

    urls = sorted({url for url in urls if site_url(url)} or set(sitemap_urls(expected)))
    links = {}
    duplicates = {"title": {}, "description": {}}
    with ThreadPoolExecutor(max_workers=8) as pool:
        for url, (status, headers, html) in zip(urls, pool.map(request, urls)):
            if status != 200:
                issue("sitemap-http", url, f"HTTP {status}; {header(headers, 'Location')}")
                continue
            page = Page(html)
            pages[url] = page.signature()
            if page.canonicals != [url]:
                issue("canonical", url, page.canonicals)
            if re.search(r"\b(noindex|none)\b", " ".join([*page.robots, header(headers, "X-Robots-Tag")]), re.I):
                issue("noindex", url, "Found in HTML or response headers")
            if not robots_allows(robots, urlsplit(url).path):
                issue("robots-blocked", url, "Googlebot is disallowed")
            if not normalize(" ".join(page.content)) or len(page.headings) != 1 or not all(page.headings):
                issue("main-content", url, "Expected server-rendered main content and one named H1")
            for field, values in (("title", page.titles), ("description", page.descriptions)):
                if len(values) != 1 or not all(values):
                    issue("metadata", url, f"Expected one nonempty {field}; found {values}")
                else:
                    duplicates[field].setdefault(values[0].casefold(), []).append(url)
            for href in sorted(page.links):
                target = urlsplit(urljoin(url, href))
                destination = f"{target.scheme}://{target.netloc}{target.path or '/'}"
                if site_url(destination):
                    links.setdefault(destination, set()).add(url)

        non_sitemap_links = sorted(set(links) - set(pages))
        for target, (status, headers, html) in zip(non_sitemap_links, pool.map(request, non_sitemap_links)):
            location = urljoin(target, header(headers, "Location"))
            if status in range(300, 400):
                if location not in pages:
                    issue("internal-redirect", target, {"to": location, "from": sorted(links[target])})
            else:
                path = urlsplit(target).path
                fallback = header(headers, "Content-Type").startswith("text/html") and (
                    not Page(html).headings or (
                        path not in SPA_ROUTES and not path.startswith("/quote/")
                        and Page(html).signature() == pages.get(ORIGIN + "/")
                    )
                )
                if status != 200 or fallback:
                    issue("internal-link", target, {"status": status, "from": sorted(links[target])})

    for field, values in duplicates.items():
        for members in values.values():
            if len(members) > 1:
                for url in members:
                    issue("duplicate-" + field, url, members)
    for url in pages:
        if url != ORIGIN + "/" and not (links.get(url, set()) - {url}):
            issue("orphan", url, "No incoming links from another sitemap page")
    return {"pages": pages, "controls": controls, "sitemap_count": len(urls),
            "internal_targets": len(links), "issues": issues}


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_history():
    ref = subprocess.run(["git", "rev-parse", "--verify", HISTORY_REF], cwd=ROOT,
                         capture_output=True, text=True)
    if ref.returncode != 0:
        write(HISTORY / "measurements.json", read(ROOT / "seo/measurements.json"))
        return
    def show(path):
        return json.loads(subprocess.check_output(["git", "show", f"{HISTORY_REF}:{path}"], cwd=ROOT))
    write(HISTORY / "measurements.json", show("seo/measurements.json"))
    names = subprocess.check_output(["git", "ls-tree", "--name-only", HISTORY_REF, "seo/runs/"],
                                    cwd=ROOT, text=True).splitlines()
    if names:
        write(HISTORY / "latest.json", show(sorted(names)[-1]))


if __name__ == "__main__":
    result = audit()
    write(WORK / "site.json", result)
    print(f"Checked {result['sitemap_count']} sitemap URLs and {result['internal_targets']} link targets; "
          f"{len(result['issues'])} findings.")
