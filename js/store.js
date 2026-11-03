/* 题灵录 · store */
'use strict';
/* ================= 常量 ================= */
const MODULES=['政治理论','常识判断','言语理解与表达','数量关系','判断推理','资料分析','申论','综应'];
const SUBTYPES=['图形推理','定义判断','类比推理','逻辑判断'];
const EXAM_TYPES=['国考','省考','事业单位A类','事业单位B类','事业单位C类','事业单位D类','事业单位E类'];
const GT_MODS=['政治理论','常识判断','言语理解与表达','数量关系','判断推理','资料分析'];
const SY_MODS=['常识判断','言语理解与表达','数量关系','判断推理','资料分析'];
const EXAM_MODULES={};
EXAM_TYPES.forEach(t=>{
  if(t==='国考'||t==='省考'){EXAM_MODULES[t]={'行测':GT_MODS.slice(),'申论':['申论']};}
  else{EXAM_MODULES[t]={'职测':SY_MODS.slice(),'综应':['综应']};}
});
let CUST_EXAMS=[];
function loadCustExams(){CUST_EXAMS=lsJson(K.customExams,[]);if(!Array.isArray(CUST_EXAMS))CUST_EXAMS=[];CUST_EXAMS.forEach(e=>{e.modules=(e.modules||[]).map(x=>String(x||'').trim()).filter(Boolean);});}
/* 内置类别的科目覆盖表：{ '国考': ['政治理论', ...] }，用户可在「类别管理」里改 */
let EXAM_OVERRIDE={};
function loadExamOverride(){
  const v=lsJson(K.examMods,{});
  EXAM_OVERRIDE=(v&&typeof v==='object'&&!Array.isArray(v))?v:{};
  Object.keys(EXAM_OVERRIDE).forEach(k=>{
    if(!Array.isArray(EXAM_OVERRIDE[k])){delete EXAM_OVERRIDE[k];return;}
    EXAM_OVERRIDE[k]=EXAM_OVERRIDE[k].map(x=>String(x||'').trim()).filter(Boolean);
    if(!EXAM_OVERRIDE[k].length)delete EXAM_OVERRIDE[k];
  });
}
function saveExamOverride(){lsSet(K.examMods,JSON.stringify(EXAM_OVERRIDE));}
function hasOverride(exam){return Array.isArray(EXAM_OVERRIDE[exam])&&EXAM_OVERRIDE[exam].length>0;}
/* 出厂默认的科目（不含用户覆盖） */
function defaultModsOf(exam){
  const ce=custExamByName(exam);
  if(ce)return ce.modules.slice();
  const map=EXAM_MODULES[exam];
  if(!map)return [];
  const arr=[];
  Object.keys(map).forEach(k=>{(map[k]||[]).forEach(m=>{if(arr.indexOf(m)<0)arr.push(m);});});
  return arr;
}
function saveCustExams(){lsSet(K.customExams,JSON.stringify(CUST_EXAMS));}
function custExamByName(n){return CUST_EXAMS.find(e=>e.name===n);}
function allExamTypes(){return EXAM_TYPES.concat(CUST_EXAMS.map(e=>e.name));}
function allModules(){const arr=MODULES.slice();CUST_EXAMS.forEach(e=>e.modules.forEach(m=>{if(arr.indexOf(m)<0)arr.push(m);}));EXTRA_MODS.forEach(m=>{if(arr.indexOf(m)<0)arr.push(m);});return arr;}
/* ---- 刷题筛选：按考试类别只看该类别考的科目（'' = 全部） ---- */
function curFilter(){const v=lsGet(K.filter);return v==null?'':v;}
function setFilter(v){lsSet(K.filter,v||'');}
function modsOfExam(exam){
  if(!exam)return allModules();
  if(hasOverride(exam))return EXAM_OVERRIDE[exam].slice();
  const d=defaultModsOf(exam);
  return d.length?d:allModules();
}
function filterMods(){return modsOfExam(curFilter());}
function filterPillHTML(){
  const f=curFilter();
  return '<button class="mt-seg'+(f?' on':'')+'" data-act="mod.filterOpen" aria-label="按考试类别筛选">'
    +icon('filter',14)
    +'<span class="fp-tx">'+esc(f||'全部类别')+'</span>'
    +'<span class="fp-arrow">▾</span></button>';
}
function custExamOfModule(m){return CUST_EXAMS.find(e=>e.modules.indexOf(m)>-1)||null;}
const SY_SUBTYPES=['归纳概括','综合分析','提出对策','分析评议','对策建议','文书写作','公文写作','文章写作','压轴大题'];
const YD_SUBTYPES=['选词填空','片段阅读','语句表达'];
const ZY_SUBTYPES=['分析概括','提出对策','沟通协调','公文写作','概念分析','校阅改错','论证评价','材料作文','科技文献阅读','科技务实','辨析题','案例分析题','教育方案设计题','案例分析','实务题','医学知识'];
const EXAM_SCORE={};
const SCORE_RULES={
 '国考':{levels:['副省级','地市级','行政执法类'],
  obj:{'政治理论':0.5,'常识判断':0.5,'言语理解与表达':0.8,'资料分析':1,'数量关系':{'副省级':0.8,'地市级':1,'行政执法类':1}},
  jt:{'图形推理':{'副省级':0.8,'地市级':0.8,'行政执法类':0.8},'定义判断':{'副省级':0.7,'地市级':0.8,'行政执法类':0.8},'类比推理':{'副省级':0.7,'地市级':0.8,'行政执法类':0.8},'逻辑判断':{'副省级':0.8,'地市级':0.85,'行政执法类':0.85},'_default':{'副省级':0.8,'地市级':0.85,'行政执法类':0.85}},
  subj:{'归纳概括':{'副省级':15,'地市级':10,'行政执法类':10},'综合分析':{'副省级':10,'地市级':15,'行政执法类':15},'提出对策':{'副省级':10,'地市级':15,'行政执法类':15},'公文写作':20,'压轴大题':35,'文章写作':35,'大作文':35}},
 '省考':{levels:['省市卷','县乡卷'],
  obj:{'政治理论':0.8,'常识判断':0.8,'言语理解与表达':0.8,'数量关系':0.8,'资料分析':0.8},
  jt:{'图形推理':0.8,'定义判断':0.8,'类比推理':0.8,'逻辑判断':0.8,'_default':0.8},
  subj:{'归纳概括':15,'综合分析':20,'提出对策':20,'分析评议':20,'对策建议':20,'文书写作':25,'公文写作':25,'文章写作':40,'压轴大题':40,'大作文':40}},
 '事业单位A类':{obj:{'常识判断':1,'数量关系':2,'资料分析':2,'言语理解与表达':{'_default':1.6,'选词填空':1.6,'片段阅读':1.6,'语句表达':1.6}},
  jt:{'图形推理':1.2,'定义判断':1.4,'类比推理':1.2,'逻辑判断':1.8,'_default':1.4},
  subj:{'分析概括':30,'提出对策':40,'沟通协调':35,'公文写作':45}},
 '事业单位B类':{obj:{'常识判断':1,'数量关系':2,'资料分析':{'_default':20/15,'综合分析':1.6},'言语理解与表达':{'_default':1.6,'选词填空':1.5,'片段阅读':1.6,'语句表达':1.6}},
  jt:{'图形推理':1.2,'定义判断':1.5,'类比推理':1.4,'逻辑判断':1.8,'_default':1.5},
  subj:{'概念分析':28,'校阅改错':32,'论证评价':40,'材料作文':50}},
 '事业单位C类':{obj:{'常识判断':1,'数量关系':2,'资料分析':2,'言语理解与表达':{'_default':1.6,'选词填空':1.5,'片段阅读':1.6,'语句表达':1.6}},
  jt:{'图形推理':1.2,'定义判断':1.5,'类比推理':1.4,'逻辑判断':1.8,'_default':1.5},
  subj:{'科技文献阅读':50,'科技务实':50,'论证评价':50,'材料作文':50}},
 '事业单位D类':{levels:['幼儿园/小学','中学'],
  obj:{'常识判断':1,'数量关系':2,'资料分析':2,'言语理解与表达':{'_default':1.5,'选词填空':1.5,'片段阅读':1.5,'语句表达':1.5}},
  jt:{'图形推理':1.2,'定义判断':1.4,'类比推理':1.8,'逻辑判断':1.8,'策略选择':1.6,'_default':1.6},
  subj:{'辨析题':{'幼儿园/小学':30,'中学':20},'案例分析题':{'幼儿园/小学':60,'中学':70},'教育方案设计题':60}},
 '事业单位E类':{obj:{'常识判断':1,'数量关系':2,'资料分析':2,'言语理解与表达':{'_default':1.6,'选词填空':1.5,'片段阅读':1.6,'语句表达':1.6},'综应':{'_byType':{'single':1.2,'multiple':2.1}}},
  jt:{'图形推理':1.2,'定义判断':1.4,'类比推理':1.8,'逻辑判断':1.8,'策略选择':1.6,'_default':1.6},
  subj:{'案例分析':30,'实务题':30}}
};
function defLevel(exam){const r=SCORE_RULES[exam];return r&&r.levels?r.levels[0]:null;}
function resolveVal(v,q,lvl){
  if(v==null)return null;
  if(typeof v==='number')return v;
  if(v._byType)return v._byType[q.type]!=null?v._byType[q.type]:null;
  if(v[lvl]!=null&&typeof v[lvl]==='number')return v[lvl];
  if(q.subtype&&v[q.subtype]!=null){
    const sv=v[q.subtype];
    if(typeof sv==='number')return sv;
    if(sv&&sv[lvl]!=null&&typeof sv[lvl]==='number')return sv[lvl];
  }
  if(v._default!=null){
    const dv=v._default;
    if(typeof dv==='number')return dv;
    if(dv&&dv[lvl]!=null&&typeof dv[lvl]==='number')return dv[lvl];
  }
  return null;
}
/* ---- 分值覆盖：{ '国考': { 'obj:常识判断':0.5, 'jt:图形推理':0.8, 'subj:归纳概括':15 } } ---- */
let SCORE_OVERRIDE={};
function loadScoreOverride(){
  const v=lsJson(K.scoreOv,{});
  SCORE_OVERRIDE=(v&&typeof v==='object'&&!Array.isArray(v))?v:{};
  Object.keys(SCORE_OVERRIDE).forEach(k=>{
    const m=SCORE_OVERRIDE[k];
    if(!m||typeof m!=='object'||Array.isArray(m)){delete SCORE_OVERRIDE[k];return;}
    const clean={};
    Object.keys(m).forEach(kk=>{const n=parseFloat(m[kk]);if(isFinite(n)&&n>=0)clean[kk]=Math.round(n*100)/100;});
    if(Object.keys(clean).length)SCORE_OVERRIDE[k]=clean;else delete SCORE_OVERRIDE[k];
  });
}
function saveScoreOverride(){lsSet(K.scoreOv,JSON.stringify(SCORE_OVERRIDE));}
function hasScoreOverride(exam){const m=SCORE_OVERRIDE[exam];return !!(m&&Object.keys(m).length);}
/* 某计分项在该考试下的默认分值（取默认卷别；对象型取 _default 兜底） */
function defPoint(exam,key){
  const r=SCORE_RULES[exam];
  if(!r)return null;
  const lvl=defLevel(exam);
  const num=v=>{
    if(v==null)return null;
    if(typeof v==='number')return v;
    if(v._byType)return null;
    if(lvl&&v[lvl]!=null&&typeof v[lvl]==='number')return v[lvl];
    if(v._default!=null&&typeof v._default==='number')return v._default;
    return null;
  };
  if(key==='obj:判断推理')return num((r.jt||{})['_default']);   /* 判断推理的兜底分值存在 jt._default */
  if(key.indexOf('obj:')===0)return num((r.obj||{})[key.slice(4)]);
  if(key.indexOf('jt:')===0)return num((r.jt||{})[key.slice(3)]);
  if(key.indexOf('subj:')===0)return num((r.subj||{})[key.slice(5)]);
  return null;
}
/* 该考试的全部计分项（按科目顺序） */
function scoreRows(exam){
  const r=SCORE_RULES[exam]||{};
  const rows=[];
  const seen={};
  const push=(key,label)=>{
    if(seen[key])return;seen[key]=1;
    let def=defPoint(exam,key);
    if(def!=null)def=Math.round(def*100)/100;   /* 20/15 这类默认值先收敛到两位，避免长小数与误判改动 */
    const cur=(SCORE_OVERRIDE[exam]||{})[key];
    rows.push({key:key,label:label,def:def,val:(cur!=null?cur:def)});
  };
  modsOfExam(exam).forEach(m=>{
    if(m==='判断推理'&&r.jt){
      ['图形推理','定义判断','类比推理','逻辑判断','策略选择'].forEach(s=>{
        if(r.jt[s]!=null)push('jt:'+s,'判断推理 · '+s);
      });
      if(r.jt['_default']!=null)push('obj:判断推理','判断推理 · 其他子类');
    }else if(m==='申论'||m==='综应'){
      const sm=r.subj||{};
      Object.keys(sm).forEach(k=>{push('subj:'+k,m+' · '+k);});
    }else{
      if((r.obj||{})[m]!=null)push('obj:'+m,m);
    }
  });
  return rows;
}
function qPoints(q,exam,level){
  if(!q)return 0;
  const ov=SCORE_OVERRIDE[exam];
  if(ov){
    if(isObjQ(q)){
      if(q.module==='判断推理'&&q.subtype&&ov['jt:'+q.subtype]!=null)return ov['jt:'+q.subtype];
      if(ov['obj:'+q.module]!=null)return ov['obj:'+q.module];
    }else{
      if(q.subtype&&ov['subj:'+q.subtype]!=null)return ov['subj:'+q.subtype];
      if(ov['subj:大作文']!=null)return ov['subj:大作文'];
    }
  }
  const r=SCORE_RULES[exam];
  if(!r){const w=EXAM_SCORE[exam]||{};return isObjQ(q)?(w[q.module]!=null?w[q.module]:0.8):0;}
  const lvl=level||defLevel(exam);
  if(!isObjQ(q)){
    const sm=r.subj||{};let v=sm[q.subtype];if(v==null)v=sm['大作文'];if(v==null)return 0;
    return typeof v==='object'?(v[lvl]!=null?v[lvl]:0):v;
  }
  let v;
  if(q.module==='判断推理'){const jt=r.jt||{};v=jt[q.subtype]!=null?jt[q.subtype]:jt['_default'];}
  else v=resolveVal((r.obj||{})[q.module],q,lvl);
  if(v==null)v=0.8;
  return typeof v==='object'?(v[lvl]!=null?v[lvl]:0):v;
}
const MODULE_ALIAS={
  '公基':'常识判断','公共基础知识':'常识判断','法律':'常识判断','法律常识':'常识判断',
  '政治':'政治理论','政治理论':'政治理论','政治常识':'政治理论','时政':'政治理论','时事政治':'政治理论',
  '言语':'言语理解与表达','言语理解':'言语理解与表达','言语理解与表达':'言语理解与表达',
  '逻辑':'判断推理','逻辑判断':'判断推理','判断推理':'判断推理','图形':'判断推理','图形推理':'判断推理',
  '定义判断':'判断推理','类比':'判断推理','类比推理':'判断推理',
  '资料':'资料分析','资料分析':'资料分析','数量':'数量关系','数量关系':'数量关系','数学运算':'数量关系',
  '申论':'申论','综应':'综应','综合应用':'综应','职测':'常识判断','职业能力测验':'常识判断'
};
const TYPE_NAMES={single:'单选',multiple:'多选',judge:'判断',blank:'填空',short:'简答',explain:'名词解释',bianxi:'辨析',discuss:'论述',calc:'计算',case:'案例分析',material:'材料分析',plan:'方案设计',official:'应用文写作',translate:'翻译',drawing:'制图',essay:'作文'};
const OBJ_TYPES=['single','multiple','judge'];
/* 填空虽然不在 OBJ_TYPES 里，但它是自动判分的客观题，凡是"客观题"的判断都应该用它 */
function isObjQ(q){return !!q&&(OBJ_TYPES.includes(q.type)||q.type==='blank');}
/* 判断题答案在内部统一为“选项下标”，与 q.o=['正确','错误'] 对齐：0=正确，1=错误。
   导入时数字 0/1 按同一语义解释，文字「对/正确/√/T」→0、「错/错误/×/F」→1。
   数字与数字字符串保持一致，不做布尔式反推，避免同一份题库两种解释。 */
