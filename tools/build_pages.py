#!/usr/bin/env python3
"""
Build the public San Francisco page and one personalised page per contractor.

    MAPBOX_TOKEN=pk.xxx python3 build_pages.py --site ~/Downloads/War/KnockPortal/knockportal-site
    python3 build_pages.py --site <site> --token pk.xxx

Reads (all next to this script):
    companies.csv     slug,company[,cluster]  — the cluster column is ignored
    _template.html    one template, two variants (see below)
    page.css page.js fonts/
Writes:
    <site>/public/sf/<slug>.html   one per contractor: noindex, carries a name
    <site>/public/sf.html          the public page: indexable, no name
    <site>/public/sf/page.css, page.js, fonts/

Two things this generator deliberately does NOT do.

It does not read permit data. Every number describing the current snapshot —
permit counts, the window, the group count, the suppression years, the date the
city was pulled — is fetched by the page itself from Supabase Storage at run
time. Snapshots are published without a rebuild, so a number baked in here
would start lying the day after it was written.

It does not read its own output. The Mapbox token used to be lifted out of
public/sf.html; that file is now generated, so the token comes in as --token or
MAPBOX_TOKEN and the generator runs against an empty public/ just as well.

The `cluster` column in companies.csv is dead for the same reason: cluster ids
do not survive a data run, and every page now opens on the whole city.
"""

import argparse, csv, hashlib, os, re, shutil, sys

# The template carries both variants inline; the generator keeps one and drops
# the other. Comment markers rather than __PLACEHOLDERS__ so that the template
# still contains no token that describes a data snapshot.
PERSONAL = re.compile(r"<!--#personal-->(.*?)<!--/#personal-->", re.S)
PUBLIC   = re.compile(r"<!--#public-->(.*?)<!--/#public-->", re.S)


def variant(tpl, personal):
    keep, drop = (PERSONAL, PUBLIC) if personal else (PUBLIC, PERSONAL)
    out = keep.sub(lambda m: m.group(1), tpl)
    # take the line with it when the block owned a whole line, so dropping a
    # variant does not leave a blank line behind in the shipped HTML
    return re.sub(r"[ \t]*" + drop.pattern + r"[ \t]*\n?", "", out, flags=re.S)


def slugify(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return re.sub(r"-{2,}", "-", s)[:40]


def build_id(here):
    """Cache-buster taken from the assets themselves.

    It used to be the timestamp of the data, which tied ?v= to something the
    assets have nothing to do with: publishing a snapshot busted a stylesheet
    that had not changed, and — now that the generator no longer reads data —
    there is no timestamp to take it from. Hash what actually ships instead.
    """
    h = hashlib.sha256()
    for asset in ("page.js", "page.css"):
        with open(os.path.join(here, asset), "rb") as f:
            h.update(f.read())
    return h.hexdigest()[:12]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", required=True)
    ap.add_argument("--companies", default="companies.csv")
    ap.add_argument("--template", default="_template.html")
    ap.add_argument("--token", default="",
                    help="Mapbox public token; falls back to $MAPBOX_TOKEN")
    args = ap.parse_args()

    tok = args.token.strip() or os.environ.get("MAPBOX_TOKEN", "").strip()
    if not tok:
        sys.exit("no Mapbox token: pass --token pk.… or set MAPBOX_TOKEN")

    site = os.path.expanduser(args.site)
    here = os.path.dirname(os.path.abspath(args.template))
    tpl = open(args.template, encoding="utf-8").read()

    out = os.path.join(site, "public", "sf")
    os.makedirs(out, exist_ok=True)

    # shared assets: one copy for all pages, so a redesign touches one file
    for asset in ("page.css", "page.js"):
        src = os.path.join(here, asset)
        if not os.path.exists(src):
            sys.exit(f"missing {asset} next to the template")
        open(os.path.join(out, asset), "w", encoding="utf-8").write(
            open(src, encoding="utf-8").read())

    build = build_id(here)

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

    def render(name, slug, personal):
        html = (variant(tpl, personal)
                .replace("__COMPANY__", name)
                .replace("__SLUG__", slug)
                .replace("__TOKEN__", tok)
                .replace("__BUILD__", build))
        left = re.findall(r"__[A-Z_]+__", html)
        if left:
            sys.exit(f"{slug}: unresolved placeholders {sorted(set(left))}")
        return html

    rows = list(csv.DictReader(open(args.companies, encoding="utf-8")))
    made = []
    for r in rows:
        name = (r.get("company") or "").strip()
        if not name:
            continue
        slug = (r.get("slug") or "").strip() or slugify(name)
        path = os.path.join(out, f"{slug}.html")
        open(path, "w", encoding="utf-8").write(render(name, slug, True))
        made.append((slug, name))

    # /sf is the public surface, not a demo: no company, and no noindex
    pub = os.path.join(site, "public", "sf.html")
    open(pub, "w", encoding="utf-8").write(render("", "sf", False))

    print(f"\n{len(made)} personal pages -> {out}")
    for slug, name in made:
        print(f"  /sf/{slug:<34} {name[:40]}")
    print(f"\npublic page -> {pub}  (indexable, no company name)")
    print(f"asset build id: {build}  (sha256 of page.js + page.css)")
    print("shared assets copied: public/sf/page.css, public/sf/page.js")
    print("data is fetched at run time from Supabase Storage; this generator reads none of it")
    print("rewrites in next.config.mjs (already present):")
    print("  { source: '/sf',       destination: '/sf.html' }")
    print("  { source: '/sf/:slug', destination: '/sf/:slug.html' }")


if __name__ == "__main__":
    main()
