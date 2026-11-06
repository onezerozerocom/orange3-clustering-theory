/* =====================================================================
   군집 분석 모델 · 이론 시뮬레이션 (교과서 128–133쪽)
   ===================================================================== */

/* ---------- 데이터 ---------- */
// [표1] 성적 데이터셋 (학생 10명, 단위: 점)
const SUBJ={k:'국어',m:'수학',i:'정보',s:'과학'};
const SC={k:[50,80,85,20,95,40,100,90,50,60],m:[90,89,40,35,50,45,100,87,10,50],i:[40,30,50,100,90,95,95,95,30,20],s:[100,90,95,35,40,45,90,95,40,30]};
const PAIRS={ms:['m','s'],ks:['k','s'],km:['k','m'],is:['i','s']};
const PAIR_OPTS=[['ms','수학 · 과학'],['ks','국어 · 과학'],['km','국어 · 수학'],['is','정보 · 과학']];
const scPts=pair=>{const [a,b]=PAIRS[pair];return SC[a].map((v,i)=>[v,SC[b][i]])};
const NO=i=>CIRC[i];
// 예제 1 (계층적), 예제 2 (k-평균)
const EX1={pts:[[2,2],[3,2],[3,5],[7,5],[7,7]],lab:['A','B','C','D','E']};
const EX2={pts:[[1,1],[1,3],[4,2],[6,5],[9,5],[9,8]],lab:['A','B','C','D','E','F'],init:[[1,2],[5,4]],cl:['c1','c2'],k:2,x:[0,10],y:[0,10],xt:11,yt:[0,2,4,6,8,10],xl:'x',yl:'y'};
const EX3={pts:scPts('km'),lab:[...CIRC.slice(0,10)],init:[[90,90],[80,45],[40,10]],cl:['C1','C2','C3'],k:3,x:[0,110],y:[0,110],xt:[0,20,40,60,80,100],yt:[0,20,40,60,80,100],xl:'국어 (점)',yl:'수학 (점)'};
// 무작위 데이터: 덩어리 4개, 48개 (시드 고정)
const RND=(()=>{const r=rng(17),C=[[2.4,7.4],[7.2,7.9],[3,2.6],[7.8,3.1]],pts=[];C.forEach(c=>{for(let t=0;t<12;t++)pts.push([clamp(c[0]+gauss(r)*.85,.2,9.8),clamp(c[1]+gauss(r)*.85,.2,9.8)])});
  return{pts,lab:null,init:null,cl:null,k:null,x:[0,10],y:[0,10],xt:11,yt:[0,2,4,6,8,10],xl:'x',yl:'y'}})();
// 평가용 데이터: 덩어리 4개 × 20개, 흩어진 정도를 바꿀 수 있습니다
const EVB=(()=>{const r=rng(29),C=[[2.2,7.6],[7.4,8],[2.8,2.4],[7.9,3]],z=[];C.forEach((c,j)=>{for(let t=0;t<20;t++)z.push({c:j,zx:gauss(r),zy:gauss(r)})});return{C,z}})();
// 3단계: 군집 3개 (군집 내 · 군집 간 거리 비교)
const SEPZ=(()=>{const r=rng(41),z=[];for(let j=0;j<3;j++)for(let t=0;t<14;t++)z.push({c:j,zx:gauss(r),zy:gauss(r)});return z})();

/* ---------- 계산 도우미 ---------- */
const d2=(p,q)=>(p[0]-q[0])**2+(p[1]-q[1])**2;
const dist=(p,q)=>Math.sqrt(d2(p,q));
const nf=(v,d=2)=>String(+(+v).toFixed(d)).replace('-','−');
const pt=p=>`(${nf(p[0])}, ${nf(p[1])})`;
const centroid=ps=>[mean(ps.map(p=>p[0])),mean(ps.map(p=>p[1]))];
function nearest(p,cs){let b=0,bd=Infinity;cs.forEach((c,j)=>{const d=d2(p,c);if(d<bd-1e-9){bd=d;b=j}});return b}
const inertiaOf=(ps,cs,asg)=>sum(ps.map((p,i)=>d2(p,cs[asg[i]])));
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
// 볼록 껍질 (monotone chain)
function hull(ps){const p=ps.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(p.length<3)return p;const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];
  for(const q of p){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],q)<=0)lo.pop();lo.push(q)}
  for(const q of p.slice().reverse()){while(up.length>=2&&cr(up[up.length-2],up[up.length-1],q)<=0)up.pop();up.push(q)}
  return lo.slice(0,-1).concat(up.slice(0,-1))}
// 점들을 pad(px)만큼 둥글게 감싸는 묶음 표시
function blob(P,ps,pad){const ring=[];ps.forEach(p=>{const x=P.X(p[0]),y=P.Y(p[1]);for(let t=0;t<20;t++){const a=t/20*2*Math.PI;ring.push([x+pad*Math.cos(a),y+pad*Math.sin(a)])}});
  const h=hull(ring);return'M'+h.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join('L')+'Z'}
const hullPath=(P,ps,g,pad=17)=>`<path class="hull g${g}" d="${blob(P,ps,pad)}" style="stroke:color-mix(in oklab,var(--g) 60%,transparent);stroke-width:1.5" pointer-events="none"/>`;
const star=(x,y,R=11)=>{let d='';for(let t=0;t<10;t++){const r=t%2?R*.45:R,a=-Math.PI/2+t*Math.PI/5;d+=(t?'L':'M')+(x+r*Math.cos(a)).toFixed(1)+' '+(y+r*Math.sin(a)).toFixed(1)}return d+'Z'};
const arrowDef=id=>`<defs><marker id="ah-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-2)"/></marker></defs>`;
const gOf=j=>j<0?0:j%6+1;
const lbl=(x,y,t,o='')=>`<text class="${/^[①-⑩]$/.test(t)?'lbl-b':'lbl'}" x="${x}" y="${y}" pointer-events="none" ${o}>${t}</text>`;

// k-평균 (k-means++ 시작, 여러 번 돌려 응집도가 가장 작은 결과)
function kmeans(ps,k,r){const n=ps.length;let cs=[ps[Math.floor(r()*n)].slice()];
  while(cs.length<k){const w=ps.map(p=>Math.min(...cs.map(c=>d2(p,c))));let t=r()*sum(w),i=0;while(i<n-1&&(t-=w[i])>0)i++;cs.push(ps[i].slice())}
  let asg=null;for(let it=0;it<100;it++){const na=ps.map(p=>nearest(p,cs));if(asg&&na.every((v,i)=>v===asg[i]))break;asg=na;cs=cs.map((c,j)=>{const m=ps.filter((p,i)=>asg[i]===j);return m.length?centroid(m):c})}
  return{asg,cs,inertia:inertiaOf(ps,cs,asg)}}
function bestKm(ps,k,seed){const r=rng(seed);let best=null;for(let t=0;t<12;t++){const o=kmeans(ps,k,r);if(!best||o.inertia<best.inertia-1e-9)best=o}return best}
function silhouette(ps,asg,k){const n=ps.length,s=ps.map((p,i)=>{const own=asg[i];const md=j=>{const m=ps.filter((q,t)=>t!==i&&asg[t]===j);return m.length?mean(m.map(q=>dist(p,q))):null};
    const a=md(own);if(a===null)return{a:0,b:0,s:0};let b=Infinity;for(let j=0;j<k;j++)if(j!==own){const v=md(j);if(v!==null&&v<b)b=v}
    return{a,b,s:b===Infinity?0:(b-a)/Math.max(a,b)}});return{s,score:mean(s.map(o=>o.s))}}

/* ---------- 상태 ---------- */
const APP={key:'cluster-theory-v1',
  init:()=>({sit:{},hg:'mix',
    k2:3,pair2:'ms',brush:1,asg:Array(10).fill(0),
    pair3:'ks',da:5,db:9,dturn:0,met:'euc',bl3:{},spread:.8,sep:3.2,
    hc:'ex1',link:'single',hm:0,hp:EX1.pts.map(p=>p.slice()),
    kd:'ex2',kk:4,kc:EX2.init.map(c=>c.slice()),ka:null,ko:null,kph:'assign',kh:[],ksel:-1,kseed:1,kfin:[],cmp:{},
    bl6:{},evk:4,evs:1.2,ox:{}}),
  resetStep(i){const d=APP.init(),a=S.app;
    ({1:['sit','hg'],2:['k2','pair2','brush','asg'],3:['pair3','da','db','dturn','met','bl3','spread','sep'],4:['hc','link','hm','hp'],5:['kd','kk','kc','ka','ko','kph','kh','ksel','kseed','kfin','cmp'],6:['bl6','evk','evs','ox']}[i]||[]).forEach(k=>a[k]=d[k])}
};

/* ---------- 1단계 자료 ---------- */
const SIT=[['‘스팸’, ‘정상’이 표시된 메일로 학습하여 새 메일이 스팸인지 판단한다.','cls','정답(스팸/정상)이 붙은 데이터로 학습하므로 분류(지도 학습)예요.'],
  ['고객의 구매 기록만 보고 구매 습관이 비슷한 고객끼리 묶는다.','clu','정답 없이 비슷한 고객끼리 묶으므로 군집 분석(비지도 학습)이에요.'],
  ['품종 이름이 적힌 붓꽃 데이터로 새 붓꽃의 품종을 맞힌다.','cls','품종 이름이라는 정답(레이블)이 있으므로 분류(지도 학습)예요.'],
  ['지역별 대기 오염 물질 배출량이 비슷한 지역끼리 묶는다.','clu','정답 없이 배출량이 비슷한 지역끼리 묶으므로 군집 분석이에요.'],
  ['[표1]의 학생들을 성적이 비슷한 학생끼리 묶는다.','clu','학생 유형이라는 정답이 없으므로 군집 분석이에요.']];
// 할리갈리 카드 56장: 과일 4종류 × 14장 (1개 5장, 2개 3장, 3개 3장, 4개 2장, 5개 1장)
const FRUIT=[['딸기','var(--cen)'],['라임','var(--s3)'],['자두','var(--s5)'],['바나나','var(--s4)']];
const HG=(()=>{const cnt=[5,3,3,2,1],c=[];FRUIT.forEach((f,fi)=>cnt.forEach((m,n)=>{for(let t=0;t<m;t++)c.push({f:fi,n:n+1})}));return shuffle(c,rng(3))})();

/* ---------- 2단계 ---------- */
const EX_ASG=[1,1,2,3,3,3,1,1,3,3]; // 학습지 예시 (수학 · 과학, 군집 3개)
const lvl=v=>v>=70?'높음':v<50?'낮음':'중간';

/* ---------- 3단계 ---------- */
function distPair(){const a=A(),ps=scPts(a.pair3),p=ps[a.da],q=ps[a.db],dx=Math.abs(p[0]-q[0]),dy=Math.abs(p[1]-q[1]);return{ps,p,q,dx,dy,e:Math.hypot(dx,dy),m:dx+dy}}
const BL3=[{id:'k1',a:20},{id:'s1',a:15},{id:'d1',a:25},{id:'k2',a:60},{id:'s2',a:45},{id:'d2',a:75},{id:'near',a:10,c:true},{id:'man',a:35}];
const BL6=[{id:'i1',a:8},{id:'i2',a:12},{id:'it',a:20}];
function blankOk(v,b){if(v==null||String(v).trim()==='')return null;let s=String(v).trim().replace(/\s/g,'').replace('−','-');if(b.c){const i=CIRC.indexOf(s);if(i>=0)s=String(i+1)}const n=parseFloat(s);return Number.isFinite(n)&&Math.abs(n-b.a)<.051}
const blank=(g,b)=>{const v=A()[g][b.id]??'',ok=blankOk(v,b);return`<input type="text" inputmode="decimal" autocomplete="off" data-in="${g}_${b.id}" value="${esc(v)}" class="${ok===null?'':ok?'ok':'bad'}" aria-label="빈칸">`};
const blankScore=(g,L)=>L.filter(b=>blankOk(A()[g][b.id],b)).length;
function sepData(){const a=A(),cen=[0,1,2].map(j=>{const t=-Math.PI/2+j*2*Math.PI/3;return[5+a.sep*Math.cos(t),5.3-a.sep*Math.sin(t)]});
  const ps=SEPZ.map(o=>[cen[o.c][0]+o.zx*a.spread,cen[o.c][1]+o.zy*a.spread]),g=SEPZ.map(o=>o.c);
  const cs=[0,1,2].map(j=>centroid(ps.filter((p,i)=>g[i]===j)));
  const within=mean(ps.map((p,i)=>dist(p,cs[g[i]]))),between=mean([dist(cs[0],cs[1]),dist(cs[1],cs[2]),dist(cs[0],cs[2])]);
  return{ps,g,cs,within,between,sil:silhouette(ps,g,3).score}}

