#!/usr/bin/env python3
"""Bake Best Driving Roads CSS, JS, GitHub Pages preview, and Squarespace embed."""
from __future__ import annotations

import json
import re
from base64 import b64encode
from hashlib import sha384
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DOCS = ROOT / "docs"
ROUTES = json.loads((ROOT / "routes.json").read_text())
SRC_MILL = DOCS / "index.src.html"
FINDER_CSS_SRC = ROOT / "finder.css"
FINDER_JS = ROOT / "finder.js"
EMBED_VERSION = "20260916-roads3"
EMBED_BASE = "https://dsiddens2.github.io/FBG-Drive-Days/"
HOME_PAGE = "https://discoverfbg.com/"
EMBED_OUT = ROOT / "squarespace-embed.html"
CODE_BLOCK_LIMIT = 400 * 1024
EXTRAS_MARK = "/* --- drive extras --- */"

EXTRA_CSS = """
#fbg-drive-finder .filter-reset-wrap {
  flex-wrap: wrap;
}
#fbg-drive-finder .item-name {
  white-space: normal;
}
#fbg-drive-finder .list > li {
  cursor: pointer;
}
#fbg-drive-finder .list > li:hover {
  background: rgba(224, 176, 96, 0.08);
}
#fbg-drive-finder .list > li:focus-visible {
  outline: 2px solid #e0b060;
  outline-offset: 2px;
}
#fbg-drive-finder .item-stops {
  margin: 0.35rem 0 0;
  padding-left: 1.05rem;
  font-size: 0.74rem;
  color: var(--text);
  line-height: 1.4;
  opacity: 0.9;
}
#fbg-drive-finder .item-stops li {
  display: list-item;
  padding: 0;
  background: transparent;
  border-radius: 0;
  cursor: default;
}
#fbg-drive-finder .item-gotcha {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.72rem;
  color: #d4b07a;
  line-height: 1.35;
}
#fbg-drive-finder .fbg-spinner-wrap {
  display: flex;
  flex-direction: column;
}
#fbg-drive-finder .drive-map-block {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #1a241c;
  border-radius: 18px;
  overflow: hidden;
}
#fbg-drive-finder .map-header {
  margin: 0;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.48rem 0.85rem;
  text-align: center;
  background: linear-gradient(180deg, #2a382c 0%, #1e2a20 100%);
  border-bottom: 1px solid rgba(224, 176, 96, 0.35);
}
#fbg-drive-finder .map-header-kicker {
  margin: 0;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  color: #e0b060;
  font-weight: 800;
  line-height: 1.3;
}
#fbg-drive-finder .drive-map {
  flex: 1 1 auto;
  min-height: 240px;
  width: 100%;
  background: #142018;
}
#fbg-drive-finder .map-caption {
  margin: 0;
  flex: 0 0 auto;
  padding: 0.42rem 0.85rem;
  text-align: center;
  background: linear-gradient(180deg, #243028 0%, #1a241c 100%);
  border-top: 1px solid rgba(196, 184, 160, 0.28);
  font-size: 0.78rem;
  line-height: 1.35;
  color: #c4b8a0;
}
#fbg-drive-finder .map-send {
  appearance: none;
  border: none;
  border-top: 2px solid rgba(196, 184, 160, 0.45);
  cursor: pointer;
  width: 100%;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.78rem 1.25rem;
  min-height: 3.5rem;
  text-decoration: none;
  font-family: inherit;
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #1a140c;
  background: linear-gradient(180deg, #e0b060 0%, #a86a28 45%, #6a4018 100%);
}
#fbg-drive-finder .map-send:hover {
  filter: brightness(1.06);
}
#fbg-drive-finder .map-send[aria-disabled="true"] {
  pointer-events: none;
  opacity: 0.45;
}
#fbg-drive-finder .drive-pin {
  background: transparent;
  border: 0;
}
#fbg-drive-finder .drive-pin-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 0.72rem;
  font-weight: 800;
  box-shadow: 0 0 0 2px rgba(26, 22, 16, 0.85);
}
#fbg-drive-finder .leaflet-container {
  width: 100%;
  height: 100%;
  background: #142018;
  font-family: inherit;
}
#fbg-drive-finder .leaflet-tile-pane {
  filter: invert(1) hue-rotate(180deg) saturate(0.35) brightness(0.9);
}
#fbg-drive-finder .leaflet-popup-content-wrapper,
#fbg-drive-finder .leaflet-popup-tip {
  background: #243028;
  color: #f3efe6;
  border-radius: 8px;
}
@media (min-width: 900px) {
  #fbg-drive-finder .drive-map-block {
    height: var(--spinner-h, 800px);
  }
}
"""


def esc(value: str) -> str:
    return escape(value or "", quote=True)


def csv(values) -> str:
    return ",".join(values)


