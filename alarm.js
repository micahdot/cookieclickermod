/*
 * ======================================================================
 * GOLDEN COOKIE ALARM — paste-in-console version
 *
 * No extension, no install, no files to host. Paste the whole file into
 * the browser console (F12 -> Console) while the game is open.
 *
 * When a golden / wrath cookie or reindeer spawns, it loops the song
 *   https://xplodebrainz.com/cookie/rickroll.mp3
 * and stops (and rewinds) the moment the cookie is clicked or expires.
 *
 * Type  __andrew  (or __andrew()) after loading to use waterfall.mp3
 * for the rest of the session instead. Without it, rickroll.mp3 plays.
 *
 * Notes:
 *  - Browsers block audio until you interact with the page. You're
 *    playing a clicker, so click once after pasting and it's armed.
 *  - Chrome/Edge block pasting into the console until you type
 *    "allow pasting" and press Enter.
 *  - Refreshing the page turns it off. Paste again to re-arm.
 *  - Turn it off any time with:  __goldenAlarmStop()
 *
 * The web game has no background music, so a hidden tab would normally be
 * throttled to about one timer per minute after 5 minutes. To avoid that,
 * this plays an inaudible continuous tone: a tab that is producing audio is
 * exempt from hidden-tab throttling, which keeps both the alarm and the game
 * running at full speed in the background. Look for the speaker icon on the
 * game's tab - if it is there, the protection is active.
 * ======================================================================
 */
