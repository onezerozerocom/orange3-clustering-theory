/* =====================================================================
   ws.js · 문제 풀이 합치기 (app.js 다음, core.js 앞에서 불러옵니다)
   각 단계에 「군집 분석 학습지」의 문제 칸을 넣고, '저장하기'로 이 브라우저에 답을 저장합니다.
   app.js는 군집 분석 이론 앱을 바탕으로 하며, 문제 칸과 관련된 내용은 모두 이 파일에 있습니다.
   ===================================================================== */

/* ---------- 시뮬레이션 저장 키 · 기본값 ---------- */
APP.key = 'cluster-theory-ws-v4';                         // 원래 이론 앱과 저장 공간을 나눔
const _init0 = APP.init;
APP.init = () => ({ ..._init0(), sp: 0, spts: null, d6: -1, kd: 'exa', kc: EXA.init.map(c => c.slice()) });   // 3단계: ⑥과 비교할 학생, 5단계: 예제(A~E)로 시작

/* ---------- 답 ('저장하기'를 누르면 이 브라우저에 저장, 다음에 열면 이어서) ---------- */
const WS_KEY = 'cluster-theory-ws-answers-v1';
let WSA = {}, savedAt = null;
try { const d = JSON.parse(localStorage.getItem(WS_KEY) || 'null'); if (d && d.a) { WSA = d.a; savedAt = d.at || null; } } catch (e) {}
let savedSnap = JSON.stringify(WSA);

/* ---------- 입력 칸 만들기 ---------- */
const bl = (k, w = 6, lab = '빈칸') => `<span class="ws-bl">(<input class="ws-in" data-k="${k}" style="width:${w}em" aria-label="${lab}" autocomplete="off">)</span>`;
const ti = (k, lab = '칸', cls = '') => `<input class="ws-in ws-cell ${cls}" data-k="${k}" aria-label="${lab}" autocomplete="off">`;
const pick = (k, opts, lab = '') => `<span class="ws-pick" role="radiogroup"${lab ? ` aria-label="${lab}"` : ''}>${opts.map(o => `<label><input type="radio" name="${k}" data-k="${k}" value="${o}"><span>${o}</span></label>`).join('')}</span>`;
const ox = (k, v, lab) => `<label class="ws-o"><input type="radio" name="${k}" data-k="${k}" value="${v}" aria-label="${lab}"><span>○</span></label>`;
const ta = (k, rows = 3, lab = '답') => `<textarea class="ws-ta" data-k="${k}" rows="${rows}" aria-label="${lab}"></textarea>`;
const tbl = (head, rows, o = {}) => `<div class="tw"><table class="ws-t${o.cls ? ' ' + o.cls : ''}"><thead><tr>${head.map((h, i) => `<th class="${i === 0 ? 'l' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i === 0 ? 'l' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const wsCard = (title, body, o = {}) => `<section class="card wide ws${o.plain ? ' plain' : ''}"><div class="card-h"><h3 class="ws-h">${title}</h3>${o.sub ? `<p>${o.sub}</p>` : ''}</div>${body}</section>`;
const q = t => `<p class="ws-q">▣ ${t}</p>`;
const L = t => `<p class="ws-l">${t}</p>`;
const after = (t, inner) => `<details class="guide ws-after"><summary><span>확인</span>${t}</summary>${inner}</details>`;

