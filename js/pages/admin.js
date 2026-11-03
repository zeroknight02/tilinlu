/* 题灵录 · pages/admin */
/* ================= 类别管理 ================= */
let EA={name:'',mods:'',editing:null};
ACTIONS['ea.open']=()=>{EA={name:'',mods:'',editing:null};goTo('examAdmin',{});};
PAGES.examAdmin={title:'类别管理'};
/* ================= 分值设置 ================= */
let SA={exam:''};
PAGES.scoreAdmin={title:'分值设置'};
PAGES.scoreAdmin.render=function(el,params){
  const exam=params.exam||SA.exam||curFilter()||EXAM_TYPES[0];
  SA={exam:exam};
  const rows=scoreRows(exam);
  const over=hasScoreOverride(exam);
  let body='';
  if(!rows.length){
    body='<div class="card miss-empty">这个类别还没有可设置的分值<br><span class="muted">先在「类别管理」里给它配上科目</span></div>';
  }else{
    rows.forEach((r,i)=>{
      body+='<div class="score-row"><div class="sr-name">'+esc(r.label)+'</div>'
        +'<input class="sr-input" type="number" step="0.1" min="0" inputmode="decimal" id="sc-'+i+'" value="'+(r.val==null?'':r.val)+'">'
        +'<span class="sr-unit">分</span></div>';
    });
  }
  el.innerHTML=topbarHTML('分值设置 · '+esc(exam))
    +'<div class="card card-sm"><div class="muted">每行是该科目（或题型）单题的分值。保存后，限时训练、自动组卷、真题训练都按新分值计分。</div>'
    +(over?'<div class="muted" style="margin-top:6px;color:var(--primary)">当前已使用自定义分值</div>':'')
    +'</div>'
    +body
    +(rows.length?('<div class="row" style="margin-top:16px;flex-wrap:nowrap">'
      +'<button class="btn btn-primary" style="flex:1" data-act="score.save">保存分值</button>'
      +(over?'<button class="btn btn-ghost btn-sm" data-act="score.reset">恢复默认</button>':'')
      +'</div>'):'');
};
ACTIONS['score.open']=d=>{goTo('scoreAdmin',{exam:d.n||curFilter()||EXAM_TYPES[0]});};
ACTIONS['score.save']=()=>{
  const exam=SA.exam;
  const rows=scoreRows(exam);
  const ov={};
  rows.forEach((r,i)=>{
    const el=$id('sc-'+i);
    if(!el)return;
    const v=parseFloat(el.value);
    if(!isFinite(v)||v<0)return;
    if(r.def==null||Math.abs(v-r.def)>1e-9)ov[r.key]=Math.round(v*100)/100;
  });
  if(Object.keys(ov).length)SCORE_OVERRIDE[exam]=ov;else delete SCORE_OVERRIDE[exam];
  saveScoreOverride();
  toast('分值已保存','ok');
  goBack();
};
ACTIONS['score.reset']=()=>{
  const exam=SA.exam;
  if(!hasScoreOverride(exam))return;
  delete SCORE_OVERRIDE[exam];saveScoreOverride();
  toast('已恢复默认分值','ok');render();
};
PAGES.examAdmin.render=function(el){
  const rowHTML=(name,mods,isFixed)=>{
    const over=isFixed&&hasOverride(name);
    return '<div class="card card-sm"><div class="row" style="justify-content:space-between;flex-wrap:nowrap">'
      +'<div style="flex:1;min-width:0"><b>'+esc(name)+'</b>'+(over?'<span class="ea-tag">已改</span>':'')+''
      +'<div class="muted" style="margin-top:2px">'+mods.length+' 个科目：'+esc(mods.join('、')||'（无）')+'</div></div>'
      +'<div style="flex-shrink:0;text-align:right;white-space:nowrap">'
      +'<button class="btn-link" data-act="score.open" data-n="'+esc(name)+'">分值</button>'
      +'<button class="btn-link" data-act="ea.edit" data-n="'+esc(name)+'">编辑</button>'
      +(over?'<button class="btn-link" data-act="ea.reset" data-n="'+esc(name)+'">恢复默认</button>':'')
      +(isFixed?'':'<button class="btn-link" style="color:var(--err)" data-act="ea.del" data-n="'+esc(name)+'">删除</button>')
      +'</div></div></div>';
  };
  let fixed='';
  EXAM_TYPES.forEach(n=>{fixed+=rowHTML(n,modsOfExam(n),true);});
  let custom='';
  CUST_EXAMS.forEach(e=>{custom+=rowHTML(e.name,e.modules.length?e.modules:['综合'],false);});

  const editor='<div class="card" id="ea-editor"><b>'+(EA.editing?'编辑科目 · '+esc(EA.editing):'新增考试类别')+'</b>'
    +'<label class="fl">考试类别名称</label><input data-ea="name" value="'+esc(EA.name)+'" placeholder="如：高考"'+(EA.editing?' disabled':'')+'>'
    +'<label class="fl">科目 / 模块（每行一个）</label><textarea rows="6" data-ea="mods" placeholder="语文&#10;数学&#10;英语&#10;历史">'+esc(EA.mods)+'</textarea>'
    +'<div class="row" style="margin-top:10px"><button class="btn btn-primary btn-sm" data-act="ea.save">'+(EA.editing?'保存修改':'添加类别')+'</button>'
    +(EA.editing?'<button class="btn btn-ghost btn-sm" data-act="ea.cancel">取消</button>':'')+'</div>'
    +'<div class="file-note">'+(EA.editing?'改完保存后，自由刷题、每日计划的筛选以及限时训练、自动组卷都会按新科目来。':'新增的类别会出现在筛选、错题本、限时训练、自动组卷、真题训练、教材梳理与导入题库里。')+'</div>'
    +'</div>';

  el.innerHTML=topbarHTML('类别管理')
    +(EA.editing?editor:'')
    +'<div class="sec-label">固定类别 · 科目可改</div>'
    +fixed
    +'<div class="sec-label">自定义类别</div>'
    +(CUST_EXAMS.length?custom:'<div class="card miss-empty">还没有自定义类别<br><span class="muted">例如添加「高考」，科目填：语文、数学、英语…</span></div>')
    +(EA.editing?'':editor);
};
document.addEventListener('input',e=>{
  const t=e.target.closest('[data-ea]');
  if(t)EA[t.dataset.ea]=t.value;
});
ACTIONS['ea.save']=()=>{
  const name=(EA.name||'').trim();
  const mods=[...new Set((EA.mods||'').split(/\n/).map(x=>x.trim()).filter(Boolean))];
  if(!name){toast('请填写类别名称','warn');return;}
  if(!EA.editing&&(EXAM_TYPES.indexOf(name)>-1||custExamByName(name))){toast('该类别已存在','warn');return;}
  if(EA.editing){
    if(!mods.length){toast('至少要填一个科目','warn');return;}
    // 新出现的科目登记到自定义科目，保证各处下拉都能选到
    let added=false;
    mods.forEach(m=>{if(allModules().indexOf(m)<0){EXTRA_MODS.push(m);added=true;}});
    if(added)saveExtraMods();
    const ce=custExamByName(EA.editing);
    if(ce){
      ce.modules=mods;saveCustExams();
      delete EXAM_OVERRIDE[EA.editing];saveExamOverride();
    }else{
      const def=defaultModsOf(EA.editing);
      if(def.length&&def.join('|')===mods.join('|'))delete EXAM_OVERRIDE[EA.editing];
      else EXAM_OVERRIDE[EA.editing]=mods;
      saveExamOverride();
    }
    toast('已保存修改','ok');
  }else{
    CUST_EXAMS.push({name:name,modules:mods.length?mods:['综合']});
    toast('已添加类别：'+name,'ok');
  }
  saveCustExams();
  EA={name:'',mods:'',editing:null};
  render();
};
ACTIONS['ea.edit']=d=>{
  const n=d.n;
  if(!n)return;
  EA={name:n,mods:modsOfExam(n).join('\n'),editing:n};
  render();
};
ACTIONS['ea.reset']=d=>{
  if(!hasOverride(d.n))return;
  delete EXAM_OVERRIDE[d.n];saveExamOverride();
  toast('已恢复「'+d.n+'」的默认科目','ok');
  render();
};
ACTIONS['ea.cancel']=()=>{EA={name:'',mods:'',editing:null};render();};
ACTIONS['ea.del']=d=>{
  const e=custExamByName(d.n);
  if(!e)return;
  qtConfirm({title:'删除类别',msg:'将删除自定义类别“'+e.name+'”。已导入的该类别题目与教材会保留，但该类别不再出现在各处下拉中。确定删除？',okText:'删除',danger:true,onOk:()=>{
    CUST_EXAMS=CUST_EXAMS.filter(x=>x.name!==d.n);
    saveCustExams();
    if(EA.editing===d.n)EA={name:'',mods:'',editing:null};
    toast('已删除类别：'+d.n,'ok');
    render();
  }});
};
