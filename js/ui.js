/* 题灵录 · ui */
/* ================= 导航（页面栈） ================= */
let navStack=[{page:'home',params:{},sc:0}];
let popGuard=false,examTimer=null;
/* 浏览器对 history 有条数上限（约 50），超限后 pushState 仍会改 state 但不新增条目。
   所以绝不能「按层数 go(-N)」——那会一步退回本文档之外，表现为白屏 / 数据全丢。
   这里只在「返回上一页」时 go(-1)，回首页用 replaceState，永远不跨文档。 */
const HIST_CAP=40;
function histLevel(){
  const s=history.state;
  return (s&&typeof s.__qt==='number'&&s.__qt>=0)?s.__qt:0;
}
function histReset(){try{history.replaceState({__qt:0},'','');}catch(e){}}
function histPush(){
  const cur=histLevel();
  /* 接近上限就改成覆盖当前条目，避免条目被浏览器挤掉后回退错位 */
  if(cur>=HIST_CAP){try{history.replaceState({__qt:cur},'','');}catch(e){}return;}
  try{history.pushState({__qt:cur+1},'','');}catch(e){}
}
histReset();
const $id=i=>document.getElementById(i);
function curPage(){return navStack[navStack.length-1];}
function saveSc(){curPage().sc=window.scrollY||0;}
function goTo(page,params){saveSc();navStack.push({page,params:params||{},sc:0});histPush();render();}
function goBack(){
  if(navStack.length<=1)return;
  navStack.pop();
  if(histLevel()>0){popGuard=true;try{history.go(-1);}catch(e){popGuard=false;}}
  render();
}
function goHome(){navStack=[{page:'home',params:{},sc:0}];histReset();render();}
function resetTo(page,params){
  navStack=[{page:'home',params:{},sc:0},{page,params:params||{},sc:0}];
  histReset();histPush();render();
}
function reRender(newParams){if(newParams)Object.assign(curPage().params,newParams);render();}
window.addEventListener('popstate',()=>{
  if(popGuard){popGuard=false;return;}
  if(navStack.length>1){navStack.pop();render();}
});

