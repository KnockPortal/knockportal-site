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
     #clear #save #tomail #dl  buttons
     #savenote  line under the buttons; how the last save went
     #strip     the mailing, standing under both screens
     #strip-sum what is in the mailing and what printing it costs
     #mail-clear #mail-send   the mailing's own two buttons
     #strip-say line under the strip; how the last mailing call went
     #dateline #lede-city #lede-cluster #notice #provenance #staleness
     #zoomnote  empty plate over the map; the neighbour layer's own message
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

/* Two addresses closer together than this are two doors under one roof, not two
   houses: the city geocodes a duplex and its unit letter — 700 and 700 A — to
   the one building point. Well under the step of an SF block, which runs around
   7.6 m, and well over the last digit the geocoder ever disagrees with itself
   by. The map's unit is the roof, because the roof is what gets replaced. */
const SAME_BUILDING_M = 2;

/* A neighbour dot stands for one building, and buildings stand metres apart —
   so the dot is sized on the ground, not on the screen. A radius in pixels
   turns a dense block into an unbroken ribbon at exactly the zoom where the
   block is worth reading. The ground size is a share of that cluster's own
   measured spacing, so a dense street and a sparse hillside both come out with
   a gap between dots; no size in metres is fixed here by decree. */
const DOT_FRACTION = 0.7;   /* share of the median step one dot takes up       */
const MIN_DOT_PX   = 6;     /* smallest on-screen diameter still worth drawing */
const MAX_DOT_M    = 12;    /* ceiling on the ground diameter, in metres       */
const ZOOM_FLOOR   = 13;    /* lowest the computed cutoff may sit              */
const ZOOM_CEIL    = 18;    /* highest the computed cutoff may sit             */

/* Zoom levels of headroom the opening frame keeps above the cutoff. The cutoff
   is where a dot has shrunk to the smallest size we are willing to call
   readable, so opening exactly on it would hand every cluster too wide for its
   frame the worst view we allow — and hand it that every time, not as the
   exception. This belongs to the frame and to nothing else: the layers and the
   note are still measured against the bare cutoff, and the play between the
   two is what lets him pull back a little before the dots go. */
const OPEN_ZOOM_MARGIN = 0.5;

/* Metres per pixel at zoom 0 on the equator: Web Mercator over 512-px tiles.
   Every metre-to-pixel conversion on this page goes through it. */
const M_PER_PX_Z0 = 78271.51696;
/* Metres in a degree of latitude, and in a degree of longitude at the equator:
   the scale that turns a pair of coordinates into a distance on the ground. */
const M_PER_DEG = 111320;
/* Measuring the spacing is quadratic in the length of the list, which is
   nothing at a few hundred addresses. Past this the median is read off a
   random sample: a cost guard, not a different answer. */
const STEP_SAMPLE_MAX = 2000;

/* shown over a live map when the dots have been dropped for being too small */
const ZOOM_NOTE = 'Zoom in to pick houses — at this distance one dot would cover several of them.';

/* Sent as the event data of every camera move this page orders, and handed back
   by Mapbox on every event that move fires. It is the whole of how a flight the
   page started is told apart from a wheel, a drag or a pinch — which carry an
   originalEvent and never carry this. Nothing latches on it, so a gesture that
   cuts a flight short needs no unwinding: its own events simply arrive without
   the marker. */
const FLIGHT = {kpFlight: true};

/* A run whose groups all sit in one district would otherwise open at street
   level, which reads as a bug rather than as a quiet month. */
const CITY_MAX_ZOOM = 14;
const MAP_MAX_ZOOM     = 19;    /* the map's own ceiling */
const CLUSTER_MAX_ZOOM = 17.4;  /* how far a cluster frame may close in */
const CITY_LAYERS    = ['city-box-fill','city-box-line','city-solo','city-in'];
/* the drawn dot and the target it is caught by come and go together */
const NB_LAYERS      = ['nb-dots','nb-hit'];
const CLUSTER_LAYERS = ['nb-dots','nb-hit','rr-x','rr-hit'];

const DATA_ERROR = 'We could not reach the permit data. Reply to the email this '
                 + 'page came with and we will send the list directly.';

/* Where a selection waits while he signs in. This page has no session of its
   own and never will: a save answered with 401 is parked here, the browser goes
   to the workspace, and the page there finishes what was started. One key, one
   tab, and it is gone the moment it has been read. */
const PENDING_KEY = 'kp_pending_selection';

/* ?selection= carries the id of a saved row. Anything else came from a hand-
   edited address: it earns no request, because the route would answer 404 to
   it, and no sentence, because nothing was promised. */
const SELECTION_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* the save button's resting label, put back after every attempt */
const SAVE_LABEL = 'Save selection';

/* resting labels of the three mailing buttons, put back after every attempt */
const TOMAIL_LABEL = 'Add to mailing';
const MAIL_CLEAR_LABEL = 'Clear the mailing';
const MAIL_SEND_LABEL = 'Send';
/* How long the clear button stays armed after the first press. The mailing is
   collected across several groups, and one stray tap must not empty it. */
const CLEAR_CONFIRM_MS = 4000;

/* Where the sign-in is sent, and where it sends him back. This page has no
   session and the workspace page has no idea what he was doing — so the way
   back travels on the address. location.search goes over whole: ?from= is what
   makes the personal variant personal, and returning without it returns him to
   a different page than he left. */
const NEXT_PARAM = () => '/app?next=' + encodeURIComponent(location.pathname + location.search);

/* Every sentence the paid side of the page says. They are gathered here rather
   than written where they are used because the same three refusals reach the
   man from two different places — the strip and the panel — and a wall that
   words itself differently depending on which button he pressed is two walls.
   Nothing here states a price: {PRICE} is whatever the server was told by
   Stripe, formatted by money(). */
