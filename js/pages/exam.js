/* 题灵录 · pages/exam */
/* ================= 训练会话 ================= */
const SESSIONS={};
function newSession(fields){
  const id='s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  SESSIONS[id]=Object.assign({id,answers:{},timePerQ:{},viewIdx:0},fields);
  return SESSIONS[id];
}
function examMods(exam){
  if(hasOverride(exam))return EXAM_OVERRIDE[exam].slice();
  const ce=custExamByName(exam);
  if(ce)return ce.modules.length?ce.modules:['综合'];
  const map=EXAM_MODULES[exam]||EXAM_MODULES['国考'];
  return map['行测']||map['职测'];
}
/* 「未分类」的题对所有考试类型都可用。
   导入时如果不手动设置考试类型，题目就是未分类；若严格按 exam 过滤，
   用户会看到「刚导入 100 题，限时训练却说暂无题目」——只有自由刷题能用。 */
function examMatch(q,exam){return !exam||q.exam===exam||q.exam==='未分类';}
function pickQuestions(exam,module,count){
  let arr=BANK.filter(q=>examMatch(q,exam)&&(!module||q.module===module)&&isObjQ(q));
  return shuffle(arr).slice(0,count);
}
const availCount=(exam,module)=>BANK.filter(q=>examMatch(q,exam)&&q.module===module&&isObjQ(q)).length;

/* ---- change 事件委托 ---- */
const CHANGES={};
document.addEventListener('change',e=>{
  const t=e.target.closest('[data-chg],[data-f]');if(!t)return;
  const fn=CHANGES[t.dataset.chg||t.dataset.f];fn&&fn(t.dataset,t);
});

