/* 题灵录 · pages/import */
/* ================= 导入题库 ================= */
/* 三个导入入口共用的文件类型清单 */
const IMP_ACCEPT_ALL='.json,.csv,.txt,.md,.markdown,application/json,text/plain,text/csv';
let IMP={draft:'',jsonDraft:'',aiText:'',tab:'paste',qFile:null,aFile:null,qStatus:'',aStatus:'',mdFile:null};
function deviceMode(){
  const f=sessionStorage.getItem('qt_force_mode');if(f)return f;
  const coarse=window.matchMedia&&matchMedia('(pointer: coarse)').matches;
  const ua=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const small=window.innerWidth<768;
  return(coarse||ua||small)?'mobile':'desktop';
}
document.addEventListener('input',e=>{
  const t=e.target.closest('[data-imp]');if(!t)return;
  IMP[t.dataset.imp]=t.value;
});

/* ---- 解析器：JSON → 分题块式 → 行式 → 兜底整段一题 ---- */
function parseAnsStr(s){
  if(!s)return null;
  const t=String(s).trim();
  if(/^(对|正确|√|T|是)$/i.test(t))return{type:'judge',a:0};
  if(/^(错|错误|×|F|否)$/i.test(t))return{type:'judge',a:1};
  const ls=t.toUpperCase().match(/[A-H]/g);
  if(ls&&ls.length>1)return{type:'multiple',a:ls};
  if(ls&&ls.length===1)return{type:'single',a:ls[0]};
  return null;
}
function makeItem(q,opts,ansObj,e,noAns,module){
  let type,aNorm;
  if(opts.length>=2){
    if(!ansObj||ansObj.type==='judge'){type=ansObj&&ansObj.type==='judge'?'single':'single';aNorm=ansObj&&ansObj.type==='judge'?ansObj.a:0;}
    else if(ansObj.type==='multiple'){type='multiple';aNorm=[...new Set(ansObj.a)].map(c=>c.charCodeAt(0)-65).sort((x,y)=>x-y);}
    else{type='single';aNorm=typeof ansObj.a==='number'?ansObj.a:ansObj.a.charCodeAt(0)-65;}
  }else if(ansObj&&ansObj.type==='judge'){type='judge';opts=['正确','错误'];aNorm=ansObj.a;}
  else{type=(/_{2,}|＿{2,}|填空/.test(q))?'blank':'short';aNorm=null;}
  const data={id:'q-'+simpleHash(q+'|'+(opts.length>=2?'obj':'sub')+'|'+(type==='essay'?(e||'').slice(0,20):opts.join('/').slice(0,40))),
    exam:'未分类',subject:'',module:module||'常识判断',subtype:'',type,q,o:opts,a:aNorm,e:e||''};
  const errs=validQuestion(data);
  if(noAns&&opts.length>=2)errs.push('未识别到答案，默认为 A，请修正');
  return{ok:errs.length===0,errs,skip:false,data};
}
/* ================= Markdown 题库支持 ================= */
/* 判断是否像 Markdown：标题 / 粗体 / 列表 / 代码块 / 表格 */
function isMarkdown(t){
  return /^#{1,6}\s+\S/m.test(t)
    || /\*\*[^*\n]+\*\*/.test(t)
    || /^\s*[-*+]\s+\S/m.test(t)
    || /```/.test(t)
    || /^\s*\|.*\|\s*$/m.test(t);
}
/* 单行内联清洗：图片 / 链接 / 行内代码 / 粗体 / 斜体 */
function mdInline(s){
  return String(s==null?'':s)
    .replace(/!\[[^\]]*\]\([^)]*\)/g,'')
    .replace(/\[([^\]]*)\]\([^)]*\)/g,'$1')
    .replace(/`([^`]*)`/g,'$1')
    .replace(/\*\*([^*]+)\*\*/g,'$1')
    .replace(/__([^_]+)__/g,'$1')
    .trim();   /* 只处理双星号/双下划线粗体；单星号斜体不处理，避免误伤 3*4*5 这类算式 */
}
/* Markdown 转纯文本：保留题目结构，去掉标记符号 */
function mdToPlain(text){
  let t=String(text||'').replace(/\r\n?/g,'\n').replace(/^\uFEFF/,'');
  t=t.replace(/^---\n[\s\S]*?\n---\n/,'');          /* YAML front matter */
  t=t.replace(/```[\s\S]*?```/g,'');                   /* 代码块整段丢弃 */
  t=t.replace(/<!--[\s\S]*?-->/g,'');                  /* HTML 注释 */
  const out=[];
  t.split('\n').forEach(raw=>{
    let ln=raw.replace(/\t/g,'    ');
    if(/^\s*([-*_])\1{2,}\s*$/.test(ln)){out.push('');return;}        /* 分隔线 */
    if(/^\s*\|[\s:|-]+\|\s*$/.test(ln))return;                       /* 表格分隔行 */
    const tb=ln.match(/^\s*\|(.*)\|\s*$/);                            /* 表格行 */
    if(tb){ln=tb[1].split('|').map(x=>mdInline(x)).join(' | ');out.push(ln);return;}
    const h=ln.match(/^\s*#{1,6}\s+(.*)$/);                             /* 标题 */
    if(h){
      const body=mdInline(h[1]);
      if(/^\s*\d+\s*[、.．)）]/.test(body))ln=body;                     /* 带题号的标题＝题干 */
      else{out.push('## '+body);return;}                                /* 章节标题：保留文字，供模块识别 */
    }
    ln=ln.replace(/^\s*>\s?/,'');                                       /* 引用 */
    ln=ln.replace(/^\s*[-*+]\s+/,'');                                   /* 列表符号 */
    out.push(mdInline(ln));
  });
  return out.join('\n');
}
/* 提取第一个含「题干」列的 Markdown 表格，转成二维数组交给 Excel 解析器复用 */
function mdTableRows(text){
  const lines=String(text||'').split(/\r?\n/);
  const blocks=[];let cur=null;
  const isRow=ln=>/^\s*\|.*\|\s*$/.test(ln);
  lines.forEach(ln=>{
    if(isRow(ln)){
      if(!cur){cur=[];blocks.push(cur);}
      if(/^\s*\|[\s:|-]+\|\s*$/.test(ln))return;
      cur.push(ln.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(x=>mdInline(x)));
    }else cur=null;
  });
  for(let i=0;i<blocks.length;i++){
    const b=blocks[i];
    if(b.length<2)continue;
    if(b[0].some(c=>c.indexOf('题干')>-1||c==='题目'))return b;
  }
  return null;
}
/* 「一、常识判断」「## 判断推理」「【数量关系】」这类章节标题：
   能对上已知模块（含别名）才当标题，用来给后面的题定模块，且不进题干 */
function sectionModule(line){
  let t=String(line||'').trim();
  if(!t||t.length>40)return null;
  t=t.replace(/^#{1,6}\s*/,'');                                       /* Markdown 标题 */
  t=t.replace(/^第[一二三四五六七八九十百]+[部分章节讲单元]\s*[、.．]?\s*/,'');   /* 第X部分 */
  const pm=t.match(/^[一二三四五六七八九十]{1,3}\s*[、.．]\s*(.+)$/);if(pm)t=pm[1];
  const fm=t.match(/^【([^】]{1,20})】/);if(fm)t=fm[1];
  t=t.replace(/[（(【\[].*$/,'').trim();                              /* 去掉「（共 40 题）」这类说明 */
  if(!t)return null;
  if(/^(答案|解析|参考答案|正确答案)$/.test(t))return null;
  if(allModules().indexOf(t)>-1)return t;
  if(MODULE_ALIAS[t])return MODULE_ALIAS[t];
  return null;
}
function parseBlocks(text){
  const out=[];
  const re=/^\s*\d+\s*[、.．)）]\s*/;
  const lines=text.split(/\r?\n/);
  /* 模块要在「这道题开始」时记下来，不能等结束 ——
     章节标题夹在两题之间，用结束时的 curMod 会把上一题算到下一章 */
  const chunks=[];let cur=null,curMod='常识判断',startMod='常识判断';
  lines.forEach(ln=>{
    if(re.test(ln)){
      if(cur)chunks.push({lines:cur,mod:startMod});
      cur=[ln];startMod=curMod;return;
    }
    const mm=sectionModule(ln);
    if(mm){curMod=mm;return;}          /* 模块标题：切换模块，本身不进题干 */
    if(cur){
      /* 不是模块的 Markdown 标题（如「## 注意事项」）也丢掉，别混进题干 */
      if(/^#{1,6}\s/.test(ln.trim()))return;
      cur.push(ln);
    }
  });
  if(cur)chunks.push({lines:cur,mod:startMod});
  chunks.forEach(pack=>{
    const ch=pack.lines;
    let qLines=[],opts=[],ans=null,exp=[];
    let mode='q';
    ch.forEach(ln=>{
      const l=ln.trim();if(!l)return;
      let m=l.match(/^【?答案】?\s*[:：]?\s*(.+)$/)||l.match(/^正确答案\s*[:：]\s*(.+)$/);
      if(m&&mode!=='e'){ans=m[1].trim();mode='ans';return;}
      m=l.match(/^【解析】\s*([\s\S]*)$/)||l.match(/^解析\s*[:：]\s*(.*)$/);
      if(m){exp.push(m[1]);mode='e';return;}
      m=l.match(/^([A-H])\s*[.、．,，:：]\s*(.*)$/);
      if(m&&(mode==='q'||mode==='o')){
        const segs=(m[2]||'').split(/\s+(?=[B-H]\s*[.、．,，:：])/);
        segs.forEach((sg,si)=>{
          const mm=(si>0)?sg.match(/^[B-H]\s*[.、．,，:：]\s*(.*)$/):null;
          opts.push(mm?mm[1]:sg);
        });
        mode='o';return;
      }
      /* 答案之后出现的行（页码、备注、下一个章节标题等）一律不并入题干 */
      if(mode==='e'||mode==='ans'){exp.push(l);return;}
      qLines.push(l);
    });
    const q=qLines.join(' ').replace(/^\s*\d+\s*[、.．)）]\s*/,'').trim();
    if(!q)return;
    out.push(makeItem(q,opts,ans&&parseAnsStr(ans),exp.join('\n').trim(),!ans,pack.mod));
  });
  return out;
}
function parseLines(text){
  const out=[];
  text.split(/\r?\n/).forEach(ln=>{
    const l=ln.trim();if(!l||l.indexOf('|')<0)return;
    const f=l.split('|').map(x=>x.trim());
    if(f.length<3)return;
    let ai=-1;
    for(let i=f.length-1;i>=1;i--){if(parseAnsStr(f[i])){ai=i;break;}}
    if(ai<1)return;
    const ansObj=parseAnsStr(f[ai]);
    const opts=f.slice(1,ai);
    const e=f.slice(ai+1).join('；');
    out.push(makeItem(f[0],opts,ansObj,e,false));
  });
  return out;
}
function fallbackItem(text){
  return makeItem(text.replace(/^\s*\d+\s*[、.．)）]\s*/,'').trim(),[],null,'',false);
}
function parseImportJSON(text){
  const obj=JSON.parse(text);
  const qs=Array.isArray(obj)?obj:(Array.isArray(obj.questions)?obj.questions:null);
  if(!qs)throw new Error('JSON 需要是题目数组，或含 questions 字段的对象');
  const papers=(Array.isArray(obj)?[]:(obj.papers||[])).filter(p=>p&&p.id&&p.title);
  const images=(!Array.isArray(obj)&&obj.images&&typeof obj.images==='object')?obj.images:{};
  const items=qs.map(raw=>{
    const nq=normQuestion(raw,0);
    const errs=validQuestion(nq);
    return{ok:errs.length===0,errs,skip:false,data:nq};
  });
  return{items,papers,images};
}
/* 本地 CSV：支持引号、转义双引号、逗号及制表符，不依赖已删除的 Excel 组件。 */
function csvQuestionRows(text){
  const first=String(text||'').split(/\r?\n/,1)[0];
  const sep=first.indexOf('\t')>=0?'\t':',';
  if(first.indexOf(sep)<0)return null;
  const rows=[];let row=[],cell='',quoted=false;
  const src=String(text||'').replace(/^\uFEFF/,'');
  for(let i=0;i<src.length;i++){
    const c=src[i];
    if(c==='"'){
      if(quoted&&src[i+1]==='"'){cell+='"';i++;}
      else quoted=!quoted;
    }else if(!quoted&&c===sep){row.push(cell);cell='';}
    else if(!quoted&&(c==='\n'||c==='\r')){
      if(c==='\r'&&src[i+1]==='\n')i++;
      row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';
    }else cell+=c;
  }
  if(quoted)throw new Error('CSV 引号未闭合');
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  if(!rows.length||!rows[0].some(x=>/^(题干|题目|问题|q)$/i.test(x.trim())))return null;
  return rows;
}
function autoParseText(text){
  const raw=String(text||'').trim();
  if(!raw)return{items:[],papers:[]};
  if(raw[0]==='['||raw[0]==='{'){
    try{return parseImportJSON(raw);}catch(e){/* 继续用文本规则 */}
  }
  const csv=csvQuestionRows(raw);
  if(csv){const items=xlsxToItems(csv);if(items.length)return{items:items,papers:[]};}
  /* Markdown：先试表格（含题干列），再转纯文本走常规解析 */
  const md=isMarkdown(raw);
  if(md){
    const rows=mdTableRows(raw);
    if(rows){
      try{
        const items=xlsxToItems(rows);
        if(items&&items.length)return{items:items,papers:[]};
      }catch(e){/* 不是题库表格，继续按文本解析 */}
    }
  }
  const t=md?mdToPlain(raw):raw;
  const blocks=parseBlocks(t);
  const hasStructured=blocks.some(it=>it.data.o.length>=2||it.errs.indexOf('未识别到答案，默认为 A，请修正')<0);
  if(blocks.length>1||(blocks.length===1&&hasStructured))return{items:blocks,papers:[]};
  const lines=parseLines(t);
  if(lines.length>0)return{items:lines,papers:[]};
  if(blocks.length===1)return{items:blocks,papers:[]};
  return{items:[fallbackItem(t)],papers:[]};
}
function autoParseIntoPreview(text){
  const r=autoParseText(text);
  if(!r.items.length){toast('未能识别出任何题目，请检查格式或点“查看格式示例”','err');return;}
  openPreview(r);
}

/* ---- 导入页 ---- */
PAGES.importPage={title:'导入题库'};
const ANY_FILE_CARD='<div class="card"><b style="font-size:14px">任意格式直接导入</b>'
  +'<div class="file-note" style="margin:4px 0 8px">选文件即可，支持 JSON / CSV / TXT / MD / Markdown，按扩展名自动识别</div>'
  +'<input type="file" accept="'+IMP_ACCEPT_ALL+'" data-chg="imp.anyfile">'
  +'<div class="ai-status" id="any-status"></div></div>';
PAGES.importPage.render=function(el){
  const mode=deviceMode();
  const tabs=[['paste','粘贴文本'],['dual','双文件'],['ai','AI 解析']];
  let body='';
  const pasteCard='<div class="card">'
    +'<label class="fl">粘贴题目文本</label>'
    +'<div class="file-note" style="margin:-4px 0 8px">JSON 和 Markdown 直接粘进来即可，会自动识别；也可以在上面选文件。</div>'
    +'<textarea rows="10" data-imp="draft" placeholder="直接粘贴：JSON 题库 / Markdown 表格 / Markdown 正文 / 分题块式 / 行式简洁，点击下方按钮自动识别">'+esc(IMP.draft)+'</textarea>'
    +'<div class="row" style="margin-top:12px">'
    +'<button class="btn btn-primary btn-big" data-act="imp.auto">自动识别并预览</button>'
    +'<button class="btn btn-ghost" data-act="imp.examples">查看格式示例</button></div>'
    +'<div class="file-note">自动匹配顺序：JSON → Markdown 表格 → Markdown 正文 → 分题块式（题号 /【答案】/【解析】/ A.B.C.D.）→ 行式简洁 → 整段一题。兼容全角半角、A./A、/A．、答案：/【答案】、ABC / A,B,C 等写法，Markdown 的 #、**、- 等标记会自动去掉，全部解析在本地完成。</div></div>';
  if(mode==='mobile'){
    body=pasteCard;
  }else{
    let tabbar='<div class="tabbar">'+tabs.map(t=>'<div class="tb'+(IMP.tab===t[0]?' on':'')+'" data-act="imp.tab" data-t="'+t[0]+'">'+t[1]+'</div>').join('')+'</div>';
    let pane='';
    if(IMP.tab==='paste')pane=pasteCard;
    else if(IMP.tab==='dual'){
      pane='<div class="card"><b>双文件导入：题目文件 + 答案文件</b>'
        +'<label class="fl" style="margin-top:10px">① 题目文件（.txt / .md / .csv）</label>'
        +'<input type="file" accept="'+IMP_ACCEPT_ALL+'" data-chg="imp.qfile">'
        +'<div class="ai-status" id="qfile-status">'+esc(IMP.qStatus||'')+'</div>'
        +'<label class="fl" style="margin-top:10px">② 答案文件（.txt / .md / .csv，形如「1. A」每行一条）</label>'
        +'<input type="file" accept="'+IMP_ACCEPT_ALL+'" data-chg="imp.afile">'
        +'<div class="ai-status" id="afile-status">'+esc(IMP.aStatus||'')+'</div>'
        +'<button class="btn btn-primary" style="margin-top:12px" data-act="imp.dual">提取并匹配答案 → 预览</button>'
        +'<div class="file-note">匹配规则：先按答案文件里的题号对号入座；若答案文件题号不连续，则按顺序逐条匹配未识别答案的客观题。适用于「题目册 + 答案册」分开的纯文本，全部本地解析。</div></div>';
    }else{
      const cfg=lsJson(K.ai,{});
      pane='<div class="card"><b>AI 设置（仅电脑端显示）</b>'
        +'<label class="fl">API 地址（OpenAI 兼容 chat/completions）</label>'
        +'<input id="ai-url" value="'+esc(cfg.url||'https://api.openai.com/v1/chat/completions')+'">'
        +'<label class="fl">模型名</label><input id="ai-model" value="'+esc(cfg.model||'gpt-4o-mini')+'">'
        +'<label class="fl">API Key（密码框，仅存本机；不随备份导出）</label>'
        +'<input type="password" id="ai-key" autocomplete="off" value="'+esc(cfg.key||'')+'" placeholder="sk-…">'
        +'<div class="row" style="margin-top:10px"><button class="btn btn-primary btn-sm" data-act="ai.save">保存设置</button>'
        +'<button class="btn btn-danger btn-sm" data-act="ai.clear">清除 Key</button></div></div>'
        +'<div class="card"><label class="fl">粘贴要解析的题目文本</label>'
        +'<textarea rows="8" data-imp="aiText">'+esc(IMP.aiText)+'</textarea>'
        +'<div class="row" style="margin-top:12px">'
        +'<button class="btn btn-primary" id="ai-run" data-act="ai.run">AI 解析</button>'
        +'<button class="btn btn-ghost" id="ai-cancel" style="display:none" data-act="ai.cancel">取消</button></div>'
        +'<div class="ai-status" id="ai-status">AI 会把文本整理为严格 JSON 题目（自动校验字段与白名单），失败可回退本地规则解析。请求超时 60 秒。</div>'
        +'<button class="btn-link" id="ai-fallback" style="display:none" data-act="ai.fallback">回退到本地规则解析</button></div>';
    }
    body=tabbar+pane;
  }
  el.innerHTML=topbarHTML('导入题库')
    +'<div class="row" style="margin:10px 4px 2px;flex-wrap:wrap"><span class="mode-badge '+(mode==='desktop'?'pc':'')+'">'+(mode==='mobile'?'📱 手机模式 · 粘贴识别':'🖥 电脑模式 · '+tabs.length+' 种导入方式')+'</span>'
    +'<button class="btn-link" data-act="imp.switchMode">切换模式</button></div>'
    +ANY_FILE_CARD
    +body
    +'<div class="card card-sm" style="text-align:center;margin-top:4px">'
    +'<button class="btn-link" data-act="bm.open">'+icon('trash',15)+' 选择删除部分题目</button><span class="muted"> ｜ </span>'
    +'<button class="btn-link" style="color:var(--err)" data-act="imp.clearAll">清空题库（全部）</button>'
    +'<div class="file-note">可只删除勾选的题目；清空会删除全部题目、套卷、错题与收藏（累计作答统计保留，可通过备份恢复）。</div></div>';
};
ACTIONS['imp.tab']=d=>{IMP.tab=d.t;render();};
ACTIONS['imp.switchMode']=()=>{
  sessionStorage.setItem('qt_force_mode',deviceMode()==='mobile'?'desktop':'mobile');
  render();
};
ACTIONS['imp.clearAll']=()=>{
  qtConfirm({title:'清空题库',msg:'将删除题库中现有全部题目（当前 '+BANK.length+' 道）、'+PAPERS.length+' 套套卷，以及与之关联的错题、收藏和导入的配图。\n累计作答统计会保留；清空后可通过“导入备份”恢复。\n（网页图片缓存不在此处，可在「关于 → 存储占用」单独清理）',okText:'清空',danger:true,onOk:()=>{
    BANK=[];PAPERS=[];WRONG=[];FAV=[];
    IMG_TAB={};saveImgTab();          /* 配图跟着题库一起清，否则占用空间不下降 */
    saveBank();saveWrong();saveFav();
    toast('题库已清空，可导入新题目','ok');
    render();
  }});
};
ACTIONS['imp.auto']=()=>{
  if(!IMP.draft.trim()){toast('请先粘贴题目内容','warn');return;}
  autoParseIntoPreview(IMP.draft);
};
/* 大批量（如整份真题库）逐条预览会生成上万行 DOM，手机直接卡死，
   所以超过这个数量就跳过预览、直接合并导入 */
const BIG_IMPORT=300;
function importParsed(r){
  if(r.items.length>BIG_IMPORT){
    const okN=r.items.filter(i=>i.ok&&!i.skip).length;
    const pN=(r.papers||[]).length;
    qtConfirm({title:'大批量导入',
      msg:'识别到 '+r.items.length+' 题（可导入 '+okN+' 题）'+(pN?('、'+pN+' 套卷'):'')+'。\n逐条预览会让手机卡死，将直接合并导入。完全相同（含材料与配图）的题会复用已有题目；内容有差异时由你确认。套卷中的位置会保留。',
      okText:'直接导入',
      onOk:()=>{doMergeImport(r.items.filter(i=>i.ok&&!i.skip),r.papers||[],r.images||{});}});
    return;
  }
  openPreview(r);
}
/* 合并导入：用 id 索引做 O(n) 合并，避免几万题时 O(n²) 卡死 */
/* ================= 去重：只有题干+选项+答案+解析全部一致才算重复 ================= */
function qNormTxt(x){return String(x==null?'':x).replace(/\s+/g,' ').trim();}
/* 同题必须包含同一份材料和配图；图形题不能只按通用题干去重。 */
function qMediaKey(u){
  if(typeof u!=='string')return '';
  return u.charAt(0)==='@'?(IMG_TAB[u.slice(1)]||u):u;
}
function qStemKey(q){
  return JSON.stringify([qNormTxt(q.q),qNormTxt(q.mat),
    (q.imgs&&q.imgs.length?q.imgs:(q.img?[q.img]:[])).map(qMediaKey),
    (q.oimg||[]).map(qMediaKey),qMediaKey(q.matImg)]);
}
function qContentKey(q){
  return JSON.stringify([q.type,qStemKey(q),(q.o||[]).map(qNormTxt),
    Array.isArray(q.a)?q.a:String(q.a==null?'':q.a),qNormTxt(q.e),
    (q.eimgs||[]).map(qMediaKey)]);
}
function qFingerprint(q){return simpleHash(qContentKey(q));}
function importImageRefs(items,images){
  if(!images||typeof images!=='object')return items;
  const map=Object.create(null);let changed=false;
  Object.keys(images).forEach(key=>{
    let use=key,n=2;
    while(Object.prototype.hasOwnProperty.call(IMG_TAB,use)&&IMG_TAB[use]!==images[key])use=key+'-import'+n++;
    map[key]=use;
    if(!Object.prototype.hasOwnProperty.call(IMG_TAB,use)){IMG_TAB[use]=images[key];changed=true;}
  });
  if(changed)saveImgTab();
  const ref=u=>typeof u==='string'&&u.charAt(0)==='@'&&map[u.slice(1)]?'@'+map[u.slice(1)]:u;
  return items.map(it=>{
    const q=Object.assign({},it.data);
    q.img=ref(q.img);q.matImg=ref(q.matImg);
    ['imgs','oimg','eimgs'].forEach(k=>{if(Array.isArray(q[k]))q[k]=q[k].map(ref);});
    return Object.assign({},it,{data:q});
  });
}
let DUP={items:[],papers:[],stat:null};
function doMergeImport(items,papers,images){
  items=importImageRefs(items,images);
  const idx=Object.create(null);
  BANK.forEach((q,i)=>{idx[q.id]=i;});
  /* 指纹 → 保留的那道题的 id（跨批、批内都用它） */
  const fpKeep=Object.create(null);
  BANK.forEach(q=>{const f=qFingerprint(q);(fpKeep[f]=fpKeep[f]||[]).push(q.id);});
  const byStem=Object.create(null);
  BANK.forEach(q=>{const k=qStemKey(q);(byStem[k]=byStem[k]||[]).push(q);});

  let add=0,skipExact=0;
  const conflicts=[];
  const remap=Object.create(null);   /* 被合并掉的 id → 保留下来的 id，用于修试卷引用 */
  uniqueBatchIds(items.map(it=>normQuestion(it.data,0))).forEach(nq=>{
    const f=qFingerprint(nq),stem=qStemKey(nq);
    /* 哈希只筛候选，逐项确认内容一致，避免碰撞或不同图形被误合并。 */
    const exact=(fpKeep[f]||[]).find(id=>qContentKey(BANK[idx[id]])===qContentKey(nq));
    if(exact){skipExact++;if(exact!==nq.id)remap[nq.id]=exact;return;}
    /* 2) id 撞上但内容变了 → 冲突（同 id 已在库里，卷子引用本来就有效） */
    const old=idx[nq.id]!=null?BANK[idx[nq.id]]:null;
    if(old){conflicts.push({incoming:nq,existing:old,why:'id'});return;}
    /* 3) 题干一样但内容不同 → 冲突，含同一文件内部 */
    const same=byStem[stem];
    if(same&&same.length){
      conflicts.push({incoming:nq,existing:same[0],why:'stem'});
      /* 冲突题要等用户确认才入库；卷子引用先指到保留的那道，绝不缺题 */
      if(same[0].id!==nq.id)remap[nq.id]=same[0].id;
      return;
    }
    idx[nq.id]=BANK.length;BANK.push(nq);add++;
    (fpKeep[f]=fpKeep[f]||[]).push(nq.id);
    (byStem[stem]=byStem[stem]||[]).push(nq);   /* 批内后一道同题干的题也要能判冲突 */
  });

  const pidx=Object.create(null);
  PAPERS.forEach((p,i)=>{pidx[p.id]=i;});
  let pAdd=0;
  const paperRefs=Object.create(null);
  (papers||[]).forEach(source=>{
    if(!source||!source.id||!source.title)return;
    const p=Object.assign({},source);
    p.questionIds=(source.questionIds||[]).map((id,pos)=>{
      (paperRefs[id]=paperRefs[id]||[]).push({paperId:p.id,pos:pos});
      return remap[id]||id;
    });
    const k=pidx[p.id];
    if(k!=null)PAPERS[k]=p;else{pidx[p.id]=PAPERS.length;PAPERS.push(p);pAdd++;}
  });
  /* 只映射本次导入卷，不修改其他旧卷；保留每一题的位置和顺序。 */
  const remapN=Object.keys(remap).length;
  saveBank();

  const stat={add:add,skip:skipExact,pAdd:pAdd,conflicts:conflicts.length,remap:remapN};
  if(conflicts.length){
    DUP={items:conflicts.map(c=>({
           existingId:c.existing.id,
           paperRefs:paperRefs[c.incoming.id]||[],
           existing:JSON.parse(JSON.stringify(c.existing)),
           incoming:JSON.parse(JSON.stringify(c.incoming)),
           ansTxt:{ex:dupAnsInput(c.existing),in:dupAnsInput(c.incoming)},
           why:c.why,choice:'keep',applied:false,editing:false
         })),
         papers:papers||[],stat:stat};
    toast('已导入 '+add+' 题，跳过 '+skipExact+' 道完全相同的；还有 '+conflicts.length+' 道需要你确认','warn');
    goTo('dupReview',{});return;
  }
  toast('导入完成：新增 '+add+' 题'
    +(skipExact?('，跳过 '+skipExact+' 道完全相同的题'):'')
    +(pAdd?('，'+pAdd+' 套卷'):''),'ok');
  goHome();
}

/* ================= 重复题确认页 ================= */
PAGES.dupReview={title:'重复题确认'};
/* 把答案转成好编辑的文字：单选 A/B/C，多选 A,C，判断 正确/错误，填空用 / 分隔 */
function dupAnsInput(q){
  const t=q.type;
  const L='ABCDEFGH';
  if(t==='short')return '';
  if(t==='blank')return Array.isArray(q.a)?q.a.join('/'):String(q.a==null?'':q.a);
  if(t==='judge')return q.a===1?'错误':(q.a===0?'正确':'');
  if(t==='multiple')return (q.a||[]).map(i=>L[i]||'').filter(Boolean).join(',');
  if(typeof q.a==='number'&&q.a>=0)return L[q.a]||String(q.a+1);
  return '';
}
/* 把用户输入的文字解析回内部结构；解析不了返回 undefined */
function dupParseAns(txt,type,n){
  const s=String(txt||'').trim();
  if(type==='short')return null;
  if(type==='blank')return s.split(/[\/、,，]/).map(x=>x.trim()).filter(Boolean);
  if(type==='judge'){
    if(/^(正确|对|√|是|T|TRUE|1)$/i.test(s))return 0;
    if(/^(错误|错|×|否|F|FALSE|0)$/i.test(s))return 1;
    return undefined;
  }
  const L='ABCDEFGH';
  const toIdx=x=>{
    const c=String(x).toUpperCase();
    if(/^[A-H]$/.test(c))return c.charCodeAt(0)-65;
    const k=parseInt(c,10);
    if(!isFinite(k))return -1;
    if(k>=1&&k<=n)return k-1;
    if(k>=0&&k<n)return k;
    return -1;
  };
  if(type==='multiple'){
    const out=[];
    String(s).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean).forEach(x=>{
      const i=toIdx(x);if(i>=0&&i<n&&out.indexOf(i)<0)out.push(i);
    });
    return out.length?out.sort((a,b)=>a-b):undefined;
  }
  const one=s.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!one)return undefined;
  const i=toIdx(one);
  return (i>=0&&i<n)?i:undefined;
}
PAGES.dupReview.render=function(el){
  if(!DUP.items.length){
    el.innerHTML=topbarHTML('重复题确认')+'<div class="card miss-empty">没有需要确认的题</div>';return;
  }
  const st=DUP.stat||{};
  const left=DUP.items.filter(x=>!x.applied).length;
  let cards='';
  DUP.items.forEach((it,i)=>{
    const a=it.existing,b=it.incoming;
    const chosen=it.applied?it.choice:'';
    const tagCls=v=>chosen===v?'btn-primary':'btn-plain';
    if(it.editing){
      const form=(q,pre,who)=>
        '<div class="dup-col"><div class="dup-who">'+who+'</div>'
        +'<label class="fl">题干</label><textarea rows="3" data-i="'+i+'" data-dupedit="'+pre+'.q">'+esc(q.q||'')+'</textarea>'
        +'<label class="fl">选项（每行一个）</label><textarea rows="'+(Math.max(3,(q.o||[]).length)) +'" data-i="'+i+'" data-dupedit="'+pre+'.o">'+esc((q.o||[]).join('\n'))+'</textarea>'
        +'<label class="fl">答案</label><input data-i="'+i+'" data-dupedit="'+pre+'.a" value="'+esc((it.ansTxt&&it.ansTxt[pre])||'')+'" placeholder="单选 A；多选 A,C；判断 正确/错误；填空用 / 分隔">'
        +'<label class="fl">解析</label><textarea rows="4" data-i="'+i+'" data-dupedit="'+pre+'.e">'+esc(q.e||'')+'</textarea>'
        +'</div>';
      cards+='<div class="card card-sm dup-card">'
        +'<div class="row" style="justify-content:space-between;flex-wrap:nowrap">'
        +'<b style="font-size:14px">第 '+(i+1)+' 道 · 修改中</b></div>'
        +form(a,'ex','题库里已有')
        +form(b,'in','本次导入')
        +'<div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px">'
        +'<button class="btn btn-primary btn-sm" data-act="dup.saveEdit" data-i="'+i+'">保存修改</button>'
        +'<button class="btn btn-plain btn-sm" data-act="dup.cancelEdit" data-i="'+i+'">取消</button>'
        +'</div>'
        +'<div class="file-note">两边都能改，改完点「保存修改」回到选择界面。</div>'
        +'</div>';
    }else{
      const block=(q,who)=>
        '<div class="dup-col"><div class="dup-who">'+who+'</div>'
        +'<div class="dup-q">'+esc(String(q.q||''))+'</div>'
        +(q.o&&q.o.length?'<div class="dup-line">选项：'+esc(q.o.join(' / '))+'</div>':'')
        +'<div class="dup-line">答案：<b>'+esc(fmtAns(q,q.a))+'</b></div>'
        +'<div class="dup-line">解析：'+esc(String(q.e||'（无）'))+'</div>'
        +'</div>';
      cards+='<div class="card card-sm dup-card">'
        +'<div class="row" style="justify-content:space-between;flex-wrap:nowrap">'
        +'<b style="font-size:14px">第 '+(i+1)+' 道</b>'
        +(it.applied?'<span class="dup-tags">已保存</span>':'')
        +'</div>'
        +block(a,'题库里已有')
        +block(b,'本次导入')
        +'<div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px">'
        +'<button class="btn btn-sm '+tagCls('keep')+'" data-act="dup.choose" data-i="'+i+'" data-v="keep">保留现有的</button>'
        +'<button class="btn btn-sm '+tagCls('take')+'" data-act="dup.choose" data-i="'+i+'" data-v="take">用导入的</button>'
        +'<button class="btn btn-sm '+tagCls('both')+'" data-act="dup.choose" data-i="'+i+'" data-v="both">两道都留</button>'
        +'<button class="btn btn-sm btn-plain" data-act="dup.edit" data-i="'+i+'">修改</button>'
        +'</div>'
        +(it.applied
          ?'<div class="file-note">已保存：'+(it.choice==='keep'?'保留现有的':(it.choice==='take'?'用导入的':'两道都留'))+'</div>'
          :'<div class="file-note">还没选，默认「保留现有的」。</div>')
        +'</div>';
    }
  });
  el.innerHTML=topbarHTML('重复题确认')
    +'<div class="card card-sm"><div class="muted">已导入 '+(st.add||0)+' 题'
      +(st.skip?'，自动跳过 '+(st.skip)+' 道完全相同的题':'')
      +'。下面 '+DUP.items.length+' 道与题库里已有题目部分相同，请选择保留哪个；'
      +'想合并内容就点「修改」，两边都能改。</div></div>'
    +'<div class="row" style="margin:6px 4px 10px;gap:8px;flex-wrap:wrap">'
    +'<button class="btn btn-plain btn-sm" data-act="dup.all" data-v="keep">全部保留现有的</button>'
    +'<button class="btn btn-plain btn-sm" data-act="dup.all" data-v="take">全部用导入的</button>'
    +'</div>'
    +cards
    +'<button class="btn btn-primary" style="width:100%;margin-top:8px" data-act="dup.done">完成（'+left+' 道未选，按保留现有的处理）</button>'
    +'<div class="file-note" style="text-align:center;margin-top:8px">选完记得点「完成」，否则本次导入的这些题不会落库。</div>';
  /* 修改界面：输入即写进副本，切走再回来不会丢 */
  el.querySelectorAll('[data-dupedit]').forEach(inp=>{
    const i=parseInt(inp.dataset.i,10);
    const parts=String(inp.dataset.dupedit).split('.');
    const pre=parts[0],f=parts[1];
    inp.addEventListener('input',()=>{
      const it=DUP.items[i];if(!it)return;
      const q=pre==='ex'?it.existing:it.incoming;
      if(f==='o')q.o=inp.value.split('\n').map(x=>x.trim()).filter(x=>x!=='');
      else if(f==='a'){it.ansTxt=it.ansTxt||{};it.ansTxt[pre]=inp.value;}
      else q[f]=inp.value;
    });
  });
};
function applyDupItem(it){
  if(it.applied)return;
  const k=BANK.findIndex(q=>q.id===it.existingId);
  if(it.choice==='both'){
    if(k>=0)BANK[k]=it.existing;else BANK.push(it.existing);
    const inc=Object.assign({},it.incoming);
    let nid=it.bothId||inc.id,n=2;
    if(!it.bothId)while(BANK.some(q=>q.id===nid)){nid=inc.id+'-dup'+n;n++;}
    inc.id=nid;it.bothId=nid;
    const previous=BANK.findIndex(q=>q.id===nid);
    if(previous>=0)BANK[previous]=inc;else BANK.push(inc);
    it.result=inc;
  }else if(it.choice==='take'){
    const inc=Object.assign({},it.incoming,{id:it.existingId});
    if(k>=0)BANK[k]=inc;else BANK.push(inc);
    it.result=inc;
  }else{
    if(k>=0)BANK[k]=it.existing;else BANK.push(it.existing);
    it.result=it.existing;
  }
  (it.paperRefs||[]).forEach(ref=>{
    const paper=PAPERS.find(p=>p.id===ref.paperId);
    if(paper&&Array.isArray(paper.questionIds))paper.questionIds[ref.pos]=it.result.id;
  });
  it.applied=true;
}
ACTIONS['dup.choose']=d=>{
  const it=DUP.items[parseInt(d.i,10)];if(!it)return;
  it.choice=d.v;it.applied=false;
  applyDupItem(it);saveBank();render();
};
ACTIONS['dup.edit']=d=>{
  const it=DUP.items[parseInt(d.i,10)];if(!it)return;
  it.editing=true;render();
};
ACTIONS['dup.cancelEdit']=d=>{
  const it=DUP.items[parseInt(d.i,10)];if(!it)return;
  it.editing=false;render();
};
ACTIONS['dup.saveEdit']=d=>{
  const it=DUP.items[parseInt(d.i,10)];if(!it)return;
  const bad=[];
  [['ex','题库里已有'],['in','本次导入']].forEach(([pre,who])=>{
    const q=pre==='ex'?it.existing:it.incoming;
    if(!String(q.q||'').trim()){bad.push(who+'的题干不能为空');return;}
    const ans=dupParseAns(it.ansTxt&&it.ansTxt[pre],q.type,(q.o||[]).length);
    if(ans===undefined)bad.push(who+'的答案无法识别');
    else q.a=ans;
  });
  if(bad.length){toast(bad[0],'err');return;}
  it.editing=false;
  it.applied=false;
  toast('已保存修改','ok');
  render();
};
ACTIONS['dup.all']=d=>{
  DUP.items.forEach(it=>{it.choice=d.v;it.applied=false;applyDupItem(it);});
  saveBank();render();
  toast(d.v==='take'?'已全部用导入的':'已全部保留现有的','ok');
};
ACTIONS['dup.done']=()=>{
  DUP.items.forEach(it=>{
    if(it.applied)return;
    it.choice=it.choice||'keep';
    applyDupItem(it);
  });
  saveBank();
  const st=DUP.stat||{};
  toast('导入完成：新增 '+(st.add||0)+' 题，确认重复 '+DUP.items.length+' 道','ok');
  DUP={items:[],papers:[],stat:null};
  goHome();
};
ACTIONS['imp.json']=()=>{
  try{
    const r=parseImportJSON(IMP.jsonDraft);
    if(!r.items.length)throw new Error('没有解析到题目');
    importParsed(r);
  }catch(e){toast('JSON 解析失败：'+(e.message||e),'err');}
};
/* 任意格式：按扩展名分发到已有的解析器，不用再切标签 */
CHANGES['imp.anyfile']=async(d,t)=>{
  const f=t.files&&t.files[0];if(!f)return;
  const st=$id('any-status');
  const say=x=>{if(st)st.textContent=x;};
  const name=(f.name||'').toLowerCase();
  const readText=()=>f.text?f.text():new Promise((res,rej)=>{
    const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('文件读取失败'));r.readAsText(f);
  });
  try{
    if(/\.json$/.test(name)){
      say('读取 JSON…');
      IMP.jsonDraft=await readText();
      say('');ACTIONS['imp.json']();return;
    }
    if(/\.(md|markdown|txt|csv)$/.test(name)){IMP.mdFile=f;say('解析文本…');ACTIONS['imp.md']();return;}
    say('不支持的文件类型：'+f.name);
    toast('不支持的文件类型','err');
  }catch(e){
    say('导入失败：'+((e&&e.message)||e));
    toast('导入失败','err');
  }finally{
    t.value='';
  }
};
ACTIONS['imp.md']=async()=>{
  const setSt=x=>{};
  try{
    let text='';
    if(IMP.mdFile){setSt('正在读取文件…');text=await extractFileText(IMP.mdFile);}
    if(!text||!text.trim()){toast('请先选择 .md 文件或粘贴内容','warn');return;}
    setSt('识别中…');
    const r=autoParseText(text);
    if(!r.items.length)throw new Error('没有识别到题目');
    setSt('识别到 '+r.items.length+' 条，进入预览…');
    openPreview(r);
  }catch(e){
    setSt('解析失败：'+(e.message||e));
    toast('Markdown 解析失败','err');
  }
};
CHANGES['imp.qfile']=(d,t)=>{IMP.qFile=(t.files&&t.files[0])||null;IMP.qStatus=IMP.qFile?('已选择：'+IMP.qFile.name):'';const st=$id('qfile-status');if(st)st.textContent=IMP.qStatus;};
CHANGES['imp.afile']=(d,t)=>{IMP.aFile=(t.files&&t.files[0])||null;IMP.aStatus=IMP.aFile?('已选择：'+IMP.aFile.name):'';const st=$id('afile-status');if(st)st.textContent=IMP.aStatus;};
async function extractFileText(file){
  const name=(file.name||'').toLowerCase();
  if(/\.(txt|md|markdown|csv|json)$/.test(name)){
    if(file.text)return await file.text();
    return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('文件读取失败'));r.readAsText(file);});
  }
  throw new Error('不支持的文件类型：'+file.name+'（支持 .json / .csv / .txt / .md / .markdown）');
}
/* ================= 统一导入格式 =================
   题库 / 每日学习 / 教材 三个入口用同一串 accept，避免换个地方就要转格式 */