def sri_sha384(path: Path) -> str:
    return "sha384-" + b64encode(sha384(path.read_bytes()).digest()).decode("ascii")


def mill_places() -> str:
    items = []
    for route in ROUTES:
        items.append(
            {
                "id": route["id"],
                "name": route["name"],
                "cuisine": route["roadsLabel"],
                "meals": ["lunch"],
                "daysOpen": "Daily",
                "address": "Fredericksburg, TX",
                "description": route["tagline"],
            }
        )
    return "const DEFAULT_RESTAURANTS = " + json.dumps(items, indent=2) + ";"


def transform_mill(src: str) -> str:
    src = re.sub(
        r"const DEFAULT_RESTAURANTS = \[[\s\S]*?\];",
        mill_places(),
        src,
        count=1,
    )
    src = src.replace("restaurant-spinner-", "drive-spinner-")
    src = src.replace("Can't pick a meal? Spin the wheel!", "Can't pick a drive? Spin the wheel!")
    src = src.replace("Tonight's pick", "Today's drive")
    src = src.replace("Matching places land on this wheel.", "Matching drives land on this wheel.")
    src = src.replace(
        '" restaurants · Wheel pulls from filtered list"',
        '" driving roads · Wheel pulls from filtered list"',
    )
    src = src.replace("FBG Restaurant Finder", "FBG Driving Roads")
    src = src.replace("pick your next meal", "pick your next Hill Country drive")
    return src


def transform_css(src: str) -> str:
    src = src.replace("#fbg-restaurant-finder", "#fbg-drive-finder")
    src = src.replace("#restaurant-finder", "#drive-finder")
    if EXTRAS_MARK in src:
        src = src.split(EXTRAS_MARK)[0]
    leftover = "\n#fbg-drive-finder .item-name {\n  white-space: normal;\n}"
    if leftover in src:
        src = src.split(leftover)[0]
    return src.rstrip() + "\n\n" + EXTRAS_MARK + "\n" + EXTRA_CSS.lstrip()


def list_item(route: dict) -> str:
    meta = " · ".join(
        [
            route["miles"],
            route["timeLabel"],
            route["roadsLabel"],
            f"Difficulty {route['difficulty']}",
        ]
    )
    stops = "".join(f"<li>{esc(stop)}</li>" for stop in route["stops"])
    return f'''<li id="place-{esc(route["id"])}" data-id="{esc(route["id"])}" data-name="{esc(route["name"])}" data-title="{esc(route["title"])}" data-time="{esc(route["time"])}" data-roads="{esc(route["roads"])}" data-eat="{esc(csv(route["eat"]))}" data-vehicle="{esc(csv(route["vehicle"]))}" data-maps="{esc(route["mapsUrl"])}" tabindex="0" role="option" aria-selected="false">
<article>
<h3 class="item-name">{esc(route["title"])}</h3>
<p class="item-meta">{esc(meta)}</p>
<p class="item-desc">{esc(route["description"])}</p>
<ul class="item-stops">{stops}</ul>
<p class="item-gotcha">{esc(route["gotchas"])}</p>
<a class="item-address" href="{esc(route["mapsUrl"])}" target="_blank" rel="noopener" aria-label="Open maps for {esc(route["title"])}">{esc(route["routeLabel"])}</a>
<p class="item-footer"><a class="item-link" href="{esc(route["mapsUrl"])}" target="_blank" rel="noopener noreferrer">Send to Maps</a><span class="item-sep" aria-hidden="true">|</span><span class="item-reservations">{esc(route["vehicleLabel"])}</span></p>
</article>
</li>'''


