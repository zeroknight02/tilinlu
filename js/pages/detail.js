/* 题灵录 · pages/detail */
/* ================= 独立题目详情页 ================= */
PAGES.questionDetail={title:'题目详情'};
PAGES.questionDetail.render=function(el,params){
  const S=SESSIONS[params.sessionId];
  if(S&&!S.correct)S.correct={};   /* 未交卷的会话没有 correct，兜底避免详情页崩 */
  const qi=S?S.questionIds.indexOf(params.questionId):-1;
  if(!S||qi<0){
    el.innerHTML=topbarHTML('题目详情')
      +'<div class="card miss-empty">该题数据已不存在</div>'
      +(S?'<div class="card card-sm"><div class="muted" style="margin-bottom:2px">全部题目（点击题号切换）</div><div class="qgrid">'+detailNavHTML(S)+'</div></div>':'')
      +'<div class="botbar"><div class="botbar-in">'
      +'<button class="btn btn-plain" id="qd-prev" disabled>上一题</button>'
      +'<button class="btn btn-primary btn-big" id="qd-next" disabled>下一题</button>'
      +'</div></div>';
    return;
  }
  const q=bankQ(params.questionId);
  const prevOk=qi>0,nextOk=qi<S.questionIds.length-1;
  let bodyHTML='';
  if(!q){
    bodyHTML='<div class="card miss-empty">该题数据已不存在<br><span class="muted">题目可能已被题库覆盖或删除</span></div>';
  }else{
    const ans=S.answers[q.id];
    const obj=isObjQ(q);   /* 填空也是自动判分的客观题 */
    const c=obj?S.correct[q.id]:undefined;
    let tag;
    if(!obj){
      const c2=S.correct[q.id];
      if(c2===true)tag='<span class="chip" style="background:var(--ok-bg);color:var(--ok)">答对</span>';
      else if(c2===false)tag='<span class="chip c-wrong">答错</span>';
      else tag='<span class="chip c-type-essay">主观题</span>';
    }
    else if(c===true)tag='<span class="chip" style="background:var(--ok-bg);color:var(--ok)">答对</span>';
    else if(c===false)tag='<span class="chip c-wrong">答错</span>';
    else tag='<span class="chip c-sub">未作答</span>';
    let h='<div class="q-count">第 <b>'+(qi+1)+'</b> / '+S.questionIds.length+' 题</div>';
    h+='<div class="exam-meta">'+qChips(q)+tag+'<span class="chip'+(isFav(q.id)?' c-fav':'')+'" style="cursor:pointer" data-act="qd.fav">'+(isFav(q.id)?'★ 已收藏':'☆ 收藏')+'</span></div>';
    h+='<div class="card"><div class="q-text">'+qTextHTML(q)+'</div>'+qExtrasHTML(q);
    if(q.o.length){
      h+='<div class="opts" style="margin-top:12px">';
      /* 用 optOrder 保持和刷题/考试页一致的顺序，否则开了「选项打乱」后对不上 */
      optOrder(q).forEach((i,disp)=>{
        const t=q.o[i];
        const inAns=Array.isArray(q.a)?q.a.includes(i):(q.a===i);
        const picked=q.type==='multiple'?(Array.isArray(ans)&&ans.includes(i)):(ans===i);
        let cls='',mine='';
        if(picked&&inAns){cls='ok';mine='<span class="tag-mine">我的选择</span>';}
        else if(picked){cls='err';mine='<span class="tag-mine">我的选择</span>';}
        else if(inAns)cls='ans-outline';
        h+='<div class="opt static '+cls+'"><div class="opt-badge">'+letters()[disp]+'</div><div style="flex:1">'+esc(t)+'</div>'+mine+'</div>';
      });
      h+='</div>';
    }
    h+='</div>';
    const myAns=fmtAns(q,ans);
    const myCls=obj?(c===true?'da-ok':(c===false?'da-err':'da-un')):'da-un';
    h+='<div class="card card-sm">'
      +'<div class="detail-ans-line">我选的答案：<b class="'+myCls+'">'+esc(myAns)+'</b></div>'
      +'<div class="detail-ans-line">正确答案：<b class="da-ok">'+esc(isObjQ(q)?fmtAns(q,q.a):'见解析')+'</b></div>'
      +'<div class="detail-ans-line">本题分值：<b>'+qPoints(q,S.exam,S.level)+' 分</b></div></div>';
    /* 作答记录：这题做过几次、每次对错 */
    const hist=qHistory(q.id);
    if(hist.length){
      const items=hist.slice(-10).reverse().map(x=>{
        const d=new Date(x.t);
        const k=(d.getMonth()+1)+'-'+String(d.getDate()).padStart(2,'0')
          +' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
        const cls=x.c===1?'h-ok':(x.c===0?'h-err':'h-na');
        return '<span class="hist-item '+cls+'">'+k+' '+(x.c===1?'✓':(x.c===0?'✗':'—'))+'</span>';
      }).join('');
      h+='<div class="card card-sm"><div class="row"><b style="flex:1;font-size:14px">作答记录</b>'
        +'<span class="muted">共 '+hist.length+' 次</span></div>'
        +'<div class="hist-wrap">'+items+'</div></div>';
    }
    h+='<div class="analysis"><span class="a-t">解析</span>'+esc(q.e||'暂无解析')+eImgsHTML(q)+'</div>';
    if(q.aiChat)h+='<div class="analysis" style="margin-top:8px"><span class="a-t">AI 追问记录</span>'+esc(q.aiChat)+'</div>';
    h+='<div class="card card-sm" style="margin-top:10px">'
      +'<div class="row" style="margin:0"><button class="btn btn-plain btn-sm" data-act="qd.aiGen">🤖 '+(q.e?'AI 重写解析':'AI 生成解析')+'</button>'
      +'<span class="muted" style="font-size:12px">需先在「导入题库 → AI 解析」配置接口</span></div>'
      +'<div class="row" style="margin:8px 0 0"><input id="qd-ask" placeholder="向 AI 追问本题，如：为什么选B？" style="flex:1;min-width:0">'
      +'<button class="btn btn-primary btn-sm" data-act="qd.aiAsk">追问</button></div>'
      +'<div class="ai-status" id="qd-ai-status"></div></div>';
    const w=wrongEntry(q.id);
    if(w)h+='<div style="margin-top:8px"><span class="chip c-wrong">已加入错题本</span><span class="chip c-sub">连续答对 '+w.consecutiveCorrect+' / 3 次</span></div>';
    bodyHTML=h;
  }
  bodyHTML+='<div class="card card-sm"><div class="muted" style="margin-bottom:2px">全部题目（点击题号切换）</div><div class="qgrid">'+detailNavHTML(S)+'</div></div>';
  el.innerHTML=topbarHTML('题目详情')
    +bodyHTML
    +'<div class="botbar"><div class="botbar-in">'
    +'<button class="btn btn-ghost btn-sm" data-act="qd.edit">编辑</button>'
    +'<button class="btn btn-plain" id="qd-prev" data-act="qd.prev"'+(prevOk?'':' disabled')+'>上一题</button>'
    +'<button class="btn btn-primary btn-big" id="qd-next" data-act="qd.next"'+(nextOk?'':' disabled')+'>下一题</button>'
    +'</div></div>';
};
function qdMove(delta){
  const c=curPage();const S=SESSIONS[c.params.sessionId];if(!S)return;
  const qi=S.questionIds.indexOf(c.params.questionId);
  const ni=qi+delta;
  if(ni<0||ni>=S.questionIds.length)return;
  S.viewIdx=ni;
  reRender({questionId:S.questionIds[ni]});
}
ACTIONS['qd.prev']=()=>qdMove(-1);
ACTIONS['qd.next']=()=>qdMove(1);
ACTIONS['qd.jump']=d=>{const c=curPage();const S=SESSIONS[c.params.sessionId];if(!S)return;const i=parseInt(d.i,10);if(isNaN(i)||i<0||i>=S.questionIds.length)return;S.viewIdx=i;reRender({questionId:S.questionIds[i]});};
ACTIONS['qd.fav']=()=>{
  const c=curPage();const q=bankQ(c.params.questionId);if(!q)return;
  const on=toggleFav(q.id);
  toast(on?'已加入收藏夹':'已取消收藏','ok');
  reRender();
};
function qdAiCfg(){const c=lsJson(K.ai,{});return(c.url&&c.model&&c.key)?c:null;}
function aiChatFetch(cfg,prompt,signal){
  return fetch(cfg.url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.key},
    body:JSON.stringify({model:cfg.model,messages:[{role:'user',content:prompt}],temperature:0.3}),signal})
    .then(r=>{if(!r.ok)return r.text().then(t=>{throw new Error('HTTP '+r.status+(t?' '+t.slice(0,140):''));});return r.json();})
    .then(j=>{const c2=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;if(!c2)throw new Error('返回缺少 choices[0].message.content');return c2;});
}
function qdQuestionBrief(q){
  return '题型：'+(TYPE_NAMES[q.type]||q.type)+'\n题目：'+q.q+'\n'+(q.o.length?'选项：\n'+q.o.map((o,i)=>letters()[i]+'. '+o).join('\n')+'\n':'')+'正确答案：'+fmtAns(q,q.a);
}
ACTIONS['qd.aiGen']=async()=>{
  const cfg=qdAiCfg();
  if(!cfg){toast('请先在「导入题库 → AI 解析」中配置 API 地址/模型/Key','warn');return;}
  const c=curPage();const q=bankQ(c.params.questionId);if(!q)return;
  const st0=$id('qd-ai-status');if(st0)st0.textContent='AI 正在生成解析…（最多 60 秒）';
  const ab=new AbortController();const to=setTimeout(()=>ab.abort(),60000);
  try{
    const out=await aiChatFetch(cfg,'请为下面这道题写一段简洁的中文解析（120 字以内）：直接讲正确答案的依据，并指出主要干扰项错在哪里。不要分点编号，不要输出 JSON。\n'+qdQuestionBrief(q)+(q.e?'\n参考（可能不完整的）解析：'+q.e:''),ab.signal);
    clearTimeout(to);
    q.e=String(out).trim().slice(0,1200);
    saveBank();
    toast('解析已更新','ok');
    reRender();
  }catch(e){
    clearTimeout(to);
    const st=$id('qd-ai-status');if(st)st.textContent=(e&&e.name==='AbortError')?'生成超时（60 秒），可重试。':'生成失败：'+(e&&e.message?e.message:'未知错误');
  }
};
ACTIONS['qd.aiAsk']=async()=>{
  const cfg=qdAiCfg();
  if(!cfg){toast('请先在「导入题库 → AI 解析」中配置 API 地址/模型/Key','warn');return;}
  const inp=$id('qd-ask');const text=((inp&&inp.value)||'').trim();
  if(!text){toast('请先输入追问内容','warn');return;}
  const c=curPage();const q=bankQ(c.params.questionId);if(!q)return;
  const st0=$id('qd-ai-status');if(st0)st0.textContent='AI 思考中…（最多 60 秒）';
  const ab=new AbortController();const to=setTimeout(()=>ab.abort(),60000);
  try{
    const out=await aiChatFetch(cfg,'以下是一道题目与参考解析。请用中文简洁回答用户的追问（200 字以内）。\n'+qdQuestionBrief(q)+'\n解析：'+(q.e||'无')+(q.aiChat?'\n之前的追问记录：\n'+q.aiChat:'')+'\n用户追问：'+text,ab.signal);
    clearTimeout(to);
    q.aiChat=((q.aiChat?q.aiChat+'\n':'')+'问：'+text+'\n答：'+String(out).trim()).slice(-3000);
    saveBank();
    reRender();
  }catch(e){
    clearTimeout(to);
    const st=$id('qd-ai-status');if(st)st.textContent=(e&&e.name==='AbortError')?'超时（60 秒），可重试。':'追问失败：'+(e&&e.message?e.message:'未知错误');
  }
};
function detailNavHTML(S){
  let h='';
  const qn=(id,i)=>{const c=S.correct[id];return '<div class="qn'+(c===true?' ok':(c===false?' err':' un'))+((S.viewIdx===i)?' cur':'')+'" data-act="qd.jump" data-i="'+i+'">'+(i+1)+'</div>';};
  if(S.type==='auto'&&S.modulesOrder&&S.modulesOrder.length>=1){
    let lastMod=null;
    S.questionIds.forEach((id,i)=>{const q=bankQ(id);const mod=q?q.module:'';if(mod!==lastMod){h+='<div class="qg-head">'+esc(mod)+'</div>';lastMod=mod;}h+=qn(id,i);});
  }else{
    S.questionIds.forEach((id,i)=>{h+=qn(id,i);});
  }
  return h;
}

/* 从详情页进编辑：改完 goBack 回到原详情 */
ACTIONS['qd.edit']=()=>{
  const p=curPage();
  if(!p||!p.params||!p.params.questionId){toast('没有题目','warn');return;}
  QE=null;
  goTo('qEdit',{id:p.params.questionId});
};
