/* 题灵录 · pages/misc */
/* ================= 关于 / 版本 ================= */
function verCacheNum(){
  return new Promise(res=>{
    if(!('caches' in window))return res(null);
    caches.keys().then(ks=>{
      const nums=ks.map(k=>{const m=/qt-shell-v(\d+)/.exec(k);return m?parseInt(m[1],10):null;}).filter(n=>n!=null);
      res(nums.length?Math.max.apply(null,nums):null);
    }).catch(()=>res(null));
  });
}
function verServer(){
  return new Promise(res=>{
    if(location.protocol==='file:')return res(null);
    /* 版本号在 js/store.js 里（拆分后就不在 index.html 了），
       这里必须读它，否则永远读不到服务器版本，「检查更新」等于失效 */
    fetch('js/store.js?_='+Date.now(),{cache:'no-store'}).then(r=>{
      if(!r.ok)return res(null);
      return r.text().then(t=>{
        const b=/APP_BUILD\s*=\s*(\d+)/.exec(t);
        const v=/APP_VER\s*=\s*'([^']+)'/.exec(t);
        res({build:b?parseInt(b[1],10):null,ver:v?v[1]:null});
      });
    }).catch(()=>res(null));
  });
}
function paintVers(cacheNum,srv){
  const c=$id('v-cache'),v=$id('v-server');
  if(c){
    c.textContent=cacheNum!=null?('v'+cacheNum):'—';
    c.className='vv'+(cacheNum==null?' dim':(cacheNum<APP_BUILD?' warn':''));
  }
  if(v){
    if(srv&&srv.build!=null){
      v.textContent=srv.ver||('v'+srv.build);
      v.className='vv'+(srv.build>APP_BUILD?' warn':'');
    }else{
      v.textContent='—';v.className='vv dim';
    }
  }
}
async function fillVers(){
  const n=await verCacheNum();
  const sv=await verServer();
  paintVers(n,sv);
}
async function forceUpdate(){
  try{
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
    if('caches' in window){
      const ks=await caches.keys();
      await Promise.all(ks.map(k=>caches.delete(k)));
    }
  }catch(e){}
  try{location.replace(location.pathname+'?_='+Date.now());}catch(e){location.reload();}
}
/* ---- 存储占用 ---- */
let QUOTA=5*1024*1024;   // 实际配额：IndexedDB 由浏览器按磁盘给，localStorage 固定 5 MB
function fmtBytes(n){
  if(!n)return '0 B';
  if(n<1024)return n+' B';
  if(n<1048576)return (n/1024).toFixed(n<10240?1:0)+' KB';
  if(n<1073741824)return (n/1048576).toFixed(2)+' MB';
  return (n/1073741824).toFixed(2)+' GB';
}
function fmtCount(n){
  if(n>=10000)return (Math.round(n/10000)).toLocaleString('en-US')+' 万';
  return n.toLocaleString('en-US');
}
function usedBytes(){
  let n=0;
  lsKeys().forEach(k=>{n+=(k.length+(lsGet(k)||'').length)*2;});   // UTF-16，一个字符 2 字节
  return n;
}
async function refreshQuota(){
  try{
    if(USE_IDB&&navigator.storage&&navigator.storage.estimate){
      const est=await navigator.storage.estimate();
      if(est&&est.quota)QUOTA=est.quota;
      else QUOTA=5*1024*1024;
    }else QUOTA=5*1024*1024;
  }catch(e){QUOTA=5*1024*1024;}
}
async function fillStorage(){
  await refreshQuota();          // 先拿到真实配额，题量上限才准
  const used=usedBytes();
  const qv=lsGet(K.bank)||'';
  const qBytes=(K.bank.length+qv.length)*2;
  const n=BANK.length;
  const avg=n>0?qBytes/n:400;   // 无题时按每条约 400 字节估个上限
  const cap=Math.floor(QUOTA*0.9/avg/100)*100;
  const pct=QUOTA>0?used/QUOTA*100:0;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('st-used',fmtBytes(used));
  set('st-quota',' / '+fmtBytes(QUOTA));
  set('st-pct','（'+(pct<0.1?'＜0.1':pct.toFixed(1))+'%）');
  set('st-cnt',n+' 条');
  set('st-cap',' / 约 '+fmtCount(cap)+' 条');
  const bar=document.getElementById('st-bar');
  if(bar)bar.style.width=Math.min(100,Math.max(pct,used>0?3.2:0))+'%';
  const mode=document.getElementById('st-mode');
  if(mode){
    mode.textContent=USE_IDB?'IndexedDB':'localStorage（降级模式）';
    mode.style.color=USE_IDB?'':'var(--warn)';
  }
}
PAGES.about={title:'关于'};
PAGES.about.render=function(el){
  const snap=lsJson(K.snapshot,null);
  let snapHTML='';
  if(snap&&snap.data){
    const d=new Date(snap.at);
    const when=(d.getMonth()+1)+'月'+d.getDate()+'日 '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
    snapHTML='<div class="row" style="margin-top:10px;justify-content:space-between;flex-wrap:nowrap">'
      +'<span class="snap-meta">'+when+' · '+esc(snap.tag||'更新前')+'</span>'
      +'<button class="btn btn-ghost btn-sm" data-act="data.restore">恢复</button></div>';
  }else{
    snapHTML='<div class="about-hint" style="opacity:.7">暂无快照（首次安装，或还没更新过）</div>';
  }
  el.innerHTML=topbarHTML('关于')
    +'<div class="card">'
    +'<div class="about-label">当前版本</div>'
    +'<div class="ver-row">'
    +'<div class="ver-line">'
    +'<span class="vl">页面</span><span class="vv">'+APP_VER+'</span><span class="vs">·</span>'
    +'<span class="vl">缓存</span><span class="vv dim" id="v-cache">—</span><span class="vs">·</span>'
    +'<span class="vl">服务器</span><span class="vv dim" id="v-server">—</span>'
    +'</div>'
    +'<button class="btn btn-plain btn-sm" data-act="about.check" id="btn-check">检查更新</button>'
    +'</div></div>'
    +'<div class="card"><b style="font-size:15px">看不到更新时</b>'
    +'<div class="about-hint">点「检查更新」；仍然不行就删掉主屏幕图标，用 Safari 重新打开一次再添加。</div></div>'
    +'<div class="card"><b style="font-size:15px">本机数据</b>'
    +'<div class="about-hint">题库 '+BANK.length+' 道 · 错题 '+WRONG.length+' 条 · 收藏 '+FAV.length+' 条 · 练习记录 '+RECS.length+' 次</div>'
    +'<div class="row" style="margin-top:10px">'
    +'<button class="btn btn-ghost btn-sm" data-act="backup.export">导出备份</button>'
    +'<button class="btn btn-ghost btn-sm" data-act="backup.importPick">导入备份</button></div></div>'
    +'<div class="card"><b style="font-size:15px">阅读与答题</b>'
    +'<div class="st-row"><span class="st-k">正文字号</span><span class="st-v"><span class="fs-seg">'
    +['sm','md','lg'].map((v,i)=>'<button class="fs-b'+(FONT_SIZE===v?' on':'')+'" data-act="set.font" data-v="'+v+'">'+['小','中','大'][i]+'</button>').join('')
    +'</span></span></div>'
    +'<div class="st-row"><span class="st-k">选项打乱</span><span class="st-v"><button class="fs-b'+(optShuffleOn()?' on':'')+'" data-act="set.shuffle">'+(optShuffleOn()?'已开启':'已关闭')+'</button></span></div>'
    +'<div class="about-hint" style="opacity:.72">字号影响题干与选项；选项打乱只改显示顺序，判分与解析仍按原顺序。</div>'
    +'</div>'
    +'<div class="card"><b style="font-size:15px">存储占用</b>'
    +'<div class="st-row"><span class="st-k">空间</span>'
    +'<span class="st-v"><b id="st-used">—</b><i id="st-quota"></i><em id="st-pct"></em></span></div>'
    +'<div class="st-bar"><i id="st-bar"></i></div>'
    +'<div class="st-row"><span class="st-k">题量</span>'
    +'<span class="st-v"><b id="st-cnt">—</b><i id="st-cap"></i></span></div>'
    +'<div class="st-row"><span class="st-k">位置</span>'
    +'<span class="st-v"><b id="st-mode" style="font-size:12.5px;font-weight:700">—</b></span></div>'
    +'<div class="about-hint" style="opacity:.72">上行为已用 / 本机配额，下行为已用 / 估算上限；记录增多会略微降低可存题量。</div>'
    +'</div>'
    +'<div class="card"><b style="font-size:15px">数据保护</b>'
    +'<div class="about-hint">更新只替换程序文件，不会动题库、进度、错题与收藏。每次版本变更会自动留一份更新前快照，可随时恢复。</div>'
    +snapHTML+'</div>'
    +'<div class="about-foot">'+APP_VER+'（'+APP_DATE+'） · 数据仅保存在本机</div>';
  fillVers();
  fillStorage();
};
ACTIONS['data.restore']=()=>{
  const snap=lsJson(K.snapshot,null);
  if(!snap||!snap.data){toast('没有可恢复的快照','warn');return;}
  const d=new Date(snap.at);
  const when=(d.getMonth()+1)+'月'+d.getDate()+'日 '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  qtConfirm({title:'恢复更新前数据',
    msg:'快照时间：'+when+'（'+(snap.tag||'更新前')+'）。\n恢复会用这份快照覆盖当前题库、进度、错题、收藏与练习记录。',
    okText:'恢复',danger:true,
    onOk:()=>{
      Object.keys(snap.data).forEach(k=>{if(k.indexOf('qt_')===0)lsSet(k,snap.data[k]);});
      loadAllData();
      resetRuntime();
      render();
      toast('已恢复到 '+when+' 的数据','ok');
    }});
};
ACTIONS['set.font']=d=>{
  FONT_SIZE=d.v||'md';lsSet(K.fontSize,FONT_SIZE);applyFont();render();
};
ACTIONS['set.shuffle']=()=>{
  const on=optShuffleOn();lsSet(K.optShuffle,on?'0':'1');render();
  toast(on?'选项打乱已关闭':'选项打乱已开启','ok');
};
ACTIONS['about.check']=async()=>{
  const btn=$id('btn-check');
  if(btn){btn.disabled=true;btn.textContent='检查中…';}
  try{
    const cacheNum=await verCacheNum();
    const srv=await verServer();
    paintVers(cacheNum,srv);
    if(!srv){
      toast('连不上服务器（本地文件或离线状态）','warn');
    }else if(srv.build!=null&&srv.build>APP_BUILD){
      toast('服务器已是 v'+srv.build,'ok');
      qtConfirm({title:'发现新版本',msg:'服务器上是更新的一版（'+(srv.ver||('v'+srv.build))+'）。立即更新会重新下载页面并清空旧缓存，题库、进度、错题都不受影响。',okText:'立即更新',onOk:()=>forceUpdate()});
    }else if(cacheNum!=null&&cacheNum<APP_BUILD){
      toast('缓存是旧的，建议清理后重载','warn');
      qtConfirm({title:'缓存落后',msg:'页面已是 '+APP_VER+'，但缓存还停在 v'+cacheNum+'。清掉缓存并重载可换到最新页面。',okText:'清理并重载',onOk:()=>forceUpdate()});
    }else{
      toast('已是最新版本','ok');
    }
  }catch(e){
    toast('检查失败，请稍后再试','err');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='检查更新';}
  }
};

