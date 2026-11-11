"""Collect evidence before the editor starts, with credentials scoped to this step."""

import base64
from concurrent.futures import ThreadPoolExecutor
import csv
from datetime import date, datetime, timedelta, timezone
import json
import os
import re
import subprocess
import tempfile
from urllib.parse import quote, urlencode, urlsplit
from zoneinfo import ZoneInfo

from seo_site import HISTORY, ORIGIN, ROOT, WORK, audit, load_history, read, request, site_url, write


GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
GA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
BLOGS = {
    ORIGIN + "/blog/how-to-calculate-llm-cost-per-user",
    ORIGIN + "/blog/ai-api-budget-planning-for-startups",
}


def api(url, payload=None, token=None, form=False):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = None
    if payload is not None:
        body = (urlencode(payload) if form else json.dumps(payload)).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded" if form else "application/json"
    status, _, text = request(url, headers=headers, data=body)
    if status != 200:
        raise ValueError(f"{urlsplit(url).hostname} HTTP {status}")
    result = json.loads(text)
    if not isinstance(result, dict) or result.get("error"):
        raise ValueError(f"{urlsplit(url).hostname} returned an API error")
    return result


def encoded(value):
    return base64.urlsafe_b64encode(value).rstrip(b"=")


def google_token(service_account, scope):
    now = int(datetime.now(timezone.utc).timestamp())
    claims = {"iss": service_account["client_email"], "scope": scope, "aud": GOOGLE_TOKEN_URL,
              "iat": now, "exp": now + 3600}
    message = encoded(b'{"alg":"RS256","typ":"JWT"}') + b"." + encoded(json.dumps(claims).encode())
    with tempfile.TemporaryDirectory() as directory:
        key = os.path.join(directory, "key.pem")
        with open(key, "w", encoding="utf-8") as file:
            file.write(service_account["private_key"])
        result = subprocess.run(["openssl", "dgst", "-sha256", "-sign", key], input=message,
                                capture_output=True, check=True, timeout=15)
    assertion = (message + b"." + encoded(result.stdout)).decode()
    return api(GOOGLE_TOKEN_URL, {
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion,
    }, form=True)["access_token"]


def metrics(row):
    return {key: row[key] for key in ("clicks", "impressions", "ctr", "position")} if row else {
        "clicks": 0, "impressions": 0, "ctr": None, "position": None,
    }


def gsc(token, property_id, pages, pending):
    endpoint = "https://www.googleapis.com/webmasters/v3/sites/" + quote(property_id, safe="") + "/searchAnalytics/query"

    def search(start, end, dimensions=(), state="final", filters=()):
        payload = {"startDate": str(start), "endDate": str(end), "dimensions": list(dimensions),
                   "type": "web", "dataState": state, "rowLimit": 25000}
        if filters:
            payload["dimensionFilterGroups"] = [{"filters": [
                {"dimension": dimension, "operator": "equals", "expression": value}
                for dimension, value in filters
            ]}]
        return api(endpoint, payload, token)

    yesterday = datetime.now(ZoneInfo("America/Los_Angeles")).date() - timedelta(days=1)
    recent = search(yesterday - timedelta(days=14), yesterday, ["date"], "all")
    cutoff = recent.get("metadata", {}).get("first_incomplete_date")
    if cutoff:
        end = min(yesterday, date.fromisoformat(cutoff) - timedelta(days=1))
    else:
        final = search(yesterday - timedelta(days=14), yesterday, ["date"]).get("rows", [])
        if not final:
            raise ValueError("Search Console returned no recent finalized days")
        end = max(date.fromisoformat(row["keys"][0]) for row in final)
    start = end - timedelta(days=27)
    combined = []
    for offset in range(0, 50000, 25000):
        payload = {"startDate": str(start), "endDate": str(end), "dimensions": ["page", "query"],
                   "type": "web", "dataState": "final", "rowLimit": 25000, "startRow": offset}
        batch = api(endpoint, payload, token).get("rows", [])
        combined.extend(batch)
        if len(batch) < 25000:
            break
    queries = [{"url": row["keys"][0], "query": row["keys"][1], **metrics(row)} for row in combined
               if row["keys"][0] in pages]
    rows = [row for row in search(start, end, ["page", "device"]).get("rows", [])
            if row["keys"][0] in pages and row["impressions"] >= 20]
    page_rows = {row["keys"][0]: metrics(row) for row in search(start, end, ["page"]).get("rows", [])}
    pending_urls = {item["url"] for item in pending if item["kind"] in {"title", "blog"}}
    blog = sorted(
        (row for row in queries if row["url"] in BLOGS - pending_urls
         and 8 <= row["position"] <= 20 and row["impressions"] >= 30),
        key=lambda row: (-row["impressions"], row["position"]),
    )
    top_queries = {}
    for row in sorted(queries, key=lambda item: -item["impressions"]):
        top_queries.setdefault(row["url"], row["query"])
    title = []
    for row in rows:
        url, device = row["keys"]
        if (url in pending_urls or url not in top_queries or url not in page_rows
                or row["impressions"] < 100 or row["position"] > 20):
            continue
        peers = [peer for peer in rows if peer["keys"] != row["keys"] and peer["keys"][1] == device
                 and int((peer["position"] - 1) / 2) == int((row["position"] - 1) / 2)]
        impressions = sum(peer["impressions"] for peer in peers)
        if len(peers) < 5 or impressions < 500:
            continue
        benchmark = sum(peer["clicks"] for peer in peers) / impressions
        if benchmark > 0 and row["ctr"] < 0.7 * benchmark and benchmark - row["ctr"] >= 0.003:
            title.append({"url": url, "query": top_queries[url], "device": device, **metrics(row),
                          "baseline_page": page_rows[url], "peer_ctr": benchmark,
                          "peer_count": len(peers), "peer_impressions": impressions,
                          "estimated_click_gap": (benchmark - row["ctr"]) * row["impressions"]})
    title.sort(key=lambda row: -row["estimated_click_gap"])

    def measure(item):
        first = date.fromisoformat(item["published_pacific"]) + timedelta(days=1)
        last = first + timedelta(days=27)
        if last > end:
            return None
        filters = [("page", item["url"])]
        if item["kind"] == "blog":
            filters.append(("query", item["query"]))
        if item["kind"] == "title":
            filters.append(("device", item["device"]))
        result = search(first, last, filters=filters).get("rows", [])
        return {**item, "after_window": [str(first), str(last)], "after": metrics(result[0] if result else None)}

    measured = [result for item in pending if (result := measure(item))]
    by_page_query = {(row["url"], row["query"]): row for row in queries}
    progress = []
    for item in pending:
        if item["kind"] == "blog":
            row = by_page_query.get((item["url"], item["query"]))
            progress.append({"url": item["url"], "query": item["query"], "target_position": 3,
                             "window": [str(start), str(end)], "current": metrics(row),
                             "full_post_release_window": start > date.fromisoformat(item["published_pacific"])})
    return {"status": "checked", "property": property_id, "window": [str(start), str(end)],
            "blog_candidates": blog[:10], "title_candidates": title[:10], "measurements": measured,
            "blog_position_progress": progress,
            "queries": sorted(queries, key=lambda row: -row["impressions"])[:300]}


