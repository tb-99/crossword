// ---------- Your data ----------
const RAW_ENTRIES = [
  { clue: "Where you took the picture of me in that funny hat", answer: "arboretum" },
  { clue: "First movie we ever watched together", answer: "bird box" },
  { clue: "I always say I have “infinite ___”", answer: "energy" },
  { clue: "What exercise did I do at the beach and you yelled at me for sagging my pants?", answer: "pull ups" },
  { clue: "What was I doing in the first video I ever sent you?", answer: "bench press" },
  { clue: "My dinner of choice", answer: "steak" },
  { clue: "Favorite moment touring NYC", answer: "central park" },
  { clue: "What holiday changed our lives forever?", answer: "fourth of july" },
  { clue: "What session do I trade?", answer: "asia" },
  { clue: "What was my landlord’s name when I lived in an air bnb?", answer: "candy" },
  { clue: "What did I buy on the streets of NYC?", answer: "sunglasses" },
  { clue: "What is my favorite color to wear?", answer: "black" },
  { clue: "What game do I always beat you at with no avail?", answer: "game of life" },
  { clue: "What is my major?", answer: "computer engineering" },
  { clue: "How many hours did I drive to see you for halloween?", answer: "eight" },
  { clue: "What game did you jackpot at dave and busters?", answer: "pop the lock" },
];

function normalizeAnswer(s) {
  return s.toUpperCase().replace(/[^A-Z]/g, ""); // remove spaces/punct
}

const ENTRIES = RAW_ENTRIES.map((e, i) => ({
  id: i,
  clue: e.clue.trim(),
  answer: normalizeAnswer(e.answer),
}));

// ---------- Crossword generator (across/down only) ----------
const SIZE = 21; // grid size; tweak if you add longer answers

function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => null));
}

function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function canPlace(grid, word, r, c, dir) {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;

  // must fit
  const endR = r + dr * (word.length - 1);
  const endC = c + dc * (word.length - 1);
  if (!inBounds(r, c) || !inBounds(endR, endC)) return false;

  // check "before" and "after" are empty to avoid dangling continuations
  const br = r - dr, bc = c - dc;
  const ar = endR + dr, ac = endC + dc;
  if (inBounds(br, bc) && grid[br][bc] !== null) return false;
  if (inBounds(ar, ac) && grid[ar][ac] !== null) return false;

  // each letter must match or be empty; also enforce side adjacency rules
  let intersections = 0;
  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    const ch = word[i];

    const cell = grid[rr][cc];
    if (cell !== null && cell !== ch) return false;
    if (cell === ch) intersections++;

    // side adjacency (prevent touching words without crossing)
    if (dir === "across") {
      if (inBounds(rr - 1, cc) && grid[rr - 1][cc] !== null && cell === null) return false;
      if (inBounds(rr + 1, cc) && grid[rr + 1][cc] !== null && cell === null) return false;
    } else {
      if (inBounds(rr, cc - 1) && grid[rr][cc - 1] !== null && cell === null) return false;
      if (inBounds(rr, cc + 1) && grid[rr][cc + 1] !== null && cell === null) return false;
    }
  }

  // first word can be placed without intersections; later words should intersect
  return { ok: true, intersections };
}

function placeWord(grid, word, r, c, dir) {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  const placed = [];
  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    if (grid[rr][cc] === null) {
      grid[rr][cc] = word[i];
      placed.push([rr, cc]);
    }
  }
  return placed;
}

function unplace(grid, placed) {
  for (const [r, c] of placed) grid[r][c] = null;
}

function findAllAnchors(grid) {
  const anchors = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] !== null) anchors.push([r, c, grid[r][c]]);
    }
  }
  return anchors;
}