const JUDGE_TRUE=0,JUDGE_FALSE=1;
const TYPE_ALIAS={};
Object.keys(TYPE_NAMES).forEach(k=>{TYPE_ALIAS[TYPE_NAMES[k]]=k;TYPE_ALIAS[TYPE_NAMES[k]+'题']=k;});
Object.assign(TYPE_ALIAS,{'选择题':'single','单选题':'single','多选题':'multiple','是非题':'judge','判断题':'judge','填空题':'blank','简答':'short','简答题':'short','问答题':'short','简述':'short','主观题':'short','问答':'short','名词解释题':'explain','名词解释':'explain','辨析题':'bianxi','论述题':'discuss','论述':'discuss','计算题':'calc','案例分析题':'case','案例分析':'case','材料题':'material','材料分析题':'material','材料/案例分析题':'case','翻译题':'translate','翻译':'translate','制图题':'drawing','制图':'drawing','作图题':'drawing','画图题':'drawing','大作文':'essay','材料分析题':'material','教案设计':'plan','教育方案设计':'plan','方案设计题':'plan','公文写作':'official','公文题':'official','应用文':'official','写作':'essay','作文':'essay','作文题':'essay','申发论述':'essay','文章写作':'essay'});
const IMPORT_EXAMPLES={
  text:{title:'示例一：粘贴文本（分题块式，推荐）',content:
'1.党的二十大报告中提出的“三个务必”包括（ ）。\nA.务必不忘初心、牢记使命\nB.务必谦虚谨慎、艰苦奋斗\nC.务必敢于斗争、善于斗争\nD.务必居安思危、未雨绸缪\n【答案】ABC\n【解析】“三个务必”即务必不忘初心、牢记使命，务必谦虚谨慎、艰苦奋斗，务必敢于斗争、善于斗争。\n\n2.我国最长的河流是（ ）。\nA.长江　B.黄河　C.珠江　D.黑龙江\n答案：A\n解析：长江全长约6300千米，是我国第一长河。\n\n3.我国的根本政治制度是人民代表大会制度。\n【答案】正确\n【解析】人民代表大会制度是我国的根本政治制度。\n\n4.我国的最高国家权力机关是____。\n【答案】全国人民代表大会\n【解析】全国人民代表大会是最高国家权力机关。\n\n5.简述“三个务必”的具体内容。\n【答案】务必不忘初心、牢记使命；务必谦虚谨慎、艰苦奋斗；务必敢于斗争、善于斗争。\n【解析】出自党的二十大报告，务必居安思危、未雨绸缪为干扰项。'},
  line:{title:'示例二：行式简洁（每行一题，竖线分隔）',content:
'我国的根本政治制度是|人民代表大会制度|政治协商制度|民族区域自治制度|基层群众自治制度|A|人民代表大会制度是我国的根本政治制度，是中国特色社会主义制度的重要组成部分。\n一个星期有几天|五天|七天|十天|不定|B|一星期为七天。\n二十大报告提出的高质量发展是全面建设社会主义现代化国家的|首要任务|基本任务|重要任务|根本任务|A|高质量发展是全面建设社会主义现代化国家的首要任务。'},
  json:{title:'示例三：JSON（可同时带套卷 papers，适合云端同步）',content:
'{\n  "questions": [\n    {\n      "id": "demo-001",\n      "exam": "国考",\n      "subject": "行测",\n      "module": "政治理论",\n      "type": "single",\n      "q": "党的二十大报告指出，高质量发展是全面建设社会主义现代化国家的（ ）。",\n      "o": ["首要任务", "基本任务", "重要任务", "根本任务"],\n      "a": 0,\n      "e": "党的二十大报告明确：高质量发展是全面建设社会主义现代化国家的首要任务。"\n    }\n  ],\n  "papers": [\n    {"id": "paper-demo", "title": "示例卷", "exam": "国考", "year": 2024, "minutes": 120, "level": "副省级", "questionIds": ["demo-001"]}\n  ]\n}'}
};
const MAMMOTH_CDN='https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';
const PDFJS_CDN='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const PDFJS_WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const XLSX_CDN='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const TESS_CDN='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
const TESS_WORKER='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js';
const TESS_CORE='https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0/';
const TESS_LANG='https://tessdata.projectnaptha.com/4.0.0_fast';
const CLOUD_DEFAULT='https://cdn.jsdelivr.net/gh/你的用户名/题库仓库@main/questions.json';

