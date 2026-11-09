/* 题灵录 · pages/home */
/* ================= 首页 ================= */
PAGES.home.title='题灵录 · 首页';
PAGES.home.render=function(el){
  const t=totalsStat();
  const streak=answerStreak();
  const todayTotal=allModules().reduce((a,m)=>a+todayDoneOf(m),0);
  const _d=new Date();
  const dateStr=_d.getFullYear()+'年'+(_d.getMonth()+1)+'月'+_d.getDate()+'日 · 周'+'日一二三四五六'[_d.getDay()];
  const feats=[
    {page:'modules',name:'自由刷题',desc:'按模块巩固 · 即时解析',ico:'book',g:['#34d399','#059669']},
    {page:'timedConfig',name:'限时训练',desc:'倒计时实战 · 专项突破',ico:'timer',g:['#38bdf8','#0284c7']},
    {page:'autoConfig',name:'自动组卷',desc:'多模块混合 · 模拟成卷',ico:'layers',g:['#2dd4bf','#0d9488']},
    {page:'paperList',name:'真题训练',desc:'整卷限时作答',ico:'doc',g:['#60a5fa','#2563eb']},
    {page:'mistakeCats',name:'错题本',desc:'错题重刷 · 连对移出',ico:'pencil',g:['#f87171','#dc2626']},
    {page:'favs',name:'收藏夹',desc:'星标重点 · 集中重练',ico:'star',g:['#fbbf24','#f59e0b']},
    {page:'topics',name:'专题',desc:'时政专题 · 自建集合',ico:'tag',g:['#fb923c','#ea580c']},
    {page:'studyList',name:'教材梳理',desc:'导入教材 · 章节学习',ico:'library',g:['#94a3b8','#475569']},
    {page:'dailyLearn',name:'每日学习',desc:'单词 · 成语 · 诗词打卡',ico:'learn',g:['#22d3ee','#0891b2']}
  ];
  let fh='';
  feats.forEach(f=>{fh+='<div class="fg" data-act="go" data-page="'+f.page+'" style="background:linear-gradient(158deg,'+f.g[0]+'26 0%,var(--card) 62%)">'
    +'<span class="fg-ico" style="--c1:'+f.g[0]+';--c2:'+f.g[1]+'">'+iconDuo(f.ico,23)+'</span>'
    +'<span class="fg-tx"><b>'+f.name+'</b><i>'+f.desc+'</i></span></div>';});
  const hero = BANK.length
    ? '<div class="hero">'
      +'<div class="hero-kicker">本地题库 · '+esc(agoText())+'</div>'
      +'<div class="hero-num">'+BANK.length+'<span>道</span></div>'
      +'<div class="hero-sub">今日已完成 '+todayTotal+' 题 · 错题 '+WRONG.length+' 道'
      +'<button class="hero-btn" data-act="go" data-page="modules">开始刷题</button>'
      +'<span class="hero-mark">题</span></div>'
    : '<div class="hero-empty">'
      +'<div class="he-top">'
      +'<span class="he-ico">'+icon('download',20)+'</span>'
      +'<div class="he-tx"><b>题库还是空的</b><i>导入题目后就能开始刷题</i></div>'
      +'</div>'
      +'<button class="he-btn" data-act="go" data-page="importPage">导入题库</button>'
      +'</div>';
  el.innerHTML='<div class="home-wrap">'
    +'<div class="home-top">'
    +'<div class="home-date">'+dateStr+'</div>'
    +'<div class="home-row">'
    +'<h1>题灵录</h1>'
    +'<button class="icon-btn" data-act="theme.open" aria-label="外观">'+icon('palette',18)+'</button>'
    +'</div></div>'
    +'<div class="home-main">'
    +'<div class="hm-a">'+hero+'</div>'
    +'<div class="hm-b">'
    +'<div class="sec-head-row"><div class="sec-head">数据概览</div>'
    +'<div class="sec-sub" data-act="go" data-page="report" style="cursor:pointer">'+(streak>0?('连续刷题 '+streak+' 天 ›'):'学习报告 ›')+'</div></div>'
    +'<div class="stat-grid">'
    +'<div class="stat"><b>'+t.done+'</b><span>累计做题</span></div>'
    +'<div class="stat"><b>'+t.acc+'</b><span>总正确率</span></div>'
    +'<div class="stat tap" data-act="go" data-page="mistakeCats"><b style="color:var(--coral)">'+WRONG.length+'</b><span>待复习错题</span></div>'
    +'<div class="stat"><b>'+FAV.length+'</b><span>已收藏</span></div>'
    +'</div></div></div>'
    +'<div class="sec-head">开始学习</div>'
    +'<div class="feat-grid">'+fh+'</div>'
    +'<div class="sec-label">题库与备份</div>'
    +'<div class="bank-tools">'
    +'<div class="bt-item" data-act="go" data-page="records">'+icon('clock',17)+' 练习记录</div>'
    +(BANK.length?('<div class="bt-item" data-act="go" data-page="importPage">'+icon('download',17)+' 导入题库</div>'):'')
    +'<div class="bt-item" data-act="backup.export">'+icon('trayDown',17)+' 导出备份</div>'
    +'<div class="bt-item" data-act="backup.importPick">'+icon('trayUp',17)+' 导入备份</div>'
    +'</div>'
    +'<div class="sec-label">更多</div>'
    +'<div class="bank-tools" style="margin-bottom:24px">'
    +'<div class="bt-item" data-act="go" data-page="about">'+icon('info',17)+' 关于 · '+APP_VER+'</div>'
    +'</div>'
    +'<div class="home-foot">数据仅保存在本机 · 换设备请用备份导出</div>'
    +'</div>';
};