const S = {
  SIGN_IN_SEND: 'Sign in to send this mailing. <a href="' + NEXT_PARAM()
              + '">Sign in</a> — your addresses stay with you.',
  OFFER: offer => 'Sending is by subscription: <b>' + money(offer.amount_cents)
               + '/month</b> for ' + esc(offer.label)
               + '. <a href="#" data-kp-subscribe>Subscribe</a>',
  OFFER_NO_PRICE: 'Sending is by subscription. <a href="#" data-kp-subscribe>Subscribe</a>',
  NOT_ACTIVE: 'The subscription is not active. <a href="/app">Manage billing</a>',
  EXPIRED: offer => 'The subscription has run out. <a href="#" data-kp-subscribe>Renew</a>',
  ALREADY: 'This workspace already has the subscription. Press Send again.',
  CHECKOUT_FAIL: code => 'We could not open checkout. HTTP ' + code,
  RETURN_SUCCESS: 'Payment received. Press Send again — if the subscription is still '
                + 'being confirmed, try again in a moment.',
  RETURN_CANCEL: 'Checkout was cancelled. The mailing stays on this page.',
  SIGN_IN_DOWNLOAD: 'Sign in to download this list. <a href="' + NEXT_PARAM()
                  + '">Sign in</a> — your picks stay on this page.',
  DOWNLOAD_NEEDS_SUB: 'Downloading this list needs a subscription. Subscribe from the '
                    + 'mailing strip below — press Send.'
};

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

/* The mailing. It stands above the group, which is the whole of why it is up
   here beside PICKED and not inside it: entering a group empties PICKED and
   never touches this. Nothing in this file adds to it or counts it — every one
   of the three is overwritten from the server's answer, and the cost arrives
   already counted, in cents. */
const CART = new Set();     // addresses already in the mailing
let CART_ID = null;         // the draft's id, or null while there is no draft
let CART_COST = 0;          // what printing it costs, in cents, as the server said
/* the timer of the armed clear button; null when it is at rest */
let CLEAR_ARMED = null;
/* a checkout request is in the air; a second Subscribe click is ignored */
let CHECKOUT_BUSY = false;
/* the word about a return from checkout is said once per load, whatever else
   redraws the strip afterwards */
let RETURN_SAID = false;

/* A saved selection on its way back onto the map. The row is asked for at load,
   at the same moment as the data and not after it: the two are independent, and
   they land in either order — so both sides call restoreJoin() and whichever is
   second finds both halves there. Everything here is emptied the moment it has
   been used, because the restore runs once per load: entering the same group
   again by hand must not deal the same hand a second time. */
let RESTORE      = null;   // the saved row, waiting for its group to open
let RESTORE_NOTE = null;   // what to say about it, once there is a screen to say it on
let ROUTED       = false;  // the first route has run: a screen exists to talk on

let map = null;
let mapReady = false;
let mapDead = null;         // the reason the map is not there, kept for rewording
let cityPainted = false;

/* The cluster's addresses folded onto the roofs they sit on. The map draws,
   catches and selects by these; the panel, the counter and the CSV go on
   dealing in addresses, because a postcard goes to an address. */
let NB_BUILDINGS = [];      // {lon, lat, addrs:[…]} — one entry per roof
let NB_OF_ADDR = new Map(); // address -> the building it belongs to

/* Measured from the current cluster's own buildings when it lands; every
   metre-based map expression below reads these and nothing else. */
let NB_STEP_M = 0;          // median distance to the nearest other building
let NB_DOT_M  = 0;          // ground diameter of a drawn dot
let NB_HIT_M  = 0;          // ground diameter of the target it is caught by
let NB_MIN_Z  = ZOOM_FLOOR; // under this zoom the neighbour layers stay off
let NB_LAT    = 37.76;      // cluster latitude, for the metre-to-pixel scale
/* what the two neighbour layers were last set to. A zoom fires on every frame
   of a flight and every notch of a wheel; without this, each of those frames
   would write a layout property that already says what it is being told. */
let NB_SHOWN  = null;       // null until either screen has set it once

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

/* Sent off beside the data rather than behind it: the saved row depends on
   neither the snapshot nor the map, and waiting would put a whole round trip
   between the man and his own selection. */
restoreStart();

/* The mailing is asked for here too, for the same reason: it belongs to no
   snapshot and to no group, and the strip should be telling the truth by the
   time the first map tile lands. */
cartLoad();

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
  /* The hash has had its say; a ?selection= waiting to be restored outranks it
     and gets the last word. */
  ROUTED = true;
  restoreJoin();
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
      minZoom:10, maxZoom:MAP_MAX_ZOOM, attributionControl:true, cooperativeGestures:true
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
  /* The neighbour dots have a zoom under which they stop meaning one house
     each. 'zoom' fires all the way through a wheel, a pinch or a flight, so the
     layers follow the camera in both directions rather than being decided once
     at load. Only a flight the page ordered holds the note back, and only while
     it is in the air: 'moveend' is the landing and answers with the truth. */
  map.on('zoom', e => applyDotVisibility(!!(e && e.kpFlight)));
  map.on('moveend', () => applyDotVisibility(false));
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
  NB_SHOWN = false;       // the line above covers the neighbour layers as well
  setVis(CITY_LAYERS, true);
  clearPins();
  applyDotVisibility();   // the city screen never carries the neighbour note
  const b = cityBounds();
  if (!b.isEmpty())
    map.fitBounds(b, {padding:cityPad(), duration:420, maxZoom:CITY_MAX_ZOOM}, FLIGHT);
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
  setSaveNote('');          // whatever was saved, it was saved on another screen
  /* the mailing itself crosses the screen; only the line about the last call
     to it does not */
  sayStrip(''); resetClearConfirm();
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
  setSaveNote('');          // a different group is a different selection
  sayStrip(''); resetClearConfirm();
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

/* ----------------------------------------------------------- restoring */
/* A selection saved from this page comes back by id on the address. What the
   row carries is addresses and a centre — never a group id, because ids do not
   survive the next data run and nothing outside this page may store one. So the
   group is found the only way left: the one whose own centre in clusters.json
   is nearest. That file carries lat and lon for every group already, and
   metres() is the same measure the map is built on. */
