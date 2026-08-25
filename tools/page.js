/* KnockPortal — San Francisco roofing permits: two screens, one document.
   ============================================================================
   DO NOT EDIT for design work. Everything visual lives in page.css and in the
   markup of the .html file. This file reads data and writes into the hooks
   listed below.

   SCREEN 1  city     every permit of the window, plus a box around every group
                      of neighbouring permits. Clicking a box opens screen 2.
   SCREEN 2  cluster  one group: neighbour lists, postcard picking, download.
                      Unchanged behaviour — only its entrance moved.

   The screen lives in document.body.dataset.screen ('city' | 'cluster') and in
   the address hash ('' | '#c<id>'). The stylesheet reads the attribute, the
   back button and the browser's own back button both read the hash.

   Contract with the markup — these must exist, ids unchanged:
     #map      map canvas
     #back     return to the city screen
     #pick     <select> of groups
     #tab-walk #tab-mail   two buttons, aria-selected carries the state
     #pane     scrolling container the lists are written into
     #count    line under the lists
     #clear #dl  buttons
     #dateline #lede-city #lede-cluster #notice #provenance #staleness
     .yrs .win .rsince    runtime text slots, filled wherever they appear

   Classes this file emits (style them freely, don't rename):
     .grp  section header   .st  street header   .row  address line
     .row.pick clickable    .row.on selected     .z  zip   .hint  intro text
   ========================================================================= */

mapboxgl.accessToken = MAPBOX_TOKEN;

/* A snapshot older than this earns a line saying so. Data is published by hand
   and will drift; one constant so the threshold tightens in one edit. */
const STALE_DAYS = 7;

const MONTHS = ['January','February','March','April','May','June','July',
                'August','September','October','November','December'];

/* the phone breakpoint, kept in step with the one in page.css by hand */
const PHONE_Q = '(max-width: 920px)';
const isPhone = () => !!(window.matchMedia && window.matchMedia(PHONE_Q).matches);

/* A run whose groups all sit in one district would otherwise open at street
   level, which reads as a bug rather than as a quiet month. */
const CITY_MAX_ZOOM = 14;
const CITY_LAYERS    = ['city-box-fill','city-box-line','city-solo','city-in'];
const CLUSTER_LAYERS = ['nb-dots','rr-x','rr-hit'];

const DATA_ERROR = 'We could not reach the permit data. Reply to the email this '
                 + 'page came with and we will send the list directly.';

/* ---------------------------------------------------------------- state */
let STAMP   = null;   // snapshot folder, fixed for the whole session
let PERMITS = [];     // every permit in the window, city-wide
let INDEX   = null;   // clusters.json
let YEARS   = null;   // suppression window, from clusters.json meta
let RECENT_SINCE = '';// a year before the last permit of the window

let SCREEN = null;    // null until the first route; then 'city' | 'cluster'
let CURID  = null;    // cluster id the cluster screen is showing

let CUR   = null;           // current cluster payload
let MODE  = 'mail';         // walk | mail — postcards lead; the channel is the product
const PICKED = new Set();   // addresses selected for postcards
let MAILN = null;           // how many postcards he wants; null = not set for this cluster
const pinMarkers = [];

let map = null;
let mapReady = false;
let mapDead = null;         // the reason the map is not there, kept for rewording
let cityPainted = false;

const $ = id => document.getElementById(id);
const fmt = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
const fmtLong = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric'}) : '';
const fmtMY = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'}) : '';
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* A permit belongs to a group or it does not. Cluster ids are sparse (a 28-
   cluster run numbers them into the hundreds) and they do not survive the next
   run, so they are only ever used as a grouping key, never as an index and
   never stored anywhere that outlives the page. */
const inCluster = p => p && p.cluster !== null && p.cluster !== undefined && p.cluster !== '';
const hasCluster = id => !!INDEX && INDEX.clusters.some(c => String(c.cluster) === String(id));

/* ----------------------------------------------------------------- boot */
/* latest.json is asked once. The stamp it hands back pins the session to one
   snapshot: files under a stamp are immutable, so a publish landing while the
   page is open cannot pull the data out from under a reader mid-click. */
fetch(DATA_BASE + 'latest.json', {cache:'no-cache'})
  .then(ok).then(j => {
    STAMP = j.stamp;
    return Promise.all([fetch(snap('permits.json')).then(ok),
                        fetch(snap('clusters.json')).then(ok)]);
  })
  .then(([p, c]) => { PERMITS = (p && p.permits) || []; INDEX = c; start(); })
  .catch(dataFailed);