/* ---------- 원래 화면을 DOM으로 고치기 (정답이 바로 보이는 부분 숨김) ---------- */
function dom(h, fn) { const t = document.createElement('template'); t.innerHTML = h; fn(t.content); return t.innerHTML; }
// 머리글이 txt인 열을 표에서 지우기
function dropCol(root, txt) {
  root.querySelectorAll('table').forEach(tb => {
    const ths = [...tb.querySelectorAll('thead th')], i = ths.findIndex(th => th.textContent.trim() === txt);
    if (i < 0) return;
    tb.querySelectorAll('tr').forEach(tr => { const c = tr.children[i]; if (c) c.remove(); });
  });
}
const dropFact = (root, label) => root.querySelectorAll('.fact').forEach(f => { if (f.querySelector('span')?.textContent.trim() === label) f.remove(); });
const splitCards = h => h.split(/(?=<section class="card)/).filter(x => x.trim());
const inner = card => card.replace(/^\s*<section[^>]*>\s*<div class="card-h">[\s\S]*?<\/div>/, '').replace(/<\/section>\s*$/, '');
const asBox = card => card.replace(/^\s*<section class="[^"]*"/, '<div class="ws-sim"').replace(/<\/section>\s*$/, '</div>');
const R0 = STEPS.map(s => s.render);
STEPS.forEach(s => { delete s.quiz; delete s.page; });    // 바로 채점하는 연습문제는 문제 칸으로 대신함, 쪽 표시 없앰
R0.forEach((f, i) => { R0[i] = () => f().replace(/교과서 \d+(?:–\d+)?쪽(?: 스스로 실습)?\s*·?\s*/g, ''); });

// 2단계: 학습지 예시 답 버튼, 자동 '군집 기준' 열 숨김 (군집 기준은 직접 씀)
const _self = VIEWS.self;
VIEWS.self = () => dom(_self(), r => { dropCol(r, '군집 기준 (자동)'); r.querySelectorAll('.hint').forEach(p => { if (p.textContent.includes('군집 기준')) p.remove(); }); });
// 3단계 좋은 군집: 빈칸의 정답인 정리 상자 숨김
const _sep = VIEWS.sep;
VIEWS.sep = () => dom(_sep(), r => { r.querySelectorAll('.insight').forEach(x => x.remove()); });
// 6단계: 가장 높은 k · 좋은 군집 판정 이름표 숨김 (그래프를 보고 직접 판단)
const _ev = VIEWS.ev;
VIEWS.ev = () => dom(_ev(), r => { dropFact(r, '실루엣 점수가 가장 높은 k'); r.querySelectorAll('.fact .badge').forEach(b => b.remove()); });
// 6단계 응집도 그림: 거리의 제곱 숫자를 지운 그래프만
function inertFig() {
  const svg = (VIEWS.inert().match(/<svg[\s\S]*?<\/svg>/) || [''])[0];
  return `<figure class="ws-fig">${dom(svg, r => r.querySelectorAll('text.lbl').forEach(t => { if (/^[\d.]+$/.test(t.textContent.trim())) t.remove(); }))}<figcaption>점 6개를 k = 2로 군집화한 결과 · 점선은 각 점과 중심점 사이</figcaption></figure>`;
}

/* ---------- 문항 목록 ---------- */
const CL = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
const SIT_T = SIT.map(s => s[0]);
const K2 = () => clamp(+WSA.k2n || 2, 2, 6);   // 2번에서 정한 군집 수만큼만 채움
function FIELDS() {
  return [
    ['s1_a', '1-개념 빈칸 (학습 방법)', 1], ['s1_b', '1-개념 빈칸 (정답 또는)', 1], ['s1_c', '1-개념 빈칸 (관측값 사이의)', 1], ['s1_d', '1-개념 빈칸 (지도 학습)', 1],
    ...[1, 2, 3, 4, 5].map(i => ['sit' + i, `1-▣ 상황 ${CL[i - 1]}`, 1]),
    ['hg1', '1-생각 열기 기준 1', 1], ['hg2', '1-생각 열기 기준 2', 1],
    ['k2n', '2-군집 수', 2],
    ...Array.from({ length: K2() }, (_, j) => [['g' + (j + 1) + 'c', `2-군집 ${j + 1} 기준`, 2], ['g' + (j + 1) + 's', `2-군집 ${j + 1} 학생 번호`, 2]]).flat(),
    ['s2_why', '2-▣ 결과가 다른 까닭', 2],
    ['s3_a', '3-빈칸 (가까운 정도)', 3], ['s3_b', '3-빈칸 (가까울수록)', 3], ['s3_c', '3-빈칸 (멀수록)', 3], ['s3_h1', '3-군집 내 유사성', 3], ['s3_h2', '3-군집 간 상이성', 3], ['s3_d', '3-빈칸 (계산)', 3], ['s3_e', '3-빈칸 (대표 방법)', 3],
    ['d1k', '3-▣ ⑥⑩ 수학 차이', 3], ['d1s', '3-▣ ⑥⑩ 과학 차이', 3], ['d1d', '3-▣ ⑥⑩ 거리', 3], ['d2k', '3-▣ ⑥⑦ 수학 차이', 3], ['d2s', '3-▣ ⑥⑦ 과학 차이', 3], ['d2d', '3-▣ ⑥⑦ 거리', 3], ['d3k', '3-▣ ⑥③ 수학 차이', 3], ['d3s', '3-▣ ⑥③ 과학 차이', 3], ['d3d', '3-▣ ⑥③ 거리', 3],
    ['s3_near', '3-▣ ⑥과 더 가까운 학생', 3], ['s3_grp', '3-▣ ⑥을 넣을 군집', 3],
    ['s4_a', '4-빈칸 (순차적)', 4], ['s4_c', '4-빈칸 (가장 ○○ 개체)', 4], ['s4_b', '5-빈칸 (무작위)', 5], ['s4_d', '5-빈칸 (군집 수)', 5], ['s4_e', '5-빈칸 (군집별 ○○)', 5],
    ...[1, 2, 3, 4, 5].map(i => ['cmp' + i, `5-정리 ${CL[i - 1]}`, 5]),
    ['s6_a', '6-빈칸 (비교할 수 있는)', 6], ['s6_b', '6-빈칸 (최적의)', 6], ['s6_c', '6-빈칸 (잘 분리)', 6], ['s6_d', '6-빈칸 (가까울수록)', 6], ['s6_e', '6-빈칸 (이상이면)', 6], ['s6_f', '6-빈칸 (팔꿈치)', 6], ['s6_g', '6-빈칸 (거리의)', 6], ['s6_h', '6-빈칸 (유사성이)', 6],
    ...['A', 'B', 'C', 'D', 'E', 'F'].map(p => ['in' + p, `6-▣ ${p}까지 거리의 제곱`, 6]), ['in1s', '6-▣ 군집 1 응집도', 6], ['in2s', '6-▣ 군집 2 응집도', 6], ['inT', '6-▣ 전체 응집도', 6],
    ['ga_k', '6-▣ ① 군집 수', 6], ['ga_s', '6-▣ ① 실루엣 점수', 6], ['ga_good', '6-▣ ① 좋은 군집?', 6], ['gb_k', '6-▣ ② 팔꿈치 군집 수', 6], ['fin_k', '6-▣ ③ 최종 군집 수', 6], ['fin_why', '6-▣ ③ 최종 군집 수를 정한 까닭', 6],
    ...[1, 2, 3, 4].map(i => ['ox' + i, `6-▣ O/X ${CL[i - 1]}`, 6]),
    ...[1, 2, 3, 4, 5].map(i => ['mc' + i, `7-[${i}]`, 7])
  ];
}
const SEC_NAMES = { 1: '1. 군집 분석의 개념', 2: '2. 군집화하기', 3: '3. 유사성과 상이성', 4: '4. 계층적 군집 분석', 5: '5. k-평균 군집 분석', 6: '6. 군집 분석 결과 평가', 7: '7. 종합 연습문제' };
const filled = k => String(WSA[k] ?? '').trim() !== '';
const secFields = s => FIELDS().filter(f => f[2] === s);

/* ---------- 0. 먼저 알아보기 ---------- */
STEPS[0].goal = '군집 분석이 무엇을 하는 방법인지 알아보고, 이 앱에서 어떤 시뮬레이션을 하게 되는지 살펴보세요.';
STEPS[0].render = () => card('이 앱에서 할 일',
  `<p class="note">어느 반 학생 10명의 과목별 성적을 모았다.&nbsp;이 데이터에는 학생이 어떤 유형인지 알려 주는 정답이 적혀 있지 않다.&nbsp;성적이 비슷한 학생끼리 묶어 보면서, 정답이 없는 데이터에서 무리를 찾는 방법을 알아보자.</p>${SC_TABLE}<p class="ws-cap">[표1] 성적 데이터셋 (단위: 점)</p>`) +
  card('단계별 순서', `<ol class="proc">${[[1, '군집 분석의 개념', '1번'], [2, '군집화하기', '2번'], [3, '유사성과 상이성', '3번'], [4, '계층적 군집 분석', '4번'], [5, 'k-평균 군집 분석', '5번'], [6, '결과 평가', '6번'], [7, '종합 연습', '7번']].map(([to, t, s]) => `<li><button type="button" data-act="go" data-step="${to}"><b>${t}</b><small>${s}</small></button></li>`).join('')}</ol><p class="note">각 단계의 시뮬레이션을 살펴보면서 빈칸과 질문에 직접 답을 써 보세요. <b>저장하기</b>를 누르면 이 브라우저에 저장되어, 다음에 다시 열어도 이어서 풀 수 있습니다.</p>`, { sub: '단계를 누르면 해당 단계로 이동합니다.' });

/* ---------- 1. 군집 분석의 개념 ---------- */
STEPS[1].concept = '';
STEPS[1].render = () => {
  const [, hgCard] = splitCards(R0[1]());
  return wsCard('1. 군집 분석의 개념',
    L(`- 군집 분석(Cluster Analysis): 데이터를 비슷한 것끼리 같은 군집으로 묶은 후, 군집 내·군집 간 특징을 분석하는 대표적인 ${bl('s1_a', 5)} 학습 방법`) +
    L(`- 군집 분석 데이터는 정답 또는 ${bl('s1_b', 6)}이 되어 있지 않으므로, 관측값 사이의 ${bl('s1_c', 5)}을 파악하여 군집을 만든다.`) +
    L(`- 정답값이 있는 데이터로 학습하는 ${bl('s1_d', 5)}는 지도 학습에 속한다.`) +
    q('다음 상황에 알맞은 방법에 ○표 해 보자.') +
    tbl(['상황', '분류<br>(지도 학습)', '군집 분석<br>(비지도 학습)'], SIT_T.map((t, i) => [`${CL[i]} ${t}`, ox('sit' + (i + 1), '분류', `${CL[i]} 분류`), ox('sit' + (i + 1), '군집', `${CL[i]} 군집 분석`)]), { cls: 'ox' }) +
    q('[생각 열기] 할리갈리 카드 56장은 네 종류의 과일(딸기, 라임, 자두, 바나나) 카드이고, 카드마다 과일이 1~5개 그려져 있다.&nbsp;카드를 여러 무리로 나누려고 할 때, 나눌 수 있는 기준을 두 가지 써 보자.') +
    ['hg1', 'hg2'].map((k, i) => `<div style="display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center">${L(CL[i])}${ta(k, 1, `기준 ${i + 1}`)}</div>`).join('') +
    after('카드 나누어 보기 (기준을 쓴 다음 펼쳐 보세요)', inner(hgCard)));
};

/* ---------- 2. 군집화하기 ---------- */
STEPS[2].concept = '';
STEPS[2].render = () => {
  const [simCard] = splitCards(R0[2]());
  const sim = asBox(simCard.replace(/<button[^>]*data-act="ex2"[^>]*>[^<]*<\/button>/, '').replace(/<div[^>]*grid-column:1\/-1[^>]*>[\s\S]*$/, ''));
  return wsCard('2. 군집화하기',
    L('① 2~6 사이에서 군집 수를 정한다.&nbsp;(단, 한 번 정한 군집 수는 바꾸지 않는다.)') +
    L('② [표1]의 수학, 과학 성적을 아래 그래프에 점으로 나타내고, 점 옆의 학생 번호를 확인한다.') +
    L('③ 군집 수만큼 군집 기준을 정해 적고, 그래프에서 군집마다 묶음 표시를 한다.&nbsp;(군집 색을 고른 뒤 점을 누르기)') +
    sim +
    `<div class="ws-row">${L('군집 수:')}${pick('k2n', ['2', '3', '4', '5', '6'], '군집 수')}<button type="button" class="btn" data-act="ws-grab">그래프에서 묶은 학생 가져오기</button><span class="ws-msg" id="grabMsg" aria-live="polite"></span></div>` +
    tbl(['군집', '군집 기준', '학생 번호'], Array.from({ length: K2() }, (_, j) => [`<b>군집 ${j + 1}</b>`, ti('g' + (j + 1) + 'c', `군집 ${j + 1} 기준`), ti('g' + (j + 1) + 's', `군집 ${j + 1} 학생 번호`)])) +
    q('친구와 군집 결과를 비교해 보자. 같은 데이터인데도 군집 결과가 서로 다를 수 있는 까닭은 무엇일까?') + ta('s2_why', 3, '결과가 다른 까닭'));
};

/* ---------- 3단계: 군집이 어느 정도 만들어진 상태에서 ⑥의 거리 재기 ---------- */
const D6 = { base: 5, A: [0, 1, 6, 7], B: [3, 4, 8, 9], C: [2] };
const d6g = i => D6.A.includes(i) ? 1 : D6.B.includes(i) ? 2 : D6.C.includes(i) ? 3 : 0;
const d6n = i => ['', '군집 A', '군집 B', '군집 C'][d6g(i)];
VIEWS.dist6 = () => {
  const ps = scPts('ms'), j = A().d6 ?? -1, o = ps[D6.base];
  const P = plot({ id: 'p-d6', w: 520, h: 420, x: [0, 110], y: [0, 110], xt: [0, 20, 40, 60, 80, 100], yt: [0, 20, 40, 60, 80, 100], xl: '수학 (점)', yl: '과학 (점)', label: '⑥과 군집 학생 사이의 거리' });
  const X = P.X, Y = P.Y, halo = 'paint-order:stroke;stroke:var(--surface);stroke-width:4px;stroke-linejoin:round';
  const tag = (x, y, t, an, col = 'var(--ink-2)') => `<text x="${x}" y="${y}" text-anchor="${an}" pointer-events="none" style="font-size:13.5px;font-weight:700;fill:${col};${halo}">${t}</text>`;
  let s = P.head + [D6.A, D6.B, D6.C].map((ids, g) => hullPath(P, ids.map(i => ps[i]), g + 1, 13)).join(''), top = '';
  [['군집 A', D6.A, 's1'], ['군집 B', D6.B, 's2'], ['군집 C', D6.C, 's3']].forEach(([t, ids, c]) => { const xs = ids.map(i => X(ps[i][0])), ys = ids.map(i => Y(ps[i][1])); top += tag(Math.min(...xs) - 10, Math.min(...ys) - 30, t, 'end', `var(--${c})`); });
  let info = '<p class="note">⑥과 비교할 학생을 그래프에서 눌러 보세요.&nbsp;⑥과 그 학생 사이의 유클리디언 거리가 보입니다.</p>';
  if (j >= 0) {
    const q = ps[j], cx = X(q[0]), cy = Y(o[1]), px = X(o[0]), qy = Y(q[1]), dx = Math.abs(o[0] - q[0]), dy = Math.abs(o[1] - q[1]), e = Math.hypot(dx, dy);
    s += `<line class="dist" x1="${px}" y1="${cy}" x2="${cx}" y2="${cy}"/><line class="dist" x1="${cx}" y1="${cy}" x2="${cx}" y2="${qy}"/><line x1="${px}" y1="${cy}" x2="${cx}" y2="${qy}" style="stroke:var(--accent);stroke-width:3"/>`;
    const hx = Math.abs(cx - px), vy = Math.abs(qy - cy), up = qy > cy, right = cx >= px;
    if (dx) top += tag(hx < 90 ? (px + cx) / 2 + (cx > px ? -1 : 1) * Math.max(0, 45 - hx / 2) : (px + cx) / 2, up ? cy - (hx < 90 ? 22 : 12) : cy + (hx < 90 ? 30 : 20), `수학 차 ${dx}`, 'middle');
    if (dy) top += tag(cx + (right ? 14 : -14), vy < 30 ? (cy + qy) / 2 + (up ? 18 : -10) : (cy + qy) / 2 + 4, `과학 차 ${dy}`, right ? 'start' : 'end');
    const g = d6g(j);
    info = `<div class="big-eq" style="font-family:var(--sans)">⑥(${o[0]}, ${o[1]}) ↔ ${NO(j)}(${q[0]}, ${q[1]})</div><div class="stat">${fact('유클리디언 거리', nf(e, 2), `√(${dx}² + ${dy}²)`, 'hl')}${fact(`${NO(j)}이 속한 군집`, `<span class="chip g g${g}" style="font-family:var(--sans)">${d6n(j)}</span>`)}</div><p class="note">다른 군집의 학생도 눌러 거리를 비교해 보세요.&nbsp;거리가 가까울수록 유사성이 높습니다.</p>`;
  }
  ps.forEach((p, i) => {
    const on = i === D6.base || i === j, Xi = X(p[0]), Yi = Y(p[1]);
    s += `<circle class="pt g${d6g(i)}" cx="${Xi}" cy="${Yi}" r="${on ? 8 : 6.5}" ${i === D6.base ? 'style="stroke:var(--ink);stroke-width:2;stroke-dasharray:3 2"' : `data-pick="d6" data-i="${i}"`} data-tip="${esc(`학생 ${NO(i)} (${p[0]}, ${p[1]})` + (i === D6.base ? ' · 아직 군집 없음' : ` · ${d6n(i)}`))}"/>`;
    if (!on) s += lbl(Xi + 9, Yi - 9, NO(i));
  });
  [[D6.base, j, -1], [j, D6.base, 1]].forEach(([i, k, d0]) => { if (i < 0 || k < 0 && i !== D6.base) return; const p = ps[i], w = k >= 0 ? ps[k] : [p[0] + 1, p[1]], sd = p[0] === w[0] ? d0 : Math.sign(p[0] - w[0]); top += tag(X(p[0]) + sd * 15, Y(p[1]) + 5, NO(i), sd > 0 ? 'start' : 'end', 'var(--ink)'); });
  return `<div class="sim2"><div>${s}${top}${P.end}<p class="hint">⑥(점선 테두리)은 아직 군집에 속하지 않은 학생입니다.&nbsp;다른 학생을 다시 누르면 선택이 풀립니다.</p></div><div>${info}</div></div>`;
};
PICK.d6 = i => { A().d6 = A().d6 === i ? -1 : i; };

/* ---------- 3. 유사성과 상이성 ---------- */
STEPS[3].concept = '';
STEPS[3].render = () => {
  const [, , sepCard] = splitCards(R0[3]());
  return wsCard('3. 유사성과 상이성',
    L(`- ${bl('s3_a', 5)}: 두 개체들 사이의 가까운 정도를 수치로 표현한 것`) +
    L(`- 같은 군집에 속한 관측값들의 거리가 가까울수록 ${bl('s3_b', 5)}이 높고, 서로 다른 군집 사이의 거리가 멀수록 ${bl('s3_c', 5)}이 높다.`) +
    `<div class="ws-row">${L('- 좋은 군집은 군집 내 유사성이')}${pick('s3_h1', ['높고', '낮고'], '군집 내 유사성')}${L('군집 간 상이성이')}${pick('s3_h2', ['높다', '낮다'], '군집 간 상이성')}</div>` +
    L(`- 유사성은 관측값과 관측값 사이의 ${bl('s3_d', 4)}로 계산하며, 대표적인 방법은 ${bl('s3_e', 8)}이다.`) +
    `<p class="ws-formula" style="font-family:var(--sans);font-size:22px"><math><mi>d</mi><mo>=</mo><msqrt><msup><mrow><mo>(</mo><msub><mi>a</mi><mn>1</mn></msub><mo>−</mo><msub><mi>b</mi><mn>1</mn></msub><mo>)</mo></mrow><mn>2</mn></msup><mo>+</mo><msup><mrow><mo>(</mo><msub><mi>a</mi><mn>2</mn></msub><mo>−</mo><msub><mi>b</mi><mn>2</mn></msub><mo>)</mo></mrow><mn>2</mn></msup></msqrt></math></p>`) +
    card('⑥은 어느 군집에 들어갈까?', `<div class="chips" style="font-family:var(--sans)">${[['g1', '군집 A · ①, ②, ⑦, ⑧'], ['g2', '군집 B · ④, ⑤, ⑨, ⑩'], ['g3', '군집 C · ③'], ['g0', '아직 군집 없음 · ⑥']].map(([g, t]) => `<span class="chip g ${g}" style="font-family:var(--sans)">${t}</span>`).join('')}</div>${slot('dist6')}` +
      '<div style="display:grid;gap:10px;border-top:1px solid var(--line);padding-top:12px">' +
      q('[표1]의 수학, 과학 성적으로 군집 A(①, ②, ⑦, ⑧), 군집 B(④, ⑤, ⑨, ⑩), 군집 C(③)가 만들어졌다.&nbsp;아직 군집에 속하지 않은 학생 ⑥은 어느 군집에 넣는 것이 좋을까?&nbsp;각 군집의 학생과 ⑥ 사이의 거리를 구해 보자. (거리는 소수 첫째 자리까지)') +
      tbl(['두 학생 (수학, 과학)', '수학 점수 차이', '과학 점수 차이', '거리 d'], [['⑥(45, 45)와 ⑩(50, 30) · 군집 B', ti('d1k'), ti('d1s'), ti('d1d')], ['⑥(45, 45)와 ⑦(100, 90) · 군집 A', ti('d2k'), ti('d2s'), ti('d2d')], ['⑥(45, 45)와 ③(40, 95) · 군집 C', ti('d3k'), ti('d3s'), ti('d3d')]]) +
      `<div class="ws-row">${L(`→ 학생 ⑥과 더 가까운(유사성이 높은) 학생은 ${bl('s3_near', 3)}이므로, ⑥은`)}${pick('s3_grp', ['군집 A', '군집 B', '군집 C'], '⑥을 넣을 군집')}${L('에 넣는다.')}</div></div>`,
      { sub: '수학, 과학 성적으로 이미 세 군집이 만들어진 상태입니다.&nbsp;⑥(회색)과 비교할 학생을 그래프에서 눌러 거리를 살펴보고, 아래 문제를 풀어 보세요.' }) +
    sepCard;
};

/* ---------- 4. 계층적 군집 분석 ---------- */
STEPS[4].concept = '';
STEPS[4].render = () => {
  const [hcCard, linkCard] = splitCards(R0[4]());
  return wsCard('4. 계층적 군집 분석',
    L(`- 군집을 순차적으로 할당하는 군집 분석을 ${bl('s4_a', 5)} 군집 분석이라고 한다.`) +
    L(`- 계층적 군집 분석: 군집 사이의 거리를 계산하여 가장 ${bl('s4_c', 5)} 개체들을 차례대로 묶는 과정을 반복한다.`)) +
    hcCard.replace('버튼을 누를 때마다 가장 가까운 두 군집이 하나로 묶입니다.', '버튼을 한 번씩 눌러 가장 가까운 군집끼리 묶이는 순서를 살펴보세요.') + linkCard;
};

/* ---------- 5. k-평균 군집 분석 ---------- */
STEPS[5].concept = '';
STEPS[5].render = () => {
  // 시뮬레이션: 예제(A~E) · [표1] 수학 · 과학 · 무작위 데이터, 단계별 기록 · 거리표는 보이게 (4단계 시뮬레이션처럼)
  const kmCard = splitCards(R0[5]())[0]
    .replace(/<div style="grid-column:1\/-1">[\s\S]*$/, '')   // 국어 · 수학 예제에 맞춘 '더 생각해 보기' 상자는 뺌
    .replace(/<p>예제 2의 처음 중심점은[^<]*<\/p>/, '<p>중심점(★)은 예제 c1(1, 1), c2(4, 6), [표1] 수학 · 과학 C1(60, 90), C2(80, 40), C3(15, 25)입니다.&nbsp;버튼을 한 번씩 눌러 군집이 만들어지는 과정을 살펴보세요.</p>');
  return wsCard('5. k-평균 군집 분석',
    L(`- 군집을 무작위로 할당하는 군집 분석을 ${bl('s4_b', 5)} 군집 분석이라고 하며, 대표적인 방법이 k-평균 군집 분석이다.`) +
    L(`- k-평균 군집 분석: 군집 수 ${bl('s4_d', 3)}개를 먼저 지정 → k개의 중심점을 기준으로 군집 형성 → 군집별 ${bl('s4_e', 4)}의 위치로 중심점 갱신 → 중심점의 위치에 변동이 없을 때까지 반복`)) +
    kmCard +
    wsCard('[정리] 두 군집 분석 방법의 특징',
      q('두 군집 분석 방법의 특징으로 알맞은 쪽에 ○표 해 보자.') +
      tbl(['특징', '계층적 군집 분석', 'k-평균 군집 분석'], CMP.map((c, i) => [`${CL[i]} ${c[0].replace(' (덴드로그램)', '')}`, ox('cmp' + (i + 1), '계층', `${CL[i]} 계층적`), ox('cmp' + (i + 1), 'k평균', `${CL[i]} k-평균`)]), { cls: 'ox' }), { plain: true });
};

/* ---------- 6. 결과 평가 ---------- */
// 6단계 [실루엣 계수 구하기] 시뮬레이션: 점을 눌러 고르고, 끌어서 옮기면 a · b · s가 바로 바뀜 (문제 칸 없음)
const SG = [0, 0, 0, 1, 1, 1];   // 군집 1: A, B, C / 군집 2: D, E, F (고정)
VIEWS.silsim = () => {
  const a0 = A(), ps = a0.spts || EX2.pts, lab = EX2.lab, i = a0.sp ?? 0, sil = silhouette(ps, SG, 2), d = j => dist(ps[i], ps[j]);
  const same = [...ps.keys()].filter(j => j !== i && SG[j] === SG[i]), other = [...ps.keys()].filter(j => SG[j] !== SG[i]);
  const num = v => Number.isInteger(+v.toFixed(6)) ? String(Math.round(v)) : fx(v, 2);
  const cd = v => nf(v, 1);
  const dl = j => { const dx = Math.abs(ps[i][0] - ps[j][0]), dy = Math.abs(ps[i][1] - ps[j][1]), v = d(j); return `${lab[i]}–${lab[j]} = √(${cd(dx)}² + ${cd(dy)}²) ${Number.isInteger(+v.toFixed(6)) ? '= ' : '≈ '}${num(v)}`; };
  const o = sil.s[i], P = plot({ id: 'p-silsim', w: 460, h: 420, x: [0, 10], y: [0, 10], xt: 11, yt: [0, 2, 4, 6, 8, 10], xl: 'x', yl: 'y', label: '실루엣 계수 시뮬레이션', max: 480 });
  const halo = 'paint-order:stroke;stroke:var(--surface);stroke-width:4px;stroke-linejoin:round';
  let s = P.head + [0, 1].map(gr => hullPath(P, ps.filter((_, j) => SG[j] === gr), gOf(gr), 16)).join(''), top = '';
  [...same.map(j => [j, true]), ...other.map(j => [j, false])].forEach(([j, sm]) => {
    const x1 = P.X(ps[i][0]), y1 = P.Y(ps[i][1]), x2 = P.X(ps[j][0]), y2 = P.Y(ps[j][1]);
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${sm ? 'var(--imp-ink)' : 'var(--s4)'};stroke-width:2;${sm ? '' : 'stroke-dasharray:6 4'}" pointer-events="none"/>`;
    top += `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 5}" text-anchor="middle" pointer-events="none" style="font-size:12.5px;font-weight:700;fill:${sm ? 'var(--imp-ink)' : 'var(--miss-ink)'};${halo}">${num(d(j))}</text>`;
  });
  ps.forEach((p, j) => { const X = P.X(p[0]), Y = P.Y(p[1]);
    s += `<circle class="pt g${gOf(SG[j])}" cx="${X}" cy="${Y}" r="${j === i ? 9 : 7}" data-drag="sp" data-pick="sp" data-i="${j}" data-tip="${esc(`${lab[j]}(${cd(p[0])}, ${cd(p[1])}) · 실루엣 계수 ${fx(sil.s[j].s, 2)} · 누르면 고르고, 끌면 옮겨져요`)}"/>` + (j === i ? `<circle class="sel-ring" cx="${X}" cy="${Y}" r="13" pointer-events="none"/>` : '');
    top += `<text x="${X + 11}" y="${Y + 17}" pointer-events="none" style="font-size:13.5px;font-weight:700;fill:var(--ink);${halo}">${lab[j]}</text>`; });
  s += top + P.end;
  const mean = js => js.map(j => num(d(j))).join(' + ');
  const verdict = o.s < 0 ? ['음수: 다른 군집에 더 가까워요', 'neg'] : o.s < .25 ? ['0 근처: 두 군집의 경계에 있어요', 'warn'] : o.s < .5 ? ['자기 군집에 들어가 있지만 경계와 가까워요', 'warn'] : ['1에 가까워요: 자기 군집에 잘 들어가 있어요', 'pos'];
  return `<div class="sim2"><div>${s}<p class="hint">점을 누르면 그 점의 실루엣 계수를 계산합니다.&nbsp;점을 끌어 옮기면 값이 바로 바뀝니다.&nbsp;초록 실선은 a, 주황 점선은 b를 구할 때 쓰는 거리입니다.</p></div><div>
    <div class="big-eq" style="font-family:var(--sans)">고른 점 ${lab[i]}(${cd(ps[i][0])}, ${cd(ps[i][1])}) · 군집 ${SG[i] + 1}</div>
    ${tbl(['단계', `${lab[i]}로 계산하기`], [
      [`<b>① a 구하기</b><br><small>같은 군집의 다른 데이터까지<br>거리의 평균 (응집)</small>`, `${same.map(dl).join('<br>')}<br>a = (${mean(same)}) ÷ ${same.length} ≈ <b>${fx(o.a, 2)}</b>`],
      [`<b>② b 구하기</b><br><small>가장 가까운 다른 군집의 데이터까지<br>거리의 평균 (분리)</small>`, `${other.map(dl).join('<br>')}<br>b = (${mean(other)}) ÷ ${other.length} ≈ <b>${fx(o.b, 2)}</b>`],
      [`<b>③ s 구하기</b><br><small>s = (b − a) ÷ (a와 b 중 큰 값)</small>`, `s = (${fx(o.b, 2)} − ${fx(o.a, 2)}) ÷ ${fx(Math.max(o.a, o.b), 2)} ≈ <b>${fx(o.s, 2)}</b>`]
    ])}
    <div class="stat">${fact(`${lab[i]}의 실루엣 계수`, fx(o.s, 2), `<span class="badge ${verdict[1]}">${verdict[0]}</span>`, 'hl')}${fact('실루엣 점수', fx(sil.score, 2), '6개 점의 평균')}</div>
  </div></div>
  ${tbl(['점', ...lab, '평균 (실루엣 점수)'], [['실루엣 계수 s', ...sil.s.map((v, j) => j === i ? `<b>${fx(v.s, 2)}</b>` : fx(v.s, 2)), `<b>${fx(sil.score, 2)}</b>`]])}`;
};
PICK.sp = j => { A().sp = j; };
DRAG.sp = (p, j) => { const a0 = A(); if (!a0.spts) a0.spts = EX2.pts.map(q => q.slice()); a0.spts[j] = [clamp(Math.round(p.x * 2) / 2, 0, 10), clamp(Math.round(p.y * 2) / 2, 0, 10)]; a0.sp = j; };
ACT['sp-reset'] = () => { A().spts = EX2.pts.map(q => q.slice()); A().sp = 0; };
function silGuide() {
  return `<section class="card wide ws plain"><div class="card-h"><h3 class="ws-h">[실루엣 계수 구하기] 실루엣 계수는 어떻게 구할까?</h3><p>실루엣 계수는 데이터 <b>하나마다</b> 구하는 값입니다.&nbsp;6개의 점 A(1, 1), B(1, 3), C(4, 2), D(6, 5), E(9, 5), F(9, 8)(군집 1: A, B, C / 군집 2: D, E, F)로 실루엣 계수를 구해 봅시다.</p></div>
    <div class="btns">${btn('sp-reset', '↺ 점 위치 처음으로')}</div>
    ${slot('silsim')}
    <p class="note">s는 −1에서 1 사이의 값입니다.&nbsp;1에 가까우면 자기 군집에 잘 들어가 있고, 0 근처면 두 군집의 경계에 있으며, 음수면 다른 군집에 더 가깝다는 뜻입니다.&nbsp;점 하나를 다른 군집 쪽으로 끌어 옮겨 s가 음수가 되는지 확인해 보세요.</p>
    <p class="note">6개 점의 실루엣 계수를 모두 구해 <b>평균을 내면 실루엣 점수</b>가 됩니다.</p>
    ${insight('정리', '실루엣 계수는 같은 군집과 가까운 정도(a)와 다른 군집과 떨어진 정도(b)를 함께 봅니다.&nbsp;그래서 군집 내 유사성과 군집 간 상이성을 한 번에 나타냅니다.')}
  </section>`;
}


// 응집도 표: 점마다 거리의 제곱을 따로 적는 칸
const sqIn = ps => `<span style="display:inline-flex;flex-wrap:wrap;gap:6px 14px;justify-content:center">${ps.map(p => `<label style="display:inline-flex;align-items:center;gap:4px;white-space:nowrap"><b>${p}:</b><input class="ws-in ws-cell" data-k="in${p}" style="width:4em;min-width:0" aria-label="${p}까지 거리의 제곱" autocomplete="off"></label>`).join('')}</span>`;
STEPS[6].concept = '';
STEPS[6].render = () => {
  const [, evCard] = splitCards(R0[6]());
  return wsCard('6. 군집 분석 결과 평가',
    L(`- 군집 분석은 결과를 비교할 수 있는 ${bl('s6_a', 4)}이 없으므로, 최적의 ${bl('s6_b', 5)}를 찾는 과정이 필요하다.`) +
    L(`- ${bl('s6_c', 7)}: 데이터의 유사성과 상이성을 바탕으로 군집이 얼마나 잘 분리되었는지 나타내는 방법`) +
    L(`&nbsp;&nbsp;· 실루엣 점수(실루엣 계수의 평균)가 ${bl('s6_d', 3)}에 가까울수록 군집화가 잘 된 것이다.`) +
    L(`&nbsp;&nbsp;· 실루엣 점수가 ${bl('s6_e', 3)} 이상이면 좋은 군집이라고 한다.`) +
    L(`- 응집도(Inertia): 중심점으로부터 군집 안 개별 데이터까지 거리의 ${bl('s6_g', 6)}, 응집도가 0에 가까울수록 군집 내 유사성이 ${bl('s6_h', 3)}.`) +
    L(`- ${bl('s6_f', 6)}: k-평균 군집 분석에서 군집 내 유사성(응집도)을 바탕으로, 응집도가 갑자기 작아지다가 완만해지는 지점(팔꿈치 모양)을 찾는 방법`)) +
    silGuide() +
    wsCard('[응집도 구하기] 점 6개를 k = 2로 군집화한 결과',
      L('- 6개의 점 A(1, 1), B(1, 3), C(4, 2), D(6, 5), E(9, 5), F(9, 8)를 k-평균 군집 분석(k = 2)으로 군집화했더니, 군집 1은 A, B, C (중심점 c1(2, 2)), 군집 2는 D, E, F (중심점 c2(8, 6))가 되었다.') +
      q('응집도를 구해 보자. (거리의 제곱 = (x 차이)² + (y 차이)²)') + inertFig() +
      tbl(['군집', '중심점', '각 점까지 거리의 제곱', '군집별 응집도'], [
        ['<b>군집 1</b>', 'c1(2, 2)', sqIn(['A', 'B', 'C']), ti('in1s', '군집 1 응집도')],
        ['<b>군집 2</b>', 'c2(8, 6)', sqIn(['D', 'E', 'F']), ti('in2s', '군집 2 응집도')],
        ['<b>전체</b>', '', '', ti('inT', '전체 응집도')]]) , { plain: true }) +
    wsCard('[군집 수 정하기] 실루엣 점수와 엘보 방법',
      q('같은 데이터를 군집 수 k를 바꾸어 가며 k-평균 군집 분석한 결과이다.&nbsp;아래 시뮬레이션의 [그래프 A] · [그래프 B]를 보고 답해 보자.') +
      L(`① [그래프 A]에서 실루엣 점수가 가장 높은 군집 수는 ${bl('ga_k', 3)}이고, 그때 실루엣 점수는 약 ${bl('ga_s', 4)}이다.`) +
      L(`&nbsp;&nbsp;→ 이 군집화는 좋은 군집이라고 할 수 있을까? ${bl('ga_good', 10)}`) +
      L(`② [그래프 B]에서 응집도가 팔꿈치처럼 꺾이는 지점의 군집 수는 ${bl('gb_k', 3)}이다.`) +
      `<p class="ws-q">③ [그래프 A]와 [그래프 B]를 함께 보고, 이 데이터의 최종 군집 수를 정해 보자.&nbsp;그렇게 정한 까닭도 써 보자.</p>` +
      `<div class="ws-row">${L('최종 군집 수:')}${pick('fin_k', ['2', '3', '4', '5', '6', '7', '8'], '최종 군집 수')}</div>` + ta('fin_why', 3, '최종 군집 수를 정한 까닭'), { plain: true }) +
    evCard.replace('같은 데이터 80개를', '흩어진 정도를 처음 값(1.20)으로 두고 보세요.&nbsp;같은 데이터 80개를') +
    wsCard('[좋은 군집화의 조건]',
      q('좋은 군집화의 조건으로 옳으면 O, 옳지 않으면 X 해 보자.') +
      tbl(['문장', 'O / X'], OX.map((c, i) => [`${CL[i]} ${c[0]}`, pick('ox' + (i + 1), ['O', 'X'], `${CL[i]} O/X`)])), { plain: true });
};

/* ---------- 7. 종합 연습문제 + 저장 ---------- */
const MC = [
  ['군집 분석에 대한 설명으로 옳은 것은?', ['정답(레이블)이 있는 데이터로 학습하는 지도 학습이다.', '같은 군집에 속한 데이터끼리는 상이성이 높아야 한다.', '관측값 사이의 거리가 가까울수록 유사성이 높다.', '군집 분석 결과는 정답과 비교하여 정확도로 평가한다.', '서로 다른 군집 사이의 거리가 가까울수록 좋은 군집이다.']],
  ['두 점 a(2, 3), b(5, 7) 사이의 유클리디언 거리는?', ['3', '4', '5', '7', '25']],
  ['k-평균 군집 분석의 과정을 순서대로 바르게 나열한 것은?<br>ㄱ. 각 군집 평균의 위치로 중심점을 옮긴다.<br>ㄴ. 군집 수 k를 정하고 k개의 중심점을 지정한다.<br>ㄷ. 중심점이 더 이상 움직이지 않으면 군집화를 끝낸다.<br>ㄹ. 각 데이터를 가장 가까운 중심점의 군집에 넣는다.', ['ㄱ-ㄴ-ㄹ-ㄷ', 'ㄴ-ㄱ-ㄹ-ㄷ', 'ㄴ-ㄹ-ㄱ-ㄷ', 'ㄹ-ㄴ-ㄱ-ㄷ', 'ㄹ-ㄱ-ㄴ-ㄷ']],
  ['계층적 군집 분석과 k-평균 군집 분석에 대한 설명으로 옳지 않은 것은?', ['계층적 군집 분석은 가장 가까운 개체들을 차례대로 묶는다.', '계층적 군집 분석은 군집의 수를 미리 정하지 않아도 된다.', 'k-평균 군집 분석은 처음 정한 중심점의 위치에 민감하다.', 'k-평균 군집 분석은 군집의 모양이 균일하지 않으면 오류가 생길 수 있다.', '계층적 군집 분석은 대규모 데이터셋에 적용하기 쉽다.']],
  ['어떤 데이터를 군집 수 k를 바꾸어 가며 군집화하고 실루엣 점수를 구했다.<br>k = 2 : 0.41 · k = 3 : 0.58 · k = 4 : 0.52 · k = 5 : 0.47<br>옳은 것은?', ['최적의 군집 수는 2이다.', 'k = 3일 때 군집이 가장 잘 분리되었다.', '네 경우 모두 좋은 군집이라고 할 수 있다.', '실루엣 점수는 0에 가까울수록 좋다.', '군집 수가 많을수록 항상 군집화가 잘 된다.']]
];
STEPS.push({
  title: '종합 연습', short: '종합 연습',
  goal: '앞에서 배운 내용을 객관식으로 확인하고, 답을 저장합니다.',
  concept: '',
  render: () => wsCard('7. 종합 연습문제',
    MC.map(([t, os], i) => `<div class="ws-mc"><p class="ws-q">[${i + 1}] ${t}</p><div class="ws-mc-o" role="radiogroup" aria-label="${i + 1}번 답">${os.map((o, k) => `<label><input type="radio" name="mc${i + 1}" data-k="mc${i + 1}" value="${k + 1}"><span>${CIRC[k]} ${o}</span></label>`).join('')}</div></div>`).join('')) +
    `<section class="card wide ws-submit"><div class="card-h"><p class="eyebrow ws-eye">저장</p><h3>답 저장하기</h3><p>답은 <b>저장하기</b>를 눌러야 이 브라우저에 저장됩니다.&nbsp;다음에 같은 컴퓨터·같은 브라우저로 열면 저장한 답이 그대로 나옵니다.</p></div>
      <div class="ws-left" id="leftList"></div>
      <div class="ws-row"><button type="button" class="btn primary" id="saveBtn2">저장하기</button><button type="button" class="btn danger" id="clearBtn">저장한 답 지우기</button><span class="ws-msg" id="saveMsg2" aria-live="polite"></span></div></section>`
});
GROUPS[7] = '정리';

/* ---------- 단계 완료 · 진행률 · 위쪽 흐름 ---------- */
APP.stepDone = i => i === 0 ? S.seen.has(0) : secFields(i).every(f => filled(f[0]));
APP.progress = () => {
  const F = FIELDS(), n = F.filter(f => filled(f[0])).length;
  return { title: '풀이 진행률', pct: Math.round(n / F.length * 100), label: `작성한 칸 ${n} / ${F.length}` };
};
FLOW = function () {
  return [[1, '군집 분석의 개념', '1번'], [2, '군집화하기', '2번'], [3, '유사성과 상이성', '3번'], [4, '계층적 군집 분석', '4번'], [5, 'k-평균 군집 분석', '5번'], [6, '결과 평가', '6번'], [7, '종합 연습', '7번']].map(([st, l, s]) => {
    const fs = secFields(st), n = fs.filter(f => filled(f[0])).length;
    return { steps: st === 1 ? [1, 0] : [st], l, b: `${n} / ${fs.length}`, s, d: n === fs.length, wait: n === 0 };
  });
};

/* ---------- 입력 채우기 · 저장 ---------- */
function wsFill() {
  document.querySelectorAll('[data-k]').forEach(el => {
    const v = WSA[el.dataset.k];
    if (el.type === 'radio') el.checked = v === el.value;
    else if (el !== document.activeElement) el.value = v ?? '';
  });
  const ll = $('#leftList');
  if (ll) {
    const left = Object.keys(SEC_NAMES).map(s => [s, secFields(+s).filter(f => !filled(f[0])).length]).filter(([, n]) => n);
    ll.innerHTML = left.length ? `<p class="note">아직 비어 있는 칸: ${left.map(([s, n]) => `${SEC_NAMES[s]} <b>${n}칸</b>`).join(', ')}</p>` : '<p class="note">모든 칸을 채웠어요.</p>';
  }
}
APP.afterRender = () => { wsFill(); showSaved(); };
document.addEventListener('input', e => {
  const el = e.target.closest('[data-k]');
  if (!el) return;
  if (el.type === 'radio') { if (el.checked) WSA[el.dataset.k] = el.value; }
  else WSA[el.dataset.k] = el.value;
  if (el.dataset.k === 'k2n') { renderStep(); return; }     // 군집 수만큼 표의 줄 수를 바꿈
  renderRail(); renderFlow(); showSaved();
  if ($('#leftList')) wsFill();
});

/* ---------- 2번: 그래프에서 묶은 학생 가져오기 (군집 기준은 직접 씀) ---------- */
ACT['ws-grab'] = () => {
  const a = A(), m = $('#grabMsg');
  if (!a.asg.some(v => v)) { if (m) { m.textContent = '먼저 그래프에서 군집 색을 고르고 점을 눌러 학생을 묶어 보세요.'; m.className = 'ws-msg warn'; } return false; }
  WSA.k2n = String(a.k2);
  for (let j = 1; j <= 6; j++) { const ids = [...a.asg.keys()].filter(i => a.asg[i] === j); if (j <= a.k2) WSA['g' + j + 's'] = ids.map(i => CL[i]).join(', '); }
  renderStep();
  const left = a.asg.filter(v => !v).length, m2 = $('#grabMsg');
  if (m2) { m2.textContent = left ? `가져왔어요. 아직 묶지 않은 학생이 ${left}명 있어요.` : '가져왔어요. 이제 군집마다 기준을 직접 써 보세요.'; m2.className = 'ws-msg ' + (left ? 'warn' : 'ok'); }
  return false;
};

/* ---------- 저장하기 (이 브라우저에만 저장) ---------- */
function showSaved(msg, cls) {
  const dirty = JSON.stringify(WSA) !== savedSnap;
  const t = savedAt ? new Date(savedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const fab = $('#saveBtn'), m2 = $('#saveMsg2');
  if (fab) { fab.textContent = dirty ? '저장하기' : savedAt ? '✓ 저장됨' : '저장하기'; fab.className = 'fab-btn' + (dirty ? (savedAt ? ' warn' : '') : savedAt ? ' ok' : ''); }
  const text = msg || (dirty ? (savedAt ? `${t}에 저장한 뒤 고친 내용이 있어요.` : '아직 저장하지 않았어요.') : savedAt ? `✓ ${t}에 저장했어요.` : '');
  const c = cls || (dirty ? 'warn' : 'ok');
  if (m2) { m2.textContent = text; m2.className = 'ws-msg ' + c; }
  return { text, c };
}
let fabTimer = null;
function flash(t, cls = '') { const el = $('#fabMsg'); el.textContent = t; el.className = 'fab-msg ' + cls; clearTimeout(fabTimer); fabTimer = setTimeout(() => { el.textContent = ''; }, cls === 'warn' ? 6000 : 3000); }
function saveAll() {
  try {
    const at = Date.now();
    localStorage.setItem(WS_KEY, JSON.stringify({ at, a: WSA }));
    savedAt = at; savedSnap = JSON.stringify(WSA);
    const r = showSaved(); flash('✓ 이 브라우저에 저장했어요.', 'ok'); return r;
  } catch (e) { flash('저장하지 못했어요. 브라우저 설정에서 사이트 데이터 저장을 허용했는지 확인해 주세요.', 'warn'); showSaved('저장하지 못했어요.', 'warn'); }
}
document.addEventListener('click', e => { if (e.target.closest('#saveBtn, #saveBtn2')) saveAll(); });
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveAll(); } });
let clearArmed = null;
document.addEventListener('click', e => {
  const b = e.target.closest('#clearBtn'); if (!b) return;
  if (!clearArmed) { b.textContent = '정말 지울까요? 한 번 더 누르기'; b.classList.add('arm'); clearArmed = setTimeout(() => { clearArmed = null; b.textContent = '저장한 답 지우기'; b.classList.remove('arm'); }, 3000); return; }
  clearTimeout(clearArmed); clearArmed = null;
  try { localStorage.removeItem(WS_KEY); } catch (err) {}
  WSA = {}; savedAt = null; savedSnap = JSON.stringify(WSA);
  renderStep(); flash('저장한 답을 지웠어요.', 'ok');
});
// 저장하지 않은 답이 있으면 탭을 닫기 전에 한 번 묻기
window.addEventListener('beforeunload', e => { if (JSON.stringify(WSA) !== savedSnap) { e.preventDefault(); e.returnValue = ''; } });
setTimeout(() => { wsFill(); showSaved(); }, 0);