def finder_snippet(
    *,
    css_href: str,
    js_src: str,
    logo_src: str,
    leaflet_css: str,
    leaflet_js: str,
    embed_base: str,
    extra_css: str = "",
    css_integrity: str = "",
    js_integrity: str = "",
) -> str:
    items = "\n".join(list_item(route) for route in ROUTES)
    routes_json = json.dumps(ROUTES).replace("<", "\\u003c")
    css_attrs = f' href="{esc(css_href)}"'
    if css_integrity:
        css_attrs += f' integrity="{esc(css_integrity)}" crossorigin="anonymous"'
    js_attrs = f' src="{esc(js_src)}" defer'
    if js_integrity:
        js_attrs += f' integrity="{esc(js_integrity)}" crossorigin="anonymous"'
    return f"""<style>
#fbg-finder-fit{{overflow:hidden}}
#fbg-drive-finder .finder-panel{{overflow:hidden}}
#fbg-drive-finder .list{{max-height:min(42vh,22.5rem);overflow:auto}}
@media(min-width:900px){{#fbg-drive-finder .list{{max-height:none}}}}
@media(max-width:899px){{#fbg-drive-finder .filters.is-collapsed ~ .list-shell .list{{flex:1 1 auto;min-height:0;max-height:none}}}}
{extra_css}
</style>
<link rel="stylesheet" href="{esc(leaflet_css)}">
<link rel="stylesheet"{css_attrs}>
<div id="fbg-finder-fit">
<div id="fbg-drive-finder" data-embed-base="{esc(embed_base)}" data-embed-version="{EMBED_VERSION}">
  <header class="finder-brand">
    <a class="finder-brand-home" href="{esc(HOME_PAGE)}" aria-label="Discover Fredericksburg">
      <img src="{esc(logo_src)}" alt="Discover Fredericksburg" width="320" height="168">
    </a>
  </header>
  <div class="finder-layout">
    <div class="finder-panel">
      <div class="panel-head">
        <h2 id="list-heading">Best Driving Roads</h2>
        <div class="filter-reset-wrap">
          <button class="filter-share" id="filter-surprise" type="button">Surprise me</button>
          <button class="filter-share" id="filter-share" type="button">Share</button>
          <button class="filter-reset" id="filter-reset" type="button">RESET</button>
        </div>
      </div>
      <div class="filters" id="filters">
        <div class="filters-extra" id="filters-extra">
          <label>
            How long
            <select id="filter-time">
              <option value="">Any length</option>
              <option value="half">Half day</option>
              <option value="full">Full day</option>
            </select>
          </label>
          <label>
            Kind of roads
            <select id="filter-road">
              <option value="">Any roads</option>
              <option value="cruise">Easy cruise</option>
              <option value="scenic">Scenic</option>
              <option value="technical">Technical</option>
            </select>
          </label>
          <label>
            What to eat
            <select id="filter-eat">
              <option value="">Any stop</option>
              <option value="bbq">BBQ</option>
              <option value="pie">Pie / cider</option>
              <option value="brewery">Brewery</option>
              <option value="german">German / FBG</option>
              <option value="mix">Mix</option>
            </select>
          </label>
          <label>
            Vehicle
            <select id="filter-vehicle">
              <option value="">Any vehicle</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="sports">Sports car</option>
              <option value="cruise">Cruiser / convertible</option>
            </select>
          </label>
        </div>
        <button class="filters-collapse" id="filters-collapse" type="button" aria-expanded="true" aria-controls="filters-extra">
          <span class="filters-collapse-chevron" aria-hidden="true">▲</span>
          <span id="filters-collapse-label">Collapse filters</span>
          <span class="filters-collapse-chevron" aria-hidden="true">▲</span>
        </button>
      </div>
      <div class="list-shell">
        <ul class="list" id="drive-list" role="listbox" aria-labelledby="list-heading">
{items}
        </ul>
        <div class="list-more" id="list-more" aria-hidden="true">
          <span class="list-more-label"><span class="list-more-chevron" aria-hidden="true">▼</span>Scroll for more<span class="list-more-chevron" aria-hidden="true">▼</span></span>
        </div>
      </div>
      <p class="site-footer">For informational purposes only. Roads change. Verify hours, fuel, weather, and closures before you roll. Drive the speed limit — cattle, gravel, and blind crests are part of the Hill Country. · © 2026 Discover Fredericksburg. All rights reserved.</p>
    </div>
    <div class="fbg-spinner-wrap" id="drive-finder-wrap">
      <div class="drive-map-block">
        <header class="map-header">
          <p class="map-header-kicker" id="map-title">Pick a drive</p>
        </header>
        <div class="drive-map" id="drive-map" role="img" aria-label="Selected Hill Country drive map"></div>
        <p class="map-caption" id="map-caption">Filter the list, then tap a route to see it on the map.</p>
        <a class="map-send" id="map-send" href="#" target="_blank" rel="noopener">Send to Maps</a>
      </div>
    </div>
  </div>
</div>
<script type="application/json" id="drive-routes">{routes_json}</script>
  <div class="share-modal" id="share-modal" hidden>
    <div class="share-modal-backdrop" data-share-close></div>
    <div class="share-modal-card" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
      <h3 id="share-modal-title">Check out these driving roads from Fredericksburg.</h3>
      <textarea class="share-modal-url" id="share-modal-url" readonly rows="8" aria-label="Share link"></textarea>
      <div class="share-modal-actions">
        <button type="button" id="share-close" data-share-close>Close</button>
        <button type="button" id="share-native" hidden>Send</button>
        <button type="button" class="share-copy" id="share-copy">Copy</button>
      </div>
    </div>
  </div>
</div>
<script src="{esc(leaflet_js)}"></script>
<script{js_attrs}></script>"""