async function extractAnyText(file){
  const name=(file.name||'').toLowerCase();
  if(/\.json$/.test(name)){
    const txt=file.text?await file.text():await new Promise((res,rej)=>{
      const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('文件读取失败'));r.readAsText(file);
    });
    let json=null;
    try{json=JSON.parse(txt);}catch(e){throw new Error('不是合法的 JSON 文件：'+(e&&e.message||''));}
    return {isJson:true,text:txt,json:json};
  }
  if(/\.csv$/.test(name)){
    /* CSV 当纯文本读，不必加载表格组件 */
    const txt=file.text?await file.text():await new Promise((res,rej)=>{
      const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('文件读取失败'));r.readAsText(file);
    });
    return {isJson:false,text:txt,json:null};
  }
  const text=await extractFileText(file);
  return {isJson:false,text:text,json:null};
}
function parseAnswerFile(text){
  const m=new Map();
  String(text||'').split(/\r?\n/).forEach(ln=>{
    const t=ln.trim();if(!t)return;
    const mm=t.match(/^(?:第\s*)?(\d{1,3})\s*(?:题)?\s*[、.．)）:：]?\s*(.+)$/);
    if(mm&&!m.has(parseInt(mm[1],10)))m.set(parseInt(mm[1],10),mm[2].trim());
  });
  return m;
}
ACTIONS['imp.dual']=async()=>{
  const qs=$id('qfile-status'),as=$id('afile-status');
  if(!IMP.qFile){toast('请先选择题目文件','warn');return;}
  if(!IMP.aFile){toast('请再选择答案文件','warn');return;}
  const setQ=s=>{if(qs)qs.textContent=s;},setA=s=>{if(as)as.textContent=s;};
  try{
    setQ('正在提取题目文件…');
    const qText=await extractFileText(IMP.qFile);
    setA('正在提取答案文件…');
    const aText=await extractFileText(IMP.aFile);
    setQ('题目提取完成，正在解析…');
    const r=autoParseText(qText);
    if(!r.items.length){setQ('题目文件未能识别出题目，可把内容复制到「粘贴文本」里确认格式。');toast('未识别出题目','err');return;}
    const ansMap=parseAnswerFile(aText);
    const need=[];
    r.items.forEach((it,i)=>{if(it.data.o.length>=2&&it.errs.some(x=>x.indexOf('未识别到答案')>-1))need.push(i);});
    let hit=0,seq=0;const miss=[];
    need.forEach(i=>{
      seq++;
      let raw=ansMap.get(i+1);
      if(raw==null&&ansMap.size===need.length)raw=ansMap.get(seq);
      if(raw==null){miss.push(i+1);return;}
      const d=r.items[i].data;
      const ansObj=parseAnsStr(raw);
      if(ansObj){
        if(ansObj.type==='multiple'&&d.o.length>=2)d.type='multiple';
        if(d.type==='judge'&&ansObj.type==='single')d.type='single';
        d.a=parseAField(d.type,raw);
      }
      const errs=validQuestion(d);
      r.items[i].errs=errs;r.items[i].ok=errs.length===0;
      hit++;
    });
    setA('答案文件共 '+ansMap.size+' 条，匹配成功 '+hit+' 题'+(miss.length?('；未匹配：第 '+miss.join('、')+' 题（默认答案 A，可在预览修正）'):''));
    setQ('共识别 '+r.items.length+' 题，进入预览…');
    openPreview(r);
  }catch(e){
    setQ('双文件导入失败：'+(e.message||e));
    toast('双文件导入失败','err');
  }
};
function xlsxToItems(rows){
  if(!rows||!rows.length)return[];
  const norm=h=>String(h==null?'':h).toLowerCase().replace(/[\s　]/g,'').replace(/[ａ-ｚＡ-Ｚ０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0));
  let hi=-1,head=null;
  for(let i=0;i<Math.min(3,rows.length);i++){
    const cells=(rows[i]||[]).map(norm);
    if(cells.some(c=>c.indexOf('题干')>-1||c==='题目'||c==='question')){hi=i;head=rows[i];break;}
  }
  if(hi<0)throw new Error('前 3 行内未找到表头（需包含「题干」列）');
  const col={};
  head.forEach((h,c)=>{
    const n=norm(h);if(!n)return;
    if(n.indexOf('题干')>-1||n==='题目'||n==='question'){if(col.q==null)col.q=c;}
    else if(n.indexOf('答案')>-1||n==='answer'){if(col.ans==null)col.ans=c;}
    else if(n.indexOf('解析')>-1||n==='说明'||n==='explanation'){if(col.e==null)col.e=c;}
    else if(n==='题型'||n==='type'){col.type=c;}
    else if(n==='模块'||n==='module'){col.module=c;}
    else if(n==='子类型'||n==='subtype'){col.subtype=c;}
    else if(n==='考试'||n.indexOf('考试类型')>-1||n==='exam'){col.exam=c;}
    else if(n==='科目'||n==='subject'){col.subject=c;}
    else{const om=n.match(/^(?:选项)?([a-h])$/);if(om){const L=om[1].charCodeAt(0)-97;if(col['opt'+L]==null)col['opt'+L]=c;}}
  });
  if(col.q==null)throw new Error('表头中未找到「题干」列');
  const items=[];
  for(let i=hi+1;i<rows.length;i++){
    const row=rows[i]||[];
    const q=String(row[col.q]==null?'':row[col.q]).trim();
    if(!q)continue;
    const opts=[];
    for(let L=0;L<8;L++){if(col['opt'+L]==null)continue;const v=String(row[col['opt'+L]]==null?'':row[col['opt'+L]]).trim();if(v!=='')opts.push(v);}
    const raw={exam:col.exam!=null?String(row[col.exam]==null?'':row[col.exam]).trim():'',
      subject:col.subject!=null?String(row[col.subject]==null?'':row[col.subject]).trim():'',
      module:col.module!=null?String(row[col.module]==null?'':row[col.module]).trim():'',
      subtype:col.subtype!=null?String(row[col.subtype]==null?'':row[col.subtype]).trim():'',
      type:col.type!=null?String(row[col.type]==null?'':row[col.type]).trim():'',
      q:q,o:opts,
      a:col.ans!=null?String(row[col.ans]==null?'':row[col.ans]).trim():'',
      e:col.e!=null?String(row[col.e]==null?'':row[col.e]).trim():''};
    const nq=normQuestion(raw,0);
    const errs=validQuestion(nq);
    items.push({ok:errs.length===0,errs,skip:false,data:nq});
  }
  return items;
}
/* ---- 格式示例 ---- */
let exampleOpen=false;
ACTIONS['imp.examples']=()=>{
  const r=$id('modal-root');
  let h='<div class="mask" data-act="modal.mask"><div class="modal" style="max-width:560px"><h3>格式示例</h3>';
  ['text','line','json'].forEach(kk=>{
    h+='<div style="margin-top:10px"><div class="row" style="justify-content:space-between">'
      +'<b style="font-size:14px">'+esc(IMPORT_EXAMPLES[kk].title)+'</b>'
      +'<button class="btn btn-plain btn-sm" data-act="ex.copy" data-k="'+kk+'">复制</button></div>'
      +'<pre class="ex-pre">'+esc(IMPORT_EXAMPLES[kk].content)+'</pre></div>';
  });
  h+='<div class="file-note" style="margin-top:8px">Markdown / TXT / CSV 导入即按“分题块式”规则解析，期望的文本形态同示例一。</div>';
  h+='<div class="m-btns"><button class="btn btn-primary" data-act="ex.close">关闭</button></div></div></div>';
  r.innerHTML=h;modalOpen=true;exampleOpen=true;
};
ACTIONS['ex.copy']=d=>{copyText(IMPORT_EXAMPLES[d.k].content);};
ACTIONS['ex.close']=()=>{closeModal();exampleOpen=false;};
function copyText(s){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(s).then(()=>toast('已复制','ok'),()=>fallbackCopy(s));
  }else fallbackCopy(s);
}
function fallbackCopy(s){
  const ta=document.createElement('textarea');ta.value=s;
  document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');toast('已复制','ok');}
  catch(e){toast('复制失败，请长按手动复制','warn');}
  ta.remove();
}

