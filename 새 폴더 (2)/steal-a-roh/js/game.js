(function(){
'use strict';

/* =========================================================
   설정 (NPC 이름/색/아이템/성장템은 여기서 바꾸세요)
   ========================================================= */
var NPCS=window.__IMGS__.map(function(m){return {name:m.name,img:m.src,iw:m.w,ih:m.h};});
/* 등급: [이름, 그림자색, 중간색, 하이라이트색, 포인트색(받침/빔)] — 낮은 등급 → 높은 등급 */
var GRADES=[
  {name:'일반',     c:['#4a4f57','#9aa0a8','#eef0f3'],m:'#b0b6bd'},
  {name:'청동',     c:['#3b1f0e','#a8642a','#f0b27a'],m:'#cd7f32'},
  {name:'은',       c:['#3a4048','#a9b2bd','#ffffff'],m:'#d5dbe2'},
  {name:'황금',     c:['#5a3a00','#e0a400','#fff1a8'],m:'#ffc107'},
  {name:'에메랄드', c:['#032b14','#1faa59','#b9ffd6'],m:'#2ecc71'},
  {name:'아쿠아',   c:['#032c3a','#1fb6d6','#c4f6ff'],m:'#26c6da'},
  {name:'사파이어', c:['#06143f','#2a5fe0','#bcd2ff'],m:'#3d6bff'},
  {name:'자수정',   c:['#25083f','#8a3fd1','#e6c8ff'],m:'#a855f7'},
  {name:'로즈',     c:['#4a0f2a','#e0488e','#ffd0e6'],m:'#ff5fa2'},
  {name:'루비',     c:['#3d0206','#d4161f','#ffb3b3'],m:'#ff2b3a'},
  {name:'앰버',     c:['#4a1d00','#f07a10','#ffe0b0'],m:'#ff9100'},
  {name:'터콰이즈', c:['#02332f','#12c4b0','#c2fff6'],m:'#1de9b6'},
  {name:'흑요석',   c:['#05050a','#2b2d3f','#8d92c4'],m:'#6d72b8'},
  {name:'플래티넘', c:['#27323e','#9fc4e6','#ffffff'],m:'#bfe0ff'},
  {name:'다이아몬드',c:['#0b3d5c','#7ee8ff','#ffffff'],m:'#aef4ff'},
  {name:'오로라',   rainbow:1,c:['#000','#000','#fff'],m:'#ff80ff'},
  {name:'레전드',   c:['#3a0a52','#ff2fd0','#ffe9a0'],m:'#ff4fe0'},
  {name:'신화',     c:['#0a0014','#6a00ff','#ffd700'],m:'#ffd700'}
];
var ITEM_COLORS=NPCS.map(function(_,i){return GRADES[i%GRADES.length].m;});
function gradeOf(i){return GRADES[i%GRADES.length];}
var TREADS=[
  {name:'일반',   gain:1,     price:100,         color:'#78909c'},
  {name:'희귀',   gain:3,     price:500,         color:'#43a047'},
  {name:'레어',   gain:8,     price:2500,        color:'#1e88e5'},
  {name:'에픽',   gain:20,    price:12000,       color:'#8e24aa'},
  {name:'전설',   gain:50,    price:60000,       color:'#fb8c00'},
  {name:'신화',   gain:130,   price:300000,      color:'#e53935'},
  {name:'코스믹', gain:340,   price:1500000,     color:'#5c6bc0'},
  {name:'시크릿', gain:900,   price:8000000,     color:'#37474f'},
  {name:'영원한', gain:2300,  price:40000000,    color:'#26c6da'},
  {name:'신성',   gain:6000,  price:200000000,   color:'#ffd54a'},
  {name:'타이탄', gain:15000, price:1000000000,  color:'#ff1744'}
];
var SPEED_MIN=8, SPEED_MAX=30000;
var PRICE_GROWTH=1.3;
var RESPAWN=15, STUN=2, CHARGE=0.9;
var SAVE_KEY='balondor-steal-v2';

/* =========================================================
   유틸
   ========================================================= */
var fxLevel=1,fxMul=1;
var isTouch=('ontouchstart' in window)||(navigator.maxTouchPoints>0);
if(isTouch)document.body.classList.add('touch');
/* 📱 휴대폰은 항상 가로 화면: 세로로 들고 있으면 화면 전체를 90° 돌려서 보여줘요 */
var isPhone=isTouch&&Math.min(screen.width||9999,screen.height||9999)<=600,ROT=false;
function VW(){return ROT?innerHeight:innerWidth;}
function VH(){return ROT?innerWidth:innerHeight;}
function ptX(e){return ROT?e.clientY:e.clientX;}
function ptY(e){return ROT?innerWidth-e.clientX:e.clientY;}
function $(id){return document.getElementById(id);}
function rand(a,b){return a+Math.random()*(b-a);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function realSpeed(v){return 5+6.5*Math.log10(Math.max(1,v));}
function lerpAngle(a,b,t){var d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*t;}
function fmt(n){
  n=Math.floor(n);
  if(n<10000)return n.toLocaleString('en-US');
  var u=[['T',1e12],['B',1e9],['M',1e6],['K',1e3]];
  for(var i=0;i<u.length;i++){
    if(n>=u[i][1]){var x=n/u[i][1];return (x>=100?x.toFixed(0):x>=10?x.toFixed(1):x.toFixed(2))+u[i][0];}
  }
  return String(n);
}
var N=NPCS.length;
NPCS.forEach(function(n,i){
  n.speed=Math.round(SPEED_MIN*Math.pow(SPEED_MAX/SPEED_MIN,i/(N-1)));
  n.income=Math.round(2*Math.pow(10000,i/(N-1)));
  n.z=90+i*60;
  n.side=(i%2)?1:-1;
  n.x=n.side*19;
  n.move=realSpeed(n.speed);
});

/* =========================================================
   저장 / 불러오기
   ========================================================= */
var OFFLINE=0;var G={owned:[0,0,0],skin:-1,streak:0,money:0,speed:10,qty:TREADS.map(function(){return 0;}),counts:NPCS.map(function(){return 0;})};
var noSave=false,modalOpen=false;
function save(){
  if(noSave)return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify({t:Date.now(),money:G.money,speed:G.speed,qty:G.qty,counts:G.counts,owned:G.owned,skin:G.skin}));}catch(e){}
}
function load(){
  try{
    var s=localStorage.getItem(SAVE_KEY);
    if(!s)return false;
    var d=JSON.parse(s);
    if(typeof d.money==='number'&&isFinite(d.money))G.money=d.money;
    if(typeof d.speed==='number'&&isFinite(d.speed))G.speed=Math.max(10,d.speed);
    if(Array.isArray(d.qty))G.qty=TREADS.map(function(_,i){return Math.max(0,d.qty[i]|0);});
    if(Array.isArray(d.owned))G.owned=[0,1,2].map(function(i){return d.owned[i]?1:0;});
    if(typeof d.skin==='number'&&d.skin>=-1&&d.skin<3&&(d.skin<0||G.owned[d.skin]))G.skin=d.skin;
    if(Array.isArray(d.counts))G.counts=NPCS.map(function(_,i){return Math.max(0,d.counts[i]|0);});
    if(typeof d.t==='number'){var offS=clamp((Date.now()-d.t)/1000,0,28800);OFFLINE=Math.floor(income()*offS*0.25);G.money+=OFFLINE;}
    return true;
  }catch(e){return false;}
}
var hadSave=load();
if(hadSave){$('saveInfo').textContent=(OFFLINE>0?'🌙 오프라인 수입 +'+fmt(OFFLINE)+' · ':'')+'💾 저장된 진행: 돈 '+fmt(G.money)+' · 속도 '+fmt(G.speed)+' · 수집 '+G.counts.filter(function(c){return c>0;}).length+'/'+N;}
$('resetBtn').addEventListener('click',function(){
  noSave=true;
  try{localStorage.removeItem(SAVE_KEY);}catch(e){}
  location.reload();
});

/* ---------- 백업 슬롯 (최대 3개) ---------- */
var BK_N=3,bkArmed={};
function bkKey(i){return SAVE_KEY+'-bk'+(i+1);}
function bkRead(i){try{var s=localStorage.getItem(bkKey(i));return s?JSON.parse(s):null;}catch(e){return null;}}
function bkMsg(t,bad){var e=$('bkMsg');e.textContent=t;e.style.color=bad?'#ff8a80':'#b9f6ca';}
function bkSnap(){return {at:Date.now(),money:G.money,speed:G.speed,qty:G.qty.slice(),counts:G.counts.slice(),owned:G.owned.slice(),skin:G.skin};}
function bkInfo(d){
  var n=0;if(Array.isArray(d.counts))for(var i=0;i<d.counts.length;i++)if(d.counts[i]>0)n++;
  var dt=new Date(d.at||0),ts=dt.toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  return '돈 '+fmt(d.money||0)+' · 속도 '+fmt(d.speed||10)+' · 수집 '+n+'/'+N+' · '+ts;
}
function bkRender(){
  var h='';
  for(var i=0;i<BK_N;i++){
    var d=bkRead(i),a=function(k){return bkArmed[k]&&bkArmed[k]>Date.now();};
    h+='<div class="bkSlot"><div class="bkInfo"><b>슬롯 '+(i+1)+'</b><small'+(d?'':' class="empty"')+'>'+(d?bkInfo(d):'비어 있음')+'</small></div><div class="bkBtns">'
      +'<button data-a="save" data-i="'+i+'"'+(a('save'+i)?' class="arm"':'')+'>'+(a('save'+i)?'덮어쓸까요?':'💾 저장')+'</button>'
      +'<button data-a="load" data-i="'+i+'"'+(d?'':' disabled')+(a('load'+i)?' class="arm"':'')+'>'+(a('load'+i)?'정말?':'📂 불러오기')+'</button>'
      +'<button data-a="del" data-i="'+i+'"'+(d?'':' disabled')+(a('del'+i)?' class="arm"':'')+'>'+(a('del'+i)?'정말?':'🗑')+'</button>'
      +'</div></div>';
  }
  $('bkList').innerHTML=h;
}
function bkArm(k,msg){
  if(bkArmed[k]&&bkArmed[k]>Date.now()){bkArmed[k]=0;return true;}
  bkArmed[k]=Date.now()+3000;bkMsg(msg,true);bkRender();
  setTimeout(function(){if(modalOpen)bkRender();},3100);
  return false;
}
function bkOpen(){
  modalOpen=true;keys={};joy.x=joy.y=0;bkArmed={};
  $('bkModal').style.display='flex';bkMsg('');bkRender();
}
function bkClose(){modalOpen=false;$('bkModal').style.display='none';}
$('bkBtn').addEventListener('click',function(){this.blur();bkOpen();});
$('bkOpen2').addEventListener('click',bkOpen);
$('bkClose').addEventListener('click',bkClose);
$('bkModal').addEventListener('click',function(e){if(e.target===this)bkClose();});
$('bkList').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b||b.disabled)return;
  var a=b.getAttribute('data-a'),i=+b.getAttribute('data-i'),d=bkRead(i);
  if(a==='save'){
    if(d&&!bkArm('save'+i,'슬롯 '+(i+1)+'의 기존 백업을 덮어써요. 한 번 더 누르면 저장!'))return;
    try{localStorage.setItem(bkKey(i),JSON.stringify(bkSnap()));save();bkMsg('✅ 슬롯 '+(i+1)+'에 저장했어요!');}
    catch(err){bkMsg('저장에 실패했어요 (브라우저 저장 공간을 확인하세요)',true);}
    bkRender();
  }else if(a==='load'&&d){
    if(!bkArm('load'+i,'⚠️ 현재 진행이 이 백업으로 바뀌어요. 한 번 더 누르면 불러오기!'))return;
    try{
      noSave=true;
      localStorage.setItem(SAVE_KEY,JSON.stringify({t:Date.now(),money:d.money,speed:d.speed,qty:d.qty,counts:d.counts,owned:d.owned,skin:d.skin}));
      bkMsg('📂 불러오는 중...');location.reload();
    }catch(err){noSave=false;bkMsg('불러오기에 실패했어요',true);}
  }else if(a==='del'&&d){
    if(!bkArm('del'+i,'슬롯 '+(i+1)+' 백업을 삭제해요. 한 번 더 누르면 삭제!'))return;
    try{localStorage.removeItem(bkKey(i));bkMsg('🗑 슬롯 '+(i+1)+'을 삭제했어요');}catch(err){}
    bkRender();
  }
});
function income(){var s=0;for(var i=0;i<N;i++)s+=G.counts[i]*NPCS[i].income;return s;}

/* =========================================================
   👥 멀티플레이 (PeerJS · 방 코드)
   - 방장이 월드(받침대·NPC·던전·보스)를 계산해서 친구들에게 보내요
   - 친구들은 자기 캐릭터 위치를 방장에게 보내고, 화면을 그대로 그려요
   - 돈·속도·러닝머신·수집품은 각자 자기 브라우저에 저장돼요
   ========================================================= */
