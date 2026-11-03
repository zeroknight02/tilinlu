/* 题灵录 · pages/quiz */
/* ================= 即时判分答题组件（自由刷题 / 错题刷题共用） ================= */
let PS=null,MS=null;
function isAutoSubj(q){return !!(q&&(q.module==='申论'||q.module==='综应'));}
function gradeSubjective(q,ansText){
  const ans=String(ansText||'').replace(/\s+/g,'');
  if(ans.length<10)return{ok:false,matched:0,total:0,cover:0,short:true};
  const src=String(q.e||'').replace(/【[^】]*】/g,'');
  const parts=src.split(/[0-9０-９]+[、.．)）]?|[一二三四五六七八九十]{1,3}[、.．)）]|[、，,;；。．.\n\/()（）:：\s\u201c\u201d\u2018\u2019\u300c\u300d\u300e\u300f"]+/);
  const kws=[];
  parts.forEach(w=>{w=w.trim();if(w.length>=2&&w.length<=16)kws.push(w);});
  const uniq=[...new Set(kws)].slice(0,30);
  const FRAME=['立意','结构','论证','分论点','开头由','引出主题','结尾升华','开头','结尾','总论点','论点','思路','要点','参考思路','参考答案','解析','答案'];
  const uniqF=uniq.filter(w=>FRAME.indexOf(w)<0);
  const hit=p=>{
    if(ans.includes(p))return true;
    if(p.length<=6)return false;
    const sh=[];
    for(let i=0;i+4<=p.length;i+=2)sh.push(p.slice(i,i+4));
    sh.push(p.length%2===0?p.slice(p.length-4):p.slice(p.length-3));
    return sh.some(x=>ans.includes(x));
  };
  if(uniqF.length<3)return{ok:ans.length>=50,matched:uniqF.filter(hit).length,total:uniqF.length,cover:1};
  const matched=uniqF.filter(hit);
  const cover=matched.length/uniqF.length;
  return{ok:cover>=0.25,matched:matched.length,total:uniqF.length,cover:cover};
}
function quizState(){
  const p=curPage().page;
  if(p==='practice')return PS;
  if(p==='mistakePractice')return MS;
  return null;
}
let FONT_SIZE='md';
function applyFont(){document.documentElement.dataset.fs=FONT_SIZE||'md';}
function optShuffleOn(){return lsGet(K.optShuffle)==='1';}
/* 选项顺序：开启打乱时按题目 id 做确定性洗牌，保证每次渲染一致 */
function optOrder(q){
  const n=(q.o||[]).length,arr=[];
  for(let i=0;i<n;i++)arr.push(i);
  if(!optShuffleOn()||n<3)return arr;
  let seed=parseInt(simpleHash(String(q.id)+'#'),36)%2147483647||1;
  for(let i=n-1;i>0;i--){
    seed=(seed*16807)%2147483647;
    const j=seed%(i+1),t=arr[i];arr[i]=arr[j];arr[j]=t;
  }
  return arr;
}
/* ---- 填空题 ---- */
function blankAns(q){
  if(Array.isArray(q.a))return q.a.map(x=>String(x));
  if(q.a==null||q.a==='')return [];
  return [String(q.a)];
}
function normB(s){
  return String(s==null?'':s).toLowerCase()
    .replace(/\s+/g,'')
    .replace(/[，。、；：""''（）()【】\[\]！!？?.,;:·…—]/g,'');
}
function blankOK(q,inputs){
  const a=blankAns(q);
  if(!a.length||!Array.isArray(inputs)||inputs.length!==a.length)return false;
  return inputs.every((v,i)=>normB(v)===normB(a[i]));
}
/* ---- 题目附加内容：材料 / 配图 / 笔记 ---- */
function qExtrasHTML(q,hideNote){
  let h='';
  if(q.mat)h+='<details class="mat-box"><summary>材料 · 点击展开</summary><div class="mat-body">'+esc(q.mat)+'</div></details>';
  if(q.img)h+='<img class="q-img" src="'+q.img+'" alt="题图">';
  if(q.note&&!hideNote)h+='<div class="q-note"><b>我的笔记</b>'+esc(q.note)+'</div>';
  return h;
}
function curQ(){
  const p=curPage();
  if(!p)return null;
  if(p.page==='practice'&&PS)return PS.qs[PS.idx]||null;
  if(p.page==='mistakePractice'&&MS)return MS.qs[MS.idx]||null;
  if(p.page==='exam'&&EX)return bankQ(EX.s.questionIds[EX.idx]);
  if(p.page==='questionDetail')return bankQ(p.params.questionId);
  return null;
}
function shrinkImage(file,cb){
  const fr=new FileReader();
  fr.onload=()=>{
    const im=new Image();
    im.onload=()=>{
      const max=1200;
      let w=im.width,ht=im.height;
      if(Math.max(w,ht)>max){const k=max/Math.max(w,ht);w=Math.round(w*k);ht=Math.round(ht*k);}
      const c=document.createElement('canvas');c.width=w;c.height=ht;
      c.getContext('2d').drawImage(im,0,0,w,ht);
      cb(c.toDataURL('image/jpeg',0.82));
    };
    im.onerror=()=>toast('图片读取失败','err');
    im.src=fr.result;
  };
  fr.onerror=()=>toast('图片读取失败','err');
  fr.readAsDataURL(file);
}
function answerStreak(){
  const days={};
  Object.keys(STATS.ans||{}).forEach(id=>{
    const a=STATS.ans[id];if(!a||!a.t)return;
    const d=new Date(a.t);days[learnKey(d)]=1;
  });
  const d=new Date();
  if(!days[learnKey(d)])d.setDate(d.getDate()-1);
  let n=0;
  for(let i=0;i<400;i++){if(!days[learnKey(d)])break;n++;d.setDate(d.getDate()-1);}
  return n;
}
function quizQHTML(st){
  const q=st.qs[st.idx];
  const focusOn=document.body.classList.contains('focus-mode');
  let h='<div class="qc-row"><div class="q-count">第 <b>'+(st.idx+1)+'</b> / '+st.qs.length+' 题 · <span id="quiz-wc">错题 <b>'+st.wrongCount+'</b> 题</span></div>'
    +'<button class="qc-focus" data-act="q.more" aria-label="题目操作">⋯</button>'
    +'<button class="qc-focus" data-act="prax.focus">'+(focusOn?'退出专注':'专注')+'</button></div>';
  h+='<div class="exam-meta">'+qChips(q)+(q.flag?'<span class="flag-dot flag-'+q.flag+'" title="已标记"></span>':'')+'</div>';
  h+='<div class="card"><div class="q-text">'+esc(q.q)+'</div>'+qExtrasHTML(q);
  if(q.type==='blank'){
    const bn=Math.max(1,blankAns(q).length);
    let bf='';
    const keep=(st.blank&&st.blank[st.idx])||[];
    for(let i=0;i<bn;i++)bf+='<input class="blank-in" data-blank="'+i+'" autocomplete="off" value="'+esc(keep[i]||'')+'" placeholder="'+(bn>1?('第 '+(i+1)+' 空'):'填写答案')+'">';
    h+='<div class="blank-wrap">'+bf+'</div>'
      +'<div class="multi-submit-bar"><button class="btn btn-primary" data-act="quiz.blankSubmit">提交答案</button></div>'
      +'<div id="quiz-verdict"></div>';
  }else if(!OBJ_TYPES.includes(q.type)){
    if(isAutoSubj(q)){
      h+='<textarea rows="7" style="margin-top:12px" data-subj="1" placeholder="在此作答（提交后按参考答案要点命中自动评阅对错，仅供参考）"></textarea>';
      h+='<div class="multi-submit-bar" id="quiz-sub-bar"><button class="btn btn-primary" data-act="quiz.subSubmit">提交答案 · 自动评阅</button></div>';
      h+='<div id="quiz-verdict"></div>';
    }else{
      h+='<div class="multi-submit-bar">'+(st.essayOpen?'':'<button class="btn btn-ghost" data-act="quiz.essay">查看参考答案</button>')+'</div>';
      if(st.essayOpen)h+='<div class="analysis" style="margin-top:10px"><span class="a-t">参考答案</span>'+esc(q.e||'暂无解析')+'</div>';
    }
  }else{
    h+='<div class="opts" id="quiz-opts">';
    optOrder(q).forEach((oi,disp)=>{
      h+='<div class="opt" data-act="quiz.pick" data-i="'+oi+'"><div class="opt-badge">'+letters()[disp]+'</div><div style="flex:1">'
        +((q.oimg&&q.oimg[oi])?'<img class="opt-img" src="'+q.oimg[oi]+'" alt="">':'')+esc(q.o[oi])+'</div></div>';
    });
    h+='</div>';
    if(q.type==='multiple')h+='<div class="multi-submit-bar" id="quiz-submit"><button class="btn btn-primary" data-act="quiz.submit">提交答案</button><span class="muted" style="margin-left:10px">可多选，选完后提交</span></div>';
    h+='<div id="quiz-verdict"></div>';
  }
  h+='</div>';
  return h;
}
ACTIONS['quiz.pick']=d=>{
  const st=quizState();if(!st||st.locked)return;
  const q=st.qs[st.idx];const i=parseInt(d.i,10);
  if(i<0||i>=q.o.length)return;
  if(q.type==='multiple'){
    if(st.sel.has(i))st.sel.delete(i);else st.sel.add(i);
    const el=document.querySelector('#quiz-opts .opt[data-i="'+i+'"]');
    if(el)el.classList.toggle('sel',st.sel.has(i));
    return;
  }
  quizJudge(q,i);
};
ACTIONS['quiz.submit']=()=>{
  const st=quizState();if(!st||st.locked)return;
  if(st.sel.size===0){toast('请先选择选项','warn');return;}
  quizJudge(st.qs[st.idx],[...st.sel].sort((a,b)=>a-b));
};
ACTIONS['quiz.essay']=()=>{
  const st=quizState();if(!st)return;
  st.essayOpen=true;
  const b=$id('quiz-body');if(b)b.innerHTML=quizQHTML(st);
};
function quizJudge(q,userPick){
  const st=quizState();st.locked=true;
  let correct;
  if(q.type==='multiple'){
    const u=Array.isArray(userPick)?userPick:[];
    correct=u.length===q.a.length&&u.every(x=>q.a.includes(x));
  }else correct=userPick===q.a;
  document.querySelectorAll('#quiz-opts .opt').forEach(el=>{
    const oi=parseInt(el.dataset.i,10);
    el.classList.remove('sel');
    const inAns=Array.isArray(q.a)?q.a.includes(oi):(q.a===oi);
    const picked=q.type==='multiple'?(Array.isArray(userPick)&&userPick.includes(oi)):(userPick===oi);
    if(picked&&inAns){el.classList.add('ok');el.insertAdjacentHTML('beforeend','<span class="tag-mine">我的选择</span>');}
    else if(picked){el.classList.add('err');el.insertAdjacentHTML('beforeend','<span class="tag-mine">我的选择</span>');}
    else if(inAns){el.classList.add('ans-outline');}
  });
  const v=$id('quiz-verdict');
  if(v)v.innerHTML='<div class="verdict '+(correct?'v-ok':'v-err')+'">'+(correct?'✓ 回答正确':'✗ 回答错误')+'</div>'
    +'<div class="analysis" style="margin-top:8px"><span class="a-t">解析</span>'+esc(q.e||'暂无解析')+'</div>';
  const sb=$id('quiz-submit');if(sb)sb.style.display='none';
  afterQuizJudge(q,correct,userPick);
}
function afterQuizJudge(q,correct,userAns){
  recordAnswer(q,correct);
  if(!correct)addWrong(q,typeof userAns==='string'?userAns.slice(0,60):fmtAns(q,userAns));
  const page=curPage().page;
  if(page==='practice'){
    if(PS.mode==='all'&&!PS.shuf)saveProgress(PS.m,PS.idx+1,PS.qs.length);
    PS.wrongCount=wrongCountOf(PS.m);
    const wc=$id('quiz-wc');if(wc)wc.innerHTML='错题 <b>'+PS.wrongCount+'</b> 题';
  }else if(page==='mistakePractice'){
    /* 从搜索结果进来的练习只判对错，不动错题本的"连对移出"状态 */
    if(curPage().params.soft==='1'){MS.right+=(correct?1:0);MS.wrong+=(correct?0:1);return;}
    const r=applyMistakeResult(q,correct);
    if(r.removed){MS.removed++;toast('已连续答对 3 次，自动移出错题本','ok');}
    else if(correct)toast('已连续答对 '+r.cc+' / 3 次','ok');
    else toast('答错，连续答对清零','warn');
    if(correct)MS.right++;else MS.wrong++;
  }
}
ACTIONS['quiz.subSubmit']=()=>{
  const st=quizState();if(!st||st.locked)return;
  const q=st.qs[st.idx];
  const ta=document.querySelector('#quiz-body [data-subj]');
  const text=ta?ta.value:'';
  if(!text.trim()){toast('请先作答，再提交自动评阅','warn');return;}
  st.locked=true;
  if(ta)ta.readOnly=true;
  const g=gradeSubjective(q,text);
  const pct=Math.round(g.cover*100);
  const v=$id('quiz-verdict');
  if(v)v.innerHTML='<div class="verdict '+(g.ok?'v-ok':'v-err')+'">'+(g.ok?'✓ 自动评阅：回答正确':'✗ 自动评阅：回答错误')+'</div>'
    +'<div class="muted" style="margin:4px 0">要点命中 '+g.matched+' / '+g.total+'（覆盖率 '+(g.total?pct:100)+'%，阈值 25%，仅供参考）</div>'
    +'<div class="analysis" style="margin-top:8px"><span class="a-t">参考答案</span>'+esc(q.e||'暂无解析')+'</div>';
  const sb=$id('quiz-sub-bar');if(sb)sb.style.display='none';
  afterQuizJudge(q,g.ok,text);
};
ACTIONS['quiz.next']=()=>{
  const page=curPage().page;
  if(page==='practice'){
    if(!PS)return;
    if(PS.idx>=PS.qs.length-1){toast('已是最后一题');return;}
    PS.idx++;PS.locked=false;PS.sel=new Set();PS.essayOpen=false;
    const b=$id('quiz-body');if(b)b.innerHTML=quizQHTML(PS);
    updateFavBtn();
  }else if(page==='mistakePractice'){mpNext();}
};