/* ---- AI 解析 ---- */
const AI_SYS='你是公务员考试题库整理助手。把用户提供的材料整理成题目 JSON。只输出严格 JSON，不要输出任何解释或代码块标记。格式：{"questions":[{"exam":"国考|省考|事业单位A类|事业单位B类|事业单位C类|事业单位D类|事业单位E类|未分类","subject":"行测|申论|职测|综应|空字符串","module":"政治理论|常识判断|言语理解与表达|数量关系|判断推理|资料分析|申论|综应","subtype":"判断推理的子类（图形推理|定义判断|类比推理|逻辑判断）或空字符串","type":"single|multiple|judge|blank|short|explain|bianxi|discuss|calc|case|material|plan|official|translate|drawing|essay","q":"题干","o":["选项"],"a":答案,"e":"解析"}]}。module 优先使用给定 8 个之一，若内容明显属于其他科目（如数学、英语、物理）可用该科目名；type 必须是给定 16 个之一，且 a 必须与 type 匹配：single 单选 a 填单个字母如 "B"；multiple 多选 a 填逗号分隔如 "A,C"；judge 判断 a 填 "正确" 或 "错误"；blank 填空、short 简答（问答）、explain 名词解释、bianxi 辨析、discuss 论述、calc 计算、case 案例分析、material 材料分析、plan 方案设计、official 应用文写作、translate 翻译、drawing 制图、essay 作文/写作 这 13 种主观题 a 一律填 null，o 填 []，参考答案或答题要点完整写进 e。';
let aiAbort=null;
function aiStatus(s,showFallback){
  const st=$id('ai-status');if(st)st.textContent=s;
  const fb=$id('ai-fallback');if(fb)fb.style.display=showFallback?'inline-block':'none';
}
function setAiRunning(b){
  const run=$id('ai-run'),cancel=$id('ai-cancel');
  if(run)run.disabled=b;
  if(cancel)cancel.style.display=b?'inline-block':'none';
}
ACTIONS['ai.save']=()=>{
  const cfg=lsJson(K.ai,{});
  cfg.url=($id('ai-url').value||'').trim();
  cfg.model=($id('ai-model').value||'').trim();
  cfg.key=($id('ai-key').value||'').trim();
  lsSet(K.ai,JSON.stringify(cfg));
  toast('AI 设置已保存（Key 仅存本机）','ok');
};
ACTIONS['ai.clear']=()=>{
  const cfg=lsJson(K.ai,{});delete cfg.key;
  lsSet(K.ai,JSON.stringify(cfg));
  const k=$id('ai-key');if(k)k.value='';
  toast('Key 已清除','ok');
};
ACTIONS['ai.run']=async()=>{
  const cfg=lsJson(K.ai,{});
  if(!cfg.url||!cfg.model||!cfg.key){aiStatus('请先在上方填写 API 地址、模型名和 Key 并保存。',false);return;}
  const text=IMP.aiText.trim();
  if(!text){aiStatus('请先粘贴要解析的题目文本。',false);return;}
  aiStatus('AI 解析中…（最多 60 秒，可取消）',false);
  setAiRunning(true);
  aiAbort=new AbortController();
  const to=setTimeout(()=>{aiAbort&&aiAbort.abort();},60000);
  const body={model:cfg.model,messages:[{role:'system',content:AI_SYS},{role:'user',content:text}],temperature:0,response_format:{type:'json_object'}};
  const attempt=async withRF=>{
    const b=Object.assign({},body);
    if(!withRF)delete b.response_format;
    const r=await fetch(cfg.url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.key},body:JSON.stringify(b),signal:aiAbort.signal});
    if(!r.ok){const t=await r.text().catch(()=>'');throw new Error('HTTP '+r.status+(t?' '+t.slice(0,160):''));}
    const j=await r.json();
    const content=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
    if(!content)throw new Error('返回缺少 choices[0].message.content');
    return content;
  };
  try{
    let content;
    try{content=await attempt(true);}
    catch(e1){content=await attempt(false);}
    clearTimeout(to);
    let cleaned=String(content).replace(/```[a-z]*\s*/gi,'').replace(/```/g,'').trim();
    const s0=cleaned.indexOf('{'),s1=cleaned.lastIndexOf('}');
    if(s0>=0&&s1>s0)cleaned=cleaned.slice(s0,s1+1);
    const parsed=JSON.parse(cleaned);
    const arr=Array.isArray(parsed)?parsed:(parsed.questions||[]);
    if(!Array.isArray(arr)||!arr.length)throw new Error('AI 返回中没有题目数组');
    const items=arr.map(raw=>{
      const nq=normQuestion(raw,0);
      const errs=validQuestion(nq);
      return{ok:errs.length===0,errs,skip:false,data:nq};
    });
    const okN=items.filter(i=>i.ok).length;
    if(okN===0)throw new Error('AI 返回的 '+items.length+' 题均未通过校验（模块/题型/答案不合法）');
    aiStatus('解析完成：'+okN+' 题合法，'+(items.length-okN)+' 题需在预览中修正。',false);
    openPreview({items,papers:[]});
  }catch(e){
    clearTimeout(to);
    const aborted=e&&e.name==='AbortError';
    aiStatus((aborted?'已取消或超时（60 秒）。':'AI 解析失败：'+(e&&e.message?e.message:'未知错误')+'\n可回退到本地规则解析重试。'),true);
  }finally{setAiRunning(false);}
};
ACTIONS['ai.cancel']=()=>{aiAbort&&aiAbort.abort();};
ACTIONS['ai.fallback']=()=>{
  if(!IMP.aiText.trim()){toast('没有可解析的文本','warn');return;}
  autoParseIntoPreview(IMP.aiText);
};