/* ---------- 4단계: 계층적 군집 분석 ---------- */
function hcData(){return A().hc==='ex1'?{pts:A().hp,lab:EX1.lab,x:[0,10],y:[0,10],xt:11,yt:[0,2,4,6,8,10],xl:'x',yl:'y',pad:16,unit:''}:{pts:scPts('ms'),lab:[...CIRC.slice(0,10)],x:[0,110],y:[0,110],xt:[0,20,40,60,80,100],yt:[0,20,40,60,80,100],xl:'수학 (점)',yl:'과학 (점)',pad:13}}
const LINKS={single:['단일 연결법','두 군집에서 가장 가까운 두 점 사이의 거리'],complete:['완전 연결법','두 군집에서 가장 먼 두 점 사이의 거리'],average:['평균 연결법','두 군집의 모든 점 쌍 거리의 평균']};
function linkD(ps,a,b,link){const ds=[];a.forEach(i=>b.forEach(j=>ds.push(dist(ps[i],ps[j]))));return link==='single'?Math.min(...ds):link==='complete'?Math.max(...ds):mean(ds)}
function agglo(ps,link){let cl=ps.map((p,i)=>({id:i,m:[i],h:0,dep:0}));const out=[];
  while(cl.length>1){let best=null;for(let i=0;i<cl.length;i++)for(let j=i+1;j<cl.length;j++){const d=linkD(ps,cl[i].m,cl[j].m,link);if(!best||d<best.d-1e-9)best={i,j,d}}
    const a=cl[best.i],b=cl[best.j],nc={id:ps.length+out.length,m:[...a.m,...b.m].sort((x,y)=>x-y),a,b,h:best.d,dep:Math.max(a.dep,b.dep)+1,ord:out.length+1};
    out.push(nc);cl.splice(best.j,1);cl.splice(best.i,1,nc)}
  return out}
function clustersAt(n,merges,m){let cl=Array.from({length:n},(_,i)=>({id:i,m:[i]}));merges.slice(0,m).forEach(g=>{cl=cl.filter(c=>c.id!==g.a.id&&c.id!==g.b.id);cl.push(g)});return cl.sort((x,y)=>x.m[0]-y.m[0])}
const setName=(lab,m)=>`{${m.map(i=>lab[i]).join(', ')}}`;
function hcState(){const D=hcData(),n=D.pts.length,mg=agglo(D.pts,A().link),m=clamp(A().hm,0,n-1),cl=clustersAt(n,mg,m);
  let c=0;const col=cl.map(x=>x.m.length>1?gOf(c++):0),of=Array(n);cl.forEach((x,j)=>x.m.forEach(i=>of[i]=j));return{D,n,mg,m,cl,col,of}}

/* ---------- 5단계: k-평균 군집 분석 ---------- */
// 5단계 데이터: 예제(A~E, 4단계와 같은 점), [표1] 수학 · 과학, 무작위
const EXA={pts:EX1.pts,lab:EX1.lab,init:[[1,1],[4,6]],cl:['c1','c2'],k:2,x:[0,10],y:[0,10],xt:11,yt:[0,2,4,6,8,10],xl:'x',yl:'y'};
const EXS={pts:scPts('ms'),lab:[...CIRC.slice(0,10)],init:[[60,90],[80,40],[15,25]],cl:['C1','C2','C3'],k:3,x:[0,110],y:[0,110],xt:[0,20,40,60,80,100],yt:[0,20,40,60,80,100],xl:'수학 (점)',yl:'과학 (점)'};
const kmDS=()=>({exa:EXA,exs:EXS,ex2:EX2,ex3:EX3}[A().kd]||RND);
function kmInitC(){const D=kmDS();if(D.init)return D.init.map(c=>c.slice());const r=rng(A().kseed*131+7);return shuffle([...D.pts.keys()],r).slice(0,A().kk).map(i=>D.pts[i].slice())}
function kmReset(keepC){const a=A();if(!keepC)a.kc=kmInitC();a.ka=null;a.ko=null;a.kph='assign';a.kh=[];a.kst=[]}
// 이전으로: 한 단계 앞의 상태를 저장해 두었다가 되돌립니다
const KM_KEYS=['kc','ka','ko','kph','kh','kfin'];
function kmStep(){const a=A();if(a.kph==='done')return;(a.kst=a.kst||[]).push(JSON.stringify(KM_KEYS.map(k=>a[k])));if(a.kst.length>60)a.kst.shift();kmNext()}
function kmBack(){const a=A();if(!a.kst||!a.kst.length)return;JSON.parse(a.kst.pop()).forEach((v,i)=>a[KM_KEYS[i]]=v)}
function kmNext(){const a=A(),D=kmDS();if(a.kph==='done')return;
  if(a.kph==='assign'){a.ka=D.pts.map(p=>nearest(p,a.kc));a.ko=null;a.kh.push({c:a.kc.map(c=>c.slice()),g:a.ka.slice(),in:inertiaOf(D.pts,a.kc,a.ka)});a.kph='move';return}
  const nc=a.kc.map((c,j)=>{const m=D.pts.filter((p,i)=>a.ka[i]===j);return m.length?centroid(m):c.slice()});
  const moved=nc.some((c,j)=>d2(c,a.kc[j])>1e-12);a.ko=a.kc;a.kc=nc;a.kh[a.kh.length-1].n=nc.map(c=>c.slice());
  if(moved)a.kph='assign';else{a.kph='done';a.ko=null;if(a.kd==='rnd'){a.kfin.push({seed:a.kseed,k:a.kc.length,in:inertiaOf(D.pts,a.kc,a.ka),steps:a.kh.length});if(a.kfin.length>6)a.kfin.shift()}}}
const CMP=[['군집의 수를 미리 정해야 한다.','k'],['데이터의 패턴을 쉽게 시각화할 수 있다. (덴드로그램)','h'],['대규모 데이터셋에는 적용하기 어렵다.','h'],['한번 군집이 형성되면 수정할 수 없다.','h'],['처음 정한 중심점의 위치에 따라 결과가 달라질 수 있다.','k']];
// 예제 2를 끝까지 돌린 결과 (6단계 응집도 계산에 사용)
const EX2_END=(()=>{let cs=EX2.init.map(c=>c.slice()),asg;for(let t=0;t<20;t++){asg=EX2.pts.map(p=>nearest(p,cs));const nc=cs.map((c,j)=>centroid(EX2.pts.filter((p,i)=>asg[i]===j)));if(nc.every((c,j)=>d2(c,cs[j])<1e-12))break;cs=nc}return{cs,asg}})();

/* ---------- 6단계: 평가 ---------- */
const evPts=()=>EVB.z.map(o=>[EVB.C[o.c][0]+o.zx*.75*A().evs,EVB.C[o.c][1]+o.zy*.75*A().evs]);
let EVM={key:null,res:null};
function evalRes(){const key=A().evs;if(EVM.key===key)return EVM.res;const ps=evPts(),res={};
  for(let k=2;k<=8;k++){const o=bestKm(ps,k,k*7+1),si=silhouette(ps,o.asg,k);res[k]={...o,sil:si.score,s:si.s}}
  EVM={key,res};return res}
const OX=[['각 군집의 데이터가 고르게 분포한다.','O','군집마다 데이터가 고르게 모여 있으면 군집이 안정적으로 나뉜 거예요.'],['개별 데이터의 실루엣 계수가 음수인 경우가 많다.','X','실루엣 계수가 음수이면 그 데이터가 다른 군집에 더 가깝다는 뜻이라 좋지 않아요.'],['각 군집별 실루엣 계수의 평균이 실루엣 점수에서 크게 벗어나지 않는다.','O','군집마다 분리된 정도가 비슷해야 좋은 군집화예요.'],['실루엣 점수가 0에 가깝다.','X','실루엣 점수는 1에 가까울수록 좋고, 0에 가까우면 군집이 서로 겹쳐 있다는 뜻이에요.']];

/* ---------- 도전 과제 (이 앱은 사용하지 않음) ---------- */
const MISSIONS={};