/* ================= 同步设置 ================= */
PAGES.sync={title:'同步设置'};
PAGES.sync.render=function(el){
  const saved=lsGet(K.cloudUrl)||'';
  const last=parseInt(lsGet(K.cloudTime)||'0',10);
  el.innerHTML=topbarHTML('同步设置')
    +'<div class="card">'
    +'<label class="fl">题库地址（JSON）</label>'
    +'<input id="sync-url" value="'+esc(saved||CLOUD_DEFAULT)+'" placeholder="'+esc(CLOUD_DEFAULT)+'">'
    +'<div class="row" style="margin-top:12px">'
    +'<button class="btn btn-plain" data-act="sync.test">测试连接</button>'
    +'<button class="btn btn-primary" data-act="sync.save">保存设置</button></div>'
    +'<div class="row" style="margin-top:10px">'
    +'<button class="btn btn-ghost btn-sm" data-act="sync.pull">立即从远端同步（会替换本地题库）</button></div>'
    +'<div class="file-note">保存地址后：<b>本地题库为空时</b>会自动拉取一次（换新设备很方便）；'
    +'本地已有题库则不再自动覆盖，需要时点上面的「立即同步」。'
    +'题目上的笔记、标记、材料都存在本地题目里，远端替换会一并替换掉，请谨慎使用。'
    +(last?('上次成功同步：'+new Date(last).toLocaleString()):'尚未同步过。')+'</div>'
    +'</div>';
};
ACTIONS['sync.test']=async()=>{
  const url=($id('sync-url').value||'').trim();
  if(!url){toast('请输入题库地址','warn');return;}
  toast('正在测试连接…');
  try{
    const r=await fetchCloud(url,8000);
    const n=Array.isArray(r)?r.length:(r.questions?r.questions.length:0);
    toast('连接成功，远端题库 '+n+' 道','ok');
  }catch(e){toast('连接失败：'+(e.message||e),'err');}
};
ACTIONS['sync.save']=()=>{
  const url=($id('sync-url').value||'').trim();
  if(url&&url!==CLOUD_DEFAULT)lsSet(K.cloudUrl,url);else lsDel(K.cloudUrl);
  toast('同步设置已保存','ok');
};
ACTIONS['sync.pull']=()=>{
  const inp=$id('sync-url');
  const url=(lsGet(K.cloudUrl)||(inp&&inp.value)||'').trim();
  if(!url){toast('请先填写题库地址','warn');return;}
  qtConfirm({title:'从远端同步',
    msg:'将用远端题库替换本地题库（本地现有 '+BANK.length+' 道）。\n题目上的笔记、颜色标记、材料会一并被替换。确定同步？',
    okText:'同步',danger:true,
    onOk:async()=>{
      toast('正在同步…');
      try{
        const j=await fetchCloud(url,15000);
        applyCloudData(j);
        loadWrong();loadFav();
        toast('已同步，共 '+BANK.length+' 道','ok');
        render();
      }catch(e){toast('同步失败：'+(e.message||e),'err');}
    }});
};
async function fetchCloud(url,timeout){
  const c=new AbortController();
  const to=setTimeout(()=>c.abort(),timeout||10000);
  try{
    const r=await fetch(url,{signal:c.signal});
    if(!r.ok)throw new Error('HTTP '+r.status);
    return await r.json();
  }finally{clearTimeout(to);}
}
function applyCloudData(j){
  const qs=Array.isArray(j)?j:(j.questions||[]);
  if(!Array.isArray(qs)||!qs.length)throw new Error('远端数据中没有题目');
  BANK=qs.map(q=>normQuestion(q,0));
  PAPERS=Array.isArray(j.papers)?j.papers:[];
  saveBank();
  lsSet(K.cloudTime,String(Date.now()));
  lsSet(K.cloudCache,JSON.stringify(j));
}
function initCloudSync(){
  const url=lsGet(K.cloudUrl);
  if(!url)return;
  /* 本地已有题库就绝不自动替换：远端是整份覆盖，而笔记/标记/材料都挂在题目对象上，
     自动覆盖等于把它们抹掉（连不上时用旧缓存覆盖更糟）。只有新设备才自动拉一次。 */
  if(BANK.length)return;
  fetchCloud(url).then(j=>{
    applyCloudData(j);render();
  }).catch(()=>{
    if(BANK.length)return;
    const cache=lsJson(K.cloudCache,null);
    if(cache){
      try{applyCloudData(cache);render();}catch(e){}
    }
    showBanner('当前使用缓存题库（点击关闭）');
  });
}

