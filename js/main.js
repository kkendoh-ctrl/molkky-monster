// main.js : メインループ（固定ステップ60fps）・場面の切り替え・画面の拡大・はじめから/つづきから
(function () {
  'use strict';
  var MM = window.MM, G = MM.gfx;
  var stack = [];

  // ---------- 場面（シーン）スタック ----------
  MM.push = function (s) { stack.push(s); if (s.enter) s.enter(); };
  MM.remove = function (s) { var i = stack.lastIndexOf(s); if (i >= 0) stack.splice(i, 1); };
  MM.replaceAll = function (s) { stack.length = 0; stack.push(s); if (s.enter) s.enter(); };
  MM.top = function () { return stack[stack.length - 1]; };

  // ---------- ゲーム開始・再開 ----------
  MM.startNewGame = function () {
    MM.state = MM.newState();
    MM.Field.load('house2f', 2, 2, 'down');
    MM.replaceAll(MM.Field);
    MM.Field.runScript('wakeUp');
  };
  MM.continueGame = function () {
    var s = MM.save.read();
    if (!s) return false;
    MM.state = s;
    MM.Field.load(s.map, s.x, s.y, s.dir);
    MM.replaceAll(MM.Field);
    return true;
  };

  // ---------- 1ステップ更新・描画 ----------
  function step() {
    var t;
    MM.input.update();
    MM.fx.update();
    if (MM.bgm) MM.bgm.sync(stack);      // 場面に合わせて曲を切り替える（同じ曲なら何もしない軽い処理）
    if (MM.fx.active()) return;
    t = MM.top();
    if (t) t.update();
    if (MM.state && t && t.name !== 'title' && t.name !== 'opening') MM.state.play++;
  }
  function draw() {
    var i = stack.length - 1;
    while (i > 0 && !stack[i].opaque) i--;
    for (; i < stack.length; i++) stack[i].draw();
    MM.fx.draw();
  }

  var last = 0, acc = 0, STEP = 1000 / 60, errCount = 0;
  function frame(ts) {
    var steps = 0, k, dt;
    window.requestAnimationFrame(frame);
    if (!last) last = ts;
    dt = ts - last; last = ts;
    if (dt > 100) dt = 100;
    acc += dt;
    try {
      while (acc >= STEP && steps < 5) {
        for (k = 0; k < MM.debug.timeScale; k++) step();
        acc -= STEP; steps++;
      }
      if (steps >= 5) acc = 0;
      if (steps > 0) draw();
    } catch (e) {
      if (errCount++ < 5 && window.console) console.error('ループでエラー', e);
    }
  }

  // ---------- 画面の拡大（収まる最大の整数倍。ぼやけないようにデバイスpx基準） ----------
  function resize() {
    var cv = document.getElementById('game'), box = document.getElementById('screen');
    var aw = box.clientWidth, ah = box.clientHeight, dpr = window.devicePixelRatio || 1, s;
    // 整数倍で収まるなら整数倍。ただし整数倍だと8%以上余るときは、画面いっぱいに（非整数倍で）拡大する
    var fit = Math.min(aw * dpr / MM.W, ah * dpr / MM.H);
    s = Math.floor(fit);
    if (s < 1 || s / fit < 0.92) s = fit;
    if (s < 0.2) s = 0.2;
    cv.style.width = (MM.W * s / dpr) + 'px';
    cv.style.height = (MM.H * s / dpr) + 'px';
  }

  // ---------- デバッグ用フック（自動テスト用） ----------
  MM.debug.scene = function () { var t = MM.top(); return t ? t.name : null; };
  MM.debug.sceneCount = function () { return stack.length; };
  MM.debug.getState = function () { return MM.state; };
  MM.debug.flags = function () { return MM.state ? MM.state.flags : null; };
  MM.debug.warp = function (map, x, y, dir) { MM.Field.load(map, x, y, dir || 'down'); };
  MM.debug.setLevel = function (idx, lv) {
    var m = MM.state.party[idx];
    m.lv = lv; m.exp = MM.expFor(lv); MM.calcStats(m); m.hp = m.maxHp;
    m.moves = MM.initialMoves(m.sid, lv);
  };

  function boot() {
    G.init(document.getElementById('game'));
    MM.input.bindTouch();
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    MM.replaceAll(new MM.scenes.Title());
    window.requestAnimationFrame(frame);
  }
  MM.debug.ready = false;
  boot();
  MM.debug.ready = true;
})();
