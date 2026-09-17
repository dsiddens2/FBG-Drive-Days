(function () {
  "use strict";

  const root = document.getElementById("fbg-drive-finder");
  if (!root) return;

  const FILTER_TIMES = ["half", "full"];
  const FILTER_ROADS = ["cruise", "scenic", "technical"];
  const FILTER_EATS = ["bbq", "pie", "brewery", "german", "mix"];
  const FILTER_VEHICLES = ["motorcycle", "sports", "cruise"];
  const SHARE_PAGE = "https://discoverfbg.com/Best-Driving-Roads";
  const SHARE_INTRO = "Check out these driving roads from Fredericksburg.";
  const LISTINGS_JSON = "https://dsiddens2.github.io/FBG-Listings/listings.json";
  const LISTINGS_PAGE = "https://reataranchrealty.com/agents/doug-siddens";
  const LISTINGS_SEARCH = "https://reataranchrealty.com/home-search/listings?sortBy=LIST_PRICE&regions=%5B%7B%22regionId%22%3A%22d2b75ba0-dc7d-48d4-8cb5-1e5a823eda96%22%2C%22address%22%3A%22Fredericksburg%2C+TX%2C+USA%22%7D%5D&center=%7B%22lat%22%3A30.2544044893871%2C%22lng%22%3A-98.889515%7D&boundary=%5B%5B%5B30.58599013173766%2C-99.20846183837891%5D%2C%5B30.58599013173766%2C-98.5705681616211%5D%2C%5B29.921695749509272%2C-98.5705681616211%5D%2C%5B29.921695749509272%2C-99.20846183837891%5D%2C%5B30.58599013173766%2C-99.20846183837891%5D%5D%5D&cityName=Fredericksburg&stateName=TX";
  const FBG = [30.2752, -98.8717];
  let fitting = false;

  const listEl = document.getElementById("drive-list");
  const listMore = document.getElementById("list-more");
  const filterTime = document.getElementById("filter-time");
  const filterRoad = document.getElementById("filter-road");
  const filterEat = document.getElementById("filter-eat");
  const filterVehicle = document.getElementById("filter-vehicle");
  const filtersEl = document.getElementById("filters");
  const filtersCollapse = document.getElementById("filters-collapse");
  const filtersCollapseLabel = document.getElementById("filters-collapse-label");
  const filterShare = document.getElementById("filter-share");
  const filterReset = document.getElementById("filter-reset");
  const surpriseBtn = document.getElementById("filter-surprise");
  const shareModal = document.getElementById("share-modal");
  const shareModalTitle = document.getElementById("share-modal-title");
  const shareModalUrl = document.getElementById("share-modal-url");
  const shareCopyBtn = document.getElementById("share-copy");
  const shareNativeBtn = document.getElementById("share-native");
  const mapEl = document.getElementById("drive-map");
  const mapTitle = document.getElementById("map-title");
  const mapCaption = document.getElementById("map-caption");
  const mapSend = document.getElementById("map-send");
  const wrap = document.getElementById("drive-finder-wrap");

  const catalog = loadCatalog();
  const items = [...listEl.querySelectorAll("li[data-id]")];
  let selectedId = null;
  let shareFocusEl = null;
  let shareKind = "list";
  let map = null;
  let routeLayer = null;
  let markerLayer = null;
  let routeRequest = 0;

  function loadCatalog() {
    const el = document.getElementById("drive-routes");
    if (!el) return {};
    try {
      const list = JSON.parse(el.textContent || "[]");
      const byId = {};
      list.forEach((route) => {
        byId[route.id] = route;
      });
      return byId;
    } catch (err) {
      return {};
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function listingsUrl() {
    const row = document.getElementById("fbg-listings");
    return (row && row.getAttribute("data-listings-url")) || LISTINGS_JSON;
  }

  function listingCardHtml(item) {
    const url = item.url || LISTINGS_PAGE;
    const title = item.title || item.address || "Listing";
    const photo = item.photo
      ? `<img src="${escapeHtml(item.photo)}" alt="" width="480" height="300" loading="lazy">`
      : `<span class="listings-card-ph" aria-hidden="true"></span>`;
    return `<a class="listings-card" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
<span class="listings-card-photo">${photo}</span>
<span class="listings-card-body">
<span class="listings-card-price">${escapeHtml(item.priceLabel || "Price on request")}</span>
<span class="listings-card-name">${escapeHtml(title)}</span>
<span class="listings-card-meta">${escapeHtml(item.meta || item.city || "")}</span>
</span>
</a>`;
  }

  function renderListings(listings) {
    const row = document.getElementById("fbg-listings");
    const scroller = document.getElementById("listings-scroller");
    const seeAll = row && row.querySelector(".listings-all");
    if (seeAll) seeAll.href = LISTINGS_SEARCH;
    if (!row || !scroller) return;
    const items = Array.isArray(listings) ? listings.filter((item) => item && item.url) : [];
    if (!items.length) {
      row.hidden = true;
      scroller.innerHTML = "";
      return;
    }
    scroller.innerHTML = items.map(listingCardHtml).join("");
    row.hidden = false;
  }

  function loadListings() {
    const seeAll = document.querySelector("#fbg-listings .listings-all");
    if (seeAll) seeAll.href = LISTINGS_SEARCH;
    fetch(listingsUrl(), { credentials: "omit" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.listings)) renderListings(data.listings);
      })
      .catch(() => {});
  }

  function trackGa4Event(name, params) {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params || {});
    }
  }

  function csvAttr(li, name) {
    return String(li.getAttribute(name) || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function placeFromItem(li) {
    const id = li.getAttribute("data-id") || "";
    const extra = catalog[id] || {};
    return {
      id: id,
      name: li.getAttribute("data-name") || extra.name || "",
      title: li.getAttribute("data-title") || extra.title || "",
      time: li.getAttribute("data-time") || extra.time || "",
      roads: li.getAttribute("data-roads") || extra.roads || "",
      eat: csvAttr(li, "data-eat"),
      vehicle: csvAttr(li, "data-vehicle"),
      mapsUrl: li.getAttribute("data-maps") || extra.mapsUrl || "",
      miles: extra.miles || "",
      difficulty: extra.difficulty || "",
      tagline: extra.tagline || "",
      timeLabel: extra.timeLabel || "",
      roadsLabel: extra.roadsLabel || "",
      waypoints: extra.waypoints || [],
      el: li,
    };
  }

  const places = items.map(placeFromItem);

  function winnerPlace() {
    if (!selectedId) return null;
    return places.find((p) => p.id === selectedId) || null;
  }

  function sharePickLine(place) {
    return "We're driving " + (place.title || place.name) + ", thanks to DiscoverFBG.com!";
  }

  function sharePickMessage(place) {
    const parts = [sharePickLine(place)];
    if (place.mapsUrl) parts.push(place.mapsUrl);
    return parts.join("\n\n");
  }

  function currentFilterQuery() {
    const p = new URLSearchParams();
    if (filterTime.value) p.set("time", filterTime.value);
    if (filterRoad.value) p.set("roads", filterRoad.value);
    if (filterEat.value) p.set("eat", filterEat.value);
    if (filterVehicle.value) p.set("vehicle", filterVehicle.value);
    if (selectedId) p.set("drive", selectedId);
    return p.toString();
  }

  function sharePageUrl() {
    const q = currentFilterQuery();
    return q ? SHARE_PAGE + "?" + q : SHARE_PAGE;
  }

  function shareMessage() {
    if (shareKind === "pick") {
      const place = winnerPlace();
      if (place) return sharePickMessage(place);
    }
    return SHARE_INTRO + "\n" + sharePageUrl();
  }

  function syncFilterQueryToHistory() {
    const q = currentFilterQuery();
    const next = q
      ? location.pathname + "?" + q + location.hash
      : location.pathname + location.hash;
    const current = location.pathname + location.search + location.hash;
    if (next === current) return;
    history.replaceState(null, "", next);
  }

  function applyFiltersFromSearch(search) {
    const raw = String(search || "").replace(/^\?/, "");
    if (!raw) return;
    const p = new URLSearchParams(raw);
    const time = String(p.get("time") || "").toLowerCase();
    if (FILTER_TIMES.includes(time)) filterTime.value = time;
    const roads = String(p.get("roads") || "").toLowerCase();
    if (FILTER_ROADS.includes(roads)) filterRoad.value = roads;
    const eat = String(p.get("eat") || "").toLowerCase();
    if (FILTER_EATS.includes(eat)) filterEat.value = eat;
    const vehicle = String(p.get("vehicle") || "").toLowerCase();
    if (FILTER_VEHICLES.includes(vehicle)) filterVehicle.value = vehicle;
    const drive = String(p.get("drive") || "");
    if (drive) selectedId = drive;
  }

  function matchingPlaces() {
    const time = filterTime.value;
    const road = filterRoad.value;
    const eat = filterEat.value;
    const vehicle = filterVehicle.value;
    return places.filter((p) => {
      if (time === "half" && p.time !== "half") return false;
      if (road && p.roads !== road) return false;
      if (eat && p.eat.indexOf(eat) < 0) return false;
      if (vehicle && p.vehicle.indexOf(vehicle) < 0) return false;
      return true;
    });
  }

  function stackedPanel() {
    return root.querySelector(".finder-panel");
  }

  function isStackedLayout() {
    return window.matchMedia("(max-width: 899px)").matches;
  }

  function lockStackedPanelHeight() {
    const panel = stackedPanel();
    if (!panel || !isStackedLayout()) return;
    panel.style.height = Math.round(panel.getBoundingClientRect().height) + "px";
  }

  function unlockStackedPanelHeight() {
    const panel = stackedPanel();
    if (panel) panel.style.height = "";
  }

  function setFiltersCollapsed(collapsed) {
    if (collapsed && isStackedLayout()) lockStackedPanelHeight();
    filtersEl.classList.toggle("is-collapsed", collapsed);
    filtersCollapse.setAttribute("aria-expanded", collapsed ? "false" : "true");
    filtersCollapseLabel.textContent = collapsed ? "Expand filters" : "Collapse filters";
    filtersCollapse.querySelectorAll(".filters-collapse-chevron").forEach((el) => {
      el.textContent = collapsed ? "▼" : "▲";
    });
    if (!collapsed) unlockStackedPanelHeight();
    window.requestAnimationFrame(() => {
      scheduleFit();
      updateListScrollCue();
    });
  }

  function renderVisibility() {
    const matching = matchingPlaces();
    const matchingIds = new Set(matching.map((p) => p.id));
    places.forEach((place) => {
      const on = matchingIds.has(place.id);
      if (on) place.el.removeAttribute("hidden");
      else place.el.setAttribute("hidden", "");
      const selected = place.id === selectedId;
      place.el.classList.toggle("is-winner", selected);
      place.el.setAttribute("aria-selected", selected ? "true" : "false");
      const footer = place.el.querySelector(".item-footer");
      if (!footer) return;
      const existing = footer.querySelector(".item-share-pick");
      if (selected && !existing) {
        const sharePick = document.createElement("button");
        sharePick.type = "button";
        sharePick.className = "item-share-pick";
        sharePick.textContent = "Share pick";
        sharePick.addEventListener("click", (event) => {
          event.stopPropagation();
          openShareModal("pick");
        });
        const sep = document.createElement("span");
        sep.className = "item-sep";
        sep.textContent = "|";
        sep.setAttribute("aria-hidden", "true");
        footer.insertBefore(sep, footer.firstChild);
        footer.insertBefore(sharePick, sep);
      } else if (!selected && existing) {
        const sep = existing.nextElementSibling;
        existing.remove();
        if (sep && sep.classList.contains("item-sep")) sep.remove();
      }
    });
  }

  function updateListScrollCue() {
    if (!listMore || !listEl) return;
    const overflow = listEl.scrollHeight - listEl.clientHeight > 24;
    const remaining = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight;
    const show = overflow && remaining > 20;
    listMore.classList.toggle("is-visible", show);
    listMore.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function applyFilters() {
    const matching = matchingPlaces();
    if (selectedId && !matching.some((p) => p.id === selectedId)) {
      selectedId = matching[0] ? matching[0].id : null;
    }
    if (!selectedId && matching[0]) selectedId = matching[0].id;
    renderVisibility();
    updateListScrollCue();
    syncFilterQueryToHistory();
    showSelectedRoute();
  }

  function selectPlace(id, options) {
    const matching = matchingPlaces();
    if (!matching.some((p) => p.id === id)) return;
    selectedId = id;
    renderVisibility();
    const winnerEl = listEl.querySelector('li[data-id="' + id + '"]');
    if (winnerEl && (!options || options.scroll !== false)) {
      winnerEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    syncFilterQueryToHistory();
    showSelectedRoute();
    trackGa4Event("drive_select", { drive_id: id });
  }

  function surpriseMe() {
    const matching = matchingPlaces();
    if (!matching.length) return;
    const pool = matching.length > 1 ? matching.filter((p) => p.id !== selectedId) : matching;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    selectPlace(pick.id);
    trackGa4Event("drive_surprise", { drive_id: pick.id });
  }

  function closeShareModal() {
    if (shareModal.hidden) return;
    shareModal.hidden = true;
    if (shareFocusEl && typeof shareFocusEl.focus === "function") shareFocusEl.focus();
    shareFocusEl = null;
  }

  function openShareModal(kind) {
    const place = kind === "pick" ? winnerPlace() : null;
    shareKind = place ? "pick" : "list";
    shareModalTitle.textContent = place ? sharePickLine(place) : SHARE_INTRO;
    shareModalUrl.value = shareMessage();
    shareNativeBtn.hidden = typeof navigator.share !== "function";
    shareCopyBtn.textContent = "Copy";
    shareFocusEl = document.activeElement;
    shareModal.hidden = false;
    shareCopyBtn.focus();
    trackGa4Event("share_open", {
      share_type: shareKind,
      matching_count: matchingPlaces().length,
      winner: place ? place.name : "",
    });
  }

  function copyShareMessage() {
    const text = shareMessage();
    shareModalUrl.value = text;
    shareModalUrl.focus();
    shareModalUrl.select();
    const done = () => {
      shareCopyBtn.textContent = "Copied!";
      window.setTimeout(() => {
        if (shareCopyBtn.textContent === "Copied!") shareCopyBtn.textContent = "Copy";
      }, 1600);
      trackGa4Event("share_copy", {
        share_type: shareKind,
        matching_count: matchingPlaces().length,
        winner: shareKind === "pick" && winnerPlace() ? winnerPlace().name : "",
      });
    };
    const fallback = () => {
      try {
        if (document.execCommand("copy")) done();
      } catch (err) {
        /* leave selected */
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
      return;
    }
    fallback();
  }

  function nativeShareMessage() {
    const data = { text: shareMessage() };
    if (typeof navigator.share !== "function") {
      copyShareMessage();
      return;
    }
    navigator.share(data).then(() => {
      trackGa4Event("share_native", {
        share_type: shareKind,
        matching_count: matchingPlaces().length,
        winner: shareKind === "pick" && winnerPlace() ? winnerPlace().name : "",
      });
      closeShareModal();
    }).catch((err) => {
      if (err && err.name === "AbortError") return;
      copyShareMessage();
    });
  }

  function trackFilterChange(name, value) {
    trackGa4Event("filter_change", {
      filter_name: name,
      filter_value: value || "any",
      matching_count: matchingPlaces().length,
    });
  }

  function resetFilters() {
    filterTime.value = "";
    filterRoad.value = "";
    filterEat.value = "";
    filterVehicle.value = "";
    closeShareModal();
    trackGa4Event("filter_reset");
    applyFilters();
  }

  function applyPaneHeight(h) {
    if (!wrap) return;
    wrap.style.setProperty("height", h + "px");
    wrap.style.setProperty("min-height", h + "px");
    root.style.setProperty("--spinner-h", h + "px");
    if (mapEl) {
      const chrome = HEADER_H + MATCH_H + SPIN_BTN_H;
      mapEl.style.height = Math.max(240, h - chrome) + "px";
    }
    if (map) {
      window.requestAnimationFrame(() => map.invalidateSize());
    }
  }

  function scheduleFit() {
    window.requestAnimationFrame(() => {
      fitFinderToViewport();
      updateListScrollCue();
      window.requestAnimationFrame(syncHostBlock);
    });
  }

  const SPIN_BTN_H = 56;
  const HEADER_H = 44;
  const MATCH_H = 42;
  const LIST_EXTRA = 70;
  const SPINNER_MAX_H = 800;
  const COL_MAX = 640;

  function naturalSpinnerHeight(wrapW) {
    const colW = Math.min(COL_MAX, Math.max(wrapW, 1));
    return Math.round(colW * 1.05 + SPIN_BTN_H + HEADER_H + MATCH_H);
  }

  function fitFinderToViewport() {
    const outer = document.getElementById("fbg-finder-fit");
    if (!wrap || !outer || fitting) return;

    fitting = true;
    root.style.transform = "none";
    root.style.zoom = "";
    outer.style.width = "100%";
    outer.style.maxWidth = "100%";
    outer.style.height = "";

    if (isStackedLayout()) {
      root.style.removeProperty("--layout-h");
      root.style.removeProperty("--col-w");
      applyPaneHeight(Math.min(SPINNER_MAX_H, Math.max(480, naturalSpinnerHeight(wrap.clientWidth))));
      fitting = false;
      return;
    }

    unlockStackedPanelHeight();
    const availW = Math.max(outer.clientWidth, 1);
    const gap = 12;
    const pad = 16;
    const colW = Math.max(280, Math.min(COL_MAX, Math.floor((availW - gap - pad) / 2)));
    const h = Math.min(SPINNER_MAX_H, Math.max(480, naturalSpinnerHeight(colW) + LIST_EXTRA));
    applyPaneHeight(h);
    root.style.setProperty("--col-w", colW + "px");
    root.style.setProperty("--layout-h", h + "px");
    fitting = false;
  }

  function syncHostBlock() {
    const fit = document.getElementById("fbg-finder-fit");
    if (!fit) return;
    const fe = fit.closest(".fe-block");
    if (!fe) return;
    const engine = fit.closest(".fluid-engine");
    const block = fit.closest(".sqs-block");
    const section = fit.closest("section.page-section");
    const fitH = Math.max(fit.offsetHeight, 1);
    fe.style.setProperty("align-self", "start", "important");
    fe.style.setProperty("height", "auto", "important");
    if (block) {
      block.style.setProperty("height", "auto", "important");
      block.style.setProperty("min-height", "0", "important");
    }
    if (engine) {
      const rowH = parseFloat((getComputedStyle(engine).gridTemplateRows || "").split(" ")[0]) || 24;
      const gap = parseFloat(getComputedStyle(engine).rowGap) || 0;
      const needed = Math.max(8, Math.ceil((fitH + 12) / (rowH + gap)));
      fe.style.setProperty("grid-row-end", "span " + needed, "important");
      engine.style.setProperty("grid-template-rows", "repeat(" + needed + ", minmax(0, auto))", "important");
      engine.style.setProperty("height", "auto", "important");
    } else {
      fe.style.setProperty("grid-row-end", "auto", "important");
    }
    if (section) {
      section.style.setProperty("height", "auto", "important");
      section.style.setProperty("min-height", "0px", "important");
      [".content-wrapper", ".section-background", ".section-border"].forEach((sel) => {
        const el = section.querySelector(sel);
        if (el) el.style.setProperty("height", "auto", "important");
      });
    }
  }

  function initMap() {
    if (!mapEl || typeof window.L === "undefined") return;
    map = window.L.map(mapEl, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    }).setView(FBG, 9);
    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    routeLayer = window.L.layerGroup().addTo(map);
    markerLayer = window.L.layerGroup().addTo(map);
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(() => {
        if (map) map.invalidateSize();
      });
      ro.observe(mapEl);
    }
  }

  function pinIcon(label, kind) {
    const fill = kind === "stop" ? "#e0b060" : "#f3efe6";
    const color = kind === "stop" ? "#1a1610" : "#1a2218";
    return window.L.divIcon({
      className: "drive-pin",
      html: '<span class="drive-pin-dot drive-pin-' + kind + '" style="background:' + fill + ";color:" + color + '">' + label + "</span>",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  function fallbackLine(waypoints) {
    return waypoints.map((pt) => [pt.lat, pt.lng]);
  }

  function drawLine(latlngs) {
    if (!map || !routeLayer) return;
    routeLayer.clearLayers();
    window.L.polyline(latlngs, {
      color: "#e0b060",
      weight: 4,
      opacity: 0.95,
      lineJoin: "round",
    }).addTo(routeLayer);
    map.fitBounds(window.L.latLngBounds(latlngs).pad(0.12));
  }

  function drawMarkers(waypoints) {
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();
    waypoints.forEach((pt, index) => {
      const kind = pt.kind === "stop" ? "stop" : index === 0 ? "start" : "via";
      const marker = window.L.marker([pt.lat, pt.lng], {
        icon: pinIcon(String(index + 1), kind),
        title: pt.name,
      });
      marker.bindPopup("<strong>" + pt.name + "</strong>");
      marker.addTo(markerLayer);
    });
  }

  function fetchOsrm(waypoints) {
    const coords = waypoints.map((pt) => pt.lng + "," + pt.lat).join(";");
    const url =
      "https://router.project-osrm.org/route/v1/driving/" +
      coords +
      "?overview=full&geometries=geojson&steps=false";
    return fetch(url).then((res) => {
      if (!res.ok) throw new Error("route failed");
      return res.json();
    });
  }

  function showSelectedRoute() {
    const place = winnerPlace();
    if (!place) {
      if (mapTitle) mapTitle.textContent = "Pick a drive";
      if (mapCaption) mapCaption.textContent = "Filter the list, then tap a route to see it on the map.";
      if (mapSend) {
        mapSend.removeAttribute("href");
        mapSend.setAttribute("aria-disabled", "true");
      }
      if (routeLayer) routeLayer.clearLayers();
      if (markerLayer) markerLayer.clearLayers();
      return;
    }
    if (mapTitle) mapTitle.textContent = place.title || place.name;
    if (mapCaption) {
      mapCaption.textContent =
        place.tagline ||
        [place.miles, place.timeLabel, place.roadsLabel].filter(Boolean).join(" · ");
    }
    if (mapSend) {
      mapSend.href = place.mapsUrl;
      mapSend.removeAttribute("aria-disabled");
    }
    const waypoints = place.waypoints.length ? place.waypoints : [{ name: place.name, lat: FBG[0], lng: FBG[1], kind: "start" }];
    drawMarkers(waypoints);
    drawLine(fallbackLine(waypoints));
    const req = ++routeRequest;
    fetchOsrm(waypoints)
      .then((data) => {
        if (req !== routeRequest) return;
        const geo = data && data.routes && data.routes[0] && data.routes[0].geometry;
        if (!geo || !geo.coordinates) return;
        const latlngs = geo.coordinates.map((pair) => [pair[1], pair[0]]);
        drawLine(latlngs);
      })
      .catch(() => {
        /* straight-line fallback already drawn */
      });
  }

  items.forEach((li) => {
    const place = places.find((p) => p.el === li);
    li.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) return;
      if (place) selectPlace(place.id);
    });
    li.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (place) selectPlace(place.id);
    });
    const addr = li.querySelector("a.item-address");
    if (addr && place) {
      addr.addEventListener("click", () => {
        trackGa4Event("maps_click", { drive_name: place.name });
      });
    }
  });

  filterTime.addEventListener("change", () => {
    trackFilterChange("time", filterTime.value);
    applyFilters();
  });
  filterRoad.addEventListener("change", () => {
    trackFilterChange("roads", filterRoad.value);
    applyFilters();
  });
  filterEat.addEventListener("change", () => {
    trackFilterChange("eat", filterEat.value);
    applyFilters();
  });
  filterVehicle.addEventListener("change", () => {
    trackFilterChange("vehicle", filterVehicle.value);
    applyFilters();
  });
  filtersCollapse.addEventListener("click", () => {
    setFiltersCollapsed(!filtersEl.classList.contains("is-collapsed"));
  });
  filterShare.addEventListener("click", () => openShareModal("list"));
  filterReset.addEventListener("click", resetFilters);
  if (surpriseBtn) surpriseBtn.addEventListener("click", surpriseMe);
  if (mapSend) {
    mapSend.addEventListener("click", () => {
      const place = winnerPlace();
      if (place) trackGa4Event("maps_click", { drive_name: place.name, source: "map_pane" });
    });
  }
  shareModal.addEventListener("click", (event) => {
    if (event.target && event.target.hasAttribute("data-share-close")) closeShareModal();
  });
  shareCopyBtn.addEventListener("click", copyShareMessage);
  shareNativeBtn.addEventListener("click", nativeShareMessage);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeShareModal();
  });

  listEl.addEventListener("scroll", updateListScrollCue, { passive: true });
  window.addEventListener("resize", scheduleFit);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleFit);
  }
  window.matchMedia("(max-width: 899px)").addEventListener("change", scheduleFit);

  applyFiltersFromSearch(window.location.search);
  fitFinderToViewport();
  initMap();
  applyFilters();
  loadListings();
  scheduleFit();
  window.setTimeout(scheduleFit, 300);
  window.setTimeout(scheduleFit, 1200);
})();