var NET={mode:'solo',via:'',ws:null,peer:null,conns:{},host:null,my:'me',code:'',name:'',tick:0,joinTO:0};
var REM={};
var PEER_PREFIX='steal-a-roh-v1-',MAX_PLAYERS=8,NET_HZ=15;
/* 친구가 다른 통신사/회사 와이파이라서 연결이 안 되면 TURN 서버를 여기에 추가하세요 (README 참고) */
var ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
function isClient(){return NET.mode==='client';}
function hostSide(){return NET.mode!=='client';}
function r1(v){return Math.round(v*10)/10;}
function r2(v){return Math.round(v*100)/100;}
function r3(v){return Math.round(v*1000)/1000;}
function sendHost(m){if(NET.host&&NET.host.open){try{NET.host.send(m);}catch(e){}}}
function bcast(m){if(NET.mode!=='host')return;if(NET.via==='ws'){if(NET.ws&&Object.keys(NET.conns).length)wsSend(NET.ws,{op:'bc',m:m});return;}for(var id in NET.conns){var c=NET.conns[id];if(c.open){try{c.send(m);}catch(e){}}}}
function sendTo(id,m){var c=NET.conns[id];if(c&&c.open){try{c.send(m);}catch(e){}}}
/* 아무 플레이어에게 보내기 (친구 → 방장이 대신 전달) */
function sendPeer(to,m){
  if(!to)return;
  if(NET.mode==='host'){m.from=NET.my;sendTo(to,m);}
  else if(NET.mode==='client'){m.to=to;sendHost(m);}
}
/* NPC가 쫓는 '운반 중' 판정: 친구 기지에서 훔친 건 NPC와 상관없음 */
function npcCarry(){return P.raid?-1:P.carry;}
function peerCount(){var n=1;for(var id in REM)n++;return n;}
function tgtObj(id){if(!id)return null;if(id===NET.my)return P;var r=REM[id];return r&&r.init?r:null;}
function tgtCarry(id){if(id===NET.my)return npcCarry();var r=REM[id];return r?r.carry:-1;}
function genCode(){var a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',s='';for(var i=0;i<5;i++)s+=a[(Math.random()*a.length)|0];return s;}
function errText(e){
  var t=e&&e.type;
  if(t==='peer-unavailable')return '방을 찾지 못했어요. 코드를 다시 확인하세요';
  if(t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed')return '연결 서버에 접속하지 못했어요 (인터넷 확인)';
  if(t==='browser-incompatible')return '이 브라우저는 지원하지 않아요 (크롬/사파리 최신 버전 사용)';
  return '연결 오류 ('+(t||e)+')';
}
function newPeer(id){return id?new Peer(id,{debug:0,config:{iceServers:ICE}}):new Peer({debug:0,config:{iceServers:ICE}});}

/* ---------- 방 만들기 (방장) ---------- */
function netHost(cb,tries){
  if(!window.Peer){cb('멀티플레이 모듈(PeerJS)을 불러오지 못했어요. 인터넷 연결을 확인하세요');return;}
  tries=tries||0;
  var code=genCode(),peer=newPeer(PEER_PREFIX+code),opened=false;
  peer.on('open',function(id){opened=true;NET.mode='host';NET.via='peer';NET.peer=peer;NET.my=id;NET.code=code;cb(null,code);});
  peer.on('connection',hostAttach);
  var to=setTimeout(function(){if(!opened){opened=true;try{peer.destroy();}catch(_){}cb('연결 서버(PeerJS)에 접속하지 못했어요. 학교·회사 인터넷에서 막혔을 수 있어요');}},9000);
  peer.on('open',function(){clearTimeout(to);});
  peer.on('error',function(e){
    if(!opened){
      opened=true;clearTimeout(to);
      try{peer.destroy();}catch(_){}
      if(e.type==='unavailable-id'&&tries<4){netHost(cb,tries+1);return;}
      cb(errText(e));
    }
  });
  peer.on('disconnected',function(){if(NET.mode==='host'){try{peer.reconnect();}catch(_){}}});
}
/* 방장: 새로 온 친구에게 기지 칸 정해주기 (빈 칸 먼저 · 다 차면 사람이 제일 적은 칸) */
function pickSlot(){
  var cnt=SLOT_X.map(function(){return 0;});cnt[mySlot]++;
  for(var id in REM){var s=REM[id].slot;if(s>=0&&s<SLOT_N)cnt[s]++;}
  var best=-1;SLOT_ORDER.forEach(function(s){if(best<0||cnt[s]<cnt[best])best=s;});
  return best;
}
/* 방장: 친구 연결 하나를 등록 (PeerJS든 코드 연결이든 같은 방식) */
function hostAttach(c){
  c.on('open',function(){
    if(peerCount()>=MAX_PLAYERS){try{c.send({t:'full'});}catch(e){}setTimeout(function(){try{c.close();}catch(e){}},400);return;}
    NET.conns[c.peer]=c;var r=getRem(c.peer);r.slot=pickSlot();
    c.send({t:'hello',id:c.peer,host:NET.my,slot:r.slot});
    /* 새 친구에게 지금 있는 사람들의 기지(수집 현황)를 바로 보내줘요 */
    c.send({t:'bs',id:NET.my,c:G.counts.slice(),q:G.qty.slice()});
    for(var oid in REM)if(oid!==c.peer&&REM[oid].bc)c.send({t:'bs',id:oid,c:REM[oid].bc,q:REM[oid].bq||[]});
  });
  c.on('data',function(m){if(m&&typeof m==='object')onHostMsg(c.peer,m);});
  c.on('close',function(){dropPeer(c.peer);});
  c.on('error',function(){dropPeer(c.peer);});
}
/* ---------- 방 참가 (친구) ---------- */
function netJoin(code,cb){
  if(!window.Peer){cb('멀티플레이 모듈(PeerJS)을 불러오지 못했어요. 인터넷 연결을 확인하세요');return;}
  code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(code.length!==5){cb('방 코드 5자리를 입력하세요');return;}
  var peer=newPeer(),done=false;
  function fail(msg){if(done)return;done=true;clearTimeout(NET.joinTO);try{peer.destroy();}catch(_){}cb(msg);}
  NET.joinTO=setTimeout(function(){fail('방에 연결하지 못했어요. 코드 확인 · 방장이 게임 중인지 확인하세요');},15000);
  peer.on('open',function(id){
    var c=peer.connect(PEER_PREFIX+code,{reliable:true,serialization:'json'});
    c.on('data',function(m){
      if(!m||typeof m!=='object')return;
      if(m.t==='hello'&&!done){
        done=true;clearTimeout(NET.joinTO);
        NET.mode='client';NET.via='peer';NET.peer=peer;NET.host=c;NET.my=id;NET.code=code;NET.hostId=m.host;NET.slot0=m.slot;
        cb(null,code);return;
      }
      if(m.t==='full'){fail('방이 꽉 찼어요 (최대 '+MAX_PLAYERS+'명)');return;}
      if(NET.mode==='client')onClientMsg(m);
    });
    c.on('close',function(){if(NET.mode==='client'&&NET.host===c)hostLost();});
    c.on('error',function(){if(NET.mode==='client'&&NET.host===c)hostLost();});
  });
  peer.on('error',function(e){if(!done)fail(errText(e));else if(NET.mode==='client'&&e.type!=='peer-unavailable'){}});
}
function leaveRoom(){
  var p=NET.peer;
  if(NET.mode==='client'){try{NET.host.close();}catch(_){}hostLost(true);}
  else if(NET.mode==='host'){
    for(var id in NET.conns){try{NET.conns[id].close();}catch(_){}}
    NET.conns={};for(var rid in REM)dropPeer(rid);
    if(NET.ws){var w=NET.ws;NET.ws=null;try{w.close();}catch(_){}}
    NET.mode='solo';NET.via='';NET.code='';netUI();toast('📴 방을 닫았어요 · 혼자 모드','warn');
  }
  if(p){try{p.destroy();}catch(_){}}NET.peer=null;
}
/* =========================================================
   🛰️ 중계 서버 연결 (server.js) — 학교처럼 직접 연결이 막힌 곳용
   모두가 서버 하나에 https(wss)로 접속하고, 서버가 방장 ↔ 친구 메시지를 전달해요.
   게임을 server.js로 열었다면 자동으로 이 방식을 써요.
   ========================================================= */
var SERVER_URL=''; /* 게임은 다른 곳(Netlify 등)에, 서버는 따로 올렸다면 여기에: 'wss://내서버.onrender.com/ws' */
function wsURL(){
  var q=/[?&]server=([^&]+)/.exec(location.search);if(q)return decodeURIComponent(q[1]);
  if(SERVER_URL)return SERVER_URL;
  if(location.protocol==='http:'||location.protocol==='https:')return (location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';
  return null;
}
function SConn(id){this.peer=id;this.open=false;this._h={};}
SConn.prototype.on=function(e,f){(this._h[e]=this._h[e]||[]).push(f);return this;};
SConn.prototype.emit=function(e,a){(this._h[e]||[]).forEach(function(f){try{f(a);}catch(err){console.error(err);}});};
function wsSend(ws,o){if(ws&&ws.readyState===1){try{ws.send(JSON.stringify(o));}catch(e){}}}
function wsOpen(url,cb){
  var ws;try{ws=new WebSocket(url);}catch(e){cb('bad');return;}
  var done=false,to=setTimeout(function(){if(done)return;done=true;try{ws.close();}catch(e){}cb('timeout');},30000);
  ws.onopen=function(){if(done)return;done=true;clearTimeout(to);cb(null,ws);};
  ws.onerror=function(){if(done)return;done=true;clearTimeout(to);cb('error');};
}
function wsParse(ev){try{return JSON.parse(ev.data);}catch(e){return null;}}
function wsHost(cb){
  var url=wsURL();if(!url){cb('noserver');return;}
  wsOpen(url,function(err,ws){
    if(err){cb(err);return;}
    var ok=false,conns={};
    ws.onmessage=function(ev){
      var m=wsParse(ev),c;if(!m)return;
      if(m.op==='hosted'&&!ok){ok=true;NET.mode='host';NET.via='ws';NET.ws=ws;NET.peer=null;NET.my=m.id;NET.code=m.code;cb(null,m.code);}
      else if(m.op==='err'&&!ok){ok=true;try{ws.close();}catch(e){}cb(m.msg);}
      else if(m.op==='peer'){
        c=new SConn(m.id);
        c.send=function(x){wsSend(ws,{op:'to',id:this.peer,m:x});};
        c.close=function(){wsSend(ws,{op:'kick',id:this.peer});};
        conns[m.id]=c;hostAttach(c);c.open=true;c.emit('open');
      }
      else if(m.op==='m'){c=conns[m.from];if(c&&m.m&&typeof m.m==='object')c.emit('data',m.m);}
      else if(m.op==='left'){c=conns[m.id];if(c){delete conns[m.id];c.open=false;c.emit('close');}}
    };
    ws.onclose=function(){
      if(!ok){ok=true;cb('closed');return;}
      if(NET.ws!==ws)return;
      NET.ws=null;
      for(var id in conns){conns[id].open=false;conns[id].emit('close');}
      if(NET.mode==='host'){NET.mode='solo';NET.via='';NET.code='';toast('📴 서버 연결이 끊겼어요 · 혼자 모드로 계속해요','warn');netUI();}
    };
    wsSend(ws,{op:'host'});
  });
}
function wsJoin(code,cb){
  var url=wsURL();if(!url){cb('noserver');return;}
  wsOpen(url,function(err,ws){
    if(err){cb(err);return;}
    var ok=false,conn=new SConn('host');
    conn.send=function(x){wsSend(ws,{op:'up',m:x});};
    conn.close=function(){try{ws.close();}catch(e){}};
    ws.onmessage=function(ev){
      var m=wsParse(ev);if(!m)return;
      if(m.op==='err'&&!ok){ok=true;try{ws.close();}catch(e){}cb(m.msg,true);return;}
      if(m.op!=='m'||!m.m||typeof m.m!=='object')return;
      var d=m.m;
      if(d.t==='hello'&&!ok){
        ok=true;conn.open=true;
        NET.mode='client';NET.via='ws';NET.ws=ws;NET.peer=null;NET.host=conn;NET.my=d.id;NET.code=code;NET.hostId=d.host;NET.slot0=d.slot;
        cb(null,code);return;
      }
      if(d.t==='full'&&!ok){ok=true;try{ws.close();}catch(e){}cb('방이 꽉 찼어요 (최대 '+MAX_PLAYERS+'명)',true);return;}
      if(NET.mode==='client'&&NET.host===conn)onClientMsg(d);
    };
    ws.onclose=function(){
      conn.open=false;
      if(!ok){ok=true;cb('closed');return;}
      if(NET.mode==='client'&&NET.host===conn)hostLost();
    };
    wsSend(ws,{op:'join',code:code});
  });
}
/* 서버 먼저 → 안 되면 PeerJS */
function netHostAny(cb,status){
  if(!wsURL()){netHost(cb);return;}
  status('📡 서버에 연결하는 중... (무료 서버는 깨어나는 데 30초쯤 걸릴 수 있어요)');
  wsHost(function(err,code){
    if(!err){cb(null,code);return;}
    status('📡 서버 연결 실패 → 다른 방법(PeerJS)으로 시도 중...');
    netHost(cb);
  });
}
function netJoinAny(code,cb,status){
  code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(code.length!==5){cb('방 코드 5자리를 입력하세요');return;}
  if(!wsURL()){netJoin(code,cb);return;}
  status('📡 서버에 연결하는 중... (무료 서버는 깨어나는 데 30초쯤 걸릴 수 있어요)');
  wsJoin(code,function(err,code2,definite){
    if(!err){cb(null,code2);return;}
    if(definite){cb(err);return;}
    var wsMsg=typeof err==='string'&&err.length>12?err:null;
    status('📡 다른 방법(PeerJS)으로도 찾아보는 중...');
    netJoin(code,function(err2,c3){
      if(!err2){cb(null,c3);return;}
      cb(wsMsg||err2);
    });
  });
}
/* 무료 서버는 잠들어 있을 수 있어서, 시작 화면이 뜨면 미리 깨워둬요 */
(function(){
  var u=wsURL();if(!u||!window.fetch)return;
  try{fetch(u.replace(/^ws/,'http').replace(/\/ws(\?.*)?$/,'/health'),{cache:'no-store'}).catch(function(){});}catch(e){}
})();
/* 방장 연결 끊김 → 혼자 모드로 이어서 */
function hostLost(byMe){
  if(NET.mode!=='client')return;
  NET.mode='solo';NET.via='';NET.host=null;NET.code='';
  if(NET.ws){var w=NET.ws;NET.ws=null;try{w.close();}catch(_){}}
  for(var id in REM)removeRem(id);
  npcs.forEach(function(n){
    n.nx=undefined;
    if(n.tg!==NET.my&&n.state!=='sleep'){n.state='return';n.tg=null;}
    if(n.tg===NET.my&&npcCarry()!==n.i){n.state='return';n.tg=null;}
    if(npcCarry()===n.i)n.carrier=NET.my;else n.carrier=null;
  });
  /* 친구 기지에서 훔치던 중이면 주인에게 돌아가요 */
  if(P.raid){P.carry=-1;P.raid=null;holdTrophies.forEach(function(t){t.visible=false;});}
  if(DG.on)exitDungeon(false);
  dgWorldReset();DG.act=false;
  setMySlot(SLOT_ORDER[0]);refreshBases(true);
  toast(byMe?'📴 방에서 나왔어요 · 혼자 모드':'📴 방장과 연결이 끊겼어요 · 혼자 모드로 계속해요','warn');
  netUI();
}
/* 방장: 친구가 나감 */
function dropPeer(id){
  if(!REM[id]&&!NET.conns[id])return;
  var r=REM[id],nm=r?r.name:'친구';
  delete NET.conns[id];
  npcs.forEach(function(n){
    if(n.carrier===id){n.carrier=null;if(!n.ped.has){n.ped.has=true;n.ped.pop=0;}}
    if(n.tg===id){n.state='return';n.tg=null;hideAim(n);}
  });
  if(r&&r.announced)toast('👋 '+nm+' 님이 나갔어요','warn');
  removeRem(id);dgWorldCheckEnd();netUI();
}

/* ---------- 메시지 처리 ---------- */
function onHostMsg(id,m){
  var r=REM[id];if(!r)return;
  switch(m.t){
    case 'st':applyState(r,m,true);break;
    case 'steal':hostSteal(id,m.i|0,function(ok,msg){sendTo(id,{t:'stealR',i:m.i|0,ok:ok,msg:msg||''});});break;
    case 'drop':hostDrop(id,m.i|0);break;
    case 'dep':hostDep(id,m.i|0);break;
    case 'atk':if(r.dg&&DG.act)dgHitAt(+m.x||0,+m.z||0,clamp(+m.d||0,0,1e7));break;
    case 'bs':r.bc=nArr(m.c,N);r.bq=nArr(m.q,TREADS.length);bcast({t:'bs',id:id,c:r.bc,q:r.bq});break;
    case 'raid':case 'raidR':case 'raidBack':case 'raidDone':
      m.from=id;
      if(m.to===NET.my)onRaidMsg(m);else if(REM[m.to]&&NET.conns[m.to])sendTo(m.to,m);
      break;
  }
}
function onClientMsg(m){
  var n;
  switch(m.t){
    case 'snap':applySnap(m);break;
    case 'stealR':
      stealPend=0;
      if(m.ok)grantSteal(m.i);else{toast(m.msg||'훔치기 실패','warn');sfx.deny();}
      break;
    case 'cast':
      n=npcs[m.i];if(!n)break;
      n.ch.root.position.x=m.rx;n.ch.root.position.z=m.rz;n.tg=m.tg;
      runCast(n,m.a,{x:m.qx,z:m.qz},tgtObj(m.tg)||P);break;
    case 'pr':addDgProj(m.x,m.y,m.z,m.vx,m.vz,m.d,m.c,m.s,m.l,m.b);break;
    case 'rip':applyRip(m.l||[],m.w);break;
    case 'tiles':applyTiles(m.s||[]);break;
    case 'mobK':
      for(var i=0;i<DG.mobs.length;i++)if(DG.mobs[i].id===m.id){scene.remove(DG.mobs[i].g);DG.mobs.splice(i,1);break;}
      mobDeadFx(m.x,m.z,m.c);break;
    case 'bossK':
      if(DG.boss){scene.remove(DG.boss.g);DG.boss=null;}
      bossDeadFx(m.x,m.z);break;
    case 'dgt':if(DG.on)toast(m.m,m.c);break;
    case 'bs':
      if(!m.id||m.id===NET.my)break;
      n=getRem(m.id);n.bc=nArr(m.c,N);n.bq=nArr(m.q,TREADS.length);break;
    case 'raid':case 'raidR':case 'raidBack':case 'raidDone':onRaidMsg(m);break;
  }
}
/* 플레이어 위치 정보 반영 (부드럽게 따라가기) */
function applyState(r,m,fromHostView){
  var now=performance.now();
  if(r.lt){var d=(now-r.lt)/1000;if(d>0.02){r.vx+=((m.x-r.lx)/d-r.vx)*0.5;r.vz+=((m.z-r.lz)/d-r.vz)*0.5;}}
  r.lx=m.x;r.lz=m.z;r.lt=now;
  r.tx=+m.x||0;r.ty=+m.y||0;r.tz=+m.z||0;r.f=+m.f||0;r.vc=m.c|0;r.stun=m.s?1:0;r.skin=(m.k|0);r.mv=m.m?1:0;
  if(r.skin<-1||r.skin>2)r.skin=-1;
  if(m.n!==undefined)r.name=String(m.n||'친구').slice(0,10);
  if(!r.init){r.x=r.tx;r.y=r.ty;r.z=r.tz;r.init=1;}
  if(!r.announced&&r.name){r.announced=1;toast('👋 '+r.name+' 님이 들어왔어요!','good');netUI();}
  var d2=m.d?1:0;
  if(fromHostView&&d2!==r.dg){
    r.dg=d2;
    if(d2){dgWorldJoin();sendTo(r.id,{t:'tiles',s:tileState()});}
    else dgWorldCheckEnd();
  }else r.dg=d2;
}
var ST_CODE={sleep:0,chase:1,charge:2,'return':3},ST_NAME=['sleep','chase','charge','return'];
function netSendState(){
  if(NET.mode!=='client')return;
  sendHost({t:'st',x:r2(P.x),y:r2(P.y),z:r2(P.z),f:r2(P.face),c:P.carry,s:P.stun>0?1:0,k:G.skin,d:DG.on?1:0,m:P.mv?1:0,n:NET.name});
}
function buildSnap(){
  var pl=[[NET.my,NET.name,r2(P.x),r2(P.y),r2(P.z),r2(P.face),P.carry,P.stun>0?1:0,G.skin,DG.on?1:0,P.mv?1:0,mySlot]];
  for(var id in REM){var r=REM[id];if(r.init)pl.push([id,r.name,r2(r.tx),r2(r.ty),r2(r.tz),r.f,r.vc,r.stun,r.skin,r.dg,r.mv,r.slot]);}
  var np=npcs.map(function(n){var p=n.ch.root.position;return [r1(p.x),r1(p.z),ST_CODE[n.state],n.tg||0,n.ped.has?1:0];});
  var dg=0;
  if(DG.act){
    dg={w:DG.wave,m:DG.mobs.map(function(o){return [o.id,o.t,r1(o.g.position.x),r1(o.g.position.z),o.hp,o.max];}),b:0};
    var b=DG.boss;if(b)dg.b=[r1(b.g.position.x),r1(b.g.position.z),Math.round(b.hp),b.max,b.rage,b.dash>0?1:0,b.wind>0?1:0,b.flash>0?1:0];
  }
  return {t:'snap',pl:pl,np:np,dg:dg};
}
function applySnap(m){
  var seen={};
  (m.pl||[]).forEach(function(a){
    var id=a[0];
    if(id===NET.my){if(typeof a[11]==='number'&&a[11]!==mySlot)setMySlot(a[11]);return;}
    seen[id]=1;
    var r=getRem(id);r.slot=typeof a[11]==='number'?a[11]:-1;
    applyState(r,{x:a[2],y:a[3],z:a[4],f:a[5],c:a[6],s:a[7],k:a[8],d:a[9],m:a[10],n:a[1]},false);
  });
  for(var rid in REM)if(!seen[rid]){if(REM[rid].announced)toast('👋 '+REM[rid].name+' 님이 나갔어요','warn');removeRem(rid);netUI();}
  (m.np||[]).forEach(function(a,i){
    var n=npcs[i];if(!n)return;
    n.nx=a[0];n.nz=a[1];n.state=ST_NAME[a[2]]||'sleep';n.tg=a[3]||null;
    var has=!!a[4];
    if(has&&!n.ped.has){n.ped.pop=0;burst(n.ped.x,3,n.ped.z,ITEM_COLORS[i],10,5);}
    n.ped.has=has;
  });
  var dg=m.dg;
  if(dg){
    DG.act=true;DG.wave=dg.w;
    var ids={};
    dg.m.forEach(function(a){
      ids[a[0]]=1;var o=null;
      for(var i=0;i<DG.mobs.length;i++)if(DG.mobs[i].id===a[0]){o=DG.mobs[i];break;}
      if(!o){o=mkMob(a[1],a[2],a[3],a[0]);burst(a[2],2,a[3],'#b36bff',8,5);}
      o.nx=a[2];o.nz=a[3];o.hp=a[4];o.max=a[5];
    });
    for(var j=DG.mobs.length-1;j>=0;j--)if(!ids[DG.mobs[j].id]){scene.remove(DG.mobs[j].g);DG.mobs.splice(j,1);}
    if(dg.b){
      var b=DG.boss;
      if(!b){b=DG.boss=makeBossVis(dg.b[0],dg.b[1]);fxBoom(dg.b[0],dg.b[1],16,'#b36bff',0.8);if(DG.on){shk=3;flashA=0.5;}}
      b.nx=dg.b[0];b.nz=dg.b[1];b.hp=dg.b[2];b.max=dg.b[3];b.rage=dg.b[4];b.dash=dg.b[5]?0.1:0;b.wind=dg.b[6]?0.1:0;if(dg.b[7])b.flash=0.1;
    }else if(DG.boss){scene.remove(DG.boss.g);DG.boss=null;}
  }else if(DG.act){dgWorldReset();DG.act=false;}
}
/* 내 기지(수집 현황·러닝머신) 정보를 친구들에게: 바뀌면 바로, 아니어도 4초마다 */
var bsT=0,bsKey='';
function netBaseTick(dt){
  bsT+=dt;
  var k=G.counts.join(',')+'|'+G.qty.join(',');
  if(k===bsKey&&bsT<4)return;
  bsKey=k;bsT=0;
  var m={t:'bs',c:G.counts.slice(),q:G.qty.slice()};
  if(NET.mode==='client')sendHost(m);
  else if(Object.keys(NET.conns).length){m.id=NET.my;bcast(m);}
}
function netTick(dt){
  if(NET.mode==='solo')return;
  netBaseTick(dt);
  NET.tick+=dt;
  if(NET.tick<1/NET_HZ)return;
  NET.tick=0;
  if(NET.mode==='client')netSendState();
  else if(Object.keys(NET.conns).length)bcast(buildSnap());
}

/* ---------- 친구 캐릭터 그리기 ---------- */
function getRem(id){
  var r=REM[id];if(r)return r;
  r=REM[id]={id:id,name:'',x:0,y:0,z:8,tx:0,ty:0,tz:8,f:0,vx:0,vz:0,carry:-1,vc:-1,stun:0,skin:-1,curSkin:-9,dg:0,mv:0,ph:0,lie:0,init:0,sets:{},ch:null,tr:null,trI:-1,tag:null,tagName:null,slot:-1,bc:null,bq:null};
  return r;
}
function remSet(r,skin){
  if(r.sets[skin])return r.sets[skin];
  var ch;
  if(skin>=0&&window.__SKINIMG__){var o=Object.assign({},SKINS[skin].o);o.face=window.__SKINIMG__[skin];ch=makePlayerChar(o);}
  else ch=makePlayerChar();
  ch.root.visible=false;scene.add(ch.root);
  return r.sets[skin]=ch;
}
function dropTrophy(tr){if(tr.parent)tr.parent.remove(tr);fxList=fxList.filter(function(f){return f.g!==tr;});}
function removeRem(id){
  /* 내 트로피를 들고 있던 도둑이 나가면 → 트로피가 돌아와요 */
  if(RAIDS_OUT[id]!==undefined){var ri=RAIDS_OUT[id];delete RAIDS_OUT[id];raidRefund(ri,'🛡️ 도둑이 나가서 ['+gradeOf(ri).name+'] 큰 손이 돌아왔어요');}
  var r=REM[id];if(!r)return;
  for(var k in r.sets)scene.remove(r.sets[k].root);
  if(r.tr)dropTrophy(r.tr);
  if(r.tag)scene.remove(r.tag.sprite);
  delete REM[id];
}
function remTagKey(r){return r.name+(RAIDS_OUT[r.id]!==undefined?'!':'');}
function drawRemTag(r){
  var g=r.tag.g,nm=r.name||'친구',thief=RAIDS_OUT[r.id]!==undefined;
  g.clearRect(0,0,256,64);roundRect(g,4,4,248,56,16);g.fillStyle=thief?'rgba(190,20,30,.9)':'rgba(20,60,140,.78)';g.fill();
  g.lineWidth=3;g.strokeStyle=thief?'#ffd54a':'#7fd3ff';g.stroke();
  g.textAlign='center';g.textBaseline='middle';g.font='bold 30px '+FONT;g.fillStyle='#fff';g.fillText((thief?'🚨 도둑 ':'👤 ')+nm,128,33,236);
  r.tag.tex.needsUpdate=true;r.tagName=remTagKey(r);
}
function updateRemotes(dt,t){
  for(var id in REM){
    var r=REM[id];if(!r.init)continue;
    var k=Math.min(1,dt*12);
    if(Math.abs(r.tx-r.x)+Math.abs(r.tz-r.z)>60){r.x=r.tx;r.z=r.tz;}
    r.x+=(r.tx-r.x)*k;r.y+=(r.ty-r.y)*k;r.z+=(r.tz-r.z)*k;
    if(r.skin!==r.curSkin){
      if(r.ch)r.ch.root.visible=false;
      r.ch=remSet(r,r.skin);r.ch.root.visible=true;r.curSkin=r.skin;
      if(r.tr)r.ch.root.add(r.tr);
    }
    var ch=r.ch;
    ch.root.position.set(r.x,r.y,r.z);ch.root.rotation.y=lerpAngle(ch.root.rotation.y,r.f,Math.min(1,dt*14));
    r.lie+=((r.stun?1:0)-r.lie)*Math.min(1,dt*10);
    ch.body.rotation.x=-Math.PI/2*r.lie;ch.body.position.y=0.75*r.lie;
    if(r.stun)swing(ch,0,0);
    else if(r.y>0.05){ch.legL.rotation.x=-0.5;ch.legR.rotation.x=0.5;ch.armL.rotation.x=ch.armR.rotation.x=-2.4;}
    else{if(r.mv)r.ph+=dt*16;swing(ch,r.ph,r.mv?0.9:0);}
    if(r.vc!==r.trI){
      if(r.tr){dropTrophy(r.tr);r.tr=null;}
      if(r.vc>=0&&r.vc<N){r.tr=makeTrophy(ITEM_COLORS[r.vc],false,r.vc);r.tr.scale.set(1.2,1.2,1.2);ch.root.add(r.tr);if(!fxLevel)fxList.forEach(function(f){if(f.g===r.tr){if(f.ring)f.ring.visible=false;f.stars.forEach(function(x){x.visible=false;});if(f.halo)f.halo.visible=false;}});}
      r.trI=r.vc;
    }
    if(r.tr){
      if(!r.stun)ch.armL.rotation.x=ch.armR.rotation.x=-Math.PI*0.93;
      r.tr.position.y=6.7+Math.sin(t*6)*0.12+(r.stun?-4:0);r.tr.rotation.y+=dt*2;
    }
    if(!r.tag){r.tag=makeSprite(256,64,6.4,1.6);r.tag.sprite.renderOrder=5;scene.add(r.tag.sprite);}
    if(r.tagName!==remTagKey(r))drawRemTag(r);
    r.tag.sprite.position.set(r.x,r.y+8.6+(r.tr?3.6:0),r.z);
  }
}

/* ---------- 화면 (시작 화면 + 게임 중 표시) ---------- */
function netUI(){
  var b=$('netBox');if(!b)return;
  var bd=$('menuBadge');
  if(NET.mode==='solo'){b.style.display='none';if(bd)bd.textContent='';if(window.mpModalRender&&$('mpModal').style.display==='flex')mpModalRender();return;}
  b.style.display='block';
  var names=[(NET.name||'나')+' (나)'];for(var id in REM)if(REM[id].name)names.push(REM[id].name);
  if(bd)bd.textContent='👥'+names.length;
  if(window.mpModalRender&&$('mpModal').style.display==='flex')mpModalRender();
  $('netInfo').innerHTML='📡 방 코드 <b>'+NET.code+'</b> · '+(NET.mode==='host'?'👑 방장':'🙋 참가')+(NET.via==='ws'?' · 🛰️서버':' · 🔗직접')+' · 👥 '+names.length+'명<small>'+names.join(', ').replace(/</g,'&lt;')+'</small>';
}
function inviteLink(){return location.href.split('#')[0].split('?')[0]+'?room='+NET.code;}
(function(){
  var nm='';try{nm=localStorage.getItem('steal-a-roh-name')||'';}catch(e){}
  if(!nm)nm='플레이어'+((Math.random()*900+100)|0);
  $('mpName').value=nm;NET.name=nm;
  var q=/[?&]room=([A-Za-z0-9]{5})/.exec(location.search);
  if(q){$('mpCode').value=q[1].toUpperCase();$('mpMsg').textContent='👉 초대받은 방 코드가 입력됐어요. [참가]를 누르세요!';}
  function readName(){
    var v=$('mpName').value.trim().slice(0,10)||nm;NET.name=v;
    try{localStorage.setItem('steal-a-roh-name',v);}catch(e){}
  }
  function busy(on,msg,bad){
    $('mpHost').disabled=$('mpJoin').disabled=on;
    var e=$('mpMsg');e.textContent=msg||'';e.style.color=bad?'#ff8a80':'#b9f6ca';
  }
  function go(){netUI();mpModalClose();if(!started)$('startBtn').click();}
  /* 게임 중에 방을 바꿀 때: 던전에서는 먼저 나오기 */
  function prep(){if(started&&DG.on)exitDungeon(false);}
  $('mpHost').addEventListener('click',function(){
    if(NET.mode!=='solo')return;
    readName();prep();busy(true,'📡 방 만드는 중...');
    netHostAny(function(err,code){
      if(err){busy(false,err,true);return;}
      busy(false,'');go();
      toast('🏠 방을 만들었어요! 친구에게 방 코드 '+code+' 를 알려주세요','good');
    },function(t){busy(true,t);});
  });
  $('mpJoin').addEventListener('click',function(){
    if(NET.mode!=='solo')return;
    readName();prep();busy(true,'📡 방에 연결하는 중...');
    netJoinAny($('mpCode').value,function(err,code){
      if(err){busy(false,err,true);return;}
      busy(false,'');
      npcs.forEach(function(n){n.carrier=null;});
      if(P.carry>=0){P.carry=-1;P.raid=null;holdTrophies.forEach(function(t){t.visible=false;});}
      bsKey='';if(typeof NET.slot0==='number')setMySlot(NET.slot0);
      go();netSendState();
      toast('🙋 방 '+code+' 에 들어왔어요! 같이 훔쳐보자','good');
    },function(t){busy(true,t);});
  });
  $('mpCode').addEventListener('keydown',function(e){if(e.key==='Enter')$('mpJoin').click();e.stopPropagation();});
  $('mpName').addEventListener('keydown',function(e){e.stopPropagation();});
  $('netCopy').addEventListener('click',function(){
    this.blur();var link=inviteLink(),btn=this;
    function ok(){btn.textContent='✅ 복사됨!';setTimeout(function(){btn.textContent='🔗 초대 링크 복사';},1500);}
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(link).then(ok,function(){prompt('이 링크를 친구에게 보내세요',link);});
    else prompt('이 링크를 친구에게 보내세요',link);
  });
  $('netLeave').addEventListener('click',function(){this.blur();leaveRoom();mpModalRender();});
  /* 👥 멀티 버튼: 게임 중 언제든 방 만들기 / 참가 / 나가기 */
  var mpHome=$('mpBox').parentNode,mpNext=$('mpBox').nextSibling;
  window.mpModalRender=function(){
    var on=NET.mode!=='solo';
    $('mpRoom').style.display=on?'block':'none';
    $('mpBox').style.display=on?'none':'block';
    if(on){
      var names=[(NET.name||'나')+' (나)'];for(var id in REM)if(REM[id].name)names.push(REM[id].name);
      $('mpRoomInfo').innerHTML=(NET.mode==='host'?'👑 내가 만든 방':'🙋 참가 중인 방')+' · 방 코드 <b class="mpBig">'+NET.code+'</b>'
        +'<small>'+(NET.via==='ws'?'🛰️ 서버 연결':'🔗 직접 연결')+' · 👥 '+names.length+'명: '+names.join(', ').replace(/</g,'&lt;')+'</small>';
      $('mpRoomCopy').style.display=NET.code&&NET.code.length===5?'':'none';
    }
  };
  window.mpModalOpen=function(){
    modalOpen=true;keys={};joy.x=joy.y=0;
    $('mpSlot').appendChild($('mpBox'));
    var m=$('mpMsg');if(!/초대받은/.test(m.textContent))m.textContent='';
    $('mpHost').disabled=$('mpJoin').disabled=false;
    mpModalRender();$('mpModal').style.display='flex';
  };
  window.mpModalClose=function(){
    if($('mpModal').style.display!=='flex')return;
    $('mpModal').style.display='none';modalOpen=false;
    $('mpBox').style.display='';mpHome.insertBefore($('mpBox'),mpNext);
  };
  $('mpBtn').addEventListener('click',function(){this.blur();mpModalOpen();});
  $('mpClose').addEventListener('click',mpModalClose);
  $('mpModal').addEventListener('click',function(e){if(e.target===this)mpModalClose();});
  $('mpRoomCopy').addEventListener('click',function(){this.blur();$('netCopy').click();var b=this;b.textContent='✅ 복사됨!';setTimeout(function(){b.textContent='🔗 초대 링크 복사';},1500);});
  $('mpRoomLeave').addEventListener('click',function(){this.blur();leaveRoom();mpModalRender();});
})();

/* =========================================================
   Three.js 기본 세팅
   ========================================================= */
var renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isTouch?1.5:2));
renderer.setSize(VW(),VH());
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.insertBefore(renderer.domElement,document.body.firstChild);
var scene=new THREE.Scene();
scene.background=new THREE.Color(0x0a1330);
scene.fog=new THREE.Fog(0x0a1330,130,540);
var camera=new THREE.PerspectiveCamera(65,VW()/VH(),0.3,1500);

scene.add(new THREE.AmbientLight(0x8fa3d9,0.65));
scene.add(new THREE.HemisphereLight(0xcfe0ff,0x1d3a24,0.75));
var sun=new THREE.DirectionalLight(0xffffff,0.85);
sun.castShadow=true;
sun.shadow.mapSize.set(isTouch?1024:2048,isTouch?1024:2048);
sun.shadow.camera.left=-60;sun.shadow.camera.right=60;sun.shadow.camera.top=60;sun.shadow.camera.bottom=-60;
sun.shadow.camera.near=1;sun.shadow.camera.far=300;
sun.shadow.bias=-0.0006;
scene.add(sun);scene.add(sun.target);

function canvasTex(w,h,draw){
  var c=document.createElement('canvas');c.width=w;c.height=h;
  var g=c.getContext('2d');draw(g,w,h);
  var t=new THREE.CanvasTexture(c);t.anisotropy=4;return t;
}
function roundRect(g,x,y,w,h,r){
  g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();
}
function makeSprite(w,h,sw,sh){
  var c=document.createElement('canvas');c.width=w;c.height=h;
  var tex=new THREE.CanvasTexture(c);
  var mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});
  var s=new THREE.Sprite(mat);s.scale.set(sw,sh,1);
  return {sprite:s,c:c,g:c.getContext('2d'),tex:tex};
}
var FONT='"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';

/* =========================================================
   맵: 축구장
   ========================================================= */
var PITCH_W=60, Z0=-45, Z1=90+(NPCS.length-1)*60+80, LEN=Z1-Z0, BASE_Z1=36;
/* 기지 칸: 멀티플레이에서 한 사람당 한 칸씩 (최대 4칸, 가로로 나란히)
   - 가운데 대문(x -29~29)으로만 경기장에 나갈 수 있어요
   - 혼자일 때는 SLOT_ORDER의 첫 칸(2번 칸)을 써요 · 5명부터는 사람이 적은 칸을 같이 써요 */
var SLOT_N=4, SLOT_W=60, SLOT_X=[-90,-30,30,90], SLOT_ORDER=[1,2,0,3], BASE_XMAX=SLOT_W*SLOT_N/2, GATE_X=28.6;
var SLOT_COL=[0xff8f00,0x2a6bd8,0x2eb84a,0x9c4dff], SLOT_CSS=['#ffb74d','#64b5f6','#81c784','#ce93d8'];
var mySlot=SLOT_ORDER[0];
function slotX(s){return SLOT_X[s]||0;}
var CLEN=Z1-BASE_Z1, CMID=(BASE_Z1+Z1)/2, BLEN=BASE_Z1-Z0, BMID=(Z0+BASE_Z1)/2;

var stripeTex=canvasTex(8,256,function(g,w,h){
  g.fillStyle='#2b8a3c';g.fillRect(0,0,w,h/2);
  g.fillStyle='#37a049';g.fillRect(0,h/2,w,h/2);
});
stripeTex.wrapS=stripeTex.wrapT=THREE.RepeatWrapping;
stripeTex.repeat.set(1,LEN/30);
var pitch=new THREE.Mesh(new THREE.PlaneGeometry(PITCH_W,LEN),new THREE.MeshLambertMaterial({map:stripeTex}));
pitch.rotation.x=-Math.PI/2;pitch.position.set(0,0,(Z0+Z1)/2);pitch.receiveShadow=true;scene.add(pitch);

var outer=new THREE.Mesh(new THREE.PlaneGeometry(BASE_XMAX*2+240,LEN+300),new THREE.MeshLambertMaterial({color:0x16251d}));
outer.rotation.x=-Math.PI/2;outer.position.set(0,-0.06,(Z0+Z1)/2);scene.add(outer);

[-1,1].forEach(function(s){
  var track=new THREE.Mesh(new THREE.PlaneGeometry(3.6,CLEN),new THREE.MeshLambertMaterial({color:0x8d3a2a}));
  track.rotation.x=-Math.PI/2;track.position.set(s*32.3,0.01,CMID);scene.add(track);
  /* 넓어진 기지 바닥 (가운데는 축구장 잔디가 이미 깔려 있어요) */
  var bt=canvasTex(8,256,function(g,w,h){g.fillStyle='#2b8a3c';g.fillRect(0,0,w,h/2);g.fillStyle='#37a049';g.fillRect(0,h/2,w,h/2);});
  bt.wrapS=bt.wrapT=THREE.RepeatWrapping;bt.repeat.set(1,BLEN/30);
  var bw=BASE_XMAX-PITCH_W/2;
  var bf=new THREE.Mesh(new THREE.PlaneGeometry(bw,BLEN),new THREE.MeshLambertMaterial({map:bt}));
  bf.rotation.x=-Math.PI/2;bf.position.set(s*(PITCH_W/2+bw/2),0,BMID);bf.receiveShadow=true;scene.add(bf);
});

var lineMat=new THREE.MeshBasicMaterial({color:0xffffff});
function addLine(x,z,w,l){
  var m=new THREE.Mesh(new THREE.BoxGeometry(w,0.05,l),lineMat);m.position.set(x,0.03,z);scene.add(m);
}
addLine(-29.4,CMID,0.5,CLEN);addLine(29.4,CMID,0.5,CLEN);
addLine(0,Z1-1,59,0.5);
NPCS.forEach(function(n){
  addLine(0,n.z-33,58.4,0.4);
  var ring=new THREE.Mesh(new THREE.RingGeometry(8.6,9.1,48),lineMat);
  ring.rotation.x=-Math.PI/2;ring.position.set(0,0.035,n.z-2.8);scene.add(ring);
});

/* 골대 (끝) */
(function(){
  var m=new THREE.MeshLambertMaterial({color:0xffffff});
  [-9,9].forEach(function(x){var p=new THREE.Mesh(new THREE.BoxGeometry(0.6,7,0.6),m);p.position.set(x,3.5,Z1-1);scene.add(p);});
  var bar=new THREE.Mesh(new THREE.BoxGeometry(18.6,0.6,0.6),m);bar.position.set(0,7,Z1-1);scene.add(bar);
})();