/* ================= 自由刷题 · 模块列表 ================= */
PAGES.modules={title:'自由刷题'};
PAGES.modules.render=function(el){
  const t=totalsStat(),plan=loadPlan(),td=todayStat();
  const dueN=srsDue().length;
  const f=curFilter(),mods=filterMods();
  const todayTotal=mods.reduce((s2,m)=>s2+todayDoneOf(m),0);
  let mh='';
  mods.forEach(m=>{
    const tot=bankOf(m).length,done=moduleDoneCount(m),w=wrongCountOf(m);
    const goal=parseInt(plan[m]||'0',10);
    const planLine=goal>0?('；今日 '+todayDoneOf(m)+' / '+goal):'';
    mh+='<div class="card card-sm card-tap mod-card'+(tot?' ready':' disabled')+'" data-act="mod.enter" data-m="'+esc(m)+'">'
      +'<div><div class="m-name">'+esc(m)+(custExamOfModule(m)?'<span class="muted" style="font-size:12px;font-weight:400;margin-left:6px">'+esc(custExamOfModule(m).name)+'</span>':'')+'</div>'
      +'<div class="m-nums">共 <b>'+tot+'</b> 题 · 已完成 <b>'+done+'</b> 题 · 错题 <b>'+w+'</b> 题'+planLine+'</div></div>'
      +'<div class="m-right">›</div></div>';
  });
  el.innerHTML=topbarHTML(f?'自由刷题 · '+f:'自由刷题')
    +'<div class="stat-strip">'
    +'<div class="ss"><div class="n">'+td.n+'</div><div class="l">今日做题</div></div>'
    +'<div class="ss"><div class="n">'+td.acc+'</div><div class="l">今日正确率</div></div>'
    +'<div class="ss"><div class="n" style="color:var(--coral)">'+td.wrong+'</div><div class="l">今日答错</div></div>'
    +'</div>'
    +'<div class="mod-tools">'
    +'<button class="mt-seg" data-act="daily.open">'+icon('clock',14)+'<span>每日计划</span></button>'
    +filterPillHTML()
    +'<button class="mt-seg" data-act="ea.open">'+icon('layers',14)+'<span>类别管理</span></button>'
    +'</div>'
    +'<div class="mod-tip">'+(f?'只看「'+esc(f)+'」的科目':'全部科目')+' · '+mods.length+' 个 · 今日已完成 '+todayTotal+' 题</div>'
    +'<button class="sr-entry" data-act="prax.review">'+(dueN?('间隔复习 · 今日待复习 '+dueN+' 题 ›'):'间隔复习 · 今天没有到期题目')+'</button>'
    +'<button class="sr-entry" data-act="search.open">搜索题库 · 题干 / 解析 / 笔记</button>'
    +'<div class="mod-list">'+mh+'</div>';
};
ACTIONS['mod.enter']=d=>{const m=d.m;if(!bankOf(m).length){toast('该模块暂无题目，可先导入题库','warn');return;}goTo('practice',{module:m,mode:'all'});};
ACTIONS['daily.open']=()=>goTo('dailyPlan');