function ok(r){ if (!r.ok) throw new Error(r.status); return r.json(); }
function snap(file){ return DATA_BASE + STAMP + '/' + file; }

function dataFailed(){
  $('map').innerHTML = mapMessage('The permit data did not load', DATA_ERROR, '');
  $('pane').innerHTML = '<p class="hint">' + DATA_ERROR + '</p>';
}

function start(){
  YEARS = INDEX.meta.suppress_years;
  const ds = PERMITS.map(p => p.d).filter(Boolean).sort();
  /* "recent" is anchored to the data window, never to the day the page is
     opened: a page still open in November must not reclassify a roof. */
  RECENT_SINCE = ds.length ? yearBefore(ds[ds.length - 1]) : '';
  fillChrome(ds);
  buildSelect();
  $('back').onclick = goCity;
  initMap();
  /* popstate covers the browser's back button, hashchange covers a hand-edited
     address. Both land in the same idempotent router. */
  window.addEventListener('popstate', applyHash);
  window.addEventListener('hashchange', applyHash);
  applyHash();
}

/* ------------------------------------------------------- runtime text */
function yearBefore(iso){
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y - 1, m - 1, d)).toISOString().slice(0, 10);
}
function ageInDays(generated){
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(generated || ''));
  if (!m) return null;
  return (Date.now() - Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])) / 86400000;
}

/* Every number on the page is counted here, from the same arrays the map
   draws. Nothing describing the current snapshot is written into the HTML. */
function fillChrome(ds){
  const winLong  = ds.length ? fmtLong(ds[0]) + ' – ' + fmtLong(ds[ds.length-1]) : '';
  const winShort = ds.length ? fmt(ds[0]) + '–' + fmt(ds[ds.length-1]) : '';
  $('dateline').textContent = COMPANY
    ? 'Roofing permits · San Francisco · ' + winLong
    : winLong;

  document.querySelectorAll('.yrs').forEach(e => e.textContent = YEARS);
  document.querySelectorAll('.win').forEach(e => e.textContent = winShort);
  const label = RECENT_SINCE
    ? MONTHS[+RECENT_SINCE.slice(5,7) - 1] + ' ' + RECENT_SINCE.slice(0,4) : '';
  document.querySelectorAll('.rsince').forEach(e => e.textContent = label);

  const total  = PERMITS.length;
  const inside = PERMITS.filter(inCluster).length;
  const groups = INDEX.clusters.length;
  $('lede-city').innerHTML =
      'The city issued <b>' + total + '</b> roofing permits in the last <b>'
    + INDEX.meta.window_days + '</b> days. <b>' + inside + '</b> of them sit inside <b>'
    + groups + '</b> groups of neighbouring addresses. Open a group to see the block. '
    + 'The scattered ones are single jobs with nothing around them to work with.'
    + '<span class="lede-2"><b>Why this isn’t a lead list.</b> A permit means that job '
    + 'is sold. The orange points are your competitors’ work, not your prospects.</span>';
  $('lede-cluster').innerHTML =
      'These are the houses on these blocks with no qualifying roofing permit found in <b>'
    + YEARS + '</b> years of available public records — that is where the work is. '
    + 'Walk it or mail it.';

  $('provenance').textContent =
    'Data pulled from the City of San Francisco on ' + INDEX.meta.generated + '.';
  const st = $('staleness');
  const age = ageInDays(INDEX.meta.generated);
  if (age !== null && age > STALE_DAYS){
    st.textContent = 'This snapshot is from ' + INDEX.meta.generated
                   + '. Newer permits may not be shown yet.';
    st.hidden = false;
  } else {
    st.hidden = true;
  }
}

function buildSelect(){
  const sel = $('pick');
  const byHood = {};
  INDEX.clusters.forEach(c => (byHood[c.nhood || 'San Francisco'] ||= []).push(c));
  Object.keys(byHood).sort().forEach(h => {
    const g = document.createElement('optgroup'); g.label = h;
    byHood[h].sort((a,b) => b.permits - a.permits).forEach(c => {
      const o = document.createElement('option');
      o.value = String(c.cluster);
      o.textContent = (c.streets||'').split(', ').slice(0,2).join(' · ')
        + '  —  ' + c.permits + ' permits, ' + c.neighbours + ' houses to work';
      g.appendChild(o);
    });
    sel.appendChild(g);
  });
  sel.addEventListener('change', () => goCluster(sel.value));
}

