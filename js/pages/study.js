/* 题灵录 · pages/study */
/* ================= 教材梳理 ================= */
const STUDY_CATS_BASE=['国考','省考','事业单位A类','事业单位B类','事业单位C类','事业单位D类','事业单位E类','初中','高中','大学','计算机二级','软考'];
let BOOKS=[];
let STUDY={cat:'国考'};
function loadBooks(){
  BOOKS=lsJson(K.books,[]);if(!Array.isArray(BOOKS))BOOKS=[];
  BOOKS.forEach(b=>{if(!b.cat)b.cat='国考';if(!b.module)b.module=studyModulesFor(b.cat)[0];});
}
function saveBooks(){lsSet(K.books,JSON.stringify(BOOKS));}
/* 用户自己新增的学习类别（中考、考研、教资……） */
let STUDY_CATS_EXTRA=[];
function loadStudyCatsExtra(){
  const d=lsJson(K.studyCats,[]);
  STUDY_CATS_EXTRA=Array.isArray(d)?d.filter(x=>typeof x==='string'&&x.trim()):[];
}
function saveStudyCatsExtra(){lsSet(K.studyCats,JSON.stringify(STUDY_CATS_EXTRA));}
function allStudyCats(){
  const arr=STUDY_CATS_BASE.slice();
  STUDY_CATS_EXTRA.forEach(c=>{if(arr.indexOf(c)<0)arr.push(c);});
  CUST_EXAMS.forEach(e=>{if(arr.indexOf(e.name)<0)arr.push(e.name);});
  BOOKS.forEach(b=>{if(b.cat&&arr.indexOf(b.cat)<0)arr.push(b.cat);});
  return arr;
}
function isPredefCat(cat){return cat==='国考'||cat==='省考'||/^事业单位/.test(cat);}
function studyModulesFor(cat){
  if(cat==='国考'||cat==='省考')return GT_MODS.concat(['申论']);
  if(/^事业单位/.test(cat))return SY_MODS.concat(['综应']);
  const ce=custExamByName(cat);
  if(ce)return ce.modules.length?ce.modules:['综合'];
  const arr=[];BOOKS.filter(b=>b.cat===cat&&b.module).forEach(b=>{if(!arr.includes(b.module))arr.push(b.module);});
  if(!arr.length)arr.push('综合');
  return arr;
}
function bookById(id){return BOOKS.find(b=>b.id===id);}
function studyKey(id){return 'qt_study_'+id;}
function studyState(id){
  const st=lsJson(studyKey(id),{idx:0,done:[]});
  st.idx=Math.max(0,parseInt(st.idx,10)||0);
  st.done=Array.isArray(st.done)?st.done.map(x=>parseInt(x,10)||0):[];
  return st;
}
function saveStudyState(id,st){lsSet(studyKey(id),JSON.stringify({idx:st.idx,done:st.done}));}
function parseStudySections(text){
  const lines=String(text||'').split(/\r?\n/);
  const H=/^\s*(第\s*[0-9一二三四五六七八九十百千零两]+\s*[章节讲单元课部分篇]|\d{1,3}[、.．]\s*[^\d\s]|[一二三四五六七八九十]{1,3}\s*[、.．]\s*\S|【[^】]{1,16}】|#{1,4}\s*\S)/;
  const secs=[];let cur=null;
  lines.forEach(l=>{
    const t=l.trim();
    if(!t){if(cur)cur.c+='\n';return;}
    if(H.test(t)&&t.length<60){
      if(cur)secs.push(cur);
      cur={t:t.replace(/^【|】$/g,'').replace(/^#{1,4}\s*/,'').trim(),c:''};
    }else if(cur){cur.c+=t+'\n';}
    else{cur={t:'开篇',c:t+'\n'};}
  });
  if(cur)secs.push(cur);
  const out=secs.filter(x=>x.t||x.c.trim());
  if(out.length===0)return[];
  if(out.length===1){
    const paras=out[0].c.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean);
    if(paras.length>3){
      const groups=Math.min(12,Math.ceil(paras.length/3));
      const per=Math.ceil(paras.length/groups);
      const arr=[];
      for(let i2=0;i2<paras.length;i2+=per)arr.push({t:'第 '+(arr.length+1)+' 部分',c:paras.slice(i2,i2+per).join('\n\n')});
      return arr;
    }
  }
  return out;
}
function studyAgg(cat,mod){
  let n=0,T=0,D=0,fin=0;
  BOOKS.filter(b=>b.cat===cat&&b.module===mod).forEach(b=>{
    const st=studyState(b.id);n++;T+=b.sections.length;D+=st.done.length;
    if(b.sections.length&&st.done.length>=b.sections.length)fin++;
  });
  return{n:n,T:T,D:D,fin:fin};
}
function bookCardHTML(b){
  const st=studyState(b.id),M=b.sections.length,dn=st.done.length;
  const pct=M?Math.round(dn*100/M):0;
  const all=M>0&&dn>=M;
  return '<div class="card card-sm card-tap" data-act="bk.open" data-id="'+esc(b.id)+'">'
    +'<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div style="flex:1;min-width:0">'
    +'<div class="m-name">'+esc(b.title)+'</div>'
    +'<div class="muted" style="margin-top:2px">'+(b.note?esc(b.note)+' · ':'')+'共 '+M+' 节 · 已学 <b style="color:var(--primary)">'+dn+'</b>/'+M+' 节</div></div>'
    +'<button class="btn-link" style="color:var(--err);flex-shrink:0" data-act="bk.del" data-id="'+esc(b.id)+'">删除</button></div>'
    +'<div class="pbar"><div class="pbar-in" style="width:'+pct+'%"></div></div>'
    +'<div class="muted" style="margin-top:6px">'+(all?'✓ 已学完，可随时复习':(dn?('继续学习 · 已完成 '+pct+'%'):'开始学习'))+'</div></div>';
}
PAGES.studyList={title:'教材梳理'};
PAGES.studyList.render=function(el){
  const cats=allStudyCats();
  const saved=lsGet(K.studyCat);
  if(saved&&cats.includes(saved))STUDY.cat=saved;
  if(!cats.includes(STUDY.cat))STUDY.cat=cats[0];
  const mods=studyModulesFor(STUDY.cat);
  let cards='';
  mods.forEach(m=>{
    const a=studyAgg(STUDY.cat,m);
    const pct=a.T?Math.round(a.D*100/a.T):0;
    cards+='<div class="card card-sm card-tap mod-card'+(a.n?' ready':' disabled')+'" data-act="smod.enter" data-m="'+esc(m)+'">'
      +'<div><div class="m-name">'+esc(m)+'</div>'
      +'<div class="muted" style="margin-top:2px">教材 <b>'+a.n+'</b> 本'+(a.n?(' · 已学 <b>'+a.D+'</b>/'+a.T+' 节 · 学完 '+a.fin+' 本'):'')+'</div>'
      +(a.n?'<div class="pbar" style="margin-top:8px"><div class="pbar-in" style="width:'+pct+'%"></div></div>':'')
      +'</div><div class="m-right">'+(a.n?'›':'—')+'</div></div>';
  });
  el.innerHTML=topbarHTML('教材梳理')
    +'<div class="card"><label class="fl">学习类别（考试 / 学段）</label>'
    +'<select data-chg="study.cat">'+cats.map(c=>'<option'+(c===STUDY.cat?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select>'
    +'<div class="row" style="margin-top:8px"><input id="new-study-cat" maxlength="12" placeholder="新增类别，如：中考、考研" style="flex:1;min-width:0">'
    +'<button class="btn btn-primary btn-sm" data-act="study.catAdd">添加</button></div>'
    +'<div class="file-note">选择类别后显示对应模块；初中、高中、大学、计算机二级、软考等教材均可导入，科目在导入时填写。</div>'
    +(STUDY_CATS_EXTRA.length?('<div class="row" style="margin-top:8px;flex-wrap:wrap;gap:6px">'
      +STUDY_CATS_EXTRA.map(c=>'<span class="chip" style="cursor:pointer;background:var(--primary-soft);color:var(--primary)" data-act="study.catDel" data-n="'+esc(c)+'">'+esc(c)+' ×</span>').join('')
      +'</div><div class="file-note">点类别名可删除（该类别下还有教材时不能删）。</div>'):'')
    +'</div>'
    +'<div class="row" style="margin:6px 4px 10px"><button class="btn btn-primary btn-sm" data-act="bk.import">导入教材</button>'
    +'<span class="muted">'+(isPredefCat(STUDY.cat)?esc(STUDY.cat)+' · '+mods.length+' 个模块':'自由科目 · 随导入自动出现')+'</span></div>'
    +cards;
};
CHANGES['study.cat']=(d,t)=>{STUDY.cat=t.value;lsSet(K.studyCat,t.value);render();};
ACTIONS['study.catAdd']=()=>{
  const i=$id('new-study-cat');
  const name=String((i&&i.value)||'').trim();
  if(!name){toast('请输入类别名称','warn');return;}
  if(name.length>12){toast('名称最多 12 个字','warn');return;}
  if(allStudyCats().includes(name)){toast('该类别已存在','warn');return;}
  STUDY_CATS_EXTRA.push(name);saveStudyCatsExtra();
  STUDY.cat=name;lsSet(K.studyCat,name);
  render();toast('已添加：'+name,'ok');
};
ACTIONS['study.catDel']=d=>{
  const name=d.n;
  if(BOOKS.some(b=>b.cat===name)){toast('该类别下还有教材，请先删除教材','warn');return;}
  STUDY_CATS_EXTRA=STUDY_CATS_EXTRA.filter(x=>x!==name);saveStudyCatsExtra();
  if(STUDY.cat===name){STUDY.cat=STUDY_CATS_BASE[0];lsSet(K.studyCat,STUDY.cat);}
  render();toast('已删除','ok');
};
ACTIONS['smod.enter']=d=>{
  const m=d.m;
  if(!BOOKS.some(b=>b.cat===STUDY.cat&&b.module===m)){toast('该模块暂无教材，可先导入','warn');return;}
  goTo('moduleBooks',{cat:STUDY.cat,module:m});
};
PAGES.moduleBooks={title:'模块教材'};
PAGES.moduleBooks.render=function(el,params){
  const cat=params.cat||STUDY.cat,mod=params.module||'';
  const list=BOOKS.filter(b=>b.cat===cat&&b.module===mod);
  el.innerHTML=topbarHTML('教材 · '+esc(cat)+' · '+esc(mod))
    +'<div class="row" style="margin:6px 4px 10px"><button class="btn btn-primary btn-sm" data-act="bk.importHere" data-m="'+esc(mod)+'">导入教材到此模块</button>'
    +'<span class="muted">共 '+list.length+' 本</span></div>'
    +(list.length?list.map(bookCardHTML).join(''):'<div class="card miss-empty">该模块暂无教材</div>');
};
ACTIONS['bk.open']=d=>{const b=bookById(d.id);if(!b){toast('教材不存在或已删除','warn');return;}goTo('study',{bookId:b.id});};
ACTIONS['bk.import']=()=>{if(!BKIMP.cat)BKIMP.cat=STUDY.cat;goTo('studyImport',{});};
ACTIONS['bk.importHere']=d=>{BKIMP.cat=STUDY.cat;BKIMP.module=d.m||BKIMP.module;goTo('studyImport',{});};
ACTIONS['bk.del']=d=>{
  const b=bookById(d.id);if(!b)return;
  qtConfirm({title:'删除教材',msg:'将删除《'+b.title+'》及其学习进度。确定删除？',okText:'删除',danger:true,onOk:()=>{
    BOOKS=BOOKS.filter(x=>x.id!==d.id);saveBooks();lsDel(studyKey(d.id));
    toast('已删除','ok');render();
  }});
};
let BKIMP={cat:'',module:'',title:'',note:'',draft:'',file:null,fileStatus:''};
PAGES.studyImport={title:'导入教材'};
const STUDY_JSON_SAMPLE='{\n  "title": "行测判断推理 · 知识点手册",\n  "cat": "国考",\n  "module": "判断推理",\n  "note": "基础知识梳理",\n  "sections": [\n    {"t": "第一节 图形推理", "c": "常见规律：数量类、位置类、样式类……"},\n    {"t": "第二节 定义判断", "c": "先看提问方式，再抓定义要点……"}\n  ]\n}';
PAGES.studyImport.render=function(el){
  const mode=deviceMode();
  if(!BKIMP.cat)BKIMP.cat=STUDY.cat||'国考';
  if(!BKIMP.module||!studyModulesFor(BKIMP.cat).includes(BKIMP.module))BKIMP.module=studyModulesFor(BKIMP.cat)[0];
  const cats=allStudyCats();
  const fixed=!!(isPredefCat(BKIMP.cat)||custExamByName(BKIMP.cat));
  const modField=fixed
    ?'<select data-chg="bkimp.mod">'+studyModulesFor(BKIMP.cat).map(m=>'<option'+(m===BKIMP.module?' selected':'')+'>'+esc(m)+'</option>').join('')+'</select>'
    :'<input list="bk-mod-dl" data-bkimp="module" value="'+esc(BKIMP.module||'')+'" placeholder="如：数学、英语、数据结构、网络工程师">'
     +'<datalist id="bk-mod-dl">'+studyModulesFor(BKIMP.cat).map(m=>'<option value="'+esc(m)+'">').join('')+'</datalist>';
  el.innerHTML=topbarHTML('导入教材')
    +'<div class="card">'
    +'<label class="fl">学习类别（考试 / 学段）</label>'
    +'<select data-chg="bkimp.cat">'+cats.map(c=>'<option'+(c===BKIMP.cat?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select>'
    +'<label class="fl">模块 / 科目'+(fixed?'':'（自由填写）')+'</label>'+modField
    +'<label class="fl">教材标题</label><input data-bkimp="title" value="'+esc(BKIMP.title)+'" placeholder="如：行测判断推理 · 知识点手册">'
    +'<label class="fl">说明（可选）</label><input data-bkimp="note" value="'+esc(BKIMP.note)+'" placeholder="如：基础知识梳理">'
    +'<label class="fl">教材内容（纯文本）</label>'
    +'<textarea rows="12" data-bkimp="draft" placeholder="支持“第X章 / 第X节”“一、”“1.”“【考点】”“# 标题”等章节写法，保存时自动拆分为学习小节">'+esc(BKIMP.draft)+'</textarea>'
    +'<label class="fl">或从文件读取（JSON 直接导入整本，其他格式读入文本框）</label>'
    +'<input type="file" accept="'+IMP_ACCEPT_ALL+'" data-chg="bkimp.file">'
    +'<div class="row" style="margin-top:8px"><button class="btn btn-plain btn-sm" data-act="bkimp.word">重解析 Word</button>'
    +'<button class="btn btn-plain btn-sm" data-act="bkimp.pdf">重解析 PDF</button></div>'
    +'<div class="file-note" id="file-status">'+esc(BKIMP.fileStatus||'')+'</div>'
    +'<div class="file-note">支持 JSON / CSV / TXT / MD / Excel / Word / PDF；除 JSON 外都会读成文本放进上面的框，检查后再保存。</div>'
    +'<details style="margin-top:6px"><summary class="muted" style="cursor:pointer;font-size:12.5px">查看 JSON 格式</summary>'
    +'<pre style="font-size:11px;line-height:1.6;background:var(--line);padding:10px;border-radius:10px;overflow:auto;white-space:pre-wrap;margin-top:6px">'+esc(STUDY_JSON_SAMPLE)+'</pre>'
    +'<div class="file-note">cat / module 不填就用上面选的；没写 sections 但写了 content，会按章节自动拆分；最外层是数组则一次导入多本。同名同模块的教材会自动跳过。</div>'
    +'</details>'
    +'<button class="btn btn-primary" style="width:100%;margin-top:14px" data-act="bkimp.save">保存并开始学习</button>'
    +'<div class="file-note">保存后自动进入对应模块的学习页；全部在本地处理。</div>'
    +'</div>';
};
CHANGES['bkimp.cat']=(d,t)=>{BKIMP.cat=t.value;BKIMP.module=studyModulesFor(t.value)[0];render();};
CHANGES['bkimp.mod']=(d,t)=>{BKIMP.module=t.value;};
document.addEventListener('input',e=>{
  const t=e.target.closest('[data-bkimp]');
  if(t)BKIMP[t.dataset.bkimp]=t.value;
});
/* 统一的文件入口：JSON 走整本导入，其余格式读成文本放进草稿框 */
function importBooksData(data){
  const list=Array.isArray(data)?data:[data];
  const defCat=BKIMP.cat||'国考';
  let add=0,skip=0,bad=0,lastId=null;
  list.forEach(b=>{
    const title=String((b&&(b.title||b.name))||'').trim();
    if(!title){bad++;return;}
    const cat=String((b&&b.cat)||defCat);
    const mod=String((b&&(b.module||b.subject))||BKIMP.module||'').trim();
    if(!mod){bad++;return;}
    let secs=Array.isArray(b.sections)
      ? b.sections.filter(x=>x&&x.t).map(x=>({t:String(x.t).slice(0,80),c:String(x.c||'')}))
      : [];
    if(!secs.length&&b.content)secs=parseStudySections(String(b.content));
    if(!secs.length){bad++;return;}
    if(BOOKS.some(x=>x.cat===cat&&x.module===mod&&x.title===title)){skip++;return;}
    const id='bk-'+simpleHash(cat+'|'+mod+'|'+title)+Date.now().toString(36).slice(-4);
    BOOKS.push({id:id,title:title,note:String(b.note||'').trim(),cat:cat,module:mod,addedAt:Date.now(),sections:secs});
    lastId=id;add++;
  });
  if(add){
    saveBooks();
    STUDY.cat=defCat;lsSet(K.studyCat,defCat);
  }
  return {add:add,skip:skip,bad:bad,lastId:lastId};
}
CHANGES['bkimp.file']=async(d,t)=>{
  const f=(t.files&&t.files[0])||null;
  BKIMP.file=f;
  BKIMP.fileStatus=f?('已选择：'+f.name):'';
  const st=$id('file-status');if(st)st.textContent=BKIMP.fileStatus;
  if(!f)return;
  try{
    const r=await extractAnyText(f);
    if(r.isJson){
      const res=importBooksData(r.json);
      const extra=[];
      if(res.skip)extra.push('跳过 '+res.skip+' 本重复');
      if(res.bad)extra.push(res.bad+' 本格式不对');
      if(res.add){
        toast('已导入 '+res.add+' 本教材'+(extra.length?('，'+extra.join('，')):''),'ok');
        if(res.add===1&&res.lastId){goTo('study',{bookId:res.lastId});return;}
        render();return;
      }
      BKIMP.fileStatus='';
      if(st)st.textContent='';
      toast('没有新增'+(extra.length?('：'+extra.join('，')):''),'warn');
      return;
    }
    /* 非 JSON：读成文本填进草稿框，用户检查后再保存 */
    const txt=r.text||'';
    if(!txt.trim()){toast('文件里没有读到内容','warn');return;}
    BKIMP.draft=txt;
    const ta=document.querySelector('textarea[data-bkimp=draft]');
    if(ta)ta.value=txt;
    if(!BKIMP.title){
      BKIMP.title=f.name.replace(/\.[^.]+$/,'');
      const ti=document.querySelector('input[data-bkimp=title]');
      if(ti)ti.value=BKIMP.title;
    }
    const n=parseStudySections(txt).length;
    BKIMP.fileStatus='已读入 '+f.name+'（识别到 '+n+' 节）';
    if(st)st.textContent=BKIMP.fileStatus;
    toast('已读入文本，检查后点「保存并开始学习」','ok');
  }catch(e){
    const msg=(e&&e.message)||'读取失败';
    BKIMP.fileStatus=msg;
    if(st)st.textContent=msg;
    toast(msg,'err');
  }finally{
    t.value='';
  }
};
ACTIONS['bkimp.word']=async()=>{
  const st=$id('file-status');
  if(!BKIMP.file){toast('请先选择 .docx 文件','warn');return;}
  if(!/\.docx$/i.test(BKIMP.file.name)){toast('仅支持 .docx（老式 .doc 请另存为 .docx）','err');return;}
  if(st)st.textContent='正在解析…';
  try{
    await loadScript(MAMMOTH_CDN,()=>window.mammoth);
    const buf=await fileToArrayBuffer(BKIMP.file);
    const r=await window.mammoth.extractRawText({arrayBuffer:buf});
    BKIMP.draft=(r&&r.value)||'';
    if(!BKIMP.title.trim())BKIMP.title=BKIMP.file.name.replace(/\.docx$/i,'');
    if(st)st.textContent='解析成功，共 '+BKIMP.draft.length+' 字';
    render();
  }catch(e){
    if(st)st.textContent='解析失败：'+(e.message||e)+'。可复制内容后用粘贴方式导入。';
    toast('Word 解析失败','err');
  }
};
ACTIONS['bkimp.pdf']=async()=>{
  const st=$id('file-status');
  if(!BKIMP.file){toast('请先选择 PDF 文件','warn');return;}
  if(!/\.pdf$/i.test(BKIMP.file.name)){toast('请选择 PDF 文件','warn');return;}
  if(st)st.textContent='正在解析…';
  try{
    await loadScript(PDFJS_CDN,()=>window.pdfjsLib);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
    const buf=await fileToArrayBuffer(BKIMP.file);
    const doc=await window.pdfjsLib.getDocument({data:buf}).promise;
    let text='';
    for(let pg=1;pg<=doc.numPages;pg++){
      const page=await doc.getPage(pg);
      const tc=await page.getTextContent();
      text+=tc.items.map(it=>it.str).join(' ')+'\n';
    }
    if(text.replace(/\s/g,'').length<10)throw new Error('未提取到文字层（可能是扫描版 PDF）');
    BKIMP.draft=text;
    if(!BKIMP.title.trim())BKIMP.title=BKIMP.file.name.replace(/\.pdf$/i,'');
    if(st)st.textContent='解析成功，共 '+text.length+' 字';
    render();
  }catch(e){
    if(st)st.textContent='解析失败：'+(e.message||e)+'。可复制文字后用粘贴方式导入。';
    toast('PDF 解析失败','err');
  }
};
ACTIONS['bkimp.save']=()=>{
  const title=(BKIMP.title||'').trim()||('我的教材 '+todayStr());
  const text=BKIMP.draft||'';
  if(!text.trim()){toast('请先粘贴教材内容','warn');return;}
  const secs=parseStudySections(text);
  if(!secs.length){toast('未能解析出内容，请检查文本','err');return;}
  const cat=BKIMP.cat||'国考';
  let mod=(BKIMP.module||'').trim();
  if(!mod){toast('请填写模块 / 科目','warn');return;}
  const id='bk-'+simpleHash(cat+'|'+mod+'|'+title)+Date.now().toString(36).slice(-4);
  BOOKS.push({id:id,title:title,note:(BKIMP.note||'').trim(),cat:cat,module:mod,addedAt:Date.now(),sections:secs});
  saveBooks();
  STUDY.cat=cat;lsSet(K.studyCat,cat);
  BKIMP={cat:cat,module:mod,title:'',note:'',draft:'',file:null,fileStatus:''};
  navStack[navStack.length-1]={page:'moduleBooks',params:{cat:cat,module:mod},sc:0};
  goTo('study',{bookId:id});
  toast('已保存《'+title+'》：共 '+secs.length+' 节，开始学习','ok');
};
let ST=null;
PAGES.study={title:'教材学习'};
PAGES.study.render=function(el,params){
  const b=bookById(params.bookId);
  if(!b){el.innerHTML=topbarHTML('教材学习')+'<div class="card miss-empty">教材不存在或已删除</div>';return;}
  ST={b:b,st:studyState(b.id)};
  ST.st.idx=Math.min(ST.st.idx,Math.max(0,b.sections.length-1));
  el.innerHTML=topbarHTML(b.title,b.cat+' · '+b.module)
    +'<div id="study-body">'+studySecHTML()+'</div>'
    +'<div class="botbar"><div class="botbar-in">'
    +'<button class="btn btn-plain btn-sm" data-act="study.toc">目录</button>'
    +'<button class="btn btn-plain" id="st-prev" data-act="study.prev">上一节</button>'
    +'<button class="btn btn-primary btn-big" id="st-mark" data-act="study.mark">'+studyMarkLabel()+'</button>'
    +'</div></div>';
  const pv=$id('st-prev');if(pv)pv.disabled=ST.st.idx===0;
};
function studyMarkLabel(){
  const b=ST.b,st=ST.st;
  if(st.idx>=b.sections.length-1)return st.done.includes(st.idx)?'✓ 已学完 · 复习':'标记已学 · 完成本书';
  return st.done.includes(st.idx)?'下一节（已标记）':'标记已学 · 下一节';
}
function studySecHTML(){
  const b=ST.b,sec=b.sections[ST.st.idx],dn=ST.st.done.length,M=b.sections.length;
  const done=ST.st.done.includes(ST.st.idx);
  let h='<div class="q-count">第 <b>'+(ST.st.idx+1)+'</b> / '+M+' 节 · <span id="study-done">已学 '+dn+' 节</span></div>';
  h+='<div class="exam-meta"><span class="chip c-sub">'+esc(b.cat)+'</span><span class="chip">'+esc(b.module)+'</span>'
    +(done?'<span class="chip" style="background:var(--ok-bg);color:var(--ok)">✓ 已学</span>':'<span class="chip c-sub">学习中</span>')+'</div>';
  h+='<div class="card"><div class="q-text" style="font-weight:700;margin-bottom:8px">'+esc(sec.t||('第 '+(ST.st.idx+1)+' 节'))+'</div>'
    +'<div class="q-text" style="font-size:16px">'+esc(sec.c.trim()||'（本节无正文）')+'</div></div>';
  return h;
}
function studyGo(i){
  const b=ST.b;
  ST.st.idx=Math.max(0,Math.min(i,b.sections.length-1));
  saveStudyState(b.id,ST.st);
  render();
  window.scrollTo(0,0);
}
ACTIONS['study.prev']=()=>{if(ST)studyGo(ST.st.idx-1);};
ACTIONS['study.mark']=()=>{
  if(!ST)return;
  const st=ST.st,b=ST.b;
  if(!st.done.includes(st.idx))st.done.push(st.idx);
  if(st.idx>=b.sections.length-1){
    saveStudyState(b.id,st);
    render();window.scrollTo(0,0);
    toast(st.done.length>=b.sections.length?'🎉 已学完全部章节！':'已标记，可随时复习','ok');
    return;
  }
  studyGo(st.idx+1);
};
function studyBrowse(delta){
  if(!ST)return;
  const ni=ST.st.idx+delta;
  if(ni<0||ni>=ST.b.sections.length)return;
  studyGo(ni);
}
ACTIONS['study.toc']=()=>{
  if(!ST)return;
  const b=ST.b,st=ST.st;
  const rows=b.sections.map((s2,i)=>
    '<div class="card-tap" style="display:flex;gap:8px;align-items:center;padding:10px 12px;border:1px solid '+(i===st.idx?'var(--primary)':'var(--line)')+';border-radius:10px;margin:6px 0;background:'+(st.done.includes(i)?'var(--ok-bg)':'#fff')+'" data-act="study.jump" data-i="'+i+'">'
    +'<span style="color:'+(st.done.includes(i)?'var(--ok)':'var(--text-sub)')+';width:26px;text-align:center;flex-shrink:0">'+(st.done.includes(i)?'✓':(i+1))+'</span>'
    +'<span style="flex:1;font-size:14px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(s2.t||('第 '+(i+1)+' 节'))+'</span></div>').join('');
  const h='<div class="mask" data-act="modal.mask"><div class="modal" data-stop="1"><h3>目录 · '+esc(b.title)+'</h3>'
    +'<div style="max-height:50dvh;overflow:auto;-webkit-overflow-scrolling:touch">'+rows+'</div>'
    +'<div class="m-btns"><button class="btn btn-plain" data-act="modal.cancel">关闭</button></div></div></div>';
  document.getElementById('modal-root').innerHTML=h;
  modalOpen=true;
};
ACTIONS['study.jump']=d=>{
  if(!ST)return;
  const i=parseInt(d.i,10);
  if(isNaN(i))return;
  closeModal();
  studyGo(i);
};

/* ================= 题库选择删除 ================= */
let BM={sel:new Set()};
ACTIONS['bm.open']=()=>{BM={sel:new Set()};goTo('bankManage',{});};
PAGES.bankManage={title:'选择删除题目'};
PAGES.bankManage.render=function(el){
  const groups={};
  BANK.forEach(q=>{const m=q.module;if(!groups[m])groups[m]=[];groups[m].push(q);});
  const modOrder=MODULES.filter(m=>groups[m]);
  Object.keys(groups).forEach(m=>{if(!modOrder.includes(m))modOrder.push(m);});
  let html='';
  if(!BANK.length)html='<div class="card miss-empty">题库为空，没有可删除的题目</div>';
  modOrder.forEach(m=>{
    const qs=groups[m];
    const allSel=qs.every(q=>BM.sel.has(q.id));
    html+='<div class="qg-head" style="display:flex;align-items:center;gap:8px;margin-top:12px"><span style="flex:1">'+esc(m)+' · '+qs.length+' 题</span>'
      +'<button class="btn-link" data-act="bm.group" data-m="'+esc(m)+'">'+(allSel?'取消本组':'全选本组')+'</button></div>';
    qs.forEach(qq=>{
      const on=BM.sel.has(qq.id);
      html+='<div class="card card-sm card-tap" style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px" data-act="bm.toggle" data-id="'+esc(qq.id)+'">'
        +'<span class="ckbox'+(on?' on':'')+'">'+(on?'✓':'')+'</span>'
        +'<div style="flex:1;min-width:0"><div class="muted" style="margin:0 0 2px">'+TYPE_NAMES[qq.type]+(qq.subtype?' · '+esc(qq.subtype):'')+'</div>'
        +'<div style="font-size:14px;line-height:1.5">'+esc(qq.q.length>70?qq.q.slice(0,70)+'…':qq.q)+'</div></div></div>';
    });
  });
  const n=BM.sel.size;
  el.innerHTML=topbarHTML('选择删除题目','已选 '+n+' / '+BANK.length)
    +'<div class="row" style="margin:6px 4px"><button class="btn btn-plain btn-sm" data-act="bm.all">'+(n===BANK.length&&BANK.length?'取消全选':'全选')+'</button>'
    +'<span class="muted">点卡片勾选，整组可一键全选</span></div>'
    +html
    +'<div class="botbar"><div class="botbar-in">'
    +'<button class="btn btn-ghost btn-sm" data-act="bm.all">'+(n===BANK.length&&BANK.length?'取消全选':'全选')+'</button>'
    +'<button class="btn btn-primary btn-big'+(n?'':' disabled')+'" data-act="bm.del">删除已选（'+n+' 题）</button>'
    +'</div></div>';
};
ACTIONS['bm.toggle']=d=>{
  if(BM.sel.has(d.id))BM.sel.delete(d.id);else BM.sel.add(d.id);
  render();
};
ACTIONS['bm.group']=d=>{
  const qs=BANK.filter(q=>q.module===d.m);
  const allSel=qs.every(q=>BM.sel.has(q.id));
  qs.forEach(q=>{if(allSel)BM.sel.delete(q.id);else BM.sel.add(q.id);});
  render();
};
ACTIONS['bm.all']=()=>{
  if(BANK.length&&BM.sel.size===BANK.length)BM.sel.clear();
  else BANK.forEach(q=>BM.sel.add(q.id));
  render();
};
ACTIONS['bm.del']=()=>{
  const n=BM.sel.size;
  if(!n)return;
  qtConfirm({title:'删除题目',msg:'将删除选中的 '+n+' 道题目，同时移除它们在套卷中的引用和相关错题记录。作答统计保留。确定删除？',okText:'删除',danger:true,onOk:()=>{
    BANK=BANK.filter(q=>!BM.sel.has(q.id));
    PAPERS.forEach(p=>{p.questionIds=(p.questionIds||[]).filter(id=>!BM.sel.has(id));});
    WRONG=WRONG.filter(w=>!BM.sel.has(w.questionId));
    saveBank();saveWrong();
    BM.sel.clear();
    toast('已删除 '+n+' 道题目','ok');
    render();
  }});
};