/* ---------- 연습문제 ---------- */
const QUIZ={
  concept:{title:'군집 분석의 개념',intro:'1단계 시뮬레이션을 떠올리며 알맞은 답을 고르세요.',items:[
    {q:'군집 분석에 대한 설명으로 옳은 것은 무엇인가요?',o:['정답(레이블)이 있는 데이터로 학습하는 지도 학습이다','같은 군집에 속한 데이터끼리는 상이성이 높아야 한다','관측값 사이의 거리가 가까울수록 유사성이 높다','군집 분석 결과는 정답과 비교하여 정확도로 평가한다','서로 다른 군집 사이의 거리가 가까울수록 좋은 군집이다'],a:3,e:'군집 분석은 정답이 없는 비지도 학습이며, 관측값 사이의 거리로 유사성을 판단합니다.\n거리가 가까울수록 유사성이 높습니다.'},
    {q:'정답(레이블)이 있는 데이터로 학습하여 새 데이터의 종류를 맞히는 방법은 무엇인가요?',o:['군집 분석','분류','연관 분석','계층적 군집 분석'],a:2,e:'정답이 있는 데이터로 학습하는 분류는 지도 학습에 속합니다.\n군집 분석은 정답 없이 비슷한 것끼리 묶는 비지도 학습입니다.'},
    {q:'할리갈리 카드 56장을 ‘그려진 과일의 개수’를 기준으로 나누면 군집은 몇 개가 되나요?',o:['2개','4개','5개','56개'],a:3,e:'과일이 1~5개 그려져 있으므로 개수를 기준으로 나누면 5개의 군집이 됩니다.\n과일의 종류로 나누면 4개입니다.\n같은 카드도 기준에 따라 다르게 묶입니다.'}]},
  self:{title:'군집화하기',intro:'2단계에서 직접 묶어 본 결과를 떠올리며 알맞은 답을 고르세요.',items:[
    {q:'같은 데이터인데도 친구와 군집 결과가 서로 다를 수 있는 까닭은 무엇인가요?',o:['계산을 잘못했기 때문이다','비교할 정답이 없어 군집 수와 기준을 정하는 방법에 따라 결과가 달라지기 때문이다','데이터가 너무 적기 때문이다','군집 분석은 항상 같은 결과가 나와야 하기 때문이다'],a:2,e:'군집 분석에는 비교할 정답(레이블)이 없습니다.\n그래서 군집 수와 군집 기준을 어떻게 정하느냐에 따라 결과가 달라질 수 있습니다.'},
    {q:'수학·과학 성적 그래프에서 학생 ③(수학 40, 과학 95)이 속하는 군집의 특징으로 알맞은 것은 무엇인가요?',o:['수학, 과학 모두 높음','수학 낮고 과학 높음','수학 높고 과학 낮음','수학, 과학 모두 낮음'],a:2,e:'학생 ③은 수학 40점, 과학 95점이므로 수학은 낮고 과학은 높은 학생입니다.\n그래프에서 왼쪽 위에 따로 떨어져 있습니다.'},
    {q:'같은 학생 10명을 ‘수학 · 과학’ 대신 ‘정보 · 과학’으로 그려 보면 어떻게 되나요?',o:['점의 위치와 묶이는 모습이 달라질 수 있다','점의 위치가 그대로이다','군집 수가 반드시 늘어난다','군집 분석을 할 수 없다'],a:1,e:'어떤 속성(변수)을 기준으로 삼느냐에 따라 점의 위치가 달라지고, 비슷한 학생끼리 묶이는 모습도 달라집니다.\n2단계에서 과목을 바꿔 확인해 보세요.'}]},
  sim:{title:'유사성과 상이성',intro:'3단계 시뮬레이션의 결과를 보고 알맞은 답을 고르세요.',items:[
    {q:'두 점 a(2, 3), b(5, 7) 사이의 유클리디언 거리는 얼마인가요?',o:['3','4','5','7','25'],a:3,e:'x 차이 3, y 차이 4이므로 √(3² + 4²) = √25 = 5입니다.'},
    {q:'좋은 군집의 조건으로 알맞은 것은 무엇인가요?',o:['군집 내 유사성이 낮고, 군집 간 상이성이 높다','군집 내 유사성이 높고, 군집 간 상이성이 높다','군집 내 유사성이 높고, 군집 간 상이성이 낮다','군집 내 유사성과 군집 간 상이성이 모두 낮다'],a:2,e:'같은 군집 안의 데이터는 서로 가까워야(유사성 높음) 하고, 다른 군집끼리는 멀리 떨어져야(상이성 높음) 합니다.'},
    {q:'학생 ⑥(국어 40, 과학 45)과 ⑩(국어 60, 과학 30)의 맨해튼 거리는 얼마인가요?',o:['25','35','5','625'],a:2,e:'맨해튼 거리는 각 속성값 차이의 절댓값을 모두 더한 값입니다.\n|40 − 60| + |45 − 30| = 20 + 15 = 35입니다.\n유클리디언 거리(25)보다 깁니다.'}]},
  hier:{title:'계층적 군집 분석',intro:'4단계 시뮬레이션의 결과를 보고 알맞은 답을 고르세요.',items:[
    {q:'단일 연결법에서 두 군집 사이의 거리는 어떻게 재나요?',o:['두 군집의 중심점 사이의 거리','두 군집에서 가장 먼 두 점 사이의 거리','두 군집에서 가장 가까운 두 점 사이의 거리','두 군집의 점 개수의 차이'],a:3,e:'단일 연결법은 두 군집에서 가장 가까운 두 점 사이의 거리로 군집 사이의 거리를 잽니다.\n예제 1에서 {A, B}와 {C}의 거리는 B와 C 사이의 거리 3입니다.'},
    {q:'점 5개를 계층적 군집 분석으로 모두 하나의 군집으로 묶으려면 몇 번 묶어야 하나요?',o:['3번','4번','5번','10번'],a:2,e:'한 번 묶을 때마다 군집이 1개씩 줄어듭니다.\n군집 5개가 1개가 되려면 5 − 1 = 4번 묶어야 합니다.'},
    {q:'계층적 군집 분석에 대한 설명으로 옳은 것은 무엇인가요?',o:['군집 수 k를 먼저 정해야 한다','중심점을 평균 위치로 옮기는 과정을 반복한다','가장 가까운 개체들을 차례대로 묶는 과정을 반복한다','한번 묶은 군집도 나중에 다시 나눌 수 있다'],a:3,e:'계층적 군집 분석은 가장 가까운 군집끼리 차례대로 묶어 나갑니다.\n한번 묶이면 수정할 수 없고, 덴드로그램을 원하는 높이에서 잘라 군집 수를 정합니다.'}]},
  km:{title:'k-평균 군집 분석',intro:'5단계 시뮬레이션의 결과를 보고 알맞은 답을 고르세요.',items:[
    {q:'k-평균 군집 분석의 과정을 순서대로 바르게 나열한 것은 무엇인가요?<br>ㄱ. 각 군집 평균의 위치로 중심점을 옮긴다.<br>ㄴ. 군집 수 k를 정하고 k개의 중심점을 지정한다.<br>ㄷ. 중심점이 더 이상 움직이지 않으면 군집화를 끝낸다.<br>ㄹ. 각 데이터를 가장 가까운 중심점의 군집에 넣는다.',o:['ㄱ-ㄴ-ㄹ-ㄷ','ㄴ-ㄱ-ㄹ-ㄷ','ㄴ-ㄹ-ㄱ-ㄷ','ㄹ-ㄴ-ㄱ-ㄷ','ㄹ-ㄱ-ㄴ-ㄷ'],a:3,e:'k와 중심점을 정하고(ㄴ), 가까운 중심점에 데이터를 넣고(ㄹ), 평균 위치로 중심점을 옮기는(ㄱ) 과정을 중심점이 움직이지 않을 때까지(ㄷ) 반복합니다.'},
    {q:'계층적 군집 분석과 k-평균 군집 분석에 대한 설명으로 옳지 않은 것은 무엇인가요?',o:['계층적 군집 분석은 가장 가까운 개체들을 차례대로 묶는다','계층적 군집 분석은 군집의 수를 미리 정하지 않아도 된다','k-평균 군집 분석은 처음 정한 중심점의 위치에 민감하다','k-평균 군집 분석은 군집의 모양이 균일하지 않으면 오류가 생길 수 있다','계층적 군집 분석은 대규모 데이터셋에 적용하기 쉽다'],a:5,e:'계층적 군집 분석은 모든 군집 쌍의 거리를 계속 계산해야 하므로 대규모 데이터셋에는 적용하기 어렵습니다.'},
    {q:'예제 3에서 군집 1이 학생 ①(50, 90), ②(80, 89), ⑦(100, 100), ⑧(90, 87)일 때, 새 중심점은 어디인가요?',o:['(90, 90)','(80, 91.5)','(80, 90)','(75, 91.5)'],a:2,e:'국어 평균은 (50 + 80 + 100 + 90) ÷ 4 = 80, 수학 평균은 (90 + 89 + 100 + 87) ÷ 4 = 91.5입니다.\n중심점은 C1(90, 90)에서 (80, 91.5)로 옮겨 갑니다.'}]},
  eval:{title:'군집 분석 결과 평가',intro:'6단계 시뮬레이션의 결과를 보고 알맞은 답을 고르세요.',items:[
    {q:'군집 수 k를 바꾸어 가며 실루엣 점수를 구했습니다.<br>k = 2 : 0.41 · k = 3 : 0.58 · k = 4 : 0.52 · k = 5 : 0.47<br>옳은 것은 무엇인가요?',o:['최적의 군집 수는 2이다','k = 3일 때 군집이 가장 잘 분리되었다','네 경우 모두 좋은 군집이라고 할 수 있다','실루엣 점수는 0에 가까울수록 좋다','군집 수가 많을수록 항상 군집화가 잘 된다'],a:2,e:'실루엣 점수가 가장 높은(1에 가장 가까운) k = 3일 때 군집이 가장 잘 분리되었습니다.\n0.5 이상인 k = 3, 4만 좋은 군집이라고 할 수 있습니다.'},
    {q:'응집도(Inertia)에 대한 설명으로 옳은 것은 무엇인가요?',o:['군집 사이 거리의 합이다','중심점으로부터 군집 안 데이터까지 거리의 제곱의 합이며, 0에 가까울수록 군집 내 유사성이 크다','클수록 군집 내 유사성이 크다','실루엣 계수의 평균이다'],a:2,e:'응집도는 중심점에서 군집 안 각 데이터까지 거리의 제곱을 모두 더한 값입니다.\n작을수록(0에 가까울수록) 데이터가 중심점 주변에 모여 있습니다.'},
    {q:'k = 2일 때 실루엣 점수가 약 0.44였습니다. 알맞은 평가는 무엇인가요?',o:['0.5보다 낮아 좋은 군집이라고 보기 어렵다','0보다 크므로 아주 좋은 군집이다','실루엣 점수로는 평가할 수 없다','1보다 작으므로 군집화에 실패했다'],a:1,e:'실루엣 점수가 0.5 이상이면 좋은 군집이라고 합니다.\n0.44는 0.5보다 낮으므로 군집이 잘 분리되었다고 보기 어렵습니다.'}]}
};

/* ---------- 화면 조각 ---------- */
const VIEWS={};
// 0단계: 그림
const INTRO_FIG=(()=>{const r=rng(5),C=[[60,62],[150,40],[118,118]],P=[];C.forEach((c,j)=>{for(let t=0;t<7;t++)P.push([c[0]+gauss(r)*12,c[1]+gauss(r)*10,j])});
  const svg=(col)=>`<svg viewBox="0 0 200 160" class="chart" style="max-width:240px" role="img" aria-label="${col?'비슷한 것끼리 묶은 데이터':'정답이 없는 데이터'}">${col?C.map((c,j)=>{const m=P.filter(p=>p[2]===j);const h=hull(m.flatMap(p=>Array.from({length:12},(_,t)=>[p[0]+12*Math.cos(t*Math.PI/6),p[1]+12*Math.sin(t*Math.PI/6)])));return`<path class="hull g${j+1}" d="M${h.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join('L')}Z"/>`}).join(''):''}${P.map(p=>`<circle class="pt g${col?p[2]+1:0}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="5"/>`).join('')}</svg>`;
  return`<div class="sim2" style="align-items:center;grid-template-columns:1fr auto 1fr"><figure style="margin:0;text-align:center">${svg(false)}<figcaption class="hint">정답(레이블)이 없는 데이터</figcaption></figure><span style="font-size:26px;color:var(--muted)">→</span><figure style="margin:0;text-align:center">${svg(true)}<figcaption class="hint">비슷한 것끼리 묶은 군집</figcaption></figure></div>`})();
const SC_TABLE=gridTable(['번호',...CIRC.slice(0,10).split('')],['k','m','i','s'].map(s=>[`<b>${SUBJ[s]}</b>`,...SC[s]]));

// 1단계
VIEWS.sit=()=>`<div class="pairs">${SIT.map((c,k)=>{const v=A().sit[k];return`<div class="quiz-item" style="padding-top:8px"><p class="q"><b>${CIRC[k]}</b> ${c[0]}</p><div class="opts">${[['cls','분류 (지도 학습)'],['clu','군집 분석 (비지도 학습)']].map(([o,t])=>`<button type="button" class="opt ${v===o?(c[1]===o?'right':'wrong'):''}" data-act="sit" data-k="${k}" data-v="${o}">${t}</button>`).join('')}</div>${v?`<p class="fb ${v===c[1]?'good':'bad'}">${v===c[1]?c[2]:'다시 생각해 보세요. 데이터에 정답(레이블)이 붙어 있나요?'}</p>`:''}</div>`}).join('')}</div>`;
VIEWS.hg=()=>{const m=A().hg,cardH=c=>`<div class="hgc" data-tip="${FRUIT[c.f][0]} ${c.n}개">${'<i></i>'.repeat(c.n).replace(/<i>/g,`<i style="--f:${FRUIT[c.f][1]}">`)}</div>`;
  let groups;if(m==='mix')groups=[['섞여 있는 카드 56장',HG]];
  else if(m==='fruit')groups=FRUIT.map((f,fi)=>{const g=HG.filter(c=>c.f===fi);return[`${f[0]} · ${g.length}장`,g]});
  else groups=[1,2,3,4,5].map(n=>{const g=HG.filter(c=>c.n===n);return[`과일 ${n}개 · ${g.length}장`,g]});
  return`<div class="hg">${groups.map(([t,g])=>`<div class="hg-group"><b>${t}</b><div class="hg-cards">${g.map(cardH).join('')}</div></div>`).join('')}</div>`+
    (m==='mix'?`<p class="note">카드를 어떤 기준으로 나눌 수 있을까요? 위의 버튼을 눌러 보세요.</p>`:insight(m==='fruit'?'과일의 종류로 나누기 → 4개의 군집':'그려진 과일의 개수로 나누기 → 5개의 군집','같은 카드 56장이라도 무엇을 기준으로 삼느냐에 따라 군집의 수와 모양이 달라져요. 군집 분석에는 정해진 정답이 없어요.'))};