/* ------------------------------------------------------------------ map */
function mapMessage(head, body, tail){
  return '<div class="mapmsg"><div><b>' + head + '</b>' + body
       + (tail ? '<div class="mapmsg-t">' + tail + '</div>' : '') + '</div></div>';
}
function mapFailed(why){
  /* isStyleLoaded() is the second guard on purpose: the timeout below fires on
     a clock, and a map that is merely slow must not have its own canvas
     replaced by a message saying it never arrived. */
  if (mapReady || (map && map.isStyleLoaded())) return;
  mapDead = why;
  /* The fallback has to be true on the screen it is shown on: the city screen
     has no list beside it to fall back to. */
  $('map').innerHTML = mapMessage('The map did not load', why,
    SCREEN === 'cluster'
      ? 'The address lists on the right still work.'
      : 'Reply to the email this page came with and we will send the list directly.');
}

function boundsOf(list){
  const b = new mapboxgl.LngLatBounds();
  list.forEach(p => {
    if (typeof p.lon === 'number' && typeof p.lat === 'number') b.extend([p.lon, p.lat]);
  });
  return b;
}

/* The opening frame is the groups, not every permit. Singles scatter from the
   Marin end of the bridge down past the county line, and fitting all of them
   pushes the city itself into a third of the screen with the boxes too small to
   read — and the boxes are the offer. The singles are still drawn in full; some
   of them start one drag outside the frame, which is not the same as missing. */
function cityBounds(){
  const grouped = boundsOf(PERMITS.filter(inCluster));
  if (!grouped.isEmpty()) return grouped;
  return boundsOf(PERMITS);          // no groups this run: show what there is
}

/* A phone gives up far more of its map to a padding than a desktop does. */
function cityPad(){
  return isPhone() ? {top:20, bottom:20, left:20, right:20}
                   : {top:56, bottom:56, left:56, right:56};
}

/* The map is built after the data lands, so the opening view is the extent of
   the points it is about to draw — there is no hard-coded centre to go stale
   when the window moves. */
function initMap(){
  const b = cityBounds();
  const view = b.isEmpty()
    ? {center:[-122.4437, 37.7590], zoom:11.4}
    : {bounds:b, fitBoundsOptions:{padding:cityPad(), maxZoom:CITY_MAX_ZOOM}};
  try {
    map = new mapboxgl.Map(Object.assign({
      container:'map', style:'mapbox://styles/mapbox/satellite-streets-v12',
      minZoom:10, maxZoom:19, attributionControl:true, cooperativeGestures:true
    }, view));
    map.addControl(new mapboxgl.NavigationControl({showCompass:false}), 'top-right');
  } catch (e) {
    /* no WebGL, blocked CDN, hostile extension: the constructor throws. The
       lists are the product and never needed a map, so swallow it here. */
    map = null;
  }
  if (!map){
    mapFailed('This browser could not start the map (WebGL is off or blocked).');
    return;
  }
  map.on('error', e => {
    const err = (e && e.error) || {};
    const code = err.status || 0;
    const m = err.message || '';
    mapFailed(code === 401 || code === 403 || /401|403|token/i.test(m)
      ? 'Mapbox rejected the access token (' + (code || 'auth') + ').'
      : 'Could not reach Mapbox. A VPN or an ad blocker will do this.');
  });
  const timer = setTimeout(() => mapFailed('Mapbox did not respond in time.'), 9000);
  /* 'load' waits for every tile of the first view; 'style.load' fires as soon
     as sources and layers can be added, which is all this page needs. Take
     whichever comes first, once. */
  const ready = () => {
    if (mapReady) return;
    clearTimeout(timer);
    mapReady = true; mapDead = null;
    if (SCREEN === 'cluster') { if (CUR) paintLayers(); } else paintCity();
  };
  map.on('style.load', ready);
  map.on('load', ready);
  if (map.isStyleLoaded()) ready();
  /* the key does not take pointer events, so a tap that looks like it landed on
     the key lands on the map instead — fold it back rather than ignore it */
  map.on('click', () => setLegend(false));
  /* the panel changes width between modes, and disappears entirely on the city
     screen; Mapbox only watches the window, so tell it when its own box moves */
  if (window.ResizeObserver)
    new ResizeObserver(() => { if (mapReady) map.resize(); }).observe($('map'));
}

function setVis(ids, on){
  if (!map) return;
  ids.forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  });
}
function clearPins(){ pinMarkers.splice(0).forEach(m => m.remove()); }

/* ---------------------------------------------------------- city layers */
/* 331 points is a circle layer, not 331 DOM nodes: the marker-per-permit shape
   that serves a seven-permit cluster falls over at city scale. */
function cityFC(){
  return {type:'FeatureCollection', features: PERMITS.map(p => ({
    type:'Feature', geometry:{type:'Point', coordinates:[p.lon, p.lat]},
    properties:{
      a:p.a || '', d:p.d || '', record:p.record || '', url:p.url || '',
      cid: inCluster(p) ? String(p.cluster) : '', grp: inCluster(p) ? 1 : 0
    }
  }))};
}

