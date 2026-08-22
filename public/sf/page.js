/* KnockPortal — per-contractor canvassing page: data + behaviour.
   ============================================================================
   DO NOT EDIT for design work. Everything visual lives in page.css and in the
   markup of the .html file. This file only reads data and writes into the
   hooks listed in the brief.

   Contract with the markup — these must exist, ids unchanged:
     #map      map canvas
     #pick     <select> of clusters
     #tab-walk #tab-mail   two buttons, aria-selected carries the state
     #pane     scrolling container the lists are written into
     #count    line under the lists
     #clear #dl  buttons

   Classes this file emits (style them freely, don't rename):
     .grp  section header   .st  street header   .row  address line
     .row.pick clickable    .row.on selected     .z  zip   .hint  intro text
   ========================================================================= */

mapboxgl.accessToken = MAPBOX_TOKEN;

let map = null;
try {
map = new mapboxgl.Map({
  container:'map', style:'mapbox://styles/mapbox/satellite-streets-v12',
  center:[-122.4433, 37.7580], zoom:15.2, minZoom:11, maxZoom:19,
  attributionControl:true, cooperativeGestures:true
});
map.addControl(new mapboxgl.NavigationControl({showCompass:false}), 'top-right');
} catch (e) {
  /* no WebGL, blocked CDN, hostile extension: the constructor throws. The map
     is optional — walking a block never needed one — so swallow it here and
     let the lists boot below. */
  map = null;
}

let mapReady = false;
function mapFailed(why){
  if (mapReady) return;
  document.getElementById('map').innerHTML =
    '<div style="height:100%;display:flex;align-items:center;justify-content:center;padding:32px;'
    + 'text-align:center;font:15px Barlow;color:#8A99A8"><div>'
    + '<b style="display:block;color:#F2F5F7;font-family:\'Barlow Condensed\';font-size:21px;'
    + 'letter-spacing:.02em;margin-bottom:8px">The map did not load</b>' + why
    + '<div style="margin-top:14px">The address lists on the right still work.</div></div></div>';
}
if (map) map.on('error', e => {
  const err = (e && e.error) || {};
  const code = err.status || 0;
  const m = err.message || '';
  mapFailed(code === 401 || code === 403 || /401|403|token/i.test(m)
    ? 'Mapbox rejected the access token (' + (code || 'auth') + ').'
    : 'Could not reach Mapbox. A VPN or an ad blocker will do this.');
});
if (map) setTimeout(() => mapFailed('Mapbox did not respond in time.'), 9000);
else mapFailed('This browser could not start the map (WebGL is off or blocked).');

/* ---------------------------------------------------------------- state */
let INDEX = null;          // clusters.json
let CUR   = null;          // current cluster payload
let MODE  = 'mail';        // walk | mail — postcards lead; the channel is the product
const PICKED = new Set();  // addresses selected for postcards
let MAILN = null;          // how many postcards he wants; null = not yet set for this cluster
const pinMarkers = [];

const fmt = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
const fmtMY = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'}) : '';
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

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
/* Absolute window from the data itself. Never "this month" — the page outlives
   the month it was built in, and a stale label rots without an error. */
function windowStr(){
  if (!CUR || !CUR.permits.length) return '';
  const ds = CUR.permits.map(p => p.d).filter(Boolean).sort();
  return ds.length ? fmt(ds[0]) + ' \u2013 ' + fmt(ds[ds.length - 1]) : '';
}

/* ---------------------------------------------------------------- boot */
fetch(DATA+'clusters.json').then(r=>r.json()).then(j => {
  INDEX = j;
  const sel = document.getElementById('pick');
  const byHood = {};
  j.clusters.forEach(c => (byHood[c.nhood||'San Francisco'] ||= []).push(c));
  Object.keys(byHood).sort().forEach(h => {
    const g = document.createElement('optgroup'); g.label = h;
    byHood[h].sort((a,b)=>b.permits-a.permits).forEach(c => {
      const o = document.createElement('option');
      o.value = c.cluster;
      o.textContent = (c.streets||'').split(', ').slice(0,2).join(' · ')
        + '  —  ' + c.permits + ' permits, ' + c.neighbours + ' houses to work';
      g.appendChild(o);
    });
    sel.appendChild(g);
  });
  const has = j.clusters.some(c => String(c.cluster) === String(START));
  sel.value = has ? START : j.clusters[0].cluster;
  sel.addEventListener('change', () => load(sel.value));
  /* The lists are the product; the map is a view onto them. Boot them off the
     data arriving, never off the map — a rejected token or a browser without
     WebGL must not leave an empty pane under a fallback that promises the
     lists still work. paintLayers() is the only thing that waits for the map. */
  load(sel.value);
  if (map){
    if (map.loaded()) { mapReady = true; if (CUR) paintLayers(); }
    else map.on('load', () => { mapReady = true; if (CUR) paintLayers(); });
    /* the panel changes width between modes and disappears on phones; Mapbox
       only watches the window, so tell it when its own box moves */
    if (window.ResizeObserver)
      new ResizeObserver(() => { if (mapReady) map.resize(); })
        .observe(document.getElementById('map'));
  }
}).catch(() => {
  document.getElementById('pane').innerHTML =
    '<p class="hint">The cluster data did not load. Reply to the email and we will send the list directly.</p>';
});