def preview_html() -> str:
    inner = finder_snippet(
        css_href=f"finder.css?_v={EMBED_VERSION}",
        js_src=f"finder.js?_v={EMBED_VERSION}",
        logo_src="assets/discover-fredericksburg.png?v=2",
        leaflet_css="vendor/leaflet/leaflet.css",
        leaflet_js="vendor/leaflet/leaflet.js",
        embed_base="",
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Best Driving Roads from Fredericksburg, TX</title>
  <meta name="description" content="Curated Hill Country driving roads from Fredericksburg — named loops, pit stops, and the gotchas Maps will not tell you." />
  <style>
    html, body {{ min-height: 100%; margin: 0; background: #142018; }}
    .preview-frame {{ box-sizing: border-box; width: 100%; max-width: none; margin: 0; padding: 0.5rem; }}
  </style>
</head>
<body>
  <div class="preview-frame">
{inner}
  </div>
</body>
</html>
"""


def squarespace_css() -> str:
    return """
.sqs-block-code:has(#fbg-finder-fit),
.sqs-block-code:has(#fbg-finder-fit) .sqs-block-content,
.fe-block:has(#fbg-finder-fit){
  padding:0!important;
  margin:0!important;
}
.fe-block:has(#fbg-finder-fit){
  grid-column:1/-1!important;
}
.page-section:has(#fbg-finder-fit){
  --sqs-site-gutter:0px;
  --sqs-site-gutter-mobile:0px;
  overflow-x:hidden;
}
.page-section:has(#fbg-finder-fit) .content-wrapper,
.page-section:has(#fbg-finder-fit) .fluid-engine{
  padding-left:0!important;
  padding-right:0!important;
  max-width:none!important;
}
.page-section:has(#fbg-finder-fit) .fluid-engine{
  display:flex!important;
  flex-direction:column!important;
  height:auto!important;
}
.page-section:has(#fbg-finder-fit) .fluid-engine > .fe-block{
  width:100%!important;
  height:auto!important;
  align-self:stretch!important;
  grid-area:auto!important;
}
.page-section:has(#fbg-finder-fit) .fluid-engine > .fe-block:not(:has(#fbg-finder-fit)){
  box-sizing:border-box;
  padding:0.85rem clamp(1.15rem,4vw,2.25rem) 1.35rem!important;
  margin:0!important;
}
@media(max-width:767px){
  #fbg-drive-finder{border-radius:0}
}
""".strip()


def write_embed() -> str:
    css_hash = sri_sha384(DOCS / "finder.css")
    js_hash = sri_sha384(DOCS / "finder.js")
    combined = finder_snippet(
        css_href=f"{EMBED_BASE}finder.css?_v={EMBED_VERSION}",
        js_src=f"{EMBED_BASE}finder.js?_v={EMBED_VERSION}",
        logo_src=f"{EMBED_BASE}assets/discover-fredericksburg.png?v=2",
        leaflet_css=f"{EMBED_BASE}vendor/leaflet/leaflet.css?_v={EMBED_VERSION}",
        leaflet_js=f"{EMBED_BASE}vendor/leaflet/leaflet.js?_v={EMBED_VERSION}",
        embed_base=EMBED_BASE,
        extra_css=squarespace_css(),
        css_integrity=css_hash,
        js_integrity=js_hash,
    )
    size = len(combined.encode("utf-8"))
    pct = 100.0 * size / CODE_BLOCK_LIMIT
    embed_doc = f"""<!--
  Discover FBG Best Driving Roads — paste into ONE Squarespace Code Block (HTML).
  Squarespace limit is 400 KB. This bake is {size:,} bytes ({pct:.1f}% of that).
  CSS, JS, map library, and the logo load from GitHub Pages.

  1. Create a Squarespace page with slug /Best-Driving-Roads and drag it to Not Linked.
     Page title: Best Driving Roads from Fredericksburg, TX.
  2. Paste the CODE BLOCK section below into one Code Block.
  3. After catalog or CSS/JS changes: python3 bake_drive.py, then paste the new CODE BLOCK.
     Integrity hashes mean an old paste will refuse updated CSS/JS.

  Live assets: {EMBED_BASE}
-->

<!-- ========== CODE BLOCK (page embed) ========== -->
{combined}
<!-- ========== END CODE BLOCK ========== -->
"""
    EMBED_OUT.write_text(embed_doc)
    return combined


def main() -> None:
    css = transform_css(FINDER_CSS_SRC.read_text())
    (DOCS / "finder.css").write_text(css)
    (ROOT / "finder.css").write_text(css)
    (DOCS / "finder.js").write_text(FINDER_JS.read_text())
    page = preview_html()
    (DOCS / "preview.html").write_text(page)
    (DOCS / "index.html").write_text(page)
    combined = write_embed()
    print(f"Baked {len(ROUTES)} driving roads → docs/index.html, docs/preview.html, squarespace-embed.html ({len(combined.encode('utf-8')):,} bytes)")


if __name__ == "__main__":
    main()
