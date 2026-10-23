const NAV = [
  {id:'home', label:'首页', icon:'⌂', title:'剂量首页'},
  {id:'realtime', label:'实时', icon:'⌁', title:'实时监测'},
  {id:'device', label:'设备', icon:'▣', title:'设备管理'},
  {id:'reports', label:'周报', icon:'▤', title:'辐射周报'},
  {id:'protocol', label:'协议', icon:'↔', title:'通信协议模拟'}
];

const state = {
  deviceId:'PR-20260703-002', rd:0.126, acDo:17.945488,
  now:new Date('2026-10-23T18:03:00'),
  points:[], recent:[], weekly:[0.91,0.94,0.99,1.03,0.98,1.00,1.06]
};

const $ = s => document.querySelector(s); const $$ = s => [...document.querySelectorAll(s)];
const fmt = (n,d=3) => Number(n).toFixed(d);
const pad = n => String(n).padStart(2,'0');
function dateTime(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`}
function protoTime(d){return `${String(d.getFullYear()).slice(-2)}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`}

function initNav(){
  const markup = NAV.map(n=>`<button class="nav-item ${n.id==='home'?'active':''}" data-nav="${n.id}"><span class="nav-icon">${n.icon}</span><span class="nav-label">${n.label}</span></button>`).join('');
  $('.side-nav').innerHTML=markup; $('.mobile-nav').innerHTML=markup;
  $$('[data-nav]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.nav)));
  $$('.nav-jump').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.target)));
}
function showPage(id){
  $$('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===id));
  $$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===id));
  $('#pageTitle').textContent=NAV.find(n=>n.id===id)?.title||'';
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='realtime') drawRealtime(); if(id==='reports') renderReports();
}

function seed(){
  for(let i=59;i>=0;i--){
    const d=new Date(state.now.getTime()-i*1000); const rd=0.105+Math.sin(i/7)*0.012+(Math.random()-.5)*0.012;
    state.points.push({time:d,rd:Math.max(.08,rd),acDo:state.acDo-(i*.00003)});
  }
  state.recent = state.points.slice(-8).reverse();
}

function updateDOM(){
  const rd=fmt(state.rd), ac=fmt(state.acDo), t=dateTime(state.now);
  ['#homeRD','#rtRD','#rtRD2'].forEach(s=>$(s).textContent=rd);
  ['#homeAcDo','#metricAcDo','#rtAcDo'].forEach(s=>$(s).textContent=ac);
  ['#homeTime','#rtTime'].forEach(s=>$(s).textContent=t);
  ['#homeDeviceId','#rtDevice','#deviceIdText','#parsedId'].forEach(s=>{if($(s)) $(s).textContent=s==='#deviceIdText'?`设备 ID：${state.deviceId}`:state.deviceId});
  const pct=Math.max(8,Math.min(78,(state.rd/.5)*100)); $('.range-marker').style.left=pct+'%'; $('#rangeFill').style.width=pct+'%';
  renderRecent(); renderRTRows();
}
function renderRecent(){
  $('#recentRows').innerHTML=state.recent.slice(0,6).map(r=>`<tr><td>${dateTime(r.time)}</td><td><b>${fmt(r.rd)}</b> μSv/h</td><td>${fmt(r.acDo)} μSv</td><td><span class="status-tag">正常</span></td></tr>`).join('');
}
function renderRTRows(){
  $('#rtRows').innerHTML=state.recent.slice(0,10).map((r,i)=>`<tr><td>${i+1}</td><td>${dateTime(r.time)}</td><td><b>${fmt(r.rd)}</b></td><td>${fmt(r.acDo)}</td><td><span class="status-tag">正常</span></td></tr>`).join('');
}

function chart(canvas, values, opts={}){
  if(!canvas) return; const dpr=window.devicePixelRatio||1; const cssW=canvas.clientWidth||600; const cssH=canvas.getAttribute('height')?Number(canvas.getAttribute('height')):180;
  canvas.width=cssW*dpr; canvas.height=cssH*dpr; canvas.style.height=cssH+'px'; const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,cssW,cssH);
  const padL=10,padR=10,padT=14,padB=24, W=cssW-padL-padR,H=cssH-padT-padB; const min=Math.min(...values)*.92,max=Math.max(...values)*1.08; const y=v=>padT+H-(v-min)/(max-min||1)*H; const x=i=>padL+(values.length<=1?0:i/(values.length-1)*W);
  ctx.strokeStyle='#e7eef1';ctx.lineWidth=1;for(let i=0;i<4;i++){const yy=padT+i*(H/3);ctx.beginPath();ctx.moveTo(padL,yy);ctx.lineTo(cssW-padR,yy);ctx.stroke()}
  if(opts.baseline){ctx.setLineDash([5,5]);ctx.strokeStyle='#9fb2ba';ctx.beginPath();ctx.moveTo(padL,y(opts.baseline));ctx.lineTo(cssW-padR,y(opts.baseline));ctx.stroke();ctx.setLineDash([])}
  const grad=ctx.createLinearGradient(0,padT,0,padT+H);grad.addColorStop(0,'rgba(15,119,151,.22)');grad.addColorStop(1,'rgba(15,119,151,0)');ctx.beginPath();values.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.lineTo(x(values.length-1),padT+H);ctx.lineTo(x(0),padT+H);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();values.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.strokeStyle='#0b6f91';ctx.lineWidth=2.3;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  if(values.length<12){values.forEach((v,i)=>{ctx.fillStyle='#fff';ctx.strokeStyle='#0b6f91';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x(i),y(v),3.4,0,Math.PI*2);ctx.fill();ctx.stroke()})}
}
function drawWeekly(){chart($('#weeklyChart'),state.weekly);chart($('#modalChart'),state.weekly)}
function drawRealtime(){chart($('#realtimeChart'),state.points.map(p=>p.rd),{baseline:.10})}

function simulateTick(){
  state.now=new Date(state.now.getTime()+1000); const prev=state.rd; let next=prev+(Math.random()-.49)*.009 + (.11-prev)*.06; next=Math.max(.075,Math.min(.42,next));state.rd=next;state.acDo+=state.rd/3600;
  const rec={time:new Date(state.now),rd:state.rd,acDo:state.acDo};state.points.push(rec);if(state.points.length>60)state.points.shift();state.recent.unshift(rec);if(state.recent.length>12)state.recent.pop();updateDOM();if($('.page.active')?.dataset.page==='realtime')drawRealtime();
}

function samplePacket(){
  const base=new Date(state.now.getTime()-59000); let body=state.deviceId;
  let ac=state.acDo-.0009;
  for(let i=0;i<60;i++){
    const d=new Date(base.getTime()+i*1000); const rd=.11+Math.sin(i/8)*.018+(Math.random()-.5)*.01;ac+=rd/3600;
    body+=`&Time=${protoTime(d)}&RD=${rd.toFixed(6)}&Am=100&Av=100&Ac=100&DP=50&AcDo=${ac.toFixed(6)}&DyDo=100&ICA=No`;
  }
  $('#packetInput').value=body; return body;
}
function parsePacket(text){
  text=(text||'').trim();if(!text) throw new Error('报文为空');
  const firstAmp=text.indexOf('&');const id=(firstAmp>0?text.slice(0,firstAmp):state.deviceId).replace(/^Id=/i,'');
  const rx=/Time=([^&]+)&RD=([^&]+)(?:&Am=[^&]*)?(?:&Av=[^&]*)?(?:&Ac=[^&]*)?(?:&DP=[^&]*)?&AcDo=([^&]+)/gi;
  let m, arr=[]; while((m=rx.exec(text))!==null){arr.push({time:m[1],rd:Number(m[2]),acDo:Number(m[3])})}
  if(!arr.length) throw new Error('未找到 Time / RD / AcDo 记录');
  const last=arr[arr.length-1];state.deviceId=id;state.rd=last.rd;state.acDo=last.acDo;
  const parts=last.time.match(/(\d{2,4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);if(parts){let year=Number(parts[1]);if(year<100)year+=2000;state.now=new Date(year,Number(parts[2])-1,Number(parts[3]),Number(parts[4]),Number(parts[5]),Number(parts[6]))}
  state.points=arr.slice(-60).map(r=>({time:new Date(state.now.getTime()-(arr.length-1-arr.indexOf(r))*1000),rd:r.rd,acDo:r.acDo}));state.recent=state.points.slice(-12).reverse();
  $('#parsedId').textContent=id;$('#parsedTime').textContent=last.time;$('#parsedRD').textContent=last.rd.toFixed(6);$('#parsedAcDo').textContent=last.acDo.toFixed(6);$('#parsedCount').textContent=`${arr.length} 条`;
  $('#uploadStatus').textContent=`刚刚接收 ${arr.length} 条监测记录`;$('#deviceUploadTime').textContent='刚刚';updateDOM();drawRealtime();toast(`解析成功：${arr.length} 条记录已更新`);
}

function renderReports(){
  const weeks=[
    ['第 42 周','2026.10.12 - 10.18','6.91 μSv','0.312 μSv/h','正常'],
    ['第 41 周','2026.10.05 - 10.11','5.88 μSv','0.271 μSv/h','正常'],
    ['第 40 周','2026.09.28 - 10.04','6.15 μSv','0.298 μSv/h','正常'],
    ['第 39 周','2026.09.21 - 09.27','6.77 μSv','0.341 μSv/h','正常'],
    ['第 38 周','2026.09.14 - 09.20','6.03 μSv','0.279 μSv/h','正常'],
    ['第 37 周','2026.09.07 - 09.13','6.22 μSv','0.301 μSv/h','正常']
  ];
  $('#reportList').innerHTML=weeks.map((w,i)=>`<article class="card report-item"><div class="report-item-top"><div><span class="report-date">${w[1]}</span><h3>${w[0]}辐射监测周报</h3></div><span class="pill success">${w[4]}</span></div><div class="report-mini-grid"><div><span>累计剂量</span><b>${w[2]}</b></div><div><span>峰值剂量率</span><b>${w[3]}</b></div></div><button class="text-btn" data-open-report="${i}">查看周报 <span>›</span></button></article>`).join('');
  $$('[data-open-report]').forEach(b=>b.addEventListener('click',openReport));
}
function openReport(){ $('#reportModal').classList.add('open');$('#reportModal').setAttribute('aria-hidden','false');setTimeout(drawWeekly,40) }
function closeReport(){ $('#reportModal').classList.remove('open');$('#reportModal').setAttribute('aria-hidden','true') }
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(window.__tt);window.__tt=setTimeout(()=>el.classList.remove('show'),2100)}

function wire(){
  $('#samplePacketBtn').addEventListener('click',()=>{samplePacket();toast('已生成 60 条模拟上报数据')});
  $('#parseBtn').addEventListener('click',()=>{try{parsePacket($('#packetInput').value)}catch(e){toast('解析失败：'+e.message)}});
  $('#demoBtn').addEventListener('click',()=>{const t=samplePacket();parsePacket(t);showPage('home')});
  $('#syncTimeBtn').addEventListener('click',()=>{$('#lastSync').textContent=dateTime(state.now);toast('校时模拟成功：服务端已回显当前时间')});
  $('#modalClose').addEventListener('click',closeReport);$('#reportModal').addEventListener('click',e=>{if(e.target.id==='reportModal')closeReport()});
  $$('[data-open-report]').forEach(b=>b.addEventListener('click',openReport));
  window.addEventListener('resize',()=>{drawWeekly();drawRealtime()});
}

initNav();seed();samplePacket();renderReports();updateDOM();drawWeekly();drawRealtime();wire();setInterval(simulateTick,1000);

// When the page is served by server.py, pull real device uploads into the same UI model.
let backendSeenAt = null;
async function pollBackend(){
  if(!/^https?:$/.test(location.protocol) || location.hostname.endsWith('github.io')) return;
  try{
    const r = await fetch('/api/latest', {cache:'no-store'});
    if(!r.ok) return;
    const data = await r.json();
    if(!data.latest || !data.receivedAt || data.receivedAt===backendSeenAt) return;
    backendSeenAt=data.receivedAt;
    state.deviceId=data.deviceId||state.deviceId;
    state.rd=Number(data.latest.rd);
    state.acDo=Number(data.latest.acDo);
    const p=String(data.latest.time||'').match(/(\d{2,4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if(p){let y=Number(p[1]);if(y<100)y+=2000;state.now=new Date(y,Number(p[2])-1,Number(p[3]),Number(p[4]),Number(p[5]),Number(p[6]))}
    if(Array.isArray(data.records)&&data.records.length){
      state.points=data.records.map((r,i)=>({time:new Date(state.now.getTime()-(data.records.length-1-i)*1000),rd:Number(r.rd),acDo:Number(r.acDo)}));
      state.recent=state.points.slice(-12).reverse();
    }
    $('#uploadStatus').textContent=`真实设备上报：${data.recordCount||1} 条记录`;
    $('#deviceUploadTime').textContent='刚刚';
    updateDOM();drawRealtime();
    toast(`收到设备 ${state.deviceId} 的真实上报`);
  }catch(_e){}
}
setInterval(pollBackend, 2000);pollBackend();
