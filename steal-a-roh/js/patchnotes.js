/* =========================================================
   패치노트
   - 업데이트할 때 맨 위에 새 항목을 추가하세요 (v 값을 꼭 바꾸기!)
   - 접속했을 때 마지막으로 본 버전과 다르면 자동으로 창이 떠요
   - 오른쪽 아래 버전 표시를 누르면 언제든 다시 볼 수 있어요
   ========================================================= */
window.PATCH_NOTES=[
  {v:'v9',date:'2026-11-16',title:'패치노트 추가',items:[
    '📜 업데이트 후 처음 접속하면 패치노트가 떠요',
    '📜 오른쪽 아래 버전 표시를 누르면 패치노트를 다시 볼 수 있어요'
  ]},
  {v:'v8',date:'2026-11-16',title:'던전 업데이트',items:[
    '⚔️ 던전 [E] 공격력이 속도에 비례해요 (속도 10배 → 공격력 10배)',
    '🟢🟡🔴 던전 난이도 쉬움/보통/어려움 추가 (몹 수·보스 체력/공격·보상이 달라요)',
    '🕳️ 다시 들어갈 때 찢어진 바닥에는 스폰되지 않아요'
  ]},
  {v:'v7',date:'2026-11-16',title:'뺏기 · 채팅',items:[
    '🏠 한 사람당 기지 1칸 (방 최대 4명)',
    '🫳 다른 사람이 들고 가는 큰 손을 [E]로 뺏을 수 있어요',
    '💬 채팅 추가 (Enter / 💬 버튼)',
    '🔊 던전 구멍에 떨어지면 새 소리가 나요',
    '👟 한 걸음 걸을 때마다 속도 +1'
  ]},
  {v:'v6',date:'2026-11-16',title:'기지 4칸 · 기지 털기',items:[
    '🏠 기지가 4칸으로 넓어졌어요 (빈 칸도 항상 보여요)',
    '🦝 친구 기지의 트로피를 훔칠 수 있어요 · 주인에게 닿으면 돌려줘야 해요'
  ]}
];
(function(){
  var NOTES=window.PATCH_NOTES,CUR=NOTES[0].v,KEY='steal-a-roh-patch-seen';
  window.GAME_VER=CUR;
  var css=document.createElement('style');
  css.textContent='#pnModal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6);z-index:90;padding:14px}'+
    '#pnModal .pnBox{width:100%;max-width:460px;max-height:86vh;overflow-y:auto;background:#0f1d3a;border:2px solid #ffd54a;border-radius:16px;padding:16px 18px;color:#fff;box-shadow:0 10px 40px rgba(0,0,0,.6)}'+
    '#pnModal h3{margin:0 0 4px;font-size:21px}#pnModal .pnSub{color:#9fb3c8;font-size:12.5px;margin-bottom:10px}'+
    '#pnModal .pnV{margin:10px 0 0;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.05)}'+
    '#pnModal .pnV.new{background:rgba(255,213,74,.12);border:1px solid rgba(255,213,74,.5)}'+
    '#pnModal .pnV b{color:#ffd54a}#pnModal .pnV small{color:#9fb3c8;margin-left:6px}#pnModal ul{margin:6px 0 0;padding-left:18px;line-height:1.55;font-size:14px}'+
    '#pnModal button{margin-top:14px;width:100%;padding:10px;border:0;border-radius:10px;background:#ffd54a;color:#3e2300;font-size:16px;font-weight:900;cursor:pointer;touch-action:manipulation}'+
    '#pnModal .pnNew{background:#e53935;color:#fff;font-weight:900;font-size:10.5px;padding:1px 6px;border-radius:6px;margin-left:4px}'+
    '#verTag{pointer-events:auto!important;cursor:pointer;z-index:55!important}#verTag:hover{color:#ffd54a}';
  document.head.appendChild(css);
  var m=document.createElement('div');m.id='pnModal';
  var seen='';try{seen=localStorage.getItem(KEY)||'';}catch(e){}
  function esc(t){return String(t).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
  function render(){
    /* 마지막으로 본 버전 이후의 항목은 '새로움'으로 강조 */
    var html='<div class="pnBox"><h3>📜 패치노트</h3><div class="pnSub">지금 버전: <b>'+CUR+'</b></div>',isNew=true;
    NOTES.forEach(function(n){
      if(n.v===seen)isNew=false;
      html+='<div class="pnV'+(isNew&&seen!==CUR?' new':'')+'"><b>'+esc(n.v)+' · '+esc(n.title)+'</b><small>'+esc(n.date)+(isNew&&seen!==CUR?' <span class="pnNew">NEW</span>':'')+'</small><ul>'+
        n.items.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul></div>';
    });
    m.innerHTML=html+'<button type="button" id="pnOk">확인!</button></div>';
    document.getElementById('pnOk').addEventListener('click',close);
  }
  function open(){render();m.style.display='flex';}
  function close(){m.style.display='none';seen=CUR;try{localStorage.setItem(KEY,CUR);}catch(e){}}
  window.openPatchNotes=open;
  function init(){
    document.body.appendChild(m);
    m.addEventListener('click',function(e){if(e.target===m)close();});
    var vt=document.getElementById('verTag');
    if(vt){vt.textContent=CUR+' · 📜 패치노트';vt.addEventListener('click',open);}
    if(seen!==CUR)open(); /* 업데이트 후 처음 접속 → 자동으로 보여주기 */
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