/* ================= UI 工具 ================= */
/* 读取本地 JSON 文件（iOS 上 file.text() 可用，老环境退回 FileReader） */
async function readJsonFile(file){
  const txt=file.text?await file.text():await new Promise((res,rej)=>{
    const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('文件读取失败'));r.readAsText(file);
  });
  try{return JSON.parse(txt);}
  catch(e){throw new Error('不是合法的 JSON 文件'+(e&&e.message?('：'+e.message):''));}
}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
/* 只保留实际用到的线性图标；首页宫格用的是下面的 DUO_ICONS */
const ICON_PATHS={
 layers:'<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
 trash:'<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>',
 cloud:'<path d="M7 18.5a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18.3 11 3.75 3.75 0 0 1 17.5 18.5Z"/>',
 trayDown:'<path d="M5 11v6.5h14V11"/><path d="M12 4v9"/><path d="m8.5 9.5 3.5 3.5 3.5-3.5"/>',
 trayUp:'<path d="M5 11v6.5h14V11"/><path d="M12 13V4"/><path d="m8.5 7.5 3.5-3.5 3.5 3.5"/>',
 download:'<path d="M12 4v10"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 19.5h14"/>',
 palette:'<rect x="3.6" y="3.6" width="7.2" height="7.2" rx="2.2"/><rect x="13.2" y="3.6" width="7.2" height="7.2" rx="2.2"/><rect x="3.6" y="13.2" width="7.2" height="7.2" rx="2.2"/><rect x="13.2" y="13.2" width="7.2" height="7.2" rx="2.2" fill="currentColor" stroke="none"/>'
 ,info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11.2v5.3"/><circle cx="12" cy="7.9" r="1.1" fill="currentColor" stroke="none"/>'
 ,filter:'<path d="M3.6 5.2h16.8l-6.6 7.5v6.1l-3.6 2v-8.1Z"/>'
 ,clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>'
};
function icon(name,size){
  return '<svg class="ic" width="'+(size||22)+'" height="'+(size||22)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICON_PATHS[name]||'')+'</svg>';
}
/* 首页宫格用的 duotone 图标：半透明白填充 + 白色描边 */
const DUO_ICONS={
 book:{
  f:'<path d="M4.3 6.5c2.5-.7 5-.2 7.7 1.6 2.7-1.8 5.2-2.3 7.7-1.6v11.1c-2.5-.7-5-.2-7.7 1.6-2.7-1.8-5.2-2.3-7.7-1.6z"/>',
  l:'<path d="M4.3 6.5c2.5-.7 5-.2 7.7 1.6 2.7-1.8 5.2-2.3 7.7-1.6v11.1c-2.5-.7-5-.2-7.7 1.6-2.7-1.8-5.2-2.3-7.7-1.6z"/><path d="M12 8.1v11.1"/>'},
 timer:{
  f:'<circle cx="12" cy="13.9" r="6.9"/>',
  l:'<circle cx="12" cy="13.9" r="6.9"/><path d="M12 10.4v3.5l2.3 1.4"/><path d="M9.7 3.5h4.6"/><path d="M12 3.5v2.4"/>'},
 layers:{
  f:'<rect x="4.2" y="11" width="15.6" height="7.2" rx="2.2"/>',
  l:'<rect x="4.2" y="11" width="15.6" height="7.2" rx="2.2"/><path d="M6.2 8.4h11.6"/><path d="M8.2 5.8h7.6"/>'},
 doc:{
  f:'<path d="M6.6 3.4h6.9L18 7.9v12.7H6.6z"/>',
  l:'<path d="M6.6 3.4h6.9L18 7.9v12.7H6.6z"/><path d="M13.5 3.4v4.5H18"/><path d="M9.4 12.6h5.6M9.4 16h5.6"/>'},
 pencil:{
  f:'<rect x="4.8" y="3.4" width="14.4" height="17.2" rx="2.8"/>',
  l:'<rect x="4.8" y="3.4" width="14.4" height="17.2" rx="2.8"/><path d="M8.6 3.4v17.2"/><path d="m11 10.4 3.4 3.4M14.4 10.4l-3.4 3.4"/>'},
 star:{
  f:'<path d="m12 3.5 2.6 5.27 5.82.85-4.21 4.1 1 5.79L12 16.78l-5.21 2.73 1-5.79-4.21-4.1 5.82-.85z"/>',
  l:'<path d="m12 3.5 2.6 5.27 5.82.85-4.21 4.1 1 5.79L12 16.78l-5.21 2.73 1-5.79-4.21-4.1 5.82-.85z"/>'},
 library:{
  f:'<rect x="3.7" y="5.2" width="4.5" height="15" rx="1.5"/><rect x="9.75" y="3.4" width="4.5" height="16.8" rx="1.5"/><rect x="15.8" y="6.6" width="4.5" height="13.6" rx="1.5"/>',
  l:'<rect x="3.7" y="5.2" width="4.5" height="15" rx="1.5"/><rect x="9.75" y="3.4" width="4.5" height="16.8" rx="1.5"/><rect x="15.8" y="6.6" width="4.5" height="13.6" rx="1.5"/>'},
 tag:{
  f:'<path d="M4.4 6.1h8.9l5.8 5.9-5.8 5.9H4.4z"/>',
  l:'<path d="M4.4 6.1h8.9l5.8 5.9-5.8 5.9H4.4z"/><circle cx="8.3" cy="12" r="1.35"/>'},
 learn:{
  f:'<rect x="4.2" y="5.6" width="15.6" height="14.4" rx="3.2"/>',
  l:'<rect x="4.2" y="5.6" width="15.6" height="14.4" rx="3.2"/><path d="M8.4 3.4v3.4M15.6 3.4v3.4"/><path d="m8.9 13.2 2.3 2.3 4-4.2"/>'}
};
function iconDuo(name,size){
  const d=DUO_ICONS[name]||DUO_ICONS.book;
  const s=size||24;
  return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" aria-hidden="true">'
    +'<g fill="#fff" fill-opacity=".34" stroke="none">'+d.f+'</g>'
    +'<g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+d.l+'</g>'
    +'</svg>';
}
const THEMES={
 qingshuang:{name:'护眼清爽',desc:'温润 · 低蓝光',p:['#f6f8ee','#ebf0de','#fcfcf4','#3a6b45','#2f6f78','#a8503a']},
 night:{name:'夜阑',desc:'深蓝 · 青 · 夜间',p:['#0f131a','#151a22','#1a1f28','#6db3f2','#3fb8a8','#fbbf24']},
 ocean:{name:'碧海',desc:'晴空 · 深海',p:['#f3fbff','#e3eefc','#ffffff','#1a6bb2','#0f8f8f','#d9694a']},
 shuimo:{name:'水墨',desc:'素纸 · 墨 · 朱',p:['#fbfaf7','#eeeeea','#ffffff','#2e2e36','#b93a2c','#5f7f79']}
};
/* 状态栏 / 浏览器 UI 颜色跟随当前主题，否则换成夜间主题后顶上是浅色的 */
function applyThemeColor(){
  const t=document.body.dataset.theme||'qingshuang';
  const th=THEMES[t]||THEMES.qingshuang;
  const m=document.querySelector('meta[name="theme-color"]');
  if(m&&th&&th.p&&th.p[0])m.setAttribute('content',th.p[0]);
}
function toast(msg,type){
  const d=document.createElement('div');d.className='toast'+(type?' '+type:'');d.textContent=msg;
  $id('toasts').appendChild(d);setTimeout(()=>d.remove(),2600);
}
let modalOpen=false;
function closeModal(){const r=$id('modal-root');r.innerHTML='';modalOpen=false;}
function qtConfirm(opt){
  const r=$id('modal-root');
  r.innerHTML='<div class="mask" data-act="modal.mask"><div class="modal" data-stop="1">'
    +'<h3>'+esc(opt.title||'确认')+'</h3><div class="m-msg">'+esc(opt.msg||'')+'</div>'
    +'<div class="m-btns"><button class="btn btn-ghost" data-act="modal.cancel">'+esc(opt.cancelText||'取消')+'</button>'
    +'<button class="btn '+(opt.danger?'btn-danger':'btn-primary')+'" data-act="modal.ok">'+esc(opt.okText||'确定')+'</button></div></div></div>';
  modalOpen=true;
  window.__modalOk=()=>{closeModal();opt.onOk&&opt.onOk();};
}
function showBanner(msg){
  let b=$id('top-banner');
  if(!b){b=document.createElement('div');b.id='top-banner';b.className='top-banner';
    b.setAttribute('data-act','banner.dismiss');document.body.appendChild(b);}
  b.textContent=msg;b.style.display='block';
}
function fmtAns(q,ansVal){
  if(q.type==='blank'){
    if(Array.isArray(ansVal)){
      const parts=ansVal.map(x=>String(x==null?'':x).trim()).filter(x=>x!=='');
      return parts.length?parts.join(' / '):'未作答';
    }
    return (ansVal&&String(ansVal).trim())?String(ansVal).trim():'未作答';
  }
  if(!OBJ_TYPES.includes(q.type))return ansVal&&String(ansVal).trim()?String(ansVal).trim():'未作答';
  if(ansVal==null||(Array.isArray(ansVal)&&ansVal.length===0))return'未作答';
  if(q.type==='single')return String.fromCharCode(65+ansVal);
  if(q.type==='judge')return ansVal===0?'正确':'错误';
  if(q.type==='multiple')return ansVal.slice().sort().map(i=>String.fromCharCode(65+i)).join('、');
  return'未作答';
}
/* 题干渲染：文字里的【图N】就地换成对应图片，公式不用再对着下面的图找。
   没有标记时按普通文本输出，行为和以前一致。 */
