#!/usr/bin/env python3
"""
Build one personalised canvassing page per contractor.

    python3 build_pages.py --site ~/Downloads/War/KnockPortal/knockportal-site

Reads:
    companies.csv                    slug,company,cluster   (cluster may be blank)
    <site>/public/sf.html            only to lift the Mapbox token
    <site>/public/data/clusters.json to pick a default cluster and sanity-check
Writes:
    <site>/public/sf/<slug>.html

Blank `cluster` means "open on the biggest cluster of the window" — for SF that
is the honest default: the city is 7x7 miles and every local roofer works all of
it, so the neighbourhood switcher matters more than the opening view.
"""

import argparse, csv, datetime as dt, json, os, re, shutil, sys

MONTHS = ["", "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]

def token_from(site):
    p = os.path.join(site, "public", "sf.html")
    m = re.search(r"MAPBOX_TOKEN\s*=\s*'([^']+)'", open(p, encoding="utf-8").read())
    if not m:
        sys.exit(f"no Mapbox token found in {p}")
    return m.group(1)

def slugify(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return re.sub(r"-{2,}", "-", s)[:40]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", required=True)
    ap.add_argument("--companies", default="companies.csv")
    ap.add_argument("--template", default="_template.html")
    ap.add_argument("--price", default="", help="postcard unit price, e.g. 1.40; blank = no dollar figure")
    args = ap.parse_args()

    site = os.path.expanduser(args.site)
    data = os.path.join(site, "public", "data")
    idx = json.load(open(os.path.join(data, "clusters.json"), encoding="utf-8"))
    meta, clusters = idx["meta"], idx["clusters"]
    known = {str(c["cluster"]) for c in clusters}
    biggest = str(sorted(clusters, key=lambda c: (-c["permits"], -c["neighbours"]))[0]["cluster"])

    first = min(c["first"] for c in clusters)
    last = max(c["last"] for c in clusters)
    def pretty(d):
        y, m, dd = d.split("-")
        return f"{['','January','February','March','April','May','June','July','August','September','October','November','December'][int(m)]} {int(dd)}"
    window = f"{pretty(first)} – {pretty(last)}"
    # "recent" is anchored to the data window, never to the day the page is
    # opened: a static page must not quietly reclassify a roof a month from now
    _last = dt.date.fromisoformat(last)
    recent_since = _last.replace(year=_last.year - 1).isoformat()
    recent_since_label = MONTHS[_last.month] + " " + str(_last.year - 1)
    window_short = f"{pretty(first)}–{pretty(last)}"

    tpl = open(args.template, encoding="utf-8").read()
    build = meta["generated"].replace(" ", "").replace(":", "").replace("-", "")[:12]
    tok = token_from(site)
    out = os.path.join(site, "public", "sf")
    os.makedirs(out, exist_ok=True)
    # shared assets: one copy for all pages, so a redesign touches one file
    here = os.path.dirname(os.path.abspath(args.template))
    for asset in ("page.css", "page.js"):
        src = os.path.join(here, asset)
        if not os.path.exists(src):
            sys.exit(f"missing {asset} next to the template")
        open(os.path.join(out, asset), "w", encoding="utf-8").write(
            open(src, encoding="utf-8").read())

    # self-hosted webfonts: page.css resolves them relative to itself, so they
    # have to land in public/sf/fonts/. A missing font 404s silently and the
    # page falls back to a system face — invisible on a machine that has Barlow
    # installed, wrong everywhere else. Hard-fail instead.
    css = open(os.path.join(here, "page.css"), encoding="utf-8").read()
    if "fonts/" in css:
        fsrc = os.path.join(here, "fonts")
        if not os.path.isdir(fsrc):
            sys.exit("page.css references fonts/ but no fonts directory next to the template")
        fdst = os.path.join(out, "fonts")
        os.makedirs(fdst, exist_ok=True)
        wanted = sorted(set(re.findall(r"url\('fonts/([^']+)'\)", css)))
        for f in wanted:
            fp = os.path.join(fsrc, f)
            if not os.path.exists(fp):
                sys.exit(f"page.css asks for fonts/{f} but it is not in {fsrc}")
            shutil.copyfile(fp, os.path.join(fdst, f))
        print(f"fonts copied: {len(wanted)} files -> public/sf/fonts/")

    rows = list(csv.DictReader(open(args.companies, encoding="utf-8")))
    made = []
    for r in rows:
        name = (r.get("company") or "").strip()
        if not name:
            continue
        slug = (r.get("slug") or "").strip() or slugify(name)
        cid = (r.get("cluster") or "").strip()
        if cid and cid not in known:
            print(f"  ! {slug}: cluster {cid} not in this run, falling back to {biggest}")
            cid = ""
        cid = cid or biggest

        html = (tpl
                .replace("__COMPANY__", name)
                .replace("__SLUG__", slug)
                .replace("__START__", cid)
                .replace("__TOKEN__", tok)
                .replace("__PRICE__", args.price.strip() or "null")
                .replace("__DAYS__", str(meta["window_days"]))
                .replace("__PERMITS__", str(meta["permits_in_clusters"]))
                .replace("__CLUSTERS__", str(meta["clusters"]))
                .replace("__RECENT_SINCE_LABEL__", recent_since_label)
                .replace("__RECENT_SINCE__", recent_since)
                .replace("__YEARS__", str(meta["suppress_years"]))
                .replace("__WINDOW_SHORT__", window_short)
                .replace("__WINDOW__", window)
                .replace("__GENERATED__", meta["generated"])
                .replace("__BUILD__", build))
        left = re.findall(r"__[A-Z_]+__", html)
        if left:
            sys.exit(f"{slug}: unresolved placeholders {sorted(set(left))}")

        path = os.path.join(out, f"{slug}.html")
        open(path, "w", encoding="utf-8").write(html)
        made.append((slug, name, cid))

    print(f"\n{len(made)} pages -> {out}")
    for slug, name, cid in made:
        print(f"  /sf/{slug:<34} {name[:32]:<32} cluster {cid}")
    print(f"\nwindow {window} · {meta['clusters']} clusters · "
          f"{len(meta['neighbourhoods'])} neighbourhoods · data {meta['generated']}")
    print("\nshared assets copied: public/sf/page.css, public/sf/page.js")
    print("rewrite in next.config.mjs (already added):")
    print("  { source: '/sf/:slug', destination: '/sf/:slug.html' }")

if __name__ == "__main__":
    main()
