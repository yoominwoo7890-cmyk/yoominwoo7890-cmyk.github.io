// 학생·교사 화면이 함께 쓰는 코드
// 격자 크기: 한쪽 영역이 COLS x ROWS 칸 (전체 칸 수는 2000을 넘지 않게)
const COLS = 11, ROWS = 10, HALF = COLS * ROWS, TOTAL = HALF * 2;
const MODE_NAME = { click: "직접 선택", random: "무작위 번호" };

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
    seen.add(m.id);
  });
  mols.forEach((el, id) => { if (!seen.has(id)) { el.remove(); mols.delete(id); } });
}
function countCells(choices) { const m = {}; Object.values(choices || {}).forEach((c) => (m[c] = (m[c] || 0) + 1)); return m; }
// 처음 상태: 모든 분자가 왼쪽 영역에 흩어져 있음 (ids: 학생 uid를 정렬한 배열)
function initialList(ids, myUid) { return ids.map((u, i) => ({ id: u, cell: ((i * 71) % HALF) + 1, mine: u === myUid })); }
// 학생들이 정한 위치 (학생 uid가 분자의 id라서 라운드가 바뀌어도 같은 분자가 이어서 움직임)
function gasList(choices, myUid) { return Object.keys(choices).sort().map((u) => ({ id: u, cell: choices[u], mine: u === myUid })); }
function leftCount(list) { return list.filter((m) => m.cell <= HALF).length; }

function sortedResults(results) { return Object.values(results || {}).sort((a, b) => a.round - b.round); }
function totalScore(results) { return sortedResults(results).reduce((s, r) => s + r.score, 0); }

function renderResult(r, results) {
  const $ = (id) => document.getElementById(id);
  $("rScore").textContent = r.score;
  $("rTotal").textContent = totalScore(results);
  $("rSplit").textContent = "왼쪽 " + r.nL + "개, 오른쪽 " + r.nR + "개";
  $("rWays").textContent = fmtWays(r.n, r.nL);
  $("rProb").textContent = fmtProb(r.n, r.nL);
}
function renderHistory(tbody, emptyEl, results) {
  const list = sortedResults(results);
  emptyEl.hidden = list.length > 0;
  tbody.parentElement.hidden = list.length === 0;
  let sum = 0;
  tbody.innerHTML = list.map((r) => {
    sum += r.score;
    return "<tr><td>" + r.round + "</td><td>" + MODE_NAME[r.mode] + "</td><td>" + r.nL + " : " + r.nR +
      "</td><td><b>" + r.score + "</b></td><td>" + sum + "</td></tr>";
  }).join("");
}

function configReady() {
  const ok = window.firebaseConfig && !String(window.firebaseConfig.apiKey).startsWith("YOUR");
  if (!ok) document.getElementById("notice").hidden = false;
  return ok;
}
