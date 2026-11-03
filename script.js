const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const fmt = s => `${pad(Math.floor(s/3600))}:${pad(Math.floor(s%3600/60))}:${pad(Math.floor(s%60))}`;

/* ---------- storage-safe settings ---------- */
let cfg = {study:25, brk:5, rounds:4};
try { Object.assign(cfg, JSON.parse(localStorage.getItem("shubhamTimer") || "{}")); } catch(e){}

/* ---------- beep ---------- */
function beep(){
  try{
    const a = new (window.AudioContext||window.webkitAudioContext)();
    [0,.3,.6].forEach(t=>{
      const o=a.createOscillator(), g=a.createGain();
      o.frequency.value=880; o.connect(g); g.connect(a.destination);
      g.gain.setValueAtTime(.2,a.currentTime+t); g.gain.exponentialRampToValueAtTime(.001,a.currentTime+t+.25);
      o.start(a.currentTime+t); o.stop(a.currentTime+t+.25);
    });
  }catch(e){}
  if(navigator.vibrate) navigator.vibrate([200,100,200]);
}

/* ---------- tabs ---------- */
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("nav button,section").forEach(e=>e.classList.remove("active"));
  b.classList.add("active"); $(b.dataset.tab).classList.add("active");
  current = b.dataset.tab;
});
let current = "timer";

/* ---------- study timer (study / break intervals) ---------- */
const C = 2*Math.PI*52, bar = $("bar");
bar.style.strokeDasharray = C;
let round = 1, mode = "study", total, left, tRun = false, tEnd = 0, tick;

function phaseSecs(){ return (mode==="study" ? cfg.study : cfg.brk) * 60; }
function setPhase(){
  total = left = phaseSecs();
  renderTimer();
}
function renderTimer(){
  $("tTime").textContent = fmt(left);
  $("tInterval").textContent = `Interval : ${round}/${cfg.rounds}`;
  $("phase").textContent = mode==="study" ? "Study time. Stay focused" : "Break time. Relax";
  bar.style.strokeDashoffset = C * (1 - left/total);
  if(full.classList.contains("show") && current==="timer") $("fDigits").textContent = fmt(left);
  document.title = (tRun ? fmt(left)+" · " : "") + "Shubham Study Timer";
}
function startTimer(){
  tRun = true; tEnd = Date.now() + left*1000;
  $("tToggle").textContent = "PAUSE";
  tick = setInterval(()=>{
    left = Math.max(0, Math.round((tEnd - Date.now())/1000));
    renderTimer();
    if(left<=0) nextPhase();
  }, 250);
}
function pauseTimer(){ tRun=false; clearInterval(tick); $("tToggle").textContent="START"; }
function nextPhase(){
  beep();
  if(mode==="study"){
    if(round>=cfg.rounds){ pauseTimer(); round=1; mode="study"; setPhase(); $("phase").textContent="All intervals done. Great work!"; return; }
    mode="break";
  } else { mode="study"; round++; }
  total = left = phaseSecs(); tEnd = Date.now()+left*1000; renderTimer();
}
$("tToggle").onclick = ()=> tRun ? pauseTimer() : startTimer();
$("tReset").onclick = ()=>{ pauseTimer(); round=1; mode="study"; setPhase(); };

/* ---------- stopwatch ---------- */
let sRun=false, sStart=0, sElapsed=0, sTick, lapCount=0, lastLap=0;
const sNow = () => sElapsed + (sRun ? (Date.now()-sStart)/1000 : 0);
function renderSW(){ const t=fmt(sNow()); $("sTime").textContent=t; if(full.classList.contains("show")&&current==="stopwatch") $("fDigits").textContent=t; }
$("sToggle").onclick = ()=>{
  if(sRun){ sElapsed = sNow(); sRun=false; clearInterval(sTick); $("sToggle").textContent="START"; }
  else { sStart=Date.now(); sRun=true; sTick=setInterval(renderSW,200); $("sToggle").textContent="PAUSE"; }
};
$("sReset").onclick = ()=>{ sRun=false; clearInterval(sTick); sElapsed=0; lapCount=0; lastLap=0; $("laps").innerHTML=""; $("sToggle").textContent="START"; renderSW(); };
$("sLap").onclick = ()=>{
  if(!sNow()) return; const t=sNow(); lapCount++;
  const d=document.createElement("div");
  d.innerHTML=`<span>Lap ${lapCount}</span><span>+${fmt(t-lastLap)}</span><span>${fmt(t)}</span>`;
  $("laps").prepend(d); lastLap=t;
};

/* ---------- live clock ---------- */
function renderClock(){
  const d=new Date(), t=`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  $("cTime").textContent=t;
  $("cDate").textContent=d.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  if(full.classList.contains("show") && current==="clock") $("fDigits").textContent=t;
}
setInterval(renderClock,500);

/* ---------- fullscreen big digits ---------- */
const full = $("full");
function openFull(){
  full.classList.add("show");
  const run = current==="timer" ? tRun : current==="stopwatch" ? sRun : null;
  $("fToggle").style.display = current==="clock" ? "none" : "";
  $("fToggle").textContent = run ? "Stop" : "Start";
  renderTimer(); renderSW(); renderClock();
  if(full.requestFullscreen) full.requestFullscreen().catch(()=>{});
}
function closeFull(){
  full.classList.remove("show");
  if(document.fullscreenElement) document.exitFullscreen();
}
["tTime","sTime","cTime"].forEach(id=>$(id).onclick=openFull);
$("tFull").onclick = openFull;
$("fExit").onclick = closeFull;
$("fToggle").onclick = ()=>{
  if(current==="timer") $("tToggle").click(); else $("sToggle").click();
  const run = current==="timer" ? tRun : sRun;
  $("fToggle").textContent = run ? "Stop" : "Start";
};
document.addEventListener("fullscreenchange",()=>{ if(!document.fullscreenElement) full.classList.remove("show"); });

/* ---------- settings ---------- */
const dlg = $("settings");
$("openSettings").onclick = ()=>{
  $("setStudy").value=cfg.study; $("setBreak").value=cfg.brk; $("setRounds").value=cfg.rounds; dlg.showModal();
};
$("cancelSet").onclick = ()=>dlg.close();
$("saveSet").onclick = ()=>{
  const clamp=(v,a,b,d)=>{v=parseInt(v,10); return isNaN(v)?d:Math.min(b,Math.max(a,v));};
  cfg.study=clamp($("setStudy").value,1,180,25);
  cfg.brk=clamp($("setBreak").value,1,60,5);
  cfg.rounds=clamp($("setRounds").value,1,12,4);
  try{ localStorage.setItem("shubhamTimer", JSON.stringify(cfg)); }catch(e){}
  pauseTimer(); round=1; mode="study"; setPhase(); dlg.close();
};

/* ---------- motivation ---------- */
const quotes = ["Small steps every day add up.","Focus now, relax later.","One more chapter. You can do it.","Discipline beats motivation.","Stay consistent, Shubham."];
$("quote").textContent = quotes[Math.floor(Math.random()*quotes.length)];

setPhase(); renderSW(); renderClock();
  
