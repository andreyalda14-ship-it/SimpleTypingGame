/**
 * Procedural audio for Sky Type (Web Audio API — no external files).
 */
window.SkyTypeAudio = (function () {
  "use strict";

  const MUSIC_NOTES = [196, 233.08, 293.66, 349.23, 440, 349.23, 293.66, 233.08];
  const MUSIC_INTERVAL_MS = 420;

  let ctx = null;
  let master = null;
  let musicBus = null;
  let sfxBus = null;
  let droneOsc = null;
  let droneGain = null;
  let musicTimer = null;
  let musicStep = 0;
  let musicActive = false;
  let muted = false;

  function ensureContext() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    master.gain.value = 0.85;
    musicBus.gain.value = 0.14;
    sfxBus.gain.value = 0.38;
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(ctx.destination);
    return ctx;
  }

  function applyMute() {
    if (!master) return;
    const v = muted ? 0 : 0.85;
    master.gain.setTargetAtTime(v, ctx.currentTime, 0.04);
  }

  function unlock() {
    const c = ensureContext();
    if (c && c.state === "suspended") return c.resume();
    return Promise.resolve();
  }

  function resumeIfSuspended() {
    if (!ctx || ctx.state !== "suspended") return Promise.resolve();
    return ctx.resume().then(() => {
      if (musicActive && !musicTimer && !muted) {
        tickMusic();
        musicTimer = setInterval(tickMusic, MUSIC_INTERVAL_MS);
      }
    });
  }

  let autoplayHooked = false;

  function hookAutoplayFallback() {
    if (autoplayHooked) return;
    autoplayHooked = true;
    const onInteract = () => resumeIfSuspended();
    document.addEventListener("pointerdown", onInteract, { once: true });
    document.addEventListener("keydown", onInteract, { once: true });
  }

  function startMusicOnLoad() {
    ensureContext();
    startMusic();
    resumeIfSuspended().catch(() => {});
    if (ctx && ctx.state === "suspended") hookAutoplayFallback();
  }

  function playTone(freq, duration, type, bus, volume, delaySec) {
    if (!ensureContext() || muted) return;
    const t = ctx.currentTime + (delaySec || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(volume, 0.001), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g);
    g.connect(bus || sfxBus);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  function playNoise(duration, volume, filterFreq) {
    if (!ensureContext() || muted) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq || 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(sfxBus);
    src.start(t);
    src.stop(t + duration);
  }

  function startDrone() {
    if (!ensureContext() || droneOsc) return;
    droneOsc = ctx.createOscillator();
    droneGain = ctx.createGain();
    droneOsc.type = "sine";
    droneOsc.frequency.value = 98;
    droneGain.gain.value = 0.06;
    droneOsc.connect(droneGain);
    droneGain.connect(musicBus);
    droneOsc.start();
  }

  function stopDrone() {
    if (!droneOsc) return;
    try {
      droneOsc.stop();
    } catch {
      /* already stopped */
    }
    droneOsc.disconnect();
    droneGain.disconnect();
    droneOsc = null;
    droneGain = null;
  }

  function tickMusic() {
    if (!musicActive || !ctx || muted) return;
    const freq = MUSIC_NOTES[musicStep % MUSIC_NOTES.length];
    playTone(freq, 0.22, "triangle", musicBus, 0.09);
    if (musicStep % 4 === 0) {
      playTone(freq * 0.5, 0.35, "sine", musicBus, 0.05);
    }
    musicStep++;
  }

  function startMusic() {
    unlock();
    if (!ctx) return;
    musicActive = true;
    if (!muted) {
      musicBus.gain.setTargetAtTime(0.14, ctx.currentTime, 0.05);
      if (droneGain) {
        droneGain.gain.setTargetAtTime(0.06, ctx.currentTime, 0.05);
      }
    }
    startDrone();
    if (musicTimer) return;
    tickMusic();
    musicTimer = setInterval(tickMusic, MUSIC_INTERVAL_MS);
  }

  function isMusicPlaying() {
    return musicActive && !!musicTimer;
  }

  function stopMusic() {
    musicActive = false;
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
    stopDrone();
    musicStep = 0;
  }

  function setMusicPaused(paused) {
    if (!musicBus || !ctx) return;
    const target = paused || muted ? 0 : 0.14;
    musicBus.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
    if (droneGain) {
      const d = paused || muted ? 0 : 0.06;
      droneGain.gain.setTargetAtTime(d, ctx.currentTime, 0.08);
    }
    if (paused) {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    } else if (musicActive && !musicTimer && !muted) {
      musicTimer = setInterval(tickMusic, MUSIC_INTERVAL_MS);
    }
  }

  const sfx = {
    gameStart() {
      unlock();
      playTone(330, 0.12, "square", sfxBus, 0.2);
      playTone(440, 0.12, "square", sfxBus, 0.18, 0, 0.1);
      playTone(554.37, 0.25, "square", sfxBus, 0.22, 0, 0.2);
    },
    gameOver() {
      playTone(392, 0.2, "sawtooth", sfxBus, 0.2);
      playTone(311.13, 0.25, "sawtooth", sfxBus, 0.18, 0, 0.15);
      playTone(196, 0.45, "sawtooth", sfxBus, 0.2, 0, 0.35);
    },
    hit(opts) {
      const c = Math.min((opts && opts.combo) || 1, 20);
      playTone(520 + c * 18, 0.08, "square", sfxBus, 0.15 + c * 0.008);
      playTone(780 + c * 12, 0.06, "sine", sfxBus, 0.08, 0, 0.02);
    },
    wrong() {
      playTone(140, 0.15, "sawtooth", sfxBus, 0.2);
      playTone(110, 0.2, "square", sfxBus, 0.15, 0, 0.05);
    },
    miss() {
      playNoise(0.35, 0.35, 600);
      playTone(80, 0.4, "sawtooth", sfxBus, 0.25);
      playTone(55, 0.3, "square", sfxBus, 0.18, 0, 0.08);
    },
    levelUp() {
      playTone(523.25, 0.1, "square", sfxBus, 0.18);
      playTone(659.25, 0.1, "square", sfxBus, 0.18, 0, 0.1);
      playTone(783.99, 0.2, "square", sfxBus, 0.2, 0, 0.2);
    },
    pause() {
      playTone(400, 0.06, "sine", sfxBus, 0.12);
      playTone(300, 0.1, "sine", sfxBus, 0.1, 0, 0.04);
    },
    resume() {
      playTone(300, 0.06, "sine", sfxBus, 0.1);
      playTone(450, 0.1, "sine", sfxBus, 0.14, 0, 0.04);
    },
    menu() {
      playTone(280, 0.08, "triangle", sfxBus, 0.1);
      playTone(220, 0.12, "triangle", sfxBus, 0.08, 0, 0.05);
    },
    ui() {
      playTone(660, 0.04, "sine", sfxBus, 0.08);
    },
    error() {
      playTone(200, 0.12, "square", sfxBus, 0.15);
      playTone(160, 0.15, "square", sfxBus, 0.12, 0, 0.06);
    },
    ranked() {
      playTone(440, 0.1, "sine", sfxBus, 0.14);
      playTone(554.37, 0.15, "sine", sfxBus, 0.16, 0, 0.08);
    },
    unranked() {
      playTone(330, 0.15, "triangle", sfxBus, 0.1);
    },
  };

  function play(name, opts) {
    unlock();
    const fn = sfx[name];
    if (fn) fn(opts || {});
  }

  function toggleMute() {
    muted = !muted;
    applyMute();
    if (musicBus && ctx) {
      const m = muted ? 0 : 0.14;
      musicBus.gain.setTargetAtTime(m, ctx.currentTime, 0.05);
      if (droneGain) {
        droneGain.gain.setTargetAtTime(muted ? 0 : 0.06, ctx.currentTime, 0.05);
      }
    }
    return muted;
  }

  function isMuted() {
    return muted;
  }

  return {
    unlock,
    startMusic,
    startMusicOnLoad,
    stopMusic,
    setMusicPaused,
    isMusicPlaying,
    play,
    toggleMute,
    isMuted,
  };
})();