function qTextHTML(q){
  const t=String((q&&q.q)||'');
  const imgs=(q&&Array.isArray(q.imgs)&&q.imgs.length)?q.imgs:((q&&q.img)?[q.img]:[]);
  if(!imgs.length||t.indexOf('【图')<0)return esc(t);
  let out='',last=0;
  const re=/【图(\d+)】/g;let m;
  while((m=re.exec(t))!==null){
    out+=esc(t.slice(last,m.index));
    const u=imgs[parseInt(m[1],10)-1];
    out+=u?('<img class="q-img q-img-in" src="'+imgSrc(u)+'" alt="图'+m[1]+'">'):esc(m[0]);
    last=m.index+m[0].length;
  }
  out+=esc(t.slice(last));
  return out;
}
/* 图片引用解析：@键 → 图片表里的 data URI；普通 URL 原样返回 */
function imgSrc(u){
  if(!u)return'';
  if(u.charAt(0)==='@'){const t=IMG_TAB[u.slice(1)];return t||'';}
  return u;
}
/* 解析配图（数量关系/资料分析的公式图），跟在解析文字后面 */
function eImgsHTML(q){
  if(!q||!Array.isArray(q.eimgs)||!q.eimgs.length)return'';
  return '<div class="e-imgs">'+q.eimgs.map(u=>'<img class="q-img" src="'+imgSrc(u)+'" alt="解析配图" loading="lazy">').join('')+'</div>';
}
function qChips(q){
  let h='';
  [q.exam,q.subject].filter(x=>x).forEach(x=>h+='<span class="chip c-sub">'+esc(x)+'</span>');
  h+='<span class="chip">'+esc(q.module)+(q.subtype?' · '+esc(q.subtype):'')+'</span>';
  h+='<span class="chip '+(isObjQ(q)?'c-type-'+q.type:'c-type-sub')+'">'+TYPE_NAMES[q.type]+'</span>';
  return h;
}
function letters(){return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');}
function shuffle(arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}
function fmtTime(sec){sec=Math.max(0,Math.round(sec));const m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}

/* ================= 全局事件委托 ================= */
const ACTIONS={
  'go':d=>goTo(d.page,d.params?JSON.parse(d.params):{}),
  'modal.mask':(d,t,e)=>{if(e.target.classList.contains('mask'))closeModal();},
  'modal.cancel':()=>closeModal(),
  'modal.ok':()=>{const f=window.__modalOk;window.__modalOk=null;f&&f();},
  'banner.dismiss':()=>{const b=$id('top-banner');if(b)b.style.display='none';}
};
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');
  if(!t)return;
  const fn=ACTIONS[t.dataset.act];
  if(fn){e.preventDefault();fn(t.dataset,t,e);}
});