/* 기지 바닥 + 안전존 표시 (칸마다 색이 달라요) */
var SLOT_FLOOR=[];
(function(){
  var safeTex=canvasTex(512,128,function(g,w,h){
    g.clearRect(0,0,w,h);
    g.font='bold 90px '+FONT;g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='rgba(200,230,255,.85)';g.fillText('SAFE ZONE',w/2,h/2);
  });
  SLOT_X.forEach(function(ox,s){
    var f=new THREE.Mesh(new THREE.PlaneGeometry(SLOT_W-1.2,BLEN),new THREE.MeshBasicMaterial({color:SLOT_COL[s],transparent:true,opacity:0.14,depthWrite:false}));
    f.rotation.x=-Math.PI/2;f.position.set(ox,0.045,BMID);scene.add(f);SLOT_FLOOR.push(f);
    var st=new THREE.Mesh(new THREE.PlaneGeometry(24,6),new THREE.MeshBasicMaterial({map:safeTex,transparent:true,depthWrite:false}));
    st.rotation.x=-Math.PI/2;st.position.set(ox,0.06,28);scene.add(st);
  });
  /* 칸 경계선 + 바깥 테두리 */
  for(var k=0;k<=SLOT_N;k++)addLine(-BASE_XMAX+k*SLOT_W,BMID,0.5,BLEN);
  addLine(0,Z0+0.3,BASE_XMAX*2,0.5);
  /* 대문 바닥선 */
  var edge=new THREE.Mesh(new THREE.BoxGeometry(58.6,0.12,0.9),new THREE.MeshBasicMaterial({color:0x4fc3f7}));
  edge.position.set(0,0.07,BASE_Z1);scene.add(edge);
  /* 대문 양옆 울타리: 바깥쪽 칸은 가운데 대문으로 나가요 */
  var fm=new THREE.MeshLambertMaterial({color:0x1d2a3a}),tm=new THREE.MeshBasicMaterial({color:0x4fc3f7});
  [-1,1].forEach(function(s){
    var L=BASE_XMAX-30,cx=s*(30+L/2);
    var w=new THREE.Mesh(new THREE.BoxGeometry(L,2.4,0.6),fm);w.position.set(cx,1.2,BASE_Z1+0.3);scene.add(w);
    var t=new THREE.Mesh(new THREE.BoxGeometry(L,0.25,0.7),tm);t.position.set(cx,2.45,BASE_Z1+0.3);scene.add(t);
    var e=new THREE.Mesh(new THREE.BoxGeometry(0.6,2.4,BLEN),fm);e.position.set(s*(BASE_XMAX+0.3),1.2,BMID);scene.add(e);
  });
  var bk=new THREE.Mesh(new THREE.BoxGeometry(BASE_XMAX*2+1.2,2.4,0.6),fm);bk.position.set(0,1.2,Z0-0.3);scene.add(bk);
})();

/* 광고판 */
(function(){
  var ads=[['BLOCK COLA','#d32f2f'],['CUBE AIR','#1565c0'],['골든 치킨','#f9a825'],['PIXEL BANK','#2e7d32'],['NOOB 라면','#e65100'],['STUD MOBILE','#6a1b9a']];
  var tex=canvasTex(1536,64,function(g,w,h){
    var pw=w/ads.length;
    ads.forEach(function(a,i){
      g.fillStyle=a[1];g.fillRect(i*pw,0,pw,h);
      g.fillStyle='#fff';g.font='bold 40px '+FONT;g.textAlign='center';g.textBaseline='middle';
      g.fillText(a[0],i*pw+pw/2,h/2+2);
      g.fillStyle='rgba(255,255,255,.5)';g.fillRect(i*pw,0,3,h);
    });
  });
  tex.wrapS=THREE.RepeatWrapping;tex.repeat.set(CLEN/48,1);
  [-1,1].forEach(function(s){
    var p=new THREE.Mesh(new THREE.PlaneGeometry(CLEN,2),new THREE.MeshBasicMaterial({map:tex}));
    p.rotation.y=s<0?Math.PI/2:-Math.PI/2;
    p.position.set(s*30.6,1.1,CMID);scene.add(p);
    var back=new THREE.Mesh(new THREE.BoxGeometry(0.3,2.2,CLEN),new THREE.MeshLambertMaterial({color:0x222222}));
    back.position.set(s*30.9,1.1,CMID);scene.add(back);
  });
})();

/* 관중석 + 블록 관중 (InstancedMesh) */
var crowdTime={value:0};
(function(){
  var TIERS=6, tierW=2.6;
  var stoneMat=new THREE.MeshLambertMaterial({color:0x4a5a66});
  var persons=[];
  /* 한 줄 관중석: alongZ=true면 z 방향으로 길게, s=높아지는 방향, c0=첫 줄 위치, a0~a1=길이 */
  function stand(alongZ,s,c0,a0,a1){
    var L=a1-a0,mid=(a0+a1)/2;
    for(var k=0;k<TIERS;k++){
      var H=1.4*(k+1), c=c0+s*(k*tierW+tierW/2);
      var tier=new THREE.Mesh(alongZ?new THREE.BoxGeometry(tierW,H,L):new THREE.BoxGeometry(L,H,tierW),stoneMat);
      if(alongZ)tier.position.set(c,H/2,mid);else tier.position.set(mid,H/2,c);
      scene.add(tier);
      for(var a=a0+1;a<a1;a+=2.2){
        if(Math.random()<0.14)continue;
        persons.push(alongZ?[c+rand(-0.3,0.3),H,a+rand(-0.4,0.4)]:[a+rand(-0.4,0.4),H,c+rand(-0.3,0.3)]);
      }
    }
  }
  var SW=TIERS*tierW,BX=BASE_XMAX+2;
  [-1,1].forEach(function(s){
    stand(true,s,s*34,BASE_Z1,Z1);                     /* 경기장 양옆 */
    stand(true,s,s*BX,Z0-2-SW,BASE_Z1+2+SW);            /* 넓은 기지 양옆 */
    stand(false,1,BASE_Z1+2,s>0?34+SW:-BX-SW,s>0?BX+SW:-34-SW); /* 바깥 칸 앞쪽 */
  });
  stand(false,-1,Z0-2,-BX,BX);                          /* 기지 뒤쪽 */
  var palette=['#e53935','#1e88e5','#fdd835','#43a047','#ffffff','#ff7043','#8e24aa','#26c6da'];
  var skins=['#f5c9a0','#e0ac69','#c68642','#8d5524','#ffdbac'];
  var bm=new THREE.MeshLambertMaterial({color:0xffffff}), hm=new THREE.MeshLambertMaterial({color:0xffffff});
  function wiggle(mat){
    mat.onBeforeCompile=function(sh){
      sh.uniforms.uTime=crowdTime;
      sh.vertexShader=sh.vertexShader
        .replace('#include <common>','#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\n float ph=instanceMatrix[3][0]*0.9+instanceMatrix[3][2]*1.7;\n transformed.y+=max(0.0,sin(uTime*4.0+ph))*0.4;\n#endif');
    };
  }
  wiggle(bm);wiggle(hm);
  var bodies=new THREE.InstancedMesh(new THREE.BoxGeometry(0.6,1.3,1.0),bm,persons.length);
  var heads=new THREE.InstancedMesh(new THREE.BoxGeometry(0.8,0.8,0.8),hm,persons.length);
  var d=new THREE.Object3D(),c=new THREE.Color();
  persons.forEach(function(p,i){
    d.position.set(p[0],p[1]+0.65,p[2]);d.updateMatrix();bodies.setMatrixAt(i,d.matrix);
    c.set(palette[(Math.random()*palette.length)|0]);bodies.setColorAt(i,c);
    d.position.set(p[0],p[1]+1.7,p[2]);d.updateMatrix();heads.setMatrixAt(i,d.matrix);
    c.set(skins[(Math.random()*skins.length)|0]);heads.setColorAt(i,c);
  });
  bodies.frustumCulled=false;heads.frustumCulled=false;
  scene.add(bodies);scene.add(heads);
})();

/* 조명탑 */
(function(){
  var poleM=new THREE.MeshLambertMaterial({color:0x607080});
  var panelM=new THREE.MeshBasicMaterial({color:0xfff4c8});
  function pole(x,z,s){
    var p=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.9,38,8),poleM);p.position.set(x,19,z);scene.add(p);
    var panel=new THREE.Mesh(new THREE.BoxGeometry(1.2,8,14),panelM);panel.position.set(x-s*1.5,40,z);panel.rotation.z=s*0.25;scene.add(panel);
  }
  for(var z=140;z<=Z1;z+=140)[-1,1].forEach(function(s){pole(s*60,z,s);});
  [-1,1].forEach(function(s){pole(s*(BASE_XMAX+20),-25,s);pole(s*(BASE_XMAX+20),25,s);});
})();

/* 별 */
var stars;
(function(){
  var n=700,pos=new Float32Array(n*3);
  for(var i=0;i<n;i++){
    var th=Math.random()*Math.PI*2,ph=Math.acos(Math.random()*0.9+0.1),r=900;
    pos[i*3]=r*Math.sin(ph)*Math.cos(th);pos[i*3+1]=r*Math.cos(ph);pos[i*3+2]=r*Math.sin(ph)*Math.sin(th);
  }
  var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  stars=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:2,sizeAttenuation:false,fog:false}));
  stars.frustumCulled=false;scene.add(stars);
})();

/* =========================================================
   블록 캐릭터
   ========================================================= */
var faceCache={};
function faceMat(skin,type){
  var k=skin+type;
  if(faceCache[k])return faceCache[k];
  var tex=canvasTex(64,64,function(g){
    g.fillStyle=skin;g.fillRect(0,0,64,64);
    g.fillStyle='#222';g.strokeStyle='#222';g.lineWidth=4;g.lineCap='round';
    if(type==='happy'){
      g.fillRect(18,22,6,10);g.fillRect(40,22,6,10);
      g.beginPath();g.arc(32,38,10,0.15*Math.PI,0.85*Math.PI);g.stroke();
    }else if(type==='sleep'){
      g.beginPath();g.moveTo(14,30);g.lineTo(27,30);g.moveTo(37,30);g.lineTo(50,30);g.stroke();
      g.fillStyle='#b55';g.beginPath();g.ellipse(32,47,4,5,0,0,7);g.fill();
    }else{
      g.beginPath();g.moveTo(14,20);g.lineTo(27,27);g.lineTo(14,34);g.moveTo(50,20);g.lineTo(37,27);g.lineTo(50,34);g.stroke();
      g.fillStyle='#4fc3f7';g.fillRect(15,36,5,20);g.fillRect(44,36,5,20);
      g.fillStyle='#5a1a1a';g.beginPath();g.ellipse(32,48,10,7,0,0,7);g.fill();
    }
  });
  return faceCache[k]=new THREE.MeshLambertMaterial({map:tex});
}
function box(w,h,d,color){
  var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:color}));
  m.castShadow=true;return m;
}
function makeChar(o){
  var root=new THREE.Group(),body=new THREE.Group();root.add(body);
  var torso=box(2,2,1,o.shirt);torso.position.y=3;body.add(torso);
  var sk=new THREE.MeshLambertMaterial({color:o.skin});
  var faces={happy:faceMat(o.skin,'happy'),sleep:faceMat(o.skin,'sleep'),cry:faceMat(o.skin,'cry')};
  var head=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.5,1.5),[sk,sk,sk,sk,faces[o.face||'happy'],sk]);
  head.position.y=4.85;head.castShadow=true;body.add(head);
  var hair=box(1.6,0.45,1.6,o.hair);hair.position.y=5.65;body.add(hair);
  var hairB=box(1.6,1.0,0.3,o.hair);hairB.position.set(0,5.2,-0.65);body.add(hairB);
  function arm(sx){
    var g=new THREE.Group();g.position.set(sx*1.5,3.95,0);
    var a=box(1,1.2,1,o.shirt);a.position.y=-0.6;g.add(a);
    var b=box(1,0.8,1,o.skin);b.position.y=-1.6;g.add(b);
    body.add(g);return g;
  }
  function leg(sx){
    var g=new THREE.Group();g.position.set(sx*0.5,2,0);
    var a=box(1,0.9,1,o.pants);a.position.y=-0.45;g.add(a);
    var b=box(1,1.1,1,o.sock);b.position.y=-1.45;g.add(b);
    body.add(g);return g;
  }
  var armL=arm(-1),armR=arm(1),legL=leg(-1),legR=leg(1);
  return {root:root,body:body,head:head,faces:faces,armL:armL,armR:armR,legL:legL,legR:legR,face:o.face||'happy'};
}
function setFace(ch,type){if(ch.face!==type){ch.face=type;ch.head.material[4]=ch.faces[type];}}
function swing(ch,phase,amp){
  var s=Math.sin(phase)*amp;
  ch.armL.rotation.x=s;ch.armR.rotation.x=-s;ch.legL.rotation.x=-s;ch.legR.rotation.x=s;
}

/* =========================================================
   트로피(큰 손) 모델
   ========================================================= */
var texLoader=new THREE.TextureLoader();
var handTex=texLoader.load(window.__HAND__.src),projTex=texLoader.load(window.__PROJ__.src);
var HAND_H=3.3,HAND_W=HAND_H*window.__HAND__.w/window.__HAND__.h;
/* 등급별로 손 이미지를 그라디언트 맵으로 색칠 */
var gradeTex=[];
(function(){
  var cv=[];
  GRADES.forEach(function(g,gi){
    var c=document.createElement('canvas');c.width=window.__HAND__.w;c.height=window.__HAND__.h;
    var t=new THREE.CanvasTexture(c);t.anisotropy=4;gradeTex.push(t);cv.push(c);
  });
  function hex(h){return [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)];}
  function hsl2rgb(h,s,l){
    var a=s*Math.min(l,1-l);function f(n){var k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1));}
    return [f(0)*255,f(8)*255,f(4)*255];
  }
  var img=new Image();
  img.onload=function(){
    var w=img.width,h=img.height,base=document.createElement('canvas');base.width=w;base.height=h;
    var bg=base.getContext('2d');bg.drawImage(img,0,0);
    var src=bg.getImageData(0,0,w,h).data;
    GRADES.forEach(function(g,gi){
      var ctx=cv[gi].getContext('2d'),out=ctx.createImageData(w,h),d=out.data;
      var sh=hex(g.c[0]),mi=hex(g.c[1]),hi=hex(g.c[2]);
      for(var y=0;y<h;y++)for(var x=0;x<w;x++){
        var k=(y*w+x)*4,a=src[k+3];
        if(a===0){d[k+3]=0;continue;}
        var l=(src[k]*0.299+src[k+1]*0.587+src[k+2]*0.114)/255;
        l=Math.max(0,Math.min(1,(l-0.18)/0.82));
        var r,gg,b;
        if(g.rainbow){var rgb=hsl2rgb(((y/h)*320+x/w*60)%360,0.9,0.28+0.5*l);r=rgb[0];gg=rgb[1];b=rgb[2];}
        else{
          var A,B,u;
          if(l<0.55){A=sh;B=mi;u=l/0.55;}else{A=mi;B=hi;u=(l-0.55)/0.45;}
          r=A[0]+(B[0]-A[0])*u;gg=A[1]+(B[1]-A[1])*u;b=A[2]+(B[2]-A[2])*u;
        }
        d[k]=r;d[k+1]=gg;d[k+2]=b;d[k+3]=a;
      }
      ctx.putImageData(out,0,0);gradeTex[gi].needsUpdate=true;
    });
  };
  img.src=window.__HAND__.src;
})();
var haloTex=(function(){
  var c=document.createElement('canvas');c.width=c.height=128;var g=c.getContext('2d');
  var gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.35,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
})();
var fxList=[];
function makeTrophy(color,dark,gi){
  var g=new THREE.Group();
  var baseM=dark?new THREE.MeshLambertMaterial({color:0x10141a})
    :new THREE.MeshPhongMaterial({color:color,shininess:80,emissive:color,emissiveIntensity:0.45});
  var base=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.15,0.3,20),baseM);base.position.y=0.15;g.add(base);
  gi=gi||0;
  var K=gi/(GRADES.length-1),sc=dark?1:0.9+0.03*gi,hh=HAND_H*sc,hw=HAND_W*sc;
  var fx={g:g,gi:gi,ring:null,stars:[],halo:null,haloBase:0,hue:gi>=15,hh:hh};
  if(!dark&&gi>=3){
    fx.haloBase=0.1+0.5*K;
    var hm=new THREE.SpriteMaterial({map:haloTex,color:color,transparent:true,opacity:fx.haloBase,depthWrite:false,blending:THREE.AdditiveBlending});
    var halo=new THREE.Sprite(hm);var hs=hh*(1.2+0.5*K);halo.scale.set(hs,hs,1);halo.position.y=0.3+hh/2;halo.renderOrder=1;g.add(halo);fx.halo=halo;
  }
  var sm=new THREE.SpriteMaterial({map:dark?handTex:gradeTex[gi],transparent:true,alphaTest:0.3,color:dark?0x0c0f14:0xffffff});
  var sp=new THREE.Sprite(sm);sp.scale.set(hw,hh,1);sp.position.y=0.3+hh/2;sp.renderOrder=2;g.add(sp);
  /* 등급이 높을수록: 커지고 → 회전 링 → 궤도 별 → 무지개 후광 */
  if(!dark&&gi>=5){
    var rg=new THREE.Group();rg.position.y=0.5;
    var rm=new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:0.85,blending:THREE.AdditiveBlending,depthWrite:false});
    var ring=new THREE.Mesh(new THREE.TorusGeometry(1.55,0.07,6,32),rm);ring.rotation.x=Math.PI/2;rg.add(ring);
    if(gi>=11){var r2=new THREE.Mesh(new THREE.TorusGeometry(2.1,0.05,6,32),rm);r2.rotation.x=Math.PI/2;rg.add(r2);}
    g.add(rg);fx.ring=rg;
  }
  if(!dark&&gi>=9){
    var cnt=gi>=14?5:3;
    for(var q=0;q<cnt;q++){
      var stm=new THREE.SpriteMaterial({map:haloTex,color:color,transparent:true,opacity:0.95,depthWrite:false,blending:THREE.AdditiveBlending});
      var st=new THREE.Sprite(stm);st.scale.set(0.7,0.7,1);st.renderOrder=3;g.add(st);fx.stars.push(st);
    }
  }
  if(!dark&&gi>=3)fxList.push(fx);
  return g;
}
var tv3=new THREE.Vector3();
function updateTrophyFx(t){
  if(!fxLevel)return;
  for(var i=0;i<fxList.length;i++){
    var f=fxList[i],g=f.g;
    if(!g.visible)continue;
    g.getWorldPosition(tv3);
    if(Math.abs(tv3.z-P.z)>140||Math.abs(tv3.x-P.x)>140)continue;
    if(f.ring)f.ring.rotation.y=t*(0.8+f.gi*0.12);
    for(var q=0;q<f.stars.length;q++){
      var a=t*1.6+q*6.2832/f.stars.length,r=1.9+0.15*Math.sin(t*3+q);
      f.stars[q].position.set(Math.cos(a)*r,0.3+f.hh*0.5+Math.sin(t*2+q*1.7)*f.hh*0.28,Math.sin(a)*r);
    }
    if(f.halo){
      f.halo.material.opacity=f.haloBase*(0.82+0.18*Math.sin(t*3+f.gi));
      if(f.hue)f.halo.material.color.setHSL((t*0.18+f.gi*0.07)%1,0.9,0.62);
    }
  }
}
function makeProj(size){
  var m=new THREE.SpriteMaterial({map:projTex,transparent:true,alphaTest:0.2});
  var sp=new THREE.Sprite(m);sp.scale.set(size,size,1);return sp;
}

/* =========================================================
   파티클
   ========================================================= */
var PN=900,pPos=new Float32Array(PN*3),pCol=new Float32Array(PN*3),pVel=new Float32Array(PN*3),pLife=new Float32Array(PN),pGrav=new Float32Array(PN),pIdx=0;
for(var pi=0;pi<PN;pi++)pPos[pi*3+1]=-999;
var pGeo=new THREE.BufferGeometry();
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));
var pts=new THREE.Points(pGeo,new THREE.PointsMaterial({size:0.6,vertexColors:true,transparent:true,depthWrite:false}));
pts.frustumCulled=false;scene.add(pts);
var tmpC=new THREE.Color();
function emit(x,y,z,vx,vy,vz,hex,life,grav){
  var i=(pIdx++)%PN;
  pPos[i*3]=x;pPos[i*3+1]=y;pPos[i*3+2]=z;
  pVel[i*3]=vx;pVel[i*3+1]=vy;pVel[i*3+2]=vz;
  tmpC.set(hex);pCol[i*3]=tmpC.r;pCol[i*3+1]=tmpC.g;pCol[i*3+2]=tmpC.b;
  pLife[i]=life;pGrav[i]=(grav===undefined?20:grav);
}
function burst(x,y,z,hex,n,sp){
  n=Math.max(1,Math.round(n*fxMul));
  for(var i=0;i<n;i++)emit(x,y,z,rand(-sp,sp),rand(sp*0.3,sp),rand(-sp,sp),hex,rand(0.4,0.9),20);
}
function updateParticles(dt){
  for(var i=0;i<PN;i++){
    if(pLife[i]<=0)continue;
    pLife[i]-=dt;
    if(pLife[i]<=0){pPos[i*3+1]=-999;continue;}
    pVel[i*3+1]-=pGrav[i]*dt;
    pPos[i*3]+=pVel[i*3]*dt;pPos[i*3+1]+=pVel[i*3+1]*dt;pPos[i*3+2]+=pVel[i*3+2]*dt;
    if(pPos[i*3+1]<0.05){pPos[i*3+1]=0.05;pVel[i*3+1]*=-0.3;}
  }
  pGeo.attributes.position.needsUpdate=true;pGeo.attributes.color.needsUpdate=true;
}

/* =========================================================
   오디오 (WebAudio 합성)
   ========================================================= */
var AC=null,master=null;
function initAudio(){
  try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    master=AC.createGain();master.gain.value=0.5;master.connect(AC.destination);
    if(AC.state==='suspended')AC.resume();
    loadDepositSound();
  }catch(e){AC=null;}
}
var depositBuf=null,caughtBuf=null,cryBuf=null,bgmBuf=null,bgmGain=null,bgmSrc=null,bgmMuted=false,BGM_VOL=0.32;
try{bgmMuted=localStorage.getItem('steal-a-roh-bgm-muted')==='1';}catch(e){}
function startBgm(){
  if(!AC||!bgmBuf||bgmSrc)return;
  bgmGain=AC.createGain();bgmGain.gain.value=bgmMuted?0:BGM_VOL;bgmGain.connect(AC.destination);
  bgmSrc=AC.createBufferSource();bgmSrc.buffer=bgmBuf;bgmSrc.loop=true;bgmSrc.connect(bgmGain);bgmSrc.start();
}
function setBgmMuted(m){
  bgmMuted=m;
  if(bgmGain)bgmGain.gain.value=m?0:BGM_VOL;
  var b=document.getElementById('muteBtn');if(b)b.textContent=m?'🔇 BGM 꺼짐':'🔊 BGM';
  try{localStorage.setItem('steal-a-roh-bgm-muted',m?'1':'0');}catch(e){}
}
function decodeB64(dataUri,cb){
  try{
    var b=atob(dataUri.split(',')[1]),u=new Uint8Array(b.length);
    for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);
    var p=AC.decodeAudioData(u.buffer,cb,function(){});
    if(p&&p.catch)p.catch(function(){});
  }catch(e){}
}
function loadDepositSound(){
  decodeB64(window.__DEPOSIT__,function(buf){depositBuf=buf;});
  decodeB64(window.__CAUGHT__,function(buf){caughtBuf=buf;});
  decodeB64(window.__CRY__,function(buf){cryBuf=buf;});
  decodeB64(window.__BGM__,function(buf){bgmBuf=buf;startBgm();});
}
function playCaught(){
  if(!AC||!caughtBuf)return false;
  var s=AC.createBufferSource(),g=AC.createGain();s.buffer=caughtBuf;g.gain.value=1;
  s.connect(g);g.connect(master);s.start();return true;
}
function playDeposit(){
  if(!AC)return false;
  if(!depositBuf)return false;
  var s=AC.createBufferSource(),g=AC.createGain();s.buffer=depositBuf;g.gain.value=1;
  s.connect(g);g.connect(master);s.start();return true;
}
function tone(freq,dur,type,vol,slide,delay){
  if(!AC)return;
  var t=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();
  o.type=type||'sine';o.frequency.setValueAtTime(freq,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+dur);
  g.gain.setValueAtTime(vol||0.2,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+0.03);
}
function noise(dur,vol,freq){
  if(!AC)return;
  var len=Math.floor(AC.sampleRate*dur),buf=AC.createBuffer(1,len,AC.sampleRate),d=buf.getChannelData(0);
  for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
  var s=AC.createBufferSource();s.buffer=buf;
  var f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=freq||800;
  var g=AC.createGain();g.gain.value=vol||0.3;
  s.connect(f);f.connect(g);g.connect(master);s.start();
}
var activeCries=0,lastShootSfx=0;
function cry(vol,pitch){
  if(!AC||vol<0.02)return;
  if(cryBuf){
    if(activeCries>=2||(activeCries>=1&&vol<0.3))return;
    activeCries++;
    var cs=AC.createBufferSource(),cg=AC.createGain();cs.buffer=cryBuf;cs.playbackRate.value=pitch;cg.gain.value=Math.min(1,vol);
    cs.onended=function(){activeCries=Math.max(0,activeCries-1);};
    cs.connect(cg);cg.connect(master);cs.start();return;
  }
  var t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain(),f=AC.createBiquadFilter(),lfo=AC.createOscillator(),lg=AC.createGain();
  o.type='sawtooth';o.frequency.setValueAtTime(560*pitch,t);o.frequency.linearRampToValueAtTime(700*pitch,t+0.25);o.frequency.linearRampToValueAtTime(420*pitch,t+0.9);
  lfo.frequency.value=8;lg.gain.value=28;lfo.connect(lg);lg.connect(o.frequency);
  f.type='bandpass';f.frequency.value=1100;f.Q.value=2.5;
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+0.12);g.gain.linearRampToValueAtTime(vol*0.7,t+0.6);g.gain.exponentialRampToValueAtTime(0.001,t+0.95);
  o.connect(f);f.connect(g);g.connect(master);o.start(t);lfo.start(t);o.stop(t+1);lfo.stop(t+1);
}
var sfx={
  steal:function(){tone(520,0.12,'square',0.15);tone(660,0.12,'square',0.15,0,0.1);tone(880,0.2,'square',0.15,0,0.2);},
  jump:function(){tone(300,0.18,'sine',0.12,350);},
  hit:function(){noise(0.35,0.5,500);tone(160,0.3,'sawtooth',0.25,-100);},
  shoot:function(){noise(0.25,0.25,2500);tone(500,0.2,'triangle',0.12,-300);},
  charge:function(){tone(400,0.12,'square',0.1);},
  deposit:function(){if(playDeposit())return;tone(784,0.12,'triangle',0.22);tone(988,0.12,'triangle',0.22,0,0.1);tone(1319,0.3,'triangle',0.22,0,0.2);},
  buy:function(){tone(660,0.1,'square',0.12);tone(990,0.18,'square',0.12,0,0.09);},
  tick:function(){tone(900,0.08,'sine',0.1,400);},
  deny:function(){tone(200,0.15,'square',0.1);}
};

/* =========================================================
   UI 도우미
   ========================================================= */
function toast(msg,cls){
  var box=$('toasts');
  var d=document.createElement('div');d.className='toast '+(cls||'');d.textContent=msg;
  box.appendChild(d);
  while(box.children.length>4)box.removeChild(box.firstChild);
  setTimeout(function(){if(d.parentNode)d.parentNode.removeChild(d);},2600);
}
var tmpV=new THREE.Vector3();
function floatText(text,x,y,z,cls){
  tmpV.set(x,y,z).project(camera);
  if(tmpV.z>1)return;
  var d=document.createElement('div');d.className='float '+(cls||'');d.textContent=text;
  d.style.left=((tmpV.x*0.5+0.5)*VW())+'px';d.style.top=((-tmpV.y*0.5+0.5)*VH())+'px';
  document.body.appendChild(d);
  setTimeout(function(){if(d.parentNode)d.parentNode.removeChild(d);},1300);
}

/* =========================================================
   플레이어
   ========================================================= */
