// 학생·교사 화면이 함께 쓰는 코드
const HALF = 36, TOTAL = 72;
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

// 격자 만들기: cells[1..72] 반환 (왼쪽 1~36, 오른쪽 37~72)
function buildBoard(board, onClick) {
  const cells = [];
  const make = (start) => {
    const half = document.createElement("div");
    half.className = "half";
    for (let i = 0; i < HALF; i++) {
      const n = start + i;
      const c = document.createElement("button");
      c.type = "button"; c.className = "cell";
      c.innerHTML = '<span class="num">' + n + '</span><span class="dot"></span>';
      c.setAttribute("aria-label", n + "번 칸");
      if (onClick) c.addEventListener("click", () => onClick(n));
      cells[n] = c; half.appendChild(c);
    }
    return half;
  };
  const wall = document.createElement("div"); wall.className = "wall";
  board.append(make(1), wall, make(HALF + 1));
  return cells;
}
// counts: {칸 번호: 분자 수}
function setDots(cells, counts) {
  for (let n = 1; n <= TOTAL; n++) {
    const k = (counts && counts[n]) || 0;
    cells[n].classList.toggle("has", k > 0);
    cells[n].querySelector(".dot").textContent = k > 1 ? k : "";
  }
}
function countCells(choices) { const m = {}; Object.values(choices || {}).forEach((c) => (m[c] = (m[c] || 0) + 1)); return m; }
// 처음 상태: 분자 n개가 모두 왼쪽에 있음
function initialCounts(n) { const m = {}; for (let i = 0; i < n; i++) { const c = ((i * 7) % HALF) + 1; m[c] = (m[c] || 0) + 1; } return m; }

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