ACTIONS['quiz.blankSubmit']=()=>{
  const st=quizState();if(!st||st.locked)return;
  const q=st.qs[st.idx];if(!q)return;
  const ins=[].slice.call(document.querySelectorAll('#quiz-body .blank-in'));
  if(!ins.length)return;
  const vals=ins.map(x=>x.value);
  if(vals.some(v=>!String(v).trim())){toast('请先填完所有空','warn');return;}
  const ok=blankOK(q,vals);
  st.locked=true;
  ins.forEach(el=>{el.readOnly=true;el.classList.add(ok?'ok':'err');});
  const v=$id('quiz-verdict');
  if(v)v.innerHTML='<div class="verdict '+(ok?'v-ok':'v-err')+'">'+(ok?'✓ 回答正确':'✗ 回答错误')+'</div>'
    +'<div class="analysis" style="margin-top:8px"><span class="a-t">参考答案</span>'+esc(blankAns(q).join(' / '))+(q.e?('\n'+esc(q.e)):'')+'</div>';
  const sb=document.querySelector('#quiz-body .multi-submit-bar');if(sb)sb.style.display='none';
  afterQuizJudge(q,ok,vals.join(' / '));
};
ACTIONS['q.more']=()=>{
  const q=curQ();if(!q){toast('当前没有题目','warn');return;}
  $id('modal-root').innerHTML='<div class="mask" data-act="modal.mask"><div class="modal" data-stop="1">'
    +'<h3>题目操作</h3>'
    +'<div class="sheet-item" data-act="q.pickImg"><span>添加 / 更换配图</span><span class="muted">'+(q.img?'已有':'')+'</span></div>'
    +(q.img?'<div class="sheet-item" data-act="q.delImg"><span style="color:var(--err)">删除配图</span><span class="muted"></span></div>':'')
    +'<div class="sheet-item" data-act="q.noteOpen"><span>写笔记</span><span class="muted">'+(q.note?'已有':'')+'</span></div>'
    +'<div class="sheet-item" data-act="q.matOpen"><span>编辑材料（共用题干）</span><span class="muted">'+(q.mat?'已有':'')+'</span></div>'
    +'<div class="sheet-item" style="display:block"><div style="margin-bottom:8px">颜色标记</div>'
    +'<div class="flag-row">'
    +['red:重点','blue:存疑','green:已掌握',':清除'].map(x=>{
        const k=x.split(':')[0],n=x.split(':')[1];
        return '<button class="flag-btn flag-'+k+(k?'':' none')+(q.flag===k?' on':'')+'" data-act="q.flag" data-f="'+k+'">'+n+'</button>';
      }).join('')
    +'</div></div>'
    +'<div class="m-btns"><button class="btn btn-plain" data-act="modal.cancel">关闭</button></div>'
    +'</div></div>';
  modalOpen=true;
};
ACTIONS['q.pickImg']=()=>{
  closeModal();
  let inp=$id('q-img-file');
  if(!inp){
    inp=document.createElement('input');inp.type='file';inp.accept='image/*';
    inp.id='q-img-file';inp.style.display='none';document.body.appendChild(inp);
  }
  inp.value='';inp.click();
};
ACTIONS['q.flag']=d=>{
  const q=curQ();if(!q)return;
  q.flag=d.f||'';saveBank();closeModal();render();
  toast(q.flag?('已标记：'+({red:'重点',blue:'存疑',green:'已掌握'}[q.flag])):'已清除标记','ok');
};
ACTIONS['q.delImg']=()=>{
  const q=curQ();if(!q)return;
  q.img='';saveBank();closeModal();render();toast('已删除配图','ok');
};
ACTIONS['q.noteOpen']=()=>{
  const q=curQ();if(!q)return;
  $id('modal-root').innerHTML='<div class="mask" data-act="modal.mask"><div class="modal" data-stop="1">'
    +'<h3>写笔记</h3>'
    +'<textarea id="q-note-tx" rows="6" style="width:100%;box-sizing:border-box;margin-top:6px" placeholder="记下你的理解、易错点、记忆口诀…">'+esc(q.note||'')+'</textarea>'
    +'<div class="m-btns"><button class="btn btn-primary" data-act="q.noteSave">保存</button>'
    +'<button class="btn btn-plain" data-act="modal.cancel">取消</button></div>'
    +'</div></div>';
  modalOpen=true;
};
ACTIONS['q.noteSave']=()=>{
  const q=curQ();const t=$id('q-note-tx');if(!q||!t)return;
  q.note=t.value.trim();saveBank();closeModal();render();toast(q.note?'笔记已保存':'笔记已清空','ok');
};
ACTIONS['q.matOpen']=()=>{
  const q=curQ();if(!q)return;
  $id('modal-root').innerHTML='<div class="mask" data-act="modal.mask"><div class="modal" data-stop="1">'
    +'<h3>材料 · 共用题干</h3>'
    +'<div class="muted" style="font-size:12px;margin-top:2px">这段文字会显示在题干上方，可折叠。适合资料分析、申论材料题。</div>'
    +'<textarea id="q-mat-tx" rows="8" style="width:100%;box-sizing:border-box;margin-top:8px" placeholder="粘贴材料原文…">'+esc(q.mat||'')+'</textarea>'
    +'<div class="m-btns"><button class="btn btn-primary" data-act="q.matSave">保存</button>'
    +'<button class="btn btn-plain" data-act="modal.cancel">取消</button></div>'
    +'</div></div>';
  modalOpen=true;
};
ACTIONS['q.matSave']=()=>{
  const q=curQ();const t=$id('q-mat-tx');if(!q||!t)return;
  q.mat=t.value.trim();saveBank();closeModal();render();toast(q.mat?'材料已保存':'材料已清空','ok');
};
ACTIONS['quiz.prev']=()=>{
  if(curPage().page!=='practice'||!PS)return;
  if(PS.idx<=0){toast('已是第一题');return;}
  PS.idx--;PS.locked=false;PS.sel=new Set();PS.essayOpen=false;
  const b=$id('quiz-body');if(b)b.innerHTML=quizQHTML(PS);
  updateFavBtn();window.scrollTo(0,0);
};
ACTIONS['prax.card']=()=>{
  if(!PS)return;
  let g='';
  PS.qs.forEach((q,i)=>{
    const a=(STATS.ans||{})[q.id];
    let cls='qn';
    if(a&&a.c===1)cls+=' ok';else if(a&&a.c===0)cls+=' err';else cls+=' un';
    if(i===PS.idx)cls+=' cur';
    g+='<div class="'+cls+'" data-act="prax.jump" data-i="'+i+'">'+(i+1)+'</div>';
  });
  $id('modal-root').innerHTML='<div class="mask" data-act="modal.mask"><div class="modal" data-stop="1">'
    +'<h3>答题卡 · '+esc(PS.m||(PS.mode==='review'?'间隔复习':''))+'</h3>'
    +'<div class="qc-legend"><span class="ok"><i></i>答对</span><span class="err"><i></i>答错</span><span class="un"><i></i>未答</span></div>'
    +'<div class="qgrid">'+g+'</div>'
    +'<div class="m-btns"><button class="btn btn-plain" data-act="modal.cancel">关闭</button></div>'
    +'</div></div>';
  modalOpen=true;
};
ACTIONS['prax.jump']=d=>{
  const i=parseInt(d.i,10);
  if(!PS||isNaN(i)||i<0||i>=PS.qs.length)return;
  PS.idx=i;PS.locked=false;PS.sel=new Set();PS.essayOpen=false;
  closeModal();
  const b=$id('quiz-body');if(b)b.innerHTML=quizQHTML(PS);
  updateFavBtn();window.scrollTo(0,0);
};
ACTIONS['prax.focus']=()=>{
  const on=document.body.classList.toggle('focus-mode');
  try{
    if(on&&document.documentElement.requestFullscreen&&!document.fullscreenElement){
      const pr=document.documentElement.requestFullscreen();if(pr&&pr.catch)pr.catch(()=>{});
    }else if(!on&&document.fullscreenElement&&document.exitFullscreen){
      const pr=document.exitFullscreen();if(pr&&pr.catch)pr.catch(()=>{});
    }
  }catch(e){}
  render();
};

