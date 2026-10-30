// bgm.js : BGM（Web Audio API でその場で音を作るチップチューン。音のファイルは使わない）
// ・音色＝矩形波2本（メロディ・ハモリ）＋三角波（ベース）＋ノイズ（リズム）
// ・AudioContext.currentTime に対して約0.1秒先まで音を予約する（setInterval で25msごとに補充）
// ・AudioContext が無い／失敗しても例外は出さず、ゲームは無音で動く
// ・MM.bgm.current … いま選ばれている曲ID（音が出ない状態でも更新される。テスト用にも使う）
(function () {
  'use strict';
  var MM = window.MM;

  var LOOKAHEAD = 0.12;     // 先読みする秒数
  var TICK_MS = 25;         // 予約を補充する間隔
  var FADE = 0.12;          // 曲の切り替えのフェード秒数
  var MASTER = 0.9;         // 全体の基準音量。MM.bgm.setVolume で 0〜1 の係数をかける（各パートの合計が最大 0.4 なので 0.9 でも音割れしない）
  var VOL = [0.10, 0.07, 0.18, 0.05];   // パートごとの音量：0=メロディ 1=ハモリ 2=ベース 3=ノイズ
  var KEY = 'molkkymon_green_bgm_v1';   // おと設定の保存キー（'0'=オフ）
  var NOISE = {             // ノイズ打楽器：再生速度（低いほど低い音）・長さ・強さ
    k: { rate: 0.3, dur: 0.10, vol: 1.0 },
    s: { rate: 0.9, dur: 0.09, vol: 0.8 },
    h: { rate: 2.5, dur: 0.035, vol: 0.5 }
  };
  var NOTE_OFS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var TOKEN = /^(?:([A-G])([#b]?)(\d)|r):(\d+)$/;

  var ctx = null, master = null, noiseBuf = null, pulseWave = null;
  var failed = false;       // AudioContext が使えないと分かったら true（以後は何もしない）
  var enabled = true;       // おと：オン/オフ
  var volume = 1;
  var hidden = !!document.hidden;   // タブが隠れている間 true
  var timer = 0;
  var run = null;           // いま鳴らしている曲の状態
  var wantedId = null;      // 場面から頼まれた曲
  var curId = null;         // 実際に選んだ曲（ファンファーレ中は wantedId と違うことがある）
  var holdUntil = 0;        // ループしない曲を最後まで聞かせる期限（performance.now の値）
  var audioEl = null;       // 消音スイッチ対策の無音 <audio> 要素（iPhone 用）
  var silentSrc = null;     // その無音 WAV の data URI（コードで作る。ファイルは使わない）

  function nowMs() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function noop() { }

  // ---- 曲データを「ステップ位置つきの音の列」に変換（初回だけ。結果は曲オブジェクトにキャッシュ） ----
  function freqOf(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function parseNotes(str, total, label) {
    var toks = str.split(/\s+/), out = [], step = 0, i, m, d, midi;
    for (i = 0; i < toks.length; i++) {
      if (toks[i] === '' || toks[i] === '|') continue;
      m = TOKEN.exec(toks[i]);
      if (!m) { warn('音の書き方が不正: ' + label + ' ' + toks[i]); continue; }
      d = parseInt(m[4], 10);
      if (m[1]) {
        midi = (parseInt(m[3], 10) + 1) * 12 + NOTE_OFS[m[1]] + (m[2] === '#' ? 1 : (m[2] === 'b' ? -1 : 0));
        out.push({ s: step, d: d, f: freqOf(midi), k: null });
      }
      step += d;
    }
    if (step !== total) warn('長さが合わない: ' + label + ' ' + step + '/' + total);
    return out;
  }
  function parseDrum(str, total, label) {
    var s = str.replace(/[\s|]/g, ''), out = [], i, c;
    for (i = 0; i < s.length; i++) {
      c = s.charAt(i);
      if (NOISE[c]) out.push({ s: i, d: 1, f: 0, k: NOISE[c] });
    }
    if (s.length !== total) warn('長さが合わない: ' + label + ' drum ' + s.length + '/' + total);
    return out;
  }
  function warn(msg) { if (window.console && console.warn) console.warn('[bgm] ' + msg); }

  function build(id) {
    var song = MM.songs && MM.songs[id], total, p;
    if (!song) return null;
    if (song._p) return song._p;
    total = song.bars * 16;
    p = {
      id: id, loop: song.loop !== false, total: total,
      stepDur: 60 / song.bpm / 4,
      ch: [
        parseNotes(song.lead || '', total, id + ' lead'),
        parseNotes(song.harm || '', total, id + ' harm'),
        parseNotes(song.bass || '', total, id + ' bass'),
        parseDrum(song.drum || '', total, id)
      ]
    };
    song._p = p;
    return p;
  }

  // ---- AudioContext の準備 ----
  function createCtx() {
    var AC, n, i, buf, re, im, d;
    if (ctx) return true;
    if (failed) return false;
    try {
      AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { failed = true; return false; }
      ctx = new AC();
      ctx.onstatechange = onStateChange;
      master = ctx.createGain();
      master.gain.value = MASTER * volume;
      master.connect(ctx.destination);
      // ノイズ（1秒ぶん。使い回す）
      n = Math.max(1, Math.floor(ctx.sampleRate));
      buf = ctx.createBuffer(1, n, ctx.sampleRate);
      d = buf.getChannelData(0);
      for (i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      noiseBuf = buf;
      // ハモリ用の細い矩形波（デューティ比25%）
      re = new Float32Array(33); im = new Float32Array(33);
      for (i = 1; i < 33; i++) re[i] = 2 / (i * Math.PI) * Math.sin(i * Math.PI * 0.25);
      pulseWave = ctx.createPeriodicWave(re, im);
      // iPhone：消音スイッチに影響されにくくする（無い環境では何もしない）
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e0) { /* 無視 */ }
      return true;
    } catch (e) {
      failed = true; ctx = null; master = null;
      return false;
    }
  }

  // ---- 1音ぶんの発音 ----
  function voiceNote(c, e, t, P, out) {
    var osc = ctx.createOscillator(), g = ctx.createGain(), dur = e.d * P.stepDur;
    var end = t + dur * (c === 2 ? 0.95 : 0.88), v = VOL[c], hold = Math.max(t + 0.008, end - 0.02);
    if (c === 0) osc.type = 'square';
    else if (c === 1) osc.setPeriodicWave(pulseWave);
    else osc.type = 'triangle';
    osc.frequency.value = e.f;
    // 立ち上がり・立ち下がりをなだらかにして、プツッというノイズを防ぐ
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.006);
    g.gain.setValueAtTime(v, hold);
    g.gain.linearRampToValueAtTime(0, end);
    osc.connect(g); g.connect(out);
    osc.start(t); osc.stop(end + 0.01);
  }
  function voiceNoise(e, t, out) {
    var src = ctx.createBufferSource(), g = ctx.createGain(), k = e.k, v = VOL[3] * k.vol;
    src.buffer = noiseBuf;
    src.playbackRate.value = k.rate;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.002);
    g.gain.linearRampToValueAtTime(0, t + k.dur);
    src.connect(g); g.connect(out);
    src.start(t, Math.random() * 0.8); src.stop(t + k.dur + 0.01);
  }

  // ---- 先読みスケジューラ ----
  function tick() {
    var now, hz, c, evs, e, t, guard, P, r = run;
    if (!r || !ctx) return;
    try {
      now = ctx.currentTime; hz = now + LOOKAHEAD; P = r.P;
      if (lagOf(r, now) > 0.25) realign(r, now);   // タイマーが止められていた等で遅れたら、溜まった音を捨てて今に合わせる
      for (c = 0; c < 4; c++) {
        evs = P.ch[c];
        if (r.done[c] || evs.length === 0) { r.done[c] = true; continue; }
        guard = 0;
        while (!r.done[c] && guard++ < 512) {
          e = evs[r.idx[c]];
          t = r.base[c] + e.s * P.stepDur;
          if (t >= hz) break;
          if (t > now - 0.05) {        // 大きく遅れた音は鳴らさず飛ばす（まとめて鳴るのを防ぐ）
            if (c === 3) voiceNoise(e, t, r.gain); else voiceNote(c, e, t, P, r.gain);
          }
          r.idx[c]++;
          if (r.idx[c] >= evs.length) {
            if (P.loop) { r.idx[c] = 0; r.base[c] += P.total * P.stepDur; } else r.done[c] = true;
          }
        }
      }
    } catch (err) {
      giveUp();
    }
  }
  function startTimer() { if (!timer) timer = window.setInterval(tick, TICK_MS); }
  function stopTimer() { if (timer) { window.clearInterval(timer); timer = 0; } }

  // 想定外のエラーが出たら、音だけをあきらめる（ゲームは続ける）
  function giveUp() {
    failed = true;
    stopTimer();
    run = null;
    try { if (ctx && ctx.close) ctx.close(); } catch (e) { /* 無視 */ }
    ctx = null; master = null;
  }

  // ---- 曲の開始・フェードアウト ----
  function fadeOut(r) {
    var now;
    try {
      now = ctx.currentTime;
      r.gain.gain.cancelScheduledValues(now);
      r.gain.gain.setValueAtTime(r.gain.gain.value, now);
      r.gain.gain.linearRampToValueAtTime(0, now + FADE * 0.8);
      window.setTimeout(function () { try { r.gain.disconnect(); } catch (e) { /* 無視 */ } }, 600);
    } catch (e2) { /* 無視 */ }
  }
  function startRun(id) {
    var P, t0, g, old = run;
    if (!ctx || !enabled) return;
    P = build(id);
    if (!P) return;
    try {
      t0 = ctx.currentTime + 0.03;
      if (old) { fadeOut(old); t0 = ctx.currentTime + FADE; }
      g = ctx.createGain();
      g.gain.value = 1;
      g.connect(master);
      run = {
        id: id, P: P, gain: g,
        idx: [0, 0, 0, 0], base: [t0, t0, t0, t0], done: [false, false, false, false]
      };
      if (!hidden) startTimer();
      tick();
    } catch (e) {
      giveUp();
    }
  }
  function stopRun() {
    if (run && ctx) fadeOut(run);
    run = null;
    stopTimer();
  }
  // 選ばれた曲と鳴っている曲がずれていれば鳴らし直す
  function ensureRun() {
    if (!ctx || !enabled || hidden || !curId) return;
    if (run && run.id === curId) { startTimer(); return; }
    startRun(curId);
  }

  // ---- 曲の切り替え ----
  function apply() {
    var song, len;
    if (wantedId === curId) return;                     // いつもの高速パス（同じ曲なら何もしない＝鳴らし直さない）
    // ループなしの曲（ファンファーレ）は、割り込み可の曲（バトル・タイトル）以外には切られない
    if (curId && holdUntil > 0 && nowMs() < holdUntil) {
      song = MM.songs[wantedId];
      if (!song || !song.cutIn) return;
    }
    curId = wantedId;
    MM.bgm.current = curId;
    song = MM.songs[curId];
    holdUntil = 0;
    if (song && song.loop === false) {
      len = song.bars * 16 * 60 / song.bpm / 4;
      holdUntil = nowMs() + (len + 0.3) * 1000;
    }
    ensureRun();
  }

  // ---- 先読み位置の合わせ直し ----
  // 次に鳴らす音の予定時刻が、今より何秒遅れているか（各パートのうち最大）
  function lagOf(r, now) {
    var c, evs, e, lag = 0, t;
    for (c = 0; c < 4; c++) {
      evs = r.P.ch[c];
      if (r.done[c] || evs.length === 0) continue;
      e = evs[r.idx[c]];
      t = r.base[c] + e.s * r.P.stepDur;
      if (now - t > lag) lag = now - t;
    }
    return lag;
  }
  // 全パートを同じ量だけ後ろへずらして、今の時刻に合わせる（パート同士のずれは出さない）
  function realign(r, now) {
    var c, evs, e, minT = Infinity, t, shift;
    for (c = 0; c < 4; c++) {
      evs = r.P.ch[c];
      if (r.done[c] || evs.length === 0) continue;
      e = evs[r.idx[c]];
      t = r.base[c] + e.s * r.P.stepDur;
      if (t < minT) minT = t;
    }
    if (minT === Infinity) return;
    shift = now + 0.03 - minT;
    if (shift <= 0) return;
    for (c = 0; c < 4; c++) r.base[c] += shift;
  }
  // AudioContext の状態が変わった（interrupted → running など）
  function onStateChange() {
    if (!ctx) return;
    if (ctx.state === 'running') {
      if (run) realign(run, ctx.currentTime);
      ensureRun();
    }
  }

  // ---- 消音スイッチ対策：音を「再生中のメディア」にするための無音 <audio>（iPhone の WKWebView など） ----
  // 8000Hz・8bit・モノラルの無音 WAV をコードで作り、data URI にして使う（ファイルは追加しない）
  function makeSilentWav() {
    var n = 800, bytes = new Uint8Array(44 + n), i, s = '';
    function u32(o, v) { bytes[o] = v & 255; bytes[o + 1] = (v >> 8) & 255; bytes[o + 2] = (v >> 16) & 255; bytes[o + 3] = (v >> 24) & 255; }
    function u16(o, v) { bytes[o] = v & 255; bytes[o + 1] = (v >> 8) & 255; }
    function tag(o, t) { var k; for (k = 0; k < 4; k++) bytes[o + k] = t.charCodeAt(k); }
    tag(0, 'RIFF'); u32(4, 36 + n); tag(8, 'WAVE'); tag(12, 'fmt ');
    u32(16, 16); u16(20, 1); u16(22, 1); u32(24, 8000); u32(28, 8000); u16(32, 1); u16(34, 8);
    tag(36, 'data'); u32(40, n);
    for (i = 0; i < n; i++) bytes[44 + i] = 128;     // 8bit の無音は 128
    for (i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return 'data:audio/wav;base64,' + window.btoa(s);
  }
  // ユーザー操作の中で呼ぶ。作る→ループ再生。play() の失敗は無視
  function kickAudioEl() {
    var p;
    try {
      if (!audioEl) {
        if (!silentSrc) silentSrc = makeSilentWav();
        audioEl = document.createElement('audio');
        audioEl.setAttribute('playsinline', '');
        audioEl.setAttribute('webkit-playsinline', '');
        audioEl.loop = true;
        audioEl.preload = 'auto';
        audioEl.style.display = 'none';
        audioEl.src = silentSrc;
        if (document.body) document.body.appendChild(audioEl);
      }
      if (audioEl.paused) { p = audioEl.play(); if (p && p.catch) p.catch(noop); }
    } catch (e) { /* 無視：<audio> が使えなくても Web Audio だけで続ける */ }
  }
  function pauseAudioEl() {
    try { if (audioEl && !audioEl.paused) audioEl.pause(); } catch (e) { /* 無視 */ }
  }

  // ---- 自動再生の制限への対応 ----
  // iPhone では touchend・click・keydown の中（同期的）でないと AudioContext が鳴らせない。
  // ここでは await や setTimeout をはさまずに、作成・resume・無音再生・無音<audio>を一気に行う
  function tryResume() {
    var p;
    try {
      if (ctx && ctx.state !== 'running') { p = ctx.resume(); if (p && p.catch) p.catch(noop); }
    } catch (e) { /* 無視 */ }
  }
  function unlock() {
    var b, src;
    if (failed) return;
    if (!ctx && !createCtx()) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e0) { /* 無視 */ }
    tryResume();
    // 古い iOS の解除：長さ1サンプルの無音を鳴らす
    try {
      if (!unlock.done) {
        b = ctx.createBuffer(1, 1, 22050);
        src = ctx.createBufferSource();
        src.buffer = b;
        src.connect(ctx.destination);
        src.start(0);
        unlock.done = true;
      }
    } catch (e1) { /* 無視 */ }
    if (enabled) kickAudioEl();
    ensureRun();
  }
  // pointerdown / touchstart / mousedown はユーザー操作と見なされないことがあるので、作らず resume を試すだけ
  function softUnlock() { tryResume(); }
  function onVisible() {
    var p;
    if (document.hidden) {
      hidden = true;
      stopTimer();
      pauseAudioEl();
      try { if (ctx && ctx.state === 'running') { p = ctx.suspend(); if (p && p.catch) p.catch(noop); } } catch (e) { /* 無視 */ }
    } else {
      hidden = false;
      tryResume();
      if (enabled && ctx) kickAudioEl();
      ensureRun();
    }
  }

  // ---- おと設定の保存・読み込み（localStorage が使えなくても動く） ----
  function loadSetting() {
    try { if (window.localStorage.getItem(KEY) === '0') enabled = false; } catch (e) { /* 無視 */ }
  }
  function saveSetting() {
    try { window.localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (e) { /* 無視 */ }
  }

  // ---- 公開 ----
  MM.bgm = {
    current: null,            // いま選ばれている曲ID
    enabled: true,
    // 曲を頼む（同じ曲なら何もしない）
    request: function (id) { wantedId = id; apply(); },
    // 場面スタックを見て曲を決める（main.js から毎ステップ呼ばれる。軽い処理だけ）
    sync: function (stack) {
      var i, s, id = null;
      for (i = stack.length - 1; i >= 0 && !id; i--) {
        s = stack[i];
        if (s.name === 'battle') id = (s.result === 'win' || s.result === 'caught') ? 'victory' : 'battle';
        else if (s.name === 'title' || s.name === 'opening') id = 'title';
        else if (s.name === 'field') id = (MM.songOfMap && MM.songOfMap[MM.Field.mapId]) || 'town';
      }
      if (id) { wantedId = id; apply(); }
    },
    setEnabled: function (on) {
      on = !!on;
      if (on === enabled) return;
      enabled = on; MM.bgm.enabled = on;
      saveSetting();
      if (!on) { stopRun(); pauseAudioEl(); } else { if (ctx) kickAudioEl(); ensureRun(); }   // オンに戻したら選ばれている曲を頭から
    },
    toggle: function () { MM.bgm.setEnabled(!enabled); return enabled; },
    // 全体の音量の係数（0〜1）
    setVolume: function (v) {
      volume = MM.clamp(+v || 0, 0, 1);
      try { if (master) master.gain.value = MASTER * volume; } catch (e) { /* 無視 */ }
    },
    // 「タップで音が出る」状態か（オンなのに AudioContext がまだ動いていない）。画面のヒント表示に使う
    needsTap: function () {
      return enabled && !failed && (!ctx || ctx.state !== 'running');
    },
    // テスト・デバッグ用の状態
    state: function () {
      return {
        current: curId, wanted: wantedId, enabled: enabled, failed: failed,
        ctx: ctx ? ctx.state : 'none', playing: !!run, runId: run ? run.id : null,
        audioEl: !!audioEl, audioPlaying: !!(audioEl && !audioEl.paused), master: master ? master.gain.value : null
      };
    }
  };

  loadSetting();
  MM.bgm.enabled = enabled;
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e0) { /* 無視 */ }

  // 最初のタッチ／キー入力で音を使えるようにする。
  // 作成・resume は「指を離したとき(touchend)・click・keydown」だけ。押した瞬間のイベントでは resume を試すだけ。
  ['touchend', 'click', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, unlock, true);
  });
  ['pointerdown', 'pointerup', 'touchstart', 'mousedown'].forEach(function (ev) {
    document.addEventListener(ev, softUnlock, true);
  });
  document.addEventListener('visibilitychange', onVisible);
})();
