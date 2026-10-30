// input.js : キーボード＋タッチ（十字キー・A・B・START）
// held    = いま押されているか
// pressed = このフレームで押された瞬間（長押し時は一定間隔で繰り返す）
(function () {
  'use strict';
  var MM = window.MM;

  var ACTIONS = ['up', 'down', 'left', 'right', 'a', 'b', 'start'];
  var KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'a', Enter: 'a', Space: 'a',
    KeyX: 'b', Escape: 'b', Backspace: 'b',
    ShiftLeft: 'start', ShiftRight: 'start', KeyQ: 'start'
  };

  var keysDown = {};       // コード → true
  var touchDown = {};      // アクション → true（タッチ）
  var latch = {};          // 1フレームより短い押下を取りこぼさないためのラッチ
  var holdTime = {};
  var lastDir = null;      // 最後に押された方向キー

  var I = MM.input = {
    held: {}, pressed: {}, prev: {}
  };
  ACTIONS.forEach(function (a) { I.held[a] = false; I.pressed[a] = false; I.prev[a] = false; holdTime[a] = 0; });

  function keyHeld(action) {
    var k;
    for (k in keysDown) {
      if (keysDown[k] && KEYMAP[k] === action) return true;
    }
    return false;
  }

  // 1ステップの最初に呼ぶ
  I.update = function () {
    var i, a, h;
    for (i = 0; i < ACTIONS.length; i++) {
      a = ACTIONS[i];
      h = keyHeld(a) || !!touchDown[a] || !!latch[a];
      I.held[a] = h;
      var edge = h && !I.prev[a];
      if (h) holdTime[a]++; else holdTime[a] = 0;
      // 方向キーだけ長押しで繰り返す（メニューのカーソル用）
      var rep = false;
      if (h && i < 4 && holdTime[a] > 22 && (holdTime[a] - 22) % 6 === 0) rep = true;
      I.pressed[a] = edge || rep;
      if (edge && (a === 'up' || a === 'down' || a === 'left' || a === 'right')) lastDir = a;
      I.prev[a] = h;
    }
    // ラッチは1ステップで消費
    latch = {};
  };

  // いま歩く方向（最後に押された方向を優先）
  I.dir = function () {
    if (lastDir && I.held[lastDir]) return lastDir;
    if (I.held.up) return 'up';
    if (I.held.down) return 'down';
    if (I.held.left) return 'left';
    if (I.held.right) return 'right';
    return null;
  };

  // 押下の取りこぼし防止（keydown/タッチ down のときに呼ぶ）
  function press(a) { latch[a] = true; }

  // テストやデバッグから仮想的に1回押す
  I.tap = function (a) { latch[a] = true; };

  // ---- キーボード ----
  window.addEventListener('keydown', function (e) {
    var a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (!keysDown[e.code]) press(a);
    keysDown[e.code] = true;
  });
  window.addEventListener('keyup', function (e) {
    var a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    keysDown[e.code] = false;
  });
  window.addEventListener('blur', function () {
    keysDown = {}; touchDown = {};
  });
  // 長押しメニュー・右クリックメニューを出さない
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---- タッチ（ポインタイベント：マウスでも動く） ----
  function bindButton(el, action) {
    if (!el) return;
    var ids = {};
    function down(e) {
      e.preventDefault();
      document.body.classList.add('touch');
      ids[e.pointerId] = true;
      touchDown[action] = true;
      press(action);
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
      el.classList.add('on');
    }
    function up(e) {
      e.preventDefault();
      delete ids[e.pointerId];
      if (Object.keys(ids).length === 0) { touchDown[action] = false; el.classList.remove('on'); }
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  }

  // 十字キー：押した位置から方向を決める（指をずらして方向を変えられる）
  function bindDpad(el) {
    if (!el) return;
    var cur = {};   // pointerId → 方向
    function dirOf(e) {
      var r = el.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      if (Math.max(Math.abs(dx), Math.abs(dy)) < r.width * 0.1) return null;
      if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
      return dy < 0 ? 'up' : 'down';
    }
    function apply() {
      var set = {}, id;
      for (id in cur) { if (cur[id]) set[cur[id]] = true; }
      ['up', 'down', 'left', 'right'].forEach(function (d) {
        var was = !!touchDown[d];
        touchDown[d] = !!set[d];
        if (set[d] && !was) press(d);
        var node = el.querySelector('.' + d);
        if (node) { if (set[d]) node.classList.add('on'); else node.classList.remove('on'); }
      });
    }
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      document.body.classList.add('touch');
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
      cur[e.pointerId] = dirOf(e);
      apply();
    });
    el.addEventListener('pointermove', function (e) {
      if (!(e.pointerId in cur)) return;
      e.preventDefault();
      cur[e.pointerId] = dirOf(e);
      apply();
    });
    function end(e) {
      delete cur[e.pointerId];
      apply();
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }

  I.bindTouch = function () {
    bindDpad(document.getElementById('dpad'));
    bindButton(document.getElementById('btn-a'), 'a');
    bindButton(document.getElementById('btn-b'), 'b');
    bindButton(document.getElementById('btn-start'), 'start');
    // タッチ操作が始まったらボタンを出す
    window.addEventListener('touchstart', function () { document.body.classList.add('touch'); }, { passive: true });
  };
})();