// 2단계: 직접 군집화하기
VIEWS.brush=()=>{const a=A();return`<div class="seg brush" role="group">${Array.from({length:a.k2},(_,j)=>j+1).map(j=>`<button type="button" class="g${gOf(j-1)}" data-act="brush" data-v="${j}" aria-pressed="${a.brush===j}"><i></i>군집 ${j}</button>`).join('')}<button type="button" class="g0" data-act="brush" data-v="0" aria-pressed="${a.brush===0}"><i></i>지우개</button></div>`};
VIEWS.self=()=>{const a=A(),[xs,ys]=PAIRS[a.pair2],ps=scPts(a.pair2);
  const P=plot({id:'p-self',w:520,h:420,x:[0,110],y:[0,110],xt:[0,20,40,60,80,100],yt:[0,20,40,60,80,100],xl:`${SUBJ[xs]} (점)`,yl:`${SUBJ[ys]} (점)`,label:'성적 산점도에서 직접 군집 묶기'});
  let s=P.head;for(let j=1;j<=a.k2;j++){const m=ps.filter((p,i)=>a.asg[i]===j);if(m.length)s+=hullPath(P,m,gOf(j-1),16)}
  ps.forEach((p,i)=>{const X=P.X(p[0]),Y=P.Y(p[1]);s+=`<circle class="pt g${a.asg[i]?gOf(a.asg[i]-1):0}" cx="${X}" cy="${Y}" r="7" data-pick="as" data-i="${i}" data-tip="${esc(`학생 ${NO(i)} · ${SUBJ[xs]} ${p[0]}점, ${SUBJ[ys]} ${p[1]}점`)}"/>`+lbl(X+9,Y-8,NO(i))});
  s+=P.end;const left=a.asg.filter(v=>!v).length;
  const rows=Array.from({length:a.k2},(_,j)=>j+1).map(j=>{const ids=[...a.asg.keys()].filter(i=>a.asg[i]===j);if(!ids.length)return[`<span class="chip g g${gOf(j-1)}">군집 ${j}</span>`,'—','—','<span class="hint">아직 비어 있어요</span>'];
    const c=centroid(ids.map(i=>ps[i]));return[`<span class="chip g g${gOf(j-1)}">군집 ${j}</span>`,ids.map(NO).join(', '),`(${nf(c[0],1)}, ${nf(c[1],1)})`,`${SUBJ[xs]} ${lvl(c[0])} · ${SUBJ[ys]} ${lvl(c[1])}`]});
  return`<div class="sim2"><div>${s}<p class="hint">위에서 군집 색을 고른 뒤 점을 누르면 그 군집에 들어갑니다. 같은 색으로 다시 누르면 빠집니다.</p></div><div>
    <div class="stat">${fact('군집 수',`${a.k2}개`,'한 번 정하면 바꾸지 않기')}${fact('남은 학생',`${left}명`,left?'모든 학생을 군집에 넣어 보세요':'모두 묶었어요!',left?'hl':'')}</div>
    ${gridTable(['군집','학생 번호',`평균 (${SUBJ[xs]}, ${SUBJ[ys]})`,'군집 기준 (자동)'],rows)}
    <p class="hint">‘군집 기준’은 평균이 70점 이상이면 높음, 50점 미만이면 낮음, 그 사이는 중간으로 적었습니다. 내가 생각한 기준과 비교해 보세요.</p>
    ${left?'':insight('과목을 바꿔 보세요','위에서 과목 쌍을 바꾸면 내가 만든 군집이 다른 과목에서는 어떻게 보이는지 확인할 수 있어요. 같은 학생들도 어떤 속성으로 보느냐에 따라 묶이는 모습이 달라져요.')}</div></div>`};

// 3단계: 거리
VIEWS.dist=()=>{const a=A(),[xs,ys]=PAIRS[a.pair3],D=distPair(),{ps,p,q}=D,euc=a.met==='euc';
  const P=plot({id:'p-dist',w:520,h:420,x:[0,110],y:[0,110],xt:[0,20,40,60,80,100],yt:[0,20,40,60,80,100],xl:`${SUBJ[xs]} (점)`,yl:`${SUBJ[ys]} (점)`,label:'두 학생 사이의 거리'});
  let s=P.head;const X=P.X,Y=P.Y,cx=X(q[0]),cy=Y(p[1]);
  const halo='paint-order:stroke;stroke:var(--surface);stroke-width:4px;stroke-linejoin:round';
  const tag=(x,y,t,anchor,col)=>`<text x="${x}" y="${y}" text-anchor="${anchor}" pointer-events="none" style="font-size:13.5px;font-weight:700;fill:${col};${halo}">${t}</text>`;
  let top='';
  if(a.da!==a.db){
    s+=`<line class="dist" x1="${X(p[0])}" y1="${Y(p[1])}" x2="${cx}" y2="${cy}" style="${euc?'':'stroke:var(--accent);stroke-width:3;stroke-dasharray:none'}"/><line class="dist" x1="${cx}" y1="${cy}" x2="${X(q[0])}" y2="${Y(q[1])}" style="${euc?'':'stroke:var(--accent);stroke-width:3;stroke-dasharray:none'}"/>`;
    s+=`<line x1="${X(p[0])}" y1="${Y(p[1])}" x2="${X(q[0])}" y2="${Y(q[1])}" style="stroke:var(--accent);stroke-width:${euc?3:1.5};opacity:${euc?1:.35}"/>`;
    // 차이 글자: 두 점이 만든 삼각형 바깥쪽에, 다리가 짧으면 더 멀리 (점 위에 겹쳐도 읽히도록 흰 테두리)
    const qy=Y(q[1]),px=X(p[0]),hx=Math.abs(cx-px),vy=Math.abs(qy-cy),up=qy>cy;
    const dxY=up?cy-(hx<90?22:12):cy+(hx<90?30:20),dxX=hx<90?(px+cx)/2+(cx>px?-1:1)*Math.max(0,45-hx/2):(px+cx)/2;
    const right=cx>=px,dyX=cx+(right?14:-14),dyY=vy<30?(cy+qy)/2+(up?18:-10):(cy+qy)/2+4;
    if(D.dx)top+=tag(dxX,dxY,`${SUBJ[xs]} 차 ${D.dx}`,'middle','var(--ink-2)');
    if(D.dy)top+=tag(dyX,dyY,`${SUBJ[ys]} 차 ${D.dy}`,right?'start':'end','var(--ink-2)');
  }
  ps.forEach((o,i)=>{const on=i===a.da||i===a.db,Xi=X(o[0]),Yi=Y(o[1]);s+=`<circle class="pt ${i===a.da?'g1':i===a.db?'g2':'g0'}" cx="${Xi}" cy="${Yi}" r="${on?8:6.5}" data-pick="dp" data-i="${i}" data-tip="${esc(`학생 ${NO(i)} (${o[0]}, ${o[1]})`)}"/>`;
    if(!on)s+=lbl(Xi+9,Yi-9,NO(i))});
  // 고른 두 학생의 번호: 점 옆 바깥쪽(다른 학생의 반대쪽)에 같은 높이로
  [[a.da,a.db,-1],[a.db,a.da,1]].forEach(([i,j,d0])=>{const o=ps[i],w=ps[j],sd=o[0]===w[0]?d0:Math.sign(o[0]-w[0]);
    top+=tag(X(o[0])+sd*15,Y(o[1])+5,NO(i),sd>0?'start':'end','var(--ink)')});
  s+=top;
  s+=P.end;
  const others=ps.map((o,i)=>({i,e:dist(p,o),m:Math.abs(p[0]-o[0])+Math.abs(p[1]-o[1])})).filter(o=>o.i!==a.da).sort((x,y)=>(euc?x.e-y.e:x.m-y.m)||x.i-y.i);
  return`<div class="sim2"><div>${s}<p class="hint">점을 두 번 차례로 누르면 기준 학생(파랑)과 비교할 학생(주황)이 바뀝니다. 다음에 누르면 ${a.dturn?'비교할 학생':'기준 학생'}이 바뀌어요.</p></div><div>
    <div class="big-eq">${NO(a.da)}(${p[0]}, ${p[1]}) ↔ ${NO(a.db)}(${q[0]}, ${q[1]})</div>
    <div class="stat">${fact('유클리디언 거리',nf(D.e,2),`√(${D.dx}² + ${D.dy}²)`,euc?'hl':'')}${fact('맨해튼 거리',nf(D.m),`${D.dx} + ${D.dy}`,euc?'':'hl')}</div>
    <p class="note">학생 ${NO(a.da)}과 ${euc?'유클리디언':'맨해튼'} 거리가 가까운 순서 · 거리가 가까울수록 <b>유사성이 높아요</b>.</p>
    ${gridTable(['순위','학생','유클리디언 거리','맨해튼 거리'],others.map((o,r)=>({cls:o.i===a.db?'sel':'',cells:[`<b>${r+1}</b>`,`${NO(o.i)} (${ps[o.i][0]}, ${ps[o.i][1]})`,nf(o.e,1),nf(o.m)]})))}
  </div></div>`};
VIEWS.bl3=()=>{const n=blankScore('bl3',BL3);return`<p class="note">맞힌 빈칸 <b>${n} / ${BL3.length}</b>${n===BL3.length?' · 모두 맞혔어요!':' · 맞으면 칸이 초록색으로 바뀝니다.'}</p>`};
VIEWS.sep=()=>{const o=sepData(),P=plot({id:'p-sep',w:480,h:400,x:[-1,11],y:[-1,11],xt:[0,2,4,6,8,10],yt:[0,2,4,6,8,10],label:'군집 내 거리와 군집 간 거리',max:500});
  let s=P.head+`<clipPath id="cp-sep"><rect x="${P.m.l}" y="${P.m.t}" width="${P.iw}" height="${P.ih}"/></clipPath><g clip-path="url(#cp-sep)">`;
  [0,1,2].forEach(j=>{s+=hullPath(P,o.ps.filter((p,i)=>o.g[i]===j),j+1,12)});
  [[0,1],[1,2],[0,2]].forEach(([i,j])=>{s+=`<line class="dist" x1="${P.X(o.cs[i][0])}" y1="${P.Y(o.cs[i][1])}" x2="${P.X(o.cs[j][0])}" y2="${P.Y(o.cs[j][1])}"/>`});
  o.ps.forEach((p,i)=>{s+=`<circle class="pt g${o.g[i]+1}" cx="${P.X(p[0])}" cy="${P.Y(p[1])}" r="4.5"/>`});
  o.cs.forEach((c,j)=>{s+=`<path class="g${j+1}" d="${star(P.X(c[0]),P.Y(c[1]),9)}" style="fill:var(--g);stroke:var(--ink);stroke-width:1.2"/>`});
  s+='</g>'+P.end;const ratio=o.between/o.within;
  const v=ratio>=4?['잘 나뉜 군집','pos','군집 내 유사성과 군집 간 상이성이 모두 높아요.']:ratio>=2.2?['조금 겹치는 군집','warn','경계 근처의 점은 어느 군집인지 헷갈려요.']:['구분하기 어려운 군집','neg','군집끼리 겹쳐서 상이성이 낮아요.'];
  return`<div class="sim2"><div>${s}<p class="hint">★은 각 군집의 중심, 점선은 군집 중심 사이의 거리입니다.</p></div><div>
    <div class="stat">${fact('군집 내 평균 거리',nf(o.within),'작을수록 군집 내 유사성 ↑')}${fact('군집 간 평균 거리',nf(o.between),'클수록 군집 간 상이성 ↑')}</div>
    <div class="stat">${fact('군집 간 ÷ 군집 내',nf(ratio,1)+'배',`<span class="badge ${v[1]}">${v[0]}</span>`,'hl')}</div>
    <p class="note">${v[2]}</p>${insight('좋은 군집','군집 내 유사성은 높고(같은 군집끼리 가깝고), 군집 간 상이성은 높아야(다른 군집끼리 멀어야) 해요.')}</div></div>`};