var P={x:slotX(mySlot),y:0,z:8,vy:0,stun:0,face:0,lie:0,phase:0,carry:-1,treadAcc:0};
/* 플레이어: 사진 얼굴 + 정장 차림의 블록 캐릭터 (팔·다리 전부 있음) */
function makePlayerChar(o){
  o=o||{};var SKIN=o.skin||'#c99a7a',HAIR=o.hair||'#28262c',SUIT=o.suit||'#1d2233',STRIPE=o.stripe||'#343c58',SHIRT=o.shirt||'#cfe2f1',COLLAR=o.collar||'#e8f1f8',TIE=o.tie||'#5aa8d0',KNOT=o.knot||'#4b8db2',FACE=o.face||window.__PFACE__;
  var ch=makeChar({skin:SKIN,shirt:SUIT,pants:SUIT,sock:SUIT,hair:HAIR,face:'happy'});
  var suitTex=canvasTex(64,64,function(g,w,h){
    g.fillStyle=SUIT;g.fillRect(0,0,w,h);g.fillStyle=STRIPE;
    for(var x=3;x<w;x+=8)g.fillRect(x,0,1,h);
  });
  suitTex.wrapS=suitTex.wrapT=THREE.RepeatWrapping;
  var suitMat=function(){return new THREE.MeshLambertMaterial({map:suitTex});};
  /* 몸통: 앞면에 셔츠·넥타이·옷깃 */
  var torso=ch.body.children[0];
  var front=canvasTex(128,128,function(g,w,h){
    g.fillStyle=SUIT;g.fillRect(0,0,w,h);g.fillStyle=STRIPE;
    for(var x=3;x<w;x+=8)g.fillRect(x,0,1,h);
    g.fillStyle=SHIRT;g.beginPath();g.moveTo(42,0);g.lineTo(86,0);g.lineTo(64,62);g.closePath();g.fill();
    g.fillStyle=COLLAR;g.beginPath();g.moveTo(42,0);g.lineTo(54,0);g.lineTo(60,14);g.lineTo(52,12);g.closePath();g.fill();
    g.beginPath();g.moveTo(86,0);g.lineTo(74,0);g.lineTo(68,14);g.lineTo(76,12);g.closePath();g.fill();
    g.fillStyle=KNOT;g.beginPath();g.moveTo(58,8);g.lineTo(70,8);g.lineTo(68,19);g.lineTo(60,19);g.closePath();g.fill();
    g.fillStyle=TIE;g.beginPath();g.moveTo(60,19);g.lineTo(68,19);g.lineTo(73,66);g.lineTo(64,78);g.lineTo(55,66);g.closePath();g.fill();
    g.strokeStyle='#2f6c8c';g.lineWidth=2;g.beginPath();g.moveTo(64,22);g.lineTo(64,70);g.stroke();
    g.strokeStyle='#0d101b';g.lineWidth=5;g.beginPath();g.moveTo(40,0);g.lineTo(18,76);g.moveTo(88,0);g.lineTo(110,76);g.stroke();
    g.strokeStyle='#2a3148';g.lineWidth=2;g.beginPath();g.moveTo(46,0);g.lineTo(26,72);g.moveTo(82,0);g.lineTo(102,72);g.stroke();
    g.strokeStyle='#0d101b';g.lineWidth=3;g.beginPath();g.moveTo(60,80);g.lineTo(64,128);g.moveTo(68,80);g.lineTo(64,128);g.stroke();
    g.fillStyle='#0d101b';g.beginPath();g.arc(52,104,3,0,7);g.arc(76,104,3,0,7);g.fill();
  });
  var fm=new THREE.MeshLambertMaterial({map:front});
  torso.material=[suitMat(),suitMat(),suitMat(),suitMat(),fm,suitMat()];
  /* 머리: 사진 얼굴 (앞면) */
  var fcTex=new THREE.Texture();fcTex.anisotropy=4;
  var img=new Image();img.onload=function(){fcTex.image=img;fcTex.needsUpdate=true;};img.src=FACE;
  var photo=new THREE.MeshLambertMaterial({map:fcTex});
  function sideTex(hairFrac){return new THREE.MeshLambertMaterial({map:canvasTex(32,32,function(g,w,h){g.fillStyle=SKIN;g.fillRect(0,0,w,h);g.fillStyle=HAIR;g.fillRect(0,0,w,h*hairFrac);})});}
  ch.head.material=[sideTex(0.55),sideTex(0.55),new THREE.MeshLambertMaterial({color:HAIR}),new THREE.MeshLambertMaterial({color:SKIN}),photo,sideTex(0.7)];
  ch.head.scale.set(1.2,1.2,1.2);ch.head.position.y=4.95;
  ch.faces.happy=ch.faces.sleep=ch.faces.cry=photo;ch.face='happy';
  ch.body.children[2].visible=false;ch.body.children[3].visible=false;
  /* 소매·바지·구두 */
  [ch.armL,ch.armR].forEach(function(a){a.children[0].material=suitMat();});
  [ch.legL,ch.legR].forEach(function(l){
    l.children[0].material=suitMat();l.children[1].material=suitMat();
    var shoe=box(1.05,0.3,1.3,'#0c0c0f');shoe.position.set(0,-1.85,0.15);l.add(shoe);
  });
  return ch;
}
var pChar=makePlayerChar();
scene.add(pChar.root);
var holdTrophies=ITEM_COLORS.map(function(c,k){
  var t=makeTrophy(c,false,k);t.scale.set(1.2,1.2,1.2);t.visible=false;pChar.root.add(t);return t;
});
function inSafe(){return P.z<BASE_Z1;}

/* =========================================================
   NPC
   ========================================================= */
var ballTex=canvasTex(128,64,function(g,w,h){
  g.fillStyle='#fff';g.fillRect(0,0,w,h);g.fillStyle='#222';
  for(var i=0;i<9;i++){var x=Math.random()*w,y=8+Math.random()*(h-16);g.beginPath();
    for(var k=0;k<5;k++){var a=k/5*Math.PI*2;g.lineTo(x+Math.cos(a)*9,y+Math.sin(a)*9);}g.fill();}
});
var ballGeo=new THREE.SphereGeometry(0.7,16,12),ballMat=new THREE.MeshLambertMaterial({map:ballTex});
var aimGeo=new THREE.PlaneGeometry(0.5,1);aimGeo.rotateX(-Math.PI/2);aimGeo.translate(0,0,0.5);
var aimMat=new THREE.MeshBasicMaterial({color:0xff1111,transparent:true,opacity:0.8,depthWrite:false,side:THREE.DoubleSide});

var texLoader=new THREE.TextureLoader();
var NPC_H=15;
var npcs=NPCS.map(function(c,i){
  var h=NPC_H,w=h*c.iw/c.ih;if(w>12){w=12;h=w*c.ih/c.iw;}
  c.w=w;c.h=h;
  var root=new THREE.Group();root.position.set(c.x,0,c.z);scene.add(root);
  var tex=texLoader.load(c.img);tex.anisotropy=4;
  var geo=new THREE.PlaneGeometry(w,h);geo.translate(0,h/2,0);
  var mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:0.35,side:THREE.DoubleSide});
  var mesh=new THREE.Mesh(geo,mat);mesh.rotation.x=-Math.PI/2;mesh.position.y=0.12;root.add(mesh);
  var blob=new THREE.Mesh(new THREE.CircleGeometry(1,20),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.35,depthWrite:false}));
  blob.rotation.x=-Math.PI/2;blob.position.set(c.x,0.07,c.z);blob.scale.set(w*0.42,w*0.22,1);blob.visible=false;scene.add(blob);
  var tag=makeSprite(256,96,12,4.5);
  tag.g.clearRect(0,0,256,96);roundRect(tag.g,4,4,248,88,18);tag.g.fillStyle='rgba(0,0,0,.62)';tag.g.fill();
  tag.g.textAlign='center';tag.g.font='bold 33px '+FONT;tag.g.fillStyle='#fff';tag.g.fillText(c.name,128,41,236);
  tag.g.font='bold 31px '+FONT;tag.g.fillStyle='#ffd54a';tag.g.fillText('⚡ '+fmt(c.speed),128,78);tag.tex.needsUpdate=true;
  scene.add(tag.sprite);
  var zz=makeSprite(128,64,4,2);
  zz.g.font='bold 44px '+FONT;zz.g.textAlign='center';zz.g.lineWidth=6;zz.g.strokeStyle='#123';zz.g.strokeText('Z z z',64,46);zz.g.fillStyle='#fff';zz.g.fillText('Z z z',64,46);zz.tex.needsUpdate=true;
  scene.add(zz.sprite);
  var aim=new THREE.Mesh(aimGeo,aimMat);aim.visible=false;aim.position.y=0.14;scene.add(aim);
  var aimX=[0,1].map(function(){var a=new THREE.Mesh(aimGeo,aimMat);a.visible=false;a.position.y=0.14;scene.add(a);return a;});
  var ball=makeProj(2.4);ball.visible=false;scene.add(ball);
  var px=c.side*11,pz=c.z-2.8;
  var pedMesh=new THREE.Mesh(new THREE.BoxGeometry(2.8,1.6,2.8),new THREE.MeshLambertMaterial({color:0x37474f}));
  pedMesh.position.set(px,0.8,pz);pedMesh.castShadow=true;pedMesh.receiveShadow=true;scene.add(pedMesh);
  var cap=new THREE.Mesh(new THREE.BoxGeometry(3.1,0.2,3.1),new THREE.MeshLambertMaterial({color:ITEM_COLORS[i]}));
  cap.position.set(px,1.7,pz);scene.add(cap);
  var item=makeTrophy(ITEM_COLORS[i],false,i);item.position.set(px,1.8,pz);item.scale.set(1.2,1.2,1.2);scene.add(item);
  var beam=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,16,10,1,true),new THREE.MeshBasicMaterial({color:ITEM_COLORS[i],transparent:true,opacity:0.22,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
  beam.position.set(px,9,pz);scene.add(beam);
  return {i:i,cfg:c,ch:{root:root},mesh:mesh,mat:mat,blob:blob,tag:tag,zz:zz,aim:aim,aimX:aimX,pat:(i<6?0:i<12?1:2),tagSt:-1,ball:ball,state:'sleep',lie:1,ct:0,nextCharge:0,tearT:0,cryT:0,phase:0,ballHide:0,
          tg:null,carrier:null,pst:'sleep',
          move:c.move,home:{x:c.x,z:c.z},ped:{x:px,z:pz,has:true,t:0,pop:1,item:item,beam:beam}};
});

function drawTag(n,st){
  var c=n.cfg,g=n.tag.g;
  g.clearRect(0,0,256,96);roundRect(g,4,4,248,88,18);
  g.fillStyle=st===2?'rgba(120,0,0,.8)':st===1?'rgba(110,70,0,.75)':'rgba(0,0,0,.62)';g.fill();
  g.textAlign='center';g.textBaseline='alphabetic';g.font='bold 33px '+FONT;g.fillStyle='#fff';g.fillText(c.name,128,41,236);
  g.font='bold 30px '+FONT;g.fillStyle=st===2?'#ff8a80':st===1?'#ffd180':'#9cff9c';
  g.fillText((st===2?'☠ ':st===1?'⚠ ':'✔ ')+'⚡ '+fmt(c.speed),128,78,236);
  n.tag.tex.needsUpdate=true;n.tagSt=st;
}
function tagState(n){var r=G.speed/n.cfg.speed;return r>=1?0:r>=0.5?1:2;}
var projectiles=[];
var lastShotToast=0;

/* =========================================================
   기지 칸 (최대 4칸): 전시관(왼쪽) + 러닝머신 패드(오른쪽)
   - 내 칸은 내 저장 데이터(G)로, 친구 칸은 친구가 보내준 수집 현황으로 그려요
   - 칸 안의 모델은 처음 쓰일 때 만들어요 (혼자 할 땐 내 칸 하나만 만들어짐)
   ========================================================= */
var BASES=SLOT_X.map(function(ox,s){
  var tag=makeSprite(512,128,22,5.5);tag.sprite.position.set(ox,23,-4);tag.sprite.renderOrder=4;scene.add(tag.sprite);
  return {s:s,ox:ox,built:false,g:null,ex:null,pads:null,hall:null,tag:tag,tk:'',hk:'',ok:''};
});
function buildBase(b){
  var ox=b.ox,grp=new THREE.Group();scene.add(grp);
  b.g=grp;b.built=true;
  b.ex=NPCS.map(function(c,i){
    var col=Math.floor(i/5),row=i%5;
    var x=ox-27+col*7,z=-32+row*12;
    var st=new THREE.Mesh(new THREE.BoxGeometry(4.6,1.4,4.6),new THREE.MeshLambertMaterial({color:0x37474f}));
    st.position.set(x,0.7,z);st.castShadow=true;st.receiveShadow=true;grp.add(st);
    var top=new THREE.Mesh(new THREE.BoxGeometry(5,0.2,5),new THREE.MeshLambertMaterial({color:ITEM_COLORS[i]}));
    top.position.set(x,1.5,z);grp.add(top);
    var dark=makeTrophy(0x222222,true);dark.position.set(x,1.6,z);dark.scale.set(1.3,1.3,1.3);grp.add(dark);
    var lab=makeSprite(256,128,6.6,3.3);lab.sprite.position.set(x,6.1,z);grp.add(lab.sprite);
    return {x:x,z:z,real:null,dark:dark,lab:lab,n:-1};
  });
  /* 전시관 간판 */
  var c=document.createElement('canvas');c.width=1024;c.height=256;
  var tex=new THREE.CanvasTexture(c);
  var m=new THREE.Mesh(new THREE.PlaneGeometry(27,6.75),new THREE.MeshBasicMaterial({map:tex}));
  m.position.set(ox-16,9.5,-38.5);grp.add(m);
  var frame=new THREE.Mesh(new THREE.BoxGeometry(28,7.7,0.6),new THREE.MeshLambertMaterial({color:0x222222}));
  frame.position.set(ox-16,9.5,-39.1);grp.add(frame);
  [-29.2,-2.8].forEach(function(x){var p=new THREE.Mesh(new THREE.BoxGeometry(1,10,1),new THREE.MeshLambertMaterial({color:0x444444}));p.position.set(ox+x,5,-39);grp.add(p);});
  b.hall={c:c,tex:tex};
  /* 러닝머신 패드 */
  b.pads=TREADS.map(function(t,i){
    var col=i%3,row=Math.floor(i/3),x=ox+9.5+col*8,z=-30+row*13;
    var tx=canvasTex(64,64,function(g){
      g.fillStyle=t.color;g.fillRect(0,0,64,64);g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=6;g.lineCap='round';
      g.beginPath();g.moveTo(14,52);g.lineTo(32,34);g.lineTo(50,52);g.moveTo(14,30);g.lineTo(32,12);g.lineTo(50,30);g.stroke();
    });
    tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(3,3);
    var side=new THREE.MeshLambertMaterial({color:0x263238});
    var topM=new THREE.MeshLambertMaterial({map:tx,transparent:true,opacity:0.4});
    var mesh=new THREE.Mesh(new THREE.BoxGeometry(7.4,0.3,7.4),[side,side,topM,side,side,side]);
    mesh.position.set(x,0.15,z);mesh.receiveShadow=true;grp.add(mesh);
    var lab=makeSprite(256,112,7.6,3.3);lab.sprite.position.set(x,5.2,z);grp.add(lab.sprite);
    return {x:x,z:z,tex:tx,topM:topM,lab:lab,q:0,k:''};
  });
  return b;
}
function getBase(s){var b=BASES[s];if(!b.built)buildBase(b);return b;}
function drawExhibit(b,i,n){
  var e=b.ex[i];if(e.n===n)return;e.n=n;
  if(n>0&&!e.real){e.real=makeTrophy(ITEM_COLORS[i],false,i);e.real.position.set(e.x,1.6,e.z);e.real.scale.set(1.3,1.3,1.3);b.g.add(e.real);}
  if(e.real)e.real.visible=n>0;e.dark.visible=n<=0;
  var g=e.lab.g,gr=gradeOf(i);
  g.clearRect(0,0,256,128);roundRect(g,4,4,248,120,18);g.fillStyle='rgba(0,0,0,.62)';g.fill();
  g.lineWidth=4;g.strokeStyle=n>0?gr.m:'#455a64';g.stroke();
  g.textAlign='center';g.textBaseline='middle';
  if(n>0){
    g.font='bold 25px '+FONT;g.fillStyle=gr.m;g.fillText('★ '+gr.name+' 등급',128,25,236);
    g.font='bold 26px '+FONT;g.fillStyle='#fff';g.fillText(NPCS[i].name,128,60,236);
    g.font='bold 34px '+FONT;g.fillStyle='#ffd54a';g.fillText('×'+n,128,100);
  }else{g.font='bold 56px '+FONT;g.fillStyle='#78909c';g.fillText('?',128,64);}
  e.lab.tex.needsUpdate=true;
}
/* price: 내 칸이면 가격을 보여주고, 친구 칸이면 null */
function drawPad(b,i,q,price){
  var p=b.pads[i],t=TREADS[i],k=q+'|'+price;if(p.k===k)return;p.k=k;p.q=q;
  var g=p.lab.g;
  p.topM.opacity=q>0?1:0.4;p.topM.needsUpdate=true;
  g.clearRect(0,0,256,112);roundRect(g,4,4,248,104,16);g.fillStyle='rgba(0,0,0,.62)';g.fill();
  g.textAlign='center';g.textBaseline='middle';
  g.font='bold 25px '+FONT;g.fillStyle=t.color==='#37474f'?'#b0bec5':t.color;g.fillText((q>0?'':'🔒 ')+t.name+' 러닝머신'+(q>0?' ×'+q:''),128,30,240);
  g.font='bold 30px '+FONT;g.fillStyle=q>0?'#7fffd4':(price!==null?'#ffd54a':'#78909c');
  g.fillText(q>0?'+'+fmt(t.gain*q)+' 속도 / 1.5초':(price!==null?'💰 '+fmt(price):'아직 없음'),128,76,240);
  p.lab.tex.needsUpdate=true;
}
function drawHall(b,got,who){
  var k=got+'|'+who;if(b.hk===k)return;b.hk=k;
  var g=b.hall.c.getContext('2d');
  g.fillStyle='#10182c';g.fillRect(0,0,1024,256);
  g.strokeStyle='#ffd54a';g.lineWidth=10;g.strokeRect(10,10,1004,236);
  g.textAlign='center';g.textBaseline='middle';
  g.font='bold 92px '+FONT;g.fillStyle='#ffd54a';g.fillText(who?'🏆 '+who+'의 전시관':'🏆 큰 손 전시관',512,95,980);
  g.font='bold 70px '+FONT;g.fillStyle='#fff';g.fillText('수집 현황  '+got+' / '+N,512,191);
  b.hall.tex.needsUpdate=true;
}
function drawEmptyHall(b){
  var g=b.hall.c.getContext('2d');
  g.fillStyle='#10182c';g.fillRect(0,0,1024,256);
  g.strokeStyle='#546e7a';g.lineWidth=10;g.strokeRect(10,10,1004,236);
  g.textAlign='center';g.textBaseline='middle';
  g.font='bold 88px '+FONT;g.fillStyle='#b0bec5';g.fillText('🏠 빈 기지',512,95,980);
  g.font='bold 54px '+FONT;g.fillStyle='#90a4ae';g.fillText('친구가 들어오면 여기가 친구 기지!',512,191,980);
  b.hall.tex.needsUpdate=true;
}
/* 칸 위에 떠 있는 이름표 */
function drawSlotTag(b,txt,mine,empty){
  var k=txt+'|'+mine+'|'+empty;if(b.tk===k)return;b.tk=k;
  var g=b.tag.g;
  g.clearRect(0,0,512,128);roundRect(g,6,6,500,116,26);
  g.fillStyle=empty?'rgba(0,0,0,.35)':'rgba(10,20,45,.82)';g.fill();
  g.lineWidth=8;g.strokeStyle=mine?'#ffd54a':(empty?'rgba(255,255,255,.25)':SLOT_CSS[b.s]);g.stroke();
  g.textAlign='center';g.textBaseline='middle';g.font='bold 58px '+FONT;
  g.fillStyle=mine?'#ffd54a':(empty?'rgba(255,255,255,.45)':'#fff');g.fillText(txt,256,66,480);
  b.tag.tex.needsUpdate=true;b.tag.sprite.material.opacity=empty?0.7:1;
}
function myBase(){return getBase(mySlot);}
var exhibits=myBase().ex, pads=myBase().pads;
function updateExhibit(i){drawExhibit(myBase(),i,G.counts[i]);}
function updateHall(){drawHall(myBase(),G.counts.filter(function(c){return c>0;}).length,'');}
function treadPrice(i){return Math.round(TREADS[i].price*Math.pow(PRICE_GROWTH,G.qty[i]));}
function updatePad(i){drawPad(myBase(),i,G.qty[i],treadPrice(i));}
function redrawMyBase(){for(var i=0;i<N;i++)updateExhibit(i);for(var j=0;j<TREADS.length;j++)updatePad(j);updateHall();}
/* 내 칸 바꾸기 (방장이 정해줘요). 기지 안에 있으면 새 칸으로 이동 */
function setMySlot(s){
  s=s|0;if(s<0||s>=SLOT_N)s=SLOT_ORDER[0];
  if(s===mySlot)return;
  var old=mySlot;mySlot=s;
  var b=myBase();exhibits=b.ex;pads=b.pads;
  redrawMyBase();
  if(!DG.on&&P.z<BASE_Z1){
    P.x+=slotX(s)-slotX(old);P.kx=P.kz=0;
    camPos.x+=slotX(s)-slotX(old);
  }
  refreshBases(true);
  if(NET.mode!=='solo')toast('🏠 내 기지 칸이 정해졌어요! 노란 이름표 「🏠 내 기지」가 떠 있는 칸이에요','good');
}
/* 칸마다 누가 쓰는지 → 이름표·바닥색·친구 수집품 그리기 */
var basesT=0;
function nArr(a,len){var o=[];for(var i=0;i<len;i++)o.push(Math.max(0,(a&&a[i])|0));return o;}
function refreshBases(force){
  var occ=SLOT_X.map(function(){return [];});
  for(var id in REM){var r=REM[id];if(r.init&&r.slot>=0&&r.slot<SLOT_N)occ[r.slot].push(r);}
  BASES.forEach(function(b,s){
    var list=occ[s],mine=s===mySlot,names=list.map(function(r){return r.name||'친구';});
    var txt=mine?(names.length?'🏠 내 기지 · '+names.join(', '):'🏠 내 기지'):(names.length?'🏠 '+names.join(', ')+'의 기지':'🏠 빈 기지');
    drawSlotTag(b,txt,mine,!mine&&!names.length);
    SLOT_FLOOR[s].material.opacity=mine?0.3:0.18;
    if(mine){if(b.built)b.g.visible=true;return;}
    var o=null;for(var k=0;k<list.length;k++)if(list[k].bc){o=list[k];break;}
    b.owner=o?o.id:null;
    var bb=getBase(s);bb.g.visible=true;
    if(!o){
      /* 빈 칸도 기지 모양은 그대로 보여줘요 (받침대 ? · 잠긴 러닝머신) */
      if(!force&&bb.ok==='empty')return;bb.ok='empty';
      for(var ei=0;ei<N;ei++)drawExhibit(bb,ei,0);
      for(var pj=0;pj<TREADS.length;pj++)drawPad(bb,pj,0,null);
      drawHall(bb,0,'');bb.hk='empty';drawEmptyHall(bb);
      return;
    }
    var key=o.id+'|'+o.bc.join(',')+'|'+(o.bq||[]).join(',')+'|'+o.name;
    if(!force&&bb.ok===key)return;bb.ok=key;
    var got=0;
    for(var i=0;i<N;i++){drawExhibit(bb,i,o.bc[i]|0);if(o.bc[i]>0)got++;}
    for(var j=0;j<TREADS.length;j++)drawPad(bb,j,(o.bq&&o.bq[j])|0,null);
    drawHall(bb,got,o.name||'친구');
  });
}

/* 기지 대문 (가운데) */
(function(){
  var c=document.createElement('canvas');c.width=1024;c.height=200;
  var g=c.getContext('2d');
  g.fillStyle='#0d2b5c';g.fillRect(0,0,1024,200);g.strokeStyle='#4fc3f7';g.lineWidth=10;g.strokeRect(8,8,1008,184);
  g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.font='bold 74px '+FONT;g.fillText('🏠 기지 입구 · 안전존',512,70);
  g.fillStyle='#ffd54a';g.font='bold 48px '+FONT;g.fillText("Steal a Roh",512,142);
  var tex=new THREE.CanvasTexture(c);
  [-1,1].forEach(function(s){
    var m=new THREE.Mesh(new THREE.PlaneGeometry(36,7),new THREE.MeshBasicMaterial({map:tex}));
    m.position.set(0,16.5,BASE_Z1+s*0.7);m.rotation.y=s<0?Math.PI:0;scene.add(m);
  });
  var pm=new THREE.MeshLambertMaterial({color:0x1d4a8f});
  [-29,29].forEach(function(x){var p=new THREE.Mesh(new THREE.BoxGeometry(2,16,2),pm);p.position.set(x,8,BASE_Z1);scene.add(p);});
  var beam=new THREE.Mesh(new THREE.BoxGeometry(60,1.2,1.6),pm);beam.position.set(0,12.6,BASE_Z1);scene.add(beam);
  var top=new THREE.Mesh(new THREE.BoxGeometry(60,1.2,1.6),pm);top.position.set(0,20.4,BASE_Z1);scene.add(top);
})();

/* =========================================================
   상점
   ========================================================= */
var shopBtns=[],shopMeta=[];
TREADS.forEach(function(t,i){
  var row=document.createElement('div');row.className='row';
  var nm=document.createElement('div');nm.className='nm';
  var b=document.createElement('button');
  b.addEventListener('click',function(){buy(i);});
  row.appendChild(nm);row.appendChild(b);$('shopRows').appendChild(row);
  shopBtns.push(b);shopMeta.push(nm);
});
function refreshShop(){refreshSkins();
  TREADS.forEach(function(t,i){
    shopMeta[i].innerHTML='<b style="color:'+(t.color==='#37474f'?'#b0bec5':t.color)+'">'+t.name+' 러닝머신</b> <span style="color:#9fb3c8">보유 '+G.qty[i]+'</span><small>1.5초당 +'+fmt(t.gain)+' 속도'+(G.qty[i]>1?' (현재 +'+fmt(t.gain*G.qty[i])+')':'')+'</small>';
    shopBtns[i].textContent='💰 '+fmt(treadPrice(i));
    shopBtns[i].disabled=G.money<treadPrice(i);
  });
}
function buy(i){
  var pr=treadPrice(i);
  if(G.money<pr){sfx.deny();return;}
  G.money-=pr;G.qty[i]++;sfx.buy();
  toast('🏃 '+TREADS[i].name+' 러닝머신 구매! 기지의 패드 위에 올라가 보세요','good');
  updatePad(i);refreshShop();save();
}

/* =========================================================
   게임 로직
   ========================================================= */
var started=false,saveT=0,hudT=0,toastWarnT=0;
var keys={},joy={x:0,y:0},wantJump=false,jumpHeld=false;
var cam={yaw:Math.PI,pitch:0.42,dist:17},camPos=new THREE.Vector3(slotX(mySlot),10,-10);
var wasSafe=true;

