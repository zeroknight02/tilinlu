/* 题灵录 · app */
/* ================= 备份 ================= */
ACTIONS['backup.export']=()=>{
  const data={};
  lsKeys().forEach(k=>{
    if(k===K.snapshot)return;
    if(k===K.ai){
      const cfg=lsJson(k,{});const c=Object.assign({},cfg);delete c.key;
      if(Object.keys(c).length)data[k]=c;
    }else data[k]=lsGet(k);
  });
  const pack={app:'quiz-tool-single',version:1,exportedAt:new Date().toISOString(),data};
  const blob=new Blob([JSON.stringify(pack,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  const d=new Date();
  a.download='刷题工具备份-'+d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')+'.json';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
  toast('备份已导出（不含 AI Key）','ok');
};
ACTIONS['backup.importPick']=()=>{const f=$id('bk-import');if(f)f.click();};
(function(){
  const bk=$id('bk-import');if(!bk)return;
  bk.addEventListener('change',async()=>{
    const f=bk.files&&bk.files[0];
    if(!f)return;
    try{
      let txt='';
      if(f.text)txt=await f.text();
      else txt=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('读取失败'));r.readAsText(f);});
      const pack=JSON.parse(txt);
      const data=pack&&pack.data;
      if(!data||typeof data!=='object')throw new Error('不是有效的备份文件（缺少 data）');
      qtConfirm({title:'导入备份',msg:'将覆盖当前全部本地数据（题库、进度、统计、错题、每日计划等；不影响 AI Key 与更新前快照）。确定导入？',okText:'导入',danger:true,onOk:()=>{
        /* 真正的覆盖：备份里没有的本地键要先删掉，否则旧进度会残留在新数据里 */
        lsKeys().forEach(k=>{
          if(k===K.snapshot||k===K.ai||k===K.build)return;
          if(!Object.prototype.hasOwnProperty.call(data,k))lsDel(k);
        });
        Object.keys(data).forEach(k=>{
          if(k.indexOf('qt_')===0)lsSet(k,typeof data[k]==='string'?data[k]:JSON.stringify(data[k]));
        });
        loadAllData();
        toast('备份已恢复','ok');
        goHome();
      }});
    }catch(e){toast('备份读取失败：'+(e.message||e),'err');}
    bk.value='';
  });
})();