// 4단계: 계층적 군집 분석
VIEWS.hcctl=()=>{const st=hcState();return`<div class="btns">${btn('h0','↺ 처음으로',{dis:!st.m})}${btn('hback','← 이전으로',{dis:!st.m})}${btn('hstep',st.m<st.n-1?`${st.m+1}번째 묶기 →`:'모두 묶었어요',{cls:'primary',dis:st.m>=st.n-1})}${btn('hall','끝까지 묶기',{dis:st.m>=st.n-1})}${A().hc==='ex1'?btn('hpos','점 위치 되돌리기'):''}</div>`};
VIEWS.hc=()=>{const st=hcState(),{D,n,mg,m,cl,col,of}=st,lab=D.lab;
  const P=plot({id:'p-hc',w:480,h:420,x:D.x,y:D.y,xt:D.xt,yt:D.yt,xl:D.xl,yl:D.yl,label:'계층적 군집 분석 묶음 표시',max:500});
  let s=P.head;
  cl.forEach((c,j)=>{if(c.m.length>1)s+=`<path class="hull g${col[j]}" d="${blob(P,c.m.map(i=>D.pts[i]),D.pad+8*(c.dep-1)+4)}" style="stroke:none" pointer-events="none"/>`});
  mg.slice(0,m).forEach(g=>{const pad=D.pad+8*(g.dep-1)+4,path=blob(P,g.m.map(i=>D.pts[i]),pad);const top=Math.min(...g.m.map(i=>P.Y(D.pts[i][1])))-pad;const lx=mean(g.m.map(i=>P.X(D.pts[i][0])));
    s+=`<path d="${path}" style="fill:none;stroke:var(--ink-2);stroke-width:1.4;stroke-dasharray:5 3" pointer-events="none"/><circle cx="${lx}" cy="${top}" r="9" style="fill:var(--ink)"/><text class="num-in" x="${lx}" y="${top+4}">${g.ord}</text>`});
  D.pts.forEach((p,i)=>{const X=P.X(p[0]),Y=P.Y(p[1]);s+=`<circle class="pt g${col[of[i]]}" cx="${X}" cy="${Y}" r="7" ${A().hc==='ex1'?`data-drag="hp" data-i="${i}"`:''} data-tip="${esc(`${lab[i]} (${nf(p[0])}, ${nf(p[1])})`+(A().hc==='ex1'?' · 끌어서 옮길 수 있어요':''))}"/>`+lbl(X+10,Y+16,lab[i],'style="font-weight:600;fill:var(--ink)"')});
  s+=P.end;
  // 덴드로그램
  const root=mg[mg.length-1],order=[];(function walk(c){if(c.a){walk(c.a);walk(c.b)}else order.push(c.id)})(root);
  const xi=Array(n);order.forEach((id,k)=>xi[id]=k);const maxH=root.h||1;
  const Q=plot({id:'p-den',w:480,h:300,x:[-.6,n-.4],y:[0,maxH*1.15],xt:order.map((_,k)=>k),xf:t=>lab[order[t]],yl:'거리 (높이)',label:'덴드로그램',max:500,m:{b:30}});
  let t=Q.head;const nodeX=c=>c.a?(nodeX(c.a)+nodeX(c.b))/2:xi[c.id],nodeH=c=>c.a?c.h:0;
  mg.slice(0,m).forEach(g=>{const ax=Q.X(nodeX(g.a)),bx=Q.X(nodeX(g.b)),y=Q.Y(g.h),gc=col[of[g.m[0]]];
    t+=`<path class="g${gc}" d="M${ax} ${Q.Y(nodeH(g.a))}V${y}H${bx}V${Q.Y(nodeH(g.b))}" style="fill:none;stroke:${gc?'var(--g)':'var(--ink-2)'};stroke-width:2.5"/><text class="lbl" x="${(ax+bx)/2}" y="${y-6}" text-anchor="middle">${CIRC[g.ord-1]} 거리 ${nf(g.h)}</text>`});
  mg.slice(m).forEach(g=>{const ax=Q.X(nodeX(g.a)),bx=Q.X(nodeX(g.b)),y=Q.Y(g.h);t+=`<path d="M${ax} ${Q.Y(nodeH(g.a))}V${y}H${bx}V${Q.Y(nodeH(g.b))}" style="fill:none;stroke:var(--line-2);stroke-width:1.5;stroke-dasharray:3 3"/>`});
  if(m<n-1){const lo=m?mg[m-1].h:0,hi=mg[m].h,cy=Q.Y((lo+hi)/2);t+=`<line x1="${Q.m.l}" x2="${Q.m.l+Q.iw}" y1="${cy}" y2="${cy}" style="stroke:var(--cen);stroke-width:1.5;stroke-dasharray:6 4"/><text class="lbl" x="${Q.m.l+Q.iw-4}" y="${cy-6}" text-anchor="end" style="fill:var(--cen)">여기서 자르면 군집 ${n-m}개</text>`}
  t+=Q.end;
  // 현재 군집 사이 거리표
  let best=null;const names=cl.map(c=>setName(lab,c.m)),dm=cl.map((a,i)=>cl.map((b,j)=>{if(i===j)return 0;const d=linkD(D.pts,a.m,b.m,A().link);if(i<j&&(!best||d<best.d-1e-9))best={i,j,d};return d}));
  const mtx=cl.length>1?`<div class="mtx tw scroll">${gridTable(['',...names],cl.map((c,i)=>[`<b>${names[i]}</b>`,...cl.map((_,j)=>i===j?{v:'·',cls:'dash'}:{v:nf(dm[i][j]),cls:best&&((i===best.i&&j===best.j)||(i===best.j&&j===best.i))?'hot':''})]))}</div><p class="hint">파란 칸이 지금 가장 가까운 두 군집입니다 → 다음에 묶입니다. (${LINKS[A().link][0]}: ${LINKS[A().link][1]})</p>`:insight('모두 하나로 묶였어요',`${n}개의 점을 ${n-1}번 묶어 하나의 군집이 되었어요. 덴드로그램을 원하는 높이에서 자르면 군집 수를 정할 수 있어요.`);
  return`<div class="sim2"><div>${s}${t}</div><div>
    <div class="stat">${fact('묶은 횟수',`${m} / ${n-1}`)}${fact('남은 군집 수',`${n-m}개`,`${n} − ${m}`,'hl')}</div>
    ${m?gridTable(['순서','묶이는 두 군집','거리'],mg.slice(0,m).map(g=>[`<b>${g.ord}번째</b>`,`${setName(lab,g.a.m)}와 ${setName(lab,g.b.m)}`,nf(g.h)])):'<p class="note">아직 아무것도 묶지 않았어요. <b>1번째 묶기</b>를 눌러 가장 가까운 두 점을 묶어 보세요.</p>'}
    <p class="sec-t" style="margin:4px 0 0;font-weight:600">지금 군집 사이의 거리</p>${mtx}
  </div></div>`};

// 5단계: k-평균 군집 분석
VIEWS.kmctl=()=>{const a=A(),D=kmDS(),lbls={assign:'① 가까운 중심점의 군집에 넣기',move:'② 군집의 평균 위치로 중심점 옮기기',done:'✓ 중심점이 움직이지 않아요 · 끝'};
  return`${a.kd==='rnd'?`<div class="ctls"><span class="hint">군집 수 k</span>${seg('kk',[2,3,4,5,6].map(v=>[v,`k = ${v}`]),a.kk)}${btn('kseed','🎲 처음 중심점 다시 뽑기')}</div>`:''}
  <div class="btns">${btn('kback','← 이전으로',{dis:!(a.kst&&a.kst.length)})}${btn('knext',lbls[a.kph],{cls:'primary',dis:a.kph==='done'})}${btn('kall','끝까지 반복하기',{dis:a.kph==='done'})}${btn('kreset','↺ 처음 중심점으로',{dis:!a.kh.length})}</div>`};
VIEWS.km=()=>{{const a=A(),D=kmDS();if(!Array.isArray(a.kc)||a.kc.length!==(D.k||a.kk)||(a.ka&&a.ka.length!==D.pts.length))kmReset()}const a=A(),D=kmDS(),ps=D.pts,cs=a.kc,asg=a.ka,k=cs.length,cl=D.cl||cs.map((_,j)=>'c'+(j+1)),lab=D.lab;
  const P=plot({id:'p-km',w:520,h:440,x:D.x,y:D.y,xt:D.xt,yt:D.yt,xl:D.xl,yl:D.yl,label:'k-평균 군집 분석'});
  let s=P.head+arrowDef('km');
  if(asg)for(let j=0;j<k;j++){const m=ps.filter((p,i)=>asg[i]===j);if(m.length)s+=hullPath(P,m,gOf(j),lab?15:11)}
  const sel=a.ksel>=0&&a.ksel<ps.length?a.ksel:-1;
  if(sel>=0){const p=ps[sel],nj=nearest(p,cs);cs.forEach((c,j)=>{const x1=P.X(p[0]),y1=P.Y(p[1]),x2=P.X(c[0]),y2=P.Y(c[1]);s+=`<line class="dist ${j===nj?'near':''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text class="lbl" x="${(x1+x2)/2+5}" y="${(y1+y2)/2-5}" style="${j===nj?'fill:var(--accent);font-weight:700':''}">${nf(dist(p,c),1)}</text>`})}
  ps.forEach((p,i)=>{const X=P.X(p[0]),Y=P.Y(p[1]);s+=`<circle class="pt g${asg?gOf(asg[i]):0}" cx="${X}" cy="${Y}" r="${lab?7:5.5}" data-pick="ksel" data-i="${i}" data-tip="${esc(`${lab?lab[i]+' ':''}${pt(p)} · 누르면 중심점까지 거리가 보여요`)}"/>${i===sel?`<circle class="sel-ring" cx="${X}" cy="${Y}" r="11" pointer-events="none"/>`:''}`+(lab?lbl(X+9,Y-9,lab[i],'style="font-weight:600;fill:var(--ink)"'):'')});
  if(a.ko)a.ko.forEach((c,j)=>{const x1=P.X(c[0]),y1=P.Y(c[1]),x2=P.X(cs[j][0]),y2=P.Y(cs[j][1]);s+=`<path class="g${gOf(j)}" d="${star(x1,y1,10)}" style="fill:none;stroke:var(--g);stroke-width:1.6;stroke-dasharray:3 2"/>`;if(Math.hypot(x2-x1,y2-y1)>14)s+=`<line class="arrow" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#ah-km)"/>`});
  cs.forEach((c,j)=>{const X=P.X(c[0]),Y=P.Y(c[1]);s+=`<path class="g${gOf(j)}" d="${star(X,Y,12)}" style="fill:var(--g);stroke:var(--ink);stroke-width:1.4;cursor:grab" data-drag="kc" data-i="${j}" data-tip="${esc(`중심점 ${cl[j]} ${pt(c)} · 끌어서 처음 위치를 바꿀 수 있어요`)}"/><text class="lbl-b" x="${X+12}" y="${Y+18}" pointer-events="none">${cl[j]}</text>`});
  s+=P.end;
  const phaseNote={assign:a.kh.length?'중심점을 옮겼어요. 이제 각 점을 <b>새 중심점</b> 중 가장 가까운 곳에 다시 넣어 보세요.':'★이 처음 중심점입니다. 각 점을 <b>가장 가까운 중심점</b>의 군집에 넣어 보세요.',move:'각 점이 가장 가까운 중심점의 군집에 들어갔어요. 이제 중심점을 <b>군집에 속한 점들의 평균 위치</b>로 옮겨 보세요.',done:''}[a.kph];
  const inNow=asg?inertiaOf(ps,cs,asg):null;
  let tbl='';
  if(lab){const nearOf=ps.map(p=>nearest(p,cs));tbl=`<p class="sec-t" style="margin:4px 0 0;font-weight:600">지금 중심점까지의 유클리디언 거리</p>`+gridTable(['점',...cl.map((c,j)=>`${c}까지`),'소속'],ps.map((p,i)=>({cls:i===sel?'sel':'',cells:[`<b>${lab[i]}</b> ${pt(p)}`,...cs.map((c,j)=>({v:nf(dist(p,c),1),cls:j===nearOf[i]?'c-hl':''})),`<span class="chip g g${gOf(nearOf[i])}">군집 ${nearOf[i]+1}</span>`]})));}
  const hist=a.kh.length?(lab?gridTable(['단계','이때의 중심점',...cl.map((_,j)=>`군집 ${j+1}`),'옮겨 간 중심점'],a.kh.map((h,t)=>[`<b>${t+1}단계</b>`,h.c.map((c,j)=>`${cl[j]}${pt(c)}`).join('<br>'),...cl.map((_,j)=>h.g.map((g,i)=>g===j?lab[i]:null).filter(Boolean).join(', ')||'—'),h.n?h.n.map((c,j)=>`${cl[j]}${pt(c)}`).join('<br>'):'<span class="hint">옮기기 전</span>']))
    :gridTable(['단계','군집별 점의 수','응집도'],a.kh.map((h,t)=>[`<b>${t+1}단계</b>`,cl.map((_,j)=>h.g.filter(g=>g===j).length).join(' · '),nf(h.in,1)]))):'';
  const fin=a.kd==='rnd'&&a.kfin.length?`<p class="sec-t" style="margin:4px 0 0;font-weight:600">처음 중심점에 따른 최종 결과</p>`+gridTable(['시도','k','반복 단계','최종 응집도'],a.kfin.map((f,t)=>[`<b>${t+1}</b>`,f.k,f.steps,nf(f.in,2)])):'';
  return`<div class="sim2 km-wide"><div>${s}<p class="hint">점을 누르면 각 중심점까지의 거리가 보입니다. ★ 중심점을 끌면 처음 위치를 바꿔 다시 시작합니다.</p></div><div>
    <div class="stat">${fact('반복 단계',`${a.kh.length}단계`,a.kph==='done'?'군집화 끝':'진행 중')}${fact('응집도',inNow===null?'—':nf(inNow,a.kd==='rnd'?1:2),'거리 제곱의 합 · 작을수록 좋음','hl')}</div>
    ${a.kph==='done'?insight('중심점이 더 이상 움직이지 않아요',`${a.kh.length}단계에서 군집에 속한 점이 바뀌지 않아 중심점이 그대로예요. 군집화가 끝났어요.`+(a.kd==='rnd'?' 처음 중심점을 다시 뽑아 최종 응집도가 같은지 비교해 보세요.':''),'✓'):`<p class="note">${phaseNote}</p>`}
    ${fin}${hist?`<p class="sec-t" style="margin:4px 0 0;font-weight:600">단계별 기록</p><div style="overflow-x:auto">${hist}</div>`:''}${tbl?`<div style="overflow-x:auto">${tbl}</div>`:''}
  </div></div>`};
