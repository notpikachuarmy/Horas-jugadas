let DATA={games:"",series:"",streams:""};
async function loadConfig(){
  const r=await fetch("CONFIGURACION.xlsx?v="+Date.now());
  if(!r.ok) throw new Error("No se pudo cargar CONFIGURACION.xlsx");
  const bytes=await r.arrayBuffer();
  const book=XLSX.read(bytes,{type:"array"});
  const sheet=book.Sheets[book.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(sheet,{defval:""});
  const map={};
  rows.forEach(x=>{const key=String(x.FUENTE||"").trim().toUpperCase(); const url=String(x.ENLACE_CSV||"").trim(); if(key&&url) map[key]=url;});
  DATA.games=map.JUEGOS||"";
  DATA.series=map.SERIES||"";
  DATA.streams=map.DIRECTOS||"";
  if(!DATA.games||!DATA.series||!DATA.streams) throw new Error("Faltan uno o varios enlaces en CONFIGURACION.xlsx");
}
let games=[],series=[],streams=[],tab="juegos";

async function loadCSV(url){
  const r=await fetch(url+"?v="+Date.now());
  if(!r.ok) throw new Error("No se pudo cargar "+url);
  return parseCSV(await r.text());
}
function parseCSV(text){
  const rows=[];let row=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(c==='"'&&quoted&&n==='"'){cell+='"';i++;continue}
    if(c==='"'){quoted=!quoted;continue}
    if(c===','&&!quoted){row.push(cell);cell="";continue}
    if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&n==='\n')i++;
      row.push(cell);cell="";
      if(row.some(x=>x.trim()!==""))rows.push(row);
      row=[];continue;
    }
    cell+=c;
  }
  if(cell!==""||row.length){row.push(cell);if(row.some(x=>x.trim()!==""))rows.push(row)}
  if(!rows.length)return[];
  const headers=rows.shift().map(x=>x.trim());
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]??"").trim()])));
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function game(id){return games.find(x=>x.ID_JUEGO===id)||{}}
function serie(id){return series.find(x=>x.ID_SERIE===id)||{}}
function gameName(g,id){return g.NOMBRE||id}
function seriesName(s,id){return s.NOMBRE_SERIE||id}
function img(g){return g.IMAGEN_VERTICAL?`images/${g.IMAGEN_VERTICAL}`:""}
function minutes(v){
  v=String(v||"").trim().replace(",",".");
  if(!v)return 0;
  const m=v.match(/^(?:(\d+)\s*h(?:oras?)?\s*)?(?:(\d+)\s*m(?:in(?:utos?)?)?)?$/i);
  if(m && (m[1]||m[2])) return Number(m[1]||0)*60+Number(m[2]||0);
  const t=v.match(/^(\d{1,3}):(\d{2})(?::(\d{2}))?$/);
  if(t)return Number(t[1])*60+Number(t[2])+Number(t[3]||0)/60;
  const n=Number(v); return Number.isFinite(n)?n*60:0;
}
function fmtMin(min){
  min=Math.round(min);
  const h=Math.floor(min/60),m=min%60;
  if(h&&m)return `${h} h ${String(m).padStart(2,"0")} min`;
  if(h)return `${h} h`;
  return `${m} min`;
}
function statsForGames(){
  const map=new Map();
  streams.forEach(s=>{
    const id=s.ID_JUEGO;if(!id)return;
    const x=map.get(id)||{id,minutes:0,sessions:0,last:"",series:new Map()};
    x.minutes+=minutes(s.TIEMPO_JUGADO);x.sessions++;
    if(s.FECHA && (!x.last||s.FECHA>x.last))x.last=s.FECHA;
    const sid=s.ID_SERIE||"__sin_serie__";x.series.set(sid,(x.series.get(sid)||0)+minutes(s.TIEMPO_JUGADO));
    map.set(id,x);
  });
  return [...map.values()].sort((a,b)=>b.minutes-a.minutes||b.last.localeCompare(a.last));
}
function statsForSeries(){
  const map=new Map();
  streams.forEach(s=>{
    const id=s.ID_SERIE;if(!id)return;
    const x=map.get(id)||{id,minutes:0,sessions:0,last:""};
    x.minutes+=minutes(s.TIEMPO_JUGADO);x.sessions++;
    if(s.FECHA && (!x.last||s.FECHA>x.last))x.last=s.FECHA;
    map.set(id,x);
  });
  return [...map.values()].sort((a,b)=>b.minutes-a.minutes||b.last.localeCompare(a.last));
}
function search(){return document.getElementById("search").value.trim().toLocaleLowerCase("es")}
function sortBy(arr,nameFn){
  const mode=document.getElementById("sort").value;
  return arr.sort((a,b)=>{
    if(mode==="az")return nameFn(a).localeCompare(nameFn(b),"es");
    if(mode==="za")return nameFn(b).localeCompare(nameFn(a),"es");
    if(mode==="least")return a.minutes-b.minutes||nameFn(a).localeCompare(nameFn(b),"es");
    if(mode==="recent")return (b.last||"").localeCompare(a.last||"")||nameFn(a).localeCompare(nameFn(b),"es");
    if(mode==="oldest")return (a.last||"").localeCompare(b.last||"")||nameFn(a).localeCompare(nameFn(b),"es");
    return b.minutes-a.minutes||nameFn(a).localeCompare(nameFn(b),"es");
  });
}
function renderGames(){
  const q=search(), data=sortBy(statsForGames(),x=>gameName(game(x.id),x.id)).filter(x=>gameName(game(x.id),x.id).toLocaleLowerCase("es").includes(q));
  const host=document.getElementById("gamesList");
  host.innerHTML=data.map(x=>{
    const g=game(x.id),src=img(g);
    return `<article class="game-card" data-id="${esc(x.id)}">
      ${src?`<img src="${esc(src)}" loading="lazy" onerror="this.style.display='none'">`:""}
      <h2>${esc(gameName(g,x.id))}</h2>
      <div class="hours">${fmtMin(x.minutes)}</div>
      <div class="muted">${x.sessions} sesiones</div>
    </article>`;
  }).join("")||`<div class="empty">No se han encontrado juegos con tiempo jugado.</div>`;
  host.querySelectorAll(".game-card").forEach(c=>c.onclick=()=>showGame(c.dataset.id));
}
function renderSeries(){
  const q=search(), data=sortBy(statsForSeries(),x=>seriesName(serie(x.id),x.id)).filter(x=>seriesName(serie(x.id),x.id).toLocaleLowerCase("es").includes(q));
  const host=document.getElementById("seriesList");
  host.innerHTML=data.map(x=>{
    const s=serie(x.id),g=game(s.ID_JUEGO),src=img(g);
    return `<article class="series-card" data-id="${esc(x.id)}">
      ${src?`<img src="${esc(src)}" loading="lazy" onerror="this.style.display='none'">`:""}
      <div><h2>${esc(seriesName(s,x.id))}</h2><div class="series-game">${esc(gameName(g,s.ID_JUEGO||""))}</div>
      <div class="series-count">${fmtMin(x.minutes)}</div><div class="muted">${x.sessions} sesiones</div>
      ${s.ENLACE?`<a class="playlist" href="${esc(s.ENLACE)}" target="_blank" rel="noopener">Ver playlist</a>`:""}</div>
    </article>`;
  }).join("")||`<div class="empty">No se han encontrado series con tiempo jugado.</div>`;
  host.querySelectorAll(".series-card").forEach(c=>c.onclick=e=>{if(e.target.closest("a"))return;showSeries(c.dataset.id)});
}
function renderStats(){
  const gs=statsForGames(), ss=statsForSeries(), total=streams.reduce((n,s)=>n+minutes(s.TIEMPO_JUGADO),0);
  const max=gs[0]?.minutes||1;
  const top=gs.slice(0,10);
  document.getElementById("statsContent").innerHTML=`
    <div class="stats-head"><div><p class="eyebrow">ESTADÍSTICAS</p><h2>Tiempo jugado</h2><p class="muted">Las estadísticas se calculan sumando TIEMPO_JUGADO de cada sesión.</p></div><div><div class="total-hours">${fmtMin(total)}</div><div class="muted">tiempo total</div></div></div>
    <div class="stats-grid">
      <div class="stat-card"><span>Tiempo total</span><strong>${fmtMin(total)}</strong></div>
      <div class="stat-card"><span>Juegos</span><strong>${gs.length}</strong></div>
      <div class="stat-card"><span>Series</span><strong>${ss.length}</strong></div>
    </div>
    <div class="ranking"><h3>Juegos con más horas</h3>${top.map((x,i)=>`<div class="rank-row"><div class="rank-num">#${i+1}</div><div><strong>${esc(gameName(game(x.id),x.id))}</strong><div class="bar-wrap"><div class="bar" style="width:${(x.minutes/max*100).toFixed(2)}%"></div></div></div><strong>${fmtMin(x.minutes)}</strong></div>`).join("")||'<div class="empty">Todavía no hay sesiones con tiempo jugado.</div>'}</div>`;
}
function showGame(id){
  const g=game(id), rows=streams.filter(s=>s.ID_JUEGO===id), total=rows.reduce((n,s)=>n+minutes(s.TIEMPO_JUGADO),0);
  const bySeries={};rows.forEach(s=>{bySeries[s.ID_SERIE||"__sin_serie__"]=(bySeries[s.ID_SERIE||"__sin_serie__"]||0)+minutes(s.TIEMPO_JUGADO)});
  const list=Object.entries(bySeries).sort((a,b)=>b[1]-a[1]);
  hideTabs();
  const d=document.getElementById("detail");d.classList.add("active");
  d.innerHTML=`<button class="back" id="back">← Juegos</button><div class="detail-top">${img(g)?`<img src="${esc(img(g))}">`:""}<div><h2>${esc(gameName(g,id))}</h2><div class="hours">${fmtMin(total)}</div><p class="muted">${rows.length} sesiones</p><h3>Series</h3><div class="series-list">${list.map(([sid,n])=>`<div class="series-item" data-sid="${esc(sid)}"><strong>${esc(seriesName(serie(sid),sid))}</strong><div class="muted">${fmtMin(n)}</div></div>`).join("")||'<span class="muted">Sin series.</span>'}</div></div></div>`;
  d.querySelector("#back").onclick=()=>setTab("juegos");
  d.querySelectorAll(".series-item").forEach(x=>x.onclick=()=>showSeries(x.dataset.sid));
}
function showSeries(id){
  const s=serie(id),g=game(s.ID_JUEGO),rows=streams.filter(x=>x.ID_SERIE===id),total=rows.reduce((n,x)=>n+minutes(x.TIEMPO_JUGADO),0);
  hideTabs();const d=document.getElementById("detail");d.classList.add("active");
  d.innerHTML=`<button class="back" id="back">← Series</button><div class="detail-top">${img(g)?`<img src="${esc(img(g))}">`:""}<div><h2>${esc(seriesName(s,id))}</h2><p class="muted">${esc(gameName(g,s.ID_JUEGO||""))}</p><div class="hours">${fmtMin(total)}</div><p class="muted">${rows.length} sesiones</p>${s.ENLACE?`<a class="playlist" href="${esc(s.ENLACE)}" target="_blank" rel="noopener">Ver playlist</a>`:""}</div></div>`;
  d.querySelector("#back").onclick=()=>setTab("series");
}
function hideTabs(){
  document.querySelectorAll(".tab-page").forEach(x=>x.classList.remove("active"));
}
function setTab(t){
  tab=t;hideTabs();document.getElementById("tab-"+t).classList.add("active");
  document.querySelectorAll(".catalog-btn").forEach(b=>b.classList.toggle("active",b.dataset.tab===t));
  if(t==="juegos")renderGames();if(t==="series")renderSeries();if(t==="estadisticas")renderStats();
}
document.querySelectorAll(".catalog-btn").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
document.getElementById("search").oninput=()=>{if(tab==="juegos")renderGames();if(tab==="series")renderSeries()};
document.getElementById("sort").onchange=()=>{if(tab==="juegos")renderGames();if(tab==="series")renderSeries()};
(async()=>{
 try{
  await loadConfig(); [games,series,streams]=await Promise.all([loadCSV(DATA.games),loadCSV(DATA.series),loadCSV(DATA.streams)]);
  renderGames();renderSeries();renderStats();
 }catch(e){
  console.error(e);
  document.getElementById("gamesList").innerHTML=`<div class="empty">No se han podido cargar los CSV. Comprueba que estás sirviendo la carpeta desde un servidor web (por ejemplo GitHub Pages) y que existen los tres archivos de data/.</div>`;
 }
})();