function wake(n){
  n.state='chase';n.nextCharge=rand(1,9);n.tearT=0;n.cryT=0;
  var d=Math.hypot(P.x-n.ch.root.position.x,P.z-n.ch.root.position.z);
}
function comboMult(){return 1+0.1*Math.min(G.streak,10);}
function trySteal(){
  if(started&&DG.on){dgAttack();return;}
  if(started&&P.stun<=0&&P.carry<0&&Math.hypot(P.x-PORTAL.x,P.z-PORTAL.z)<5){enterDungeon();return;}
  if(!started||P.stun>0)return;
  if(P.carry>=0){toast('이미 아이템을 들고 있어! 기지로 가자','warn');return;}
  var rd=findRaid();if(rd){startRaid(rd);return;}
  var best=null,bd=6;
  for(var k=0;k<npcs.length;k++){
    var n=npcs[k],d=Math.hypot(P.x-n.ped.x,P.z-n.ped.z);
    if(d<bd){bd=d;best=n;}
  }
  if(!best)return;
  if(!best.ped.has){toast('받침대가 비었어! 곧 다시 생겨','warn');sfx.deny();return;}
  if(best.state!=='sleep'){toast('이미 깨어 있어!','warn');sfx.deny();return;}
  if(isClient()){
    /* 친구 방: 방장에게 "훔쳐도 돼?" 물어보고 허락받으면 들기 */
    var nowS=performance.now();if(stealPend>nowS)return;
    stealPend=nowS+1500;sendHost({t:'steal',i:best.i});return;
  }
  hostTake(NET.my,best);
  grantSteal(best.i);
}
var stealPend=0;
/* 방장(혼자일 때도): 받침대 비우고 주인을 깨워서 그 사람을 쫓게 함 */
function hostTake(id,n){
  n.ped.has=false;n.ped.t=RESPAWN;n.tg=id;n.carrier=id;wake(n);
  if(id!==NET.my&&REM[id])REM[id].carry=n.i;
}
function hostSteal(id,i,reply){
  var n=npcs[i],r=REM[id];
  if(!n||!r){reply(false,'훔치기 실패');return;}
  if(r.carry>=0){reply(false,'이미 아이템을 들고 있어!');return;}
  if(!n.ped.has){reply(false,'받침대가 비었어! 곧 다시 생겨');return;}
  if(n.state!=='sleep'){reply(false,'다른 친구가 먼저 훔쳤어!');return;}
  hostTake(id,n);reply(true);
}
function hostDrop(id,i){
  var n=npcs[i],r=REM[id];if(r)r.carry=-1;if(!n)return;
  if(n.carrier===id){n.carrier=null;if(!n.ped.has){n.ped.has=true;n.ped.pop=0;}}
  if(n.tg===id&&(n.state==='chase'||n.state==='charge')){n.state='return';n.tg=null;hideAim(n);}
}
function hostDep(id,i){
  var n=npcs[i],r=REM[id];if(r)r.carry=-1;if(!n)return;
  if(n.carrier===id)n.carrier=null;
  if(n.tg===id&&(n.state==='chase'||n.state==='charge')){n.state='return';n.tg=null;hideAim(n);}
}
function grantSteal(i){
  var best=npcs[i];
  if(P.carry>=0)return;
  best.ped.has=false;
  P.carry=best.i;
  holdTrophies.forEach(function(t,k){t.visible=(k===P.carry);});
  burst(best.ped.x,3,best.ped.z,'#ffe082',26,9);
  sfx.steal();
  var reward=Math.round((best.cfg.income*15+5)*comboMult());G.money+=reward;
  floatText('+💰 '+fmt(reward),VW()/2,VH()*0.4,0,'money');
  burst(P.x,5,P.z,'#ffd54a',18,7);
  toast('🏆 '+best.cfg.name+'의 ['+gradeOf(best.i).name+'] 큰 손을 훔쳤다! 💰+'+fmt(reward)+' 기지로 도망쳐!','good');
  wake(best);
}
function dropItem(){
  if(P.carry<0)return -1;
  if(P.raid){var ri=P.carry;sendPeer(P.raid,{t:'raidBack',i:ri,why:'drop'});P.carry=-1;P.raid=null;holdTrophies.forEach(function(t){t.visible=false;});return ri;}
  var i=P.carry,n=npcs[i];
  if(!n.ped.has){n.ped.has=true;n.ped.pop=0;}
  if(isClient())sendHost({t:'drop',i:i});else n.carrier=null;
  P.carry=-1;holdTrophies.forEach(function(t){t.visible=false;});
  return i;
}
function hitPlayer(n,pw,kx,kz){
  if(P.stun>0||inSafe())return;
  P.stun=STUN*(1+0.9*(pw||0));hitFx(pw,kx,kz);
  var wasRaid=!!P.raid,i=dropItem();
  burst(P.x,3,P.z,'#ffffff',22,8);burst(P.x,3,P.z,'#ffd54a',14,6);
  if(!(i>=0&&playCaught()))sfx.hit();
  if(i>=0&&G.streak>=2)toast('💔 콤보 '+G.streak+' 끊김...','bad');
  if(i>=0)G.streak=0;
  toast(i>=0?(wasRaid?'💥 맞았다! 훔친 큰 손이 주인에게 돌아갔어':'💥 잡혔다! 큰 손이 받침대로 돌아갔어'):'💥 맞았다!','bad');
  if(i>=0&&!wasRaid){var o=npcs[i];if(o.state==='chase'||o.state==='charge'){o.state='return';o.tg=null;hideAim(o);}}
}
/* =========================================================
   친구 기지 털기
   - 친구 칸 트로피 앞에서 [E] → 주인에게 "하나 가져갈게" 요청 → 주인 쪽에서 하나 빠짐
   - 내 칸(노란 이름표)까지 들고 가면 내 것 · 가는 길에 주인 몸에 닿으면 잡혀서 돌려줌
   - 들고 있다가 NPC에게 맞거나, 도둑이 나가버리면 주인에게 돌아가요
   ========================================================= */
var RAID_RANGE=3.6, RAID_CATCH=2.6, RAIDS_OUT={}, raidPend=0;
P.raid=null;P.raidName='';
function inMySlot(){return P.z<BASE_Z1&&Math.abs(P.x-slotX(mySlot))<SLOT_W/2;}
function slotAt(x,z){if(z>=BASE_Z1)return -1;var s=Math.floor((x+BASE_XMAX)/SLOT_W);return s>=0&&s<SLOT_N?s:-1;}
function findRaid(){
  if(NET.mode==='solo'||DG.on||P.carry>=0||P.stun>0)return null;
  var s=slotAt(P.x,P.z);if(s<0||s===mySlot)return null;
  var b=BASES[s];if(!b.built||!b.owner)return null;
  var o=REM[b.owner];if(!o||!o.bc)return null;
  var best=null,bd=RAID_RANGE;
  for(var i=0;i<N;i++){
    if(!(o.bc[i]>0))continue;
    var e=b.ex[i],d=Math.hypot(P.x-e.x,P.z-e.z);
    if(d<bd){bd=d;best={b:b,o:o,i:i,e:e};}
  }
  return best;
}
function startRaid(rd){
  var now=performance.now();if(raidPend>now)return;
  raidPend=now+1500;
  sendPeer(rd.o.id,{t:'raid',i:rd.i});
}
function raidName(id){var r=REM[id];return (r&&r.name)||'친구';}
function raidRefund(i,msg){
  G.counts[i]++;updateExhibit(i);updateHall();
  var e=exhibits[i];burst(e.x,3,e.z,'#7fffd4',24,8);
  toast(msg,'good');save();
}
function onRaidMsg(m){
  var from=m.from,i=m.i|0;if(!from||i<0||i>=N)return;
  switch(m.t){
    case 'raid': /* 주인: 누가 내 트로피를 가져가려 해요 */
      var ok=G.counts[i]>0&&RAIDS_OUT[from]===undefined;
      if(ok){
        G.counts[i]--;RAIDS_OUT[from]=i;updateExhibit(i);updateHall();save();
        var e=exhibits[i];burst(e.x,3,e.z,'#ff5252',26,9);
        sfx.deny();
        toast('🚨 '+raidName(from)+' 님이 내 ['+gradeOf(i).name+'] 큰 손을 훔쳐갔어! 쫓아가서 몸으로 잡아!','bad');
      }
      sendPeer(from,{t:'raidR',i:i,ok:ok?1:0});
      break;
    case 'raidR': /* 도둑: 주인 대답 */
      raidPend=0;
      if(!m.ok){toast('이미 다른 사람이 가져갔어!','warn');sfx.deny();break;}
      if(P.carry>=0||DG.on){sendPeer(from,{t:'raidBack',i:i,why:'drop'});break;}
      P.carry=i;P.raid=from;P.raidName=raidName(from);
      holdTrophies.forEach(function(t,k){t.visible=(k===i);});
      burst(P.x,5,P.z,'#ffd54a',22,8);sfx.steal();
      toast('🦝 '+P.raidName+'의 ['+gradeOf(i).name+'] 큰 손을 훔쳤다! 노란 「🏠 내 기지」 칸으로 가져가! 주인에게 닿으면 뺏겨요','good');
      break;
    case 'raidBack': /* 주인: 돌려받음 */
      if(RAIDS_OUT[from]===undefined)break;
      var bi=RAIDS_OUT[from];delete RAIDS_OUT[from];
      raidRefund(bi,m.why==='caught'?'🛡️ 도둑 '+raidName(from)+' 님을 잡았다! ['+gradeOf(bi).name+'] 큰 손을 되찾았어':'🛡️ '+raidName(from)+' 님이 떨어뜨려서 ['+gradeOf(bi).name+'] 큰 손이 돌아왔어');
      break;
    case 'raidDone': /* 주인: 결국 뺏김 */
      if(RAIDS_OUT[from]===undefined)break;
      delete RAIDS_OUT[from];
      toast('😭 '+raidName(from)+' 님이 내 ['+gradeOf(i).name+'] 큰 손을 자기 기지로 가져갔어...','bad');
      break;
  }
}
/* 도둑: 주인 몸에 닿으면 잡힘 */
function raidCatchCheck(){
  if(P.stun>0)return;
  var r=REM[P.raid];if(!r||!r.init||r.dg||r.stun)return;
  if(Math.hypot(r.x-P.x,r.z-P.z)<RAID_CATCH&&Math.abs(r.y-P.y)<2.4){
    var i=P.carry,nm=P.raidName;
    sendPeer(P.raid,{t:'raidBack',i:i,why:'caught'});
    P.carry=-1;P.raid=null;holdTrophies.forEach(function(t){t.visible=false;});
    P.stun=STUN;hitFx(0,0,0);burst(P.x,3,P.z,'#ffffff',22,8);sfx.hit();
    toast('💥 '+nm+' 님에게 잡혔다! 큰 손을 돌려줬어','bad');
  }
}
/* 도둑: 내 칸에 도착 → 내 것! */
function raidDeposit(){
  var i=P.carry,o=P.raid,nm=P.raidName;
  G.counts[i]++;P.carry=-1;P.raid=null;holdTrophies.forEach(function(t){t.visible=false;});
  updateExhibit(i);updateHall();
  var e=exhibits[i];burst(e.x,3,e.z,'#ffd54a',30,9);
  sfx.deposit();
  toast('✅ '+nm+' 님의 ['+gradeOf(i).name+'] 큰 손을 내 기지로 가져왔다! (+'+fmt(npcs[i].cfg.income)+'/초)','good');
  sendPeer(o,{t:'raidDone',i:i});
  save();
}
function deposit(){
  var i=P.carry,n=npcs[i];
  G.counts[i]++;G.streak++;P.carry=-1;holdTrophies.forEach(function(t){t.visible=false;});
  updateExhibit(i);updateHall();
  var e=exhibits[i];burst(e.x,3,e.z,'#ffd54a',30,9);
  sfx.deposit();
  toast('✅ 획득! ['+gradeOf(i).name+'] 큰 손 · '+n.cfg.name+' (+'+fmt(n.cfg.income)+'/초)','good');
  floatText('+'+fmt(n.cfg.income)+'/초',VW()/2,VH()*0.45,0,'money');
  var dBonus=Math.round(n.cfg.income*20*comboMult());G.money+=dBonus;
  floatText('🔥 콤보 ×'+G.streak+' · 입금 보너스 +'+fmt(dBonus),VW()/2,VH()*0.52,0,'money');
  if(isClient())sendHost({t:'dep',i:i});else n.carrier=null;
  if(n.state==='chase'||n.state==='charge'){n.state='return';n.tg=null;hideAim(n);}
  save();
}
function hideAim(n){n.aim.visible=false;n.aimX[0].visible=false;n.aimX[1].visible=false;}
var PAT_LABEL=['⚠️ 발사 주의! 조준선을 피해!','⚠️ 2연발 주의! 한 번 더 와요!','⚠️ 부채꼴 3발! 점프하거나 크게 벗어나요!'];
var pendingShots=[];
function spawnProj(rp,ang,sp){
  var ux=Math.sin(ang),uz=Math.cos(ang);
  var m=makeProj(2.6);m.position.set(rp.x+ux*4,1.3,rp.z+uz*4);scene.add(m);
  projectiles.push({mesh:m,vx:ux*sp,vz:uz*sp,life:6});
}
function shoot(n){cast(n);return;
  var rp=n.ch.root.position,dx=P.x-rp.x,dz=P.z-rp.z,ang=Math.atan2(dx,dz),sp=n.move*1.5;
  if(n.pat===2){spawnProj(rp,ang-0.2,sp);spawnProj(rp,ang,sp);spawnProj(rp,ang+0.2,sp);}
  else{spawnProj(rp,ang,sp);if(n.pat===1)pendingShots.push({n:n,t:0.32});}
  n.state='chase';n.nextCharge=rand(1,9);n.ballHide=0.9;hideAim(n);n.ball.visible=false;
  var now=performance.now()/1000;
  if(AC&&Math.hypot(dx,dz)<120&&now-lastShootSfx>0.15){lastShootSfx=now;sfx.shoot();}
}
/* =========================================================
   수호자 고유 스킬 (속도↑ → 이펙트 화려 + 위력↑)
   p = 0(가장 느림) ~ 1(가장 빠름): 속도를 로그 스케일로 정규화
   ========================================================= */
P.vx=P.vz=P.kx=P.kz=0;
var shk=0,flashA=0,sx0=P.x,sz0=P.z,flashEl=document.createElement('div');
flashEl.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:14;opacity:0;background:#fff';
document.body.appendChild(flashEl);
function pwr(n){return clamp(Math.log(n.cfg.speed/SPEED_MIN)/Math.log(SPEED_MAX/SPEED_MIN),0,1);}
function pcol(c,p,k){return p>0.8?'hsl('+(((k*47+clock*220)%360)|0)+',95%,62%)':c;}
var ringG=new THREE.RingGeometry(0.88,1,48).rotateX(-Math.PI/2),discG=new THREE.CircleGeometry(1,40).rotateX(-Math.PI/2),
    pilG=new THREE.CylinderGeometry(1,1,1,16,1,true).translate(0,0.5,0),boxG=new THREE.BoxGeometry(1,1,1);
function gm(c,o){return new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});}
function mk(g,m,x,y,z){var o=new THREE.Mesh(g,m);o.position.set(x,y,z);scene.add(o);return o;}
var HZ=[];
function addH(o){HZ.push(o);return o;}
function after(d,f){HZ.push({t:d,q:1,f:f});}
function pred(d){return {x:P.x+P.vx*d*0.8,z:P.z+P.vz*d*0.8};}
function nearVol(x,z){return Math.hypot(P.x-x,P.z-z);}

function hitFx(pw,kx,kz){
  pw=pw||0;shk=Math.max(shk,1+pw*3);flashA=Math.max(flashA,0.15+pw*0.5);
  var m=Math.hypot(kx||0,kz||0),v=8+pw*42;
  if(m>0){P.kx=kx/m*v;P.kz=kz/m*v;}
  floatText('💥 위력 '+Math.round(100+pw*400)+'%',VW()/2,VH()*0.33,0,'money');
  if(pw>0.4)for(var i=0;i<60*pw*fxMul;i++)emit(P.x,3,P.z,rand(-14,14),rand(2,16),rand(-14,14),pcol('#ffffff',pw,i),rand(0.5,1),20);
}
function fxBoom(x,z,r,col,pw){
  var nR=fxLevel?1+Math.floor(pw*3):1,i;
  for(i=0;i<nR;i++)(function(i){
    var m=gm(col,0.9),o=mk(ringG,m,x,0.4+i*0.1,z),t=-i*0.08;
    addH({u:function(dt){t+=dt;var k=Math.max(0,t)/0.5,s=r*(0.3+k*1.1);o.scale.set(s,1,s);m.opacity=Math.max(0,0.9-k);return k>=1;},x:function(){scene.remove(o);m.dispose();}});
  })(i);
  if(fxLevel&&pw>0.2){
    var hgt=5+pw*40,pm=gm(col,0.55),pl=mk(pilG,pm,x,0,z),t2=0;
    addH({u:function(dt){t2+=dt;var k=t2/0.6,w=r*0.45*(1-k*0.6);pl.scale.set(w,hgt*(0.4+k*0.6),w);pm.opacity=0.55*(1-k);return k>=1;},x:function(){scene.remove(pl);pm.dispose();}});
  }
  var n=(14+pw*110)*fxMul;
  for(i=0;i<n;i++){var a=Math.random()*6.283,s=rand(0.3,1)*(6+r*1.4+pw*10);emit(x+Math.cos(a)*r*0.2,0.5,z+Math.sin(a)*r*0.2,Math.cos(a)*s,rand(2,8+pw*16),Math.sin(a)*s,pcol(col,pw,i),rand(0.5,1.1),22);}
  var d=nearVol(x,z);
  shk=Math.max(shk,(0.4+pw*2.4)*clamp(1-d/90,0,1));
  if(pw>0.45)flashA=Math.max(flashA,(pw-0.35)*0.7*clamp(1-d/60,0,1));
  if(AC&&d<140){noise(0.25+pw*0.6,0.25+pw*0.5,400+pw*1800);tone(180-pw*110,0.25+pw*0.4,'sawtooth',0.12+pw*0.18,-60);if(pw>0.6)tone(70,0.6,'sine',0.3,-30);}
}
/* 바닥 폭발 구역: 경고 → 폭발. 점프로 피할 수 있음 */
function Z(x,z,r,d,col,pw,o){
  o=o||{};x=clamp(x,-28,28);
  var fm=gm(0xff2020,0.2),fill=mk(discG,fm,x,0.2,z),rg=mk(ringG,gm(col,0.9),x,0.22,z),
      rg2=pw>0.3&&fxLevel?mk(ringG,gm(col,0.6),x,0.24,z):null,rg3=pw>0.7&&fxLevel?mk(ringG,gm(0xffffff,0.5),x,0.26,z):null,t=0;
  rg.scale.set(r,1,r);
  addH({u:function(dt){
    t+=dt;var k=Math.min(1,t/d);
    fill.scale.set(r*k,1,r*k);fm.opacity=0.15+0.3*k;rg.rotation.y=t*3;
    if(rg2){rg2.rotation.y=-t*4;rg2.scale.set(r*0.7,1,r*0.7);}
    if(rg3){rg3.rotation.y=t*6;rg3.scale.set(r*0.4,1,r*0.4);}
    if(o.pull&&!inSafe()){var dx=x-P.x,dz=z-P.z,dd=Math.hypot(dx,dz)||1;if(dd<r*1.6){P.x+=dx/dd*o.pull*dt;P.z+=dz/dd*o.pull*dt;}}
    if(t<d)return 0;
    if(!inSafe()&&P.stun<=0&&nearVol(x,z)<r&&P.y<(o.hi||1.6)){var a=Math.atan2(P.x-x,P.z-z);hitPlayer(o.n,pw,Math.sin(a),Math.cos(a));}
    fxBoom(x,z,r,col,pw);return 1;
  },x:function(){scene.remove(fill);scene.remove(rg);fm.dispose();rg.material.dispose();
    if(rg2){scene.remove(rg2);rg2.material.dispose();}if(rg3){scene.remove(rg3);rg3.material.dispose();}}});
}
/* 발사체 (유도/지면형 옵션) */
function O(n,ang,sp,size,col,pw,o){
  o=o||{};
  var rp=n.ch.root.position,ux=Math.sin(ang),uz=Math.cos(ang),s=makeProj(size);
  s.position.set(rp.x+ux*4,1.3,rp.z+uz*4);scene.add(s);
  var hm=new THREE.SpriteMaterial({map:haloTex,color:col,transparent:true,opacity:0.9,depthWrite:false,blending:THREE.AdditiveBlending}),h=new THREE.Sprite(hm),hs=size*(1.6+pw*2.2);
  h.scale.set(hs,hs,1);h.renderOrder=3;scene.add(h);
  var vx=ux*sp,vz=uz*sp,life=o.life||6,hr=o.hr||size*0.55;
  addH({u:function(dt){
    var TT=o.T||P;
    if(o.turn&&TT.z>=BASE_Z1){var ca=lerpAngle(Math.atan2(vx,vz),Math.atan2(TT.x-s.position.x,TT.z-s.position.z),Math.min(1,o.turn*dt));vx=Math.sin(ca)*sp;vz=Math.cos(ca)*sp;}
    s.position.x+=vx*dt;s.position.z+=vz*dt;h.position.copy(s.position);s.material.rotation+=dt*14;life-=dt;
    var tr=(4+pw*40)*dt*fxMul;
    for(var i=0;i<tr;i++)emit(s.position.x+rand(-.5,.5),1.2+rand(-.4,.4),s.position.z+rand(-.5,.5),-vx*0.12+rand(-2,2),rand(-1,3),-vz*0.12+rand(-2,2),pcol(col,pw,i),rand(0.3,0.7),4);
    if(!inSafe()&&P.stun<=0&&nearVol(s.position.x,s.position.z)<hr&&P.y<(o.gnd?1.8:2.2)){
      hitPlayer(n,pw,vz/sp,-vx/sp);if(pw>0.3)fxBoom(s.position.x,s.position.z,size*(1+pw*1.5),col,pw*0.7);life=0;
    }
    return life<=0||Math.abs(s.position.x)>45;
  },x:function(){scene.remove(s);scene.remove(h);s.material.dispose();hm.dispose();}});
}
/* 광선: 가늘게 경고 → 굵게 발사. 옆으로 피해야 함 */
function Bm(n,ang,w,tel,dur,col,pw){
  var rp=n.ch.root.position,x0=rp.x,z0=rp.z,L=170,ux=Math.sin(ang),uz=Math.cos(ang),m=gm(0xff2020,0.5),b=mk(boxG,m,x0+ux*L/2,1.4,z0+uz*L/2),t=0,hit=0;
  b.rotation.y=ang;b.scale.set(0.5,0.2,L);
  addH({u:function(dt){
    t+=dt;
    if(t<tel){m.opacity=(Math.floor(t*16)%2)?0.7:0.15;return 0;}
    if(t-dt<tel){m.color.set(col);b.scale.y=w*0.8+1.5;}
    var k=(t-tel)/dur;b.scale.x=w*(1-k*0.4)*(0.85+0.15*Math.sin(t*60));m.opacity=0.85*(1-k*k);
    var tx=P.x-x0,tz=P.z-z0,al=tx*ux+tz*uz,sd=tx*uz-tz*ux;
    if(!hit&&!inSafe()&&P.stun<=0&&al>0&&al<L&&Math.abs(sd)<w*0.5+0.8&&P.y<4){hit=1;var sg=sd>=0?1:-1;hitPlayer(n,pw,uz*sg,-ux*sg);}
    var tr=(10+pw*60)*dt*fxMul;
    for(var i=0;i<tr;i++){var q=rand(3,L);emit(x0+ux*q+rand(-w,w)*0.5,rand(0.5,3),z0+uz*q+rand(-w,w)*0.5,rand(-3,3),rand(0,5),rand(-3,3),pcol(col,pw,i),0.5,10);}
    return k>=1;
  },x:function(){scene.remove(b);m.dispose();}});
}
/* 휩쓸기 벽: 점프로 넘기 */
function Wl(n,col,pw){
  var z=n.ch.root.position.z,m=gm(0xff2020,0.3),h=0.9+pw*0.7,b=mk(boxG,m,0,h/2*2,z),t=0,vz=-(n.move*1.2+10+pw*30),th=1.4+pw*2,hit=0;
  b.scale.set(60,h*2,th);b.position.y=h;
  addH({u:function(dt){
    t+=dt;
    if(t<0.7){m.opacity=(Math.floor(t*14)%2)?0.55:0.15;return 0;}
    if(t-dt<0.7)m.color.set(col);
    m.opacity=0.8;b.position.z+=vz*dt;
    if(!hit&&!inSafe()&&P.stun<=0&&Math.abs(P.z-b.position.z)<th/2+0.9&&P.y<h*2-0.1){hit=1;hitPlayer(n,pw,0,-1);}
    var tr=(20+pw*100)*dt*fxMul;
    for(var i=0;i<tr;i++)emit(rand(-29,29),rand(0.3,h*2),b.position.z+rand(-1,1),rand(-2,2),rand(0,4),-vz*0.2,pcol(col,pw,i),0.4,6);
    return b.position.z<P.z-30||b.position.z<Z0;
  },x:function(){scene.remove(b);m.dispose();}});
}
/* 파동: 중심에서 퍼지는 고리. 점프로 넘기 */
function Wv(n,x,z,R,col,pw){
  x=clamp(x,-28,28);
  var m=gm(col,0.9),o=mk(ringG,m,x,0.3,z),m2=gm(0xff2020,0.2),f=mk(discG,m2,x,0.2,z),t=0,hit=0;
  f.scale.set(R,1,R);
  addH({u:function(dt){
    t+=dt;
    if(t<0.7){o.scale.set(R,1,R);m.opacity=(Math.floor(t*14)%2)?0.8:0.2;m2.opacity=0.1+0.2*t;return 0;}
    var k=(t-0.7)/0.55,rr=Math.max(0.1,R*k);o.scale.set(rr,1,rr);m.opacity=0.95;m2.opacity=0.06;
    if(!hit&&!inSafe()&&P.stun<=0&&Math.abs(nearVol(x,z)-rr)<2.2+pw*2&&P.y<1.5){hit=1;var a=Math.atan2(P.x-x,P.z-z);hitPlayer(n,pw,Math.sin(a),Math.cos(a));}
    var c=(8+pw*40)*dt*fxMul;
    for(var i=0;i<c;i++){var a2=Math.random()*6.283;emit(x+Math.cos(a2)*rr,0.5,z+Math.sin(a2)*rr,Math.cos(a2)*4,rand(1,6),Math.sin(a2)*4,pcol(col,pw,i),0.5,12);}
    if(k>=1){fxBoom(x,z,R*0.3,col,pw*0.6);return 1;}return 0;
  },x:function(){scene.remove(o);scene.remove(f);m.dispose();m2.dispose();}});
}
function sfan(n,a,sp,size,c,p,list){list.forEach(function(d){O(n,a+d,sp,size,c,p);});}
/* 스킬 목록: nm 이름 · na 조준선 숨김 · fan 부채꼴 조준선 · tip 경고 문구 */
var SK=[
 {nm:'맘마 탄',col:'#ffe0b2',tip:'조준선을 피해!',f:function(n,p,a,c){O(n,a,n.move*1.5,2.4+p*3,c,p);}},
 {nm:'주머니 폭탄',col:'#7fd3ff',na:1,tip:'붉은 원 밖으로!',f:function(n,p,a,c,q){Z(q.x,q.z,5+p*13,1.0,c,p,{n:n});}},
 {nm:'뿔 돌진',col:'#ffcc80',na:1,tip:'돌진! 거리를 벌려요!',f:function(n,p,a,c){n.dash=0.7+0.6*p;n.dashM=2.2+2.4*p;fxBoom(n.ch.root.position.x,n.ch.root.position.z,6+p*8,c,p*0.8);}},
 {nm:'토마토 투척',col:'#ff5252',na:1,tip:'토마토 폭격! 원을 피해요!',f:function(n,p,a,c,q){for(var k=0;k<3+Math.floor(p*4);k++)(function(k){after(k*0.12,function(){Z(q.x+rand(-1,1)*(7+p*8),q.z+rand(-1,1)*(7+p*8),4+p*6,0.9,c,p,{n:n});});})(k);}},
 {nm:'발롬 광선',col:'#69f0ae',tip:'광선! 옆으로 크게 피해요!',f:function(n,p,a,c){Bm(n,a,3+p*9,0.75,0.45+p*0.6,c,p);}},
 {nm:'채찍 휩쓸기',col:'#fff176',na:1,tip:'휩쓸기! 점프로 넘어요!',f:function(n,p,a,c){Wl(n,c,p);if(p>0.5)after(0.9,function(){Wl(n,c,p);});}},
 {nm:'저승 유도탄',col:'#b388ff',tip:'유도탄! 계속 방향을 틀어요!',f:function(n,p,a,c,q,rp,T){O(n,a,n.move*1.1,3+p*3.5,c,p,{turn:0.9+p*1.6,life:4+p*2,T:T});}},
 {nm:'유칼립 비',col:'#a5d6a7',na:1,tip:'비처럼 쏟아져요!',f:function(n,p,a,c,q){for(var k=0;k<6+Math.floor(p*12);k++)after(k*0.12,function(){Z(q.x+rand(-1,1)*(12+p*10),q.z+rand(-1,1)*(14+p*10),3+p*3,0.9,c,p,{n:n});});}},
 {nm:'하트 링',col:'#ff80ab',na:1,tip:'링 한가운데가 안전해요!',f:function(n,p,a,c,q){var k=5+Math.floor(p*5),R=10+p*6;for(var i=0;i<k;i++){var g=i/k*6.283;Z(q.x+Math.cos(g)*R,q.z+Math.sin(g)*R,5+p*4,1.1,c,p,{n:n});}}},
 {nm:'얼음 가시 대로',col:'#80deea',na:1,tip:'가시가 몰려와요! 옆으로!',f:function(n,p,a,c,q,rp){var k=4+Math.floor(p*7),dx=Math.sin(a),dz=Math.cos(a);for(var i=0;i<k;i++)Z(q.x+dx*(k-1-i)*9,q.z+dz*(k-1-i)*9,4+p*5,0.7+i*0.14,c,p,{n:n});}},
 {nm:'중력 우물',col:'#ce93d8',na:1,tip:'중력장! 원 밖으로 벗어나요!',f:function(n,p,a,c,q){Z(q.x,q.z,9+p*12,1.7,c,p,{n:n,pull:12+p*30});}},
 {nm:'속사 연발',col:'#ffab40',tip:'속사! 좌우로 흔들어요!',f:function(n,p,a,c,q,rp,T){for(var k=0;k<4+Math.floor(p*8);k++)after(k*0.09,function(){O(n,Math.atan2(T.x-rp.x,T.z-rp.z)+rand(-.05,.05),n.move*1.7,2.2+p*2.5,c,p);});}},
 {nm:'번개 폭풍',col:'#fff59d',na:1,tip:'낙뢰! 계속 움직여요!',f:function(n,p,a,c,q,rp,T){for(var k=0;k<4+Math.floor(p*9);k++)after(k*0.1,function(){Z(T.x+rand(-1,1)*12,T.z+(T.vz||0)*0.5+rand(-1,1)*12,3+p*2.5,0.7+rand(0,0.3),c,p,{n:n,hi:2.5});});}},
 {nm:'신수 낙하',col:'#ff7043',na:1,tip:'거대 낙하! 멀리 벗어나요!',f:function(n,p,a,c,q){Z(q.x,q.z,12+p*15,1.4,c,p,{n:n,hi:2.2});}},
 {nm:'불꽃 회오리',col:'#ff6e40',tip:'회오리! 점프로 넘거나 돌아가요!',f:function(n,p,a,c,q,rp,T){O(n,a,n.move*0.6,5+p*5,c,p,{turn:0.6+p*0.8,life:7,hr:3+p*3,gnd:1,T:T});}},
 {nm:'뿔 삼연포',col:'#ffd180',fan:1,tip:'3연 부채꼴! 점프하거나 크게 벗어나요!',f:function(n,p,a,c){sfan(n,a,n.move*1.9,3.5+p*4,c,p,[-0.2,0,0.2]);}},
 {nm:'붉은 파동',col:'#ff1744',na:1,tip:'파동! 점프로 넘어요!',f:function(n,p,a,c,q){for(var k=0;k<2+Math.floor(p*3);k++)(function(k){after(k*0.35,function(){Wv(n,q.x,q.z,10+p*20,c,p);});})(k);}},
 {nm:'신의 심판',col:'#ffd700',na:1,fan:1,tip:'심판! 광선·낙하·탄막 동시!',f:function(n,p,a,c,q){Bm(n,a,5+p*8,0.9,0.8,c,p);after(0.3,function(){for(var k=0;k<6;k++)Z(q.x+rand(-1,1)*16,q.z+rand(-1,1)*16,7,1.0,c,p,{n:n});sfan(n,a,n.move*1.6,4+p*3,c,p,[-0.35,-0.17,0,0.17,0.35]);});}}
];
function skillWarn(n){var s=SK[n.i];return '⚠️ '+n.cfg.name+' ['+s.nm+'] '+s.tip;}
var lastCastT=0;
/* 방장이 스킬 발동을 결정 → 모두에게 전달 → 각자 화면에서 똑같이 재생 (맞았는지는 각자 판정) */
function cast(n){
  var T=tgtObj(n.tg)||P,rp=n.ch.root.position,a=Math.atan2(T.x-rp.x,T.z-rp.z),q={x:T.x+(T.vx||0)*0.8,z:T.z+(T.vz||0)*0.8};
  n.state='chase';n.nextCharge=rand(1,9);
  bcast({t:'cast',i:n.i,a:r3(a),qx:r2(q.x),qz:r2(q.z),tg:n.tg,rx:r2(rp.x),rz:r2(rp.z)});
  runCast(n,a,q,T);
}
function runCast(n,a,q,T){
  var s=SK[n.i],p=pwr(n),rp=n.ch.root.position;
  s.f(n,p,a,s.col,q,rp,T);
  n.ballHide=0.9;hideAim(n);n.ball.visible=false;
  var cnt=(10+p*80)*fxMul;
  for(var i=0;i<cnt;i++)emit(rp.x+rand(-3,3),rand(1,n.cfg.h*0.8),rp.z+rand(-3,3),rand(-9,9)*(1+p),rand(0,10),rand(-9,9)*(1+p),pcol(s.col,p,i),rand(0.5,1),12);
  if(fxLevel&&p>0.25)fxBoom(rp.x,rp.z,4+p*10,s.col,p*0.5);
  if(AC&&nearVol(rp.x,rp.z)<120){sfx.shoot();if(p>0.5)tone(110,0.4,'sawtooth',0.2,-40);}
  var now=performance.now()/1000;
  if(now-lastCastT>1.2&&nearVol(rp.x,rp.z)<200){lastCastT=now;toast('⚔️ '+n.cfg.name+' · '+s.nm+'! (위력 '+Math.round(100+p*400)+'%)','warn');}
}
function updateSkills(dt){
  P.vx+=((P.x-sx0)/Math.max(dt,0.001)-P.vx)*Math.min(1,dt*8);
  P.vz+=((P.z-sz0)/Math.max(dt,0.001)-P.vz)*Math.min(1,dt*8);
  if(Math.abs(P.kx)+Math.abs(P.kz)>0.1){
    P.x+=P.kx*dt;P.z+=P.kz*dt;clampP();
    var dc=Math.exp(-5*dt);P.kx*=dc;P.kz*=dc;
  }
  sx0=P.x;sz0=P.z;
  for(var j=HZ.length-1;j>=0;j--){
    var h=HZ[j];
    if(h.q){h.t-=dt;if(h.t<=0){HZ.splice(j,1);h.f();}continue;}
    if(h.u(dt)){HZ.splice(j,1);h.x();}
  }
  for(var k=0;k<npcs.length;k++){
    var n=npcs[k],rp=n.ch.root.position,p=pwr(n);
    if(n.dash>0){
      n.dash-=dt;
      var DT=tgtObj(n.tg);
      if(n.state==='chase'&&DT&&hostSide()){
        var dx=DT.x-rp.x,dz=DT.z-rp.z,dd=Math.hypot(dx,dz)||1;
        rp.x+=dx/dd*n.move*n.dashM*dt;rp.z+=dz/dd*n.move*n.dashM*dt;
        var tn=(20+p*120)*dt*fxMul;for(var q=0;q<tn;q++)emit(rp.x+rand(-3,3),rand(0.5,n.cfg.h*0.7),rp.z+rand(-2,2)-dz/dd*3,rand(-3,3),rand(0,4),-dz/dd*rand(4,14),pcol(SK[n.i].col,p,q),0.5,6);
      }else n.dash=0;
    }
    if(n.state==='charge'){
      var cc=(3+p*40)*dt*fxMul;
      for(var c=0;c<cc;c++){var g=Math.random()*6.283;emit(rp.x+Math.cos(g)*7,rand(0.5,n.cfg.h*0.8),rp.z+Math.sin(g)*7,-Math.cos(g)*12,rand(0,3),-Math.sin(g)*12,pcol(SK[n.i].col,p,c),0.5,0);}
    }
  }
  shk*=Math.exp(-6*dt);flashA*=Math.exp(-5*dt);
  flashEl.style.opacity=flashA>0.01?flashA.toFixed(3):'0';
}