VIEWS.cmp=()=>`<div class="tw"><table><thead><tr><th class="l">특징</th><th>계층적 군집 분석</th><th>k-평균 군집 분석</th></tr></thead><tbody>${CMP.map((c,k)=>{const v=A().cmp[k];return`<tr><td class="l">${CIRC[k]} ${c[0]}</td>${['h','k'].map(o=>`<td><button type="button" class="opt ${v===o?(c[1]===o?'right':'wrong'):''}" data-act="cmp" data-k="${k}" data-v="${o}" aria-label="${o==='h'?'계층적':'k-평균'}">${v===o?(c[1]===o?'○':'✗'):'　'}</button></td>`).join('')}</tr>`}).join('')}</tbody></table></div>`+
  (CMP.every((c,k)=>A().cmp[k]===c[1])?insight('모두 맞혔어요','계층적 군집 분석은 군집 수를 미리 정하지 않고 덴드로그램으로 볼 수 있지만, 계산이 많고 한번 묶으면 되돌릴 수 없어요. k-평균은 k를 먼저 정해야 하고 처음 중심점에 따라 결과가 달라질 수 있어요.','✓'):'<p class="hint">알맞은 쪽 칸을 눌러 ○표 하세요. 틀리면 ✗가 표시됩니다.</p>');

// 6단계: 응집도 계산
VIEWS.inert=()=>{const {cs,asg}=EX2_END,ps=EX2.pts,P=plot({id:'p-in',w:420,h:380,x:[0,10],y:[0,10],xt:11,yt:[0,2,4,6,8,10],xl:'x',yl:'y',label:'예제 2 결과와 응집도',max:440});
  let s=P.head;[0,1].forEach(j=>{s+=hullPath(P,ps.filter((p,i)=>asg[i]===j),gOf(j),15)});
  ps.forEach((p,i)=>{const c=cs[asg[i]],x1=P.X(p[0]),y1=P.Y(p[1]),x2=P.X(c[0]),y2=P.Y(c[1]);s+=`<line class="dist" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text class="lbl" x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}">${nf(d2(p,c))}</text>`});
  ps.forEach((p,i)=>{const X=P.X(p[0]),Y=P.Y(p[1]);s+=`<circle class="pt g${gOf(asg[i])}" cx="${X}" cy="${Y}" r="7"/>`+lbl(X+9,Y+17,EX2.lab[i],'style="font-weight:600;fill:var(--ink)"')});
  cs.forEach((c,j)=>{s+=`<path class="g${gOf(j)}" d="${star(P.X(c[0]),P.Y(c[1]),12)}" style="fill:var(--g);stroke:var(--ink);stroke-width:1.4"/><text class="lbl-b" x="${P.X(c[0])+12}" y="${P.Y(c[1])-10}">c${j+1}</text>`});
  s+=P.end;
  const row=j=>{const ids=[...ps.keys()].filter(i=>asg[i]===j);return ids.map(i=>`${EX2.lab[i]}: (${ps[i][0]}−${nf(cs[j][0])})² + (${ps[i][1]}−${nf(cs[j][1])})² = <b>${nf(d2(ps[i],cs[j]))}</b>`).join('<br>')};
  return`<div class="sim2"><div>${s}<p class="hint">점선 위의 숫자는 중심점까지 거리의 제곱입니다.</p></div><div class="mtx">
    ${gridTable(['군집','중심점','각 점까지 거리의 제곱','군집별 응집도'],[[`<span class="chip g g1">군집 1</span>`,`c1${pt(cs[0])}`,{v:row(0),cls:'l'},blank('bl6',BL6[0])],[`<span class="chip g g2">군집 2</span>`,`c2${pt(cs[1])}`,{v:row(1),cls:'l'},blank('bl6',BL6[1])],{cls:'sum-row',cells:['<b>전체</b>','','<b>군집별 응집도의 합</b>',blank('bl6',BL6[2])]}])}
    ${slot('bl6')}</div></div>`};
VIEWS.bl6=()=>{const n=blankScore('bl6',BL6);return n===BL6.length?insight('응집도 = 8 + 12 = 20','중심점으로부터 군집 안 데이터까지 거리의 제곱을 모두 더했어요. 0에 가까울수록 군집 내 유사성이 커요.','✓'):`<p class="note">빈칸에 응집도를 계산해 넣어 보세요. 맞힌 빈칸 <b>${n} / ${BL6.length}</b></p>`};
// 6단계: 실루엣 · 엘보
VIEWS.ev=()=>{const a=A(),R=evalRes(),k=a.evk,o=R[k],ps=evPts();
  const ks=[2,3,4,5,6,7,8],sils=ks.map(v=>R[v].sil),ins=ks.map(v=>R[v].inertia),bestK=ks[sils.indexOf(Math.max(...sils))];
  const lineChart=(id,ys,ylo,yhi,yl,title,thr)=>{const P=plot({id,w:400,h:380,x:[1.5,8.5],y:[ylo,yhi],xt:ks,xl:'군집 수 k',yl,label:title,m:{l:56,b:42}});let s=P.head;
    if(thr!=null)s+=`<line x1="${P.m.l}" x2="${P.m.l+P.iw}" y1="${P.Y(thr)}" y2="${P.Y(thr)}" style="stroke:var(--imp-ink);stroke-width:1.5;stroke-dasharray:5 4"/><text class="lbl" x="${P.X(5.5)}" y="${P.Y(thr)+16}" text-anchor="middle" style="fill:var(--imp-ink)">0.5 이상이면 좋은 군집</text>`;
    s+=`<polyline points="${ks.map((v,t)=>`${P.X(v)},${P.Y(ys[t])}`).join(' ')}" style="fill:none;stroke:var(--accent);stroke-width:2.2"/>`;
    ks.forEach((v,t)=>{s+=`<circle cx="${P.X(v)}" cy="${P.Y(ys[t])}" r="${v===k?7:5}" class="${v===k?'':'dot'}" style="${v===k?'fill:var(--cen);stroke:var(--surface);stroke-width:2':''};cursor:pointer" data-pick="evk" data-i="${v}" data-tip="k = ${v} · ${id==='p-sil'?'실루엣 점수 '+fx(ys[t]):'응집도 '+nf(ys[t],1)}"/>`});
    return`<p class="sec-t" style="margin:0">${title}</p>`+s+P.end};
  const gA=lineChart('p-sil',sils,Math.min(0,...sils)-.05,1,'실루엣 점수','[그래프 A] 실루엣 점수',.5),gB=lineChart('p-elb',ins,0,Math.max(...ins)*1.08,'응집도','[그래프 B] 응집도 (엘보 방법)',null);
  // 산점도
  const P=plot({id:'p-ev',w:420,h:380,x:[-1,11],y:[-1,11],xt:[0,2,4,6,8,10],yt:[0,2,4,6,8,10],label:`k = ${k} 군집 결과`,max:440});
  let s=P.head+`<clipPath id="cp-ev"><rect x="${P.m.l}" y="${P.m.t}" width="${P.iw}" height="${P.ih}"/></clipPath><g clip-path="url(#cp-ev)">`;
  for(let j=0;j<k;j++){const m=ps.filter((p,i)=>o.asg[i]===j);if(m.length)s+=hullPath(P,m,gOf(j),9)}
  ps.forEach((p,i)=>{const si=o.s[i];s+=`<circle class="pt g${gOf(o.asg[i])}" cx="${P.X(p[0])}" cy="${P.Y(p[1])}" r="${si.s<0?6:4.5}" style="${si.s<0?'stroke:var(--ink);stroke-width:2':''}" data-tip="${esc(`군집 ${o.asg[i]+1}\na (같은 군집 평균 거리) = ${fx(si.a)}\nb (가장 가까운 다른 군집 평균 거리) = ${fx(si.b)}\n실루엣 계수 s = ${fx(si.s)}`)}"/>`});
  o.cs.forEach((c,j)=>{s+=`<path class="g${gOf(j)}" d="${star(P.X(c[0]),P.Y(c[1]),10)}" style="fill:var(--g);stroke:var(--ink);stroke-width:1.3" pointer-events="none"/>`});
  s+='</g>'+P.end;
  // 실루엣 막대
  const ord=[...ps.keys()].sort((x,y)=>o.asg[x]-o.asg[y]||o.s[y].s-o.s[x].s),n=ps.length,lo=Math.min(-.2,...o.s.map(v=>v.s));
  const Q=plot({id:'p-sbar',w:420,h:230,x:[0,n],y:[lo,1],xt:[],yt:[lo<-.25?-.5:-.2,0,.2,.4,.6,.8,1].filter(v=>v>=lo-1e-9),yl:'실루엣 계수',label:'데이터별 실루엣 계수',max:440,m:{b:22,t:22}});
  let b=Q.head;const bw=Q.iw/n;ord.forEach((i,t)=>{const v=o.s[i].s,y0=Q.Y(0),y1=Q.Y(v);b+=`<rect class="g${gOf(o.asg[i])}" x="${Q.m.l+t*bw+.4}" y="${Math.min(y0,y1)}" width="${Math.max(.6,bw-.8)}" height="${Math.abs(y1-y0)}" style="fill:var(--g)" data-tip="군집 ${o.asg[i]+1} · s = ${fx(v)}"/>`});
  b+=`<line x1="${Q.m.l}" x2="${Q.m.l+Q.iw}" y1="${Q.Y(o.sil)}" y2="${Q.Y(o.sil)}" style="stroke:var(--cen);stroke-width:1.6;stroke-dasharray:5 4"/><text class="lbl" x="${Q.m.l+Q.iw}" y="${Q.m.t+2}" text-anchor="end" style="fill:var(--cen)">- - 실루엣 점수 ${fx(o.sil)}</text><line class="base" x1="${Q.m.l}" x2="${Q.m.l+Q.iw}" y1="${Q.Y(0)}" y2="${Q.Y(0)}"/>`+Q.end;
  const neg=o.s.filter(v=>v.s<0).length,good=o.sil>=.5;
  const perC=Array.from({length:k},(_,j)=>{const v=o.s.filter((x,i)=>o.asg[i]===j).map(x=>x.s);return v.length?mean(v):0});
  return`<div class="ctls">${seg('evk',ks.map(v=>[v,`k = ${v}`]),k)}</div>
  <p class="hint">버튼으로 k를 바꾸거나 [그래프 A] · [그래프 B]의 점을 누르면 군집 결과가 바뀝니다.</p>
  <div class="ev3"><div><p class="sec-t" style="margin:0">k = ${k}일 때 군집 결과</p>${s}</div><div>${gA}</div><div>${gB}</div></div>
  <p class="hint">산점도의 점 위에 마우스를 올리면 그 점의 a, b, 실루엣 계수가 보입니다. 테두리가 굵은 점은 실루엣 계수가 음수인 점입니다.</p>
  <div class="sim2"><div>
    <div class="stat">${fact('실루엣 점수',fx(o.sil),`<span class="badge ${good?'pos':'warn'}">${good?'좋은 군집 (0.5 이상)':'좋은 군집이라 보기 어려움'}</span>`,'hl')}${fact('응집도',nf(o.inertia,1),'거리 제곱의 합')}</div>
    <div class="stat">${fact('실루엣 점수가 가장 높은 k',`k = ${bestK}`,`점수 ${fx(R[bestK].sil)}`)}${fact('음수인 데이터',`${neg}개`,`전체 ${n}개 중`)}</div>
  </div><div>
    ${gridTable(['군집','데이터 수','실루엣 계수 평균'],perC.map((v,j)=>[`<span class="chip g g${gOf(j)}">군집 ${j+1}</span>`,o.asg.filter(g=>g===j).length,{v:fx(v),cls:Math.abs(v-o.sil)>.15?'c-out':''}]))}
    <p class="note">실루엣 계수 <b>s = (b − a) ÷ max(a, b)</b><br>a는 같은 군집 데이터와의 평균 거리, b는 가장 가까운 다른 군집 데이터와의 평균 거리입니다. 1에 가까울수록 자기 군집에 잘 들어가 있습니다.</p>
  </div></div>`};
