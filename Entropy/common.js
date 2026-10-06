// 학생·교사 화면이 함께 쓰는 코드
// 격자 크기: 한쪽 영역이 COLS x ROWS 칸 (전체 칸 수는 2000을 넘지 않게)
const COLS = 11, ROWS = 10, HALF = COLS * ROWS, TOTAL = HALF * 2;
const MODE_NAME = { click: "직접 선택", random: "무작위 번호" };
// 주제: 기체 확산(분자가 퍼짐) 또는 열의 이동(에너지가 두 물체에 나뉨)
const TOPIC = {
  gas: { name: "기체 확산", unit: "분자", open: "칸막이 열기" },
  heat: { name: "열의 이동", unit: "에너지", open: "열 접촉시키기" }
};
const topicOf = (meta) => (meta && meta.topic === "heat" ? "heat" : "gas");
// 모둠 대항전
const TEAMS = ["red", "blue", "green", "yellow"];
const TEAM_NAME = { red: "빨강", blue: "파랑", green: "초록", yellow: "노랑" };
const JACKPOT_MIN = 4, JACKPOT_BONUS = 100;   // 팀 분자가 4개 이상이고 모두 한쪽에 모이면 +100점

function lnC(n, k) { let s = 0; for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i); return s; }
// 고르게 퍼지면 0점, 한쪽에 모두 몰리면 100점
function calcScore(n, nL) {
  const max = lnC(n, Math.floor(n / 2));
  if (max === 0) return 100;
  return Math.round(100 * (1 - lnC(n, nL) / max));
}
function fmtWays(n, k) {
  const w = Math.exp(lnC(n, k));
  return w < 1e12 ? Math.round(w).toLocaleString("ko-KR") + "가지" : w.toExponential(2) + "가지";
}
function fmtProb(n, k) {
  const p = Math.exp(lnC(n, k) - n * Math.LN2) * 100;
  if (p >= 1) return p.toFixed(1) + "%";
  if (p >= 0.001) return p.toPrecision(2) + "%";
  return p.toExponential(1) + "%";
}
const sideOf = (cell) => (cell <= HALF ? "L" : "R");