function getCandidates(grid, word, isFirst) {
  const candidates = [];

  if (isFirst) {
    // place first word roughly centered
    const r = Math.floor(SIZE / 2);
    const c = Math.floor((SIZE - word.length) / 2);
    candidates.push({ r, c, dir: "across", score: 0 });
    candidates.push({ r: Math.floor((SIZE - word.length) / 2), c: Math.floor(SIZE / 2), dir: "down", score: 0 });
    return candidates;
  }

  const anchors = findAllAnchors(grid);

  // try to align matching letters with existing letters (crossing)
  for (const [ar, ac, ch] of anchors) {
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== ch) continue;

      // if word is across, letter i at (ar, ac) => start at (ar, ac - i)
      let r = ar, c = ac - i;
      let res = canPlace(grid, word, r, c, "across");
      if (res && res.ok) candidates.push({ r, c, dir: "across", score: res.intersections });

      // if word is down, start at (ar - i, ac)
      r = ar - i; c = ac;
      res = canPlace(grid, word, r, c, "down");
      if (res && res.ok) candidates.push({ r, c, dir: "down", score: res.intersections });
    }
  }

  // prefer more intersections
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function generateCrossword(entries) {
  const grid = emptyGrid();
  const sorted = [...entries].sort((a, b) => b.answer.length - a.answer.length);

  const placements = []; // {id, answer, clue, r,c,dir}
  function backtrack(idx) {
    if (idx === sorted.length) return true;
    const entry = sorted[idx];
    const word = entry.answer;

    const isFirst = idx === 0;
    const cand = getCandidates(grid, word, isFirst);

    for (const { r, c, dir } of cand) {
      const chk = canPlace(grid, word, r, c, dir);
      if (!chk || !chk.ok) continue;

      // require intersections for non-first word
      if (!isFirst && chk.intersections < 1) continue;

      const placed = placeWord(grid, word, r, c, dir);
      placements.push({ ...entry, r, c, dir });

      if (backtrack(idx + 1)) return true;

      placements.pop();
      unplace(grid, placed);
    }

    return false;
  }

  const ok = backtrack(0);
  if (!ok) return null;

  // crop to bounding box
  let rMin = SIZE, rMax = -1, cMin = SIZE, cMax = -1;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (grid[r][c] !== null) {
      rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
      cMin = Math.min(cMin, c); cMax = Math.max(cMax, c);
    }
  }
  const cropped = [];
  for (let r = rMin; r <= rMax; r++) cropped.push(grid[r].slice(cMin, cMax + 1));

  // adjust placements
  const adjPlacements = placements.map(p => ({ ...p, r: p.r - rMin, c: p.c - cMin }));
  return { grid: cropped, placements: adjPlacements };
}

// ---------- Numbering + clue lists ----------
function computeNumbers(grid) {
  const rows = grid.length, cols = grid[0].length;
  const num = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  let n = 1;

  const isBlock = (r, c) => !grid[r][c];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isBlock(r, c)) continue;

      const leftBlock = (c === 0) || isBlock(r, c - 1);
      const upBlock = (r === 0) || isBlock(r - 1, c);

      const startsAcross = leftBlock && (c + 1 < cols) && !isBlock(r, c + 1);
      const startsDown = upBlock && (r + 1 < rows) && !isBlock(r + 1, c);

      if (startsAcross || startsDown) num[r][c] = n++;
    }
  }
  return num;
}

function buildClueLists(grid, numbers, placements) {
  const rows = grid.length, cols = grid[0].length;

  // map placement start -> entry
  const startMap = new Map();
  for (const p of placements) startMap.set(`${p.r},${p.c},${p.dir}`, p);

  const across = [];
  const down = [];

  const isBlock = (r, c) => !grid[r][c];

  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (isBlock(r, c)) continue;
    const n = numbers[r][c];
    if (!n) continue;

    // starts across?
    const leftBlock = (c === 0) || isBlock(r, c - 1);
    const startsAcross = leftBlock && (c + 1 < cols) && !isBlock(r, c + 1);
    if (startsAcross) {
      const p = startMap.get(`${r},${c},across`);
      if (p) across.push({ number: n, clue: p.clue, answer: p.answer });
    }

    // starts down?
    const upBlock = (r === 0) || isBlock(r - 1, c);
    const startsDown = upBlock && (r + 1 < rows) && !isBlock(r + 1, c);
    if (startsDown) {
      const p = startMap.get(`${r},${c},down`);
      if (p) down.push({ number: n, clue: p.clue, answer: p.answer });
    }
  }

  return { across, down };
}

// ---------- Rendering + input behavior ----------
let SOLUTION = null;
let INPUTS = [];