/* ================= 键盘快捷键（电脑端） ================= */
document.addEventListener('keydown',e=>{
  const tag=(e.target.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea'||tag==='select')return;
  const page=curPage().page;
  if(e.key==='Escape'){
    if(modalOpen){closeModal();exampleOpen=false;return;}
    if(page==='exam'){ACTIONS['exam.submit']();return;}
    if(page==='questionDetail'){goBack();return;}
    return;
  }
  const k=(e.key.length===1)?e.key.toUpperCase():e.key;
  const li=letters().indexOf(k);
  if(page==='practice'||page==='mistakePractice'){
    const st=quizState();if(!st)return;
    const q=st.qs[st.idx];if(!q)return;
    if(!st.locked&&OBJ_TYPES.includes(q.type)&&li>-1&&li<q.o.length){
      const ord=optOrder(q);ACTIONS['quiz.pick']({i:String(ord[li]!=null?ord[li]:li)});e.preventDefault();return;
    }
    if(k==='Enter'&&q.type==='multiple'&&!st.locked){ACTIONS['quiz.submit']();return;}
    if(k==='Enter'&&q.type==='blank'&&!st.locked){ACTIONS['quiz.blankSubmit']();return;}
    if(e.key==='ArrowRight'||k==='N'){ACTIONS['quiz.next']();return;}
    return;
  }
  if(page==='exam'&&EX){
    const q=bankQ(EX.s.questionIds[EX.idx]);
    if(q&&OBJ_TYPES.includes(q.type)&&li>-1&&li<q.o.length){
      const ord=optOrder(q);ACTIONS['exam.pick']({i:String(ord[li]!=null?ord[li]:li)});e.preventDefault();return;
    }
    if(e.key==='ArrowRight'||k==='N'){if(EX.idx<EX.s.questionIds.length-1)switchExamTo(EX.idx+1);return;}
    if(e.key==='ArrowLeft'||k==='P'){if(EX.idx>0)switchExamTo(EX.idx-1);return;}
    return;
  }
  if(page==='study'){
    if(e.key==='ArrowRight'||k==='N'){studyBrowse(1);return;}
    if(e.key==='ArrowLeft'||k==='P'){studyBrowse(-1);return;}
    return;
  }
  if(page==='questionDetail'){
    if(e.key==='ArrowRight'||k==='N'){qdMove(1);return;}
    if(e.key==='ArrowLeft'||k==='P'){qdMove(-1);return;}
    return;
  }
  if(page==='result'){
    const S=SESSIONS[curPage().params.sessionId];if(!S)return;
    if(e.key==='ArrowRight'||k==='N'){
      const i=(S.viewIdx==null)?0:Math.min(S.viewIdx+1,S.questionIds.length-1);
      ACTIONS['res.detail']({i:String(i)});return;
    }
    if(e.key==='ArrowLeft'||k==='P'){
      const i=(S.viewIdx==null)?0:Math.max((S.viewIdx||0)-1,0);
      ACTIONS['res.detail']({i:String(i)});return;
    }
  }
});

/* ================= 视口 / 初始化 ================= */
if(window.visualViewport){
  visualViewport.addEventListener('resize',()=>{
    document.body.classList.toggle('kb-open',(window.innerHeight-visualViewport.height)>140);
  });
}
/* 把全部本地数据重新读进内存。启动与「导入备份」共用，
   少读一项，下次保存就会用默认空值覆盖掉用户数据。 */
function loadAllData(){
  loadImgTab();
  loadTopics();
  loadCustExams();loadExamOverride();loadScoreOverride();loadExtraMods();
  loadBank();loadStats();loadWrong();loadFav();loadRecs();loadBooks();loadStudyCatsExtra();
  loadLearn();loadSrs();
  const fs=lsGet(K.fontSize);
  FONT_SIZE=(fs==='sm'||fs==='lg')?fs:'md';applyFont();
  TC.pass=Math.min(100,Math.max(0,parseInt(lsGet(K.tcPass)||'60',10)||0));
  AUTO.pass=Math.min(100,Math.max(0,parseInt(lsGet(K.autoPass)||'60',10)||0));
}
/* 恢复快照后用：把内存里的临时状态全部清掉，再按新数据重画。
   比 location.reload() 快，也不会因为重载时机和交互撞车。 */
function resetRuntime(){
  try{Object.keys(SESSIONS).forEach(k=>{delete SESSIONS[k];});}catch(e){}
  PS=null;MS=null;EX=null;
  try{PRE.items=[];PRE.papers=[];}catch(e){}
  try{closeModal();}catch(e){}
  navStack=[{page:'home',params:{},sc:0}];
  histReset();
}
function init(){
  try{console.log('题灵录 '+APP_VER+'（'+APP_DATE+'）');}catch(e){}
  const th=lsGet(K.theme);
  if(th&&THEMES[th]&&th!=='qingshuang')document.body.dataset.theme=th;
  applyThemeColor();
  loadAllData();
  guardData();
  purgeDemoData();
  render();
  initCloudSync();
  try{
    if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
      var swCtlAtLoad = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', function(){
        if(!swCtlAtLoad) location.reload();
      });
      navigator.serviceWorker.register('sw.js').then(function(reg){
        try{reg.update();}catch(e){}
      }).catch(function(){});
    }
  }catch(e){}
}
bootStorage().then(init).catch(e=>{
  try{console.error('[存储] 装载失败，退回 localStorage',e);}catch(_){}
  USE_IDB=false;STORE_MODE='local';
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&k.indexOf('qt_')===0)MEM[k]=localStorage.getItem(k);
    }
  }catch(_){}
  init();
});

/* 测试与调试接口 */
window.__qt={
  VER:APP_VER,
  goTo,goBack,render,reRender,
  get navStack(){return navStack;},
  get BANK(){return BANK;},
  get PAPERS(){return PAPERS;},
  get WRONG(){return WRONG;},
  get BOOKS(){return BOOKS;},
  get STATS(){return STATS;},
  get FAV(){return FAV;},
  get RECS(){return RECS;},
  SESSIONS,lsGet,lsSet,getProg,setProg,curPage,toggleFav,isFav,
  autoParseText,parseBlocks,parseLines,parseImportJSON,validQuestion,normQuestion
};