/* ================= 自由刷题 · 答题页 ================= */
PAGES.practice={title:'自由刷题'};
PAGES.practice.render=function(el,params){
  const m=params.module||'';
  const mode0=params.mode||'all';
  if(mode0!=='review'&&allModules().indexOf(m)<0){
    el.innerHTML=topbarHTML('自由刷题')+'<div class="card miss-empty">模块不存在</div>';return;
  }
  const mode=params.mode||'all';
  const shuf=(params.shuffle!=null)?params.shuffle==='1':lsGet(K.pshuffle)==='1';
  let qs,idx;
  if(mode==='review'){qs=srsDue().map(id=>bankQ(id)).filter(Boolean);idx=0;}
  else if(mode==='wrong'){qs=shuffle(wrongQsOf(m));idx=0;}
  else if(mode==='fav'){qs=shuffle(favQsOf(m));idx=0;}
  else{qs=bankOf(m);if(shuf){qs=shuffle(qs);idx=0;}else{idx=getProg(m);if(idx>=qs.length)idx=0;}}
  if(!qs.length){
    const tip=mode==='review'?'今天没有到期的复习题目，明天再来看看':(mode==='fav'?'该模块暂无收藏题目：在刷题、错题本或详情页点「☆ 收藏本题」即可加入':(mode==='wrong'?'该模块暂无错题':'该模块暂无题目，可先导入题库'));
    el.innerHTML=topbarHTML(mode==='review'?'间隔复习':m,'自由刷题')+'<div class="card miss-empty">'+esc(tip)+'</div>'
      +'<div class="botbar"><div class="botbar-in">'
      +'<button class="btn btn-plain btn-sm" data-act="prax.wrongOnly">'+(mode==='all'?'只看错题':(mode==='wrong'?'只看收藏':'全部题目'))+'</button>'
      +'<button class="btn btn-plain btn-sm" data-act="prax.shuffle">'+(shuf?'随机中':'顺序中')+'</button>'
      +'<button class="btn btn-primary btn-big" data-act="nav.back">返回</button>'
      +'</div></div>';
    return;
  }
  PS={m,mode,qs,idx,shuf,locked:false,sel:new Set(),essayOpen:false,blank:{},wrongCount:wrongCountOf(m)};
  /* 复习队列是固定的一组到期题，没有「模块」可切换，所以不显示模式/顺序按钮 */
  const toolsHTML=mode==='review'
    ?'<div class="qb-tools">'
      +'<span class="muted" style="font-size:12px">今日待复习 '+qs.length+' 题</span>'
      +'<button class="btn btn-ghost btn-sm" id="quiz-fav" data-act="quiz.fav">'+(PS.qs[PS.idx]&&isFav(PS.qs[PS.idx].id)?'★ 已收藏':'☆ 收藏本题')+'</button>'
      +'<button class="btn btn-plain btn-sm" data-act="prax.card">答题卡</button>'
      +'</div>'
    :'<div class="qb-tools">'
      +'<button class="btn btn-plain btn-sm" data-act="prax.wrongOnly">'+(mode==='all'?'只看错题':(mode==='wrong'?'只看收藏':'全部题目'))+'</button>'
      +'<button class="btn btn-plain btn-sm" data-act="prax.shuffle">'+(shuf?'随机中':'顺序中')+'</button>'
      +'<button class="btn btn-ghost btn-sm" id="quiz-fav" data-act="quiz.fav">'+(PS.qs[PS.idx]&&isFav(PS.qs[PS.idx].id)?'★ 已收藏':'☆ 收藏本题')+'</button>'
      +'<button class="btn btn-plain btn-sm" data-act="prax.card">答题卡</button>'
      +'</div>';
  el.innerHTML=topbarHTML(mode==='review'?'间隔复习':m, mode==='review'?('待复习 '+qs.length+' 题'):'自由刷题')
    +'<div id="quiz-body">'+quizQHTML(PS)+'</div>'
    +'<div class="botbar"><div class="botbar-in botbar-stack">'
    +toolsHTML
    +'<div class="qb-acts">'
    +'<button class="btn btn-ghost btn-sm" data-act="nav.home">首页</button>'
    +'<button class="btn btn-plain" data-act="quiz.prev">上一题</button>'
    +'<button class="btn btn-primary" data-act="quiz.next">下一题</button>'
    +'</div>'
    +'</div></div>'
    +'<button class="focus-exit" data-act="prax.focus">退出专注</button>';
};
ACTIONS['prax.wrongOnly']=()=>{
  const c=curPage();
  if(c.params.mode==='review'){toast('复习队列是固定的，不能切换模式','warn');return;}
  const seq=['all','wrong','fav'];
  const cur=seq.indexOf(c.params.mode||'all');
  reRender({mode:seq[(cur+1)%3]});
};
ACTIONS['prax.shuffle']=()=>{
  const c=curPage();
  if(c.params.mode==='review'){toast('复习队列按到期时间排序，不能打乱','warn');return;}
  const on=(c.params.shuffle!=null?c.params.shuffle==='1':lsGet(K.pshuffle)==='1');
  const v=on?'':'1';
  lsSet(K.pshuffle,v);
  reRender({mode:c.params.mode||'all',shuffle:v});
};
ACTIONS['quiz.fav']=()=>{
  const st=quizState();if(!st)return;
  const q=st.qs[st.idx];if(!q)return;
  const on=toggleFav(q.id);
  toast(on?'已加入收藏夹':'已取消收藏','ok');
  const fb=$id('quiz-fav');if(fb)fb.textContent=on?'★ 已收藏':'☆ 收藏本题';
};
function updateFavBtn(){
  const st=quizState();const fb=$id('quiz-fav');if(!fb||!st)return;
  const q=st.qs[st.idx];if(!q)return;
  fb.textContent=isFav(q.id)?'★ 已收藏':'☆ 收藏本题';
}