function restoreStart(){
  const m = /[?&]selection=([^&#]*)/.exec(location.search || '');
  /* Read raw and not decoded: an id has nothing in it that needs escaping, so
     anything percent-encoded fails the test below anyway — and decoding a
     half-written escape throws, which at the top level of this file would take
     the rest of the page's wiring down with it. */
  const id = m ? m[1] : '';
  if (!SELECTION_RE.test(id)) return;
  fetch('/api/selections/' + id, {credentials:'same-origin'})
    .then(r => {
      if (r.ok) return r.json().then(row => { RESTORE = row; });
      if (r.status === 401)
        RESTORE_NOTE = 'Sign in to open your saved selection, then reload this page.';
      else if (r.status === 404)
        RESTORE_NOTE = 'That saved selection is gone.';
      else
        RESTORE_NOTE = 'Your saved selection could not be loaded. HTTP ' + r.status;
    })
    .catch(e => {
      RESTORE_NOTE = 'Your saved selection could not be loaded. '
                   + String((e && e.message) || e);
    })
    .then(restoreJoin);
}

/* Both halves have to be in: the row, and a page that has already routed once —
   there is no screen to open a group on and no #notice worth writing before
   that. Whichever half lands second is the one that gets through here. */
function restoreJoin(){
  if (!ROUTED) return;
  if (RESTORE_NOTE){ restoreSay(); return; }
  if (!RESTORE) return;
  const row = RESTORE;
  /* No centre, no group. Addresses alone do not say which block they are on,
     and this page will not open every cluster file in the run to find out. */
  if (typeof row.center_lat !== 'number' || typeof row.center_lon !== 'number'){
    RESTORE = null;
    RESTORE_NOTE = 'None of the saved addresses are in the current data.';
    restoreSay();
    return;
  }
  const target = {lat:row.center_lat, lon:row.center_lon};
  let best = null, bestD = Infinity;
  INDEX.clusters.forEach(c => {
    if (typeof c.lat !== 'number' || typeof c.lon !== 'number') return;
    const d = metres(target, c);
    if (d < bestD){ bestD = d; best = c; }
  });
  if (!best){
    RESTORE = null;
    RESTORE_NOTE = 'None of the saved addresses are in the current data.';
    restoreSay();
    return;
  }
  /* The same door a click on the map goes through: the hash moves, the group
     loads, and load() puts the addresses back when its payload lands. If that
     group is already open and already loaded, goCluster does nothing at all —
     so the applying is done here instead, and the note goes up after it. */
  if (SCREEN === 'cluster' && String(CURID) === String(best.cluster) && CUR){
    restoreApply(); restoreSay();
  } else {
    goCluster(best.cluster);
  }
}

/* Called from load(), after the cluster has been measured and before anything
   is drawn from it. MAILN is set alongside PICKED on purpose: leaving it null
   would have render() fill it from defaultN() and repick the whole block over
   the top of what was saved. */
function restoreApply(){
  const row = RESTORE;
  RESTORE = null;                 // once per load, whatever comes of it
  if (!row || !CUR) return;
  const want = new Set(row.addresses || []);
  PICKED.clear();
  CUR.neighbours.forEach(n => { if (want.has(n.a)) PICKED.add(n.a); });
  MAILN = PICKED.size;
  setMode('mail');                // a saved selection is a mailing, not a walk
  pushNB();
  const parts = [];
  if (row.snapshot_stamp && String(row.snapshot_stamp) !== String(STAMP))
    parts.push('This selection was saved on an earlier snapshot ('
             + row.snapshot_stamp + ').');
  /* Silence is the right answer to a selection that came back whole. A shortfall
     is not: he is about to mail this list, and he is owed the count. */
  if (!PICKED.size)
    parts.push('None of the saved addresses are in the current data.');
  else if (PICKED.size !== want.size)
    parts.push(PICKED.size + ' of ' + want.size
             + ' saved addresses are still in the data.');
  RESTORE_NOTE = parts.length ? parts.join(' ') : null;
}

/* The note goes up only after the group has opened: enterCluster() clears
   #notice on the way in and would wipe anything written before it. */
function restoreSay(){
  if (!RESTORE_NOTE) return;
  const note = $('notice');
  note.textContent = RESTORE_NOTE;
  note.hidden = false;
  RESTORE_NOTE = null;
}

/* -------------------------------------------------------- cluster layers */
function fc(list, extra){
  return {type:'FeatureCollection', features:list.map(x => ({
    type:'Feature', geometry:{type:'Point', coordinates:[x.lon, x.lat]},
    properties: Object.assign({a:x.a, zip:x.zip||'', d:x.d||''}, extra ? extra(x) : {})
  }))};
}

/* ------------------------------------------- neighbour dots: ground sizing */
/* Flat distance in metres, cos(lat) keeping longitude honest. Across a handful
   of city blocks the error is far under the width of a house. */
function metres(a, b){
  const k = Math.cos((a.lat + b.lat) / 2 * Math.PI / 180);
  const dx = (a.lon - b.lon) * k, dy = a.lat - b.lat;
  return Math.sqrt(dx*dx + dy*dy) * M_PER_DEG;
}

/* Fold the addresses onto the roofs they share, before anything is measured or
   drawn from them. On #c127 sixty-three addresses out of a hundred sat on top
   of another one, which is what a duplex looks like after geocoding: two doors,
   two postcards, one roof and one point.

   Leader grouping, deliberately not single linkage. An address joins a building
   only if it is within SAME_BUILDING_M of that building's FIRST address — its
   seed — never of whichever member happens to be nearest. That is the whole
   defence against chaining: a terrace where each house sits two metres from the
   next cannot fold into one group the length of the street, because the second
   house is measured against the seed and not against its neighbour.

   Two things follow, and the rest of the file leans on both. A building is at
   most SAME_BUILDING_M across from its seed. And no two seeds are ever closer
   to each other than SAME_BUILDING_M — a seed is only created when no existing
   one was near enough — so with two buildings or more, the distance between the
   nearest pair cannot be zero. The building's coordinate is its seed's for
   exactly that reason: an average would drift and give that guarantee away.

   Deterministic: the addresses are sorted before the first seed is picked, so
   the same list always yields the same buildings in the same order. */
function groupBuildings(list){
  const pts = (list || []).filter(p => typeof p.lon === 'number' && typeof p.lat === 'number');
  pts.sort((a, b) => a.lat - b.lat || a.lon - b.lon
                  || String(a.a).localeCompare(String(b.a)));
  const out = [];
  /* Seeds are created in the sorted order, so their latitudes only ever climb:
     one that has fallen out of range below stays out of range for every address
     still to come, and the scan can start past it. */
  const dLat = SAME_BUILDING_M / M_PER_DEG;
  let first = 0;
  pts.forEach(p => {
    while (first < out.length && p.lat - out[first].lat > dLat) first++;
    let home = null;
    for (let k = first; k < out.length; k++){
      if (metres(p, out[k]) < SAME_BUILDING_M){ home = out[k]; break; }
    }
    if (home) home.addrs.push(p.a);
    else out.push({lon:p.lon, lat:p.lat, addrs:[p.a]});
  });
  return out;
}

/* One feature per building, carrying the addresses that share it. Mapbox
   flattens anything that is not a scalar, so the list travels as JSON and is
   read back where the click lands. */
function nbFC(){
  return {type:'FeatureCollection', features: NB_BUILDINGS.map(b => ({
    type:'Feature', geometry:{type:'Point', coordinates:[b.lon, b.lat]},
    properties:{
      addrs: JSON.stringify(b.addrs), n: b.addrs.length,
      /* green stands for a roof that is going to be mailed, so it waits until
         every door under it is picked — a half-picked duplex is not one */
      sel: b.addrs.every(a => PICKED.has(a)) ? 1 : 0
    }
  }))};
}
function pushNB(){
  if (map && map.getSource('nb')) map.getSource('nb').setData(nbFC());
}

/* The step of this block: for every building the distance to the nearest other
   building, and the median of those. That number is the only thing that decides
   how big a dot is — it comes out of the data, never out of a constant. */
function medianStep(list){
  let pts = (list || []).filter(p => typeof p.lon === 'number' && typeof p.lat === 'number');
  if (pts.length < 2) return 0;
  if (pts.length > STEP_SAMPLE_MAX){
    pts = pts.slice();
    for (let i = 0; i < STEP_SAMPLE_MAX; i++){        // partial Fisher–Yates
      const j = i + Math.floor(Math.random() * (pts.length - i));
      const t = pts[i]; pts[i] = pts[j]; pts[j] = t;
    }
    pts = pts.slice(0, STEP_SAMPLE_MAX);
  }
  const ds = [];
  for (let i = 0; i < pts.length; i++){
    let best = Infinity;
    for (let j = 0; j < pts.length; j++){
      if (i === j) continue;
      const d = metres(pts[i], pts[j]);
      if (d < best) best = d;
    }
    if (isFinite(best)) ds.push(best);
  }
  if (!ds.length) return 0;
  ds.sort((a, b) => a - b);
  const m = ds.length >> 1;
  return ds.length % 2 ? ds[m] : (ds[m-1] + ds[m]) / 2;
}

function mPerPx(z, lat){
  return M_PER_PX_Z0 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z);
}

/* Mapbox takes circle-radius in pixels and in nothing else. A ramp with base 2
   doubles the pixel radius on every zoom step, which is exactly what a fixed
   size on the ground does. The two stops are the same metre value read at the
   two ends of the range the layer is ever drawn in, so what runs between them
   is the ground size itself, not an approximation of it. */
function groundRadius(diameterM, lat){
  const px = z => (diameterM / 2) / mPerPx(z, lat);
  return ['interpolate', ['exponential', 2], ['zoom'],
          ZOOM_FLOOR, px(ZOOM_FLOOR), MAP_MAX_ZOOM, px(MAP_MAX_ZOOM)];
}

/* The zoom at which a dot of this ground size has shrunk to MIN_DOT_PX across.
   Under it the dots have stopped standing for houses and started standing for
   the street they sit on, so the layer is not drawn at all. */
function dotFloorZoom(diameterM, lat){
  const z = Math.log2(MIN_DOT_PX * M_PER_PX_Z0 * Math.cos(lat * Math.PI / 180) / diameterM);
  return Math.min(Math.max(z, ZOOM_FLOOR), ZOOM_CEIL);
}

/* Everything the neighbour layers need in metres, measured once per cluster
   off that cluster's own buildings. */
function measureCluster(){
  NB_BUILDINGS = groupBuildings((CUR && CUR.neighbours) || []);
  NB_OF_ADDR = new Map();
  NB_BUILDINGS.forEach(b => b.addrs.forEach(a => NB_OF_ADDR.set(a, b)));
  NB_LAT = NB_BUILDINGS.length
    ? NB_BUILDINGS.reduce((s, b) => s + b.lat, 0) / NB_BUILDINGS.length : 37.76;
  NB_STEP_M = medianStep(NB_BUILDINGS);
  /* One building has nothing to be too close to, so the fallback there is
     harmless and any value will do. The condition is the count and not the
     median on purpose: a zero median used to mean "addresses stacked on one
     point" and bought the largest dot on the page for the densest block on the
     map — the exact opposite of what a failed measurement should buy. Grouping
     has made that reading impossible, and the count says so plainly. */
  const step = NB_BUILDINGS.length >= 2 ? NB_STEP_M : MAX_DOT_M / DOT_FRACTION;
  NB_DOT_M = Math.min(step * DOT_FRACTION, MAX_DOT_M);
  /* Caught at half the step: as wide as a target can get before it starts
     answering for the house next door. Always at least the drawn dot, which
     takes DOT_FRACTION of the step and DOT_FRACTION is under one. */
  NB_HIT_M = step;
  NB_MIN_Z = dotFloorZoom(NB_DOT_M, NB_LAT);
}

/* Called on every zoom frame, so it writes nothing it is not changing. */
function setNote(on){
  const el = $('zoomnote');
  if (!el || el.hidden === !on) return;
  if (on) el.textContent = ZOOM_NOTE;
  el.hidden = !on;
}

/* Both neighbour layers answer to the zoom, not to the load, so this runs on
   every zoom event and reads the same going out and coming back. `flying` says
   the camera is mid-flight on this page's own orders; a wheel, a drag and a
   pinch never set it. */
function applyDotVisibility(flying){
  const live = !!map && mapReady && !mapDead && SCREEN === 'cluster' && !!CUR;
  if (!live){ setNote(false); return; }   // city screen, dead map, dead data
  const show = map.getZoom() >= NB_MIN_Z;
  if (NB_SHOWN !== show){ NB_SHOWN = show; setVis(NB_LAYERS, show); }
  /* The note belongs to the screen where the map is the picking surface: walk
     the block picks off the list, and on a phone that map is not even rendered.
     It is also held back for the length of a flight the page ordered — the
     answer at the far end is the one worth reading, and a note that blinks
     through every cluster opening is noise. A gesture gets no such grace: what
     the man is doing with his own hand, he is owed an answer to at once. */
  setNote(!show && MODE !== 'walk' && !flying);
}

function paintLayers(){
  if (!map || !mapReady || SCREEN !== 'cluster' || !CUR) return;
  const nb = {type:'geojson', data: nbFC()};   // one feature per roof, not per door
  const rr = {type:'geojson', data: fc(CUR.reroofed, x => ({recent: (x.d && x.d >= RECENT_SINCE) ? 1 : 0}))};

  if (map.getSource('nb')) map.getSource('nb').setData(nb.data); else {
    map.addSource('nb', nb);
    /* Draw small, catch large — the same trade rr-hit makes, for the layer
       people actually click. It carries the click so the drawn dot can stay
       the size the block says it should be. */
    map.addLayer({id:'nb-hit', type:'circle', source:'nb', paint:{
      'circle-radius': groundRadius(NB_HIT_M, NB_LAT),
      'circle-color':'#000', 'circle-opacity':0
    }});
    map.addLayer({id:'nb-dots', type:'circle', source:'nb', paint:{
      'circle-radius': groundRadius(NB_DOT_M, NB_LAT),
      'circle-color':['case',['==',['get','sel'],1],'#4ED08A','#5FB0E8'],
      'circle-opacity':0.85,
      'circle-stroke-width':['case',['==',['get','sel'],1],2,1],
      'circle-stroke-color':['case',['==',['get','sel'],1],'#FFFFFF','#0F1720'],
      'circle-stroke-opacity':0.85
    }});
    map.on('click','nb-hit', e => toggleAddrs(addrsOf(e.features[0])));
    map.on('mouseenter','nb-hit', () => map.getCanvas().style.cursor='pointer');
    map.on('mouseleave','nb-hit', () => map.getCanvas().style.cursor='');
  }
  /* The layers are built once and then only fed; the next cluster has a step of
     its own, so the two metre-based radii are re-read on every paint. */
  if (map.getLayer('nb-dots'))
    map.setPaintProperty('nb-dots', 'circle-radius', groundRadius(NB_DOT_M, NB_LAT));
  if (map.getLayer('nb-hit'))
    map.setPaintProperty('nb-hit', 'circle-radius', groundRadius(NB_HIT_M, NB_LAT));

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
  NB_SHOWN = true;        // the line above covers the neighbour layers as well
  /* bottom to top. The neighbour target goes under everything: it is the widest
     thing on the map and must not sit over a cross it does not answer for. */
  ['nb-hit','rr-hit','rr-x','nb-dots'].forEach(id => {
    if (map.getLayer(id)) map.moveLayer(id);
  });

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
  if (!b.isEmpty()){
    const pad = {top:90, bottom:90, left:90, right:90};
    /* The cutoff outranks the frame. Opening under it would hand him a map with
       no houses on it and a note explaining their absence — so a wide cluster
       opens above the cutoff instead, centred on the same bounds, with some of
       its permits outside the frame. That is the trade the neighbour list
       already makes one paragraph up, taken one step further. Above, not on:
       OPEN_ZOOM_MARGIN keeps the opening view off the floor of what is legible
       and leaves him room to pull back before the dots go. The margin never
       leaves this block — applyDotVisibility knows only NB_MIN_Z. */
    const cam = map.cameraForBounds(b, {padding:pad, maxZoom:CLUSTER_MAX_ZOOM});
    const fitZoom = cam ? Math.min(cam.zoom, CLUSTER_MAX_ZOOM) : null;
    const openZoom = Math.min(NB_MIN_Z + OPEN_ZOOM_MARGIN, MAP_MAX_ZOOM);
    if (fitZoom !== null && fitZoom < openZoom)
      map.easeTo({center:b.getCenter(), zoom:openZoom, duration:400}, FLIGHT);
    else
      map.fitBounds(b, {padding:pad, duration:400, maxZoom:CLUSTER_MAX_ZOOM}, FLIGHT);
  }
  /* the camera is still standing at the city's zoom for one more frame; the
     flight it was just sent on is what the answer should be read from */
  applyDotVisibility(true);
}

/* ---------------------------------------------------------------- panel */
function load(id){
  fetch(snap('cluster_' + id + '.json')).then(ok).then(j => {
    if (String(CURID) !== String(id)) return;   // he moved on while it was in flight
    /* the dots are sized off this cluster's own spacing, so it is measured
       before anything is drawn from it */
    CUR = j; PICKED.clear(); MAILN = null; measureCluster();
    /* a saved selection waiting on this group goes back into PICKED here, while
       the group is measured and nothing has been drawn from it yet */
    restoreApply();
    paintLayers(); render();
    $('pane').scrollTop = 0;
    restoreSay();
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
/* He asks for a number of postcards, and postcards go to addresses — but the
   thing being chosen is a roof, measured from its own point to the nearest
   permit. So buildings go in whole, nearest first, until the addresses under
   them have covered the number: a duplex is never half-mailed. The last one in
   can carry the total a door or two past what was typed, and the counter under
   the list says so — it counts what is picked, not what was asked for. */
function autoPick(n){
  PICKED.clear();
  const want = Math.max(0, n);
  if (want > 0)
    NB_BUILDINGS
      .map((b, i) => ({b, i, d: nearestPermit(b)}))
      .sort((u, v) => u.d - v.d || u.i - v.i)
      .some(x => { x.b.addrs.forEach(a => PICKED.add(a)); return PICKED.size >= want; });
  pushNB();
}

function render(){
  const pane = $('pane');
  const dl = $('dl');
  const clear = $('clear');
  const save = $('save');
  const tomail = $('tomail');
  /* What the save line says stops being true the moment the pick changes, and
     every change of the pick comes back through here. */
  setSaveNote('');
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
    /* nothing is picked on a walk — the list is the whole block, and it is the
       download that carries it */
    save.hidden = true;
    tomail.hidden = true;
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
        /* two facts about one row, and they are independent: .on is what he is
           picking here, .inmail is what the mailing already holds */
        h += '<div class="row pick'+(PICKED.has(n.a)?' on':'')+(CART.has(n.a)?' inmail':'')
           + '" data-a="'+esc(n.a)+'">'
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
    save.hidden = !n;
    tomail.hidden = !n;
  }
}

/* The list of addresses a map feature stands for, back out of the JSON it
   travelled in. A feature that somehow arrives without one answers for nothing
   rather than for everything. */
function addrsOf(f){
  try { const v = JSON.parse(f && f.properties && f.properties.addrs);
        return Array.isArray(v) ? v : []; }
  catch (e) { return []; }
}

/* One roof, one decision. 700 and 700 A are two postcards and one building, so
   whichever of them is clicked — the dot on the map or either row in the list —
   both move together. Fully picked comes off; anything less fills up. */
function toggleAddrs(addrs){
  if (!CUR || !addrs || !addrs.length) return;
  const full = addrs.every(a => PICKED.has(a));
  addrs.forEach(a => full ? PICKED.delete(a) : PICKED.add(a));
  pushNB();
  if (MODE === 'mail') render();
}

/* The panel still lists addresses, so this still takes one — and hands it to
   its building. An address with no usable coordinates is on no roof and on no
   map; it answers for itself alone. */
function toggle(a){
  if (!CUR) return;
  const b = NB_OF_ADDR.get(a);
  toggleAddrs(b ? b.addrs : [a]);
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
  applyDotVisibility();   // the note belongs to postcards only
}
/* the markup ships with postcards pre-selected; this keeps aria-selected, the
   :has() rules in the stylesheet and MODE from ever disagreeing. It runs before
   any data has landed, which is why render() returns on a null CUR. */
setMode(MODE);

$('clear').onclick = () => {
  if (!CUR) return;
  PICKED.clear();
  pushNB();
  render();
};

/* ------------------------------------------------------- saving a selection */
/* The one line of feedback the save has. It sits under the buttons and not in
   #notice at the top of the page: by the time he presses this, he is working
   the panel, and on a phone the foot is stuck to the bottom while the header
   is a screen and a half away. */
function setSaveNote(html){
  const el = $('savenote');
  if (!el) return;
  el.innerHTML = html || '';
  el.hidden = !html;
}
function saveFailed(detail){
  setSaveNote('The selection could not be saved. ' + esc(detail));
}

/* The row of clusters.json this group came from. It carries the centre the
   restore later searches by, and the names the cluster payload may not. */
function indexRow(){
  return (INDEX && INDEX.clusters.find(c => String(c.cluster) === String(CURID)))
      || null;
}

/* Built out of what is on the screen and nothing else. The addresses go in the
   order of the neighbour list — the order of the rows he read and of the CSV he
   would have downloaded instead; a list that comes back in another order is a
   different list to the man holding it. */
function selectionBody(){
  const row = indexRow();
  const streets = CUR.streets;
  const body = {
    city: CITY,
    trade: TRADE,
    snapshot_stamp: STAMP,
    addresses: CUR.neighbours.filter(n => PICKED.has(n.a)).map(n => n.a),
    nhood: CUR.nhood || (row && row.nhood) || null,
    /* the cluster payload spells the streets as a list, clusters.json as one
       string; the row stores a line of text either way */
    label: (Array.isArray(streets) ? streets.join(', ') : streets)
        || (row && row.streets) || null
  };
  /* The centre is how the restore finds this group again, and it has no
     substitute: ids do not survive the next data run. A group missing from the
     index cannot happen — but if it ever did, the addresses are still the thing
     worth keeping, so the save goes ahead without it. */
  if (row && typeof row.lat === 'number' && typeof row.lon === 'number'){
    body.center_lat = row.lat;
    body.center_lon = row.lon;
  }
  return body;
}

$('save').onclick = () => {
  if (!CUR || MODE === 'walk' || !PICKED.size) return;
  const btn = $('save');
  const body = JSON.stringify(selectionBody());
  /* the only guard the button needs is against its own second click: the table
     has no update policy, so a deliberate second save is a second row */
  btn.disabled = true;
  btn.textContent = 'Saving…';
  setSaveNote('');
  fetch('/api/selections', {
    method:'POST', headers:{'Content-Type':'application/json'},
    credentials:'same-origin', body:body
  }).then(r => {
    if (r.status === 201){
      setSaveNote('Saved. <a href="/app">Open your workspace</a>');
      return;
    }
    /* Not signed in. The pick is not lost over it: it waits in this tab while
       he signs in, and the workspace page finishes the save from there. */
    if (r.status === 401){
      try { sessionStorage.setItem(PENDING_KEY, body); } catch (e) {}
      location.href = '/app';
      return;
    }
    if (r.status === 400)
      return r.json().catch(() => null).then(j => {
        saveFailed('invalid_request · ' + ((j && j.field) || 'unknown'));
      });
    saveFailed('HTTP ' + r.status);
  }).catch(e => {
    saveFailed(String((e && e.message) || e));
  }).then(() => {
    btn.disabled = false;
    btn.textContent = SAVE_LABEL;
  });
};

/* ------------------------------------------------------------ the mailing */
/* The mailing is the thing above the group. A group is worked, its picks are
   handed over, and the next group is opened — so nothing about it may live in
   PICKED, in this tab, or in a counter of our own. The server holds it: every
   call answers with the whole cart, and the three variables at the top of this
   file are overwritten from that answer and from nothing else.

   The cost arrives counted, in cents. This file has no price in it and no
   arithmetic on one — it puts a dollar sign in front of what it was handed. */
function money(cents){
  return '$' + (Number(cents || 0) / 100).toFixed(2);
}

/* The one line of feedback the strip has, under its own buttons — the panel's
   #savenote is on the other side of the layout and is gone on the city screen. */
function sayStrip(html){
  const el = $('strip-say');
  if (!el) return;
  el.innerHTML = html || '';
  el.hidden = !html;
}

function resetClearConfirm(){
  if (CLEAR_ARMED){ clearTimeout(CLEAR_ARMED); CLEAR_ARMED = null; }
  const btn = $('mail-clear');
  if (btn) btn.textContent = MAIL_CLEAR_LABEL;
}

/* ------------------------------------------------------------- checkout */
/* The page never names a price and never charges one: it asks the server for a
   Checkout Session and goes where it is sent. `sayer` is whichever line is in
   front of the man — the strip's or the panel's — because the same offer is
   reachable from both and an answer written into the other one is an answer he
   never sees. */
function startCheckout(sayer){
  if (CHECKOUT_BUSY) return;
  CHECKOUT_BUSY = true;
  fetch('/api/billing/checkout', {
    method:'POST', headers:{'Content-Type':'application/json'},
    credentials:'same-origin',
    body: JSON.stringify({
      city: CITY, trade: TRADE,
      /* the address he is standing on, so Stripe hands him back to the same
         page with the same mailing under it */
      return_to: location.pathname + location.search
    })
  }).then(r => {
    if (r.status === 200)
      return r.json().then(j => { location.assign(j.url); });
    if (r.status === 401){ sayer(S.SIGN_IN_SEND); return; }
    if (r.status === 409){ sayer(S.ALREADY); return; }
    sayer(S.CHECKOUT_FAIL(r.status));
    CHECKOUT_BUSY = false;
  }).catch(e => {
    sayer('Something went wrong. ' + esc(String((e && e.message) || e)));
    CHECKOUT_BUSY = false;
  });
  /* nothing releases the flag on the 200 path: the browser is leaving */
}

/* One handler for every Subscribe link there will ever be. The links are
   written into #strip-say and #savenote as HTML, which throws away whatever was
   there before — so a listener hung on the link itself would have to be hung
   again after every sentence. This one is hung once, on the document. */
document.addEventListener('click', ev => {
  const t = ev.target;
  const link = t && t.closest ? t.closest('[data-kp-subscribe]') : null;
  if (!link) return;
  ev.preventDefault();
  const strip = $('strip');
  startCheckout(strip && strip.contains(link) ? sayStrip : setSaveNote);
});

/* Coming back from Stripe. Nothing here is taken as proof of anything: the
   right is written by the webhook against what Stripe says, and this is only
   the word to the man that he has landed. The parameter is then taken off the
   address so a reload does not say it a second time — the rest of the query,
   ?from= above all, stays exactly as it was. */
function sayCheckoutReturn(){
  if (RETURN_SAID) return;
  RETURN_SAID = true;
  const params = new URLSearchParams(location.search);
  const outcome = params.get('checkout');
  if (outcome !== 'success' && outcome !== 'cancel') return;
  sayStrip(outcome === 'success' ? S.RETURN_SUCCESS : S.RETURN_CANCEL);
  params.delete('checkout');
  const q = params.toString();
  history.replaceState(history.state, '',
    location.pathname + (q ? '?' + q : '') + location.hash);
}

function renderStrip(){
  const n = CART.size;
  $('strip-sum').innerHTML = n
    ? '<b>' + n + '</b> address' + (n === 1 ? '' : 'es') + ' &middot; ' + money(CART_COST) + ' print'
    : 'Nothing in this mailing yet';
  $('mail-clear').hidden = !n;
  $('mail-send').disabled = !n;
  if (!n) resetClearConfirm();   // nothing left to confirm the clearing of
  /* The word about the return waits for this moment and not for the load: the
     strip is a node the server rendered, this file runs before React hydrates,
     and a synchronous write into it makes the two trees disagree — see the
     paragraph under the mailing handlers. By the time the cart has answered,
     hydration is long over. */
  sayCheckoutReturn();
}

/* The whole answer, taken as it stands. */
function cartApply(json){
  CART.clear();
  const list = (json && json.addresses) || [];
  list.forEach(a => CART.add(a));
  CART_ID   = (json && json.mailing_id) || null;
  CART_COST = (json && json.print_cost_cents) || 0;
  renderStrip();
  /* the rows carry the mark, so the list is redrawn to show what moved */
  if (SCREEN === 'cluster' && MODE === 'mail') render();
}

/* Asked once, at load. A mailing that cannot be read is not an error worth a
   sentence: the strip says it is empty, which is what the man can act on, and
   the next call to it will say otherwise. */
function cartLoad(){
  fetch('/api/mailing?city=' + encodeURIComponent(CITY) + '&trade=' + encodeURIComponent(TRADE),
        {credentials:'same-origin'})
    .then(r => (r.status === 200 ? r.json() : null))
    .then(j => { if (j) cartApply(j); })
    .catch(() => {});
}

/* Every change goes through here, and every answer replaces the cart whole. The
   status code is carried up on the error so the caller can say which refusal it
   was; a network failure arrives with none. */
function cartPost(body){
  return fetch('/api/mailing', {
    method:'POST', headers:{'Content-Type':'application/json'},
    credentials:'same-origin', body: JSON.stringify(body)
  }).then(r => {
    if (r.status === 200) return r.json().then(j => { cartApply(j); return j; });
    const err = new Error('HTTP ' + r.status);
    err.status = r.status;
    throw err;
  });
}

function cartFailed(e){
  if (e && e.status === 409){ sayStrip('This mailing is full at 2000 addresses.'); return; }
  if (e && e.status){ sayStrip('Something went wrong. HTTP ' + e.status); return; }
  sayStrip('Something went wrong. ' + esc(String((e && e.message) || e)));
}

/* The picks of this group, handed to the mailing. They go over in the order of
   the neighbour list and with the same neighbourhood and street line a saved
   selection carries — it is the same body, minus what only a selection needs. */
$('tomail').onclick = () => {
  if (!CUR || MODE === 'walk' || !PICKED.size) return;
  const btn = $('tomail');
  const sel = selectionBody();
  /* what actually landed is the difference the cart shows: an address already
     in the mailing is not added a second time */
  const before = CART.size;
  btn.disabled = true;
  btn.textContent = 'Adding…';
  sayStrip('');
  resetClearConfirm();
  cartPost({
    city: sel.city, trade: sel.trade, op: 'add',
    addresses: sel.addresses, snapshot_stamp: sel.snapshot_stamp,
    nhood: sel.nhood, label: sel.label
  }).then(() => {
    const added = CART.size - before;
    sayStrip(added > 0 ? added + ' added to the mailing.' : 'Already in the mailing.');
  }).catch(cartFailed).then(() => {
    btn.disabled = false;
    btn.textContent = TOMAIL_LABEL;
  });
};

/* Two presses, because what it empties was collected group by group and one
   press of a small button on a phone is not an intention. */
$('mail-clear').onclick = () => {
  if (!CART.size) return;
  if (!CLEAR_ARMED){
    $('mail-clear').textContent = 'Click again to clear';
    CLEAR_ARMED = setTimeout(resetClearConfirm, CLEAR_CONFIRM_MS);
    return;
  }
  resetClearConfirm();
  sayStrip('');
  cartPost({city: CITY, trade: TRADE, op: 'clear'})
    .then(() => { sayStrip('The mailing is empty again.'); })
    .catch(cartFailed);
};

/* The gate, and the counter beside it. Nothing is sent from here yet and the
   button says as much through whatever the server answers — but a refusal for
   want of a subscription now carries the price and a way to pay it. The mailing
   stays where it is in every case, including the one where he leaves for
   Stripe: it is held by the server, not by this tab. */
$('mail-send').onclick = () => {
  if (!CART.size) return;
  const btn = $('mail-send');
  btn.disabled = true;
  btn.textContent = 'Checking…';
  sayStrip('');
  resetClearConfirm();
  fetch('/api/mailing/send', {
    method:'POST', headers:{'Content-Type':'application/json'},
    credentials:'same-origin',
    body: JSON.stringify({city: CITY, trade: TRADE})
  }).then(r => {
    if (r.status === 401){
      sayStrip(S.SIGN_IN_SEND);
      return;
    }
    if (r.status === 402)
      return r.json().catch(() => null).then(j => {
        const reason = (j && j.reason) || 'none';
        const offer = j && j.offer;
        /* Not active is the one refusal with nothing to sell: the subscription
           exists and is in the wrong state, and that is settled at Stripe. */
        if (reason === 'status')
          sayStrip(S.NOT_ACTIVE);
        else if (reason === 'expired')
          sayStrip(offer ? S.EXPIRED(offer) : S.OFFER_NO_PRICE);
        else
          sayStrip(offer ? S.OFFER(offer) : S.OFFER_NO_PRICE);
      });
    if (r.status === 501){
      sayStrip('Sending is not available yet — the postcard and the approval step are not built.');
      return;
    }
    if (r.status === 503){
      sayStrip('We could not check the subscription. Try again in a moment.');
      return;
    }
    sayStrip('Something went wrong. HTTP ' + r.status);
  }).catch(e => {
    sayStrip('Something went wrong. ' + esc(String((e && e.message) || e)));
  }).then(() => {
    btn.textContent = MAIL_SEND_LABEL;
    btn.disabled = !CART.size;
  });
};

/* The strip is not drawn here, and nothing else on this level writes into a
   node the server rendered either. The empty state ships in the markup, so at
   nought there is nothing for this file to say — and saying it anyway is what
   took the page down once. This script is blocking and runs before React
   hydrates: a synchronous write into a served node makes the two trees
   disagree, React answers a failed hydration by rebuilding the root, and every
   onclick set above goes with the nodes it was set on — the mailing's buttons,
   Download and Save selection alike. The strip is written from cartApply() and
   from nowhere else, and that answer arrives long after hydration is over. */

/* --------------------------------------------------------- the download */
/* The file is not written here any more. Every cell of it — the zips, the
   neighbourhoods, the permit lines, the disclaimer — is read out of the
   snapshot by /api/export, behind the right. This end sends only what it
   alone knows: which snapshot, which group, which mode, and which houses were
   picked. The block list is the product, and a page anyone can open must not
   be the thing that hands it over.

   A 401 costs him nothing. The picks stay in this tab, the address bar does not
   move, and the line under the buttons says where to sign in — he comes back to
   the same screen with the same houses on it. */

/* The name the server chose. The fallback is the formula this file used while
   it still wrote the file itself, and it is only ever reached if the header
   goes missing between the two. */
function dlName(header){
  const m = /filename="([^"]*)"/.exec(header || '');
  if (m && m[1]) return m[1];
  const nice = ((CUR && CUR.nhood) || CITY).replace(/[^A-Za-z]/g,'').slice(0,14) || CITY;
  return (SLUG || CITY)
       + (MODE === 'walk' ? '__walk__' : '__postcards__') + nice + '.csv';
}

function dlSave(blob, name){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('dl').onclick = () => {
  if (!CUR) return;
  /* the button is disabled at zero picks; this is the guard behind that one */
  if (MODE === 'mail' && !PICKED.size) return;
  const btn = $('dl');
  btn.disabled = true;
  btn.textContent = 'Preparing…';
  /* whatever the line under the buttons last said, it was about another press */
  setSaveNote('');
  fetch('/api/export', {
    method:'POST', headers:{'Content-Type':'application/json'},
    credentials:'same-origin',
    body: JSON.stringify({
      city: CITY, trade: TRADE, snapshot_stamp: STAMP,
      cluster: CURID, mode: MODE,
      addresses: MODE === 'mail'
        ? CUR.neighbours.filter(n => PICKED.has(n.a)).map(n => n.a)
        : undefined
    })
  }).then(r => {
    if (r.status === 200)
      return r.blob().then(b =>
        dlSave(b, dlName(r.headers.get('Content-Disposition'))));
    if (r.status === 401){
      setSaveNote(S.SIGN_IN_DOWNLOAD);
      return;
    }
    /* The file is behind the same right the sending is. The offer is not
       repeated here: it is one subscription, it is bought from the strip, and a
       second counter beside the download would read as a second thing to buy. */
    if (r.status === 402){
      setSaveNote(S.DOWNLOAD_NEEDS_SUB);
      return;
    }
    /* the folder this page has been reading was republished under it */
    if (r.status === 409){
      setSaveNote('The permit data was refreshed while this page was open. '
                + 'Reload the page and pick again.');
      return;
    }
    setSaveNote('The download failed. HTTP ' + r.status);
  }).catch(e => {
    setSaveNote('The download failed. ' + esc(String((e && e.message) || e)));
  }).then(() => {
    /* the resting state of the button, read off the mode it is in now: the tab
       may have been switched while the request was in the air */
    btn.textContent = MODE === 'walk' ? 'Download the walk list'
                                      : 'Download the mailing list';
    btn.disabled = MODE === 'mail' && !PICKED.size;
  });
};