/* ================= 内置示例题的 id（仅用于清理旧数据，不再灌入） ================= */
const DEMO_IDS={'q-001':1,'q-002':1,'q-003':1,'q-004':1,'q-005':1,'q-006':1,'q-007':1,'q-008':1,'q-009':1,'q-010':1,'q-011':1,'q-012':1,'q-013':1,'q-014':1,'q-015':1,'q-016':1};

/* ================= 版本 ================= */
const APP_VER='v2.2.1';
const APP_BUILD=41;
const APP_DATE='2026-11-02';
/* 正式版已启用（2026-11-02）：
   任何「更新时自动清理本地数据」的逻辑都会被强制跳过，
   只允许追加或修正数据，不允许删除用户内容。 */
const DATA_RELEASE=true;

/* ================= 存储层 ================= */
const K={bank:'qt_questions',bankTime:'qt_bank_time',
  stats:'qt_stats',wrong:'qt_wrong',plan:'qt_daily_plan',ai:'qt_ai',
  fav:'qt_fav',recs:'qt_records',pshuffle:'qt_prax_shuffle',
  extraMods:'qt_extra_modules',tcPass:'qt_tc_pass',autoPass:'qt_auto_pass',
  cloudUrl:'qt_cloud_url',cloudTime:'qt_cloud_time',cloudCache:'qt_cloud_cache',theme:'qt_theme',books:'qt_books',customExams:'qt_custom_exams',demoPurged:'qt_demo_purged',snapshot:'qt_snapshot',learn:'qt_learn',fontSize:'qt_font_size',optShuffle:'qt_opt_shuffle',srs:'qt_srs',studyCat:'qt_study_cat',bankRescue:'qt_bank_rescue',imgtab:'qt_imgtab',build:'qt_build',filter:'qt_filter',examMods:'qt_exam_modules',scoreOv:'qt_score_override'};