/* ================= 错题本 ================= */
PAGES.mistakeCats={title:'错题本'};
PAGES.mistakeCats.render=function(el){
  let cards='';
  allModules().forEach(m=>{
    const n=wrongCountOf(m);
    cards+='<div class="card card-sm card-tap mod-card'+(n?' ready':' disabled')+'"'
      +(n?' data-act="mc.enter" data-m="'+esc(m)+'"':'')
      +'><div><div class="m-name">'+esc(m)+'</div><div class="m-nums">错题 <b>'+n+'</b> 题</div></div>'
      +'<div class="m-right">'+(n?'›':'—')+'</div></div>';
  });
  el.innerHTML=topbarHTML('错题本')
    +'<div class="stat-strip"><div class="ss"><div class="n" style="color:var(--coral)">'+WRONG.length+'</div><div class="l">总错题</div></div></div>'
    +'<div class="row" style="margin:6px 4px 10px"><button class="btn btn-plain btn-sm" data-act="mc.list">📋 查看错题列表</button>'
    +'<span class="muted">答对 3 次自动移出</span></div>'+cards;
};
ACTIONS['mc.enter']=d=>{if(!wrongCountOf(d.m)){toast('该模块暂无错题','warn');return;}goTo('mistakePractice',{module:d.m});};
ACTIONS['mc.list']=()=>goTo('mistakeList',{});

