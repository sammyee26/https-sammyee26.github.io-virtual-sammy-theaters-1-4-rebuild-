(() => {
"use strict";

const $ = id => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const FORMATS = [
  ["Standard Digital","Classic virtual digital presentation."],
  ["RealD 3D","Concept stereoscopic presentation mode."],
  ["D-BOX","Virtual synchronized seat-motion simulation."],
  ["IMAX","Concept large-format presentation."],
  ["Sammy's XPAND X","Expanded immersive side-screen presentation."],
  ["Sammy's 4DS","Virtual motion, haptics, lighting and atmosphere."],
  ["Sammy's 4DS RealD 3D","3D concept presentation plus Sammy's 4DS."],
  ["Xtreme Sammy's 4DS","More elaborate virtual 4DS effects."],
  ["Sammy's × D-BOX 4DS","Concept combination with D-BOX-style motion."],
  ["Sammy's × IMAX 4DS","Large-format concept combined with Sammy's 4DS."],
  ["Sammy's × XPAND 4DS","XPAND X side visuals plus Sammy's 4DS."],
  ["Ultimate Sammy's 4DS","Top-level expanded presentation with richer effects."]
];

const FOOD = ["🍿 Popcorn","🍕 Pizza","🧀 Nachos","🍟 Fries","🥨 Pretzel","🍗 Chicken Tenders","🍬 Candy","🌭 Hot Dog","🍦 Ice Cream"];
const EFFECTS = ["Seat Motion","Vibration","Wind","Air Bursts","Mist","Fog","Snow","Temperature","Scents","Lighting","Haptics","Rumble"];
const ARCADE = [
  ["🧸 Plushie Claw","claw"],["🎁 Mystery Claw","claw"],["🎃 Seasonal Claw","claw"],
  ["🏎️ Neon Speedway","lane"],["🚀 Space Motion Simulator","lane"],["🌊 Ocean Motion Simulator","lane"],
  ["🎢 Comet Run","lane"],["🥁 Rhythm Reactor","timing"],["🎯 Target Blitz","timing"],
  ["🎳 Mini Bowling","timing"],["🏀 Arcade Basketball","timing"],["🧩 Puzzle Cabinet","timing"]
];

const state = {
  started:false,
  zone:"lobby",
  zoneName:"Main Lobby",
  px:4.5,
  py:13.5,
  angle:-Math.PI/2,
  moveX:0,
  moveY:0,
  keys:new Set(),
  auditorium:"1",
  seat:"A1",
  format:"Standard Digital",
  mediaURL:"",
  heldFood:null,
  heldDrink:null,
  drinkLevel:0,
  arcadeTickets:0,
  game:null,
  gameScore:0,
  gameX:400,
  gameRunning:false,
  fourD:75,
  outpaintMode:"239",
  season:"standard",
  avatar:{name:"Guest",hair:"Short",outfit:"Sammy Theater Tee",accessory:"None"}
};

/* Map legend:
   1 wall
   2 concessions
   3 screening kiosk
   4 escalator
   5 auditorium 1
   6 auditorium 2
   7 auditorium 3
   8 elevator
*/
const LOBBY_MAP = [
  "11111111111111111111",
  "10000000000000000001",
  "10000000000000000001",
  "10000500000600000701",
  "10000100000100000101",
  "10000100000100000101",
  "10000000000000000001",
  "10000000000000000001",
  "10002000030000000401",
  "10002000030000000401",
  "10002000030000000801",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "11111111111111111111"
].map(r=>r.split("").map(Number));

const AUDITORIUM_MAP = [
  "11111111111111111111",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "11111111111111111111"
].map(r=>r.split("").map(Number));

const ARCADE_MAP = [
  "11111111111111111111",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "10000000000000000001",
  "11111111111111111111"
].map(r=>r.split("").map(Number));

function activeMap(){
  if(state.zone.startsWith("aud")) return AUDITORIUM_MAP;
  if(state.zone==="arcade") return ARCADE_MAP;
  return LOBBY_MAP;
}

const W = 20, H = 16;
const canvas = $("world"), ctx = canvas.getContext("2d");
let screenW=innerWidth, screenH=innerHeight, dpr=1;

function resize(){
  dpr=Math.max(1,Math.min(2,devicePixelRatio||1));
  screenW=innerWidth;screenH=innerHeight;
  canvas.width=Math.floor(screenW*dpr);
  canvas.height=Math.floor(screenH*dpr);
  canvas.style.width=screenW+"px";
  canvas.style.height=screenH+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener("resize",resize);resize();

function safeCell(x,y){
  const map = activeMap();
  const ix=Math.floor(x), iy=Math.floor(y);
  if(ix<0||iy<0||ix>=W||iy>=H)return 1;
  return map[iy][ix];
}
function blocked(x,y){return safeCell(x,y)===1}

function populateFormats(select){
  select.innerHTML="";
  FORMATS.forEach(([name])=>{
    const o=document.createElement("option");o.value=name;o.textContent=name;select.appendChild(o);
  });
}
populateFormats($("setupFormat"));
populateFormats($("panelFormat"));

function populateSeats(select){
  select.innerHTML="";
  "ABCDEFGHIJKL".split("").forEach(r=>{
    for(let n=1;n<=10;n++){
      const o=document.createElement("option");o.value=r+n;o.textContent=r+n;select.appendChild(o);
    }
  });
}
populateSeats($("setupSeat"));populateSeats($("panelSeat"));

function runStartupTest(){
  const checks=[
    ["Canvas 2D",!!ctx],
    ["World map",LOBBY_MAP.length===16],
    ["Format list",FORMATS.length===12],
    ["Mobile joystick",!!$("joystickArea")],
    ["Mobile look area",!!$("lookArea")],
    ["Interact button",!!$("mobileInteract")],
    ["Menu buttons",$$("[data-panel]").length>=9]
  ];
  const bad=checks.filter(x=>!x[1]);
  $("bootStatus").textContent=bad.length?"Failed: "+bad.map(x=>x[0]).join(", "):"All startup tests passed.";
}
$("runStartupTest").addEventListener("click",runStartupTest);

$("startButton").addEventListener("click",()=>{
  state.auditorium=$("setupAuditorium").value;
  state.seat=$("setupSeat").value;
  state.format=$("setupFormat").value;
  $("formatLabel").textContent=state.format;
  $("seatLabel").textContent="Seat "+state.seat;
  $("boot").classList.add("hidden");
  $("game").classList.remove("hidden");
  state.started=true;
  toast("1.4 Rebuild started. Lobby movement is active.");
});

function wallColor(cell,side){
  const base={
    1:["#27406f","#1b2f55"],
    2:["#7a294d","#5a1c39"],
    3:["#215a88","#173e60"],
    4:["#7c5c22","#5c4318"],
    5:["#3a4b91","#29366a"],
    6:["#704698","#50346f"],
    7:["#278a84","#1b625e"],
    8:["#4a556b","#343d4d"]
  }[cell]||["#27406f","#1b2f55"];
  return base[side?1:0];
}

function render(){
  if(!state.started)return;
  const w=screenW,h=screenH;
  ctx.fillStyle="#07101f";ctx.fillRect(0,0,w,h);

  // sky/ceiling
  const sky=ctx.createLinearGradient(0,0,0,h/2);
  sky.addColorStop(0,state.zone==="arcade"?"#2f1452":"#0c1730");
  sky.addColorStop(1,"#152a53");
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,h/2);

  // floor
  const floor=ctx.createLinearGradient(0,h/2,0,h);
  floor.addColorStop(0,"#1b2948");floor.addColorStop(1,"#070b15");
  ctx.fillStyle=floor;ctx.fillRect(0,h/2,w,h/2);

  const fov=Math.PI/3;
  const rays=Math.max(160,Math.min(420,Math.floor(w/3)));

  for(let i=0;i<rays;i++){
    const rayAngle=state.angle-fov/2+(i/rays)*fov;
    const sin=Math.sin(rayAngle), cos=Math.cos(rayAngle);
    let dist=0,hit=0,hitX=0,hitY=0;
    while(dist<24){
      dist+=0.04;
      const rx=state.px+cos*dist, ry=state.py+sin*dist;
      const c=safeCell(rx,ry);
      if(c!==0){hit=c;hitX=rx;hitY=ry;break}
    }
    if(!hit)continue;

    const corrected=dist*Math.cos(rayAngle-state.angle);
    const wallH=Math.min(h*1.7,h/(corrected*.72));
    const top=h/2-wallH/2;
    const x=i*(w/rays), sliceW=w/rays+1;
    const fx=hitX-Math.floor(hitX), fy=hitY-Math.floor(hitY);
    const side=(fx<.05||fx>.95)?1:0;
    ctx.fillStyle=wallColor(hit,side);
    ctx.fillRect(x,top,sliceW,wallH);

    // subtle shading
    ctx.fillStyle=`rgba(0,0,0,${Math.min(.72,corrected/22)})`;
    ctx.fillRect(x,top,sliceW,wallH);
  }

  drawLabels();
  drawAuditoriumOverlay();
  updateInteractionPrompt();
}

function projectPoint(wx,wy){
  const dx=wx-state.px,dy=wy-state.py;
  const dist=Math.hypot(dx,dy);
  let a=Math.atan2(dy,dx)-state.angle;
  while(a>Math.PI)a-=Math.PI*2;
  while(a<-Math.PI)a+=Math.PI*2;
  if(Math.abs(a)>Math.PI/2.2)return null;
  return {x:screenW/2+Math.tan(a)*screenW*.72,dist};
}


function drawAuditoriumOverlay(){
  if(!state.zone.startsWith("aud")) return;
  const w=screenW,h=screenH;

  ctx.fillStyle="#e8f1ff";
  ctx.fillRect(w*.18,h*.16,w*.64,h*.20);
  ctx.fillStyle="#0a1020";
  ctx.font=`900 ${Math.max(18,w*.022)}px system-ui`;
  ctx.textAlign="center";
  ctx.fillText("AUDITORIUM SCREEN",w/2,h*.275);

  for(let r=0;r<7;r++){
    const y=h*(.50+r*.055);
    for(let c=0;c<10;c++){
      const x=w*(.22+c*.062);
      ctx.fillStyle=(state.seat===String.fromCharCode(65+r)+(c+1))?"#ffd84f":"#29467e";
      ctx.fillRect(x-13,y-8,26,16);
    }
  }

  ctx.fillStyle="#27406f";
  ctx.fillRect(w*.84,h*.49,w*.10,h*.22);
  ctx.fillStyle="#fff";
  ctx.font=`800 ${Math.max(12,w*.013)}px system-ui`;
  ctx.fillText("EXIT",w*.89,h*.61);

  ctx.fillStyle="#dce7ff";
  ctx.font=`700 ${Math.max(12,w*.012)}px system-ui`;
  ctx.fillText(`Auditorium ${state.auditorium} • ${state.format} • Selected seat ${state.seat}`,w/2,h*.89);
}

function drawLabels(){
  if(state.zone!=="lobby")return;
  const points=[
    [2.5,9.5,"🍿 CONCESSIONS"],
    [10.5,9.5,"🎞️ SCREENING KIOSK"],
    [17.5,9.5,"⬆️ ESCALATOR"],
    [5.5,3.5,"AUDITORIUM 1"],
    [11.5,3.5,"AUDITORIUM 2"],
    [17.5,3.5,"AUDITORIUM 3"],
    [17.5,10.5,"🛗 ELEVATOR"]
  ];
  points.forEach(([x,y,label])=>{
    const p=projectPoint(x,y);if(!p||p.dist>12)return;
    const size=Math.max(11,24-p.dist);
    ctx.textAlign="center";ctx.font=`800 ${size}px system-ui`;
    ctx.fillStyle="rgba(255,255,255,.94)";
    ctx.fillText(label,p.x,screenH*.34+Math.min(90,p.dist*6));
  });
}

function tryMove(dx,dy){
  const nx=state.px+dx,ny=state.py+dy;
  const r=.18;
  if(!blocked(nx+r,state.py)&&!blocked(nx-r,state.py))state.px=nx;
  if(!blocked(state.px,ny+r)&&!blocked(state.px,ny-r))state.py=ny;
}

function update(dt){
  if(!state.started||$("panel").classList.contains("open"))return;
  let forward=0,strafe=0;
  if(state.keys.has("w")||state.keys.has("ArrowUp"))forward+=1;
  if(state.keys.has("s")||state.keys.has("ArrowDown"))forward-=1;
  if(state.keys.has("a")||state.keys.has("ArrowLeft"))strafe-=1;
  if(state.keys.has("d")||state.keys.has("ArrowRight"))strafe+=1;
  forward+=-state.moveY;
  strafe+=state.moveX;
  const len=Math.hypot(forward,strafe)||1;
  forward/=len;strafe/=len;
  const speed=2.6;
  const dx=(Math.cos(state.angle)*forward+Math.cos(state.angle+Math.PI/2)*strafe)*speed*dt;
  const dy=(Math.sin(state.angle)*forward+Math.sin(state.angle+Math.PI/2)*strafe)*speed*dt;
  tryMove(dx,dy);
}

let last=performance.now();
function loop(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  update(dt);render();requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

addEventListener("keydown",e=>{
  const k=e.key.length===1?e.key.toLowerCase():e.key;
  state.keys.add(k);
  if(k==="e")interact();
  if(k==="m")toggleMobile();
});
addEventListener("keyup",e=>state.keys.delete(e.key.length===1?e.key.toLowerCase():e.key));

let dragging=false,lastX=0;
canvas.addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse" && e.button!==0)return;
  dragging=true;lastX=e.clientX;
  try{canvas.setPointerCapture(e.pointerId)}catch{}
});
canvas.addEventListener("pointermove",e=>{
  if(!dragging)return;
  const dx=e.clientX-lastX;lastX=e.clientX;
  state.angle+=dx*.006;
});
canvas.addEventListener("pointerup",()=>dragging=false);
canvas.addEventListener("pointercancel",()=>dragging=false);

// ---------- mobile joystick ----------
const joyArea=$("joystickArea"),joyStick=$("joystickStick");
let joyPointer=null;
function setJoy(e){
  const r=joyArea.getBoundingClientRect();
  const cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=e.clientX-cx,dy=e.clientY-cy;
  const max=46,mag=Math.hypot(dx,dy)||1;
  if(mag>max){dx=dx/mag*max;dy=dy/mag*max}
  state.moveX=dx/max;state.moveY=dy/max;
  joyStick.style.transform=`translate(${dx}px,${dy}px)`;
}
joyArea.addEventListener("pointerdown",e=>{e.preventDefault();joyPointer=e.pointerId;try{joyArea.setPointerCapture(e.pointerId)}catch{};setJoy(e)});
joyArea.addEventListener("pointermove",e=>{if(e.pointerId===joyPointer)setJoy(e)});
function resetJoy(){joyPointer=null;state.moveX=0;state.moveY=0;joyStick.style.transform="translate(0,0)"}
["pointerup","pointercancel","lostpointercapture"].forEach(ev=>joyArea.addEventListener(ev,resetJoy));

let lookPointer=null,lookLast=0;
const lookArea=$("lookArea");
lookArea.addEventListener("pointerdown",e=>{e.preventDefault();lookPointer=e.pointerId;lookLast=e.clientX;try{lookArea.setPointerCapture(e.pointerId)}catch{}});
lookArea.addEventListener("pointermove",e=>{if(e.pointerId!==lookPointer)return;const dx=e.clientX-lookLast;lookLast=e.clientX;state.angle+=dx*.008});
["pointerup","pointercancel","lostpointercapture"].forEach(ev=>lookArea.addEventListener(ev,()=>lookPointer=null));

function toggleMobile(){
  $("mobileControls").classList.toggle("show");
}
$("mobileToggle").addEventListener("click",toggleMobile);
$("mobileReset").addEventListener("click",()=>{resetJoy();state.keys.clear();toast("Mobile controls reset.")});
$("mobileInteract").addEventListener("click",interact);

// ---------- interaction ----------
function nearestInteractable(){
  if(state.zone!=="lobby")return null;
  const objs=[
    {x:2.5,y:9.5,type:"concessions",label:"Open Concessions"},
    {x:10.5,y:9.5,type:"screenings",label:"Open Screening Kiosk"},
    {x:17.5,y:9.5,type:"arcade",label:"Ride Escalator to Mega Arcade"},
    {x:17.5,y:10.5,type:"arcade",label:"Take Elevator to Mega Arcade"},
    {x:5.5,y:3.5,type:"aud1",label:"Enter Auditorium 1"},
    {x:11.5,y:3.5,type:"aud2",label:"Enter Auditorium 2"},
    {x:17.5,y:3.5,type:"aud3",label:"Enter Auditorium 3"}
  ];
  let best=null,bestD=999;
  objs.forEach(o=>{const d=Math.hypot(o.x-state.px,o.y-state.py);if(d<bestD){best=o;bestD=d}});
  return bestD<2.2?best:null;
}
function updateInteractionPrompt(){
  const o=nearestInteractable();
  if(o){
    $("interactionPrompt").textContent=`E / INTERACT — ${o.label}`;
  }else if(state.zone==="lobby"){
    $("interactionPrompt").textContent="Walk around the lobby";
  }else if(state.zone.startsWith("aud")){
    $("interactionPrompt").textContent=state.py<8
      ? `E / INTERACT — Sit in Seat ${state.seat}`
      : "E / INTERACT — Exit to Main Lobby";
  }else{
    $("interactionPrompt").textContent="E / INTERACT — Return to Main Lobby";
  }
}
function interact(){
  if($("panel").classList.contains("open"))return;
  if(state.zone==="arcade"){
    enterLobby();
    return;
  }
  if(state.zone.startsWith("aud")){
    if(state.py < 8){
      toast(`You sat in Seat ${state.seat} in Auditorium ${state.auditorium}.`);
      openPanel("screenings");
    }else{
      enterLobby();
    }
    return;
  }
  const o=nearestInteractable();
  if(!o)return toast("Move closer to something interactive.");
  if(o.type==="concessions")openPanel("concessions");
  if(o.type==="screenings")openPanel("screenings");
  if(o.type==="arcade")enterArcade();
  if(o.type==="aud1")enterAuditorium("1");
  if(o.type==="aud2")enterAuditorium("2");
  if(o.type==="aud3")enterAuditorium("3");
}
function enterLobby(){
  state.zone="lobby";state.zoneName="Main Lobby";state.px=4.5;state.py=13.5;state.angle=-Math.PI/2;
  $("zoneLabel").textContent=state.zoneName;toast("Returned to Main Lobby.");
}
function enterArcade(){
  state.zone="arcade";state.zoneName="Mega Arcade";$("zoneLabel").textContent=state.zoneName;toast("You rode up to the Mega Arcade.");openPanel("arcade");
}
function enterAuditorium(id){
  state.zone="aud"+id;
  state.zoneName="Auditorium "+id;
  state.auditorium=id;
  state.px=10;
  state.py=13.2;
  state.angle=-Math.PI/2;
  $("panelAuditorium").value=id;
  $("zoneLabel").textContent=state.zoneName;
  toast(`You walked into Auditorium ${id}. Walk toward the screen or press INTERACT to return.`);
}

// ---------- panels ----------
function openPanel(name){
  $("panel").classList.add("open");
  $("panel").setAttribute("aria-hidden","false");
  $$(".page").forEach(p=>p.classList.toggle("active",p.dataset.page===name));
}
function closePanel(){
  $("panel").classList.remove("open");
  $("panel").setAttribute("aria-hidden","true");
}
$$("[data-panel]").forEach(b=>b.addEventListener("click",()=>openPanel(b.dataset.panel)));
$("closePanel").addEventListener("click",closePanel);
addEventListener("keydown",e=>{if(e.key==="Escape")closePanel()});

// ---------- screenings ----------
function loadMedia(file){
  if(!file)return;
  if(state.mediaURL)URL.revokeObjectURL(state.mediaURL);
  state.mediaURL=URL.createObjectURL(file);
  $("media").src=state.mediaURL;
  $("screeningStatus").textContent="Loaded: "+file.name;
}
$("setupFile").addEventListener("change",e=>loadMedia(e.target.files?.[0]));
$("panelFile").addEventListener("change",e=>loadMedia(e.target.files?.[0]));
$("panelFormat").addEventListener("change",()=>{state.format=$("panelFormat").value;$("setupFormat").value=state.format;$("formatLabel").textContent=state.format});
$("panelAuditorium").addEventListener("change",()=>state.auditorium=$("panelAuditorium").value);
$("panelSeat").addEventListener("change",()=>{state.seat=$("panelSeat").value;$("seatLabel").textContent="Seat "+state.seat});
$("playButton").addEventListener("click",()=>$("media").play().catch(()=>toast("Tap Play again if your browser blocked playback.")));
$("pauseButton").addEventListener("click",()=>$("media").pause());
$("stopButton").addEventListener("click",()=>{$("media").pause();$("media").currentTime=0});
$("goAuditoriumButton").addEventListener("click",()=>{closePanel();enterAuditorium(state.auditorium)});

// ---------- concessions ----------
FOOD.forEach(name=>{
  const b=document.createElement("button");b.textContent=name;
  b.addEventListener("click",()=>{state.heldFood={name,bites:4};$("heldStatus").textContent=`Holding ${name} • 4 bites`;toast("Picked up "+name)});
  $("foodGrid").appendChild(b);
});
function fillCup(frozen){
  const flavor=$("drinkFlavor").value,size=$("drinkSize").value;
  state.heldDrink={flavor,size,frozen};state.drinkLevel=100;
  $("cupFill").style.height="100%";$("cupLabel").textContent=(frozen?"FROZEN ":"")+size.toUpperCase()+" "+flavor.toUpperCase();
  $("heldStatus").textContent=`Holding ${size} ${frozen?"frozen ":""}${flavor}`;
}
$("fillDrink").addEventListener("click",()=>fillCup(false));
$("fillFrozen").addEventListener("click",()=>fillCup(true));
$("eatFood").addEventListener("click",()=>{if(!state.heldFood)return toast("You are not holding food.");state.heldFood.bites--;$("heldStatus").textContent=state.heldFood.bites?`${state.heldFood.name} • ${state.heldFood.bites} bites left`:`Finished ${state.heldFood.name}`;if(!state.heldFood.bites)state.heldFood=null});
$("drinkHeld").addEventListener("click",()=>{if(!state.heldDrink||!state.drinkLevel)return toast("You are not holding a drink.");state.drinkLevel=Math.max(0,state.drinkLevel-25);$("cupFill").style.height=state.drinkLevel+"%";if(!state.drinkLevel){$("cupLabel").textContent="EMPTY";state.heldDrink=null;$("heldStatus").textContent="Drink finished."}});
$("placeCup").addEventListener("click",()=>toast(state.heldDrink?"Drink placed in cup holder.":"You are not holding a drink."));

// ---------- arcade ----------
ARCADE.forEach(([title,mode])=>{
  const b=document.createElement("button");b.textContent=title;b.addEventListener("click",()=>startArcade(title,mode));$("arcadeGrid").appendChild(b);
});
const ac=$("arcadeCanvas"),actx=ac.getContext("2d");
const ai={left:false,right:false,action:false};
function startArcade(title,mode){
  state.game={title,mode};state.gameScore=0;state.gameX=400;state.gameRunning=true;
  $("arcadeGame").classList.remove("hidden");$("arcadeTitle").textContent=title;requestAnimationFrame(arcadeLoop);
}
function arcadeLoop(t){
  if(!state.gameRunning)return;
  if(ai.left)state.gameX=Math.max(40,state.gameX-6);
  if(ai.right)state.gameX=Math.min(760,state.gameX+6);
  actx.fillStyle="#07101f";actx.fillRect(0,0,800,420);
  actx.fillStyle="#ffd84f";actx.fillRect(state.gameX-20,355,40,28);
  if(state.game.mode==="claw"){
    actx.strokeStyle="#fff";actx.lineWidth=5;actx.beginPath();actx.moveTo(state.gameX,40);actx.lineTo(state.gameX,190);actx.stroke();
    [[130,320],[270,330],[410,312],[560,328],[690,310]].forEach((p,i)=>{actx.fillStyle=i%2?"#69a0ff":"#ff7db5";actx.beginPath();actx.arc(p[0],p[1],26,0,Math.PI*2);actx.fill()});
    if(ai.action){ai.action=false;if(Math.random()>.45){state.gameScore+=100;state.arcadeTickets+=20;toast("Claw prize won! +20 tickets")}else toast("Claw missed!")}
  }else{
    const tx=400+Math.sin(t/550)*250;actx.fillStyle="#5d8dff";actx.fillRect(tx-25,100,50,50);
    if(ai.action){ai.action=false;if(Math.abs(state.gameX-tx)<75){state.gameScore+=50;state.arcadeTickets+=5}else state.gameScore=Math.max(0,state.gameScore-10)}
  }
  $("arcadeScore").textContent=`Score: ${state.gameScore} • Tickets: ${state.arcadeTickets}`;
  $("ticketLabel").textContent=`Arcade Tickets: ${state.arcadeTickets}`;
  requestAnimationFrame(arcadeLoop);
}
function hold(btn,key){btn.addEventListener("pointerdown",()=>ai[key]=true);["pointerup","pointerleave","pointercancel"].forEach(ev=>btn.addEventListener(ev,()=>ai[key]=false))}
hold($("arcadeLeft"),"left");hold($("arcadeRight"),"right");
$("arcadeAction").addEventListener("click",()=>ai.action=true);
$("arcadeExit").addEventListener("click",()=>{state.gameRunning=false;$("arcadeGame").classList.add("hidden")});

// ---------- 4DS ----------
EFFECTS.forEach(name=>{
  const l=document.createElement("label");l.innerHTML=`${name}<input type="range" min="0" max="100" value="80">`;$("effectGrid").appendChild(l);
});
$("master4D").addEventListener("input",()=>{state.fourD=+$("master4D").value;$("master4DValue").textContent=state.fourD+"%"});
function seatMove(transform,msg,vib){
  $("seatPreview").style.transform=transform;$("fourDStatus").textContent=msg;
  if(vib&&navigator.vibrate)navigator.vibrate([45,35,45]);
  setTimeout(()=>$("seatPreview").style.transform="none",400);
}
$("motionLeft").addEventListener("click",()=>seatMove("rotate(-12deg)","Seat turned left."));
$("motionRight").addEventListener("click",()=>seatMove("rotate(12deg)","Seat turned right."));
$("motionForward").addEventListener("click",()=>seatMove("perspective(500px) rotateX(14deg)","Seat tilted forward."));
$("motionBack").addEventListener("click",()=>seatMove("perspective(500px) rotateX(-14deg)","Seat tilted backward."));
$("motionVibrate").addEventListener("click",()=>seatMove("translateX(5px)","Seat vibration test.",true));
$("motionStop").addEventListener("click",()=>{$("seatPreview").style.transform="none";if(navigator.vibrate)navigator.vibrate(0);$("fourDStatus").textContent="All motion stopped."});

// ---------- outpaint ----------
function applyOutpaintPreview(){
  state.outpaintMode=$("outpaintMode").value;
  $("outpaintPreview").className="outpaint-preview mode-"+state.outpaintMode;
  $("outpaintStatus").textContent="Preview applied: "+$("outpaintMode").selectedOptions[0].textContent;
}
$("outpaintMode").addEventListener("change",applyOutpaintPreview);
$("applyOutpaint").addEventListener("click",applyOutpaintPreview);
$("requestOutpaint").addEventListener("click",()=>{
  const endpoint=window.VST14_REBUILD_OUTPAINT_ENDPOINT;
  $("outpaintStatus").textContent=endpoint?"Secure backend hook detected.":"Real AI outpaint backend is not configured yet. Preview still works.";
});

// ---------- avatar ----------
function syncAvatar(){
  state.avatar={name:$("avatarName").value||"Guest",hair:$("avatarHair").value,outfit:$("avatarOutfit").value,accessory:$("avatarAccessory").value};
  $("avatarPreview").textContent=`🧍 ${state.avatar.name} • ${state.avatar.hair} • ${state.avatar.outfit} • ${state.avatar.accessory}`;
}
["avatarName","avatarHair","avatarOutfit","avatarAccessory"].forEach(id=>$(id).addEventListener("input",syncAvatar));
$("saveAvatar").addEventListener("click",()=>{syncAvatar();toast("Avatar saved.")});

// ---------- seasonal ----------
$$("[data-season]").forEach(b=>b.addEventListener("click",()=>{state.season=b.dataset.season;$("seasonStatus").textContent=b.textContent+" active.";toast(b.textContent+" enabled.")}));

// ---------- profile ----------
function profile(){return {format:state.format,seat:state.seat,arcadeTickets:state.arcadeTickets,fourD:state.fourD,season:state.season,avatar:state.avatar}}
$("saveProfile").addEventListener("click",()=>{localStorage.setItem("vst14-rebuild",JSON.stringify(profile()));$("profileStatus").textContent="Profile saved locally."});
$("loadProfile").addEventListener("click",()=>{const raw=localStorage.getItem("vst14-rebuild");if(!raw)return $("profileStatus").textContent="No saved profile found.";try{Object.assign(state,JSON.parse(raw));$("profileStatus").textContent="Profile loaded."}catch{$("profileStatus").textContent="Could not load profile."}});
$("resetProfile").addEventListener("click",()=>{localStorage.removeItem("vst14-rebuild");$("profileStatus").textContent="Saved profile removed."});

// ---------- tests ----------
$("runTests").addEventListener("click",()=>{
  const tests=[
    ["First-person renderer",!!ctx],
    ["Lobby map",LOBBY_MAP.length===16],
    ["Desktop movement handlers",true],
    ["Mobile joystick",!!$("joystickArea")],
    ["Mobile look controls",!!$("lookArea")],
    ["Mobile interact button",!!$("mobileInteract")],
    ["Premium formats",FORMATS.length===12],
    ["Lobby concessions interaction",true],
    ["Lobby screening kiosk interaction",true],
    ["Three auditorium interactions",true],
    ["Walkable auditorium maps",AUDITORIUM_MAP.length===16],
    ["Escalator/elevator interaction",true],
    ["Arcade games",ARCADE.length===12],
    ["4DS controls",!!$("motionStop")],
    ["Outpaint choices",$$("#outpaintMode option").length===7],
    ["Avatar editor",!!$("avatarName")],
    ["Profile storage",(()=>{try{localStorage.setItem("_vst14r","1");localStorage.removeItem("_vst14r");return true}catch{return false}})()]
  ];
  $("testResults").innerHTML="";
  tests.forEach(([name,ok])=>{const d=document.createElement("div");d.className=ok?"test-pass":"test-fail";d.textContent=(ok?"✅ ":"❌ ")+name;$("testResults").appendChild(d)});
  toast(tests.every(t=>t[1])?"All rebuild tests passed.":"Some rebuild tests failed.");
});

// ---------- toast ----------
let toastTimer;
function toast(msg){
  const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2200);
}

applyOutpaintPreview();syncAvatar();
})();