/* ================= 每日计划 ================= */
PAGES.dailyPlan={title:'每日计划'};
PAGES.dailyPlan.render=function(el){
  const plan=loadPlan(),f=curFilter(),mods=filterMods();
  let rows='';
  mods.forEach(m=>{
    const tot=bankOf(m).length;
    rows+='<div class="card card-sm"><div class="row"><div style="flex:1;min-width:120px">'+esc(m)
      +'<div class="muted">共 '+tot+' 题</div></div>'
      +'<input type="number" min="0" max="200" inputmode="numeric" style="width:110px" value="'+(plan[m]||0)+'" data-inp="plan" data-m="'+esc(m)+'"></div>'
      +'<div class="plan-line">今日已完成 '+todayDoneOf(m)+' 题'+((plan[m]||0)>0?(' / 目标 '+(plan[m]||0)):'')+'</div></div>';
  });
  let modAdmin='';
  if(EXTRA_MODS.length){
    modAdmin='<div class="row" style="margin-top:10px;flex-wrap:wrap">'
      +EXTRA_MODS.map(m=>'<span class="chip" style="cursor:pointer;background:var(--primary-soft);color:var(--primary)" data-act="plan.delMod" data-m="'+esc(m)+'">'+esc(m)+' ×</span>').join('')
      +'</div><div class="file-note">点科目名可删除（需先删光该科目下的题目）。</div>';
  }
  el.innerHTML=topbarHTML(f?'每日计划 · '+f:'每日计划')
    +'<div class="mod-tools">'+filterPillHTML()+'</div>'
    +'<div class="mod-tip">'+(f?'只看「'+esc(f)+'」的科目':'全部科目')+' · '+mods.length+' 个</div>'
    +'<div class="muted" style="margin:2px 4px 10px">为各科目设置每日目标题量，仅提示不阻断，保存后长期有效。</div>'+rows
    +'<div class="card card-sm" style="margin-top:12px"><b style="font-size:14px">新增科目（如：语文、数学）</b>'
    +'<div class="row" style="margin:8px 0 0"><input id="new-mod" placeholder="输入科目名称，如：语文" maxlength="12" style="flex:1;min-width:0">'
    +'<button class="btn btn-primary btn-sm" data-act="plan.addMod">添加</button></div>'
    +modAdmin
    +'<div class="file-note">新增科目会出现在自由刷题、每日计划、错题本和导入题库的模块选择里；要用于限时/组卷/真题计分，请在「类别管理」创建对应考试类型。</div></div>'
    +'<button class="btn btn-primary" style="width:100%;margin-top:12px" data-act="plan.save">保存每日计划</button>';
};
ACTIONS['plan.addMod']=()=>{
  const inp=$id('new-mod');const name=((inp&&inp.value)||'').trim();
  if(!name){toast('请先输入科目名称','warn');return;}
  if(name.length>12){toast('名称太长（最多 12 字）','warn');return;}
  if(allModules().indexOf(name)>-1){toast('该科目已存在','warn');return;}
  EXTRA_MODS.push(name);saveExtraMods();
  const f=curFilter();
  if(f&&modsOfExam(f).indexOf(name)<0)toast('已添加「'+name+'」，切到「全部类别」可见','ok');
  else toast('已添加科目：'+name,'ok');
  reRender();
};
ACTIONS['plan.delMod']=d=>{
  const m=d.m;
  if(bankOf(m).length){toast('该科目下还有 '+bankOf(m).length+' 道题，请先在「导入题库 → 选择删除部分题目」删光后再删除科目','err');return;}
  EXTRA_MODS=EXTRA_MODS.filter(x=>x!==m);saveExtraMods();
  const plan=loadPlan();delete plan[m];lsSet(K.plan,JSON.stringify(plan));
  toast('已删除科目：'+m,'ok');
  reRender();
};
const PLAN_DRAFT={};
document.addEventListener('input',e=>{
  const t=e.target.closest('[data-inp]');if(!t)return;
  if(t.dataset.inp==='plan')PLAN_DRAFT[t.dataset.m]=t.value;
});
ACTIONS['plan.save']=()=>{
  const plan=loadPlan();
  allModules().forEach(m=>{if(PLAN_DRAFT[m]!=null)plan[m]=Math.max(0,parseInt(PLAN_DRAFT[m]||'0',10)||0);});
  lsSet(K.plan,JSON.stringify(plan));toast('每日计划已保存','ok');
  goBack();
};