/* ================= 学习报告 ================= */
PAGES.report={title:'学习报告'};
PAGES.report.render=function(el){
  const t=totalsStat(),streak=answerStreak();
  const days=[],map={};
  for(let i=6;i>=0;i--){
    const d=new Date(Date.now()-i*86400000);
    const o={k:learnKey(d),n:0,label:d.getDate()};
    days.push(o);map[o.k]=o;
  }
  Object.keys(STATS.ans).forEach(id=>{
    const a=STATS.ans[id];if(!a||!a.t)return;
    const k=learnKey(new Date(a.t));if(map[k])map[k].n++;
  });
  const maxN=Math.max(1,days[0].n,days[1].n,days[2].n,days[3].n,days[4].n,days[5].n,days[6].n);
  const bars=days.map((x,i)=>'<div class="rp-day"><i style="height:'+Math.max(3,Math.round(x.n*100/maxN))+'%" title="'+x.k+'　'+x.n+' 题"></i><span>'+(i===6?'今':x.label)+'</span></div>').join('');
  const mod={};
  Object.keys(STATS.ans).forEach(id=>{
    const a=STATS.ans[id];if(!a)return;
    const m=a.m||'未分类';
    if(!mod[m])mod[m]={n:0,c:0,w:0};
    mod[m].n++;if(a.c===1)mod[m].c++;else if(a.c===0)mod[m].w++;
  });
  const rows=Object.keys(mod).map(m=>{
    const o=mod[m],obj=o.c+o.w;
    return{m:m,n:o.n,obj:obj,acc:obj?Math.round(o.c*100/obj):null};
  }).filter(x=>x.obj>0).sort((a,b)=>a.acc-b.acc);
  const rowHTML=rows.map(r=>'<div class="rp-row"><span class="rp-m">'+esc(r.m)+'</span>'
    +'<span class="rp-bar"><i style="width:'+r.acc+'%"></i></span>'
    +'<span class="rp-acc">'+r.acc+'%</span></div>').join('');
  const cnt={};
  Object.keys(STATS.ans).forEach(id=>{
    const a=STATS.ans[id];if(!a||!a.t)return;
    const k=learnKey(new Date(a.t));cnt[k]=(cnt[k]||0)+1;
  });
  const hm=[];const now2=new Date();
  for(let i=29;i>=0;i--){
    const d=new Date(now2.getTime()-i*86400000),k=learnKey(d),n=cnt[k]||0;
    const lv=n===0?0:(n<10?1:(n<30?2:3));
    hm.push('<i class="l'+lv+'" title="'+k+'　'+n+' 题"></i>');
  }
  const weak=rows.filter(r=>r.obj>=5).slice(0,3);
  const tip=weak.length?('最需要补：'+weak.map(r=>esc(r.m)+'（'+r.acc+'%，'+r.obj+' 题）').join('、')):'多刷一些题，报告会更有参考价值。';
  el.innerHTML=topbarHTML('学习报告')
    +'<div class="rp-hero">'
    +'<div class="rp-cell"><b>'+t.done+'</b><span>累计做题</span></div>'
    +'<div class="rp-cell"><b>'+t.acc+'</b><span>总正确率</span></div>'
    +'<div class="rp-cell"><b>'+streak+'</b><span>连续天数</span></div>'
    +'</div>'
    +'<div class="card"><b style="font-size:15px">近 7 天做题量</b>'
    +'<div class="rp-days">'+bars+'</div></div>'
    +'<div class="card"><b style="font-size:15px">近 30 天</b>'
    +'<div class="hm">'+hm.join('')+'</div>'
    +'<div class="hm-legend">少<b style="opacity:.10"></b><b style="opacity:.32"></b><b style="opacity:.6"></b><b style="opacity:.92"></b>多</div></div>'
    +'<div class="card"><b style="font-size:15px">各模块正确率</b>'
    +(rowHTML||'<div class="muted" style="margin-top:8px">还没有作答记录</div>')
    +'<div class="rp-tip">'+tip+'</div></div>';
};