/* ---- 错题刷题页 ---- */
PAGES.mistakePractice={title:'错题刷题'};
PAGES.mistakePractice.render=function(el,params){
  const m=params.module||'';
  const label=params.label||'错题刷题';
  if(allModules().indexOf(m)<0){
    el.innerHTML=topbarHTML('错题刷题')+'<div class="card miss-empty">参数错误</div>';return;
  }
  let qs;
  if(params.only&&params.only.length)qs=params.only.map(id=>bankQ(id)).filter(Boolean);
  else qs=shuffle(wrongQsOf(m));
  if(!qs.length){
    el.innerHTML=topbarHTML(label+' · '+esc(m))
      +'<div class="card miss-empty">该模块暂无错题<br><span class="muted">自由刷题中答错的客观题会自动进入错题本</span></div>'
      +'<div class="botbar"><div class="botbar-in"><button class="btn btn-primary btn-big" data-act="nav.back">返回错题本</button></div></div>';
    return;
  }
  MS={m,qs,idx:0,right:0,wrong:0,removed:0,locked:false,sel:new Set(),essayOpen:false,finished:false,wrongCount:qs.length,only:params.only||null};
  el.innerHTML=topbarHTML(label+' · '+esc(m))
    +'<div id="quiz-body">'+quizQHTML(MS)+mpBotHTML()+'</div>';
};
function mpBotHTML(){
  return '<div style="height:8px"></div><div class="botbar"><div class="botbar-in">'
    +'<button class="btn btn-ghost btn-sm" id="quiz-fav" data-act="quiz.fav">'+(MS&&MS.qs[MS.idx]&&isFav(MS.qs[MS.idx].id)?'★ 已收藏':'☆ 收藏本题')+'</button>'
    +'<button class="btn btn-primary btn-big" data-act="quiz.next">'+(MS.idx>=MS.qs.length-1?'查看小结':'下一题')+'</button>'
    +'</div></div>';
}
function mpNext(){
  if(!MS||MS.finished)return;
  if(MS.idx<MS.qs.length-1){
    MS.idx++;MS.locked=false;MS.sel=new Set();MS.essayOpen=false;
    const b=$id('quiz-body');if(b)b.innerHTML=quizQHTML(MS)+mpBotHTML();
  }else{
    MS.finished=true;
    const b=$id('quiz-body');
    if(b)b.innerHTML='<div class="card round-summary"><h3 style="margin:4px 0 12px">本轮小结</h3>'
      +'<div class="rs">'
      +'<div><div class="n g">'+MS.right+'</div><div class="muted">答对</div></div>'
      +'<div><div class="n r">'+MS.wrong+'</div><div class="muted">答错</div></div>'
      +'<div><div class="n t">'+MS.removed+'</div><div class="muted">自动移出</div></div>'
      +'</div></div>'
      +'<div class="botbar"><div class="botbar-in">'
      +'<button class="btn btn-plain" data-act="mp.again">再刷一遍剩余错题</button>'
      +'<button class="btn btn-primary btn-big" data-act="nav.back">返回错题本</button>'
      +'</div></div>';
  }
}
ACTIONS['mp.again']=()=>{reRender({module:curPage().params.module});};