/* ================= 限时训练 · 配置页 ================= */
let TC={exam:'国考',module:'政治理论',qty:20,mins:25,pass:60};
PAGES.timedConfig={title:'限时训练 · 配置'};
PAGES.timedConfig.render=function(el){
  const mods=examMods(TC.exam);
  if(!mods.includes(TC.module))TC.module=mods[0];
  el.innerHTML=topbarHTML('限时训练 · 配置')
    +'<div class="card">'
    +'<label class="fl">考试类型</label>'
    +'<select data-chg="tc.exam">'+allExamTypes().map(t=>'<option'+(t===TC.exam?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select>'
    +'<label class="fl">模块</label>'
    +'<select data-chg="tc.mod">'+mods.map(m=>'<option'+(m===TC.module?' selected':'')+'>'+esc(m)+'</option>').join('')+'</select>'
    +'<div class="grid2">'
    +'<div><label class="fl">题量（默认 20）</label><input type="number" min="1" max="200" inputmode="numeric" data-num="qty" value="'+TC.qty+'"></div>'
    +'<div><label class="fl">时间（分钟，默认 25）</label><input type="number" min="1" max="180" inputmode="numeric" data-num="mins" value="'+TC.mins+'"></div>'
    +'</div>'
    +'<label class="fl">及格线（得分率 %，默认 60，0 为不判定）</label><input type="number" min="0" max="100" inputmode="numeric" data-pass="tc" value="'+(TC.pass==null?60:TC.pass)+'">'
    +'<div class="file-note">仅客观题参与（主观题自动排除）；该范围当前可用的客观题共 '+availCount(TC.exam,TC.module)+' 题，不足时按实际数量训练。</div>'
    +'<button class="btn btn-ghost btn-sm" data-act="score.open" data-n="'+esc(TC.exam)+'">调整本类别分值</button>'
    +'<button class="btn btn-primary" style="width:100%;margin-top:14px" data-act="timed.start">开始训练</button>'
    +'</div>';
};
ACTIONS['mod.filterOpen']=()=>{
  const f=curFilter();
  const opts=[{v:'',n:'全部类别'}].concat(allExamTypes().map(x=>({v:x,n:x})));
  const h='<div class="mask" data-act="modal.mask"><div class="modal" data-stop="1">'
    +'<h3>按考试类别筛选</h3>'
    +'<div class="pick-list">'
    +opts.map(o=>'<div class="pick-item'+(o.v===f?' on':'')+'" data-act="mod.filter" data-v="'+esc(o.v)+'">'
        +'<span>'+esc(o.n)+'</span>'+(o.v===f?'<span class="pick-ck">✓</span>':'')+'</div>').join('')
    +'</div>'
    +'<div class="m-btns"><button class="btn btn-plain" data-act="modal.cancel">关闭</button></div>'
    +'</div></div>';
  $id('modal-root').innerHTML=h;
  modalOpen=true;
};
ACTIONS['mod.filter']=d=>{setFilter(d.v||'');closeModal();render();};
CHANGES['tc.exam']=(d,t)=>{TC.exam=t.value;const mods=examMods(TC.exam);if(!mods.includes(TC.module))TC.module=mods[0];render();};
CHANGES['tc.mod']=(d,t)=>{TC.module=t.value;render();};
document.addEventListener('input',e=>{
  const t=e.target.closest('[data-num]');if(!t)return;
  TC[t.dataset.num]=Math.max(1,parseInt(t.value||'0',10)||1);
});
document.addEventListener('input',e=>{
  const t=e.target.closest('[data-pass]');if(!t)return;
  const v=Math.min(100,Math.max(0,parseInt(t.value||'0',10)||0));
  if(t.dataset.pass==='tc'){TC.pass=v;lsSet(K.tcPass,String(v));}
  else{AUTO.pass=v;lsSet(K.autoPass,String(v));}
});

/* ================= 自动组卷 · 配置页 ================= */
let AUTO={exam:'国考',counts:{},mins:null,timeTouched:false,pass:60};
PAGES.autoConfig={title:'自动组卷 · 配置'};
PAGES.autoConfig.render=function(el){
  const mods=examMods(AUTO.exam);
  let rows='';
  mods.forEach(m=>{
    const hint=(m==='判断推理')?'（含图形 / 定义 / 类比 / 逻辑四个子类，按一个模块抽题）':'';
    rows+='<div class="card card-sm"><div class="row"><div style="flex:1;min-width:130px">'+esc(m)
      +'<div class="muted">题库共 '+availCount(AUTO.exam,m)+' 题'+hint+'</div></div>'
      +'<input type="number" min="0" max="200" inputmode="numeric" style="width:100px" value="'+(AUTO.counts[m]||0)+'" data-acnum="'+esc(m)+'"></div></div>';
  });
  const total=autoTotal();
  el.innerHTML=topbarHTML('自动组卷 · 配置')
    +'<div class="card"><label class="fl">考试类型</label>'
    +'<select data-chg="ac.exam">'+allExamTypes().map(t=>'<option'+(t===AUTO.exam?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select>'
    +((SCORE_RULES[AUTO.exam]&&SCORE_RULES[AUTO.exam].levels)?'<label class="fl">卷别（影响计分）</label><select data-chg="ac.level">'+SCORE_RULES[AUTO.exam].levels.map(l=>'<option'+(l===(AUTO.level||defLevel(AUTO.exam))?' selected':'')+'>'+l+'</option>').join('')+'</select>':'')
    +'<div class="row" style="margin-top:12px"><button class="btn btn-ghost btn-sm" data-act="score.open" data-n="'+esc(AUTO.exam)+'">'
    +(hasScoreOverride(AUTO.exam)?'调整分值（已自定义）':'调整分值')+'</button></div>'
    +'</div>'
    +rows
    +'<div class="card card-sm row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><div>总题量：<b id="auto-total" class="big-num" style="font-size:20px">'+total+'</b> 题</div>'
    +'<div style="display:flex;align-items:center;gap:8px">总时间（分钟）<input type="number" min="1" max="300" style="width:90px" id="auto-mins" value="'+(AUTO.timeTouched?(AUTO.mins||total):total)+'" data-acmin="1"></div><div style="margin-top:8px"><div class="fl" style="margin-top:0">及格线（得分率 %，0 为不判定）</div><input type="number" min="0" max="100" style="width:120px" value="'+(AUTO.pass==null?60:AUTO.pass)+'" data-acpass="1"></div></div>'
    +'<button class="btn btn-primary" style="width:100%;margin-top:6px" data-act="auto.start">生成试卷并开始</button>';
};
function autoTotal(){let n=0;examMods(AUTO.exam).forEach(m=>{n+=Math.max(0,parseInt(AUTO.counts[m]||'0',10)||0);});return n;}
CHANGES['ac.exam']=(d,t)=>{AUTO.exam=t.value;AUTO.counts={};AUTO.timeTouched=false;AUTO.mins=null;AUTO.level=null;render();};
CHANGES['ac.level']=(d,t)=>{AUTO.level=t.value;};
document.addEventListener('input',e=>{
  const t=e.target.closest('[data-acnum]');if(!t)return;
  AUTO.counts[t.dataset.acnum]=Math.max(0,parseInt(t.value||'0',10)||0);
  const total=autoTotal();
  const tt=$id('auto-total');if(tt)tt.textContent=total;
  if(!AUTO.timeTouched){const mi=$id('auto-mins');if(mi&&mi!==document.activeElement)mi.value=total;}
});
document.addEventListener('input',e=>{
  const t=e.target.closest('[data-acmin]');if(!t)return;
  AUTO.timeTouched=true;AUTO.mins=Math.max(1,parseInt(t.value||'1',10)||1);
});
ACTIONS['auto.start']=()=>{
  const mods=examMods(AUTO.exam);
  let total=0;const picks=[];
  for(const m of mods){
    const want=Math.max(0,parseInt(AUTO.counts[m]||'0',10)||0);
    if(!want)continue;
    const avail=availCount(AUTO.exam,m);
    if(want>avail){toast(m+'模块题库只有 '+avail+' 题','err');return;}
    total+=want;picks.push({m,n:want});
  }
  if(total===0){toast('请至少为一个模块设置题量','warn');return;}
  const qs=[];
  picks.forEach(p=>{pickQuestions(AUTO.exam,p.m,p.n).forEach(q=>qs.push(q));});
  const mins=Math.max(1,AUTO.timeTouched?(AUTO.mins||total):total);
  const s=newSession({type:'auto',exam:AUTO.exam,level:AUTO.level||defLevel(AUTO.exam)||null,title:'自动组卷 · '+AUTO.exam,questionIds:qs.map(q=>q.id),minutes:mins,modulesOrder:picks.map(p=>p.m),pass:(AUTO.pass==null?60:AUTO.pass)});
  goTo('exam',{sessionId:s.id});
};
ACTIONS['timed.start']=()=>{
  const avail=availCount(TC.exam,TC.module);
  if(avail===0){toast('该考试类型与模块下暂无题目，可先导入题库','warn');return;}
  let n=Math.max(1,TC.qty||20);
  if(avail<n){toast('该模块题库只有 '+avail+' 题，将按 '+avail+' 题训练','warn');n=avail;}
  const qs=pickQuestions(TC.exam,TC.module,n);
  const s=newSession({type:'timed',exam:TC.exam,level:defLevel(TC.exam)||null,title:'限时训练 · '+TC.module,questionIds:qs.map(q=>q.id),minutes:Math.max(1,TC.mins||25),pass:(TC.pass==null?60:TC.pass)});
  goTo('exam',{sessionId:s.id});
};

/* ================= 真题训练 · 套卷列表 ================= */
let PL={exam:'国考'};
PAGES.paperList={title:'真题训练'};
PAGES.paperList.render=function(el){
  const papers=PAPERS.filter(p=>p.exam===PL.exam);
  let list='';
  if(!papers.length){
    list='<div class="card miss-empty">该考试类型下暂无套卷<br><span class="muted">点下方「新建套卷」，按模块选题量即可生成</span></div>';
  }
  papers.forEach(p=>{
    const ids=(p.questionIds||[]).filter(id=>bankQ(id));
    const empty=ids.length===0;
    list+='<div class="card card-sm card-tap mod-card'+(empty?' disabled':' ready')+'"'
      +(empty?'':' data-act="paper.start" data-id="'+esc(p.id)+'"')
      +'><div><div class="m-name">'+esc(p.title)+'</div>'
      +'<div class="m-nums">'+(p.year||'—')+' 年 · '+(empty?'<span style="color:var(--warn)">该套卷题目待导入</span>':ids.length+' 题')+(p.level?' · '+esc(p.level):'')+' · 限时 '+(p.minutes||90)+' 分钟</div></div>'
      +'<div class="m-right"><button class="btn-link" data-act="paper.edit" data-id="'+esc(p.id)+'">编辑</button>'
      +(empty?'⏳':'›')+'</div></div>';
  });
  el.innerHTML=topbarHTML('真题训练')
    +'<div class="card"><label class="fl">考试类型</label>'
    +'<select data-chg="pl.exam">'+allExamTypes().map(t=>'<option'+(t===PL.exam?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select></div>'
    +'<button class="btn btn-primary" style="width:100%;margin:2px 0 12px" data-act="paper.new">+ 新建套卷</button>'
    +list;
};
CHANGES['pl.exam']=(d,t)=>{PL.exam=t.value;render();};
/* ================= 套卷编辑 ================= */
let PE={id:null,title:'',exam:'国考',minutes:90,counts:{}};
function peCounts(p){
  const c={};
  (p.questionIds||[]).forEach(id=>{const q=bankQ(id);if(q)c[q.module]=(c[q.module]||0)+1;});
  return c;
}
PAGES.paperEdit={title:'编辑套卷'};
PAGES.paperEdit.render=function(el){
  const mods=examMods(PE.exam);
  let rows='';
  mods.forEach(m=>{
    rows+='<div class="card card-sm"><div class="row"><div style="flex:1;min-width:120px">'+esc(m)
      +'<div class="muted">题库共 '+availCount(PE.exam,m)+' 题</div></div>'
      +'<input type="number" min="0" max="200" inputmode="numeric" style="width:96px" value="'+(parseInt(PE.counts[m]||'0',10)||0)+'" data-pem="'+esc(m)+'"></div></div>';
  });
  const total=mods.reduce((a,m)=>a+(parseInt(PE.counts[m]||'0',10)||0),0);
  el.innerHTML=topbarHTML(PE.id?'编辑套卷':'新建套卷')
    +'<div class="card"><label class="fl">套卷标题</label>'
    +'<input data-pe="title" maxlength="40" value="'+esc(PE.title)+'" placeholder="如：2025 国考行测真题（副省级）">'
    +'<div class="row" style="margin-top:10px;flex-wrap:nowrap">'
    +'<div style="flex:1;min-width:0"><label class="fl">考试类型</label>'
    +'<select data-chg="pe.exam">'+allExamTypes().map(t=>'<option'+(t===PE.exam?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select></div>'
    +'<div style="width:110px;flex:none"><label class="fl">时长（分钟）</label>'
    +'<input type="number" min="1" max="300" data-pe="minutes" value="'+(PE.minutes||90)+'"></div>'
    +'</div></div>'
    +'<div class="mod-tip">按模块设置题量，保存时从题库随机抽题组卷 · 当前共 <b>'+total+'</b> 题</div>'
    +rows
    +'<button class="btn btn-primary" style="width:100%;margin-top:12px" data-act="paper.save">'+(PE.id?'保存套卷':'生成并保存')+'</button>'
    +(PE.id?'<div class="row" style="margin-top:10px;justify-content:center"><button class="btn btn-ghost btn-sm" style="color:var(--err)" data-act="paper.del">删除这套卷</button></div>':'')
    +'<div class="file-note">题量填 0 表示该模块不抽题。编辑时若题量与原来一致，会保留原来的题目。</div>';
};
ACTIONS['paper.new']=()=>{PE={id:null,title:'',exam:PL.exam,minutes:90,counts:{}};goTo('paperEdit',{});};
ACTIONS['paper.edit']=d=>{
  const p=PAPERS.find(x=>x.id===d.id);if(!p)return;
  PE={id:p.id,title:p.title,exam:p.exam,minutes:p.minutes||90,counts:peCounts(p)};
  goTo('paperEdit',{});
};
CHANGES['pe.exam']=(d,t)=>{PE.exam=t.value;PE.counts={};render();};
document.addEventListener('input',e=>{
  const t=e.target.closest('[data-pe]');if(!t)return;
  PE[t.dataset.pe]=t.value;
});
document.addEventListener('input',e=>{
  const t=e.target.closest('[data-pem]');if(!t)return;
  PE.counts[t.dataset.pem]=t.value;
});
ACTIONS['paper.save']=()=>{
  const title=String(PE.title||'').trim();
  if(!title){toast('请先填写套卷标题','warn');return;}
  const mins=Math.max(1,parseInt(PE.minutes,10)||90);
  const mods=examMods(PE.exam);
  let total=0;const picked=[];
  for(const m of mods){
    const n=Math.max(0,parseInt(PE.counts[m]||'0',10)||0);
    if(!n)continue;
    const avail=availCount(PE.exam,m);
    if(n>avail){toast(m+' 只有 '+avail+' 题，请调小','err');return;}
    total+=n;picked.push({m:m,n:n});
  }
  let ids=[];
  if(total>0){
    picked.forEach(p=>{pickQuestions(PE.exam,p.m,p.n).forEach(q=>ids.push(q.id));});
  }else if(PE.id){
    const old=PAPERS.find(x=>x.id===PE.id);
    ids=(old&&old.questionIds)||[];
    if(!ids.length){toast('请至少给一个模块设置题量','warn');return;}
  }else{
    toast('请至少给一个模块设置题量','warn');return;
  }
  if(PE.id){
    const p=PAPERS.find(x=>x.id===PE.id);
    if(p){p.title=title;p.exam=PE.exam;p.minutes=mins;p.questionIds=ids;}
  }else{
    PAPERS.push({id:'paper-'+Date.now().toString(36)+Math.random().toString(36).slice(2,4),
      exam:PE.exam,title:title,questionIds:ids,minutes:mins});
  }
  saveBank();toast('套卷已保存（'+ids.length+' 题）','ok');goBack();
};
ACTIONS['paper.del']=()=>{
  const p=PAPERS.find(x=>x.id===PE.id);if(!p)return;
  qtConfirm({title:'删除套卷',msg:'将删除《'+p.title+'》。题目本身不会受影响。确定删除？',okText:'删除',danger:true,onOk:()=>{
    PAPERS=PAPERS.filter(x=>x.id!==PE.id);
    saveBank();toast('已删除','ok');goBack();
  }});
};
ACTIONS['paper.start']=d=>{
  const p=PAPERS.find(x=>x.id===d.id);if(!p)return;
  const qs=(p.questionIds||[]).map(id=>bankQ(id)).filter(Boolean);
  if(!qs.length){toast('该套卷题目待导入','warn');return;}
  const s=newSession({type:'paper',exam:p.exam,level:p.level||defLevel(p.exam)||null,title:p.title,questionIds:qs.map(q=>q.id),minutes:p.minutes||90});
  goTo('exam',{sessionId:s.id});
};

/* ================= 考试答题页（限时 / 组卷 / 真题共用） ================= */
let EX=null;
PAGES.exam={title:'考试答题'};
PAGES.exam.render=function(el,params){
  const S=SESSIONS[params.sessionId];
  if(!S){el.innerHTML=topbarHTML('答题')+'<div class="card miss-empty">会话不存在</div>';return;}
  if(!S.startedAt){S.startedAt=Date.now();S.deadline=S.startedAt+S.minutes*60000;}
  EX={s:S,idx:S.viewIdx||0,lastTick:Date.now()};
  el.innerHTML='<div class="topbar"><button class="btn-back" data-act="exam.quit">‹ 返回</button>'
    +'<div class="tb-title" style="text-align:center">'+esc(S.title)+'</div>'
    +'<div class="timer" id="exam-timer">--:--</div></div>'
    +'<div id="exam-body">'+examQHTML()+'</div>'
    +'<div class="botbar"><div class="botbar-in">'
    +'<button class="btn btn-plain" id="eb-prev" data-act="exam.prev">上一题</button>'
    +'<button class="btn btn-primary btn-big" data-act="exam.submit">交卷</button>'
    +'<button class="btn btn-plain" id="eb-next" data-act="exam.next">下一题</button>'
    +'</div></div>';
  updateBotBtns();
  tickTimer();
};
function examQHTML(){
  const S=EX.s;
  const q=bankQ(S.questionIds[EX.idx]);
  if(!q)return'<div class="card miss-empty">该题数据已不存在</div>';
  const ans=S.answers[q.id];
  let h='<div class="q-count">第 <b>'+(EX.idx+1)+'</b> / '+S.questionIds.length+' 题'+(S.type==='auto'?' · 当前模块：'+esc(q.module):'')+'</div>';
  h+='<div class="exam-meta">'+qChips(q)+'</div>';
  h+='<div class="card"><div class="q-text">'+qTextHTML(q)+'</div>'+qExtrasHTML(q,true);
  if(q.type==='blank'){
    const bn=Math.max(1,blankAns(q).length);
    const cur=Array.isArray(ans)?ans:[];
    let bf='';
    for(let i=0;i<bn;i++)bf+='<input class="blank-in" data-blank="'+i+'" autocomplete="off" value="'+esc(cur[i]||'')+'" placeholder="'+(bn>1?('第 '+(i+1)+' 空'):'填写答案')+'">';
    h+='<div class="blank-wrap">'+bf+'</div>';
  }else if(!OBJ_TYPES.includes(q.type)){
    h+='<textarea rows="7" style="margin-top:10px" placeholder="在此作答（'+(isAutoSubj(q)?'提交后按要点命中自动评阅对错':'本题不计正确率')+'）" data-essay="'+esc(q.id)+'">'+esc(typeof ans==='string'?ans:'')+'</textarea>';
  }else{
    h+='<div class="opts">';
    optOrder(q).forEach((oi,disp)=>{
      const picked=q.type==='multiple'?(Array.isArray(ans)&&ans.includes(oi)):(ans===oi);
      h+='<div class="opt'+(picked?' sel':'')+'" data-act="exam.pick" data-i="'+oi+'"><div class="opt-badge">'+letters()[disp]+'</div><div style="flex:1">'
        +((q.oimg&&q.oimg[oi])?'<img class="opt-img" src="'+imgSrc(q.oimg[oi])+'" alt="">':'')+esc(q.o[oi])+'</div></div>';
    });
    h+='</div>';
  }
  h+='</div>';
  h+='<div class="card card-sm"><div class="muted" style="margin-bottom:2px">题号导航（仅显示已答 / 未答，不判对错）</div><div class="qgrid">'+examNavHTML()+'</div></div>';
  return h;
}
function isAnswered(a){
  if(a==null)return false;
  if(typeof a==='string')return a.trim()!=='';
  if(Array.isArray(a)){
    if(!a.length)return false;
    /* 填空答案存的是字符串数组，全空视为未作答 */
    if(a.every(x=>typeof x==='string'))return a.some(x=>String(x).trim()!=='');
    return true;
  }
  return true;
}
function examNavHTML(){
  const S=EX.s;let h='';
  S.questionIds.forEach((id,i)=>{
    h+='<div class="qn'+(isAnswered(S.answers[id])?' ans':'')+(i===EX.idx?' cur':'')+'" data-act="exam.jump" data-i="'+i+'">'+(i+1)+'</div>';
  });
  return h;
}
function updateBotBtns(){
  const p=$id('eb-prev'),n=$id('eb-next');
  if(p)p.disabled=EX.idx===0;
  if(n)n.disabled=EX.idx===EX.s.questionIds.length-1;
}
function refreshExamQ(){
  const b=$id('exam-body');if(b)b.innerHTML=examQHTML();
  updateBotBtns();
}
function switchExamTo(i){
  const S=EX.s;
  const prevId=S.questionIds[EX.idx];
  S.timePerQ[prevId]=(S.timePerQ[prevId]||0)+(Date.now()-EX.lastTick)/1000;
  EX.lastTick=Date.now();
  EX.idx=i;S.viewIdx=i;
  refreshExamQ();
}
ACTIONS['exam.pick']=d=>{
  if(!EX)return;
  const S=EX.s;const i=parseInt(d.i,10);
  const q=bankQ(S.questionIds[EX.idx]);if(!q)return;
  if(q.type==='multiple'){
    const cur=Array.isArray(S.answers[q.id])?S.answers[q.id].slice():[];
    const p=cur.indexOf(i);
    if(p>=0)cur.splice(p,1);else cur.push(i);
    cur.sort((a,b)=>a-b);
    S.answers[q.id]=cur;
  }else S.answers[q.id]=i;
  refreshExamQ();
};
ACTIONS['exam.prev']=()=>{if(EX&&EX.idx>0)switchExamTo(EX.idx-1);};
ACTIONS['exam.next']=()=>{if(EX&&EX.idx<EX.s.questionIds.length-1)switchExamTo(EX.idx+1);};
ACTIONS['exam.jump']=d=>{if(EX)switchExamTo(parseInt(d.i,10));};
document.addEventListener('input',e=>{
  const t=e.target.closest('[data-essay]');
  if(!t)return;
  if(EX){EX.s.answers[t.dataset.essay]=t.value;
    const g=document.querySelector('.qgrid');if(g)g.innerHTML=examNavHTML();}
});
document.addEventListener('input',e=>{
  const t=e.target.closest('[data-blank]');
  if(!t)return;
  if(!EX){
    const st=(typeof quizState==='function')?quizState():null;
    if(st){
      st.blank=st.blank||{};
      const ins=[].slice.call(document.querySelectorAll('#quiz-body .blank-in'));
      st.blank[st.idx]=ins.map(x=>x.value);
    }
    return;
  }
  const q=bankQ(EX.s.questionIds[EX.idx]);if(!q)return;
  const ins=[].slice.call(document.querySelectorAll('#exam-body .blank-in'));
  const arr=ins.map(x=>x.value);
  EX.s.answers[q.id]=arr;
  const g=document.querySelector('.qgrid');if(g)g.innerHTML=examNavHTML();
});
function tickTimer(){
  const el=$id('exam-timer');if(!el||!EX)return;
  const step=()=>{
    if(!EX)return;
    const rem=(EX.s.deadline-Date.now())/1000;
    el.textContent=fmtTime(rem);
    el.classList.toggle('urgent',rem<60);
    if(rem<=0){toast('时间到，自动交卷','warn');finalizeExam(true);}
  };
  step();
  examTimer=setInterval(step,500);
}
function unansweredCount(S){
  return S.questionIds.filter(id=>!isAnswered(S.answers[id])).length;
}
ACTIONS['exam.submit']=()=>{
  if(!EX)return;
  const un=unansweredCount(EX.s);
  if(un>0){
    qtConfirm({title:'交卷确认',msg:'还有 '+un+' 题未作答，确定交卷吗？',okText:'交卷',onOk:()=>finalizeExam(false)});
  }else finalizeExam(false);
};
ACTIONS['exam.quit']=()=>{
  qtConfirm({title:'退出确认',msg:'退出后本次作答将不保存，确定退出吗？',okText:'退出',danger:true,onOk:()=>goBack()});
};
function finalizeExam(auto){
  if(!EX)return;
  if(examTimer){clearInterval(examTimer);examTimer=null;}
  const S=EX.s;
  const curId=S.questionIds[EX.idx];
  S.timePerQ[curId]=(S.timePerQ[curId]||0)+(Date.now()-EX.lastTick)/1000;
  S.finishedAt=Date.now();
  S.correct={};
  let answered=0,correctN=0,objTotal=0;
  const byMod={};const modOrder=[];
  S.questionIds.forEach(id=>{
    const q=bankQ(id);if(!q)return;
    const a=S.answers[id];
    const isAns=isAnswered(a);
    if(isAns)answered++;
    let ok=null;
    if(OBJ_TYPES.includes(q.type)){
      objTotal++;
      if(isAns){
        if(q.type==='multiple'){ok=a.length===q.a.length&&a.every(x=>q.a.includes(x));}
        else ok=a===q.a;
      }else ok=false;
      S.correct[id]=ok;
      if(ok)correctN++;
      else if(isAns)addWrong(q,fmtAns(q,a));
      /* 未作答：本次考试仍判错（计入得分），但不进错题本、不计入累计做题与正确率 */
      if(isAns)recordAnswer(q,ok);
    }else if(q.type==='blank'){
      objTotal++;
      if(isAns){
        const arr=Array.isArray(a)?a:[String(a)];
        ok=blankOK(q,arr);
      }else ok=false;
      S.correct[id]=ok;
      if(ok)correctN++;
      else if(isAns)addWrong(q,Array.isArray(a)?a.join(' / '):String(a));
      if(isAns)recordAnswer(q,ok);
    }else if(isAutoSubj(q)){
      if(isAns){
        const g2=gradeSubjective(q,a);
        ok=g2.ok;
        S.correct[id]=g2.ok;
        if(!g2.ok)addWrong(q,String(a).slice(0,60));
        recordAnswer(q,g2.ok);
      }else S.correct[id]=null;
    }
    /* 模块桶统一在这里建，下面再累计 */
    if(!byMod[q.module]){byMod[q.module]={n:0,c:0,t:0,ans:0,obj:0,sub:0,pts:0,ptsTotal:0};modOrder.push(q.module);}
    if(OBJ_TYPES.includes(q.type)||q.type==='blank')byMod[q.module].obj++;
    if(isAutoSubj(q)&&isAns)byMod[q.module].sub++;
    byMod[q.module].n++;byMod[q.module].t+=S.timePerQ[id]||0;
    if(isAns)byMod[q.module].ans++;
    if(ok===true)byMod[q.module].c++;
  });
  let score=null,scoreTotal=0,subN=0,subTotal=0;
  if(S.type==='auto'||S.type==='paper'){
    score=0;
    S.questionIds.forEach(id2=>{
      const q2=bankQ(id2);
      if(!q2)return;
      const pt=qPoints(q2,S.exam,S.level);
      if(OBJ_TYPES.includes(q2.type)||q2.type==='blank'||(isAutoSubj(q2)&&S.correct[id2]!=null)){
        scoreTotal+=pt;
        if(S.correct[id2])score+=pt;
        if(byMod[q2.module]){byMod[q2.module].ptsTotal+=pt;if(S.correct[id2])byMod[q2.module].pts+=pt;}
      }else if(pt>0){subN++;subTotal+=pt;}
    });
    score=Math.round(score*10)/10;scoreTotal=Math.round(scoreTotal*10)/10;subTotal=Math.round(subTotal*10)/10;
  }
  S.result={total:S.questionIds.length,answered,correctN,objTotal,
    acc:objTotal?Math.round(correctN*100/objTotal)+'%':'—',
    useTime:(S.finishedAt-S.startedAt)/1000,byMod,modOrder,auto,score,scoreTotal,subN,subTotal};
  addRecord(S);
  goTo('result',{sessionId:S.id});
}

/* ================= 结果页 ================= */
PAGES.result={title:'考试情况'};
PAGES.result.render=function(el,params){
  const S=SESSIONS[params.sessionId];
  if(!S||!S.result){
    el.innerHTML=topbarHTML('考试情况')+'<div class="card miss-empty">会话不存在或未交卷</div>';return;
  }
  const r=S.result;
  const accN=parseInt(r.acc,10);
  const accClass=(!isNaN(accN)&&accN>=80)?' acc-hi':((!isNaN(accN)&&accN<60)?' acc-lo':'');
  let modRows='';
  r.modOrder.forEach(m=>{
    const d=r.byMod[m];
    const den=(d.obj||0)+(d.sub||0);
    const acc=den?Math.round(d.c*100/den)+'%':'—';
    const cls=(den&&d.c/den>=0.8)?'acc-ok':((den&&d.c/den<0.6)?'acc-err':'');
    modRows+='<tr><td>'+esc(m)+'</td><td>'+d.n+'</td><td>'+d.c+'</td><td class="'+cls+'">'+acc+'</td><td>'+(d.ptsTotal?((Math.round(d.pts*10)/10)+'/'+(Math.round(d.ptsTotal*10)/10)+' 分'):'—')+'</td><td>'+fmtTime(d.t)+'</td></tr>';
  });
  const againLabel=S.type==='timed'?'再练一组':(S.type==='auto'?'再组一套':'再练一套');
  const againPage=S.type==='timed'?'timedConfig':(S.type==='auto'?'autoConfig':'paperList');
  /* 限时训练不计分（score 为 null），及格线要按正确率判定，
     否则「配置页填了及格线、结果页永远看不到达没达标」 */
  const pctVal=(r.score!=null&&r.scoreTotal>0)?Math.round(r.score*100/r.scoreTotal)
              :(r.objTotal?Math.round(r.correctN*100/r.objTotal):null);
  const pctName=(r.score!=null)?'得分率':'正确率';
  const passLine=(pctVal!=null&&S.pass>0)
    ?'<div class="card card-sm" style="text-align:center">'+(pctVal>=S.pass
      ?'<span class="chip" style="background:var(--ok-bg);color:var(--ok);font-size:13px">✓ '+pctName+' '+pctVal+'%，达到及格线 '+S.pass+'%</span>'
      :'<span class="chip c-wrong" style="font-size:13px">✗ '+pctName+' '+pctVal+'%，未达及格线 '+S.pass+'%</span>')+'</div>'
    :'';
  el.innerHTML=topbarHTML('考试情况 · '+esc(S.title),'','res.backConfig')
    +'<div class="card"><div class="res-grid">'
    +'<div><div class="rn">'+r.total+'</div><div class="rl">总题数</div></div>'
    +'<div><div class="rn">'+r.answered+'</div><div class="rl">已答题数</div></div>'
    +'<div><div class="rn" style="color:var(--ok)">'+r.correctN+'</div><div class="rl">答对数</div></div>'
    +'<div><div class="rn'+accClass+'">'+r.acc+'</div><div class="rl">正确率</div></div>'
    +'<div><div class="rn" style="font-size:17px;padding-top:5px">'+fmtTime(r.useTime)+'</div><div class="rl">用时</div></div>'
    +'</div>'+(r.auto?'<div class="muted" style="margin-top:6px">时间到自动交卷</div>':'')+'</div>'
    +(r.score!=null?'<div class="card" style="text-align:center;padding:18px 16px">'
      +'<div class="muted" style="font-size:13px">得分 · '+esc(S.exam||'所选考试类型')+(S.level?' · '+esc(S.level):'')+'计分规则</div>'
      +'<div class="big-num" style="font-size:34px;margin:2px 0">'+r.score+'<span style="font-size:15px;color:var(--text-sub);font-weight:400"> / '+r.scoreTotal+' 分（客观题）</span></div>'
      +(r.subTotal>0?'<div class="muted" style="font-size:12px">另含主观题 '+r.subN+' 题 · 共 '+r.subTotal+' 分，需人工评卷，未计入以上得分</div>':'')
      +'<div class="muted" style="font-size:12px">客观题按模块/子类计（0.5~2.1 分/题），主观题按题型计（10~70 分/题），模块明细见下表</div></div>':'')
    +passLine
    +'<div class="card"><b style="font-size:15px">分模块统计</b>'
    +'<table class="tmod" style="margin-top:8px"><thead><tr><th>模块</th><th>题数</th><th>答对</th><th>正确率</th><th>得分</th><th>用时</th></tr></thead><tbody>'+modRows+'</tbody></table></div>'
    +'<div class="card"><b style="font-size:15px">题目对错</b><span class="muted" style="margin-left:8px">点击题号查看详情</span>'
    +'<div class="qgrid">'+resultNavHTML(S)+'</div></div>'
    +'<div class="botbar"><div class="botbar-in">'
    +'<button class="btn btn-ghost" data-act="nav.home">返回首页</button>'
    +'<button class="btn btn-primary btn-big" data-act="res.again" data-t="'+S.type+'">'+againLabel+'</button>'
    +'</div></div>';
};
function resultNavHTML(S){
  let h='';
  if(S.type==='auto'&&S.modulesOrder&&S.modulesOrder.length>=1){
    let lastMod=null;
    S.questionIds.forEach((id,i)=>{
      const q=bankQ(id);
      const mod=q?q.module:'';
      if(mod!==lastMod){h+='<div class="qg-head">'+esc(mod)+'</div>';lastMod=mod;}
      h+=resultQnHTML(S,id,i);
    });
  }else{
    S.questionIds.forEach((id,i)=>{h+=resultQnHTML(S,id,i);});
  }
  return h;
}
function resultQnHTML(S,id,i){
  const c=S.correct[id];
  const cls=c===true?' ok':(c===false?' err':' un');
  const cur=(S.viewIdx===i)?' cur':'';
  return '<div class="qn'+cls+cur+'" data-act="res.detail" data-i="'+i+'">'+(i+1)+'</div>';
}
ACTIONS['res.detail']=d=>{
  const S=SESSIONS[curPage().params.sessionId];if(!S)return;
  const i=parseInt(d.i,10);
  S.viewIdx=i;
  goTo('questionDetail',{sessionId:S.id,questionId:S.questionIds[i]});
};
ACTIONS['res.backConfig']=()=>{const S=SESSIONS[curPage().params.sessionId];const pg=(S&&S.type==='timed')?'timedConfig':((S&&S.type==='paper')?'paperList':'autoConfig');resetTo(pg,{});};
ACTIONS['res.again']=d=>{
  const page=d.t==='timed'?'timedConfig':(d.t==='auto'?'autoConfig':'paperList');
  resetTo(page,{});
};

/* ================= 练习记录 ================= */
PAGES.records={title:'练习记录'};
PAGES.records.render=function(el){
  if(!RECS.length){
    el.innerHTML=topbarHTML('练习记录')
      +'<div class="card miss-empty">还没有练习记录<br><span class="muted">完成限时训练、自动组卷或真题训练后，记录会自动保存在这里（最多保留 80 次）</span></div>';
    return;
  }
  const typeNames={timed:'限时训练',auto:'自动组卷',paper:'真题训练'};
  let rows='';
  RECS.forEach(r=>{
    const res=r.result||{};
    const d=new Date(r.finishedAt||Date.now());
    const when=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
    const pct2=(res.score!=null&&res.scoreTotal>0)?Math.round(res.score*100/res.scoreTotal):null;
    const passTip=(r.pass>0&&pct2!=null)?(pct2>=r.pass?' · <b style="color:var(--ok)">及格</b>':' · <b style="color:var(--err)">不及格</b>'):'';
    const scoreLine=res.score!=null?('得分 <b style="color:var(--primary)">'+res.score+'</b>/'+res.scoreTotal+' 分'+passTip):('正确率 <b style="color:var(--primary)">'+(res.acc||'—')+'</b>');
    rows+='<div class="card card-sm card-tap mod-card ready" data-act="rec.open" data-id="'+esc(r.id)+'">'
      +'<div><div class="m-name">'+esc(r.title||typeNames[r.type]||'练习')+'</div>'
      +'<div class="m-nums">'+when+' · '+(typeNames[r.type]||'练习')+' · 共 '+res.total+' 题答对 '+res.correctN+' 题 · '+scoreLine+' · 用时 '+fmtTime(res.useTime||0)+'</div></div>'
      +'<div class="m-right">›</div></div>';
  });
  el.innerHTML=topbarHTML('练习记录 · 最近 '+RECS.length+' 次')
    +'<div class="row" style="margin:6px 4px"><span class="muted">点击记录查看当时的考试情况与每题对错</span>'
    +'<button class="btn-link" style="color:var(--err);margin-left:auto" data-act="rec.clear">清空记录</button></div>'
    +rows;
};
ACTIONS['rec.open']=d=>{
  if(!SESSIONS[d.id]){
    const r=RECS.find(x=>x.id===d.id);
    if(!r){toast('记录不存在','warn');return;}
    SESSIONS[d.id]=r;
  }
  goTo('result',{sessionId:d.id});
};
ACTIONS['rec.clear']=()=>{
  qtConfirm({title:'清空练习记录',msg:'将删除全部 '+RECS.length+' 条练习记录（不影响题库、统计与错题）。确定清空？',okText:'清空',danger:true,onOk:()=>{RECS=[];saveRecs();render();}});
};
