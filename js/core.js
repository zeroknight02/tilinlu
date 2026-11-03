/* 题灵录 · core */
/* ================= 页面注册表 ================= */
const PAGES={home:{title:'题灵录'}};
function render(){
  if(examTimer){clearInterval(examTimer);examTimer=null;}
  closeModal();
  const c=curPage();
  const p=PAGES[c.page]||PAGES.home;
  if(c.page!=='practice'&&document.body.classList.contains('focus-mode')){
    document.body.classList.remove('focus-mode');
    try{if(document.fullscreenElement&&document.exitFullscreen){const r=document.exitFullscreen();if(r&&r.catch)r.catch(()=>{});}}catch(e){}
  }
  document.title=p.title||'题灵录';
  const app=$id('app');app.innerHTML='';
  p.render(app,c.params);
  window.scrollTo(0,c.sc||0);
}
function topbarHTML(title,meta,backAct){
  return '<div class="topbar"><button class="btn-back" data-act="'+(backAct||'nav.back')+'">‹ 返回</button>'
    +'<div class="tb-title">'+esc(title)+'</div>'+(meta?'<div class="tb-meta">'+meta+'</div>':'')+'</div>';
}
ACTIONS['nav.back']=()=>goBack();
ACTIONS['nav.home']=()=>goHome();
ACTIONS['theme.open']=()=>{
  const cur=document.body.dataset.theme||'qingshuang';
  const cards=Object.keys(THEMES).map(t=>{
    const th=THEMES[t];const on=t===cur;const p=th.p;
    return '<div class="theme-opt'+(on?' on':'')+'" data-act="theme.pick" data-t="'+t+'">'
      +'<div class="tp" style="background:linear-gradient(155deg,'+p[0]+','+p[1]+')">'
      +'<div class="tp-card" style="background:'+p[2]+'">'
      +'<i class="tp-line" style="background:'+p[3]+'"></i>'
      +'<i class="tp-line s" style="background:'+p[3]+'"></i>'
      +'</div>'
      +'<span class="tp-pill" style="background:'+p[3]+'"></span>'
      +'<span class="tp-dot" style="background:'+p[4]+'"></span>'
      +'<span class="tp-dot" style="background:'+p[5]+';right:26px"></span>'
      +'</div>'
      +'<div class="to-name">'+esc(th.name)+'</div>'
      +'<div class="to-desc">'+esc(th.desc)+'</div>'
      +(on?'<span class="to-check">✓</span>':'')
      +'</div>';
  }).join('');
  const h='<div class="mask" data-act="modal.mask"><div class="modal" data-stop="1">'
    +'<h3>外观风格</h3>'
    +'<div class="theme-grid">'+cards+'</div>'
    +'<div class="file-note" style="margin-top:12px">数据仅保存在本机 · 换设备请用备份导出</div>'
    +'<div class="m-btns"><button class="btn btn-plain" data-act="modal.cancel">关闭</button></div>'
    +'</div></div>';
  document.getElementById('modal-root').innerHTML=h;
  modalOpen=true;
};
ACTIONS['theme.pick']=d=>{
  if(!THEMES[d.t])return;
  if(d.t==='qingshuang')delete document.body.dataset.theme;
  else document.body.dataset.theme=d.t;
  lsSet(K.theme,d.t);
  closeModal();
  applyThemeColor();
  render();
  toast('已切换风格：'+THEMES[d.t].name,'ok');
};