/* ================= 题库搜索 ================= */
PAGES.search={title:'搜索题库'};
PAGES.search.render=function(el,params){
  const kw=(params.kw||'').trim();
  let rows='';
  if(kw){
    const low=kw.toLowerCase();
    const hits=BANK.filter(q=>{
      const hay=[q.q,q.e,q.note,q.mat,(q.o||[]).join(' ')].join('\n').toLowerCase();
      return hay.indexOf(low)>-1;
    }).slice(0,60);
    rows=hits.length?hits.map(q=>{
      const src=String(q.q||'');
      const idx=src.toLowerCase().indexOf(low);
      let snip;
      if(idx<0)snip=esc(src.slice(0,80));
      else{
        const st=Math.max(0,idx-16);
        snip=(st>0?'…':'')+esc(src.slice(st,idx))+'<span class="sr-hit">'+esc(src.substr(idx,kw.length))+'</span>'+esc(src.slice(idx+kw.length,idx+kw.length+46));
      }
      /* 命中在解析/笔记/材料里时，题干上不会有高亮，得告诉用户是哪儿匹配的 */
      const where=[];
      if(idx>-1)where.push('题干');
      if((q.o||[]).join(' ').toLowerCase().indexOf(low)>-1)where.push('选项');
      if(String(q.e||'').toLowerCase().indexOf(low)>-1)where.push('解析');
      if(String(q.note||'').toLowerCase().indexOf(low)>-1)where.push('笔记');
      if(String(q.mat||'').toLowerCase().indexOf(low)>-1)where.push('材料');
      return '<div class="sr-item" data-act="search.go" data-id="'+esc(q.id)+'">'
        +'<div class="sr-q">'+snip+'</div>'
        +'<div class="sr-meta">'+esc(q.exam||'')+' · '+esc(q.module||'')
        +(where.length&&where[0]!=='题干'?' · <b style="color:var(--primary)">命中'+where.join('/')+'</b>':'')
        +(q.note?' · 有笔记':'')+(q.mat?' · 有材料':'')+'</div></div>';
    }).join(''):'<div class="card miss-empty">没有匹配的题目</div>';
  }else{
    rows='<div class="muted" style="margin:6px 4px">输入关键词，可搜题干、选项、解析、笔记与材料</div>';
  }
  el.innerHTML=topbarHTML('搜索题库')
    +'<div class="search-box"><input id="sr-kw" value="'+esc(kw)+'" placeholder="搜索题干 / 解析 / 笔记" autocomplete="off" enterkeyhint="search">'
    +'<button class="btn btn-primary" data-act="search.run">搜索</button></div>'
    +rows;
};
ACTIONS['prax.review']=()=>{
  if(!srsDue().length){toast('今天没有到期的复习题目','ok');return;}
  goTo('practice',{module:'',mode:'review'});
};
ACTIONS['search.open']=()=>goTo('search',{});
ACTIONS['search.run']=()=>{
  const i=$id('sr-kw');reRender({kw:i?i.value:''});
};
ACTIONS['search.go']=d=>{
  const q=bankQ(d.id);if(!q)return;
  goTo('mistakePractice',{module:q.module,only:[q.id],label:'搜索结果',soft:'1'});
};
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  const t=e.target;
  if(t&&t.id==='sr-kw'){e.preventDefault();ACTIONS['search.run']();}
});