/* One box per group, from the extent of that group's own permits. The box is
   deliberately not the extent of the cluster's neighbour list: the block a
   walker gets reaches a couple of streets further, so opening a group zooms
   out past its box. That is the honest picture, not a defect. */
function boxFC(){
  const by = {};
  PERMITS.forEach(p => { if (inCluster(p)) (by[String(p.cluster)] ||= []).push(p); });
  const feats = [];
  Object.keys(by).forEach(k => {
    if (!hasCluster(k)) return;
    const g = by[k];
    let n = -Infinity, s = Infinity, e = -Infinity, w = Infinity;
    g.forEach(p => {
      n = Math.max(n, p.lat); s = Math.min(s, p.lat);
      e = Math.max(e, p.lon); w = Math.min(w, p.lon);
    });
    /* a two-permit group on one street is a line, not a rectangle; the floor
       keeps every box a target a finger can hit */
    const kx = Math.cos((n + s) / 2 * Math.PI / 180) || 1;
    const padLat = Math.max((n - s) * 0.16, 0.0011);
    const padLon = Math.max((e - w) * 0.16, 0.0011 / kx);
    n += padLat; s -= padLat; e += padLon; w -= padLon;
    const c = INDEX.clusters.find(x => String(x.cluster) === k) || {};
    feats.push({type:'Feature',
      properties:{cid:k, permits:g.length, nhood:c.nhood || '',
                  streets:(c.streets || '').split(', ').slice(0,3).join(' · '),
                  neighbours:c.neighbours || 0},
      geometry:{type:'Polygon', coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}});
  });
  return {type:'FeatureCollection', features:feats};
}

function paintCity(){
  if (!map || !mapReady) return;
  if (!cityPainted){
    map.addSource('city-boxes', {type:'geojson', data: boxFC()});
    map.addLayer({id:'city-box-fill', type:'fill', source:'city-boxes',
      paint:{'fill-color':'#FF6B1A', 'fill-opacity':0.10}});
    map.addLayer({id:'city-box-line', type:'line', source:'city-boxes',
      paint:{'line-color':'#FF9B57', 'line-width':1.4, 'line-opacity':0.9}});

    map.addSource('city-permits', {type:'geojson', data: cityFC()});
    /* Same colour, two weights. A permit with no neighbours is the same fact —
       a roof sold — it just has nothing around it, so it reads quieter. */
    map.addLayer({id:'city-solo', type:'circle', source:'city-permits',
      filter:['==',['get','grp'],0], paint:{
        'circle-radius':['interpolate',['linear'],['zoom'],10,2,13,3.2,16,5,19,8],
        'circle-color':'#FF6B1A', 'circle-opacity':0.45
      }});
    map.addLayer({id:'city-in', type:'circle', source:'city-permits',
      filter:['==',['get','grp'],1], paint:{
        'circle-radius':['interpolate',['linear'],['zoom'],10,3.2,13,4.6,16,7,19,11],
        'circle-color':'#FF6B1A', 'circle-opacity':0.95,
        'circle-stroke-width':1.6, 'circle-stroke-color':'#FFFFFF',
        'circle-stroke-opacity':0.95
      }});
    wireCity();
    cityPainted = true;
  }
  CITY_LAYERS.forEach(id => { if (map.getLayer(id)) map.moveLayer(id); });
  setVis(CLUSTER_LAYERS, false);
  setVis(CITY_LAYERS, true);
  clearPins();
  const b = cityBounds();
  if (!b.isEmpty()) map.fitBounds(b, {padding:cityPad(), duration:420, maxZoom:CITY_MAX_ZOOM});
}