function render(cw) {
  const grid = cw.grid;
  const rows = grid.length, cols = grid[0].length;
  const numbers = computeNumbers(grid);
  const { across, down } = buildClueLists(grid, numbers, cw.placements);

  const board = document.getElementById("board");
  board.style.gridTemplateColumns = `repeat(${cols}, var(--cell))`;
  board.innerHTML = "";
  INPUTS = [];

  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cell = document.createElement("div");
    cell.className = "cell";

    if (!grid[r][c]) {
      cell.classList.add("block");
      board.appendChild(cell);
      INPUTS.push(null);
      continue;
    }

    const n = numbers[r][c];
    if (n) {
      const num = document.createElement("div");
      num.className = "num";
      num.textContent = String(n);
      cell.appendChild(num);
    }

    const inp = document.createElement("input");
    inp.maxLength = 1;
    inp.dataset.r = r;
    inp.dataset.c = c;
    inp.autocomplete = "off";
    inp.spellcheck = false;

    inp.addEventListener("input", () => {
      inp.value = (inp.value || "").toUpperCase().replace(/[^A-Z]/g, "");
      moveNext(r, c);
    });

    inp.addEventListener("keydown", (e) => {
      const key = e.key;
      if (key === "ArrowUp") { e.preventDefault(); focusCell(r - 1, c); }
      if (key === "ArrowDown") { e.preventDefault(); focusCell(r + 1, c); }
      if (key === "ArrowLeft") { e.preventDefault(); focusCell(r, c - 1); }
      if (key === "ArrowRight") { e.preventDefault(); focusCell(r, c + 1); }
      if (key === "Backspace" && !inp.value) { e.preventDefault(); movePrev(r, c); }
    });

    cell.appendChild(inp);
    board.appendChild(cell);
    INPUTS.push(inp);
  }

  // clues
  const aEl = document.getElementById("across");
  const dEl = document.getElementById("down");
  aEl.innerHTML = across.map(x => `<li><b>${x.number}.</b> ${escapeHtml(x.clue)}</li>`).join("");
  dEl.innerHTML = down.map(x => `<li><b>${x.number}.</b> ${escapeHtml(x.clue)}</li>`).join("");

  SOLUTION = grid;

  // focus first input
  const first = INPUTS.find(x => x);
  if (first) first.focus();
}

function idxOf(r, c) {
  const board = document.getElementById("board");
  const cols = getComputedStyle(board).gridTemplateColumns.split(" ").length;
  return r * cols + c;
}

function focusCell(r, c) {
  const board = document.getElementById("board");
  const cols = getComputedStyle(board).gridTemplateColumns.split(" ").length;
  const rows = INPUTS.length / cols;

  if (r < 0 || c < 0 || r >= rows || c >= cols) return;
  const i = r * cols + c;
  const inp = INPUTS[i];
  if (inp) inp.focus();
}

function moveNext(r, c) {
  // default: go right; if blocked, go down
  focusCell(r, c + 1);
}

function movePrev(r, c) {
  focusCell(r, c - 1);
}

function clearMarks() {
  document.querySelectorAll(".cell").forEach(el => el.classList.remove("bad", "good"));
}

function checkAnswers(reveal = false) {
  if (!SOLUTION) return;
  clearMarks();

  const board = document.getElementById("board");
  const cols = getComputedStyle(board).gridTemplateColumns.split(" ").length;
  const rows = SOLUTION.length;

  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const sol = SOLUTION[r][c];
    const i = r * cols + c;
    const inp = INPUTS[i];
    if (!inp) continue;

    const cellDiv = inp.parentElement;
    const val = (inp.value || "").toUpperCase();

    if (reveal) inp.value = sol;

    if (val && val === sol) cellDiv.classList.add("good");
    else if (val && val !== sol) cellDiv.classList.add("bad");
  }
}

function clearGrid() {
  clearMarks();
  INPUTS.forEach(inp => { if (inp) inp.value = ""; });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[m]));
}

// ---------- Boot ----------
function regen() {
  // retry a few times in case the generator finds a suboptimal path
  for (let t = 0; t < 30; t++) {
    const cw = generateCrossword(ENTRIES);
    if (cw) { render(cw); return; }
  }
  alert("Couldn’t generate a crossword from this set. (Usually means not enough overlapping letters.)");
}

document.getElementById("regen").addEventListener("click", regen);
document.getElementById("check").addEventListener("click", () => checkAnswers(false));
//document.getElementById("reveal").addEventListener("click", () => checkAnswers(true));
document.getElementById("clear").addEventListener("click", clearGrid);

regen();