// 실린더 만들기: cells[1..TOTAL] 반환 (왼쪽 1~HALF, 오른쪽 HALF+1~TOTAL)
function buildBoard(board, onClick) {
  const cells = [];
  const make = (start) => {
    const half = document.createElement("div");
    half.className = "half";
    half.style.gridTemplateColumns = "repeat(" + COLS + ",1fr)";
    for (let i = 0; i < HALF; i++) {
      const n = start + i;
      const c = document.createElement("button");
      c.type = "button"; c.className = "cell"; c.tabIndex = -1;
      c.innerHTML = '<span class="num">' + n + "</span>";
      c.setAttribute("aria-label", n + "번 칸");
      if (onClick) c.addEventListener("click", () => onClick(n));
      cells[n] = c; half.appendChild(c);
    }
    return half;
  };
  const halves = document.createElement("div"); halves.className = "halves";
  const gap = document.createElement("div"); gap.className = "gap";
  gap.innerHTML = '<div class="handle"></div><div class="wall"></div>';   // 칸막이와 손잡이
  halves.append(make(1), gap, make(HALF + 1));
  const gas = document.createElement("div"); gas.className = "gas";
  board.append(halves, gas);
  board._cells = cells; board._gas = gas; board._mols = new Map(); board._list = [];
  new ResizeObserver(() => {
    const w = cells[1].getBoundingClientRect().width;
    board.style.setProperty("--cs", w + "px");
    board.classList.toggle("tiny", w < 20);
    layoutGas(board, false);
  }).observe(board);
  return cells;
}
function rnd(i, k) { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); }
function hashNum(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h) % 100000; }
// list: [{id, cell, mine}] — 분자를 칸 위에 그린다. 같은 id의 분자는 animate가 true면 이전 위치에서 새 위치로 움직인다.
function setGas(board, list, animate) { board._list = list; layoutGas(board, animate); }
function layoutGas(board, animate) {
  const gas = board._gas, mols = board._mols, g = gas.getBoundingClientRect();
  if (!g.width) return;
  gas.classList.toggle("noanim", !animate);
  const seen = new Set();
  board._list.forEach((m) => {
    const h = hashNum(m.id);
    let el = mols.get(m.id);
    if (!el) {
      el = document.createElement("i"); el.className = "mol";
      el.style.animationDelay = -rnd(h, 3) * 3 + "s";
      el.style.transitionDelay = 0.3 + rnd(h, 4) * 0.9 + "s";
      gas.appendChild(el); mols.set(m.id, el);
    }
    const r = board._cells[m.cell].getBoundingClientRect();
    const size = Math.max(5, Math.min(r.width * 0.55, 16));
    el.style.width = el.style.height = size + "px";
    el.style.left = r.left - g.left + r.width * (0.5 + (rnd(h, 1) - 0.5) * 0.5) + "px";
    el.style.top = r.top - g.top + r.height * (0.5 + (rnd(h, 2) - 0.5) * 0.5) + "px";
    el.classList.toggle("mine", !!m.mine);
    el.dataset.team = m.team || "";
    seen.add(m.id);
  });
  mols.forEach((el, id) => { if (!seen.has(id)) { el.remove(); mols.delete(id); } });
}
function countCells(choices) { const m = {}; Object.values(choices || {}).forEach((c) => (m[c] = (m[c] || 0) + 1)); return m; }
// 처음 상태: 모든 분자가 왼쪽 영역에 흩어져 있음 (ids: 학생 uid를 정렬한 배열)
function initialList(ids, myUid) { return ids.map((u, i) => ({ id: u, cell: ((i * 71) % HALF) + 1, mine: u === myUid })); }
// 학생들이 정한 위치 (학생 uid가 분자의 id라서 라운드가 바뀌어도 같은 분자가 이어서 움직임)
function gasList(choices, myUid) { return Object.keys(choices).sort().map((u) => ({ id: u, cell: choices[u], mine: u === myUid })); }
// 라운드 저장 이름. 초기화할 때마다 game 번호가 올라가서 이전 기록과 섞이지 않는다.
function keyOf(meta, round) { return (meta.game ? "g" + meta.game : "") + "r" + round; }
function leftCount(list) { return list.filter((m) => m.cell <= HALF).length; }

// 주제에 맞춰 양쪽 표시를 그린다. 열의 이동에서는 칸(입자)의 에너지 수만큼 붉게 칠하고 떨리게 하며, 양쪽 온도 막대를 보여 준다.
function renderTopic(board, meta, list) {
  const heat = topicOf(meta) === "heat", cnt = {}, $ = (id) => document.getElementById(id);
  board.classList.toggle("heat", heat);
  if (heat) list.forEach((m) => (cnt[m.cell] = (cnt[m.cell] || 0) + 1));
  for (let n = 1; n <= TOTAL; n++) {
    const k = cnt[n] || 0, cl = board._cells[n].classList;
    cl.toggle("h1", k === 1); cl.toggle("h2", k === 2); cl.toggle("h3", k >= 3);
  }
  const nL = leftCount(list), nR = list.length - nL, halves = board.querySelectorAll(".half");
  $("lblL").textContent = heat ? "왼쪽 물체의 에너지" : "왼쪽";
  $("lblR").textContent = heat ? "오른쪽 물체의 에너지" : "오른쪽";
  $("cL").textContent = nL; $("cR").textContent = nR;
  [[nL, "tL", halves[0]], [nR, "tR", halves[1]]].forEach(([k, id, half]) => {
    const share = list.length ? k / list.length : 0, hue = Math.round(220 + 140 * share);   // 파랑(저온)에서 빨강(고온)으로
    const el = $(id), bar = el.querySelector("i");
    el.hidden = !heat;
    bar.style.width = Math.round(share * 100) + "%";
    bar.style.background = "hsl(" + hue + ",75%,50%)";
    half.style.backgroundColor = heat ? "hsla(" + hue + ",80%,55%,.10)" : "";
  });
}