/* ---- 错题列表页 ---- */
const WRONG_TAGS=['粗心','没记住','不会','蒙对'];
function wrongListBy(params){
  let list=(params.module?wrongListOf(params.module):WRONG.filter(w=>bankQ(w.questionId)));
  if(params.f2==='1')list=list.filter(w=>(w.wrongCount||1)>=2);
  if(params.tag)list=list.filter(w=>(w.tags||[]).indexOf(params.tag)>-1);
  return list;
}
PAGES.mistakeList={title:'错题列表'};
PAGES.mistakeList.render=function(el,params){
  let list=wrongListBy(params);
  const f2=params.f2==='1';
  const tag=params.tag||'';
  const sort=params.sort==='count'?'count':'time';
  list=list.slice().sort((a,b)=>sort==='count'?((b.wrongCount||1)-(a.wrongCount||1)):((b.lastWrongAt||0)-(a.lastWrongAt||0)));
  const tools='<div class="row" style="margin:6px 4px;flex-wrap:wrap">'
    +'<button class="btn btn-plain btn-sm" data-act="ml.sort">'+(sort==='count'?'按时间排序 ↓':'按次数排序 ↓')+'</button>'
    +'<button class="btn btn-plain btn-sm" data-act="ml.f2"'+(f2?' style="background:var(--primary);color:#fff"':'')+'>只看做错 2 次以上</button>'
    +'<button class="btn btn-primary btn-sm" data-act="ml.practiceAll">重练本列表</button>'
    +'<button class="btn btn-ghost btn-sm" data-act="ml.print">打印 / 存 PDF</button>'
    +'</div>'
    +'<div class="row" style="margin:0 4px 10px;flex-wrap:wrap;gap:6px">'
    +'<button class="flag-btn'+(tag?'':' on')+'" data-act="ml.tagFilter" data-t="">全部</button>'
    +WRONG_TAGS.map(t=>'<button class="flag-btn'+(tag===t?' on':'')+'" data-act="ml.tagFilter" data-t="'+t+'">'+t+'</button>').join('')
    +'</div>';
  if(!list.length){
    const msg=f2?'筛选后没有错题（当前筛选：做错 2 次以上）':'暂无错题<br><span class="muted">在自由刷题、错题刷题或训练中答错题目后会自动出现在这里</span>';
    el.innerHTML=topbarHTML('错题列表')+tools+'<div class="card miss-empty">'+msg+'</div>';return;
  }
  let rows='';
  list.forEach(w=>{
    const q=bankQ(w.questionId);if(!q)return;
    const brief=q.q.length>60?q.q.slice(0,60)+'…':q.q;
    rows+='<div class="card card-sm wrong-row" id="wr-'+esc(w.questionId)+'">'
      +'<div class="exam-meta" style="margin:0 0 4px">'+qChips(q)+'</div>'
      +'<div class="w-q">'+esc(brief)+'</div>'
      +'<div class="w-meta">上次答案：<b>'+esc(w.lastWrongAnswer||'未作答')+'</b> · 正确答案：<b style="color:var(--ok)">'+esc(isObjQ(q)?fmtAns(q,q.a):'见解析')+'</b>'
      +' · 连续答对 '+w.consecutiveCorrect+' / 3 · 累计答错 '+(w.wrongCount||1)+' 次</div>'
      +((w.tags&&w.tags.length)?'<div class="w-meta" style="margin-top:4px">'+w.tags.map(t=>'<span class="flag-btn on" style="padding:2px 8px;font-size:11px;margin-right:5px">'+esc(t)+'</span>').join('')+'</div>':'')
      +'<div class="w-detail" style="display:none;margin-top:8px"><div class="analysis"><span class="a-t">解析</span>'+esc(q.e||'暂无解析')+'</div></div>'
      +'<div class="row" style="margin-top:10px">'
      +'<button class="btn-link" data-act="ml.expand" data-id="'+esc(w.questionId)+'">展开解析</button>'
      +'<button class="btn-link" data-act="ml.redo" data-id="'+esc(w.questionId)+'">重做本题</button>'
      +'<button class="btn-link" data-act="ml.tag" data-id="'+esc(w.questionId)+'">错因标签</button>'
      +'<button class="btn-link" style="color:var(--err)" data-act="ml.remove" data-id="'+esc(w.questionId)+'">移出错题本</button>'
      +'</div></div>';
  });
  el.innerHTML=topbarHTML('错题列表 · 共 '+list.length+' 题')+tools+rows;
};
ACTIONS['ml.expand']=(d,t)=>{
  const card=t.closest('.wrong-row');if(!card)return;
  const det=card.querySelector('.w-detail');if(!det)return;
  const show=det.style.display==='none';
  det.style.display=show?'block':'none';
  t.textContent=show?'收起解析':'展开解析';
};
ACTIONS['ml.tagFilter']=d=>{reRender({tag:d.t||''});};
ACTIONS['ml.tag']=d=>{
  const w=WRONG.filter(x=>x.questionId===d.id)[0];if(!w)return;
  w.tags=Array.isArray(w.tags)?w.tags:[];
  const btns=WRONG_TAGS.map(t=>'<button class="flag-btn'+(w.tags.indexOf(t)>-1?' on':'')+'" data-act="ml.tagToggle" data-id="'+esc(d.id)+'" data-t="'+t+'">'+t+'</button>').join('');
  $id('modal-root').innerHTML='<div class="mask" data-act="modal.mask"><div class="modal" data-stop="1">'
    +'<h3>这道题错在哪</h3>'
    +'<div class="muted" style="font-size:12px;margin-top:2px">可多选，方便以后按错因集中复习。</div>'
    +'<div class="flag-row" style="margin-top:12px">'+btns+'</div>'
    +'<div class="m-btns"><button class="btn btn-plain" data-act="modal.cancel">完成</button></div>'
    +'</div></div>';
  modalOpen=true;
};
ACTIONS['ml.tagToggle']=d=>{
  const w=WRONG.filter(x=>x.questionId===d.id)[0];if(!w)return;
  w.tags=Array.isArray(w.tags)?w.tags:[];
  const i=w.tags.indexOf(d.t);
  if(i>-1)w.tags.splice(i,1);else w.tags.push(d.t);
  saveWrong();
  ACTIONS['ml.tag']({id:d.id});
};
ACTIONS['ml.print']=()=>{
  const c=curPage();
  const list=wrongListBy(c.params);
  if(!list.length){toast('没有可打印的错题','warn');return;}
  let h='<h2>错题本 · '+esc(c.params.module||'全部')+' · '+list.length+' 题</h2>'
    +'<div class="pr-sub">导出于 '+new Date().toLocaleString('zh-CN')+'</div>';
  list.forEach((w,i)=>{
    const q=bankQ(w.questionId);if(!q)return;
    h+='<div class="pr-q"><b>'+(i+1)+'. '+esc(q.q)+'</b>';
    if(q.mat)h+='<div class="pr-o">材料：'+esc(q.mat)+'</div>';
    if(q.img)h+='<div class="pr-o"><img src="'+q.img+'" style="max-width:60%;border:1px solid #ccc"></div>';
    if(q.o&&q.o.length)h+='<div class="pr-o">'+q.o.map((o,k)=>letters()[k]+'. '+esc(o)).join('<br>')+'</div>';
    h+='<div class="pr-a">正确答案：'+esc(isObjQ(q)?fmtAns(q,q.a):'见解析')+'　｜　我上次选：'+esc(w.lastWrongAnswer||'未作答')+'</div>';
    if(q.e)h+='<div class="pr-a">解析：'+esc(q.e)+'</div>';
    h+='</div>';
  });
  let root=$id('print-root');
  if(!root){root=document.createElement('div');root.id='print-root';document.body.appendChild(root);}
  root.innerHTML=h;
  setTimeout(()=>{window.print();},80);
};
ACTIONS['ml.redo']=d=>{
  const q=bankQ(d.id);if(!q)return;
  goTo('mistakePractice',{module:q.module,only:[q.id]});
};
ACTIONS['ml.remove']=d=>{
  removeWrong(d.id);
  toast('已移出错题本','ok');
  reRender();
};
ACTIONS['ml.sort']=()=>{const c=curPage();reRender({sort:(c.params.sort==='count')?'time':'count'});};
ACTIONS['ml.f2']=()=>{const c=curPage();reRender({f2:(c.params.f2==='1')?'':'1'});};
ACTIONS['ml.practiceAll']=()=>{
  let list=WRONG.filter(w=>bankQ(w.questionId));
  const c=curPage();
  if(c.params.f2==='1')list=list.filter(w=>(w.wrongCount||1)>=2);
  if(c.params.sort==='count')list=list.slice().sort((a,b)=>(b.wrongCount||1)-(a.wrongCount||1));
  else list=list.slice().sort((a,b)=>(b.lastWrongAt||0)-(a.lastWrongAt||0));
  if(!list.length){toast('没有可重练的错题','warn');return;}
  const ids=list.map(w=>w.questionId).slice(0,80);
  const q0=bankQ(ids[0]);
  goTo('mistakePractice',{module:q0?q0.module:'常识判断',only:ids,label:'错题重练'});
};