VIEWS.ox=()=>`<div class="pairs">${OX.map((c,k)=>{const v=A().ox[k];return`<div class="quiz-item" style="padding-top:8px"><p class="q"><b>${CIRC[k]}</b> ${c[0]}</p><div class="opts">${['O','X'].map(o=>`<button type="button" class="opt ${v===o?(c[1]===o?'right':'wrong'):''}" data-act="ox" data-k="${k}" data-v="${o}">${o}</button>`).join('')}</div>${v?`<p class="fb ${v===c[1]?'good':'bad'}">${v===c[1]?c[2]:'다시 생각해 보세요. 실루엣 점수가 1에 가까울수록 좋은 군집이에요.'}</p>`:''}</div>`}).join('')}</div>`;

/* ---------- 입력 · 동작 ---------- */
const IN={
  spread:{get:()=>A().spread,set:v=>A().spread=v,fmt:v=>fx(v)},sep:{get:()=>A().sep,set:v=>A().sep=v,fmt:v=>fx(v,1)},
  evs:{get:()=>A().evs,set:v=>A().evs=v,fmt:v=>fx(v)}
};
[['bl3',BL3],['bl6',BL6]].forEach(([g,L])=>L.forEach(b=>{IN[`${g}_${b.id}`]={get:()=>A()[g][b.id]??'',set:v=>{A()[g][b.id]=v;const el=document.querySelector(`[data-in="${g}_${b.id}"]`),ok=blankOk(v,b);if(el)el.className=ok===null?'':ok?'ok':'bad'}}}));
const ACT={
  sit:d=>{A().sit[d.k]=d.v},
  hg:d=>{A().hg=d.v},
  k2:d=>{const a=A();a.k2=+d.v;a.asg=a.asg.map(v=>v>a.k2?0:v);if(a.brush>a.k2)a.brush=1},
  pair2:d=>{A().pair2=d.v},
  brush:d=>{A().brush=+d.v},
  ex2:()=>{const a=A();a.k2=3;a.pair2='ms';a.asg=EX_ASG.slice();renderStep();return false},
  clr2:()=>{A().asg=Array(10).fill(0)},
  pair3:d=>{A().pair3=d.v},
  met:d=>{A().met=d.v},
  sepPre:d=>{const [sp,se]=d.v.split(',');A().spread=+sp;A().sep=+se},
  hc:d=>{A().hc=d.v;A().hm=0},
  link:d=>{A().link=d.v},
  hstep:()=>{A().hm=Math.min(A().hm+1,hcData().pts.length-1)},
  hback:()=>{A().hm=Math.max(A().hm-1,0)},
  hall:()=>{A().hm=hcData().pts.length-1},
  h0:()=>{A().hm=0},
  hpos:()=>{A().hp=EX1.pts.map(p=>p.slice())},
  kd:d=>{const a=A();a.kd=d.v;a.ksel=-1;kmReset()},
  kk:d=>{A().kk=+d.v;kmReset()},
  kseed:()=>{A().kseed++;kmReset()},
  knext:()=>kmStep(),
  kback:()=>kmBack(),
  kall:()=>{for(let t=0;t<200&&A().kph!=='done';t++)kmStep()},
  kreset:()=>{kmReset()},
  cmp:d=>{A().cmp[d.k]=d.v},
  ox:d=>{A().ox[d.k]=d.v},
  evk:d=>{A().evk=+d.v}
};
const DRAG={
  hp:(p,i)=>{A().hp[i]=[clamp(Math.round(p.x*2)/2,0,10),clamp(Math.round(p.y*2)/2,0,10)]},
  kc:(p,j)=>{const D=kmDS(),a=A();a.kc[j]=[clamp(Math.round(p.x*(D.x[1]>20?1:10))/(D.x[1]>20?1:10),D.x[0],D.x[1]),clamp(Math.round(p.y*(D.x[1]>20?1:10))/(D.x[1]>20?1:10),D.y[0],D.y[1])];kmReset(true)}
};
const CLICK={};
const PICK={
  as:i=>{const a=A();a.asg[i]=a.asg[i]===a.brush?0:a.brush},
  dp:i=>{const a=A();if(a.dturn===0){if(i===a.db)a.db=a.da;a.da=i;a.dturn=1}else{if(i===a.da)return false;a.db=i;a.dturn=0}},
  ksel:i=>{A().ksel=A().ksel===i?-1:i},
  evk:i=>{A().evk=i}
};