def unchecked(reason):
    return {"status": "unchecked", "reason": reason}


def check(source, action):
    try:
        return action()
    except (ValueError, KeyError, TypeError, IndexError, OSError, subprocess.SubprocessError) as error:
        # Provider errors must not echo credentials, request bodies, or provider-supplied text.
        message = str(error)
        safe = message if re.fullmatch(r"[a-z.]+ HTTP \d+|Search Console returned no recent finalized days", message) else type(error).__name__
        return unchecked(f"{source}: {safe}")


def index_status(url, token, property_id):
    result = api("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
                 {"inspectionUrl": url, "siteUrl": property_id}, token)["inspectionResult"]["indexStatusResult"]
    return {key: result.get(key) for key in ("verdict", "coverageState", "robotsTxtState",
                                            "indexingState", "googleCanonical", "lastCrawlTime")}


def serp_request(key, **params):
    return api("https://serpapi.com/search.json?" + urlencode({**params, "api_key": key}))


def serp(key, query, device="desktop"):
    return serp_request(key, engine="google", q=query, gl="us", hl="en", google_domain="google.com",
                        device=device.lower())


def research_serps(key, candidates, comparison_queries):
    targets = [(row["query"], row.get("device", "desktop").lower()) for row in candidates]
    targets += [(query, "desktop") for query in comparison_queries]
    results = {}
    for query, device in dict.fromkeys(targets):
        if device not in {"mobile", "desktop", "tablet"}:
            continue
        def load():
            rows = serp(key, query, device).get("organic_results", [])
            return {"status": "checked", "results": [
                {key: row.get(key) for key in ("position", "title", "link", "snippet")}
                for row in rows[:10]
            ]}
        results[f"{device}:{query}"] = check("SERP", load)
    return {"status": "checked", "locale": "US/en", "comparison_queries": comparison_queries, "results": results}


def visibility(text, citations):
    urls = sorted({url for url in citations if isinstance(url, str) and url.startswith("https://")})
    return {"status": "checked", "mentioned": bool(re.search(r"\bllm\s*margin\b", text, re.I)),
            "cited_urls": urls, "brand_cited_urls": [url for url in urls if site_url(url)]}


def ai_overview(key, query):
    result = serp(key, query).get("ai_overview")
    if not result:
        return {"status": "not_shown", "mentioned": None, "cited_urls": []}
    if result.get("page_token"):
        result = serp_request(key, engine="google_ai_overview", page_token=result["page_token"])["ai_overview"]
    if not result.get("text_blocks"):
        return unchecked("Overview response did not include answer text")
    return visibility(json.dumps(result["text_blocks"]),
                      [item.get("link") for item in result.get("references", [])])


