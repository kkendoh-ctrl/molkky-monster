// menu.js : メニュー画面（モルモン・バッグ・ずかん・ボックス・セーブ）
(function () {
  'use strict';
  var MM = window.MM, G = MM.gfx, I = MM.input;
  MM.scenes = MM.scenes || {};

  function monName(m) { return MM.MONSTERS[m.sid].name; }
  function fmtTime(frames) {
    var s = Math.floor(frames / 60), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
    return h + ':' + (m < 10 ? '0' : '') + m;
  }
  function header(text, right) {
    G.rect(0, 0, MM.W, 26, 0);
    G.text(text, 8, 5, 3);
    if (right) G.textRight(right, MM.W - 8, 5, 3);
  }
  // 小さな選択肢ボックス（右下）。戻り値なし。描画だけ。
  function drawChoices(list, sel, rx, by) {
    var maxw = 0, i, w, h, x, y;
    for (i = 0; i < list.length; i++) maxw = Math.max(maxw, G.textWidth(list[i]));
    w = maxw + 44; h = list.length * 24 + 16;
    x = rx - w; y = by - h;
    G.box(x, y, w, h);
    for (i = 0; i < list.length; i++) {
      G.text(list[i], x + 30, y + 10 + i * 24, 0);
      if (i === sel) G.cursor(x + 14, y + 14 + i * 24);
    }
  }
  // 下のメッセージ帯
  var noteCache = { text: null, lines: null };
  function drawNote(text) {
    var lines, i;
    // 文字列が変わったときだけ折り返しを作り直す（毎フレームの無駄な生成を避ける）
    if (noteCache.text !== text) { noteCache.text = text; noteCache.lines = G.wrap(text, MM.W - 28, 16); }
    lines = noteCache.lines;
    G.box(0, 224, MM.W, 64);
    for (i = 0; i < lines.length && i < 2; i++) G.text(lines[i], 14, 234 + i * 22, 0);
  }

  // =====================================================
  // フィールドのメニュー（右上のパネル）
  // =====================================================
  var MENU_ITEMS = ['ずかん', 'モルモン', 'ボックス', 'バッグ', 'セーブ', 'おと', 'とじる'];
  // 「おと」の行だけ、いまの設定（オン/オフ）を付けて表示する
  function itemLabel(i) {
    if (MENU_ITEMS[i] === 'おと') {
      if (!MM.bgm || !MM.bgm.enabled) return 'おと：オフ';
      return MM.bgm.needsTap() ? 'おと：タップ' : 'おと：オン';   // オンなのに止まっているときは「タップ」と出す
    }
    return MENU_ITEMS[i];
  }

  function Menu() {
    this.name = 'menu'; this.opaque = false;
    this.sel = 0;
    this.pending = null;     // 開いた会話の結果を待つ
    this.stage = 'main';
  }
  Menu.prototype.update = function () {
    var n = MENU_ITEMS.length, ok;
    if (this.pending) {
      if (!this.pending.done) return;
      var d = this.pending; this.pending = null;
      if (this.stage === 'saveAsk') {
        if (d.result === 0) {
          ok = MM.save.write();
          this.stage = 'saveDone';
          this.pending = MM.dlg.say(ok ? 'セーブしました！' : 'セーブに しっぱいした…\n（ブラウザの せっていを かくにんしてね）');
        } else this.stage = 'main';
      } else this.stage = 'main';
      return;
    }
    if (I.pressed.up) this.sel = (this.sel + n - 1) % n;
    if (I.pressed.down) this.sel = (this.sel + 1) % n;
    if (I.pressed.b || I.pressed.start) { MM.remove(this); return; }
    if (I.pressed.a) {
      switch (this.sel) {
        case 0: MM.push(new Dex()); break;
        case 1: MM.push(new PartyScene({ mode: 'view' })); break;
        case 2: MM.push(new MonList({ title: 'あずかりボックス', list: MM.state.box })); break;
        case 3: MM.push(new BagScene({ battle: false })); break;
        case 4:
          if (MM.state.party.length === 0) {
            // 手持ちが0体（スターター前）はセーブしない（前のセーブを壊さないため）
            this.stage = 'saveDone';
            this.pending = MM.dlg.say('まだ セーブ できない！');
          } else {
            this.stage = 'saveAsk';
            this.pending = MM.dlg.ask('いまの ようすを セーブしますか？', ['はい', 'いいえ']);
          }
          break;
        case 5:
          // おと：オン/オフを切り替える（メニューは閉じない）
          if (MM.bgm) MM.bgm.toggle();
          break;
        default: MM.remove(this);
      }
    }
  };
  Menu.prototype.draw = function () {
    var i, x = 172, y = 4, w = 144, h = MENU_ITEMS.length * 24 + 18, s = MM.state, caught = 0, seen = 0, k;
    G.box(x, y, w, h);
    for (i = 0; i < MENU_ITEMS.length; i++) {
      G.text(itemLabel(i), x + 34, y + 11 + i * 24, 0);
      if (i === this.sel) G.cursor(x + 16, y + 15 + i * 24);
    }
    for (k in s.dex) { seen++; if (s.dex[k] === 2) caught++; }
    G.box(4, 4, 160, 82);
    G.text(MM.config.playerName, 14, 12, 0);
    G.text('じかん ' + fmtTime(s.play), 14, 36, 0);
    G.text('ずかん ' + caught + '/' + MM.MON_ORDER.length, 14, 58, 0);
    // 音がまだ出ていない（iPhone などで最初のタップ待ち）とき、説明を出す
    if (MM.bgm && MM.bgm.enabled && MM.bgm.needsTap()) {
      G.box(4, 92, 160, 58);
      G.text('おとが とまってる', 14, 100, 0);
      G.text('がめんを タップ', 14, 122, 0);
    }
  };
  MM.scenes.Menu = Menu;

  // =====================================================
  // モルモン一覧（見る・選ぶ・並べ替え）
  // opts: { mode:'view'|'pick', title, canCancel, valid(mon,idx), onPick(idx|null) }
  // =====================================================
  function PartyScene(opts) {
    this.name = 'party'; this.opaque = true;
    this.opts = opts;
    this.sel = 0;
    this.stage = 'list';     // list | menu | swap
    this.msel = 0;
    this.swapFrom = -1;
    this.note = ''; this.noteT = 0;
  }
  PartyScene.prototype.close = function (idx) {
    MM.remove(this);
    if (this.opts.onPick) this.opts.onPick(idx);
  };
  PartyScene.prototype.update = function () {
    var p = MM.state.party, n = p.length, err, t;
    if (this.noteT > 0) this.noteT--;
    if (n === 0) { if (I.pressed.a || I.pressed.b) this.close(null); return; }   // 手持ち0体：何もできない
    if (this.stage === 'menu') {
      if (I.pressed.up) this.msel = (this.msel + 2) % 3;
      if (I.pressed.down) this.msel = (this.msel + 1) % 3;
      if (I.pressed.b) { this.stage = 'list'; return; }
      if (I.pressed.a) {
        if (this.msel === 0) { MM.push(new Summary(p, this.sel)); this.stage = 'list'; }
        else if (this.msel === 1) {
          if (n < 2) { this.note = 'ならびかえる モルモンが いない！'; this.noteT = 90; this.stage = 'list'; }
          else { this.swapFrom = this.sel; this.stage = 'swap'; }
        } else this.stage = 'list';
      }
      return;
    }
    if (I.pressed.up) this.sel = (this.sel + n - 1) % n;
    if (I.pressed.down) this.sel = (this.sel + 1) % n;
    if (this.stage === 'swap') {
      if (I.pressed.b) { this.stage = 'list'; this.swapFrom = -1; return; }
      if (I.pressed.a) {
        if (this.sel !== this.swapFrom) { t = p[this.sel]; p[this.sel] = p[this.swapFrom]; p[this.swapFrom] = t; }
        this.stage = 'list'; this.swapFrom = -1;
      }
      return;
    }
    if (I.pressed.b) {
      if (this.opts.mode === 'view' || this.opts.canCancel) this.close(null);
      return;
    }
    if (I.pressed.a) {
      if (this.opts.mode === 'pick') {
        err = this.opts.valid ? this.opts.valid(p[this.sel], this.sel) : null;
        if (err) { this.note = err; this.noteT = 90; return; }
        this.close(this.sel);
      } else { this.stage = 'menu'; this.msel = 0; }
    }
  };
  PartyScene.prototype.draw = function () {
    var p = MM.state.party, i, y, m, sp, hpText, title;
    G.clear(3);
    title = this.opts.title || 'モルモン';
    if (p.length === 0) { header(title); G.text('モルモンが いない。', 20, 60, 0); return; }
    if (this.stage === 'swap') title = 'どれと いれかえる？';
    header(title);
    for (i = 0; i < p.length; i++) {
      m = p[i]; sp = MM.MONSTERS[m.sid];
      y = 28 + i * 43;
      if (i === this.sel) G.rect(0, y, MM.W, 42, 2);
      if (i === this.swapFrom) G.rect(0, y, MM.W, 42, 1);
      G.draw(G.monSprite(m.sid, false), 6, y + 5);
      G.text(sp.name, 46, y + 3, i === this.swapFrom ? 3 : 0);
      G.text('Lv' + m.lv, 46, y + 21, i === this.swapFrom ? 3 : 0);
      if (m.hp > 0) {
        G.text('HP', 160, y + 3, 0);
        G.bar(184, y + 8, 120, 8, m.hp / m.maxHp, 0, 3);
        G.textRight(m.hp + '/' + m.maxHp, 306, y + 21, 0);
      } else {
        G.text('ひんし', 184, y + 12, 0);
      }
    }
    if (this.stage === 'menu') drawChoices(['つよさ', 'いれかえ', 'もどる'], this.msel, MM.W - 6, 286);
    if (this.noteT > 0) drawNote(this.note);
  };
  MM.scenes.PartyScene = PartyScene;

  // =====================================================
  // つよさ（ステータス）画面
  // =====================================================
  function Summary(list, idx) {
    this.name = 'summary'; this.opaque = true;
    this.list = list; this.idx = idx;
  }
  Summary.prototype.update = function () {
    var n = this.list.length;
    if (n === 0 || I.pressed.b || I.pressed.a) { MM.remove(this); return; }
    if (I.pressed.left || I.pressed.up) this.idx = (this.idx + n - 1) % n;
    if (I.pressed.right || I.pressed.down) this.idx = (this.idx + 1) % n;
  };
  Summary.prototype.draw = function () {
    var m = this.list[this.idx], sp, i, e, mv, y, next;
    G.clear(3);
    if (!m) return;
    sp = MM.MONSTERS[m.sid];
    header('No.' + ('00' + sp.no).slice(-3) + ' ' + sp.name, MM.TYPE_NAMES[sp.type]);
    G.rect(8, 32, 68, 68, 2);
    G.rect(10, 34, 64, 64, 3);
    G.draw(G.monSprite(m.sid, false), 10, 34, 64, 64);
    G.text('レベル ' + m.lv, 88, 32, 0);
    G.text('HP ' + m.hp + '/' + m.maxHp, 88, 54, 0);
    next = m.lv >= MM.MAX_LEVEL ? 0 : MM.expFor(m.lv + 1) - m.exp;
    G.text('つぎまで ' + next, 88, 76, 0);
    G.text('こうげき ' + m.atk, 10, 108, 0);
    G.text('ぼうぎょ ' + m.def, 170, 108, 0);
    G.text('すばやさ ' + m.spd, 10, 128, 0);
    G.rect(8, 152, 304, 2, 1);
    G.text('わざ', 10, 158, 0);
    for (i = 0; i < m.moves.length; i++) {
      e = m.moves[i]; mv = MM.MOVES[e.id]; y = 180 + i * 24;
      G.text(mv.name, 10, y, 0);
      G.text(MM.TYPE_NAMES[mv.type], 140, y, 1);
      G.textRight('PP' + e.pp + '/' + mv.pp, 310, y, 0);
    }
    if (this.list.length > 1) G.text('< >', 282, 5, 3);
  };
  MM.scenes.Summary = Summary;

  // =====================================================
  // バッグ
  // opts: { battle:true/false, onPick(itemId|null) }
  // =====================================================
  function BagScene(opts) {
    this.name = 'bag'; this.opaque = true;
    this.opts = opts;
    this.sel = 0;
    this.note = ''; this.noteT = 0;
    this.sub = null;
  }
  BagScene.prototype.items = function () {
    var out = [], i, id;
    for (i = 0; i < MM.ITEM_ORDER.length; i++) {
      id = MM.ITEM_ORDER[i];
      if ((MM.state.bag[id] || 0) > 0) out.push(id);
    }
    return out;
  };
  BagScene.prototype.close = function (id) {
    MM.remove(this);
    if (this.opts.onPick) this.opts.onPick(id);
  };
  BagScene.prototype.update = function () {
    var list = this.items(), n = list.length, id, it, self = this;
    if (this.noteT > 0) this.noteT--;
    if (this.sub) {
      if (!this.sub.done) return;
      this.sub = null;
    }
    if (n > 0 && this.sel >= n) this.sel = n - 1;
    if (I.pressed.b) { this.close(null); return; }
    if (n === 0) return;
    if (I.pressed.up) this.sel = (this.sel + n - 1) % n;
    if (I.pressed.down) this.sel = (this.sel + 1) % n;
    if (I.pressed.a) {
      id = list[this.sel]; it = MM.ITEMS[id];
      if (this.opts.battle) { this.close(id); return; }
      if (it.kind === 'catch') { this.note = 'モルックは やせいの モルモンに\nなげて つかうものだ。'; this.noteT = 100; return; }
      // おしぼり：誰に使うか選ぶ
      this.sub = { done: false };
      MM.push(new PartyScene({
        mode: 'pick', title: 'だれに つかう？', canCancel: true,
        valid: function (mon) {
          if (mon.hp <= 0) return 'たおれた モルモンには つかえない！';
          if (mon.hp >= mon.maxHp) return 'HPは まんたんだ！';
          return null;
        },
        onPick: function (idx) {
          var m, before;
          if (idx !== null) {
            m = MM.state.party[idx]; before = m.hp;
            m.hp = Math.min(m.maxHp, m.hp + it.heal);
            MM.state.bag[id]--;
            self.note = monName(m) + 'の HPが ' + (m.hp - before) + ' かいふくした！'; self.noteT = 100;
          }
          self.sub.done = true;
        }
      }));
    }
  };
  BagScene.prototype.draw = function () {
    var list = this.items(), i, y, id, it;
    G.clear(3);
    header('バッグ');
    if (list.length === 0) G.text('なにも もっていない。', 20, 60, 0);
    for (i = 0; i < list.length; i++) {
      id = list[i]; it = MM.ITEMS[id]; y = 36 + i * 28;
      if (i === this.sel) { G.rect(0, y - 4, MM.W, 28, 2); G.cursor(10, y + 4); }
      G.text(it.name, 30, y, 0);
      G.textRight('x' + MM.state.bag[id], 304, y, 0);
    }
    if (list.length && this.noteT <= 0) drawNote(MM.ITEMS[list[Math.min(this.sel, list.length - 1)]].desc);
    if (this.noteT > 0) drawNote(this.note);
  };
  MM.scenes.BagScene = BagScene;

  // =====================================================
  // ずかん
  // =====================================================
  function Dex() {
    this.name = 'dex'; this.opaque = true;
    this.sel = 0; this.detail = false;
  }
  Dex.prototype.update = function () {
    var n = MM.MON_ORDER.length, st = MM.state.dex[MM.MON_ORDER[this.sel]];
    if (this.detail) {
      if (I.pressed.a || I.pressed.b) this.detail = false;
      if (I.pressed.left || I.pressed.up) this.sel = (this.sel + n - 1) % n;
      if (I.pressed.right || I.pressed.down) this.sel = (this.sel + 1) % n;
      if (!MM.state.dex[MM.MON_ORDER[this.sel]]) this.detail = false;
      return;
    }
    if (I.pressed.b) { MM.remove(this); return; }
    if (I.pressed.up) this.sel = (this.sel + n - 1) % n;
    if (I.pressed.down) this.sel = (this.sel + 1) % n;
    if (I.pressed.a && st) this.detail = true;
  };
  Dex.prototype.draw = function () {
    var s = MM.state.dex, k, seen = 0, caught = 0, i, id, sp, y, st, lines;
    for (k in s) { seen++; if (s[k] === 2) caught++; }
    G.clear(3);
    if (this.detail) {
      id = MM.MON_ORDER[this.sel]; sp = MM.MONSTERS[id]; st = s[id];
      header('No.' + ('00' + sp.no).slice(-3) + ' ' + sp.name, MM.TYPE_NAMES[sp.type]);
      G.rect(10, 34, 100, 100, 2);
      G.rect(12, 36, 96, 96, 3);
      G.draw(G.monSprite(id, false), 12, 36, 96, 96);
      G.text(st === 2 ? 'つかまえた！' : 'みた', 124, 40, 0);
      G.text('タイプ ' + MM.TYPE_NAMES[sp.type], 124, 64, 0);
      G.text('HP' + sp.base.hp + ' こう' + sp.base.atk, 124, 88, 1);
      G.text('ぼう' + sp.base.def + ' すば' + sp.base.spd, 124, 108, 1);
      lines = G.wrap(sp.desc, 296, 16);
      for (i = 0; i < lines.length; i++) G.text(lines[i], 12, 144 + i * 22, 0);
      G.text('ばしょ: ' + sp.where, 12, 144 + lines.length * 22 + 4, 1);
      return;
    }
    header('ずかん', 'みた ' + seen + ' つかまえた ' + caught);
    for (i = 0; i < MM.MON_ORDER.length; i++) {
      id = MM.MON_ORDER[i]; sp = MM.MONSTERS[id]; st = s[id]; y = 34 + i * 27;
      if (i === this.sel) { G.rect(0, y - 3, 200, 26, 2); G.cursor(8, y + 4); }
      G.text(('00' + sp.no).slice(-3), 26, y, 0);
      G.text(st ? sp.name : '？？？？？', 70, y, st ? 0 : 1);
      if (st === 2) { G.rect(176, y + 3, 10, 10, 0); }
      else if (st === 1) { G.rect(176, y + 3, 10, 10, 0); G.rect(178, y + 5, 6, 6, 3); }
    }
    // 右側にえらんでいる子の絵
    id = MM.MON_ORDER[this.sel];
    G.rect(208, 40, 104, 104, 2);
    G.rect(210, 42, 100, 100, 3);
    if (s[id]) G.draw(G.monSprite(id, false), 212, 44, 96, 96);
    else G.textCenter('？', 260, 80, 1, 16);
    G.text('● つかまえた', 208, 156, 0);
    G.text('○ みた', 208, 178, 0);
    G.text('Aで くわしく', 208, 218, 1);
  };
  MM.scenes.Dex = Dex;

  // =====================================================
  // モルモンの一覧（ボックス用・スクロール付き）
  // opts: { title, list, onPick(idx|null) }  ※Aで つよさ表示（onPickがあれば選択）
  // =====================================================
  function MonList(opts) {
    this.name = 'monlist'; this.opaque = true;
    this.opts = opts; this.sel = 0; this.top = 0;
  }
  MonList.prototype.update = function () {
    var n = this.opts.list.length;
    if (I.pressed.b) { MM.remove(this); if (this.opts.onPick) this.opts.onPick(null); return; }
    if (n === 0) return;
    if (I.pressed.up) this.sel = (this.sel + n - 1) % n;
    if (I.pressed.down) this.sel = (this.sel + 1) % n;
    if (this.sel < this.top) this.top = this.sel;
    if (this.sel >= this.top + 9) this.top = this.sel - 8;
    if (this.sel === 0) this.top = 0;
    if (I.pressed.a) {
      if (this.opts.onPick) { MM.remove(this); this.opts.onPick(this.sel); }
      else MM.push(new Summary(this.opts.list, this.sel));
    }
  };
  MonList.prototype.draw = function () {
    var list = this.opts.list, i, m, y;
    G.clear(3);
    header(this.opts.title, list.length + 'たい');
    if (list.length === 0) G.text('だれも いない。', 20, 60, 0);
    for (i = this.top; i < list.length && i < this.top + 9; i++) {
      m = list[i]; y = 32 + (i - this.top) * 28;
      if (i === this.sel) { G.rect(0, y - 3, MM.W, 28, 2); G.cursor(8, y + 5); }
      G.draw(G.monSprite(m.sid, false), 24, y - 3, 28, 28);
      G.text(monName(m), 60, y, 0);
      G.text('Lv' + m.lv, 180, y, 0);
      G.textRight(m.hp + '/' + m.maxHp, 306, y, 0);
    }
  };
  MM.scenes.MonList = MonList;

  // =====================================================
  // 研究所のPC：あずける・ひきだす
  // =====================================================
  function BoxPC(onClose) {
    this.name = 'boxpc'; this.opaque = true;
    this.onClose = onClose;
    this.sel = 0; this.note = ''; this.noteT = 0; this.sub = null;
  }
  BoxPC.prototype.close = function () {
    MM.remove(this);
    if (this.onClose) this.onClose();
  };
  BoxPC.prototype.say = function (t) { this.note = t; this.noteT = 100; };
  BoxPC.prototype.update = function () {
    var s = MM.state, self = this;
    if (this.noteT > 0) this.noteT--;
    if (this.sub) { if (!this.sub.done) return; this.sub = null; }
    if (I.pressed.up) this.sel = (this.sel + 2) % 3;
    if (I.pressed.down) this.sel = (this.sel + 1) % 3;
    if (I.pressed.b) { this.close(); return; }
    if (!I.pressed.a) return;
    if (this.sel === 2) { this.close(); return; }
    if (this.sel === 0) {
      if (s.party.length <= 1) { this.say('てもちが 1たいしか いない！\nさいごの 1たいは あずけられない。'); return; }
      this.sub = { done: false };
      MM.push(new PartyScene({
        mode: 'pick', title: 'だれを あずける？', canCancel: true,
        onPick: function (idx) {
          var m;
          if (idx !== null) {
            m = s.party.splice(idx, 1)[0];
            s.box.push(m);
            self.say(monName(m) + 'を あずかりボックスに おくった！');
          }
          self.sub.done = true;
        }
      }));
    } else {
      if (s.box.length === 0) { this.say('ボックスは からっぽだ。'); return; }
      if (s.party.length >= 6) { this.say('てもちが いっぱいだ！\nさきに だれかを あずけよう。'); return; }
      this.sub = { done: false };
      MM.push(new MonList({
        title: 'だれを ひきだす？', list: s.box,
        onPick: function (idx) {
          var m;
          if (idx !== null) {
            m = s.box.splice(idx, 1)[0];
            s.party.push(m);
            self.say(monName(m) + 'を てもちに くわえた！');
          }
          self.sub.done = true;
        }
      }));
    }
  };
  BoxPC.prototype.draw = function () {
    var items = ['あずける', 'ひきだす', 'やめる'], i;
    G.clear(3);
    header('あずかりボックス');
    G.text('てもち ' + MM.state.party.length + 'たい', 20, 44, 0);
    G.text('ボックス ' + MM.state.box.length + 'たい', 20, 68, 0);
    G.box(80, 110, 160, 100);
    for (i = 0; i < 3; i++) {
      G.text(items[i], 120, 124 + i * 24, 0);
      if (i === this.sel) G.cursor(100, 128 + i * 24);
    }
    if (this.noteT > 0) drawNote(this.note);
  };
  MM.scenes.BoxPC = BoxPC;
})();