function wireCity(){
  const open = e => {
    const f = e.features && e.features[0];
    if (f && f.properties.cid) goCluster(f.properties.cid);
  };
  map.on('click', 'city-in', open);
  map.on('click', 'city-box-fill', e => {
    /* a lone permit can sit inside another group's box; its popup wins, and
       the box underneath must not also navigate */
    if (map.queryRenderedFeatures(e.point, {layers:['city-solo']}).length) return;
    open(e);
  });
  ['city-in','city-box-fill'].forEach(id => {
    map.on('mouseenter', id, () => {
      if (SCREEN === 'city') map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
  });

  /* A single permit is not a door to knock on and not a block to work, so it
     never becomes a link — it answers with its own record and nothing else. */
  const pop = new mapboxgl.Popup({offset:11, closeButton:false});
  map.on('click', 'city-solo', e => {
    const f = e.features && e.features[0];
    if (!f) return;
    const p = f.properties;
    pop.setLngLat(f.geometry.coordinates.slice()).setHTML(
      '<div class="pop"><b>' + esc(p.a) + '</b><div class="m">roofing permit issued '
      + fmt(p.d) + (p.record ? ' · ' + esc(p.record) : '') + '</div>'
      + (p.url ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">city record &rarr;</a>' : '')
      + '<div class="m solo">No other permit near it in this window.</div></div>'
    ).addTo(map);
  });
}

/* ------------------------------------------------------------- screens */
function enterCity(missingId){
  const note = $('notice');
  if (missingId){
    note.textContent = 'That group is not in the current data — the city map below is up to date.';
    note.hidden = false;
  } else {
    note.hidden = true; note.textContent = '';
  }
  if (SCREEN === 'city') return;
  SCREEN = 'city'; CURID = null; CUR = null;
  document.body.dataset.screen = 'city';
  if (mapDead) mapFailed(mapDead);
  paintCity();
}

function enterCluster(id){
  $('notice').hidden = true;
  if (SCREEN === 'cluster' && String(CURID) === String(id)) return;
  SCREEN = 'cluster'; CURID = String(id);
  document.body.dataset.screen = 'cluster';
  const sel = $('pick');
  if (sel.value !== String(id)) sel.value = String(id);
  if (mapDead) mapFailed(mapDead);
  setVis(CITY_LAYERS, false);
  clearPins();
  load(id);
}

/* The hash is the address of the screen; every entrance goes through here so
   the back button and a click behave the same way. */
function applyHash(){
  const m = /^#c([A-Za-z0-9_-]+)$/.exec(location.hash || '');
  const id = m ? m[1] : null;
  if (id && hasCluster(id)) enterCluster(id);
  /* A group id does not survive the next data run, so a saved or forwarded
     link will one day point at nothing. It has to say so rather than open a
     different block quietly. */
  else enterCity(id);
}
function goCluster(id){
  if (SCREEN === 'cluster' && String(CURID) === String(id)) return;
  history.pushState({c:String(id)}, '', '#c' + id);
  enterCluster(id);
}
function goCity(){
  if (SCREEN === 'city' && !location.hash) return;
  history.pushState({}, '', location.pathname + location.search);
  enterCity(null);
}

/* -------------------------------------------------------- cluster layers */
function fc(list, extra){
  return {type:'FeatureCollection', features:list.map(x => ({
    type:'Feature', geometry:{type:'Point', coordinates:[x.lon, x.lat]},
    properties: Object.assign({a:x.a, zip:x.zip||'', d:x.d||''}, extra ? extra(x) : {})
  }))};
}

function paintLayers(){
  if (!map || !mapReady || SCREEN !== 'cluster' || !CUR) return;
  const nb = {type:'geojson', data: fc(CUR.neighbours, x => ({sel: PICKED.has(x.a) ? 1 : 0}))};
  const rr = {type:'geojson', data: fc(CUR.reroofed, x => ({recent: (x.d && x.d >= RECENT_SINCE) ? 1 : 0}))};

  if (map.getSource('nb')) map.getSource('nb').setData(nb.data); else {
    map.addSource('nb', nb);
    map.addLayer({id:'nb-dots', type:'circle', source:'nb', paint:{
      'circle-radius':['interpolate',['linear'],['zoom'],13,3,16,6.2,19,10.5],
      'circle-color':['case',['==',['get','sel'],1],'#4ED08A','#5FB0E8'],
      'circle-opacity':0.85,
      'circle-stroke-width':['case',['==',['get','sel'],1],2,1],
      'circle-stroke-color':['case',['==',['get','sel'],1],'#FFFFFF','#0F1720'],
      'circle-stroke-opacity':0.85
    }});
    map.on('click','nb-dots', e => toggle(e.features[0].properties.a));
    map.on('mouseenter','nb-dots', () => map.getCanvas().style.cursor='pointer');
    map.on('mouseleave','nb-dots', () => map.getCanvas().style.cursor='');
  }

  if (map.getSource('rr')) map.getSource('rr').setData(rr.data); else {
    map.addSource('rr', rr);
    /* Two steps, one family. Orange means "a permit exists"; the filled pin is
       this window, the cross is history. A roof done eight months ago is not a
       reason to skip the block — it is evidence the block is in its cycle. */
    map.addLayer({id:'rr-x', type:'symbol', source:'rr', layout:{
      'text-field':'✕',
      'text-size':['interpolate',['linear'],['zoom'],13,16,16,24,19,32],
      'text-font':['DIN Pro Bold','Arial Unicode MS Bold'],
      'text-allow-overlap':true, 'text-ignore-placement':true
    }, paint:{
      /* white halo, same treatment as the permit pin's ring: it is what makes a
         thin glyph survive a bright roof. That forces the older step to go dark
         rather than light — light core inside a white ring is mush. */
      'text-color':['case',['==',['get','recent'],1],'#FF8C42','#243240'],
      'text-opacity':1,
      'text-halo-color':'#FFFFFF', 'text-halo-width':2, 'text-halo-blur':0.2
    }});
    /* draw small, catch large: a glyph is a hard target for a finger */
    map.addLayer({id:'rr-hit', type:'circle', source:'rr', paint:{
      'circle-radius':['interpolate',['linear'],['zoom'],13,9,16,13,19,17],
      'circle-color':'#000', 'circle-opacity':0
    }});
    const rrPop = new mapboxgl.Popup({offset:12, closeButton:false});
    const showRR = e => {
      const f = e.features && e.features[0];
      if (!f) return;
      rrPop.setLngLat(f.geometry.coordinates.slice())
           .setHTML('<div class="pop"><b>' + esc(f.properties.a) + '</b>'
                  + '<div class="m">reroofed ' + fmtMY(f.properties.d) + '</div></div>')
           .addTo(map);
    };
    map.on('click', 'rr-hit', showRR);
    /* hover is a desktop affordance; on a phone the same layer answers to a tap */
    if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches){
      map.on('mouseenter', 'rr-hit', e => { map.getCanvas().style.cursor = 'default'; showRR(e); });
      map.on('mouseleave', 'rr-hit', () => rrPop.remove());
    }
  }
  setVis(CITY_LAYERS, false);
  setVis(CLUSTER_LAYERS, true);
  if (map.getLayer('rr-hit')) map.moveLayer('rr-hit');
  if (map.getLayer('rr-x')) map.moveLayer('rr-x');
  if (map.getLayer('nb-dots')) map.moveLayer('nb-dots');

  clearPins();
  CUR.permits.forEach(p => {
    const el = document.createElement('div');
    el.style.cssText = 'width:17px;height:17px;cursor:pointer';
    const dot = document.createElement('div');   // animate the INNER node only
    dot.style.cssText = 'width:100%;height:100%;border-radius:50%;background:#FF6B1A;'
      + 'box-shadow:0 0 0 3px #fff,0 3px 10px rgba(0,0,0,.6)';
    el.appendChild(dot);
    const pop = new mapboxgl.Popup({offset:16}).setHTML(
      '<div class="pop"><b>'+esc(p.a)+'</b><div class="m">roofing permit issued '+fmt(p.d)
      + (p.record ? ' · '+esc(p.record) : '') + '</div>'
      + (p.url ? '<a href="'+esc(p.url)+'" target="_blank" rel="noopener">city record &rarr;</a>' : '')
      + '</div>');
    pinMarkers.push(new mapboxgl.Marker({element:el}).setLngLat([p.lon,p.lat]).setPopup(pop).addTo(map));
  });

  /* Frame the permits — the neighbour list reaches on to streets a couple of
     blocks away, and fitting all of it zooms the cluster down to a quarter of
     the screen. Neighbours that fall outside are still one drag away. */
  const b = new mapboxgl.LngLatBounds();
  CUR.permits.forEach(p => b.extend([p.lon,p.lat]));
  if (b.isEmpty()) CUR.neighbours.forEach(n => b.extend([n.lon,n.lat]));
  if (!b.isEmpty()) map.fitBounds(b, {padding:{top:90,bottom:90,left:90,right:90},
                                      duration:400, maxZoom:17.4});
}

/* ---------------------------------------------------------------- panel */
function load(id){
  fetch(snap('cluster_' + id + '.json')).then(ok).then(j => {
    if (String(CURID) !== String(id)) return;   // he moved on while it was in flight
    CUR = j; PICKED.clear(); MAILN = null; paintLayers(); render();
    $('pane').scrollTop = 0;
  }).catch(() => {
    $('pane').innerHTML = '<p class="hint">' + DATA_ERROR + '</p>';
  });
}

/* "95 CASELLI AVE" -> CASELLI AVE.  SF writes unit letters loose from the
   number ("1421 A CLAYTON ST" is 1421A Clayton), so a lone letter after the
   number is a unit, not the start of a street name — drop it, or that address
   becomes a street of its own with one door on it. */
function street(a){
  return String(a).replace(/^\d+[A-Za-z]?\s+(?:[A-Za-z]\s+(?=\S+\s))?/,'').toUpperCase();
}
function num(a){ return parseInt(a,10) || 0; }

/* Blocks in SF run across several streets, so a cluster's neighbour list picks up
   roads two blocks away. Put the streets that actually carry fresh permits first,
   then the rest by size — a walker works one street at a time. */
function groupStreets(list, permits){
  const hot = new Set(permits.map(p => street(p.a)));
  const by = {};
  list.forEach(n => (by[street(n.a)] ||= []).push(n));
  const key = s => [hot.has(s) ? 0 : 1, -by[s].length, s];
  const order = Object.keys(by).sort((a,b) => {
    const ka = key(a), kb = key(b);
    return ka[0]-kb[0] || ka[1]-kb[1] || String(ka[2]).localeCompare(kb[2]);
  });
  order.forEach(s => by[s].sort((a,b) => num(a.a)-num(b.a)));
  return {by, order, hot};
}

/* ------------------------------------------------------- picking helpers */
/* Flat-earth distance is fine at city scale; cos(lat) keeps longitude honest.
   Distance is measured to the NEAREST permit, not to the cluster centroid: a
   postcard earns its stamp by landing next to visible work, and the centroid
   of a seven-permit cluster can sit on a block with nothing on it. */
function dist(a, b){
  const k = Math.cos(a.lat * Math.PI / 180);
  const dx = (a.lon - b.lon) * k, dy = a.lat - b.lat;
  return Math.sqrt(dx*dx + dy*dy);
}
function nearestPermit(n){
  let best = Infinity;
  CUR.permits.forEach(p => { const d = dist(n, p); if (d < best) best = d; });
  return best;
}
/* Default drop: ten neighbours per fresh permit, closest first. Ten is a
   starting point he overrides, not a rule — the field is right there. */
function defaultN(){
  return Math.min(CUR.permits.length * 10, CUR.neighbours.length);
}
function autoPick(n){
  PICKED.clear();
  CUR.neighbours
    .map(x => ({a: x.a, d: nearestPermit(x)}))
    .sort((u, v) => u.d - v.d)
    .slice(0, Math.max(0, n))
    .forEach(x => PICKED.add(x.a));
  if (map && map.getSource('nb'))
    map.getSource('nb').setData(fc(CUR.neighbours, x => ({sel: PICKED.has(x.a) ? 1 : 0})));
}

function render(){
  const pane = $('pane');
  const dl = $('dl');
  const clear = $('clear');
  if (!CUR) return;

  if (MODE === 'walk'){
    const g = groupStreets(CUR.neighbours, CUR.permits);
    const hotN = g.order.filter(s => g.hot.has(s)).reduce((n,s)=>n+g.by[s].length,0);
    let h = '<p class="hint">'
          + (CUR.capped
              ? 'The ' + CUR.neighbours.length + ' houses on these blocks closest to the fresh '
                + 'permits — the list is capped there — with no qualifying roofing permit on record. '
              : 'Every house on these blocks with no qualifying roofing permit on record. ')
          + hotN + ' of them sit on the streets where those permits were issued; '
          + 'the rest share the same city blocks.</p>';
    let section = null;
    g.order.forEach(s => {
      const hot = g.hot.has(s);
      if (section !== hot){
        section = hot;
        h += '<div class="grp'+(hot?' hot':'')+'">' + (hot ? 'Streets with fresh permits' : 'Same blocks, nearby streets') + '</div>';
      }
      h += '<div class="st'+(hot?' hot':'')+'">'+esc(s)+'<span>'+g.by[s].length+'</span></div>';
      g.by[s].forEach(n => {
        h += '<div class="row"><b>'+esc(n.a)+'</b><span class="z">'+esc(n.zip)+'</span></div>';
      });
    });
    pane.innerHTML = h;
    $('count').innerHTML =
      '<b>'+CUR.neighbours.length+'</b> doors &middot; ' + g.order.length + ' streets';
    dl.textContent = 'Download the walk list';
    dl.disabled = false;
    clear.hidden = true;
  } else {
    if (MAILN === null){ MAILN = defaultN(); autoPick(MAILN); }
    let h = '<div class="mailn"><label for="mailn-in">Postcards</label>'
          + '<input id="mailn-in" type="number" inputmode="numeric" min="0" max="'
          + CUR.neighbours.length + '" value="' + MAILN + '">'
          + '<span class="mailn-note">of ' + CUR.neighbours.length + ' houses on these blocks, '
          + 'closest to the fresh permits</span></div>'
          + '<p class="hint">Change the number and we repick. Then look at the roofs: click a '
          + 'blue house on the map — or a row below — to drop one or add one. The map is '
          + 'satellite imagery at street level, and your eye is the only classifier that knows a '
          + 'tired roof when it sees one.</p>';
    const g = groupStreets(CUR.neighbours, CUR.permits);
    let section = null;
    g.order.forEach(s => {
      const hot = g.hot.has(s);
      if (section !== hot){
        section = hot;
        h += '<div class="grp'+(hot?' hot':'')+'">' + (hot ? 'Streets with fresh permits' : 'Same blocks, nearby streets') + '</div>';
      }
      h += '<div class="st'+(hot?' hot':'')+'">'+esc(s)+'<span>'+g.by[s].length+'</span></div>';
      g.by[s].forEach(n => {
        h += '<div class="row pick'+(PICKED.has(n.a)?' on':'')+'" data-a="'+esc(n.a)+'">'
           + '<b>'+esc(n.a)+'</b><span class="z">'+esc(n.zip)+'</span></div>';
      });
    });
    pane.innerHTML = h;
    pane.querySelectorAll('.row.pick').forEach(r =>
      r.addEventListener('click', () => toggle(r.dataset.a)));
    const inp = pane.querySelector('#mailn-in');
    if (inp) inp.addEventListener('change', () => {
      MAILN = Math.max(0, Math.min(CUR.neighbours.length, parseInt(inp.value, 10) || 0));
      autoPick(MAILN);
      render();
    });
    const n = PICKED.size;
    $('count').innerHTML = n ? '<b>'+n+'</b> postcards' : 'Nothing picked yet';
    dl.textContent = 'Download the mailing list';
    dl.disabled = !n;
    clear.hidden = !n;
  }
}

function toggle(a){
  if (!CUR) return;
  PICKED.has(a) ? PICKED.delete(a) : PICKED.add(a);
  if (map && map.getSource('nb'))
    map.getSource('nb').setData(fc(CUR.neighbours, x => ({sel: PICKED.has(x.a) ? 1 : 0})));
  if (MODE === 'mail') render();
}

/* ------------------------------------------------------------- the map key */
/* Folded on a phone, always open on a desktop — the stylesheet decides which,
   this only carries the state. Wired at the top level, like setMode below: the
   button is in the markup whether or not any data ever arrives. */
function setLegend(open){
  document.body.dataset.legend = open ? 'open' : 'shut';
  $('legend-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
}
$('legend-toggle').onclick = () => setLegend(document.body.dataset.legend !== 'open');
setLegend(false);

$('tab-walk').onclick = () => setMode('walk');
$('tab-mail').onclick = () => setMode('mail');
function setMode(m){
  MODE = m;
  $('tab-walk').setAttribute('aria-selected', m==='walk');
  $('tab-mail').setAttribute('aria-selected', m==='mail');
  render();
}
/* the markup ships with postcards pre-selected; this keeps aria-selected, the
   :has() rules in the stylesheet and MODE from ever disagreeing. It runs before
   any data has landed, which is why render() returns on a null CUR. */
setMode(MODE);

$('clear').onclick = () => {
  if (!CUR) return;
  PICKED.clear();
  if (map && map.getSource('nb')) map.getSource('nb').setData(fc(CUR.neighbours, () => ({sel:0})));
  render();
};

$('dl').onclick = () => {
  if (!CUR) return;
  const nice = (CUR.nhood||'sf').replace(/[^A-Za-z]/g,'').slice(0,14) || 'sf';
  const who = SLUG || 'sf';
  let rows, name;
  if (MODE === 'walk'){
    const g = groupStreets(CUR.neighbours, CUR.permits);
    rows = [['address','zip','neighbourhood','street has a fresh permit','note']];
    g.order.forEach(s => g.by[s].forEach(n =>
      rows.push([n.a, n.zip, n.nhood, g.hot.has(s) ? 'yes' : 'no',
                 'no qualifying roofing permit found in ' + YEARS
                 + ' years of available public records'])));
    rows = rows.concat([[]], [['--- permits issued in this window ---']],
      [['address','issued','record','city record']],
      CUR.permits.map(p => [p.a, p.d, p.record, p.url]));
    name = who+'__walk__'+nice+'.csv';
  } else {
    rows = [['address','zip','neighbourhood']].concat(
      CUR.neighbours.filter(n => PICKED.has(n.a)).map(n => [n.a, n.zip, n.nhood]));
    name = who+'__postcards__'+nice+'.csv';
  }
  rows.push([]);
  rows.push(['No permit found does not mean that roofing work was never performed. '
           + 'Results reflect the available public permit history.']);
  const csv = rows.map(r => r.map(v => '"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