/* =========================================================
   캐릭터 스킨 (사진 컷아웃) — 비쌀수록 러닝머신 속도 획득 배율 ↑
   ========================================================= */
var SKINS=[
  {name:'브론즈 캐릭터',price:3000000,mult:2,color:'#cd7f32',o:{skin:'#d1aa92',hair:'#35312a',suit:'#192634',stripe:'#2b3d52',shirt:'#f1f4f7',collar:'#ffffff',tie:'#c9788f',knot:'#a85a72'}},
  {name:'실버 캐릭터',price:30000000,mult:4,color:'#d5dbe2',o:{skin:'#e3b2a1',hair:'#6a6368',suit:'#2c3744',stripe:'#46566a',shirt:'#c9ddee',collar:'#dbe9f5',tie:'#2a2d4a',knot:'#1c1f38'}},
  {name:'골드 캐릭터',price:300000000,mult:8,color:'#ffc107',o:{skin:'#fbcba5',hair:'#211a15',suit:'#2a3631',stripe:'#42564d',shirt:'#dfe9ee',collar:'#f0f6f8',tie:'#b6bf9f',knot:'#98a283'}}
];
function skinMult(){return G.skin>=0?SKINS[G.skin].mult:1;}
var skinPanel=document.createElement('div');
skinPanel.innerHTML='<h3>🎭 캐릭터 스킨</h3><div class="row" style="border-top:0"><button id="skinDefault" style="flex:1;background:#546e7a">기본스킨으로 변경</button></div>';
$('shopRows').parentNode.insertBefore(skinPanel,$('shopRows'));
var skinNm=[],skinBtn=[];
SKINS.forEach(function(s,i){
  var row=document.createElement('div');row.className='row';
  var nm=document.createElement('div');nm.className='nm';
  nm.innerHTML='<b style="color:'+s.color+'">'+s.name+'</b><small>러닝머신 속도 획득 ×'+s.mult+'</small>';
  var b=document.createElement('button');b.addEventListener('click',function(){skinClick(i);});
  row.appendChild(nm);row.appendChild(b);skinPanel.appendChild(row);skinBtn.push(b);
});
var skinHead=document.createElement('h3');skinHead.style.marginTop='10px';skinHead.textContent='🏃 러닝머신';
skinPanel.appendChild(skinHead);
$('skinDefault').addEventListener('click',function(){if(G.skin===-1)return;G.skin=-1;sfx.buy();toast('🧍 기본 스킨으로 변경!','good');refreshSkins();save();});
function skinClick(i){
  if(!G.owned[i]){
    if(G.money<SKINS[i].price){sfx.deny();return;}
    G.money-=SKINS[i].price;G.owned[i]=1;toast('🎭 '+SKINS[i].name+' 구매! 속도 획득 ×'+SKINS[i].mult,'good');
    burst(P.x,5,P.z,SKINS[i].color,30,8);
  }else toast('🎭 '+SKINS[i].name+' 착용! 속도 획득 ×'+SKINS[i].mult,'good');
  G.skin=i;sfx.buy();refreshSkins();save();
}
function refreshSkins(){
  if(!window.__SKINIMG__||typeof skinBtn==='undefined')return;
  skinBtn.forEach(function(b,i){
    var own=G.owned[i],cur=G.skin===i;
    b.textContent=cur?'✔ 착용중':own?'착용':'💰 '+fmt(SKINS[i].price);
    b.disabled=cur||(!own&&G.money<SKINS[i].price);
  });
  var d=$('skinDefault');if(d){d.disabled=G.skin===-1;d.textContent=G.skin===-1?'✔ 기본스킨 사용중':'기본스킨으로 변경';}
}
var skinApplied=-1;
function buildSet(o,face){
  o=Object.assign({},o);o.face=face;
  var ch=makePlayerChar(o);ch.root.visible=false;scene.add(ch.root);
  var tr=ITEM_COLORS.map(function(c,k){var t=makeTrophy(c,false,k);t.scale.set(1.2,1.2,1.2);t.visible=false;ch.root.add(t);return t;});
  return {ch:ch,tr:tr};
}
var baseSet={ch:pChar,tr:holdTrophies};
SKINS.forEach(function(s,i){s.set=buildSet(s.o,window.__SKINIMG__[i]);});
function updateSkin(dt,moving){
  if(skinApplied===G.skin)return;
  var set=G.skin>=0?SKINS[G.skin].set:baseSet;
  pChar.root.visible=false;
  pChar=set.ch;holdTrophies=set.tr;pChar.root.visible=true;
  holdTrophies.forEach(function(t,k){t.visible=(k===P.carry);});
  skinApplied=G.skin;
}

/* =========================================================
   개발자 모드: 게임 중 키보드로 "shangus" 입력 (다시 입력하면 해제)
   ========================================================= */
var DEV=false,DEV_MONEY=1e15,DEV_SPEED=1e12,devBuf='';
addEventListener('keydown',function(e){
  if(modalOpen){if(e.code==='Escape'){bkClose();mpModalClose();}return;}
  if(!started||e.repeat||!e.key||e.key.length!==1)return;
  devBuf=(devBuf+e.key.toLowerCase()).slice(-7);
  if(devBuf==='shangus'){devBuf='';toggleDev();}
});
function toggleDev(){
  DEV=!DEV;
  if(DEV){
    for(var i=0;i<N;i++){G.counts[i]=Math.max(1,G.counts[i]);updateExhibit(i);}
    for(var j=0;j<TREADS.length;j++){G.qty[j]=Math.max(1,G.qty[j]);updatePad(j);}
    G.owned=[1,1,1];
    devTick();updateHall();refreshShop();save();
    sfx.steal();burst(P.x,4,P.z,'#ff4fe0',60,12);
    toast('🛠️ 개발자 모드 ON — 전부 언락 · 돈 무한 · 속도 MAX','good');
  }else toast('🛠️ 개발자 모드 OFF (돈·속도 고정 해제)','warn');
}
function devTick(){
  if(!DEV)return;
  if(G.money<DEV_MONEY)G.money=DEV_MONEY;
  if(G.speed<DEV_SPEED)G.speed=DEV_SPEED;
}

/* =========================================================
   던전: 메달(수집한 큰 손 종류)이 3개 이상이면 입장 · 웨이브 3 → 보스
   ========================================================= */
var DX=0,DZ=-420,TS=10,TN=19,HALF=TS*TN/2,TC=(TN-1)/2,PORTAL={x:0,z:22};
var DG={on:false,hp:0,max:0,inv:0,cd:0,wave:0,mobs:[],pr:[],boss:null,tiles:[],goal:'',ripT:3,over:0,next:0,hudT:0,lblT:0,ret:null,chk:0,warnT:0};
var dgStyle=document.createElement('style');
dgStyle.textContent='.float.dmg{color:#ff5252}.float.hit{color:#fff;font-size:18px}#dgHud{position:fixed;left:10px;top:292px;width:210px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:8px 10px;font-size:13px;z-index:12;display:none}#dgHud .bar{background:#333;border-radius:6px;height:12px;overflow:hidden}#dgHud .bar i{display:block;height:100%}#dgExit{margin-top:8px;width:100%;padding:6px;border:0;border-radius:8px;background:#6a1b9a;color:#fff;font-weight:700;cursor:pointer;touch-action:manipulation}';
document.head.appendChild(dgStyle);
var dgHudEl=document.createElement('div');dgHudEl.id='dgHud';
dgHudEl.innerHTML='<div id="dgInfo" style="font-weight:700;margin-bottom:4px"></div><div class="bar"><i id="dgHp" style="background:#4caf50;width:100%"></i></div><div id="dgBossRow" style="display:none;margin-top:6px"><div style="font-size:12px;color:#ffab91">👹 보스</div><div class="bar"><i id="dgBHp" style="background:#e53935;width:100%"></i></div></div><button id="dgExit">🚪 던전 나가기</button>';
document.body.appendChild(dgHudEl);
function medals(){var c=0;for(var i=0;i<N;i++)if(G.counts[i]>0)c++;return c;}
function clampP(){
  if(DG.on){P.x=clamp(P.x,DX-HALF+0.5,DX+HALF-0.5);P.z=clamp(P.z,DZ-HALF+0.5,DZ+HALF-0.5);}
  else{
    P.z=clamp(P.z,Z0+3,Z1-3);
    /* 넓은 기지(4칸) 안에서는 옆으로 자유롭게, 경기장으로는 가운데 대문으로만 */
    var bz=BASE_Z1-0.6;
    if(P.z<bz)P.x=clamp(P.x,-BASE_XMAX+1.4,BASE_XMAX-1.4);
    else if(Math.abs(P.x)>GATE_X){
      if(P.cz!==undefined&&P.cz<bz)P.z=bz-0.001;
      else P.x=clamp(P.x,-GATE_X,GATE_X);
    }
  }
  P.cz=P.z;
}
/* 아레나: 7x7 바닥 타일 (보스가 찢어서 없앰) */
(function(){
  var vm=new THREE.Mesh(new THREE.PlaneGeometry(HALF*6,HALF*6),new THREE.MeshBasicMaterial({color:0x07040f}));
  vm.rotation.x=-Math.PI/2;vm.position.set(DX,-6,DZ);scene.add(vm);
  var gl=mk(discG,gm(0x7a3cff,0.25),DX,-5.5,DZ);gl.scale.set(HALF*1.7,1,HALF*1.7);
  for(var ix=0;ix<TN;ix++)for(var iz=0;iz<TN;iz++){
    var m=box(TS-0.15,1,TS-0.15,(ix+iz)%2?'#3b2f57':'#2d2347');
    m.position.set(DX+(ix-TC)*TS,-0.5,DZ+(iz-TC)*TS);m.receiveShadow=true;scene.add(m);
    DG.tiles.push({m:m,st:0,t:0,ix:ix,iz:iz,cr:null});
  }
  var rm=new THREE.MeshBasicMaterial({color:0x7e3fe0}),R=TS*TN/2+0.4;
  [[0,-R,TS*TN+1,0.7],[0,R,TS*TN+1,0.7],[-R,0,0.7,TS*TN+1],[R,0,0.7,TS*TN+1]].forEach(function(a){
    var b=new THREE.Mesh(new THREE.BoxGeometry(a[2],1.2,a[3]),rm);b.position.set(DX+a[0],0.6,DZ+a[1]);scene.add(b);
  });
})();
/* 포털 */
var portalG=new THREE.Group();portalG.position.set(PORTAL.x,0,PORTAL.z);scene.add(portalG);
var swirl=new THREE.Mesh(new THREE.CircleGeometry(3.1,32),new THREE.MeshBasicMaterial({color:0x6a2cff,transparent:true,opacity:0.55,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false}));
swirl.position.y=4;portalG.add(swirl);
var pring=new THREE.Mesh(new THREE.TorusGeometry(3.4,0.4,10,36),new THREE.MeshBasicMaterial({color:0xb36bff}));pring.position.y=4;portalG.add(pring);
var plab=makeSprite(256,128,7.5,3.75);plab.sprite.position.set(PORTAL.x,9.5,PORTAL.z);scene.add(plab.sprite);
function drawPortalLabel(){
  var g=plab.g,m=medals();
  g.clearRect(0,0,256,128);roundRect(g,4,4,248,120,18);g.fillStyle='rgba(0,0,0,.65)';g.fill();
  g.lineWidth=4;g.strokeStyle=m>=3?'#b36bff':'#78909c';g.stroke();
  g.textAlign='center';g.textBaseline='middle';
  g.font='bold 30px '+FONT;g.fillStyle='#e1bee7';g.fillText('🕳️ 던전 입구',128,34);
  g.font='bold 26px '+FONT;g.fillStyle=m>=3?'#ffd54a':'#ff8a80';g.fillText('🏅 메달 '+m+' / 3 필요',128,76,236);
  g.font='bold 20px '+FONT;g.fillStyle='#b0bec5';g.fillText(m>=3?'[E] 입장':'큰 손을 더 모으세요',128,108,236);
  plab.tex.needsUpdate=true;
}
drawPortalLabel();

function dgDmg(){return Math.round((10+medals()*4)*(1+Math.max(0,Math.log10(Math.max(1,G.speed))-1)*0.35));}
function dgDamage(dmg,kx,kz,force){
  if(DG.over||(!force&&DG.inv>0))return;
  DG.hp-=dmg;DG.inv=force?1.5:0.7;
  shk=Math.max(shk,1.2+dmg/DG.max*5);flashA=Math.max(flashA,0.2+dmg/DG.max*0.5);
  var m=Math.hypot(kx||0,kz||0);if(m>0){P.kx=kx/m*16;P.kz=kz/m*16;}
  floatText('-'+Math.round(dmg),VW()/2,VH()*0.38,0,'dmg');
  if(AC)sfx.hit();
  if(DG.hp<=0){DG.hp=0;DG.over=1;toast('💀 쓰러졌다... 기지로 돌아갑니다','bad');after(1.8,function(){exitDungeon(false);});}
}
/* ---------------------------------------------------------
   던전은 "한 판"을 같이 써요: 방장이 몹·보스·바닥을 계산하고,
   친구들은 받은 정보를 화면에 그리면서 자기 캐릭터가 맞았는지만 판정
   --------------------------------------------------------- */