/* ================= 每日学习 ================= */
let LEARN={items:[],log:{}},LE={editing:null};
const LEARN_PRESETS=[
  {k:'en_w',name:'英语单词',unit:'个',target:20},
  {k:'jp_w',name:'日语单词',unit:'个',target:20},
  {k:'fr_w',name:'法语单词',unit:'个',target:20},
  {k:'en_s',name:'英语句子',unit:'句',target:5},
  {k:'idiom',name:'成语',unit:'个',target:5},
  {k:'poem',name:'诗词',unit:'首',target:1},
  {k:'wenyan',name:'文言文',unit:'篇',target:1}
];
function loadLearn(){
  const d=lsJson(K.learn,null);
  LEARN=(d&&Array.isArray(d.items))?d:{items:[],log:{}};
  if(!LEARN.log||typeof LEARN.log!=='object')LEARN.log={};
  if(!LEARN.notes||typeof LEARN.notes!=='object')LEARN.notes={};
  /* 统一清洗：目标必须是 1–999 的整数，否则统计会变成字符串拼接 */
  LEARN.items=LEARN.items.filter(x=>x&&x.id&&x.name).map(x=>{
    const t=parseInt(x.target,10);
    return{id:String(x.id),name:String(x.name),
      unit:String(x.unit==null||x.unit===''?'个':x.unit).slice(0,4),
      target:(isNaN(t)||t<1)?1:Math.min(999,t)};
  });
}
function saveLearn(){lsSet(K.learn,JSON.stringify(LEARN));}
function learnItem(id){return LEARN.items.filter(x=>x.id===id)[0]||null;}
function learnDay(k){return LEARN.log[k]||{};}
function learnDone(id){const d=learnDay(todayStr());return d[id]||0;}
function learnKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function learnPrune(){
  const ks=Object.keys(LEARN.log).sort();
  if(ks.length>200)ks.slice(0,ks.length-200).forEach(k=>{delete LEARN.log[k];});
}
function learnInc(id,delta){
  const it=learnItem(id);if(!it)return;
  const key=todayStr(),day=LEARN.log[key]||(LEARN.log[key]={});
  const cur=day[id]||0,next=Math.max(0,Math.min(999,cur+delta));
  if(next===cur){toast(delta>0?'已达到单日上限':'已经是 0 了','warn');return;}
  if(next===0)delete day[id];else day[id]=next;
  if(!Object.keys(day).length)delete LEARN.log[key];
  learnPrune();saveLearn();render();
}
function learnStreak(){
  const has=k=>{const d=LEARN.log[k];return !!(d&&Object.keys(d).length);};
  const d=new Date();
  if(!has(learnKey(d)))d.setDate(d.getDate()-1);   // 今天还没学，从昨天往前算
  let n=0;
  for(let i=0;i<400;i++){
    if(!has(learnKey(d)))break;
    n++;d.setDate(d.getDate()-1);
  }
  return n;
}
function learnWeek(){
  const out=[],now=new Date();
  for(let i=6;i>=0;i--){
    const d=new Date(now.getTime()-i*86400000),k=learnKey(d),day=LEARN.log[k]||{};
    let done=0,target=0;
    LEARN.items.forEach(it=>{done+=day[it.id]||0;target+=it.target||0;});
    out.push({k:k,done:done,target:target});
  }
  return out;
}
PAGES.dailyLearn={title:'每日学习'};
PAGES.dailyLearn.render=function(el){
  const today=learnDay(todayStr());
  let doneAll=0,targetAll=0;
  LEARN.items.forEach(it=>{doneAll+=today[it.id]||0;targetAll+=it.target||0;});
  const pct=targetAll>0?Math.min(100,Math.round(doneAll*100/targetAll)):0;
  const streak=learnStreak();
  const week=learnWeek();
  const weekHTML=week.map((w,i)=>{
    const p=w.target>0?Math.min(100,Math.round(w.done*100/w.target)):0;
    const dd=parseInt(w.k.slice(8),10)||0;
    return '<div class="lw-w"><div class="lw" title="'+w.k+'　'+w.done+'/'+w.target+'"><i style="height:'+p+'%"></i></div>'
      +'<span>'+(i===6?'今':dd)+'</span></div>';
  }).join('');
  let list='';
  LEARN.items.forEach(it=>{
    const dn=learnDone(it.id),tg=it.target||1,u=esc(it.unit||'个');
    const p=Math.min(100,Math.round(dn*100/tg)),left=Math.max(0,tg-dn);
    const noteMap=(LEARN.notes&&LEARN.notes[todayStr()])||{};
    list+='<div class="lc">'
      +'<div class="lc-head"><span class="lc-av">'+esc(String(it.name).slice(0,1))+'</span>'
      +'<span class="lc-name">'+esc(it.name)+'</span>'
      +'<span class="lc-num"><b>'+dn+'</b>/'+tg+' '+u+'</span>'
      +'<button class="lc-more" data-act="learn.edit" data-id="'+it.id+'" aria-label="编辑">⋯</button></div>'
      +'<div class="lc-bar"><i style="width:'+p+'%"></i></div>'
      +'<input class="lc-note" data-lnote="'+it.id+'" maxlength="60" value="'+esc(noteMap[it.id]||'')+'" placeholder="今天学了什么（可选，如：abandon 放弃）">'
      +'<div class="lc-foot"><span class="lc-tip">'+(left?('还差 '+left+' '+u):'✓ 今日已完成')+'</span>'
      +'<span class="lc-acts">'
      +'<button class="lc-btn" data-act="learn.inc" data-id="'+it.id+'" data-v="-1" aria-label="减一">−</button>'
      +'<button class="lc-btn plus" data-act="learn.inc" data-id="'+it.id+'" data-v="1">+1 '+u+'</button>'
      +'</span></div></div>';
  });

  let presetHTML='';
  if(!LEARN.items.length){
    presetHTML='<div class="card"><b style="font-size:15px">从这里快速开始</b>'
      +'<div class="muted" style="margin-top:4px">点一下即可添加，之后随时可改。</div>'
      +'<div class="lp-grid">'
      +LEARN_PRESETS.map(x=>'<button class="lp-item" data-act="learn.preset" data-k="'+x.k+'">'+esc(x.name)
        +'<i>'+x.target+' '+esc(x.unit)+'</i></button>').join('')
      +'</div></div>';
  }

  let editorHTML='';
  if(LE!==null&&LE.editing!==undefined&&(LE.editing!==null||LE.open)){
    const it=LE.editing?learnItem(LE.editing):null;
    editorHTML='<div class="card" id="learn-editor"><b style="font-size:15px">'+(it?'修改学习项目':'添加学习项目')+'</b>'
      +'<label class="fl">名称</label>'
      +'<input id="le-name" maxlength="12" value="'+(it?esc(it.name):'')+'" placeholder="如：英语单词、成语、诗词">'
      +'<div class="row" style="margin-top:10px;flex-wrap:nowrap">'
      +'<div style="flex:1;min-width:0"><label class="fl">单位</label>'
      +'<input id="le-unit" maxlength="4" value="'+(it?esc(it.unit||'个'):'个')+'" placeholder="个 / 首 / 篇"></div>'
      +'<div style="flex:1;min-width:0"><label class="fl">每日目标</label>'
      +'<input id="le-target" type="number" min="1" max="999" inputmode="numeric" value="'+(it?it.target:20)+'"></div>'
      +'</div>'
      +'<div class="row" style="margin-top:12px;flex-wrap:nowrap">'
      +'<button class="btn btn-primary" data-act="learn.save">保存</button>'
      +'<button class="btn btn-ghost" data-act="learn.cancel">取消</button>'
      +(it?'<button class="btn btn-ghost" style="margin-left:auto;color:var(--err)" data-act="learn.del" data-id="'+it.id+'">删除</button>':'')
      +'</div>'
      +'<div class="file-note">单位可以随便填，比如「个」「首」「篇」「句」「页」；每日目标只是提示，不会阻止你继续学。</div>'
      +'</div>';
  }

  const heroInner=LEARN.items.length
    ? '<div class="lh-k">今日学习</div>'
      +'<div class="lh-n">'+doneAll+'<span>/ '+(targetAll||0)+'</span></div>'
      +'<div class="lh-bar"><i style="width:'+pct+'%"></i></div>'
      +'<div class="lh-week">'+weekHTML+'</div>'
      +'<div class="lh-foot"><span>连续打卡 '+(streak||0)+' 天</span><span>近 7 天</span></div>'
    : '<div class="lh-k">每日学习</div>'
      +'<div class="lh-n" style="font-size:23px;letter-spacing:0">先添加一个项目</div>'
      +'<div class="lh-sub">单词、成语、诗词、文言文……想学什么都可以自己加</div>';

  el.innerHTML=topbarHTML('每日学习')
    +'<div class="learn-hero">'+heroInner+'</div>'
    +presetHTML
    +list
    +editorHTML
    +'<button class="btn btn-primary" style="width:100%;margin-top:4px" data-act="learn.add">+ 添加学习项目</button>'
    +(LEARN.items.length?'<div class="row" style="margin-top:10px;justify-content:center">'
      +'<button class="btn btn-ghost btn-sm" data-act="learn.reset">重置今日进度</button></div>':'')
    +'<div class="home-foot">记录只保存在本机 · 每日目标仅提示不阻断</div>';
};
ACTIONS['learn.add']=()=>{LE={editing:null,open:true};render();};
ACTIONS['learn.edit']=d=>{LE={editing:d.id,open:true};render();};
ACTIONS['learn.cancel']=()=>{LE={editing:null,open:false};render();};
ACTIONS['learn.inc']=d=>{learnInc(d.id,parseInt(d.v,10)||1);};
ACTIONS['learn.save']=()=>{
  const name=(($id('le-name')||{}).value||'').trim();
  const unit=(($id('le-unit')||{}).value||'').trim()||'个';
  const tg=parseInt((($id('le-target')||{}).value||'0'),10)||0;
  if(!name){toast('请填写名称','warn');return;}
  if(name.length>12){toast('名称最多 12 个字','warn');return;}
  if(tg<1||tg>999){toast('每日目标请填 1–999','warn');return;}
  if(LE.editing){
    const it=learnItem(LE.editing);
    if(it){it.name=name;it.unit=unit;it.target=tg;}
    toast('已保存修改','ok');
  }else{
    if(LEARN.items.some(x=>x.name===name)){toast('已有同名项目','warn');return;}
    LEARN.items.push({id:'l'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),name:name,unit:unit,target:tg});
    toast('已添加：'+name,'ok');
  }
  LE={editing:null,open:false};saveLearn();render();
};
ACTIONS['learn.del']=d=>{
  const it=learnItem(d.id);if(!it)return;
  qtConfirm({title:'删除学习项目',
    msg:'将删除「'+it.name+'」以及它的全部历史打卡记录。确定删除？',
    okText:'删除',danger:true,
    onOk:()=>{
      LEARN.items=LEARN.items.filter(x=>x.id!==d.id);
      Object.keys(LEARN.log).forEach(k=>{
        delete LEARN.log[k][d.id];
        if(!Object.keys(LEARN.log[k]).length)delete LEARN.log[k];
      });
      LE={editing:null,open:false};saveLearn();render();toast('已删除','ok');
    }});
};
ACTIONS['learn.reset']=()=>{
  qtConfirm({title:'重置今日进度',
    msg:'把今天所有项目的完成数清零，往日的记录保留。确定重置？',
    okText:'重置',danger:true,
    onOk:()=>{delete LEARN.log[todayStr()];saveLearn();render();toast('今日进度已清零','ok');}});
};
document.addEventListener('change',e=>{
  const t=e.target.closest('[data-lnote]');if(!t)return;
  const d=todayStr(),v=t.value.trim();
  LEARN.notes=LEARN.notes||{};
  const m=LEARN.notes[d]||(LEARN.notes[d]={});
  if(v)m[t.dataset.lnote]=v;else delete m[t.dataset.lnote];
  if(!Object.keys(m).length)delete LEARN.notes[d];
  saveLearn();toast(v?'已记录今天学了什么':'已清除','ok');
});
ACTIONS['learn.preset']=d=>{
  const p=LEARN_PRESETS.filter(x=>x.k===d.k)[0];if(!p)return;
  if(LEARN.items.some(x=>x.name===p.name)){toast('已有同名项目','warn');return;}
  LEARN.items.push({id:'l'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),
    name:p.name,unit:p.unit,target:p.target});
  saveLearn();render();toast('已添加：'+p.name,'ok');
};

document.addEventListener('change',e=>{
  if(!e.target||e.target.id!=='q-img-file')return;
  const f=e.target.files&&e.target.files[0];
  if(!f)return;
  const q=curQ();
  if(!q){toast('当前没有题目','warn');return;}
  toast('正在处理图片…','ok');
  shrinkImage(f,d=>{q.img=d;saveBank();render();toast('配图已保存','ok');});
});

/* ---- 刷题页左右滑动切题 ---- */
(function(){
  let sx=0,sy=0,st=0;
  document.addEventListener('touchstart',e=>{
    if(e.touches.length!==1)return;
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;st=Date.now();
  },{passive:true});
  document.addEventListener('touchend',e=>{
    if(!e.changedTouches||!e.changedTouches.length)return;
    const p=curPage();if(!p||p.page!=='practice')return;
    const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
    if(Date.now()-st>700)return;
    if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.6)return;
    if(dx<0)ACTIONS['quiz.next']();else ACTIONS['quiz.prev']();
  },{passive:true});
})();
