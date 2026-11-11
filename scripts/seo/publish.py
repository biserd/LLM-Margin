"""Publish a validated patch via the configured Worker, with separate credentials."""

import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time

from release import PATCH, RECORD, check_patch, log
from seo_site import DIST, HISTORY, HISTORY_REF, ROOT, WORK, read


def run(*args, cwd=ROOT, check=True, capture=False):
    return subprocess.run(args, cwd=cwd, check=check, text=True, capture_output=capture)


def git(*args):
    return run("git", *args, capture=True).stdout.strip()


def command_json(*args):
    return json.loads(run(*args, capture=True).stdout)


def current_worker():
    deployments = command_json("pnpm", "exec", "wrangler", "deployments", "list", "--json")
    versions = max(deployments, key=lambda item: item["created_on"])["versions"]
    if len(versions) != 1 or versions[0]["percentage"] != 100:
        raise ValueError("Production is on a split deployment")
    return versions[0]["version_id"]


def verify(command):
    return run("python", "scripts/seo/release.py", command, check=False).returncode == 0


def sync_main():
    run("git", "fetch", "origin", "+refs/heads/main:refs/remotes/origin/main")
    return git("rev-parse", "refs/remotes/origin/main")


def revert_source(commit):
    if sync_main() != commit:
        print("Main advanced after publishing. Source rollback requires a fresh diff.")
        return False
    reverted = run("git", "revert", "--no-edit", commit, check=False).returncode == 0
    return reverted and run("git", "push", "origin", "HEAD:main", check=False).returncode == 0


def protected_pull_request(record):
    if os.getenv("SEO_HAS_PR_TOKEN") != "true":
        print("Protected main requires SEO_GITHUB_TOKEN for pull request creation and merge events.")
        return "blocked: SEO_GITHUB_TOKEN missing for protected branch"
    if not command_json("gh", "api", "repos/" + os.environ["GITHUB_REPOSITORY"])["allow_auto_merge"]:
        print("Enable Allow auto-merge in GitHub repository settings.")
        return "blocked: GitHub Allow auto-merge is disabled"
    branch = f"seo/automated-{record['run']}-{record['attempt']}"
    run("git", "push", "origin", f"HEAD:refs/heads/{branch}")
    pr = run("gh", "pr", "create", "--base", "main", "--head", branch,
             "--title", "Apply verified daily SEO edits",
             "--body", f"Validated in {os.environ['GITHUB_SERVER_URL']}/{os.environ['GITHUB_REPOSITORY']}/actions/runs/{record['run']}.",
             capture=True).stdout.strip()
    merge = run("gh", "pr", "merge", pr, "--auto", "--squash", check=False)
    return f"{'awaiting merge' if merge.returncode == 0 else 'blocked: auto-merge rejected'}: {pr}"


def publish(record):
    resumed = os.environ.get("SEO_MERGED_HEAD", "")
    needs_deploy = bool(record["edits"])
    if record.get("rejected_plan"):
        return "blocked: candidate rejected"
    if not PATCH.exists():
        return "no qualifying changes" if record["codex"] == "success" else record["codex"]
    if needs_deploy and not os.getenv("CLOUDFLARE_API_TOKEN"):
        return "blocked: CLOUDFLARE_API_TOKEN missing"
    if needs_deploy:
        os.environ["SEO_PREVIOUS_VERSION"] = current_worker()
        if not (DIST / "sitemap.xml").exists():
            raise ValueError("Validated Worker assets are missing")

    main = sync_main()
    if resumed:
        # A squash merge has a different SHA but the same source tree.
        run("git", "fetch", "origin", resumed)
        if git("rev-parse", f"{resumed}^") != record["base_commit"] or git("diff", "--name-only", resumed, main):
            return "blocked: merged content differs from validated source"
        if git("rev-parse", "HEAD") != main:
            return "blocked: main advanced before deployment"
        # A merged PR needs the same validated patch on its original base.
        run("git", "apply", "--reverse", "--check", str(PATCH))
        commit = main
    else:
        if main != record["base_commit"] or git("rev-parse", "HEAD") != main:
            return "blocked: main advanced after the audit"
        run("git", "apply", "--index", str(PATCH))
        check_patch()
        run("git", "commit", "-m", "Apply verified daily SEO updates")
        commit = git("rev-parse", "HEAD")
        push = run("git", "push", "origin", "HEAD:main", check=False, capture=True)
        if push.returncode:
            if re.search(r"GH006|GH013|protected branch|repository rule", push.stderr, re.I):
                return protected_pull_request(record)
            print(push.stderr)
            return "blocked: GitHub rejected source push"
    os.environ["SEO_RELEASE_COMMIT"] = commit
    if not needs_deploy:
        return "keyword map/state updated"

    # Same Worker and deployment command used by the repo. The allowlist
    # excludes D1 migrations and Worker code, so only validated site assets change.
    deploy = run("pnpm", "exec", "wrangler", "deploy", check=False)
    deployed_version = current_worker()
    if deployed_version == os.environ["SEO_PREVIOUS_VERSION"]:
        reason = "deploy failed" if deploy.returncode else "deploy failed to activate a new version"
        return f"{reason}; source {'reverted' if revert_source(commit) else 'rollback blocked'}"
    os.environ["SEO_WORKER_VERSION"] = deployed_version
    for delay in (5, 20):
        time.sleep(delay)
        if verify("verify") and run("node", "scripts/verify-public.mjs", check=False).returncode == 0:
            return "verified"
    if current_worker() != deployed_version:
        return "verification failed; a newer Worker deployment prevents automatic rollback"
    rollback = run("pnpm", "exec", "wrangler", "rollback", os.environ["SEO_PREVIOUS_VERSION"],
                   "--yes", "--message", "Restore previous Worker after SEO release verification failed", check=False)
    if rollback.returncode:
        return "verification failed; Worker rollback failed"
    source_reverted = revert_source(commit)
    time.sleep(5)
    restored = verify("verify-rollback")
    return f"rolled back Worker (verified={restored}); source reverted={source_reverted}"


def archive():
    base = run("git", "rev-parse", "--verify", HISTORY_REF, check=False, capture=True)
    with tempfile.TemporaryDirectory() as directory:
        tree = Path(directory) / "history"
        run("git", "worktree", "add", "--detach", str(tree), base.stdout.strip() if base.returncode == 0 else "HEAD")
        try:
            for relative in ("measurements.json", *[str(path.relative_to(HISTORY)) for path in (HISTORY / "runs").glob("*.json")]):
                target = tree / "seo" / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(HISTORY / relative, target)
            run("git", "add", "--", "seo/measurements.json", "seo/runs", cwd=tree)
            if run("git", "diff", "--cached", "--quiet", cwd=tree, check=False).returncode:
                run("git", "commit", "-m", "Record daily SEO run", cwd=tree)
                run("git", "push", "origin", "HEAD:refs/heads/seo-history", cwd=tree)
        finally:
            run("git", "worktree", "remove", str(tree))


if __name__ == "__main__":
    run("git", "config", "user.name", "github-actions[bot]")
    run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
    record = read(RECORD)
    try:
        status = publish(record)
    except (subprocess.SubprocessError, ValueError, OSError, KeyError) as error:
        print(f"Release failed: {type(error).__name__}: {error}")
        status = "release failed; inspect run logs"
    os.environ["SEO_DEPLOYMENT_STATUS"] = status
    log()
    archive()
    if status.startswith(("release failed", "deploy failed", "verification failed", "rolled back")):
        raise SystemExit(1)