DG.act=false;DG.wdone=0;DG.inst=0;DG.mid=0;
function dgToast(msg,cls){if(DG.on)toast(msg,cls);bcast({t:'dgt',m:msg,c:cls});}
/* 던전 안에 있는 사람들 (방장 화면 기준) */
function dgPlayers(){
  var a=[];if(DG.on&&!DG.over)a.push(P);
  for(var id in REM){var r=REM[id];if(r.dg&&r.init)a.push(r);}
  return a;
}
function dgAnyInside(){if(DG.on)return true;for(var id in REM)if(REM[id].dg)return true;return false;}
function nearestOf(list,x,z){
  var best=null,bd=1e9;
  for(var i=0;i<list.length;i++){var d=Math.hypot(list[i].x-x,list[i].z-z);if(d<bd){bd=d;best=list[i];}}
  return best;
}
function dgWorldReset(){
  DG.mobs.forEach(function(o){scene.remove(o.g);});DG.mobs=[];
  DG.pr.forEach(function(q){scene.remove(q.s);q.s.material.dispose();});DG.pr=[];
  if(DG.boss){scene.remove(DG.boss.g);DG.boss=null;}
  resetTiles();DG.wave=0;DG.next=0;DG.ripT=3;
}
function dgWorldJoin(){
  if(!hostSide())return;
  if(!DG.act||DG.wdone){
    dgWorldReset();DG.act=true;DG.wdone=0;var inst=++DG.inst;
    after(1.2,function(){if(DG.inst===inst)startWave(1);});
  }
}
function dgWorldCheckEnd(){
  if(hostSide()&&DG.act&&!dgAnyInside()){dgWorldReset();DG.act=false;DG.wdone=0;DG.inst++;}
}
/* 잡몹 4종 */
function mkMob(type,x,z,id){
  var g=new THREE.Group(),m=medals(),sc=1+m*0.05,o={t:type,ph:Math.random()*6,cd:rand(1,2.5)};
  function eye(s,y,zz,c,w){var e=box(w||0.6,w||0.6,0.2,c);e.position.set(s,y,zz);g.add(e);}
  if(type==='slime'){
    var b=box(3,2.6,3,'#43d17a');b.position.y=1.3;g.add(b);eye(-0.7,1.7,1.55,'#10301c');eye(0.7,1.7,1.55,'#10301c');
    o.body=b;o.hp=30;o.sp=7;o.dmg=8;o.r=2;o.col='#43d17a';
  }else if(type==='bat'){
    var bb=box(1.4,1.1,1.4,'#7e57c2');g.add(bb);eye(-0.35,0.2,0.75,'#ffeb3b',0.3);eye(0.35,0.2,0.75,'#ffeb3b',0.3);
    o.wl=new THREE.Group();o.wr=new THREE.Group();
    var wl=box(2.6,0.15,1.3,'#5e35b1');wl.position.x=-1.5;o.wl.add(wl);var wr=box(2.6,0.15,1.3,'#5e35b1');wr.position.x=1.5;o.wr.add(wr);
    o.wl.position.x=-0.6;o.wr.position.x=0.6;g.add(o.wl);g.add(o.wr);
    o.hp=18;o.sp=13;o.dmg=6;o.r=1.4;o.col='#7e57c2';o.fly=1;
  }else if(type==='golem'){
    var gb=box(4.6,5,3.4,'#8d8f98');gb.position.y=3.6;g.add(gb);var gh=box(2.4,2.2,2.4,'#a1a3ab');gh.position.y=7;g.add(gh);
    eye(-0.6,7.1,1.25,'#ff5252',0.5);eye(0.6,7.1,1.25,'#ff5252',0.5);
    [-1,1].forEach(function(s){var a=box(1.4,4,1.4,'#7a7c85');a.position.set(s*3.2,3.6,0);g.add(a);});
    var lg=box(1.6,1.2,1.6,'#6b6d75');lg.position.set(-1.2,0.6,0);g.add(lg);var lg2=box(1.6,1.2,1.6,'#6b6d75');lg2.position.set(1.2,0.6,0);g.add(lg2);
    o.hp=110;o.sp=3.6;o.dmg=18;o.r=3.4;o.col='#9e9e9e';
  }else{
    type='imp';o.t='imp';
    var ib=box(2,2.6,2,'#e53935');ib.position.y=1.8;g.add(ib);eye(-0.45,2.2,1.05,'#ffee58',0.4);eye(0.45,2.2,1.05,'#ffee58',0.4);
    [-0.7,0.7].forEach(function(s){var h=box(0.35,0.9,0.35,'#fff8e1');h.position.set(s,3.5,0);g.add(h);});
    var il=box(1.6,0.5,1.6,'#b71c1c');il.position.y=0.25;g.add(il);
    o.hp=40;o.sp=5;o.dmg=10;o.r=1.8;o.col='#e53935';o.rng=1;
  }
  o.hp=Math.round(o.hp*sc);o.max=o.hp;o.sp=Math.round(o.sp*1.4*10)/10;o.dmg=Math.round(o.dmg*(1+m*0.03));o.g=g;
  o.id=id||++DG.mid;o.nx=x;o.nz=z;
  g.position.set(x,0,z);scene.add(g);DG.mobs.push(o);return o;
}
function spawnMob(type){
  var a,x,z,k=0,pl=dgPlayers(),near;
  do{a=Math.random()*6.283;x=DX+Math.cos(a)*HALF*0.55;z=DZ+Math.sin(a)*HALF*0.55;k++;near=nearestOf(pl,x,z);}while(near&&Math.hypot(x-near.x,z-near.z)<14&&k<8);
  burst(x,2,z,'#b36bff',8,5);mkMob(type,x,z);
}
function startWave(w){
  if(!DG.act||DG.wdone)return;
  DG.wave=w;DG.next=0;var ex=Math.floor(medals()/6),plan=w===1?{slime:6+ex,bat:4+ex}:w===2?{slime:4+ex,bat:4+ex,imp:4+ex}:{golem:3+ex,imp:5+ex,bat:5+ex,slime:4};
  for(var k in plan)for(var i=0;i<plan[k];i++)spawnMob(k);
  dgToast('⚔️ 웨이브 '+w+'/3 시작!','warn');
}
function mobDeadFx(x,z,col){burst(x,2,z,col,18,8);burst(x,2,z,'#ffffff',8,6);if(DG.on)G.money+=Math.round((income()+20)*3);}
function killMob(o){
  var i=DG.mobs.indexOf(o);if(i>=0)DG.mobs.splice(i,1);scene.remove(o.g);
  var p=o.g.position;mobDeadFx(p.x,p.z,o.col);
  bcast({t:'mobK',id:o.id,x:r1(p.x),z:r1(p.z),c:o.col});
}
function hurtMob(o,dmg,ax,az){
  var p=o.g.position,dx=p.x-ax,dz=p.z-az,d=Math.hypot(dx,dz)||1;
  o.hp-=dmg;if(DG.on)floatText(String(dmg),p.x,p.y+4,p.z,'hit');
  if(o.t!=='golem'){p.x+=dx/d*2.5;p.z+=dz/d*2.5;}
  burst(p.x,2,p.z,'#ffffff',4,5);
  if(o.hp<=0)killMob(o);
}
/* 보스 (업로드한 사진 컷아웃) */
function makeBossVis(x,z){
  var H=24,w=H*window.__BOSSAR__,tex=texLoader.load(window.__BOSSIMG__),g=new THREE.Group();
  g.position.set(x,0,z);
  var geo=new THREE.PlaneGeometry(w,H);geo.translate(0,H/2,0);
  var mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:0.35,side:THREE.DoubleSide});
  var mesh=new THREE.Mesh(geo,mat);g.add(mesh);scene.add(g);
  return {g:g,mesh:mesh,mat:mat,ph:0,r:6,rage:0,flash:0,atkT:3,wind:0,wt:'',dash:0,dx:0,dz:0};
}
function spawnBoss(){
  if(!DG.act||DG.wdone)return;
  var b=makeBossVis(DX,DZ-HALF*0.3),max=6000+medals()*600;
  b.hp=max;b.max=max;DG.boss=b;
  DG.ripT=2.5;if(DG.on){shk=3;flashA=0.5;}fxBoom(DX,DZ-HALF*0.3,16,'#b36bff',0.8);
  dgToast('👹 보스 등장! 바닥이 찢어진다 — 구멍에 빠지면 즉사!','warn');
}
function hurtBoss(dmg){
  var b=DG.boss;if(!b)return;
  b.hp-=dmg;b.flash=0.1;if(DG.on)floatText(String(dmg),b.g.position.x,10,b.g.position.z,'hit');
  burst(b.g.position.x,6,b.g.position.z,'#ffffff',6,7);
  var lv=b.hp<b.max*0.3?2:b.hp<b.max*0.6?1:0;
  if(lv>b.rage){b.rage=lv;dgToast(lv===2?'💀 보스 광폭화! 구멍·탄막·돌진이 미친듯이 몰아친다!':'🔥 보스가 분노했다! 소환과 탄막이 추가된다!','bad');if(DG.on){shk=3;flashA=0.5;}}
  if(b.hp<=0)bossDie();
}
function bossDie(){
  var b=DG.boss,p=b.g.position;DG.boss=null;DG.wdone=1;
  scene.remove(b.g);
  bcast({t:'bossK',x:r1(p.x),z:r1(p.z)});
  bossDeadFx(p.x,p.z);
}
/* 보스가 죽었을 때: 던전 안에 있던 사람은 각자 자기 보상을 받음 */
function bossDeadFx(x,z){
  fxBoom(x,z,22,'#ffd54a',1);
  for(var i=0;i<160*fxMul;i++)emit(x+rand(-4,4),rand(1,14),z+rand(-3,3),rand(-14,14),rand(2,18),rand(-14,14),'hsl('+((Math.random()*360)|0)+',95%,62%)',rand(0.6,1.3),18);
  if(!DG.on||DG.over)return;
  DG.over=2;
  var m=medals(),rw=Math.round((income()*300+500000)*(1+m*0.25));G.money+=rw;save();
  toast('🏆 보스 격파! 💰 +'+fmt(rw),'good');floatText('🏆 보스 격파! +'+fmt(rw),VW()/2,VH()*0.4,0,'money');
  sfx.deposit();after(3.5,function(){if(DG.on)exitDungeon(true);});
}
/* 보스 스킬: 랜덤 구역을 찢어서 없애버림 */
function addCracks(t){
  var x=DX+(t.ix-TC)*TS,z=DZ+(t.iz-TC)*TS;t.cr=[];
  for(var i=0;i<3;i++){var c=new THREE.Mesh(boxG,gm(0xff3050,0.9));c.scale.set(0.25,0.1,TS*1.05);c.position.set(x,0.08,z);c.rotation.y=Math.random()*3.14;scene.add(c);t.cr.push(c);}
}
function ripPlan(){
  var b=DG.boss,rg=b.rage,list=[],pool,i,pt=Math.random(),m3=Math.floor(medals()/3);
  var pl=dgPlayers(),TG=pl.length?pl[Math.floor(Math.random()*pl.length)]:{x:DX,z:DZ,vx:0,vz:0};
  function add(t){if(t&&list.indexOf(t)<0)list.push(t);}
  function around(x,z,r){
    var cx=clamp(Math.floor((x-DX)/TS+TN/2),0,TN-1),cz=clamp(Math.floor((z-DZ)/TS+TN/2),0,TN-1);
    for(var a=-r;a<=r;a++)for(var c=-r;c<=r;c++){var ix=cx+a,iz=cz+c;if(ix>=0&&ix<TN&&iz>=0&&iz<TN)add(DG.tiles[ix*TN+iz]);}
  }
  var w=[1.5,1.25,1.05][rg];
  if(pt<0.28){
    var k=24+rg*14+m3;pool=DG.tiles.slice();
    for(i=0;i<k&&pool.length;i++)add(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  }else if(pt<0.5||(!rg&&pt<0.7)){
    var row=Math.random()<0.5,idx=Math.floor(Math.random()*TN),wd=1+rg;
    DG.tiles.forEach(function(t){var v=row?t.iz:t.ix;if(v>=idx&&v<idx+wd)add(t);});
  }else if(pt<0.85||!rg){
    around(TG.x+(TG.vx||0)*0.5,TG.z+(TG.vz||0)*0.5,1);
    if(rg>=1)around(TG.x,TG.z,1);
    if(rg>=2)for(i=0;i<3;i++)around(TG.x+rand(-35,35),TG.z+rand(-35,35),1);
  }else{
    w+=0.2;
    DG.tiles.forEach(function(t){if((t.ix+t.iz)%2===DG.chk)add(t);});DG.chk^=1;
  }
  var ids=[];
  list.forEach(function(t){if(t.st===0)ids.push(t.ix*TN+t.iz);});
  applyRip(ids,w);bcast({t:'rip',l:ids,w:w});
  DG.ripT=w+[2.8,2.0,1.4][rg];
  var now=performance.now()/1000;if(now-DG.warnT>2.5){DG.warnT=now;dgToast('⚠️ 붉은 칸이 찢어져요! 구멍에 빠지면 즉사! 벗어나거나 점프!','warn');}
}
function applyRip(ids,w){
  ids.forEach(function(k){var t=DG.tiles[k];if(t&&t.st===0){t.st=1;t.t=w;addCracks(t);}});
  if(AC&&DG.on)tone(140,0.5,'sawtooth',0.2,-60);
}
function tileState(){return DG.tiles.map(function(t){return [t.st,r2(t.t)];});}
function applyTiles(s){
  resetTiles();
  s.forEach(function(a,k){
    var t=DG.tiles[k];if(!t)return;t.st=a[0];t.t=a[1];
    if(t.st===1)addCracks(t);
    else if(t.st===2)t.m.visible=false;
    else if(t.st===3)t.m.scale.y=Math.min(1,0.05+t.t);
  });
}
function tileAt(){
  var ix=clamp(Math.floor((P.x-DX)/TS+TN/2),0,TN-1),iz=clamp(Math.floor((P.z-DZ)/TS+TN/2),0,TN-1);
  return DG.tiles[ix*TN+iz];
}
function ripTile(t){
  var x=DX+(t.ix-TC)*TS,z=DZ+(t.iz-TC)*TS,pw=DG.boss&&DG.boss.rage?0.7:0.5;
  if(t.cr){t.cr.forEach(function(c){scene.remove(c);c.material.dispose();});t.cr=null;}
  if(DG.on&&!DG.over&&tileAt()===t&&P.y<1.3)fallDeath();
  var ck=new THREE.Mesh(boxG,new THREE.MeshLambertMaterial({color:t.m.material.color}));
  ck.scale.set(TS-0.15,1,TS-0.15);ck.position.set(x,-0.5,z);scene.add(ck);
  var tm=0,rx=rand(-6,6),rz=rand(-6,6);
  addH({u:function(dt){tm+=dt;ck.position.y=-0.5+tm*16-tm*tm*30;ck.rotation.x+=rx*dt;ck.rotation.z+=rz*dt;var s=Math.max(0.01,1-tm*1.6);ck.scale.set((TS-0.15)*s,s,(TS-0.15)*s);return tm>0.6;},x:function(){scene.remove(ck);ck.material.dispose();}});
  if(DG.on)fxBoom(x,z,TS*0.75,'#ff4060',pw);
  if(DG.on)for(var i=0;i<40*fxMul;i++)emit(x+rand(-3.5,3.5),0.5,z+rand(-3.5,3.5),rand(-6,6),rand(4,14),rand(-6,6),i%2?'#ff4060':'#b36bff',rand(0.5,1),22);
  t.m.visible=false;t.m.material.emissive.setRGB(0,0,0);t.st=2;t.t=5.5;
}
function resetTiles(){
  DG.tiles.forEach(function(t){if(t.cr){t.cr.forEach(function(c){scene.remove(c);c.material.dispose();});t.cr=null;}t.st=0;t.t=0;t.m.visible=true;t.m.scale.y=1;t.m.material.emissive.setRGB(0,0,0);});
}
function updateTiles(dt){
  var tt=performance.now()/1000;
  DG.tiles.forEach(function(t){
    if(t.st===1){t.t-=dt;t.m.material.emissive.setRGB(0.35+0.35*Math.sin(tt*25),0,0);if(t.t<=0)ripTile(t);}
    else if(t.st===2){t.t-=dt;if(t.t<=0){t.st=3;t.t=0;t.m.visible=true;t.m.scale.y=0.05;}}
    else if(t.st===3){t.t+=dt*3;t.m.scale.y=Math.min(1,0.05+t.t);if(t.t>=1){t.st=0;}}
  });
}
/* 입장 / 퇴장 (내 캐릭터) */
function enterDungeon(){
  var m=medals();
  if(m<3){toast('🏅 메달(수집한 큰 손 종류)이 3개 이상 필요해요! 지금 '+m+'개','warn');sfx.deny();return;}
  DG.on=true;DG.max=100+m*20;DG.hp=DG.max;DG.inv=1;DG.over=0;DG.cd=0;
  DG.fall=0;P.x=DX;P.z=DZ+HALF*0.5;P.y=0;P.vy=0;P.kx=P.kz=0;P.stun=0;
  camPos.set(P.x,12,P.z-12);
  dgHudEl.style.display='block';$('shop').classList.add('hide');
  burst(P.x,3,P.z,'#b36bff',40,10);sfx.steal();
  var others=0;for(var id in REM)if(REM[id].dg)others++;
  toast('🕳️ 던전 입장! 메달 '+m+'개 · [E]로 베기 공격 (HP '+DG.max+') · ⚠️ 구멍에 빠지면 즉사!'+(others?' · 👥 친구 '+others+'명과 함께!':''),'good');
  if(hostSide())dgWorldJoin();else netSendState();
}
function exitDungeon(win){
  DG.on=false;DG.over=0;DG.fall=0;P.stun=0;P.vy=0;
  P.x=slotX(mySlot);P.z=8;P.y=0;P.kx=P.kz=0;P.cz=P.z;camPos.set(P.x,12,P.z-12);
  dgHudEl.style.display='none';$('shop').classList.remove('hide');pChar.root.visible=true;
  toast(win?'🏠 던전 클리어! 기지로 귀환':'🏠 기지로 귀환','good');
  if(hostSide())dgWorldCheckEnd();else netSendState();
}
$('dgExit').addEventListener('click',function(){if(DG.on)exitDungeon(false);});
/* 방장: (x,z) 주변에 공격 판정 */
function dgHitAt(x,z,dmg){
  var R=9,i,o;
  for(i=DG.mobs.length-1;i>=0;i--){o=DG.mobs[i];if(Math.hypot(o.g.position.x-x,o.g.position.z-z)<R+o.r)hurtMob(o,dmg,x,z);}
  var b=DG.boss;if(b&&Math.hypot(b.g.position.x-x,b.g.position.z-z)<R+b.r+3)hurtBoss(dmg);
}
function dgAttack(){
  if(!DG.on||DG.over||DG.cd>0||P.stun>0)return;
  DG.cd=0.38;var R=9,dmg=dgDmg(),i,o;
  var m=gm(0xffffff,0.8),rg=mk(ringG,m,P.x,1.2,P.z),tm=0;
  addH({u:function(dt){tm+=dt;var k=tm/0.22,s=R*(0.4+k*0.7);rg.scale.set(s,1,s);m.opacity=0.8*(1-k);rg.position.set(P.x,1.2,P.z);return k>=1;},x:function(){scene.remove(rg);m.dispose();}});
  for(i=0;i<14*fxMul;i++){var a=Math.random()*6.283;emit(P.x+Math.cos(a)*R*0.8,rand(1,4),P.z+Math.sin(a)*R*0.8,Math.cos(a)*6,rand(0,3),Math.sin(a)*6,'#ffffff',0.3,0);}
  if(AC){noise(0.12,0.2,2500);tone(520,0.08,'triangle',0.1,-200);}
  if(hostSide()){dgHitAt(P.x,P.z,dmg);return;}
  sendHost({t:'atk',x:r2(P.x),z:r2(P.z),d:dmg});
  for(i=0;i<DG.mobs.length;i++){o=DG.mobs[i];if(Math.hypot(o.g.position.x-P.x,o.g.position.z-P.z)<R+o.r){floatText(String(dmg),o.g.position.x,4,o.g.position.z,'hit');burst(o.g.position.x,2,o.g.position.z,'#ffffff',4,5);}}
  var b=DG.boss;if(b&&Math.hypot(b.g.position.x-P.x,b.g.position.z-P.z)<R+b.r+3){floatText(String(dmg),b.g.position.x,10,b.g.position.z,'hit');b.flash=0.1;}
}
function enemyNear(){
  var R=11,i;for(i=0;i<DG.mobs.length;i++)if(Math.hypot(DG.mobs[i].g.position.x-P.x,DG.mobs[i].g.position.z-P.z)<R)return true;
  var b=DG.boss;return !!(b&&Math.hypot(b.g.position.x-P.x,b.g.position.z-P.z)<R+7);
}
/* 투사체: 방장이 만들고 모두에게 알림 → 각자 움직이고, 내 캐릭터만 맞았는지 판정 */
function addDgProj(x,y,z,vx,vz,dmg,col,size,life,bd){
  var s=makeProj(size);s.material.color.set(col);s.position.set(x,y,z);scene.add(s);
  DG.pr.push({s:s,vx:vx,vz:vz,life:life,dmg:bd?Math.round((DG.max||100)*0.12+8):dmg});
}
function spawnDgProj(x,y,z,vx,vz,dmg,col,size,life,bd){
  addDgProj(x,y,z,vx,vz,dmg,col,size,life,bd);
  bcast({t:'pr',x:r2(x),y:y,z:r2(z),vx:r2(vx),vz:r2(vz),d:dmg,c:col,s:size,l:life,b:bd?1:0});
}
function updateMobsLogic(dt){
  var i,j,o,p,dx,dz,d,ang,pl=dgPlayers(),T;
  for(i=0;i<DG.mobs.length;i++){
    o=DG.mobs[i];p=o.g.position;T=nearestOf(pl,p.x,p.z);
    if(!T)continue;
    dx=T.x-p.x;dz=T.z-p.z;d=Math.hypot(dx,dz)||1;ang=Math.atan2(dx,dz);
    o.g.rotation.y=ang;
    var mv=o.sp;
    if(o.t==='imp'){
      if(d<10)mv=-o.sp;else if(d<16)mv=0;
      o.cd-=dt;
      if(o.cd<=0&&d<80&&!DG.wdone){
        o.cd=2.2;spawnDgProj(p.x,3,p.z,dx/d*20,dz/d*20,o.dmg,'#ff7043',2.2,5,0);
        if(AC&&DG.on)sfx.charge();
      }
    }
    var side=o.t==='bat'?Math.sin(o.ph*0.35)*0.9:0;
    p.x+=(dx/d*mv+(-dz/d)*side*o.sp*0.5)*dt;p.z+=(dz/d*mv+(dx/d)*side*o.sp*0.5)*dt;
    for(j=i+1;j<DG.mobs.length;j++){
      var q=DG.mobs[j].g.position,ex=p.x-q.x,ez=p.z-q.z,ed=Math.hypot(ex,ez);
      if(ed<2.6&&ed>0.01){p.x+=ex/ed*dt*4;p.z+=ez/ed*dt*4;q.x-=ex/ed*dt*4;q.z-=ez/ed*dt*4;}
    }
    p.x=clamp(p.x,DX-HALF+1,DX+HALF-1);p.z=clamp(p.z,DZ-HALF+1,DZ+HALF-1);
  }
}
/* 몹 애니메이션 (모두) */
function updateMobsVis(dt){
  for(var i=0;i<DG.mobs.length;i++){
    var o=DG.mobs[i],p=o.g.position;
    if(isClient()){
      var k=Math.min(1,dt*10),ox=p.x,oz=p.z;p.x+=(o.nx-p.x)*k;p.z+=(o.nz-p.z)*k;
      if(Math.abs(p.x-ox)+Math.abs(p.z-oz)>0.002)o.g.rotation.y=Math.atan2(p.x-ox,p.z-oz);
    }
    o.ph+=dt*(o.t==='bat'?14:o.t==='slime'?6:4);
    if(o.t==='slime'){var sq=Math.abs(Math.sin(o.ph));p.y=sq*1.4;o.body.scale.set(1+(1-sq)*0.15,0.85+sq*0.3,1+(1-sq)*0.15);}
    else if(o.t==='bat'){p.y=3.5+Math.sin(o.ph*0.5);var f=Math.sin(o.ph)*0.7;o.wl.rotation.z=f;o.wr.rotation.z=-f;}
    else if(o.t==='golem'){p.y=Math.abs(Math.sin(o.ph))*0.35;}
  }
}
/* 내 캐릭터 피격 판정 (모두) */
function dgLocalHits(dt){
  var i,o,p,dx,dz,d;
  for(i=DG.pr.length-1;i>=0;i--){
    var q2=DG.pr[i];q2.s.position.x+=q2.vx*dt;q2.s.position.z+=q2.vz*dt;q2.s.material.rotation+=dt*12;q2.life-=dt;
    if(DG.on&&Math.hypot(P.x-q2.s.position.x,P.z-q2.s.position.z)<1.8&&P.y<2.6){dgDamage(q2.dmg,q2.vx,q2.vz);q2.life=0;}
    if(q2.life<=0||Math.abs(q2.s.position.x-DX)>HALF+7||Math.abs(q2.s.position.z-DZ)>HALF+7){scene.remove(q2.s);q2.s.material.dispose();DG.pr.splice(i,1);}
  }
  if(!DG.on||DG.over)return;
  for(i=0;i<DG.mobs.length;i++){
    o=DG.mobs[i];p=o.g.position;dx=P.x-p.x;dz=P.z-p.z;d=Math.hypot(dx,dz)||1;
    if(d<o.r+1.5&&(o.fly||P.y<2.2))dgDamage(o.dmg,-dx,-dz);
  }
  var b=DG.boss;
  if(b){
    p=b.g.position;dx=P.x-p.x;dz=P.z-p.z;d=Math.hypot(dx,dz)||1;
    if(d<b.r+(b.dash>0?2.5:1.6)&&P.y<3)dgDamage(10+DG.max*(b.dash>0?0.2:0.1),dx,dz);
  }
}
function fallDeath(){
  if(DG.over)return;
  DG.hp=0;DG.over=1;DG.fall=1;P.stun=5;P.vy=-6;P.kx=P.kz=0;
  shk=Math.max(shk,2);flashA=Math.max(flashA,0.6);
  toast('🕳️ 구멍에 떨어졌다! 즉사... 기지로 돌아갑니다','bad');
  if(AC){sfx.hit();tone(380,1.2,'sine',0.25,-340);}
  after(1.7,function(){if(DG.on)exitDungeon(false);});
}
function bossShot(a,sp,sz){
  var b=DG.boss,p=b.g.position;
  spawnDgProj(p.x+Math.sin(a)*3,4,p.z+Math.cos(a)*3,Math.sin(a)*sp,Math.cos(a)*sp,0,'#ff3d9a',sz||3,8,1);
}
var BOSS_NM={fan:'🔱 부채꼴 탄막! 점프하거나 사이로 피해!',ring:'🌀 전방위 탄막! 점프!',dash:'💨 돌진! 옆으로 피해!',sum:'👺 졸개 소환!'};
function pickAtk(){
  var rg=DG.boss.rage,pool=['fan','ring','dash'];
  if(rg>=1)pool.push('sum','fan');
  if(rg>=2)pool.push('ring','dash');
  return pool[Math.floor(Math.random()*pool.length)];
}
function bossAttack(type){
  var b=DG.boss,p=b.g.position,T=nearestOf(dgPlayers(),p.x,p.z)||{x:DX,z:DZ},dx=T.x-p.x,dz=T.z-p.z,d=Math.hypot(dx,dz)||1,a=Math.atan2(dx,dz),rg=b.rage,i,n;
  if(type==='fan'){n=5+rg*3;for(i=0;i<n;i++)bossShot(a+(i-(n-1)/2)*0.16,30+rg*4);}
  else if(type==='ring'){n=20+rg*10;var o=Math.random()*6.283;for(i=0;i<n;i++)bossShot(o+i*6.283/n,20+rg*3);}
  else if(type==='dash'){b.dash=0.75;b.dx=dx/d;b.dz=dz/d;}
  else if(type==='sum'){
    n=Math.min(2+rg*2,12-DG.mobs.length);
    for(i=0;i<n;i++){var aa=Math.random()*6.283;mkMob(Math.random()<0.5?'imp':'bat',p.x+Math.cos(aa)*8,p.z+Math.sin(aa)*8);}
  }
  fxBoom(p.x,p.z,10,'#ff3d9a',0.5);
  if(AC&&DG.on)sfx.shoot();
}
function updateBossLogic(dt){
  var b=DG.boss;if(!b)return;
  var p=b.g.position,T=nearestOf(dgPlayers(),p.x,p.z),rg=b.rage;
  if(b.dash>0){
    b.dash-=dt;p.x+=b.dx*58*dt;p.z+=b.dz*58*dt;
  }else if(b.wind>0){
    b.wind-=dt;if(b.wind<=0)bossAttack(b.wt);
  }else if(T){
    var dx=T.x-p.x,dz=T.z-p.z,d=Math.hypot(dx,dz)||1,sp=[7,10,13][rg];if(d>9){p.x+=dx/d*sp*dt;p.z+=dz/d*sp*dt;}
    if(!DG.wdone){b.atkT-=dt;if(b.atkT<=0){b.wt=pickAtk();b.wind=b.wt==='dash'?0.7:0.55;b.atkT=[3.2,2.3,1.6][rg]+b.wind;dgToast('⚠️ '+BOSS_NM[b.wt],'warn');}}
  }
  p.x=clamp(p.x,DX-HALF+5,DX+HALF-5);p.z=clamp(p.z,DZ-HALF+5,DZ+HALF-5);
  if(!DG.wdone){DG.ripT-=dt;if(DG.ripT<=0)ripPlan();}
}
function updateBossVis(dt){
  var b=DG.boss;if(!b)return;
  var p=b.g.position,rg=b.rage;
  if(isClient()){var k=Math.min(1,dt*12);p.x+=(b.nx-p.x)*k;p.z+=(b.nz-p.z)*k;}
  b.ph+=dt*2;b.mesh.position.y=1.2+Math.sin(b.ph)*0.8;
  b.g.rotation.y=Math.atan2(camera.position.x-p.x,camera.position.z-p.z);
  if(b.dash>0&&Math.random()<dt*60*fxMul)emit(p.x+rand(-3,3),rand(1,10),p.z+rand(-3,3),rand(-3,3),rand(0,4),rand(-3,3),'#ff3d9a',0.5,2);
  if(b.flash>0){b.flash-=dt;b.mat.color.setRGB(1,0.35,0.35);}
  else if(b.wind>0)b.mat.color.setRGB(1,1,0.3);
  else if(rg)b.mat.color.setRGB(1,rg>1?0.5:0.65,rg>1?0.5:0.65);
  else b.mat.color.setRGB(1,1,1);
  if(rg&&Math.random()<dt*20*fxMul)emit(p.x+rand(-3,3),rand(1,14),p.z+rand(-1,1),rand(-2,2),rand(2,6),rand(-2,2),'#ff3d00',0.7,-2);
}
function dgWorld(dt){
  if(!dgAnyInside()){dgWorldCheckEnd();return;}
  updateMobsLogic(dt);updateBossLogic(dt);
  if(!DG.wdone&&!DG.boss&&DG.wave>0&&DG.mobs.length===0&&!DG.next){
    DG.next=1;var inst=DG.inst;
    if(DG.wave<3)after(1.4,function(){if(DG.inst===inst)startWave(DG.wave+1);});
    else{dgToast('✅ 잡몹 정리 완료! 보스가 나타난다...','good');after(1.8,function(){if(DG.inst===inst)spawnBoss();});}
  }
}
function updateDungeon(dt){
  if(DG.act){
    if(hostSide())dgWorld(dt);
    updateTiles(dt);updateMobsVis(dt);updateBossVis(dt);
  }
  if(DG.act||DG.on||DG.pr.length)dgLocalHits(dt);
  if(!DG.on){
    swirl.rotation.z+=dt*1.5;pring.rotation.z-=dt*0.5;
    if(Math.random()<dt*14*fxMul)emit(PORTAL.x+rand(-3,3),rand(1,7),PORTAL.z+rand(-.5,.5),0,rand(1,3),0,'#b36bff',0.8,-1);
    DG.lblT+=dt;if(DG.lblT>1){DG.lblT=0;drawPortalLabel();}
    if(started&&P.carry<0&&P.stun<=0&&Math.hypot(P.x-PORTAL.x,P.z-PORTAL.z)<5){
      var pr=$('prompt');pr.style.display='block';pr.textContent=(isTouch?'[훔치기] 버튼':'[E] 키')+' — 🕳️ 던전 입장 (메달 '+medals()+'개)';
    }
    return;
  }
  DG.inv=Math.max(0,DG.inv-dt);DG.cd=Math.max(0,DG.cd-dt);
  pChar.root.visible=!(DG.inv>0&&Math.floor(DG.inv*20)%2===0);
  $('shop').classList.add('hide');
  if(!DG.over&&(keys.KeyE||(isTouch&&enemyNear())))dgAttack();
  var tl=tileAt();
  if(!DG.over&&tl.st===2&&P.y<0.4){
    fallDeath();
  }
  var others=0;for(var id in REM)if(REM[id].dg)others++;
  DG.goal=(DG.boss?'👹 보스 격파! 붉은 칸 = 곧 구멍 · 빠지면 즉사!':DG.wave<=3&&DG.wave>0?'⚔️ 웨이브 '+DG.wave+'/3 · 남은 몹 <b>'+DG.mobs.length+'</b>':'🕳️ 던전')+(others?' · 👥 '+(others+1)+'명':'');
  DG.hudT+=dt;
  if(DG.hudT>0.08){
    DG.hudT=0;$('dgInfo').textContent='❤ '+Math.ceil(DG.hp)+' / '+DG.max+'   🏅 '+medals();
    $('dgHp').style.width=(DG.hp/DG.max*100)+'%';
    var br=$('dgBossRow');br.style.display=DG.boss?'block':'none';
    if(DG.boss)$('dgBHp').style.width=Math.max(0,DG.boss.hp/DG.boss.max*100)+'%';
  }
}

function updatePending(dt){
  for(var j=pendingShots.length-1;j>=0;j--){
    var q=pendingShots[j];q.t-=dt;
    if(q.t>0)continue;
    pendingShots.splice(j,1);
    var n=q.n;
    if((n.state==='chase'||n.state==='charge')&&npcCarry()===n.i&&!inSafe()){
      var rp=n.ch.root.position;spawnProj(rp,Math.atan2(P.x-rp.x,P.z-rp.z),n.move*1.5);
      var now=performance.now()/1000;if(AC&&now-lastShootSfx>0.15){lastShootSfx=now;sfx.shoot();}
    }
  }
}
/* 방장(또는 혼자)만 실행: NPC가 누구를 쫓을지, 언제 스킬을 쓸지 결정 */
function npcLogic(n,dt,t){
  var rp=n.ch.root.position,T;
  if(n.state==='chase'||n.state==='charge'){
    T=tgtObj(n.tg);
    if(!T||tgtCarry(n.tg)!==n.i||T.z<BASE_Z1){n.state='return';n.tg=null;hideAim(n);}
  }
  if(n.state==='chase'){
    T=tgtObj(n.tg);
    var dx=T.x-rp.x,dz=T.z-rp.z,dist=Math.hypot(dx,dz);
    rp.x+=dx/(dist||1)*n.move*dt;rp.z+=dz/(dist||1)*n.move*dt;
    n.nextCharge-=dt;
    if(n.nextCharge<=0){
      if(dist>7){n.state='charge';n.ct=CHARGE;}
      else n.nextCharge=0.3;
    }
  }
  if(n.state==='charge'){n.ct-=dt;if(n.ct<=0)shoot(n);}
  if(n.state==='return'){
    var hx=n.home.x-rp.x,hz=n.home.z-rp.z,hd=Math.hypot(hx,hz);
    if(hd<1.5){rp.x=n.home.x;rp.z=n.home.z;n.state='sleep';n.ball.visible=false;}
    else{rp.x+=hx/hd*n.move*dt;rp.z+=hz/hd*n.move*dt;}
  }
}
/* 모두 실행: 화면 표시 + 내 캐릭터가 부딪혔는지 판정 */
function updateNPC(n,dt,t){
  var rp=n.ch.root.position;
  if(isClient()&&n.nx!==undefined){
    var kk=Math.min(1,dt*10);rp.x+=(n.nx-rp.x)*kk;rp.z+=(n.nz-rp.z)*kk;
    if(Math.abs(n.nx-rp.x)+Math.abs(n.nz-rp.z)>40){rp.x=n.nx;rp.z=n.nz;}
  }
  if(n.state==='charge'&&n.pst!=='charge'){
    if(isClient())n.ct=CHARGE;
    if(n.tg===NET.my){if(t-toastWarnT>1.2){toast(skillWarn(n),'warn');toastWarnT=t;}sfx.charge();}
  }
  if(n.state!=='charge'&&n.pst==='charge')hideAim(n);
  n.pst=n.state;
  if(isClient()&&n.state==='charge')n.ct=Math.max(0,n.ct-dt);
  var dx=P.x-rp.x,dz=P.z-rp.z,dist=Math.hypot(dx,dz),safe=inSafe(),moving=(n.state==='chase'||n.state==='return');
  var cfg=n.cfg;
  if(n.state==='sleep'&&dist>260&&n.lie>0.95){
    if(!n.hid){n.hid=true;n.ch.root.visible=false;n.tag.sprite.visible=false;n.zz.sprite.visible=false;n.blob.visible=false;}
    return;
  }
  if(n.hid){n.hid=false;n.ch.root.visible=true;n.tag.sprite.visible=true;}
  var T=tgtObj(n.tg)||P,tx=T.x-rp.x,tz=T.z-rp.z,tdist=Math.hypot(tx,tz);
  if(n.state==='chase'&&n.tg===NET.my&&npcCarry()===n.i&&dist<4.2&&P.y<3.2&&P.stun<=0&&!safe)hitPlayer(n,pwr(n),dx/(dist||1),dz/(dist||1));
  if(n.state==='charge'){
    var aon=(Math.floor(n.ct*16)%2===0)&&!SK[n.i].na,aang=Math.atan2(tx,tz),alen=Math.min(tdist+8,160);
    n.aim.visible=aon;n.aim.position.set(rp.x,0.14,rp.z);n.aim.rotation.y=aang;n.aim.scale.z=alen;
    for(var ak=0;ak<2;ak++){var ax=n.aimX[ak];ax.visible=aon&&!!SK[n.i].fan;ax.position.set(rp.x,0.14,rp.z);ax.rotation.y=aang+(ak?0.2:-0.2);ax.scale.z=alen;}
  }
  if(n.state==='return'||n.state==='sleep')hideAim(n);
  if(n.state==='sleep')n.ball.visible=false;
  /* 눕기/일어나기 */
  n.lie+=clamp((n.state==='sleep'?1:0)-n.lie,-dt*3.2,dt*3.2);
  var lie=n.lie,awake=1-lie;
  var yaw=lie>0.95?0:Math.atan2(camera.position.x-rp.x,camera.position.z-rp.z);
  n.ch.root.rotation.y=yaw;
  n.mesh.rotation.x=-Math.PI/2*lie;
  if(n.state!=='sleep')n.phase+=dt*clamp(n.move*0.7,7,20);
  var bob=moving?Math.abs(Math.sin(n.phase))*0.9:0;
  n.mesh.position.y=0.12+bob*awake;
  n.mesh.rotation.z=(moving?Math.sin(n.phase)*0.14:0)*awake;
  var shake=0,sc=1;
  if(n.state==='charge'){shake=Math.sin(t*70)*0.18;sc=1+(1-n.ct/CHARGE)*0.18;}
  n.mesh.position.x=shake;n.mesh.scale.set(sc,sc,sc);
  var tone=0.72+0.28*awake;n.mat.color.setRGB(tone,tone,tone);
  n.blob.visible=lie<0.5;n.blob.position.set(rp.x,0.07,rp.z);
  /* 눈물 & 울음소리 */
  if(n.state!=='sleep'&&lie<0.5){
    n.tearT-=dt;
    if(n.tearT<=0){
      n.tearT=fxLevel?0.07:0.18;
      var rx=Math.cos(yaw),rz=-Math.sin(yaw),fx=Math.sin(yaw),fz=Math.cos(yaw),ey=cfg.h*0.64,ex=cfg.w*0.13;
      for(var s=-1;s<=1&&dist<110;s+=2){
        emit(rp.x+rx*s*ex+fx*0.3,ey,rp.z+rz*s*ex+fz*0.3, rx*s*rand(2,5)+fx*rand(0,2),rand(3,7),rz*s*rand(2,5)+fz*rand(0,2),'#7fd3ff',0.75,26);
      }
    }
    n.cryT-=dt;
    if(n.cryT<=0){var cr=0.92+((n.i*7)%9)*0.025;n.cryT=cryBuf?cryBuf.duration/cr+0.03:rand(1.3,2.0);cry(clamp(1-dist/90,0,1)*(cryBuf?0.9:0.3),cryBuf?cr:1+rand(-0.08,0.08));}
  }
  /* 드리블 공 */
  if(n.ballHide>0)n.ballHide-=dt;
  var showBall=(n.state==='chase'||n.state==='charge')&&n.ballHide<=0;
  n.ball.visible=showBall;
  if(showBall){
    var fdx=tx/(tdist||1),fdz=tz/(tdist||1);
    n.ball.position.set(rp.x+fdx*5.5,1.3+Math.abs(Math.sin(t*10+n.i))*0.6,rp.z+fdz*5.5);
    n.ball.material.rotation+=dt*10;
  }
  /* 이름표 / Zzz */
  n.tag.sprite.position.set(rp.x,(cfg.h+1.9)*awake+3.8*lie,rp.z-cfg.h*0.5*lie);
  n.zz.sprite.visible=(n.state==='sleep'&&lie>0.9);
  if(n.zz.sprite.visible){
    var ph=(t*0.7+n.i*0.37)%1;
    n.zz.sprite.position.set(rp.x+1.2+ph*0.8,2.6+ph*2.4,rp.z-cfg.h*0.85);
    n.zz.sprite.material.opacity=1-ph*0.8;
  }
}

function updatePedestal(n,dt){
  var p=n.ped;
  if(!p.has&&hostSide()){p.t-=dt;if(p.t<=0){p.has=true;p.pop=0;burst(p.x,3,p.z,ITEM_COLORS[n.i],10,5);}}
  p.item.visible=p.has;p.beam.visible=p.has;
  if(p.has){
    p.pop=Math.min(1,p.pop+dt*2.8);
    var s=1.2*(p.pop<1?p.pop*(2-p.pop):1);
    p.item.scale.set(s,s,s);
    p.item.rotation.y+=dt*1.5;
  }
}

var goalEl=null,goalLast='',tagT=0;
function computeGoal(onPad){
  if(DG&&DG.on)return DG.goal;
  if(P.stun>0)return '😵 정신 차리는 중...';
  if(P.raid)return '🦝 '+P.raidName+'의 큰 손을 들었다! 노란 <b>🏠 내 기지</b> 칸으로 가져가! · 주인에게 닿으면 뺏겨요';
  if(P.carry>=0)return '🏃 기지로 도망쳐! <b>'+Math.max(0,Math.round(P.z-BASE_Z1))+'m</b> 남음 · 조준선은 옆으로 피하거나 점프!';
  if(onPad>=0)return '✨ 패드 위에 서 있으면 1.5초마다 속도가 올라요';
  var any=G.qty.some(function(q){return q>0;});
  if(inSafe()&&!any&&G.money>=treadPrice(0))return isTouch?'🛒 <b>[상점]</b> 버튼에서 <b>러닝머신</b>을 사고, 패드 위에 올라가요':'🛒 오른쪽 상점에서 <b>러닝머신</b>을 사고, 기지의 패드 위에 올라가 보세요';
  var tgt=null;for(var i=0;i<N;i++){if(G.counts[i]===0){tgt=npcs[i];break;}}
  if(!tgt)return '🏆 전부 모았어요! 높은 등급을 반복해서 모으면 수입이 계속 늘어요';
  var d=Math.round(tgt.ped.z-P.z);
  var txt='🎯 다음 목표: <b>'+tgt.cfg.name+'</b> ['+gradeOf(tgt.i).name+'] ';
  txt+=d>8?'· 앞으로 <b>'+d+'m</b>':(d<-8?'· 뒤로 <b>'+(-d)+'m</b>':'· 바로 앞! 받침대에 다가가 훔치기');
  if(G.speed<tgt.cfg.speed*0.5)txt+=' <span style="color:#ff8a80">(⚠️ 아직 너무 빨라요 · 러닝머신으로 속도업!)</span>';
  return txt;
}
function update(dt,t){
  /* ----- 입력 → 이동 ----- */
  var ix=((keys.KeyD||keys.ArrowRight)?1:0)-((keys.KeyA||keys.ArrowLeft)?1:0);
  var iy=((keys.KeyW||keys.ArrowUp)?1:0)-((keys.KeyS||keys.ArrowDown)?1:0);
  ix+=joy.x;iy+=joy.y;
  var mag=Math.hypot(ix,iy);if(mag>1){ix/=mag;iy/=mag;mag=1;}
  var spd=realSpeed(G.speed),moving=false;
  P.stun=Math.max(0,P.stun-dt);
  if(P.stun<=0&&mag>0.05){
    var sy=Math.sin(cam.yaw),cy=Math.cos(cam.yaw);
    var dx=-sy*iy+cy*ix,dz=-cy*iy-sy*ix;
    P.x+=dx*spd*dt;P.z+=dz*spd*dt;
    P.face=lerpAngle(P.face,Math.atan2(dx,dz),Math.min(1,dt*14));
    moving=true;P.phase+=dt*clamp(spd*0.9,8,26);
  }
  P.mv=moving;
  clampP();
  /* 점프 */
  if(P.y<=0.001&&P.stun<=0&&(keys.Space||wantJump||jumpHeld)){P.vy=22;P.y=0.002;sfx.jump();}
  wantJump=false;
  P.vy-=60*dt;P.y+=P.vy*dt;if(P.y<0&&!DG.fall){P.y=0;P.vy=0;}
  P.lie+=((P.stun>0?1:0)-P.lie)*Math.min(1,dt*10);

  /* ----- 안전존 ----- */
  var safe=inSafe();
  if(P.carry>=0){
    if(P.raid){if(inMySlot())raidDeposit();else raidCatchCheck();}
    else if(safe)deposit();
  }
  if(safe!==wasSafe){wasSafe=safe;$('shop').classList.toggle('hide',!safe);if(safe){refreshShop();save();}}

  /* ----- 러닝머신 ----- */
  var onPad=-1;
  if(P.y<0.6&&P.stun<=0){
    for(var i=0;i<pads.length;i++){
      if(G.qty[i]>0&&Math.abs(P.x-pads[i].x)<3.7&&Math.abs(P.z-pads[i].z)<3.7){onPad=i;break;}
    }
  }
  if(onPad>=0){
    P.treadAcc+=dt;
    if(P.treadAcc>=1.5){
      P.treadAcc-=1.5;
      var gain=TREADS[onPad].gain*G.qty[onPad]*skinMult();
      G.speed+=gain;sfx.tick();
      floatText('+'+fmt(gain)+' 속도',VW()/2+rand(-30,30),VH()*0.38,0,'spd');
      burst(P.x,1.5,P.z,'#7fffd4',12,5);
    }
  }else P.treadAcc=0;
  pads.forEach(function(p,i){if(G.qty[i]>0)p.tex.offset.y-=dt*0.8;});
  for(var bs=0;bs<SLOT_N;bs++){var bb=BASES[bs];if(bs!==mySlot&&bb.built&&bb.g.visible)bb.pads.forEach(function(p){if(p.q>0)p.tex.offset.y-=dt*0.8;});}
  basesT+=dt;if(basesT>0.5){basesT=0;refreshBases();}

  /* ----- NPC/발사체 ----- */
  for(var k=0;k<npcs.length;k++){if(hostSide())npcLogic(npcs[k],dt,t);updateNPC(npcs[k],dt,t);updatePedestal(npcs[k],dt);}
  for(var j=projectiles.length-1;j>=0;j--){
    var b=projectiles[j];
    b.mesh.position.x+=b.vx*dt;b.mesh.position.z+=b.vz*dt;b.mesh.material.rotation+=dt*14;b.life-=dt;
    var hx=P.x-b.mesh.position.x,hz=P.z-b.mesh.position.z;
    if(!safe&&P.stun<=0&&Math.hypot(hx,hz)<1.7&&P.y<2.0){hitPlayer(null);}
    if(b.life<=0||Math.abs(b.mesh.position.x)>45){scene.remove(b.mesh);projectiles.splice(j,1);}
  }

  /* ----- 돈 ----- */
  var inc=income();G.money+=inc*dt;
  saveT+=dt;if(saveT>5){saveT=0;save();}

  /* ----- 플레이어 모델 ----- */
  pChar.root.position.set(P.x,P.y,P.z);pChar.root.rotation.y=P.face;
  pChar.body.rotation.x=-Math.PI/2*P.lie;pChar.body.position.y=0.75*P.lie;
  if(P.stun>0){swing(pChar,0,0);setFace(pChar,'sleep');}
  else{
    setFace(pChar,'happy');
    if(P.y>0.05){pChar.legL.rotation.x=-0.5;pChar.legR.rotation.x=0.5;pChar.armL.rotation.x=pChar.armR.rotation.x=-2.4;}
    else swing(pChar,P.phase,moving?0.9:0);
    if(P.carry>=0){pChar.armL.rotation.x=pChar.armR.rotation.x=-Math.PI*0.93;}
  }
  if(P.carry>=0){
    var ht=holdTrophies[P.carry];ht.position.y=6.7+Math.sin(t*6)*0.12+(P.stun>0?-4:0);ht.rotation.y+=dt*2;
    if(P.carry>=8&&P.stun<=0&&Math.random()<dt*14*fxMul)emit(P.x+rand(-1.2,1.2),P.y+rand(7.4,10),P.z+rand(-1.2,1.2),rand(-1,1),rand(1,3),rand(-1,1),gradeOf(P.carry).m,0.7,-1);
  }

  /* ----- 프롬프트 ----- */
  var near=null,nd=6;
  if(P.carry<0&&P.stun<=0){
    for(var q=0;q<npcs.length;q++){
      var np=npcs[q],d=Math.hypot(P.x-np.ped.x,P.z-np.ped.z);
      if(d<nd&&np.ped.has&&np.state==='sleep'){nd=d;near=np;}
    }
  }
  var pr=$('prompt'),nearR=(!near&&P.carry<0&&P.stun<=0)?findRaid():null;
  if(near){pr.style.display='block';pr.textContent=(isTouch?'[훔치기] 버튼':'[E] 키')+' — '+near.cfg.name+'의 ['+gradeOf(near.i).name+' 등급] 큰 손 훔치기';}
  else if(nearR){pr.style.display='block';pr.textContent=(isTouch?'[훔치기] 버튼':'[E] 키')+' — 🦝 '+(nearR.o.name||'친구')+'의 ['+gradeOf(nearR.i).name+' 등급] 큰 손 훔치기';}
  else pr.style.display='none';
  $('btnSteal').classList.toggle('ready',!!(near||nearR));

  /* ----- HUD ----- */
  hudT+=dt;
  if(hudT>0.12){
    hudT=0;
    $('hMoney').textContent=fmt(G.money);$('hInc').textContent=fmt(inc);
    $('hItems').textContent=G.counts.reduce(function(a,b){return a+b;},0);
    $('hCarry').textContent=P.carry>=0?' (+1 운반중!)':'';
    $('hSpeed').textContent=fmt(G.speed);
    if(safe){for(var s=0;s<TREADS.length;s++)shopBtns[s].disabled=G.money<treadPrice(s);refreshSkins();}
    $('hComboRow').style.display=G.streak>0?'block':'none';
    if(isTouch)syncShopBtn();
    $('hCombo').textContent=G.streak;$('hMult').textContent='(훔치기 보너스 ×'+comboMult().toFixed(1)+')';
    if(!goalEl)goalEl=$('goal');
    var gt=computeGoal(onPad);
    if(gt!==goalLast){goalLast=gt;goalEl.innerHTML=gt;}
    goalEl.classList.toggle('run',P.carry>=0&&P.stun<=0);
  }
  tagT+=dt;
  if(tagT>0.5){tagT=0;for(var tn=0;tn<npcs.length;tn++){var st=tagState(npcs[tn]);if(npcs[tn].tagSt!==st)drawTag(npcs[tn],st);}}
  updateSkills(dt);updateSkin(dt,moving);devTick();updateDungeon(dt);updatePending(dt);updateRemotes(dt,t);
  updateTrophyFx(t);
}

function updateCamera(dt){
  var tx=P.x,ty=P.y*0.5+4.5,tz=P.z,cp=cam.pitch;
  var dp=new THREE.Vector3(
    tx+Math.sin(cam.yaw)*Math.cos(cp)*cam.dist,
    Math.max(1.5,ty+Math.sin(cp)*cam.dist),
    tz+Math.cos(cam.yaw)*Math.cos(cp)*cam.dist);
  camPos.lerp(dp,1-Math.exp(-12*dt));
  camera.position.copy(camPos);if(shk>0.02){camera.position.x+=(Math.random()-.5)*shk;camera.position.y+=(Math.random()-.5)*shk;}camera.lookAt(tx,ty,tz);
  sun.position.set(P.x+40,90,P.z+30);sun.target.position.set(P.x,0,P.z);sun.target.updateMatrixWorld();
  stars.position.copy(camera.position);
}

/* =========================================================
   입력
   ========================================================= */
addEventListener('keydown',function(e){
  if(!started||modalOpen)return;
  if(e.code==='Space'||e.code.indexOf('Arrow')===0)e.preventDefault();
  if(e.code==='KeyE'&&!e.repeat)trySteal();
  if(e.code==='KeyM'&&!e.repeat)setBgmMuted(!bgmMuted);
  keys[e.code]=true;
});
addEventListener('keyup',function(e){keys[e.code]=false;});
addEventListener('blur',function(){keys={};});

var dragId=null,lx=0,ly=0,cv=renderer.domElement;
cv.addEventListener('pointerdown',function(e){
  if(dragId!==null)return;
  dragId=e.pointerId;lx=ptX(e);ly=ptY(e);
  try{cv.setPointerCapture(dragId);}catch(_){}
});
cv.addEventListener('pointermove',function(e){
  if(e.pointerId!==dragId)return;
  cam.yaw-=(ptX(e)-lx)*0.006;
  cam.pitch=clamp(cam.pitch+(ptY(e)-ly)*0.005,0.08,1.3);
  lx=ptX(e);ly=ptY(e);
});
function endDrag(e){if(e.pointerId===dragId)dragId=null;}
cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
cv.addEventListener('wheel',function(e){cam.dist=clamp(cam.dist+e.deltaY*0.01,8,32);e.preventDefault();},{passive:false});
cv.addEventListener('contextmenu',function(e){e.preventDefault();});

var jz=$('joyZone'),jb=$('joyBase'),jk=$('joyKnob'),jid=null,jcx=0,jcy=0,JR=55;
jz.addEventListener('pointerdown',function(e){
  if(jid!==null)return;
  jid=e.pointerId;try{jz.setPointerCapture(jid);}catch(_){}
  jcx=ptX(e);jcy=ptY(e);
  jb.style.left=(jcx-65)+'px';jb.style.top=(jcy-65)+'px';jb.style.bottom='auto';
  jk.style.transform='translate(0,0)';e.preventDefault();
});
jz.addEventListener('pointermove',function(e){
  if(e.pointerId!==jid)return;
  var dx=ptX(e)-jcx,dy=ptY(e)-jcy,d=Math.hypot(dx,dy);
  if(d>JR){dx*=JR/d;dy*=JR/d;}
  jk.style.transform='translate('+dx+'px,'+dy+'px)';
  joy.x=dx/JR;joy.y=-dy/JR;
});
function joyEnd(e){
  if(e.pointerId!==jid)return;
  jid=null;joy.x=0;joy.y=0;jk.style.transform='translate(0,0)';
  jb.style.left='';jb.style.top='';jb.style.bottom='';
}
jz.addEventListener('pointerup',joyEnd);jz.addEventListener('pointercancel',joyEnd);

$('btnSteal').addEventListener('pointerdown',function(e){e.preventDefault();trySteal();});
$('btnJump').addEventListener('pointerdown',function(e){e.preventDefault();jumpHeld=true;wantJump=true;});
['pointerup','pointercancel','pointerleave'].forEach(function(ev){$('btnJump').addEventListener(ev,function(){jumpHeld=false;});});

addEventListener('resize',function(){
  applyOrient();
});
addEventListener('pagehide',save);
document.addEventListener('visibilitychange',function(){
  if(document.hidden){save();keys={};joy.x=joy.y=0;if(AC&&AC.suspend&&NET.mode!=='host')AC.suspend();}
  else if(AC&&AC.resume)AC.resume();
});

/* =========================================================
   시작 & 루프
   ========================================================= */
redrawMyBase();refreshBases(true);
refreshShop();

$('muteBtn').addEventListener('click',function(){setBgmMuted(!bgmMuted);});
setBgmMuted(bgmMuted);
$('startBtn').addEventListener('click',function(){
  initAudio();started=true;$('start').style.display='none';
  $('shop').classList.toggle('hide',!inSafe());
  toast('🏆 가장 가까운 받침대부터 훔쳐보자! (길 따라 앞으로)','good');
});

/* =========================================================
   📱 모바일 화면 정리: 메뉴(☰)로 버튼 모으기 · 상점은 버튼으로 열기 · 세로 화면 시야 넓히기
   ========================================================= */
function syncShopBtn(){
  var av=!$('shop').classList.contains('hide');
  $('shopBtn').style.display=av&&!document.body.classList.contains('shopOpen')?'block':'none';
  if(!av)document.body.classList.remove('shopOpen');
}
$('shopBtn').addEventListener('click',function(){this.blur();document.body.classList.add('shopOpen');document.body.classList.remove('menu');syncShopBtn();});
$('shopClose').addEventListener('click',function(){this.blur();document.body.classList.remove('shopOpen');syncShopBtn();});
$('menuBtn').addEventListener('click',function(){this.blur();document.body.classList.toggle('menu');});
['muteBtn','fxBtn','bkBtn','mpBtn'].forEach(function(id){$(id).addEventListener('click',function(){if(isTouch)document.body.classList.remove('menu');});});
renderer.domElement.addEventListener('pointerdown',function(){document.body.classList.remove('menu');});
function applyOrient(){
  ROT=isPhone&&innerHeight>innerWidth;
  var bd=document.body,st=bd.style,w,h;
  bd.classList.toggle('rot',ROT);
  if(ROT){st.width=innerHeight+'px';st.height=innerWidth+'px';}else{st.width='';st.height='';}
  w=VW();h=VH();
  var rs=document.documentElement.style;rs.setProperty('--vw',(w/100)+'px');rs.setProperty('--vh',(h/100)+'px');
  var portrait=h>w*1.1;
  bd.classList.toggle('pt',portrait);bd.classList.toggle('ls',!portrait);bd.classList.toggle('short',h<=500);
  renderer.setSize(w,h);
  camera.fov=portrait?78:65;camera.aspect=w/h;camera.updateProjectionMatrix();
  if(isTouch&&portrait&&cam.dist<20)cam.dist=20;
}
var orientT=0;
function queueOrient(){clearTimeout(orientT);orientT=setTimeout(applyOrient,120);}
addEventListener('orientationchange',queueOrient);
if(screen.orientation&&screen.orientation.addEventListener)screen.orientation.addEventListener('change',queueOrient);
applyOrient();
/* 안드로이드: 버튼을 누르면 전체 화면 + 가로 고정 (아이폰은 지원 안 해서 위의 '화면 돌리기'로 대신해요) */
function tryLandscape(){
  if(!isPhone)return;
  var el=document.documentElement,rf=el.requestFullscreen||el.webkitRequestFullscreen,p=null;
  function lock(){try{var o=screen.orientation;if(o&&o.lock){var q=o.lock('landscape');if(q&&q.catch)q.catch(function(){});}}catch(e){}}
  if(rf&&!(document.fullscreenElement||document.webkitFullscreenElement)){try{p=rf.call(el,{navigationUI:'hide'});}catch(e){p=null;}}
  if(p&&p.then)p.then(function(){lock();queueOrient();},function(){});else lock();
}
document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('button'))tryLandscape();},true);
var rotHint=false;
$('startBtn').addEventListener('click',function(){
  if(isTouch&&!isPhone&&!rotHint&&innerHeight>innerWidth*1.1){rotHint=true;setTimeout(function(){toast('📱 가로로 돌리면 더 넓게 보여요!','warn');},1200);}
});