const progKey=m=>'qt_progress_'+m;
/* ---- 存储：IndexedDB 落盘，内存镜像保证同步读写 ---- */
const DB_NAME='tilinlu',DB_STORE='kv',DB_VER=1;
let IDB=null,USE_IDB=false,STORE_MODE='idb',MIGRATED=false;
let MEM=Object.create(null),DIRTY=new Map(),FLUSH_TIMER=0,FLUSH_RETRY=0;

function dbOpen(){
  return new Promise((res,rej)=>{
    let rq;
    try{rq=indexedDB.open(DB_NAME,DB_VER);}catch(e){return rej(e);}
    rq.onupgradeneeded=()=>{const db=rq.result;if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE);};
    rq.onsuccess=()=>res(rq.result);
    rq.onerror=()=>rej(rq.error||new Error('open failed'));
    rq.onblocked=()=>rej(new Error('blocked'));
  });
}
function dbAll(db){
  return new Promise((res,rej)=>{
    const out=Object.create(null);
    let tx;
    try{tx=db.transaction(DB_STORE,'readonly');}catch(e){return rej(e);}
    const rq=tx.objectStore(DB_STORE).openCursor();
    rq.onsuccess=()=>{const c=rq.result;if(c){if(typeof c.value==='string')out[c.key]=c.value;c.continue();}};
    tx.oncomplete=()=>res(out);
    tx.onerror=()=>rej(tx.error||new Error('read failed'));
  });
}
function dbWrite(pairs){
  return new Promise((res,rej)=>{
    if(!USE_IDB||!IDB)return res(0);
    let tx;
    try{tx=IDB.transaction(DB_STORE,'readwrite');}catch(e){return rej(e);}
    const st=tx.objectStore(DB_STORE);
    pairs.forEach(p=>{if(p[1]===null)st.delete(p[0]);else st.put(p[1],p[0]);});
    tx.oncomplete=()=>res(pairs.length);
    tx.onerror=()=>rej(tx.error||new Error('write failed'));
    tx.onabort=()=>rej(tx.error||new Error('write aborted'));
  });
}
function flushNow(){
  if(FLUSH_TIMER){clearTimeout(FLUSH_TIMER);FLUSH_TIMER=0;}
  if(!USE_IDB||!DIRTY.size)return;
  const pairs=Array.from(DIRTY);DIRTY.clear();
  dbWrite(pairs).then(()=>{FLUSH_RETRY=0;}).catch(e=>{
    try{console.warn('[存储] 写入失败，重试',e);}catch(_){}
    pairs.forEach(p=>{if(!DIRTY.has(p[0]))DIRTY.set(p[0],p[1]);});
    if(FLUSH_RETRY++<3){FLUSH_TIMER=setTimeout(flushNow,400);}
    else{FLUSH_RETRY=0;toastSafe('本机存储写入失败，请检查可用空间');}
  });
}
function scheduleFlush(){
  if(!USE_IDB||FLUSH_TIMER)return;
  FLUSH_TIMER=setTimeout(flushNow,60);
}
function toastSafe(msg){try{if(typeof toast==='function')toast(msg,'warn');}catch(e){}}