/* ---- 收藏夹 ---- */
PAGES.favs={title:'收藏夹'};
PAGES.favs.render=function(el){
  const list=FAV.map(id=>bankQ(id)).filter(Boolean);
  if(!list.length){
    el.innerHTML=topbarHTML('收藏夹')
      +'<div class="card miss-empty">收藏夹还是空的<br><span class="muted">在自由刷题、错题本或题目详情页点「☆ 收藏本题」，把重点题加进来集中练习</span></div>'
      +'<div class="botbar"><div class="botbar-in"><button class="btn btn-primary btn-big" data-act="nav.home">返回首页</button></div></div>';
    return;
  }
  let rows='';
  list.forEach(q=>{
    const brief=q.q.length>60?q.q.slice(0,60)+'…':q.q;
    rows+='<div class="card card-sm fav-row" id="fv-'+esc(q.id)+'">'
      +'<div class="exam-meta" style="margin:0 0 4px">'+qChips(q)+'</div>'
      +'<div class="w-q">'+esc(brief)+'</div>'
      +'<div class="w-detail" style="display:none;margin-top:8px"><div class="analysis"><span class="a-t">解析</span>'+esc(q.e||'暂无解析')+'</div></div>'
      +'<div class="row" style="margin-top:10px;flex-wrap:wrap">'
      +'<button class="btn-link" data-act="fv.expand" data-id="'+esc(q.id)+'">展开解析</button>'
      +'<button class="btn-link" data-act="fv.redo" data-id="'+esc(q.id)+'">练习本题</button>'
      +'<button class="btn-link" style="color:var(--err)" data-act="fv.remove" data-id="'+esc(q.id)+'">取消收藏</button>'
      +'</div></div>';
  });
  el.innerHTML=topbarHTML('收藏夹 · 共 '+list.length+' 题')
    +'<div class="row" style="margin:6px 4px 10px"><button class="btn btn-primary btn-sm" data-act="fv.practiceAll">▶ 连续练习收藏题（最多 80 题）</button></div>'
    +rows;
};
ACTIONS['fv.expand']=(d,t)=>{
  const card=t.closest('.fav-row');if(!card)return;
  const det=card.querySelector('.w-detail');if(!det)return;
  const show=det.style.display==='none';
  det.style.display=show?'block':'none';
  t.textContent=show?'收起解析':'展开解析';
};
ACTIONS['fv.redo']=d=>{
  const q=bankQ(d.id);if(!q)return;
  goTo('mistakePractice',{module:q.module,only:[q.id],label:'收藏题练习'});
};
ACTIONS['fv.remove']=d=>{toggleFav(d.id);toast('已取消收藏','ok');reRender();};
ACTIONS['fv.practiceAll']=()=>{
  const qs=favQsOf('');
  if(!qs.length){toast('收藏夹是空的','warn');return;}
  const ids=qs.map(q=>q.id).slice(0,80);
  const q0=bankQ(ids[0]);
  goTo('mistakePractice',{module:q0?q0.module:'常识判断',only:ids,label:'收藏题练习'});
};