/* ---------------------------------------------------------------- layers */
function fc(list, extra){
  return {type:'FeatureCollection', features:list.map(x => ({
    type:'Feature', geometry:{type:'Point', coordinates:[x.lon, x.lat]},
    properties: Object.assign({a:x.a, zip:x.zip||'', d:x.d||''}, extra ? extra(x) : {})
  }))};
}

function paintLayers(){
  if (!map || !mapReady) return;
  const nb = {type:'geojson', data: fc(CUR.neighbours, x => ({sel: PICKED.has(x.a) ? 1 : 0}))};
  /* RECENT_SINCE is written by the generator from the data window, not from
     today: a page opened in November must not silently reclassify a roof. */
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
      'text-field':'\u2715',
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
  if (map.getLayer('nb-dots')) map.moveLayer('nb-dots');

  pinMarkers.splice(0).forEach(m => m.remove());
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
  fetch(DATA+'cluster_'+id+'.json').then(r=>r.json()).then(j => {
    CUR = j; PICKED.clear(); MAILN = null; paintLayers(); render();
    document.getElementById('pane').scrollTop = 0;
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

function render(){
  const pane = document.getElementById('pane');
  const dl = document.getElementById('dl');
  const clear = document.getElementById('clear');
  if (!CUR) return;

  if (MODE === 'walk'){
    const g = groupStreets(CUR.neighbours, CUR.permits);
    const hotN = g.order.filter(s => g.hot.has(s)).reduce((n,s)=>n+g.by[s].length,0);
    let h = '<p class="hint">'
          + (CUR.capped
              ? 'The ' + CUR.neighbours.length + ' houses on these blocks closest to the fresh '
                + 'permits \u2014 the list is capped there \u2014 with no qualifying roofing permit on record. '
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
    document.getElementById('count').innerHTML =
      '<b>'+CUR.neighbours.length+'</b> doors &middot; ' + g.order.length + ' streets';
    dl.textContent = 'Download the walk list';
    clear.hidden = true;
  } else {
    if (MAILN === null){ MAILN = defaultN(); autoPick(MAILN); }
    let h = '<div class="mailn"><label for="mailn-in">Postcards</label>'
          + '<input id="mailn-in" type="number" inputmode="numeric" min="0" max="'
          + CUR.neighbours.length + '" value="' + MAILN + '">'
          + '<span class="mailn-note">of ' + CUR.neighbours.length + ' houses on these blocks, '
          + 'closest to the fresh permits</span></div>'
          + '<p class="hint">Change the number and we repick. Then look at the roofs: click a '
          + 'blue house on the map \u2014 or a row below \u2014 to drop one or add one. The map is '
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
    document.getElementById('count').innerHTML = n
      ? '<b>'+n+'</b> postcards' + (PRICE ? ' &middot; $'+(n*PRICE).toFixed(2)+' at cost' : ' &middot; printed at cost')
      : 'Nothing picked yet';
    dl.textContent = 'Download the mailing list';
    dl.disabled = !n;
    clear.hidden = !n;
  }
}

function toggle(a){
  PICKED.has(a) ? PICKED.delete(a) : PICKED.add(a);
  if (map && map.getSource('nb'))
    map.getSource('nb').setData(fc(CUR.neighbours, x => ({sel: PICKED.has(x.a) ? 1 : 0})));
  if (MODE === 'mail') render();
}

document.getElementById('tab-walk').onclick = () => setMode('walk');
document.getElementById('tab-mail').onclick = () => setMode('mail');
function setMode(m){
  MODE = m;
  document.getElementById('tab-walk').setAttribute('aria-selected', m==='walk');
  document.getElementById('tab-mail').setAttribute('aria-selected', m==='mail');
  render();
}
/* the markup ships with postcards pre-selected; this keeps aria-selected, the
   :has() rules in the stylesheet and MODE from ever disagreeing */
setMode(MODE);

document.getElementById('clear').onclick = () => {
  PICKED.clear();
  if (map && map.getSource('nb')) map.getSource('nb').setData(fc(CUR.neighbours, () => ({sel:0})));
  render();
};

document.getElementById('dl').onclick = () => {
  if (!CUR) return;
  const nice = (CUR.nhood||'sf').replace(/[^A-Za-z]/g,'').slice(0,14) || 'sf';
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
    name = SLUG+'__walk__'+nice+'.csv';
  } else {
    rows = [['address','zip','neighbourhood']].concat(
      CUR.neighbours.filter(n => PICKED.has(n.a)).map(n => [n.a, n.zip, n.nhood]));
    name = SLUG+'__postcards__'+nice+'.csv';
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