def perplexity(key, query):
    result = api("https://api.perplexity.ai/v1/sonar", {
        "model": "sonar", "messages": [{"role": "user", "content": query}], "max_tokens": 800,
    }, key)
    return visibility(result["choices"][0]["message"]["content"], result.get("citations", []))


def analytics(service_account, property_id):
    if not property_id.isdecimal():
        raise ValueError("Expected a numeric GA4 property ID")
    result = api(f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport", {
        "dateRanges": [{"startDate": "30daysAgo", "endDate": "3daysAgo"}],
        "dimensions": [{"name": "landingPage"}, {"name": "sessionDefaultChannelGroup"}],
        "metrics": [{"name": "sessions"}, {"name": "keyEvents"}],
        "dimensionFilter": {"filter": {"fieldName": "sessionDefaultChannelGroup",
                                      "stringFilter": {"value": "Organic Search"}}},
        "limit": 100,
    }, google_token(service_account, GA_SCOPE))
    return {"status": "checked", "rows": result.get("rows", [])}


def main():
    site = audit()
    write(WORK / "site.json", site)
    load_history()
    pending = read(HISTORY / "measurements.json")
    raw_google = os.getenv("GSC_SERVICE_ACCOUNT_JSON")
    service_account = check("Google service account", lambda: json.loads(raw_google)) if raw_google else None
    console = unchecked("GSC_SERVICE_ACCOUNT_JSON is missing")
    indexing = console
    if service_account:
        token = check("Google authorization", lambda: google_token(service_account, GSC_SCOPE))
        if isinstance(token, str):
            property_id = os.getenv("SEO_GSC_PROPERTY") or "sc-domain:" + urlsplit(ORIGIN).hostname
            console = check("Search Console", lambda: gsc(token, property_id, site["pages"], pending))
            urls = sorted(site["pages"])
            with ThreadPoolExecutor(max_workers=4) as pool:
                results = pool.map(lambda url: check("URL Inspection", lambda: index_status(url, token, property_id)), urls)
                indexing = {"status": "checked", "urls": dict(zip(urls, results))}
            previous_path = HISTORY / "latest.json"
            previous = read(previous_path).get("indexing", {}) if previous_path.exists() else {}
            indexing["regressions"] = [
                {"url": url, "before": previous[url], "after": row}
                for url, row in indexing["urls"].items() if previous.get(url, {}).get("verdict") == "PASS"
                and row.get("verdict") and (row["verdict"] != "PASS" or (
                    previous[url].get("googleCanonical") == url and row.get("googleCanonical") != url
                ))
            ]
        else:
            console = indexing = token
    serp_key = os.getenv("SERPAPI_API_KEY")
    pplx_key = os.getenv("PERPLEXITY_API_KEY")
    defaults = read(ROOT / "seo/queries.json")["comparison_research"]
    with (ROOT / "seo/keyword-map.csv").open(encoding="utf-8", newline="") as file:
        mapped = list(csv.DictReader(file))
    live_queries = {row["query"] for row in mapped if row["status"] == "live"}
    gaps = [row["query"] for row in mapped if row["intent"] == "comparison" and row["status"] == "gap"]
    comparison_queries = [query for query in dict.fromkeys([*gaps, *defaults]) if query not in live_queries][:3]
    serp_data = (research_serps(serp_key, console.get("blog_candidates", [])[:3] +
                              console.get("title_candidates", [])[:3], comparison_queries)
                 if serp_key else unchecked("SERPAPI_API_KEY is missing"))
    ai = {}
    for query in read(ROOT / "seo/queries.json")["ai_visibility"]:
        ai[query] = {
            "ChatGPT Search": unchecked("No ChatGPT Search measurement integration is configured"),
            "Perplexity Sonar": (check("Perplexity", lambda: perplexity(pplx_key, query))
                                 if pplx_key else unchecked("PERPLEXITY_API_KEY is missing")),
            "Google AI Overviews": (check("Google AI Overviews", lambda: ai_overview(serp_key, query))
                                    if serp_key else unchecked("SERPAPI_API_KEY is missing")),
        }
    property_id = os.getenv("SEO_GA4_PROPERTY_ID")
    ga = (check("GA4", lambda: analytics(service_account, property_id)) if property_id and service_account
          else unchecked("SEO_GA4_PROPERTY_ID and GSC_SERVICE_ACCOUNT_JSON are required"))
    query_targets = {}
    for row in console.get("queries", []):
        if row["impressions"] >= 10:
            query_targets.setdefault(row["query"], []).append(row["url"])
    overlaps = {query: sorted(set(urls)) for query, urls in query_targets.items() if len(set(urls)) > 1}
    write(WORK / "evidence.json", {"site": site, "search_console": console, "indexing": indexing,
                                  "observed_query_overlaps": overlaps,
                                  "serp": serp_data, "analytics": ga, "ai_visibility": ai})
    print(f"Checked {site['sitemap_count']} production sitemap URLs; {len(site['issues'])} findings.")


if __name__ == "__main__":
    main()