(() => {
  if (window.__goldenAlarmStop) {
    console.log("%c[Golden Alarm] already running", "color:#fa0");
    return;
  }

  const RICKROLL_URL   = "https://xplodebrainz.com/cookie/rickroll.mp3";
  const WATERFALL_URL  = "https://xplodebrainz.com/cookie/waterfall.mp3";
  const WATERFALL_BACKUP_URL =
    "https://cdn.jsdelivr.net/gh/micahdot/cookieclickermod@main/waterfall.mp3";
  let   SOUND_URL      = RICKROLL_URL;   // __andrew switches this to waterfall
  let   usingWaterfall = false;          // true after __andrew (until a refresh)
  const SOUND_VOLUME = 0.70;   // 0 .. 1
  const SOUND_LOOP   = true;   // loop until the cookie is gone

  // Inaudible keep-alive so Chrome does not throttle this hidden tab.
  const KEEP_ALIVE = true;
  const KEEP_ALIVE_VOLUME = 0.0005;   // far below hearing, but not silence

  let ctx = null;
  let keepAlive = null;
  let song = null;
  let wasPresent = false;

  // ---- silent keep-alive tone -----------------------------------------
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();   // may need a click first
    return ctx;
  }

  // Continuous 60 Hz tone at about -66 dB: inaudible, but never "silent".
  function startKeepAlive() {
    if (!KEEP_ALIVE || keepAlive) return;
    const c = audio();
    if (!c || c.state !== "running") return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = 60;
    gain.gain.value = KEEP_ALIVE_VOLUME;
    osc.connect(gain).connect(c.destination);
    osc.start();
    keepAlive = { osc, gain };
  }

  function stopKeepAlive() {
    if (!keepAlive) return;
    try { keepAlive.osc.stop(); } catch (e) {}
    keepAlive = null;
  }

  // ---- fallback chime (used only if the mp3 cannot play) ---------------
  function ping(when, freq, dur, vol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(vol, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  function chime() {
    const c = audio();
    if (!c || c.state !== "running") return;   // not unlocked yet
    const t = c.currentTime;
    ping(t,        880, 0.18, 0.30);           // A5
    ping(t + 0.22, 1175, 0.18, 0.30);          // D6
    ping(t + 0.44, 1568, 0.45, 0.30);          // G6
  }

  // ---- the song --------------------------------------------------------
  function getSong() {
    if (song) return song;
    song = new Audio(SOUND_URL);
    song.loop = SOUND_LOOP;
    song.volume = SOUND_VOLUME;
    song.preload = "auto";
    song.addEventListener("error", () => {
      // If waterfall.mp3 is missing or blocked, try the backup, then rickroll.
      if (usingWaterfall && SOUND_URL === WATERFALL_URL) {
        console.warn("[Golden Alarm] could not load waterfall.mp3 from xplodebrainz.com - trying the GitHub copy");
        switchSong(WATERFALL_BACKUP_URL);
        return;
      }
      if (usingWaterfall && SOUND_URL === WATERFALL_BACKUP_URL) {
        console.warn("[Golden Alarm] could not load waterfall.mp3 anywhere - using rickroll instead");
        usingWaterfall = false;
        switchSong(RICKROLL_URL);
        return;
      }
      song.__failed = true;
      console.warn("[Golden Alarm] could not load " + SOUND_URL + " - using the chime instead");
    });
    return song;
  }

  // Swap the audio source without losing the "a cookie is up" state.
  function switchSong(url) {
    if (song && SOUND_URL === url) return;   // already using it
    SOUND_URL = url;

    if (!song) {
      getSong();             // preload starts on the new source
    } else {
      song.pause();
      try { song.currentTime = 0; } catch (e) {}
      song.__failed = false;
      song.src = url;
      song.load();
    }

    // If a cookie is on screen right now, start the new song immediately.
    if (wasPresent) playSong();
  }

  // __andrew: use waterfall.mp3 from now on (idempotent).
  function useWaterfall() {
    if (usingWaterfall) {
      console.log("%c[Golden Alarm] already playing waterfall.mp3", "color:#fa0");
      return;
    }
    usingWaterfall = true;
    switchSong(WATERFALL_URL);
    console.log("%c[Golden Alarm] song switched to waterfall.mp3", "color:#0ff;font-weight:bold");
  }

  function playSong() {
    const a = getSong();
    if (a.__failed) { chime(); return; }
    if (!a.paused) return;              // already playing: do not restart
    const p = a.play();
    if (p && typeof p.catch === "function") {
      p.catch((err) => {
        // Usually means the page has not been clicked yet.
        console.warn("[Golden Alarm] browser blocked the song (" + (err && err.name) + ") - click the page once; using the chime for now");
        chime();
      });
    }
  }

  function stopSong() {
    if (!song) return;
    if (!song.paused) song.pause();
    try { song.currentTime = 0; } catch (e) {}
  }

  // ---- first interaction: unlock audio, keep-alive, notifications ------
  function arm() {
    audio();
    startKeepAlive();

    try {
      if (window.Notification && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch (e) { /* notifications are a bonus, not required */ }
  }
  addEventListener("pointerdown", arm, { once: true, capture: true });
  addEventListener("keydown",     arm, { once: true, capture: true });

  function notify(kind) {
    try {
      if (window.Notification && Notification.permission === "granted") {
        new Notification(
          kind === "reindeer" ? "\uD83E\uDD99 Reindeer!" : "\uD83C\uDF6A Golden cookie!",
          { body: "Click it \u2014 golden cookies only last 13 seconds.", tag: "golden-cookie" }
        );
      }
    } catch (e) { /* ignore */ }
  }

  // ---- detection -------------------------------------------------------
  // Some sites (coolmathgames.com, for one) run the game inside a same-origin
  // iframe. If Game is not on this page, look through the frames for it.
  let gameWin = null;
  let warnedNoGame = false;
  let ticksWithoutGame = 0;

  function armIn(w) {
    if (!w || w === window || w.__gcaArmed) return;
    w.__gcaArmed = true;
    try {
      w.document.addEventListener("pointerdown", arm, { once: true, capture: true });
      w.document.addEventListener("keydown", arm, { once: true, capture: true });
    } catch (e) { /* frame went away */ }
  }

  function findGameWin() {
    if (gameWin && gameWin.Game && Array.isArray(gameWin.Game.shimmers)) return gameWin;
    gameWin = null;

    if (typeof Game !== "undefined" && Array.isArray(Game.shimmers)) {
      gameWin = window;
      return gameWin;
    }

    const frames = document.querySelectorAll("iframe");
    for (const frame of frames) {
      try {
        const w = frame.contentWindow;
        if (w && w.Game && Array.isArray(w.Game.shimmers)) {
          gameWin = w;
          armIn(w);
          return gameWin;
        }
      } catch (e) {
        // Cross-origin frame: out of reach from here.
      }
    }
    return null;
  }

  function findCookie() {
    const w = gameWin;
    if (w && w.Game && Array.isArray(w.Game.shimmers)) {
      // Preferred: the game's own list of active shimmers.
      for (const s of w.Game.shimmers) {
        if (s.type === "golden" || s.type === "reindeer") return s;
      }
      return null;
    }
    // Fallback: the DOM (works even if the game hasn't exposed shimmers yet).
    try {
      return w && w.document ? w.document.querySelector("#shimmers .shimmer") : null;
    } catch (e) {
      return null;
    }
  }

  function tick() {
    startKeepAlive();   // no-op if already running / not armed yet
    const found = findGameWin() !== null;

    if (!found) {
      if (++ticksWithoutGame > 40 && !warnedNoGame) {
        warnedNoGame = true;
        const frames = document.querySelectorAll("iframe").length;
        console.warn(
          "[Golden Alarm] cannot see the game on this page" +
          (frames ? " (it is inside " + frames + " iframe(s) I cannot reach)" : "") +
          ". On coolmathgames.com, open https://www.coolmathgames.com/0-cookie-clicker/play" +
          " in its own tab and paste there, or pick the game frame in the DevTools console context menu."
        );
      }
      return;
    }
    ticksWithoutGame = 0;

    const cookie = findCookie();

    if (!cookie) {
      // Cookie clicked or expired: cut the song and rewind it.
      if (wasPresent) {
        wasPresent = false;
        stopSong();
      }
      return;
    }

    if (!wasPresent) {
      wasPresent = true;
      notify(cookie.type === "reindeer" ? "reindeer" : "golden");
      playSong();
    }
  }

  // Start fetching the song now so the first cookie is not delayed.
  getSong();

  const timer = setInterval(tick, 250);

  // ---- cleanup ---------------------------------------------------------
  window.__goldenAlarmStop = function () {
    clearInterval(timer);
    removeEventListener("pointerdown", arm, true);
    removeEventListener("keydown", arm, true);
    stopSong();
    stopKeepAlive();
    if (ctx) { try { ctx.close(); } catch (e) {} }
    delete window.__goldenAlarmStop;
    delete window.__goldenAlarmTest;
    delete window.__andrew;
    console.log("%c[Golden Alarm] off", "color:#f55");
  };

  // Paste __goldenAlarmTest() to hear the song without waiting for a cookie.
  window.__goldenAlarmTest = playSong;

  // Type __andrew (no parentheses needed) to use waterfall.mp3 instead.
  // The getter fires on evaluation, and also returns the function so
  // __andrew() works too. It is configurable so cleanup can delete it.
  Object.defineProperty(window, "__andrew", {
    configurable: true,
    get() {
      useWaterfall();
      return useWaterfall;
    },
  });

  console.log(
    "%c[Golden Alarm] on %c " +
      "Loops the song while a cookie is up, stops when it is gone. " +
      "Click the page once so the browser allows sound. " +
      "Stop with __goldenAlarmStop()",
    "color:#0f0;font-weight:bold",
    "color:#aaa"
  );
})();
