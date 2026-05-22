(function () {
  "use strict";

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const INITIAL_LIVES = 3;
  const BASE_SPAWN_MS = 1400;
  const MIN_SPAWN_MS = 450;
  const BASE_FALL_PX = 55;
  const MAX_FALL_PX = 180;
  const DANGER_RATIO = 0.88;
  const COMBO_DECAY_MS = 2500;

  const els = {
    playfield: document.getElementById("playfield"),
    letters: document.getElementById("letters"),
    score: document.getElementById("score"),
    combo: document.getElementById("combo"),
    comboWrap: document.getElementById("combo-wrap"),
    level: document.getElementById("level"),
    lives: document.getElementById("lives"),
    accuracy: document.getElementById("accuracy"),
    overlay: document.getElementById("overlay"),
    gameover: document.getElementById("gameover"),
    startBtn: document.getElementById("start-btn"),
    restartBtn: document.getElementById("restart-btn"),
    finalScore: document.getElementById("final-score"),
    finalCombo: document.getElementById("final-combo"),
    finalHits: document.getElementById("final-hits"),
    finalAccuracy: document.getElementById("final-accuracy"),
    lastKey: document.getElementById("last-key"),
    particles: document.getElementById("particles"),
    playerName: document.getElementById("player-name"),
    leaderboardList: document.getElementById("leaderboard-list"),
    leaderboardStatus: document.getElementById("leaderboard-status"),
    saveStatus: document.getElementById("save-status"),
    saveScoreBtn: document.getElementById("save-score-btn"),
    game: document.getElementById("game"),
    pauseBtn: document.getElementById("pause-btn"),
    pausePanel: document.getElementById("pause"),
    resumeBtn: document.getElementById("resume-btn"),
    pauseMenuBtn: document.getElementById("pause-menu-btn"),
    gameoverMenuBtn: document.getElementById("gameover-menu-btn"),
    pauseScore: document.getElementById("pause-score"),
    pauseCombo: document.getElementById("pause-combo"),
    pauseLevel: document.getElementById("pause-level"),
    pauseLives: document.getElementById("pause-lives"),
    pauseAccuracy: document.getElementById("pause-accuracy"),
    pauseMaxCombo: document.getElementById("pause-max-combo"),
    pauseHits: document.getElementById("pause-hits"),
    pauseMisses: document.getElementById("pause-misses"),
    pauseWrong: document.getElementById("pause-wrong"),
    pauseTime: document.getElementById("pause-time"),
    pauseOnScreen: document.getElementById("pause-on-screen"),
  };

  const PLAYER_STORAGE_KEY = "skyTypePlayerName";
  const PLAYER_NAME_RE = /^[\w\s.\-]{1,32}$/i;
  const LEADERBOARD_TOP = 10;
  let scoreSavedThisGame = false;

  let state = createState();
  let rafId = null;
  let lastTime = 0;
  let spawnTimer = 0;
  let comboTimer = 0;
  let nextId = 0;
  let dangerY = 0;
  let particleCtx = null;
  const particles = [];

  function createState() {
    return {
      running: false,
      paused: false,
      score: 0,
      level: 1,
      lives: INITIAL_LIVES,
      combo: 1,
      maxCombo: 1,
      hits: 0,
      misses: 0,
      wrongKeys: 0,
      letters: [],
      elapsed: 0,
    };
  }

  function getPlayerName() {
    const name = (els.playerName.value || "").trim();
    if (!name || !PLAYER_NAME_RE.test(name)) return "";
    return name;
  }

  /**
   * Save player name and score to the SQLite database via the API.
   * @param {string} name
   * @param {number} score
   * @returns {Promise<{ id: number, playerName: string, score: number }>}
   */
  async function addPlayerScore(name, score) {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Could not save score");
    }
    return data;
  }

  async function loadLeaderboard() {
    els.leaderboardStatus.textContent = "Loading…";
    try {
      const res = await fetch("/api/scores");
      if (!res.ok) throw new Error("Failed to load scores");
      const rows = await res.json();
      renderLeaderboard(rows.slice(0, LEADERBOARD_TOP));
      const shown = Math.min(rows.length, LEADERBOARD_TOP);
      els.leaderboardStatus.textContent = shown
        ? ""
        : "No scores yet — be the first!";
    } catch {
      els.leaderboardList.replaceChildren();
      els.leaderboardStatus.textContent =
        "Leaderboard unavailable. Run npm start and open http://localhost:8080";
    }
  }

  function renderLeaderboard(rows) {
    els.leaderboardList.replaceChildren();
    rows.forEach((row, i) => {
      const li = document.createElement("li");
      const rank = document.createElement("span");
      const name = document.createElement("span");
      const pts = document.createElement("span");
      rank.className = "rank";
      name.className = "name";
      pts.className = "pts";
      rank.textContent = i + 1 + ".";
      name.textContent = String(row.playerName ?? "");
      pts.textContent = Number(row.score).toLocaleString();
      li.append(rank, name, pts);
      els.leaderboardList.appendChild(li);
    });
  }

  function setSaveStatus(message, type) {
    els.saveStatus.textContent = message;
    els.saveStatus.className = "save-status" + (type ? " " + type : "");
  }

  async function saveScoreToDatabase() {
    const name = getPlayerName();
    if (!name) {
      setSaveStatus("Enter your name on the start screen to save.", "err");
      return false;
    }
    if (scoreSavedThisGame) {
      setSaveStatus("Score already saved.", "ok");
      return true;
    }

    els.saveScoreBtn.disabled = true;
    setSaveStatus("Saving…", "");

    try {
      await addPlayerScore(name, state.score);
      scoreSavedThisGame = true;
      localStorage.setItem(PLAYER_STORAGE_KEY, name);
      setSaveStatus("Score saved for " + name + "!", "ok");
      els.saveScoreBtn.disabled = true;
      await loadLeaderboard();
      return true;
    } catch (err) {
      setSaveStatus(err.message, "err");
      els.saveScoreBtn.disabled = false;
      return false;
    }
  }

  function init() {
    resizeParticles();
    renderLives();

    const savedName = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (savedName) els.playerName.value = savedName;

    els.startBtn.addEventListener("click", startGame);
    els.restartBtn.addEventListener("click", startGame);
    els.pauseBtn.addEventListener("click", togglePause);
    els.resumeBtn.addEventListener("click", resumeGame);
    els.pauseMenuBtn.addEventListener("click", returnToMainMenu);
    els.gameoverMenuBtn.addEventListener("click", returnToMainMenu);
    els.saveScoreBtn.addEventListener("click", saveScoreToDatabase);
    els.playerName.addEventListener("change", () => {
      const name = getPlayerName();
      if (name) localStorage.setItem(PLAYER_STORAGE_KEY, name);
    });

    window.addEventListener("resize", resizeParticles);
    document.addEventListener("keydown", onKeyDown);
    loadLeaderboard();
  }

  function resizeParticles() {
    const c = els.particles;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    particleCtx = c.getContext("2d");
  }

  function clearPlayerCache() {
    localStorage.removeItem(PLAYER_STORAGE_KEY);
    els.playerName.value = "";
  }

  function returnToMainMenu() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    state = createState();
    scoreSavedThisGame = false;
    spawnTimer = 0;
    comboTimer = 0;
    particles.length = 0;
    if (particleCtx) {
      particleCtx.clearRect(0, 0, els.particles.width, els.particles.height);
    }

    els.letters.replaceChildren();
    els.pausePanel.classList.add("hidden");
    els.gameover.classList.add("hidden");
    els.overlay.classList.remove("hidden");
    els.game.classList.remove("paused");
    els.pauseBtn.disabled = true;
    els.pauseBtn.textContent = "Pause";
    els.saveScoreBtn.disabled = false;
    setSaveStatus("", "");
    clearPlayerCache();

    renderLives();
    updateHud();
    els.leaderboardStatus.textContent = "";
    loadLeaderboard();
    els.playerName.focus();
  }

  function startGame() {
    const name = getPlayerName();
    if (!name) {
      els.playerName.focus();
      els.leaderboardStatus.textContent = "Enter your name before starting.";
      return;
    }
    localStorage.setItem(PLAYER_STORAGE_KEY, name);

    if (rafId) cancelAnimationFrame(rafId);
    state = createState();
    state.running = true;
    state.paused = false;
    scoreSavedThisGame = false;
    els.letters.innerHTML = "";
    els.overlay.classList.add("hidden");
    els.gameover.classList.add("hidden");
    els.pausePanel.classList.add("hidden");
    els.game.classList.remove("paused");
    els.pauseBtn.disabled = false;
    els.pauseBtn.textContent = "Pause";
    setSaveStatus("", "");
    els.saveScoreBtn.disabled = false;
    updateHud();
    lastTime = performance.now();
    spawnTimer = 0;
    comboTimer = 0;
    updateDangerLine();
    loop(lastTime);
  }

  function updateDangerLine() {
    const h = els.playfield.clientHeight;
    dangerY = h * DANGER_RATIO;
  }

  function getAccuracy() {
    const total = state.hits + state.misses + state.wrongKeys;
    return total ? Math.round((state.hits / total) * 100) : 100;
  }

  function formatElapsed(seconds) {
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ":" + String(r).padStart(2, "0");
  }

  function updatePauseStats() {
    els.pauseScore.textContent = state.score.toLocaleString();
    els.pauseCombo.textContent = "×" + state.combo;
    els.pauseLevel.textContent = state.level;
    els.pauseLives.textContent = state.lives + " / " + INITIAL_LIVES;
    els.pauseAccuracy.textContent = getAccuracy() + "%";
    els.pauseMaxCombo.textContent = "×" + state.maxCombo;
    els.pauseHits.textContent = state.hits;
    els.pauseMisses.textContent = state.misses;
    els.pauseWrong.textContent = state.wrongKeys;
    els.pauseTime.textContent = formatElapsed(state.elapsed);
    els.pauseOnScreen.textContent = state.letters.length;
  }

  function pauseGame() {
    if (!state.running || state.paused) return;
    state.paused = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    updatePauseStats();
    els.pausePanel.classList.remove("hidden");
    els.game.classList.add("paused");
    els.pauseBtn.textContent = "Paused";
  }

  function resumeGame() {
    if (!state.running || !state.paused) return;
    state.paused = false;
    els.pausePanel.classList.add("hidden");
    els.game.classList.remove("paused");
    els.pauseBtn.textContent = "Pause";
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (state.paused) resumeGame();
    else pauseGame();
  }

  function loop(now) {
    if (!state.running || state.paused) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    state.elapsed += dt;
    spawnTimer += dt * 1000;

    const spawnInterval = Math.max(
      MIN_SPAWN_MS,
      BASE_SPAWN_MS - state.level * 80 - state.elapsed * 2
    );
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnLetter();
      if (Math.random() < 0.15 + state.level * 0.02) spawnLetter();
    }

    const fallSpeed =
      BASE_FALL_PX + state.level * 12 + Math.min(state.elapsed * 3, MAX_FALL_PX - BASE_FALL_PX);

    for (let i = state.letters.length - 1; i >= 0; i--) {
      const L = state.letters[i];
      L.y += fallSpeed * dt;
      L.el.style.top = L.y + "px";

      if (L.y >= dangerY) {
        loseLife(L);
        state.letters.splice(i, 1);
      }
    }

    const newLevel = 1 + Math.floor(state.elapsed / 18) + Math.floor(state.hits / 25);
    if (newLevel !== state.level) {
      state.level = newLevel;
      flashHud(els.level);
    }

    if (comboTimer > 0) {
      comboTimer -= dt * 1000;
      if (comboTimer <= 0 && state.combo > 1) {
        state.combo = 1;
        updateHud();
      }
    }

    updateParticles(dt);
    rafId = requestAnimationFrame(loop);
  }

  function spawnLetter() {
    const w = els.playfield.clientWidth;
    const char = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const x = 40 + Math.random() * (w - 80);
    const el = document.createElement("div");
    el.className = "letter";
    el.textContent = char;
    el.dataset.char = char;
    const y = -30;
    el.style.left = x + "px";
    el.style.top = y + "px";
    els.letters.appendChild(el);

    state.letters.push({
      id: nextId++,
      char,
      x,
      y,
      el,
    });
  }

  function findTarget(char) {
    let best = null;
    let bestY = -1;
    for (const L of state.letters) {
      if (L.char !== char) continue;
      if (L.y > bestY) {
        bestY = L.y;
        best = L;
      }
    }
    return best;
  }

  function onKeyDown(e) {
    if (e.repeat) return;

    if (e.key === "Escape" || e.key === "p" || e.key === "P") {
      if (state.running && !els.gameover.classList.contains("hidden")) return;
      if (state.running) {
        e.preventDefault();
        togglePause();
      }
      return;
    }

    if (state.paused) return;

    const key = e.key.toUpperCase();
    if (key.length !== 1 || !LETTERS.includes(key)) {
      if (state.running && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
      }
      return;
    }

    if (!state.running || state.paused) return;

    e.preventDefault();
    handleShot(key);
  }

  function handleShot(key) {
    if (state.paused) return;
    els.lastKey.classList.remove("hidden", "miss");
    els.lastKey.textContent = key;

    const target = findTarget(key);
    if (!target) {
      state.wrongKeys++;
      state.combo = 1;
      comboTimer = 0;
      els.lastKey.classList.add("miss");
      updateHud();
      return;
    }

    const points = Math.round(100 * state.combo * (1 + target.y / dangerY * 0.5));
    state.score += points;
    state.hits++;
    state.combo = Math.min(state.combo + 1, 20);
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    comboTimer = COMBO_DECAY_MS;

    target.el.classList.add("hit");
    burstParticles(target.x, target.y + els.playfield.offsetTop);
    showScorePopup(target.x, target.y, "+" + points);

    const idx = state.letters.indexOf(target);
    if (idx !== -1) state.letters.splice(idx, 1);
    setTimeout(() => target.el.remove(), 260);

    flashHud(els.comboWrap);
    updateHud();
  }

  function loseLife(L) {
    state.misses++;
    state.combo = 1;
    comboTimer = 0;
    L.el.classList.add("miss");
    setTimeout(() => L.el.remove(), 400);
    state.lives--;
    renderLives();
    updateHud();

    if (state.lives <= 0) endGame();
  }

  function endGame() {
    state.running = false;
    state.paused = false;
    if (rafId) cancelAnimationFrame(rafId);
    els.pausePanel.classList.add("hidden");
    els.game.classList.remove("paused");
    els.pauseBtn.disabled = true;
    els.pauseBtn.textContent = "Pause";

    const total = state.hits + state.misses + state.wrongKeys;
    const acc = total ? Math.round((state.hits / total) * 100) : 0;

    els.finalScore.textContent = state.score.toLocaleString();
    els.finalCombo.textContent = "×" + state.maxCombo;
    els.finalHits.textContent = state.hits;
    els.finalAccuracy.textContent = acc + "%";
    els.gameover.classList.remove("hidden");
    saveScoreToDatabase();
  }

  function updateHud() {
    els.score.textContent = state.score.toLocaleString();
    els.combo.textContent = "×" + state.combo;
    els.level.textContent = state.level;
    els.accuracy.textContent = getAccuracy() + "%";
    if (state.paused) updatePauseStats();
  }

  function renderLives() {
    els.lives.innerHTML = "";
    for (let i = 0; i < INITIAL_LIVES; i++) {
      const dot = document.createElement("span");
      dot.className = "life-dot" + (i >= state.lives ? " lost" : "");
      els.lives.appendChild(dot);
    }
  }

  function flashHud(el) {
    el.classList.remove("pulse");
    void el.offsetWidth;
    el.classList.add("pulse");
  }

  function showScorePopup(x, y, text) {
    const pop = document.createElement("span");
    pop.className = "score-popup";
    pop.textContent = text;
    const rect = els.playfield.getBoundingClientRect();
    pop.style.left = rect.left + x + "px";
    pop.style.top = rect.top + y + "px";
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 800);
  }

  function burstParticles(x, y) {
    const colors = ["#00f5d4", "#ffd60a", "#7b9fff", "#ffffff"];
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
      const speed = 80 + Math.random() * 120;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        color: colors[i % colors.length],
        size: 2 + Math.random() * 3,
      });
    }
  }

  function updateParticles(dt) {
    if (!particleCtx) return;
    particleCtx.clearRect(0, 0, els.particles.width, els.particles.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      particleCtx.globalAlpha = p.life * 2;
      particleCtx.fillStyle = p.color;
      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      particleCtx.fill();
    }
    particleCtx.globalAlpha = 1;
  }

  init();
})();