const lsGet=k=>(k in MEM)?MEM[k]:null;
const lsSet=(k,v)=>{
  MEM[k]=String(v);
  if(USE_IDB){DIRTY.set(k,MEM[k]);scheduleFlush();}
  else{try{localStorage.setItem(k,MEM[k]);}catch(e){}}
};
const lsDel=k=>{
  delete MEM[k];
  if(USE_IDB){DIRTY.set(k,null);scheduleFlush();}
  else{try{localStorage.removeItem(k);}catch(e){}}
};
const lsJson=(k,d)=>{try{const v=lsGet(k);if(v==null)return d;return JSON.parse(v)}catch(e){return d}};
const lsKeys=()=>Object.keys(MEM);

/* 启动装载：IndexedDB 优先；首次自动把 localStorage 里的旧数据迁过去 */
async function bootStorage(){
  const old={};
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&k.indexOf('qt_')===0)old[k]=localStorage.getItem(k);
    }
  }catch(e){}
  let db=null;
  try{db=await dbOpen();}catch(e){db=null;}
  if(!db){USE_IDB=false;STORE_MODE='local';Object.assign(MEM,old);return;}
  IDB=db;USE_IDB=true;
  let all={};
  try{all=await dbAll(db);}catch(e){all={};}
  if(!Object.keys(all).length&&Object.keys(old).length){
    const pairs=Object.keys(old).map(k=>[k,old[k]]);
    try{await dbWrite(pairs);}catch(e){
      USE_IDB=false;IDB=null;STORE_MODE='local';Object.assign(MEM,old);return;
    }
    let back={};
    try{back=await dbAll(db);}catch(e){back={};}
    if(Object.keys(back).length<pairs.length){
      // 校验没通过就退回 localStorage，绝不清掉原数据
      USE_IDB=false;IDB=null;STORE_MODE='local';Object.assign(MEM,old);return;
    }
    Object.assign(MEM,back);
    try{Object.keys(old).forEach(k=>localStorage.removeItem(k));}catch(e){}
    MIGRATED=true;
    try{console.log('[存储] 已迁移 '+pairs.length+' 项到 IndexedDB');}catch(e){}
  }else{
    Object.assign(MEM,all);
  }
  STORE_MODE='idb';
}
window.addEventListener('pagehide',flushNow);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushNow();});
function todayStr(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

/* ---- 题库 ---- */
let BANK=[],PAPERS=[];
function simpleHash(s){let h=5381,i=0;for(i=0;i<s.length;i++){h=((h<<5)+h+s.charCodeAt(i))>>>0;}return h.toString(36);}
function normModule(raw){
  const r=(raw||'').trim();
  if(allModules().indexOf(r)>-1)return{module:r,subtype:''};
  const hit=MODULE_ALIAS[r];
  if(hit){return{module:hit,subtype:(hit==='判断推理'&&SUBTYPES.includes(r))?r:''};}
  if(!r){console.warn('[题库] 缺少 module，兜底为“常识判断”');}
  else{console.warn('[题库] 未知模块名：“'+r+'”，兜底为“常识判断”');}
  return{module:'常识判断',subtype:''};
}
/* 圈号选项：①=第1个 */
const CIRCLED={'①':0,'②':1,'③':2,'④':3,'⑤':4,'⑥':5,'⑦':6,'⑧':7,'⑨':8,'⑩':9,'❶':0,'❷':1,'❸':2,'❹':3};
function circledIndex(s){const v=CIRCLED[s];return typeof v==='number'?v:null;}
/* 去掉“答案：”“选”等前缀与尾部标点 */
function ansPrefixStrip(s){
  return String(s==null?'':s).trim()
    .replace(/^[（(【\[]?\s*(?:正确答案|参考答案|标准答案|答案|答|选)\s*[:：]?\s*/,'')
    .replace(/[）)】\]。．\.\s、,，;；]+$/,'')
    .trim();
}
/* 文本数字按“第 n 个选项”理解：0 与 1 都指向第一个；真实 number 仍按 0 基下标 */
function digitToIndex(n){return n<=0?0:n-1;}
function normAnswer(type,a){
  if(!OBJ_TYPES.includes(type))return null;
  if(type==='single'||type==='judge'){
    if(typeof a==='boolean')return type==='judge'?(a?0:1):null;
    if(typeof a==='number')return Math.round(a);
    const s=ansPrefixStrip(a);
    if(!s)return null;
    {const ci=circledIndex(s);if(ci!=null)return ci;}
    if(type==='judge'){
      if(/^[01]$/.test(s))return s==='0'?JUDGE_TRUE:JUDGE_FALSE;
      if(/^(错|错误|错的|否|假|×|✗|F|FALSE)$/i.test(s))return 1;
      if(/^(对|正确|对的|是|真|√|✓|T|TRUE)$/i.test(s))return 0;
      if(/不正确|不对|错误|错的|不是|×|✗/.test(s))return 1;
      if(/正确|对的|不错|√|✓/.test(s))return 0;
      return null;
    }
    if(/^\d+$/.test(s))return digitToIndex(parseInt(s,10));
    const m=s.toUpperCase().match(/[A-Z]/g);
    if(m&&m.length===1)return m[0].charCodeAt(0)-65;
    return null;
  }
  if(type==='multiple'){
    if(Array.isArray(a)){
      const arr=a.map(v=>{
        if(typeof v==='number')return Math.round(v);
        const s=ansPrefixStrip(v);
        {const ci=circledIndex(s);if(ci!=null)return ci;}
        if(/^\d+$/.test(s))return digitToIndex(parseInt(s,10));
        const m=s.toUpperCase().match(/[A-Z]/g);
        return m&&m.length?m[0].charCodeAt(0)-65:NaN;
      }).filter(n=>!isNaN(n)&&n>=0);
      return [...new Set(arr)].sort((x,y)=>x-y);
    }
    const raw=ansPrefixStrip(a);
    if(!raw)return [];
    let arr=(raw.toUpperCase().match(/[A-Z]/g)||[]).map(c=>c.charCodeAt(0)-65);
    if(!arr.length){
      const circ=raw.split('').map(c=>CIRCLED[c]).filter(n=>n!=null);
      arr=circ.length?circ:(raw.match(/\d+/g)||[]).map(x=>digitToIndex(parseInt(x,10)));
    }
    return [...new Set(arr)].filter(n=>n>=0).sort((x,y)=>x-y);
  }
  return null;
}
function normQuestion(raw,idx){
  const q=Object.assign({},raw);
  if(!q.id||typeof q.id!=='string'||!q.id.trim())q.id='q-'+simpleHash(String(q.q||'')+'|'+String(q.module||''));
  q.id=q.id.trim();
  const nm=normModule(q.module);q.module=nm.module;q.subtype=(q.subtype||'').trim()||nm.subtype||'';
  if(q.subject==null)q.subject='';
  q.subject=String(q.subject).trim();
  q.exam=String(q.exam||'').trim()||'未分类';
  let type=String(q.type||'').trim();
  if(!TYPE_NAMES[type]){
    if(TYPE_ALIAS[type])type=TYPE_ALIAS[type];
    else if(Array.isArray(q.a))type='multiple';
    else if(Array.isArray(q.o)&&q.o.length>2&&/^(正确|错误|对|错|√|×)$/.test(String(q.o[0]||'')))type='judge';
    else if(Array.isArray(q.o)&&q.o.length>0)type='single';
    else type='short';
  }
  q.type=type;
  q.q=String(q.q==null?'':q.q).trim();
  q.o=Array.isArray(q.o)?q.o.map(x=>String(x==null?'':x).trim()).filter(x=>x!==''):[];
  if(type==='judge'&&q.o.length===0)q.o=['正确','错误'];
  if(type==='blank'){
    if(Array.isArray(q.a))q.a=q.a.map(x=>String(x==null?'':x).trim()).filter(x=>x!=='');
    else q.a=String(q.a==null?'':q.a).trim();
  }else q.a=normAnswer(type,q.a);
  q.e=String(q.e==null?'':q.e).trim();
  q.note=String(q.note==null?'':q.note).trim();
  q.mat=String(q.mat==null?'':q.mat).trim();
  if(typeof q.img!=='string')q.img='';
  if(typeof q.matImg!=='string')q.matImg='';
  if(!Array.isArray(q.eimgs))q.eimgs=[];
  if(!Array.isArray(q.imgs))q.imgs=[];
  if(!Array.isArray(q.oimg))q.oimg=[];
  return q;
}
function validQuestion(q){
  const errs=[];
  if(!q.id)errs.push('缺少 id');
  if(!q.q)errs.push('缺少题干');
  if(allModules().indexOf(q.module)<0)errs.push('模块不合法：'+q.module);
  if(!TYPE_NAMES[q.type])errs.push('题型不合法：'+q.type);
  if(q.type==='single'&&(typeof q.a!=='number'||q.a<0||q.a>=(q.o.length||0)))errs.push('单选答案无法识别，请填 A/B/C/D（或 1/2/3）');
  if(q.type==='multiple'&&(!Array.isArray(q.a)||q.a.length===0||q.a.some(x=>x<0||x>=(q.o.length||0))))errs.push('多选答案无法识别，请填 A,C 这样的字母组合');
  if(q.type==='judge'&&(q.a!==0&&q.a!==1))errs.push('判断答案无法识别，请填 正确/错误');
  if(q.type==='blank'){
    const ba=Array.isArray(q.a)?q.a:[q.a];
    if(!ba.length||ba.every(x=>String(x==null?'':x).trim()===''))errs.push('填空题答案不能为空');
  }else if(!OBJ_TYPES.includes(q.type)&&q.a!==null){
    errs.push('主观题答案应为空');
  }
  if(OBJ_TYPES.includes(q.type)&&q.o.length<2)errs.push('客观题选项不足');
  return errs;
}
function loadBank(){
  const rawStr=lsGet(K.bank);
  let raw=null;
  try{raw=rawStr?JSON.parse(rawStr):null;}catch(e){raw=null;}
  if(raw&&Array.isArray(raw.questions)){
    BANK=raw.questions.map(normQuestion);
    PAPERS=Array.isArray(raw.papers)?raw.papers:[];
  }else{
    BANK=[];PAPERS=[];
    /* 有内容却解析不了：先把原文存一份，万一之后写入覆盖了还能找回 */
    if(rawStr&&rawStr.length>2&&!lsGet(K.bankRescue)){
      try{lsSet(K.bankRescue,rawStr);}catch(e){}
    }
  }
}
function saveBank(){lsSet(K.bank,JSON.stringify({questions:BANK,papers:PAPERS}));lsSet(K.bankTime,String(Date.now()));}
/* 更新前自动快照：把当前全部本地数据打包存进一个键，供「关于 → 数据保护」恢复 */
function snapshotData(tag){
  const LIMIT=24*1024*1024;
  try{
    const data={};
    lsKeys().forEach(k=>{
      /* 图片表是导入数据派生的，且可能有几十 MB：不进快照，避免每次更新把存储翻倍。
         真要恢复，重新导入题库 JSON 即可（题目 id 不变，图片会补齐）。 */
      if(k===K.snapshot||k===K.build||k===K.ai||k===K.imgtab)return;
      data[k]=lsGet(k);
    });
    let str=JSON.stringify({tag:tag,at:Date.now(),data:data});
    if(str.length>LIMIT){
      /* 图片题会把快照撑爆：先去掉图片，保住题库正文与进度 */
      try{
        const b=JSON.parse(data[K.bank]||'{}');
        if(Array.isArray(b.questions)){
          b.questions.forEach(q=>{delete q.img;delete q.oimg;});
          data[K.bank]=JSON.stringify(b);
          str=JSON.stringify({tag:tag,at:Date.now(),data:data,noimg:1});
        }
      }catch(e){}
    }
    if(str.length>LIMIT)return null;
    lsSet(K.snapshot,str);
    return {size:str.length,noimg:str.indexOf('"noimg":1')>-1};
  }catch(e){return null;}
}
/* 版本号变了 = 刚更新过：先留快照，再跑后续可能的迁移 */
function guardData(){
  const prev=parseInt(lsGet(K.build)||'0',10);
  if(prev&&prev!==APP_BUILD){
    const r=snapshotData('v'+prev+' → '+APP_VER);
    if(r)try{console.log('[数据保护] 已备份更新前数据 '+Math.round(r.size/1024)+'KB');}catch(e){}
  }
  lsSet(K.build,String(APP_BUILD));
}
/* 一次性清理：删掉旧版本内置示例题，以及它们留下的统计、错题、收藏、记录
   只处理 DEMO_IDS 里的题，用户自己导入的题目不受影响
   正式版（DATA_RELEASE=true）下永久跳过，绝不删数据 */
function purgeDemoData(){
  if(DATA_RELEASE)return;
  if(lsGet(K.demoPurged)==='1')return;
  let changed=false;
  if(BANK.some(q=>DEMO_IDS[q.id])){
    BANK=BANK.filter(q=>!DEMO_IDS[q.id]);
    PAPERS=PAPERS.filter(p=>{const qs=p.questionIds||[];return !(qs.length&&qs.every(id=>DEMO_IDS[id]));});
    changed=true;
  }
  if(STATS.ans){Object.keys(STATS.ans).forEach(id=>{if(DEMO_IDS[id]){delete STATS.ans[id];changed=true;}});}
  const w0=WRONG.length;WRONG=WRONG.filter(w=>!DEMO_IDS[w.questionId]);if(WRONG.length!==w0)changed=true;
  const f0=FAV.length;FAV=FAV.filter(id=>!DEMO_IDS[id]);if(FAV.length!==f0)changed=true;
  const r0=RECS.length;RECS=RECS.filter(r=>{const qs=r.questionIds||[];return !(qs.length&&qs.every(id=>DEMO_IDS[id]));});if(RECS.length!==r0)changed=true;
  if(changed){
    saveBank();saveStats();saveWrong();saveFav();saveRecs();
  }
  lsSet(K.demoPurged,'1');
}
function bankOf(m){return BANK.filter(q=>q.module===m);}
function bankQ(id){return BANK.find(q=>q.id===id);}
function agoText(){
  const t=parseInt(lsGet(K.bankTime)||'0',10);
  if(!t)return'刚刚';
  const m=Math.max(0,Math.round((Date.now()-t)/60000));
  if(m<1)return'刚刚';if(m<60)return m+' 分钟前';
  const h=Math.floor(m/60);if(h<24)return h+' 小时前';
  return Math.floor(h/24)+' 天前';
}

/* ---- 统计 ---- */
let STATS={ans:{}};
function loadStats(){STATS=lsJson(K.stats,{ans:{}});if(!STATS.ans)STATS.ans={};}
function saveStats(){lsSet(K.stats,JSON.stringify(STATS));}
/* ================= 间隔重复（简化 SM-2） ================= */
const SRS_STEPS=[1,2,4,7,15,30,60,120];
let SRS={};
function loadSrs(){
  const d=lsJson(K.srs,null);
  SRS=(d&&typeof d==='object'&&!Array.isArray(d))?d:{};
  /* 题库里已经没有的题，复习记录一并清掉（题库为空时不动，避免误删） */
  if(BANK.length){
    const ids={};BANK.forEach(q=>{ids[q.id]=1;});
    let cut=0;
    Object.keys(SRS).forEach(id=>{if(!ids[id]){delete SRS[id];cut++;}});
    if(cut)saveSrs();
  }
}
function saveSrs(){lsSet(K.srs,JSON.stringify(SRS));}
function srsUpdate(q,correct){
  if(!q||(correct!==true&&correct!==false))return;
  const r=SRS[q.id]||{n:0,ef:2.5,due:'',last:''};
  if(correct)r.n=Math.min((r.n||0)+1,SRS_STEPS.length);
  else r.n=0;
  const days=correct?SRS_STEPS[Math.max(0,Math.min(r.n-1,SRS_STEPS.length-1))]:1;
  const d=new Date();d.setDate(d.getDate()+days);
  r.due=learnKey(d);r.last=todayStr();
  SRS[q.id]=r;saveSrs();
}
function srsDue(){
  const t=todayStr();
  return Object.keys(SRS).filter(id=>{
    const r=SRS[id];
    return r&&r.due&&r.due<=t&&!!bankQ(id);
  }).sort((a,b)=>String(SRS[a].due).localeCompare(String(SRS[b].due)));
}
function recordAnswer(q,correct){
  srsUpdate(q,correct);
  STATS.ans[q.id]={m:q.module,c:(correct===true?1:(correct===false?0:null)),t:Date.now()};
  saveStats();
}
function totalsStat(){
  let done=0,right=0,wrong=0;
  Object.keys(STATS.ans).forEach(id=>{const r=STATS.ans[id];done++;if(r.c===1)right++;else if(r.c===0)wrong++;});
  const obj=right+wrong;
  return{done,right,wrong,acc:obj?Math.round(right*100/obj)+'%':'—'};
}
function moduleDoneCount(m){let n=0;Object.keys(STATS.ans).forEach(id=>{if(STATS.ans[id].m===m)n++;});return n;}
function todayDoneOf(m){const td=todayStr();let n=0;Object.keys(STATS.ans).forEach(id=>{const r=STATS.ans[id];
  const d=new Date(r.t);if(r.m===m&&d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')===td)n++;});return n;}
function loadPlan(){return lsJson(K.plan,{});}

/* ---- 错题本 ---- */
let WRONG=[];
/* 真题的公式图体积小但数量多，导入时用「图片表 + @键」去重：
   表里每张图只存一份，题目里存 @键，渲染时再换成 data URI */
let IMG_TAB={};
function loadImgTab(){
  IMG_TAB=lsJson(K.imgtab,{});
  if(!IMG_TAB||typeof IMG_TAB!=='object'||Array.isArray(IMG_TAB))IMG_TAB={};
}
function saveImgTab(){lsSet(K.imgtab,JSON.stringify(IMG_TAB));}
function loadWrong(){
  WRONG=lsJson(K.wrong,[]);
  if(!Array.isArray(WRONG))WRONG=[];
  /* 题库为空（没导入过，或题库文件读坏了）时绝不清理错题，
     否则一次读取失败就会把整本错题写没 */
  if(!BANK.length)return;
  const before=WRONG.length;
  WRONG=WRONG.filter(w=>w&&w.questionId&&bankQ(w.questionId));
  if(WRONG.length!==before)saveWrong();
}
function saveWrong(){lsSet(K.wrong,JSON.stringify(WRONG));}
function wrongEntry(qid){return WRONG.find(w=>w.questionId===qid);}
function addWrong(q,userAns){
  const ex=wrongEntry(q.id);
  if(ex){ex.module=q.module;ex.lastWrongAnswer=userAns;ex.consecutiveCorrect=0;ex.wrongCount=(ex.wrongCount||0)+1;ex.lastWrongAt=Date.now();}
  else{WRONG.push({questionId:q.id,module:q.module,lastWrongAnswer:userAns,consecutiveCorrect:0,wrongCount:1,lastWrongAt:Date.now()});}
  saveWrong();
}
function removeWrong(qid){WRONG=WRONG.filter(w=>w.questionId!==qid);saveWrong();}
function applyMistakeResult(q,correct){
  const ex=wrongEntry(q.id);
  if(!ex)return{cc:0,removed:false};
  if(correct){ex.consecutiveCorrect=(ex.consecutiveCorrect||0)+1;
    if(ex.consecutiveCorrect>=3){removeWrong(q.id);return{cc:3,removed:true};}
    saveWrong();return{cc:ex.consecutiveCorrect,removed:false};}
  ex.consecutiveCorrect=0;saveWrong();return{cc:0,removed:false};
}
function wrongListOf(m){return WRONG.filter(w=>w.module===m&&bankQ(w.questionId)&&(isObjQ(bankQ(w.questionId))||isAutoSubj(bankQ(w.questionId))));}
function wrongCountOf(m){return wrongListOf(m).length;}
function wrongQsOf(m){return wrongListOf(m).map(w=>bankQ(w.questionId)).filter(Boolean);}

/* ---- 收藏夹 ---- */
let FAV=[];
function loadFav(){
  FAV=lsJson(K.fav,[]);
  if(!Array.isArray(FAV))FAV=[];
  if(!BANK.length)return;   /* 同上：题库读不出来时不动收藏 */
  const before=FAV.length;
  FAV=FAV.filter(id=>bankQ(id));
  if(FAV.length!==before)saveFav();
}
function saveFav(){lsSet(K.fav,JSON.stringify(FAV));}
function isFav(id){return FAV.indexOf(id)>-1;}
function toggleFav(id){
  const i=FAV.indexOf(id);
  if(i>-1){FAV.splice(i,1);saveFav();return false;}
  FAV.unshift(id);saveFav();return true;
}
function favQsOf(m){return FAV.map(id=>bankQ(id)).filter(q=>q&&(!m||q.module===m));}

/* ---- 练习记录 ---- */
let RECS=[];
function loadRecs(){
  RECS=lsJson(K.recs,[]);
  if(!Array.isArray(RECS))RECS=[];
  RECS=RECS.filter(r=>r&&r.id&&r.result&&Array.isArray(r.questionIds));
  if(RECS.length>80)RECS=RECS.slice(0,80);
}
function saveRecs(){lsSet(K.recs,JSON.stringify(RECS));}
function addRecord(S){
  if(!S||!S.result)return;
  RECS=RECS.filter(r=>r.id!==S.id);
  RECS.unshift(JSON.parse(JSON.stringify(S)));
  if(RECS.length>80)RECS=RECS.slice(0,80);
  saveRecs();
}

/* ---- 自定义科目（每日计划快捷新增，如 语文/数学） ---- */
let EXTRA_MODS=[];
function loadExtraMods(){
  EXTRA_MODS=lsJson(K.extraMods,[]);
  if(!Array.isArray(EXTRA_MODS))EXTRA_MODS=[];
  EXTRA_MODS=EXTRA_MODS.filter(m=>typeof m==='string'&&m.trim());
}
function saveExtraMods(){lsSet(K.extraMods,JSON.stringify(EXTRA_MODS));}

/* ---- 模块进度 ---- */
function getProg(m){const v=parseInt(lsGet(progKey(m))||'0',10);return isNaN(v)?0:v;}
function setProg(m,i){lsSet(progKey(m),String(i));}
function saveProgress(module,nextIndex,total){
  setProg(module,nextIndex>=total?0:nextIndex);
}