/* ---- 导入预览 ---- */
let PRE={items:[],papers:[]};
function openPreview(r){
  PRE={items:(r.items||[]).map(it=>{it.open=!it.ok;return it;}),papers:r.papers||[],images:r.images||{}};
  goTo('importPreview',{});
}
PAGES.importPreview={title:'导入预览'};
PAGES.importPreview.render=function(el){
  const okN=PRE.items.filter(i=>i.ok&&!i.skip).length;
  const failN=PRE.items.filter(i=>!i.ok).length;
  const skipN=PRE.items.filter(i=>i.skip).length;
  let failHTML='',okHTML='';
  PRE.items.forEach((it,i)=>{
    const row=itemRowHTML(it,i);
    if(!it.ok)failHTML+=row;else okHTML+=row;
  });
  el.innerHTML=topbarHTML('导入预览','预览不保存','prev.leave')
    +'<div class="card card-sm"><b>识别结果：</b>成功 <b style="color:var(--ok)">'+okN+'</b> 条 · 失败 <b style="color:var(--err)">'+failN+'</b> 条 · 跳过 '+skipN+' 条'
    +'<div class="file-note">点条目展开可编辑全部字段；失败条目补全字段后自动转为成功。</div></div>'
    +'<div class="card card-sm"><b style="font-size:14px">批量设置</b>'
    +'<div class="grid2" style="margin-top:6px">'
    +'<div><label class="fl">考试类型</label><input id="batch-exam" placeholder="如：国考"></div>'
    +'<div><label class="fl">模块</label><select id="batch-mod">'+allModules().map(m=>'<option>'+esc(m)+'</option>').join('')+'</select></div></div>'
    +'<button class="btn btn-plain btn-sm" style="margin-top:10px" data-act="prev.batch">应用到全部条目</button></div>'
    +(failN?'<div class="card"><b style="color:var(--err)">待修正（'+failN+' 条）</b>'+failHTML+'</div>':'')
    +'<div class="card"><b>可导入（'+okN+' 条）</b>'+(okHTML||'<div class="miss-empty">暂无</div>')+'</div>'
    +'<div class="botbar"><div class="botbar-in">'
    +'<button class="btn btn-ghost btn-sm" data-act="prev.cancel">取消</button>'
    +'<button class="btn btn-primary btn-big" data-act="prev.merge">合并导入（按唯一 id 去重）</button>'
    +'<button class="btn btn-plain btn-sm" data-act="prev.overwrite">覆盖导入</button>'
    +'</div></div>';
};
function itemRowHTML(it,i){
  const summary=it.data.q.length>50?it.data.q.slice(0,50)+'…':it.data.q;
  return '<div class="imp-item'+(it.ok?'':' fail')+(it.skip?' skip':'')+(it.open?' open':'')+'" id="ii-'+i+'">'
    +'<div class="ii-head" data-act="prev.toggle" data-i="'+i+'">'
    +'<span class="chip '+(it.ok?'c-type-single':'c-wrong')+'">'+(it.skip?'已跳过':(it.ok?'合法':'需修正'))+'</span>'
    +'<span class="ii-q">'+esc(summary)+'</span><span class="muted">▾</span></div>'
    +'<div class="ii-body">'+(it.ok?'':('<div class="err-list">问题：'+esc(it.errs.join('；'))+'</div>'))
    +itemEditorHTML(it,i)+'</div></div>';
}
function subtypeOptions(mod){if(mod==='判断推理')return SUBTYPES.concat(['策略选择']);if(mod==='言语理解与表达')return YD_SUBTYPES;if(mod==='申论')return SY_SUBTYPES;if(mod==='综应')return ZY_SUBTYPES;if(mod==='资料分析')return ['综合分析'];return [];}
function itemEditorHTML(it,i){
  const d=it.data;
  const aVal=d.type==='blank'
    ?(Array.isArray(d.a)?d.a.join(' / '):String(d.a==null?'':d.a))
    :(!OBJ_TYPES.includes(d.type)?'':(d.type==='judge'?(d.a==null?'':(d.a===0?'正确':'错误')):(Array.isArray(d.a)?d.a.map(x=>String.fromCharCode(65+x)).join(','):(d.a!=null?String.fromCharCode(65+d.a):''))));
  return '<label class="fl">考试类型</label><input data-chg="prev.f" data-f="exam" data-i="'+i+'" value="'+esc(d.exam)+'">'
    +'<div class="grid2">'
    +'<div><label class="fl">科目 subject</label><input data-chg="prev.f" data-f="subject" data-i="'+i+'" value="'+esc(d.subject||'')+'"></div>'
    +'<div><label class="fl">模块 module</label><select data-chg="prev.f" data-f="module" data-i="'+i+'">'+allModules().map(m=>'<option'+(m===d.module?' selected':'')+'>'+esc(m)+'</option>').join('')+'</select></div>'
    +'<div><label class="fl">子类型（判断推理子类 / 申论题型）</label><select data-chg="prev.f" data-f="subtype" data-i="'+i+'"><option value=""'+(!d.subtype?' selected':'')+'>（无）</option>'+subtypeOptions(d.module).map(s=>'<option'+(s===d.subtype?' selected':'')+'>'+s+'</option>').join('')+'</select></div>'
    +'<div><label class="fl">题型</label><select data-chg="prev.f" data-f="type" data-i="'+i+'">'+Object.keys(TYPE_NAMES).map(t=>'<option value="'+t+'"'+(t===d.type?' selected':'')+'>'+TYPE_NAMES[t]+'</option>').join('')+'</select></div>'
    +'</div>'
    +'<label class="fl">题干</label><textarea rows="3" data-chg="prev.f" data-f="q" data-i="'+i+'">'+esc(d.q)+'</textarea>'
    +'<label class="fl">选项（每行一个；主观题留空）</label><textarea rows="4" data-chg="prev.f" data-f="o" data-i="'+i+'">'+esc((d.o||[]).join('\n'))+'</textarea>'
    +'<div class="grid2">'
    +'<div><label class="fl">答案（单选 B；多选 A,C；判断 正确/错误；填空直接写答案、多空用 / 分隔；主观题留空）</label><input data-chg="prev.f" data-f="a" data-i="'+i+'" value="'+esc(aVal)+'"></div>'
    +'<div><label class="fl">解析</label><textarea rows="2" data-chg="prev.f" data-f="e" data-i="'+i+'">'+esc(d.e||'')+'</textarea></div>'
    +'</div>'
    +'<div class="row" style="margin-top:8px">'
    +'<button class="btn btn-plain btn-sm" data-act="prev.skip" data-i="'+i+'">'+(it.skip?'取消跳过':'跳过')+'</button>'
    +'<button class="btn btn-danger btn-sm" data-act="prev.del" data-i="'+i+'">删除</button></div>';
}
ACTIONS['prev.toggle']=d=>{
  const it=PRE.items[parseInt(d.i,10)];if(!it)return;
  it.open=!it.open;
  const el=$id('ii-'+d.i);if(el)el.classList.toggle('open',it.open);
};
ACTIONS['prev.skip']=d=>{
  const it=PRE.items[parseInt(d.i,10)];if(!it)return;
  it.skip=!it.skip;render();
};
ACTIONS['prev.del']=d=>{
  PRE.items.splice(parseInt(d.i,10),1);render();
};
ACTIONS['prev.batch']=()=>{
  const exam=($id('batch-exam').value||'').trim();
  const mod=$id('batch-mod').value;
  PRE.items.forEach(it=>{if(exam)it.data.exam=exam;it.data.module=mod;});
  PRE.items.forEach(it=>{
    const errs=validQuestion(it.data);
    it.errs=errs;it.ok=errs.length===0;
  });
  toast('已批量设置','ok');render();
};
CHANGES['prev.f']=(d,t)=>{
  const it=PRE.items[parseInt(d.i,10)];if(!it)return;
  const f=d.f;const v=t.value;
  it.open=true;
  if(f==='o')it.data.o=v.split(/\n/).map(x=>x.trim()).filter(x=>x!=='');
  else if(f==='a')it.data.a=parseAField(it.data.type,v);
  else it.data[f]=(typeof v==='string'?v.trim():v);
  if(f==='type'&&!OBJ_TYPES.includes(v)&&v!=='blank')it.data.a=null;
  const errs=validQuestion(it.data);
  it.errs=errs;it.ok=errs.length===0;
  const y=window.scrollY||0;
  render();
  window.scrollTo(0,y);
};
function parseAField(type,s){
  if(type==='blank'){
    const parts=String(s==null?'':s).split(/\s*[\/／]\s*/).map(x=>x.trim()).filter(x=>x!=='');
    if(!parts.length)return'';
    return parts.length===1?parts[0]:parts;
  }
  return normAnswer(type,s);
}
ACTIONS['prev.leave']=()=>{
  qtConfirm({title:'离开预览',msg:'预览中有未导入的题目，确定丢弃并返回吗？',okText:'丢弃并返回',danger:true,onOk:()=>goBack()});
};
ACTIONS['prev.cancel']=()=>{
  qtConfirm({title:'取消导入',msg:'预览中有未导入的题目，确定丢弃吗？',okText:'丢弃',danger:true,onOk:()=>goBack()});
};
/* 题目 id 由题干+模块哈希生成，同一批里题干相同会撞成一个 id，
   合并时后一条会覆盖前一条 —— 这里给重复的补 -2 / -3 后缀 */