function esc(s) { return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }
function sortedResults(results) { return Object.values(results || {}).sort((a, b) => a.round - b.round); }
function totalScore(results) { return sortedResults(results).reduce((s, r) => s + (r.score || 0), 0); }

// 팀별 결과: 반 전체에 쓰던 점수 규칙을 같은 색 분자끼리 적용한다. choices {uid: 칸}, teamOf {uid: 팀}
function teamResults(choices, teamOf) {
  const out = {};
  TEAMS.forEach((t) => {
    const cs = Object.keys(choices).filter((u) => teamOf[u] === t).map((u) => choices[u]);
    const n = cs.length;
    if (!n) return;
    const nL = cs.filter((x) => x <= HALF).length;
    const base = n < 2 ? 0 : calcScore(n, nL);   // 분자가 1개뿐인 팀은 0점
    const jackpot = n >= JACKPOT_MIN && (nL === 0 || nL === n);
    out[t] = { n, nL, base, jackpot, score: base + (jackpot ? JACKPOT_BONUS : 0) };
  });
  return out;
}
function teamTotals(results) {
  const tot = {};
  sortedResults(results).forEach((r) => TEAMS.forEach((t) => { if (r.teams && r.teams[t]) tot[t] = (tot[t] || 0) + r.teams[t].score; }));
  return tot;
}
const teamTag = (t) => (TEAM_NAME[t] ? '<span class="tdot" data-team="' + t + '"></span>' + TEAM_NAME[t] : "");

