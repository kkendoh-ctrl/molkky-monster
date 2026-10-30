// title.js : タイトル画面・オープニング（ハカセの語り）・エンディングカード
(function () {
  'use strict';
  var MM = window.MM, G = MM.gfx, I = MM.input;
  MM.scenes = MM.scenes || {};

  // =====================================================
  // タイトル
  // =====================================================
  function Title() {
    this.name = 'title'; this.opaque = true;
    this.t = 0;
    this.hasSave = MM.save.exists();
    this.sel = this.hasSave ? 1 : 0;
    this.msgT = 0;
  }
  Title.prototype.enter = function () {
    this.hasSave = MM.save.exists();
    this.sel = this.hasSave ? 1 : 0;
  };
  Title.prototype.update = function () {
    var n = this.hasSave ? 2 : 1;
    this.t++;
    if (this.msgT > 0) this.msgT--;
    if (n > 1) {
      if (I.pressed.up) this.sel = (this.sel + 1) % n;
      if (I.pressed.down) this.sel = (this.sel + 1) % n;
    }
    if (I.pressed.a || I.pressed.start) {
      if (this.sel === 0) MM.scenes.openingStart();
      else if (!MM.continueGame()) { this.hasSave = false; this.sel = 0; this.msgT = 150; }
    }
  };
  Title.prototype.draw = function () {
    var i, x, y, ids = ['shibamoru', 'tsuchipin', 'sunabou'], bob, items;
    G.clear(3);
    // 下の草むら
    for (x = 0; x < 10; x++) {
      G.draw(G.tile('grass'), x * 32, 256);
      G.draw(G.tile((x + 1) % 3 === 0 ? 'tallgrass' : 'grass'), x * 32, 224 - 32 + 32);
    }
    G.rect(0, 220, MM.W, 4, 1);
    // ロゴ
    G.rect(0, 14, MM.W, 100, 0);
    G.rect(0, 18, MM.W, 92, 1);
    G.text('モルック', 66, 22, 3, 32);
    G.rect(206, 22, 44, 40, 3);
    G.text('緑', 212, 26, 0, 32);
    G.text('モンスター', 80, 58, 3, 32);
    G.textRight('v' + MM.VERSION, MM.W - 10, 88, 2);
    // はねるモルモン
    for (i = 0; i < 3; i++) {
      bob = Math.abs(Math.sin((this.t + i * 14) / 14)) * 10;
      G.ellipse(66 + i * 94, 186, 26, 5, 2);
      G.ctx.drawImage(G.monSprite(ids[i], false), 34 + i * 94, Math.round(128 - bob), 64, 64);
    }
    // メニュー
    items = this.hasSave ? ['はじめから', 'つづきから'] : ['はじめから'];
    G.box(92, 196 - (items.length - 1) * 0, 136, items.length * 24 + 16);
    for (i = 0; i < items.length; i++) {
      G.text(items[i], 124, 206 + i * 24, 0);
      if (i === this.sel && ((this.t >> 4) & 1) === 0) G.cursor(106, 210 + i * 24);
      else if (i === this.sel) G.cursor(108, 210 + i * 24);
    }
    if (this.msgT > 0) {
      G.box(20, 130, 280, 40);
      G.textCenter('セーブデータを よみこめなかった', 160, 140, 0);
    }
    // 音がまだ出ていない（最初のタップ待ち）ときだけ、左下に小さく案内を出す（オフ設定のときは出ない）
    var hint = MM.bgm && MM.bgm.needsTap();
    if (hint) G.text('おと：タップで オン', 6, 266, 0);
    if (((this.t >> 5) & 1) === 0) {
      if (hint) G.textRight('Aボタン / Enter', 314, 266, 0);
      else G.textCenter('Aボタン / Enter', 160, 266, 0);
    }
  };
  MM.scenes.Title = Title;

  // =====================================================
  // オープニング（ハカセの語り 6画面）
  // =====================================================
  var PAGES = [
    { text: 'やあ！ ようこそ モルモンの せかいへ！', mons: [] },
    { text: 'わしは モルックハカセ。\nモルックの けんきゅうを している。', mons: [] },
    { text: 'この せかいには モルックモンスター…\nつまり 「モルモン」が すんでいる。', mons: ['skitten', 'carli', 'fault'] },
    { text: 'スキットルや モルックぼうの かたちを した\nふしぎな いきものたち だ。', mons: ['shibamoru', 'tsuchipin', 'sunabou'] },
    { text: 'ひとびとは モルモンと なかよくなり\nいっしょに モルックを たのしんでいる。', mons: ['yokonage', 'nijugo', 'gojuten'] },
    { text: 'さあ、 モルックチーム「かみだのみ」の\nせんしゅ ' + MM.config.playerName + 'くん！\nきみの ものがたりが はじまるぞ！', mons: [] }
  ];

  function Opening() {
    this.name = 'opening'; this.opaque = true;
    this.page = 0;
    this.tb = new MM.TextBox({ x: 0, y: 196, w: MM.W, h: 92, lines: 3 });
    this.tb.say(PAGES[0].text);
    this.t = 0;
  }
  Opening.prototype.update = function () {
    this.t++;
    if (I.pressed.start) { MM.startNewGame(); return; }    // STARTで とばす
    if (this.tb.update(I.pressed.a)) {
      this.page++;
      if (this.page >= PAGES.length) { MM.startNewGame(); return; }
      this.tb.say(PAGES[this.page].text);
    }
  };
  Opening.prototype.draw = function () {
    var i, ms = PAGES[Math.min(this.page, PAGES.length - 1)].mons, bob;
    G.clear(3);
    G.rect(0, 150, MM.W, 46, 2);
    G.ellipse(160, 168, 60, 10, 1);
    // ハカセ（16x16 の絵を 6倍に拡大）
    G.ctx.drawImage(MM.buildChar('hakase').down[0], 96, 40, 128, 128);
    for (i = 0; i < ms.length; i++) {
      bob = Math.round(Math.sin((this.t + i * 12) / 10) * 3);
      G.ctx.drawImage(G.monSprite(ms[i], false), 12 + i * 100 + (i === 2 ? 0 : 0), 20 + bob + (i === 1 ? 70 : 0), 64, 64);
    }
    this.tb.draw();
    G.text('STARTで スキップ', 6, 4, 1);
  };
  MM.scenes.Opening = Opening;

  MM.scenes.openingStart = function () {
    MM.replaceAll(new Opening());
  };

  // =====================================================
  // エンディングカード（v0.1はここまで）
  // =====================================================
  function EndCard(onClose) {
    this.name = 'endcard'; this.opaque = true;
    this.onClose = onClose;
    this.t = 0;
  }
  EndCard.prototype.update = function () {
    this.t++;
    if (this.t > 30 && I.pressed.a) {
      MM.remove(this);
      if (this.onClose) this.onClose();
    }
  };
  EndCard.prototype.draw = function () {
    var s = MM.state, k, caught = 0;
    for (k in s.dex) if (s.dex[k] === 2) caught++;
    G.clear(0);
    G.rect(8, 8, 304, 272, 1);
    G.rect(12, 12, 296, 264, 0);
    G.textCenter('つぎの まちへ…', 160, 50, 3, 16);
    G.textCenter('v0.1は ここまで！', 160, 100, 3, 32);
    G.textCenter('あそんでくれて ありがとう！', 160, 160, 3, 16);
    G.textCenter('つかまえた モルモン ' + caught + '/' + MM.MON_ORDER.length, 160, 196, 2, 16);
    G.textCenter('このあとも あるきまわれるよ', 160, 222, 2, 16);
    if (this.t > 30 && ((this.t >> 5) & 1) === 0) G.textCenter('A', 160, 254, 3, 16);
  };
  MM.scenes.EndCard = EndCard;
})();