/* ---------- 단계 ---------- */
const STEPS=[
{title:'군집 분석 모델 미리 보기',short:'먼저 알아보기',page:'128–133쪽',
  goal:'군집 분석이 어떤 문제를 해결하는 방법인지 알아보고, 이 앱에서 어떤 시뮬레이션을 하게 되는지 살펴보세요.',
  concept:'<p>어느 반 학생 10명의 과목별 성적을 모았습니다.&nbsp;이 데이터에는 학생이 어떤 유형인지 알려 주는 <b>정답이 적혀 있지 않습니다</b>. 성적이 비슷한 학생끼리 묶어 보면서, 정답이 없는 데이터에서 무리를 찾는 방법인 <b>군집 분석</b>을 알아봅시다.</p>'+INTRO_FIG,
  render:()=>card('[표1] 성적 데이터셋',SC_TABLE,{sub:'단위: 점 · 이 앱의 여러 단계에서 이 데이터를 사용합니다.'})+
    card('이 앱에서 해 볼 시뮬레이션',`<ol class="proc">${[['군집 분석의 개념','분류 vs 군집 · 카드 나누기',1],['군집화하기','점을 눌러 직접 묶기',2],['유사성과 상이성','거리 재기',3],['계층적 군집 분석','차례대로 묶기 · 덴드로그램',4],['k-평균 군집 분석','중심점 옮기기 반복',5],['결과 평가','실루엣 · 엘보',6]].map(([t,s,to])=>`<li><button type="button" data-act="go" data-step="${to}"><b>${t}</b><small>${s}</small></button></li>`).join('')}</ol><p class="note">각 단계 끝에는 <b>연습문제</b>가 있습니다. 연습문제를 모두 맞히면 단계에 ✓ 표시가 됩니다.</p>`,{sub:'단계를 누르면 해당 시뮬레이션으로 이동합니다.'})},
{title:'군집 분석의 개념',short:'군집 분석의 개념',page:'128쪽',quiz:'concept',
  goal:'정답이 있는 데이터로 학습하는 분류와, 정답 없이 비슷한 것끼리 묶는 군집 분석을 구분해 봅니다.',
  concept:'<p><b>군집 분석(Cluster Analysis)</b>은 데이터를 비슷한 것끼리 같은 군집으로 묶은 후, 군집 내·군집 간 특징을 분석하는 대표적인 <b>비지도 학습</b> 방법입니다. 군집 분석 데이터는 정답 또는 <b>레이블링</b>이 되어 있지 않으므로, 관측값 사이의 <b>유사성</b>을 파악하여 군집을 만듭니다.</p><p>정답값이 있는 데이터로 학습하는 <b>분류</b>는 지도 학습에 속합니다.</p>',
  render:()=>card('분류일까, 군집 분석일까?',slot('sit'),{sub:'상황에 알맞은 방법을 골라 보세요.'})+
    card('생각 열기 · 할리갈리 카드 나누기',`<div class="ctls">${seg('hg',[['mix','섞인 카드'],['fruit','과일의 종류로 나누기'],['count','과일의 개수로 나누기']],A().hg)}</div>${slot('hg')}`,{sub:'카드 56장은 네 종류의 과일(딸기, 라임, 자두, 바나나) 카드이고, 카드마다 과일이 1~5개 그려져 있습니다. 카드 위에 마우스를 올리면 내용이 보여요.'})},
{title:'군집화하기',short:'군집화하기',page:'129쪽',quiz:'self',
  goal:'[표1]의 성적을 점으로 찍고, 내가 정한 군집 수와 기준에 따라 학생들을 직접 묶어 봅니다.',
  concept:'<p><b>스스로 실습</b> ① 2~6 사이에서 군집 수를 정합니다. (한 번 정한 군집 수는 바꾸지 않습니다.) ② [표1]의 수학, 과학 성적을 점으로 찍습니다. ③ 군집 수만큼 군집 기준을 정하고, 군집마다 묶음 표시를 합니다.</p>',
  render:()=>card('성적이 비슷한 학생끼리 묶기',`<div class="ctls"><span class="hint">군집 수</span>${seg('k2',[2,3,4,5,6].map(v=>[v,`${v}개`]),A().k2)}<span class="hint">과목</span>${seg('pair2',PAIR_OPTS,A().pair2)}</div><div class="ctls">${slot('brush')}${btn('ex2','학습지 예시 답 보기')}${btn('clr2','모두 지우기')}</div>${slot('self')}`,{sub:'군집 색을 고르고 점을 눌러 학생을 군집에 넣어 보세요.'})+
    '<div class="wide-concept" style="grid-column:1/-1">'+insight('친구와 비교해 보세요','같은 데이터인데도 군집 결과가 서로 다를 수 있어요. 군집 분석에는 비교할 정답(레이블)이 없어서, 군집 수와 군집 기준을 어떻게 정하느냐에 따라 결과가 달라지기 때문이에요.')+'</div>'},
{title:'유사성과 상이성',short:'유사성과 상이성',page:'130쪽',quiz:'sim',
  goal:'두 학생 사이의 거리를 재어 유사성을 수치로 나타내 보고, 좋은 군집이 되는 조건을 확인합니다.',
  concept:'<p><b>유사성</b>은 두 개체 사이의 가까운 정도를 수치로 표현한 것입니다. 같은 군집에 속한 관측값들의 거리가 가까울수록 <b>유사성</b>이 높고, 서로 다른 군집 사이의 거리가 멀수록 <b>상이성</b>이 높습니다. 좋은 군집은 군집 내 유사성이 높고, 군집 간 상이성이 높습니다.</p><p>유사성은 관측값 사이의 <b>거리</b>로 계산하며, 대표적인 방법은 <b>유클리디언 거리</b> <span class="formula" style="font-family:var(--sans);font-size:17px"><math><mi>d</mi><mo>=</mo><msqrt><msup><mrow><mo>(</mo><msub><mi>a</mi><mn>1</mn></msub><mo>−</mo><msub><mi>b</mi><mn>1</mn></msub><mo>)</mo></mrow><mn>2</mn></msup><mo>+</mo><msup><mrow><mo>(</mo><msub><mi>a</mi><mn>2</mn></msub><mo>−</mo><msub><mi>b</mi><mn>2</mn></msub><mo>)</mo></mrow><mn>2</mn></msup></msqrt></math></span>입니다.</p>',
  render:()=>card('두 학생 사이의 거리 재기',`<div class="ctls"><span class="hint">과목</span>${seg('pair3',PAIR_OPTS,A().pair3)}${seg('met',[['euc','유클리디언 거리'],['man','맨해튼 거리']],A().met)}</div>${slot('dist')}`,{sub:'학습지처럼 국어, 과학 성적으로 시작합니다. 점을 눌러 두 학생을 골라 보세요.'})+
    card('학습지 빈칸 채우기',`<div class="mtx">${gridTable(['두 학생 (국어, 과학)','국어 점수 차이','과학 점수 차이','거리 d'],[['⑥(40, 45)와 ⑩(60, 30)',blank('bl3',BL3[0]),blank('bl3',BL3[1]),blank('bl3',BL3[2])],['⑥(40, 45)와 ⑦(100, 90)',blank('bl3',BL3[3]),blank('bl3',BL3[4]),blank('bl3',BL3[5])]])}</div>
      <div class="qin"><label><span>⑥과 더 비슷한 학생</span>${blank('bl3',BL3[6])}<small>⑩ 또는 ⑦ (번호만 써도 돼요)</small></label><label><span>⑥과 ⑩의 맨해튼 거리</span>${blank('bl3',BL3[7])}<small>각 속성값 차이의 절댓값을 모두 더한 거리</small></label></div>${slot('bl3')}`,{sub:'위의 시뮬레이션으로 확인하기 전에 먼저 계산해 보세요.'})+
    card('좋은 군집이란?',`<div class="ctls">${range('spread','군집 안 흩어진 정도',.2,2,.05)}${range('sep','군집 사이 거리',.6,4.2,.1)}${seg('sepPre',[['0.5,3.6','잘 나뉜 군집'],['1.6,1.4','겹친 군집']],'')}</div>${slot('sep')}`,{sub:'세 군집의 흩어진 정도와 군집 사이의 거리를 바꾸어 보세요.'})},
{title:'계층적 군집 분석',short:'계층적 군집 분석',page:'131쪽',quiz:'hier',
  goal:'가장 가까운 군집끼리 차례대로 묶어 나가는 과정을 한 단계씩 따라가며, 덴드로그램으로 군집 수를 정하는 방법을 알아봅니다.',
  concept:'<p>군집을 순차적으로 할당하는 <b>계층적 군집 분석</b>은 군집 사이의 거리를 계산하여 <b>가장 가까운</b> 개체들을 차례대로 묶는 과정을 반복합니다. 묶는 과정을 나무 모양으로 나타낸 그림을 <b>덴드로그램</b>이라고 하며, 원하는 높이에서 잘라 군집 수를 정할 수 있습니다.</p><p>[예제 1] A(2, 2), B(3, 2), C(3, 5), D(7, 5), E(7, 7)을 묶어 봅니다. 두 군집 사이의 거리는 두 군집에서 가장 가까운 두 점 사이의 거리로 잽니다. (<b>단일 연결법</b>)</p>',
  render:()=>card('가장 가까운 것끼리 차례대로 묶기',`<div class="ctls">${seg('hc',[['ex1','예제 (A~E)'],['sc','[표1] 수학 · 과학']],A().hc)}${seg('link',[['single','단일 연결법'],['complete','완전 연결법'],['average','평균 연결법']],A().link)}</div>${slot('hcctl')}${slot('hc')}`,{sub:'버튼을 누를 때마다 가장 가까운 두 군집이 하나로 묶입니다. 예제의 점은 끌어서 옮길 수 있어요.'})+
    card('연결법에 따라 달라지는 거리',guide('단일 · 완전 · 평균 연결법',`<p>군집 안에 점이 여러 개이면 ‘두 군집 사이의 거리’를 정하는 방법이 필요합니다. 학습지에서 사용한 <b>단일 연결법</b>은 가장 가까운 두 점 사이의 거리를 씁니다.</p>${dl([['단일 연결법','두 군집에서 가장 가까운 두 점 사이의 거리'],['완전 연결법','두 군집에서 가장 먼 두 점 사이의 거리'],['평균 연결법','두 군집의 모든 점 쌍 거리의 평균']])}<p>위 시뮬레이션에서 연결법을 바꾸어 묶이는 순서와 덴드로그램의 높이가 어떻게 달라지는지 비교해 보세요.</p>`),{sub:'교과서 밖 더 알아보기'})},
{title:'k-평균 군집 분석',short:'k-평균 군집 분석',page:'131–132쪽',quiz:'km',
  goal:'k개의 중심점을 기준으로 군집을 만들고, 중심점을 평균 위치로 옮기는 과정을 중심점이 움직이지 않을 때까지 반복해 봅니다.',
  concept:'<p>군집을 무작위로 할당하는 <b>분할적 군집 분석</b>의 대표인 <b>k-평균 군집 분석</b>은 군집 수 <b>k</b>개를 먼저 지정하고, k개의 중심점을 기준으로 군집을 형성합니다. 그다음 군집별 <b>평균</b>의 위치로 중심점을 갱신하며, 중심점의 위치에 변동이 없을 때까지 반복합니다.</p><ol class="proc" style="margin-top:8px"><li><button type="button" tabindex="-1"><b>k 정하기</b><small>중심점 k개 지정</small></button></li><li><button type="button" tabindex="-1"><b>군집에 넣기</b><small>가장 가까운 중심점</small></button></li><li><button type="button" tabindex="-1"><b>중심점 옮기기</b><small>군집의 평균 위치</small></button></li><li><button type="button" tabindex="-1"><b>반복 · 끝</b><small>중심점이 그대로이면</small></button></li></ol>',
  render:()=>card('k-평균 군집 분석 한 단계씩 해 보기',`<div class="ctls">${seg('kd',[['exa','예제 (A~E, k = 2)'],['exs','[표1] 수학 · 과학 (k = 3)'],['rnd','무작위 데이터 48개']],A().kd)}</div>${slot('kmctl')}${slot('km')}`,{sub:'예제 2의 처음 중심점은 c1(1, 2), c2(5, 4), 예제 3은 C1(90, 90), C2(80, 45), C3(40, 10)입니다. 버튼을 한 번씩 눌러 보세요.'})+
    '<div style="grid-column:1/-1">'+insight('예제 3 더 생각해 보기','학생 ①(50, 90)은 군집 1에 들어가지만 같은 군집의 ②, ⑦, ⑧과 멀리 떨어져 있어요. 그래서 ①이 들어가면 군집 1 안의 데이터가 모여 있는 정도가 줄어들어 군집 내 유사성이 낮아져요.')+'</div>'+
    card('정리 · 두 군집 분석 방법의 특징',slot('cmp'),{sub:'특징에 알맞은 방법에 ○표 해 보세요.'})},
{title:'군집 분석 결과 평가',short:'결과 평가',page:'133쪽',quiz:'eval',
  goal:'정답이 없는 군집 분석에서 응집도와 실루엣 계수로 군집 결과를 평가하고, 최적의 군집 수를 찾아봅니다.',
  concept:'<p>군집 분석은 결과를 비교할 수 있는 <b>정답</b>이 없으므로, 최적의 <b>군집 수</b>를 찾는 과정이 필요합니다.</p><p><b>실루엣 계수</b>는 데이터의 유사성과 상이성을 바탕으로 군집이 얼마나 잘 분리되었는지 나타냅니다. 실루엣 점수(실루엣 계수의 평균)가 <b>1</b>에 가까울수록 군집화가 잘 된 것이며, <b>0.5</b> 이상이면 좋은 군집이라고 합니다.</p><p><b>엘보 방법</b>은 k-평균 군집 분석에서 응집도가 갑자기 작아지다가 완만해지는 지점(팔꿈치 모양)을 찾는 방법입니다. <b>응집도(Inertia)</b>는 중심점으로부터 군집 안 개별 데이터까지 거리의 <b>제곱의 합</b>이며, 0에 가까울수록 군집 내 유사성이 큽니다.</p>',
  render:()=>card('예제 2 결과로 응집도 구하기',VIEWS.inert(),{sub:'5단계 [예제 2]의 k-평균 결과(3단계)입니다. 거리의 제곱 = (x 차이)² + (y 차이)²'})+
    card('실루엣 점수와 엘보 방법으로 군집 수 정하기',`<div class="ctls">${range('evs','데이터가 흩어진 정도',.4,2.2,.05)}</div>${slot('ev')}`,{sub:'같은 데이터 80개를 군집 수 k를 바꾸어 가며 k-평균 군집 분석한 결과입니다.'})+
    card('좋은 군집화의 조건',slot('ox'),{sub:'옳으면 O, 옳지 않으면 X를 골라 보세요.'})}
];
const GROUPS={0:'시작',1:'02 군집 분석 모델'};
function FLOW(){const a=A(),ok=SIT.filter((s,k)=>a.sit[k]===s[1]).length,nA=a.asg.filter(v=>v).length,D3=distPair(),hs=hcState(),ev=evalRes()[a.evk];
  const kin=a.ka?inertiaOf(kmDS().pts,a.kc,a.ka):null;
  return[
    {steps:[1,0],l:'군집 분석의 개념',b:`${ok} / 5 구분`,s:'분류 vs 군집 분석',d:quizDone('concept'),wait:!ok},
    {steps:[2],l:'군집화하기',b:`군집 ${a.k2}개`,s:`${nA} / 10명 묶음`,d:quizDone('self'),wait:!nA},
    {steps:[3],l:'유사성과 상이성',b:`d = ${nf(D3.e,1)}`,s:`${NO(a.da)} ↔ ${NO(a.db)}`,d:quizDone('sim')},
    {steps:[4],l:'계층적 군집 분석',b:`${hs.m} / ${hs.n-1}번 묶음`,s:`남은 군집 ${hs.n-hs.m}개`,d:quizDone('hier'),wait:!hs.m},
    {steps:[5],l:'k-평균 군집 분석',b:a.kph==='done'?'수렴 완료':`${a.kh.length}단계`,s:kin===null?'군집에 넣기 전':`응집도 ${nf(kin,1)}`,d:quizDone('km'),wait:!a.kh.length},
    {steps:[6],l:'결과 평가',b:`k = ${a.evk}`,s:`실루엣 점수 ${fx(ev.sil)}`,d:quizDone('eval')}]}
const KEYNOTE=`# 군집 분석 모델 핵심 정리 (교과서 128–133쪽)

# 1. 군집 분석 = 비지도 학습
정답(레이블) 없음 → 유사성으로 비슷한 것끼리 묶기
분류 = 정답이 있는 지도 학습

# 2. 유사성과 상이성
좋은 군집 = 군집 내 유사성 ↑, 군집 간 상이성 ↑
유클리디언 거리 d = √((a₁−b₁)² + (a₂−b₂)²)
맨해튼 거리 = |a₁−b₁| + |a₂−b₂|

# 3. 계층적 군집 분석
가장 가까운 군집끼리 차례대로 묶기 → 덴드로그램

# 4. k-평균 군집 분석
k 정하기 → 가까운 중심점에 넣기 → 평균으로 중심점 옮기기 → 반복

# 5. 평가
실루엣 점수: 1에 가까울수록 좋음, 0.5 이상이면 좋은 군집
응집도 = 중심점까지 거리 제곱의 합 (엘보 방법)`;