function setFx(l,auto){
  fxLevel=l;fxMul=l?1:0.3;
  renderer.setPixelRatio(l?Math.min(window.devicePixelRatio||1,isTouch?1.5:2):1);renderer.setSize(VW(),VH());
  sun.castShadow=!!l;
  fxList.forEach(function(f){if(f.ring)f.ring.visible=!!l;f.stars.forEach(function(x){x.visible=!!l;});if(f.halo)f.halo.visible=!!l;});
  $('fxBtn').textContent=l?'✨ 이펙트: 보통':'✨ 이펙트: 최소';
  if(auto)toast('📉 화면이 버벅여서 이펙트를 줄였어요 (왼쪽 ✨ 버튼으로 되돌릴 수 있어요)','warn');
  else{try{localStorage.setItem('steal-a-roh-fx',l?'1':'0');}catch(e){}}
}
$('fxBtn').addEventListener('click',function(){setFx(fxLevel?0:1,false);});
try{if(localStorage.getItem('steal-a-roh-fx')==='0')setFx(0,false);}catch(e){}
var lowT=0,emaDt=1/60;
var last=performance.now(),clock=0;
function loop(now){
  requestAnimationFrame(loop);
  var raw=(now-last)/1000;
  var dt=Math.min(0.05,raw);last=now;clock+=dt;
  if(started&&clock>6&&fxLevel&&!document.hidden){
    emaDt=emaDt*0.95+Math.min(raw,0.25)*0.05;
    if(emaDt>1/30)lowT+=raw;else lowT=Math.max(0,lowT-raw);
    if(lowT>5){lowT=0;setFx(0,true);}
  }
  crowdTime.value=clock;
  if(started){update(dt,clock);netTick(dt);}
  else{
    /* 시작 화면 뒤 배경: 캐릭터 대기 */
    pChar.root.position.set(P.x,0,P.z);pChar.root.rotation.y=P.face;
    cam.yaw=Math.PI+Math.sin(clock*0.2)*0.4;
  }
  updateParticles(dt);
  updateCamera(dt);
  renderer.render(scene,camera);
}
requestAnimationFrame(loop);
/* 방장이 다른 탭으로 가도 친구들 월드가 멈추지 않게 (화면은 안 그리고 계산만) */
var bgLast=0;
setInterval(function(){
  if(!document.hidden||!started||NET.mode!=='host'){bgLast=0;return;}
  var now=performance.now(),dt=bgLast?Math.min(0.1,(now-bgLast)/1000):0.05;bgLast=now;
  clock+=dt;update(dt,clock);netTick(1);
},50);

})();