function uniqueBatchIds(arr){
  const seen=Object.create(null);
  arr.forEach(q=>{
    if(!seen[q.id]){seen[q.id]=1;return;}
    let k=2,id=q.id+'-'+k;
    while(seen[id]){k++;id=q.id+'-'+k;}
    q.id=id;seen[id]=1;
  });
  return arr;
}
ACTIONS['prev.merge']=()=>{
  const items=PRE.items.filter(i=>i.ok&&!i.skip);
  if(!items.length){toast('没有可导入的题目（失败条目需先修正）','warn');return;}
  doMergeImport(items,PRE.papers||[],PRE.images||{});
};
ACTIONS['prev.overwrite']=()=>{
  qtConfirm({title:'覆盖导入',msg:'将清空当前题库，仅保留本次导入的题目。仍在新题库中的错题与收藏会保留，其余自动清理（作答统计不受影响）。确定覆盖？',okText:'覆盖',danger:true,onOk:()=>{
    const items=PRE.items.filter(i=>i.ok&&!i.skip);
    BANK=uniqueBatchIds(items.map(it=>normQuestion(it.data,0)));
    PAPERS=(PRE.papers||[]).slice();
    saveBank();
    loadWrong();loadFav();
    toast('已覆盖导入 '+BANK.length+' 题'+(WRONG.length?('，保留 '+WRONG.length+' 条有效错题'):''),'ok');
    goHome();
  }});
};
