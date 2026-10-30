// field.js : フィールド（町・道路を歩く）。グリッド移動、会話、段差、草むら遭遇、イベント実行。
// イベントは「ジェネレータ関数」で書く。yield で待つ（会話が終わるまで・歩き終わるまで・戦闘が終わるまで）。
(function () {
  'use strict';
  var MM = window.MM, G = MM.gfx, I = MM.input;
  var TS = MM.TILE;
  var MOVE_FRAMES = 12;      // 1マス歩くフレーム数
  var JUMP_FRAMES = 22;      // 段差を飛び降りるフレーム数

  var F = MM.Field = {
    name: 'field', opaque: true,
    mapId: null, map: null, w: 0, h: 0,
    npcs: [], player: null,
    task: null, wait: null,
    camx: 0, camy: 0,
    cool: 3,               // 遭遇しない歩数
    excl: null,            // 「！」の表示 { a, t }
    banner: null,          // マップ名の表示 { text, t }
    lastResult: null,
    choice: 0
  };
  var drawList = [];

  // ---------- 人物 ----------
  function makeActor(d) {
    var a = {
      id: d.id, x: d.x, y: d.y, dir: d.dir || 'down',
      ox: 0, oy: 0, joff: 0, moving: false, mt: 0, dur: MOVE_FRAMES, mx: 0, my: 0, jump: false,
      parity: 0, queue: [], turn: 0, def: d,
      set: d.look ? MM.buildChar(d.look) : null
    };
    return a;
  }

  function visible(a) {
    var d = a.def, fl = MM.state.flags;
    if (d.hideIf && fl[d.hideIf]) return false;
    if (d.showIf && !fl[d.showIf]) return false;
    return true;
  }

  // ---------- マップ読み込み ----------
  F.load = function (id, x, y, dir) {
    var m = MM.maps[id], i;
    F.mapId = id; F.map = m;
    F.h = m.tiles.length; F.w = m.tiles[0].length;
    F.npcs = [];
    for (i = 0; i < m.npcs.length; i++) F.npcs.push(makeActor(m.npcs[i]));
    F.player = makeActor({ id: 'player', x: x, y: y, dir: dir || 'down', look: 'hero' });
    F.api.player = F.player;
    F.cool = 3;
    F.excl = null;
    F.banner = { text: m.name, t: 100 };
    MM.state.map = id;
  };

  function tileAt(x, y) {
    if (x < 0 || y < 0 || x >= F.w || y >= F.h) return null;
    return MM.TILEDEF[F.map.tiles[y].charAt(x)] || null;
  }
  F.tileAt = tileAt;

  function npcAt(x, y) {
    var i, a;
    for (i = 0; i < F.npcs.length; i++) {
      a = F.npcs[i];
      if (a.x === x && a.y === y && visible(a)) return a;
    }
    return null;
  }
  F.npcAt = npcAt;

  // ---------- 移動 ----------
  function startMove(a, nx, ny, jump) {
    a.mx = nx - a.x; a.my = ny - a.y;
    a.x = nx; a.y = ny;
    a.ox = -a.mx * TS; a.oy = -a.my * TS;
    a.moving = true; a.mt = 0; a.jump = !!jump;
    a.dur = jump ? JUMP_FRAMES : MOVE_FRAMES;
    a.turn = 0;
  }
  // 1フレーム進める。歩き終わったら true
  function stepMove(a) {
    var f;
    a.mt++;
    f = a.mt / a.dur;
    if (f >= 1) {
      a.moving = false; a.ox = 0; a.oy = 0; a.joff = 0;
      a.parity ^= 1;
      return true;
    }
    a.ox = Math.round(-a.mx * TS * (1 - f));
    a.oy = Math.round(-a.my * TS * (1 - f));
    a.joff = a.jump ? -Math.round(Math.sin(Math.PI * f) * 12) : 0;
    return false;
  }

  function tryMovePlayer(d) {
    var p = F.player, dd = MM.DIRS[d], nx = p.x + dd.dx, ny = p.y + dd.dy;
    var def = tileAt(nx, ny), land;
    if (!def) return false;
    if (def.ledge) {
      // 段差は下向きにだけ飛び降りられる
      if (d !== 'down') return false;
      land = tileAt(nx, ny + 1);
      if (!land || land.solid || land.ledge || npcAt(nx, ny + 1) || npcAt(nx, ny)) return false;
      startMove(p, nx, ny + 1, true);
      return true;
    }
    if (def.solid || npcAt(nx, ny)) return false;
    startMove(p, nx, ny, false);
    return true;
  }

  // ---------- イベント実行 ----------
  F.run = function (genFn) {
    F.task = genFn(F.api);
    F.wait = null;
  };
  F.runScript = function (name, obj) {
    var fn = MM.scripts[name];
    if (!fn) { if (window.console) console.error('スクリプトがありません: ' + name); return; }
    F.task = fn(F.api, obj);
    F.wait = null;
  };
  function pumpTask() {
    var r;
    try {
      if (F.wait && !F.wait()) return;
      F.wait = null;
      r = F.task.next();
      if (r.done) { F.task = null; F.wait = null; }
      else F.wait = (typeof r.value === 'function') ? r.value : null;
    } catch (e) {
      if (window.console) console.error('イベントでエラー', e);
      F.task = null; F.wait = null;
    }
  }

  // ---------- スクリプトから使う道具（F.api） ----------
  var api = F.api = { player: null, choice: 0 };
  api.say = function (text) {
    var d = MM.dlg.say(text);
    return function () { return d.done; };
  };
  api.ask = function (text, choices) {
    var d = MM.dlg.ask(text, choices);
    return function () { if (d.done) { api.choice = d.result; return true; } return false; };
  };
  api.wait = function (n) { var c = 0; return function () { c++; return c >= n; }; };
  api.flag = function (n) { return MM.state.flags[n]; };
  api.set = function (n, v) { MM.state.flags[n] = (v === undefined ? 1 : v); };
  api.npc = function (id) {
    var i;
    for (i = 0; i < F.npcs.length; i++) if (F.npcs[i].id === id) return F.npcs[i];
    return null;
  };
  api.face = function (a, d) { a.dir = d; };
  api.walkNpc = function (a, dirs) {
    a.queue = a.queue.concat(dirs);
    return function () { return !a.moving && a.queue.length === 0; };
  };
  api.walkPlayer = function (dirs) { return api.walkNpc(F.player, dirs); };
  api.exclaim = function (a) {
    F.excl = { a: a, t: 0 };
    return function () { return F.excl === null; };
  };
  api.give = function (id, n) { MM.giveItem(id, n); };
  api.healAll = function () { MM.healAll(); };
  api.warp = function (id, x, y, dir) {
    var done = false;
    MM.fx.out(function () {
      F.load(id, x, y, dir);
      MM.fx.in(function () { done = true; });
    });
    return function () { return done; };
  };
  api.endCard = function () {
    var done = false;
    MM.push(new MM.scenes.EndCard(function () { done = true; }));
    return function () { return done; };
  };
  // バトル。戻り値＝プレイヤーが負けなかったか（全滅したらテントで回復して false）
  api.fight = function* (def) {
    var done = false, res = null, h;
    MM.fx.flash(function () {
      MM.push(new MM.scenes.Battle(def, function (r) { res = r; done = true; }));
    });
    yield function () { return done; };
    F.lastResult = res;
    F.cool = 3;
    if (res === 'lose' && !def.noBlackout) {
      MM.healAll();
      h = MM.state.heal;
      yield api.warp(h.map, h.x, h.y, h.dir);
      yield api.say('…… きゅうけいテントで めが さめた。\nモルモンたちは すっかり げんきに なった！');
      return false;
    }
    return res !== 'lose';
  };
  // ドアなどで別マップへ（フェード→読み込み→フェード→onEnter）
  F.startWarp = function (w) {
    F.run(function* (A) {
      yield A.warp(w.to, w.tx, w.ty, w.dir);
      var s = F.map.onEnter;
      if (s) yield* MM.scripts[s](A);
    });
  };

  // ---------- 会話・調べる ----------
  function interact() {
    var p = F.player, d = MM.DIRS[p.dir], tx = p.x + d.dx, ty = p.y + d.dy, a, i, list;
    a = npcAt(tx, ty);
    if (a) {
      if (!a.def.item) a.dir = MM.OPPOSITE[p.dir];
      if (a.def.item) F.runScript('pickup', a);
      else if (a.def.trainer) F.runScript('trainerTalk', a);
      else F.runScript(a.def.script, a);
      return;
    }
    list = F.map.objects || [];
    for (i = 0; i < list.length; i++) {
      if (list[i].x === tx && list[i].y === ty) { F.runScript(list[i].script, list[i]); return; }
    }
    list = F.map.signs || [];
    for (i = 0; i < list.length; i++) {
      if (list[i].x === tx && list[i].y === ty) { F.runScript('sign', list[i]); return; }
    }
  }

  // ---------- 歩き終わったときの処理（出入口→イベント→トレーナーの視線→草むら） ----------
  function matchPos(v, n) { return Array.isArray(v) ? v.indexOf(n) >= 0 : v === n; }

  function trainerSees() {
    var p = F.player, i, a, d, k, tx, ty, def;
    for (i = 0; i < F.npcs.length; i++) {
      a = F.npcs[i];
      if (!a.def.trainer || !visible(a) || MM.state.flags[a.def.flag]) continue;
      d = MM.DIRS[a.dir];
      for (k = 1; k <= (a.def.sight || 3); k++) {
        tx = a.x + d.dx * k; ty = a.y + d.dy * k;
        def = tileAt(tx, ty);
        if (!def || def.solid || npcAt(tx, ty)) break;
        if (tx === p.x && ty === p.y) return a;
      }
    }
    return null;
  }

  function pickEncounter() {
    var list = F.map.encounters, total = 0, i, r;
    for (i = 0; i < list.length; i++) total += list[i].w;
    r = MM.rnd(total);
    for (i = 0; i < list.length; i++) { r -= list[i].w; if (r < 0) return list[i]; }
    return list[0];
  }

  function onStepEnd() {
    var p = F.player, m = F.map, i, w, t, def, e, tr;
    if (F.cool > 0) F.cool--;
    for (i = 0; i < (m.warps || []).length; i++) {
      w = m.warps[i];
      if (w.x === p.x && w.y === p.y) { F.startWarp(w); return; }
    }
    for (i = 0; i < (m.triggers || []).length; i++) {
      t = m.triggers[i];
      if (matchPos(t.x, p.x) && matchPos(t.y, p.y) && (!t.cond || t.cond(MM.state.flags))) {
        F.runScript(t.script, t); return;
      }
    }
    tr = trainerSees();
    if (tr) { F.runScript('trainerSpot', tr); return; }
    def = tileAt(p.x, p.y);
    if (def && def.enc && m.encounters && !MM.debug.noEncounter && F.cool <= 0 && MM.chance(MM.config.encounterRate)) {
      e = pickEncounter();
      var mon = MM.makeMon(e.id, e.min + MM.rnd(e.max - e.min + 1));
      F.run(function* (A) { yield* A.fight({ wild: mon }); });
    }
  }

  // ---------- 更新 ----------
  F.update = function () {
    var i, a, p = F.player, fin, d;
    if (F.banner) { F.banner.t--; if (F.banner.t <= 0) F.banner = null; }
    if (F.excl) { F.excl.t++; if (F.excl.t > 36) F.excl = null; }
    // 人物の移動アニメ（スクリプトからの移動指示もここで処理）
    for (i = -1; i < F.npcs.length; i++) {
      a = (i < 0) ? p : F.npcs[i];
      if (a.moving) {
        fin = stepMove(a);
        if (fin && a === p && !F.task) onStepEnd();
        else if (fin && a === p && F.task) { /* スクリプト中の移動は引き金を無視 */ }
      }
      if (!a.moving && a.queue.length) {
        d = a.queue.shift();
        a.dir = d;
        startMove(a, a.x + MM.DIRS[d].dx, a.y + MM.DIRS[d].dy, false);
      }
    }
    if (F.task) { pumpTask(); return; }
    if (p.moving) return;

    if (I.pressed.start) { MM.push(new MM.scenes.Menu()); return; }
    if (I.pressed.a) { interact(); return; }
    d = I.dir();
    if (d) {
      if (p.dir !== d) { p.dir = d; p.turn = 6; }       // まず向きだけ変える（ちょん押しで方向転換）
      else if (p.turn > 0) p.turn--;
      else tryMovePlayer(d);
    } else {
      p.turn = 0;
    }
  };

  // ---------- 描画 ----------
  function drawActor(a, camx, camy) {
    var x = a.x * TS + a.ox - camx, y = a.y * TS + a.oy + a.joff - camy - 4, fr;
    if (a.def.item) { G.draw(G.misc('itembag', 2), x, y + 4); return; }
    if (!a.set) return;
    fr = a.moving && !a.jump ? (a.parity ? 1 : 2) : 0;
    G.draw(a.set[a.dir][fr], x, y);
  }

  F.draw = function () {
    var p = F.player, mw = F.w * TS, mh = F.h * TS, camx, camy, x0, y0, x1, y1, tx, ty, def, i, a, n, j, k, e;
    camx = p.x * TS + p.ox + 16 - MM.W / 2;
    camy = p.y * TS + p.oy + 16 - MM.H / 2;
    camx = (mw <= MM.W) ? -Math.floor((MM.W - mw) / 2) : MM.clamp(camx, 0, mw - MM.W);
    camy = (mh <= MM.H) ? -Math.floor((MM.H - mh) / 2) : MM.clamp(camy, 0, mh - MM.H);
    F.camx = camx; F.camy = camy;
    G.clear(0);
    x0 = Math.max(0, Math.floor(camx / TS)); y0 = Math.max(0, Math.floor(camy / TS));
    x1 = Math.min(F.w - 1, Math.floor((camx + MM.W - 1) / TS)); y1 = Math.min(F.h - 1, Math.floor((camy + MM.H - 1) / TS));
    for (ty = y0; ty <= y1; ty++) {
      for (tx = x0; tx <= x1; tx++) {
        def = MM.TILEDEF[F.map.tiles[ty].charAt(tx)];
        if (def) G.draw(G.tile(def.art), tx * TS - camx, ty * TS - camy);
      }
    }
    // 人物を y 座標の順に描く（手前の人が後から描かれる）
    drawList.length = 0;
    for (i = 0; i < F.npcs.length; i++) if (visible(F.npcs[i])) drawList.push(F.npcs[i]);
    drawList.push(p);
    n = drawList.length;
    for (j = 1; j < n; j++) {
      a = drawList[j]; k = j - 1;
      while (k >= 0 && (drawList[k].y * TS + drawList[k].oy) > (a.y * TS + a.oy)) { drawList[k + 1] = drawList[k]; k--; }
      drawList[k + 1] = a;
    }
    for (i = 0; i < n; i++) drawActor(drawList[i], camx, camy);
    // 「！」
    if (F.excl) {
      e = F.excl.a;
      tx = e.x * TS + e.ox - camx; ty = e.y * TS + e.oy - camy - 26;
      G.rect(tx + 8, ty, 16, 20, 0); G.rect(tx + 10, ty + 2, 12, 16, 3);
      G.text('!', tx + 12, ty + 2, 0);
    }
    // マップ名
    if (F.banner) {
      var bw = G.textWidth(F.banner.text) + 20;
      G.box(4, 4, bw, 28);
      G.text(F.banner.text, 14, 10, 0);
    }
  };

  // デバッグ用：現在位置などを返す
  MM.debug.field = function () {
    var p = F.player;
    return { map: F.mapId, x: p.x, y: p.y, dir: p.dir, moving: p.moving, task: !!F.task };
  };

  // デバッグ用：歩ける場所の地図（自動テストの経路探索用）。0=歩ける 1=通れない 2=段差
  MM.debug.nav = function () {
    var g = [], y, x, row, def, npcs = [], i, a;
    for (y = 0; y < F.h; y++) {
      row = [];
      for (x = 0; x < F.w; x++) {
        def = tileAt(x, y);
        row.push(!def || def.solid ? 1 : (def.ledge ? 2 : 0));
      }
      g.push(row);
    }
    for (i = 0; i < F.npcs.length; i++) {
      a = F.npcs[i];
      npcs.push({ id: a.id, x: a.x, y: a.y, visible: visible(a), trainer: !!a.def.trainer, item: !!a.def.item });
    }
    return { map: F.mapId, w: F.w, h: F.h, grid: g, npcs: npcs, warps: F.map.warps || [], triggers: (F.map.triggers || []).filter(function (t) { return !t.cond || t.cond(MM.state.flags); }).map(function (t) { return { x: t.x, y: t.y }; }) };
  };
  // デバッグ用：すぐ野生バトルを始める
  MM.debug.startWild = function (sid, lv) {
    var mon = MM.makeMon(sid, lv);
    F.run(function* (A) { yield* A.fight({ wild: mon }); });
  };
  MM.debug.lastResult = function () { return F.lastResult; };
})();