function bigHTML(a, av, b, bv) {
  return '<div class="scores"><div class="now">' + a + '<span class="n">' + av + "</span></div><div>" + b + '<span class="n">' + bv + "</span></div></div>";
}
function factsHTML(n, nL, heat) {
  const temp = heat ? "<dt>두 물체의 온도</dt><dd>" + (nL * 2 === n ? "같아요" : nL * 2 > n ? "왼쪽이 더 높아요" : "오른쪽이 더 높아요") + "</dd>" : "";
  return '<dl class="facts"><dt>분포</dt><dd>왼쪽 ' + nL + "개, 오른쪽 " + (n - nL) + "개</dd>" + temp + "<dt>이 분포가 되는 경우의 수</dt><dd>" +
    fmtWays(n, nL) + "</dd><dt>무작위로 이 분포가 나올 확률</dt><dd>" + fmtProb(n, nL) + "</dd></dl>";
}
// 이번 라운드 결과 카드. myTeam은 학생 화면에서만 넘긴다.
function resultHTML(meta, r, results, myTeam) {
  const U = TOPIC[topicOf(meta)].unit;
  if (!meta.teams) return bigHTML("이번 점수", r.score, "누적 총점", totalScore(results)) + factsHTML(r.n, r.nL, topicOf(meta) === "heat");
  const tot = teamTotals(results), ts = r.teams || {}, mine = myTeam && ts[myTeam];
  let h = "";
  if (mine) h += bigHTML("우리 팀(" + TEAM_NAME[myTeam] + ") 이번 점수", mine.score, "우리 팀 누적", tot[myTeam] || 0);
  else if (myTeam) h += '<p class="sub">이번 라운드에는 우리 팀이 제출한 ' + U + "가 없어요.</p>";
  TEAMS.forEach((t) => {
    if (ts[t] && ts[t].jackpot) h += '<p class="jackpot">잭팟! ' + TEAM_NAME[t] + " 팀의 " + U + " " + ts[t].n + "개가 모두 한쪽에 모였어요. 무작위로는 " +
      Math.pow(2, ts[t].n - 1) + "번에 한 번 나오는 일이에요. 보너스 +" + JACKPOT_BONUS + "점</p>";
  });
  h += "<table><thead><tr><th>팀</th><th>왼쪽 : 오른쪽</th><th>이번 점수</th><th>누적</th></tr></thead><tbody>";
  TEAMS.forEach((t) => {
    const x = ts[t];
    if (!x && tot[t] === undefined) return;
    h += "<tr" + (t === myTeam ? ' class="me"' : "") + "><td>" + teamTag(t) + "</td><td>" + (x ? x.nL + " : " + (x.n - x.nL) : "–") +
      "</td><td><b>" + (x ? x.score : "–") + "</b></td><td>" + (tot[t] || 0) + "</td></tr>";
  });
  h += "</tbody></table>";
  if (mine) h += factsHTML(mine.n, mine.nL);
  return h;
}
// 라운드별 점수 기록 표
function historyHTML(meta, results, emptyText) {
  const list = sortedResults(results);
  if (!list.length) return '<p class="empty">' + emptyText + "</p>";
  if (!meta.teams) {
    let sum = 0;
    return "<table><thead><tr><th>라운드</th><th>방식</th><th>왼쪽 : 오른쪽</th><th>점수</th><th>누적</th></tr></thead><tbody>" +
      list.map((r) => { sum += r.score || 0; return "<tr><td>" + r.round + "</td><td>" + MODE_NAME[r.mode] + "</td><td>" + r.nL + " : " + r.nR + "</td><td><b>" + (r.score || 0) + "</b></td><td>" + sum + "</td></tr>"; }).join("") +
      "</tbody></table>";
  }
  const tot = teamTotals(results);
  return "<table><thead><tr><th>라운드</th><th>방식</th>" + TEAMS.map((t) => "<th>" + teamTag(t) + "</th>").join("") + "</tr></thead><tbody>" +
    list.map((r) => "<tr><td>" + r.round + "</td><td>" + MODE_NAME[r.mode] + "</td>" +
      TEAMS.map((t) => "<td>" + (r.teams && r.teams[t] ? r.teams[t].score + (r.teams[t].jackpot ? " ★" : "") : "–") + "</td>").join("") + "</tr>").join("") +
    '<tr class="sum"><td colspan="2">누적</td>' + TEAMS.map((t) => "<td><b>" + (tot[t] === undefined ? "–" : tot[t]) + "</b></td>").join("") + "</tr></tbody></table>" +
    '<p class="sub small">★은 잭팟(+' + JACKPOT_BONUS + "점)이에요.</p>";
}
// 최종 순위: 예상 점수와 실제 점수의 차이가 작은 순서
function buildFinal(meta, players, priv, results) {
  const tot = teamTotals(results), classTotal = totalScore(results);
  const list = Object.keys(players).filter((u) => priv[u] && typeof priv[u].predict === "number").map((u) => {
    const team = priv[u].team || "", actual = meta.teams ? tot[team] || 0 : classTotal;
    return { uid: u, name: players[u].name || "", team, predict: priv[u].predict, actual, diff: Math.abs(priv[u].predict - actual) };
  }).sort((a, b) => a.diff - b.diff || a.name.localeCompare(b.name));
  list.forEach((x, i) => { x.rank = i > 0 && list[i - 1].diff === x.diff ? list[i - 1].rank : i + 1; });
  return { list };
}
function finalHTML(final, meta, myUid) {
  const list = Object.values((final && final.list) || {});
  let h = "<h2>최종 순위: 예상과 실제의 차이가 작은 순서</h2>";
  if (!list.length) return h + '<p class="empty">예상 점수를 낸 학생이 없어요.</p>';
  h += "<table><thead><tr><th>순위</th><th>별명</th>" + (meta.teams ? "<th>팀</th>" : "") + "<th>예상</th><th>실제</th><th>차이</th></tr></thead><tbody>";
  list.forEach((x) => {
    h += "<tr" + (x.uid === myUid ? ' class="me"' : "") + "><td><b>" + x.rank + "</b></td><td>" + esc(x.name) + "</td>" +
      (meta.teams ? "<td>" + teamTag(x.team) + "</td>" : "") + "<td>" + x.predict + "</td><td>" + x.actual + "</td><td><b>" + x.diff + "</b></td></tr>";
  });
  return h + "</tbody></table>";
}

function configReady() {
  const ok = window.firebaseConfig && !String(window.firebaseConfig.apiKey).startsWith("YOUR");
  if (!ok) document.getElementById("notice").hidden = false;
  return ok;
}
