// gfx.js : 描画（ドット絵・文字・ウィンドウ枠・テキストボックス・画面効果）
// 使う色は MM.PAL の4色だけ。文字は1文字ずつ「しきい値で2値化」してから描くので、
// アンチエイリアスで4色以外の色が混ざらない。
(function () {
  'use strict';
  var MM = window.MM;
  var PAL = MM.PAL;
  var FONT = '"DotGothic16", "MS Gothic", "Yu Gothic", "Hiragino Kaku Gothic ProN", monospace';

  var G = MM.gfx = {};
  var canvas, ctx;

  G.init = function (cv) {
    canvas = cv;
    cv.width = MM.W; cv.height = MM.H;
    ctx = cv.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;
    G.ctx = ctx;
    G.canvas = cv;
  };

  // ---------- 基本図形 ----------
  G.rect = function (x, y, w, h, c) {
    ctx.fillStyle = PAL[c];
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  };
  G.clear = function (c) { G.rect(0, 0, MM.W, MM.H, c); };
  // 楕円（走査線で塗る。軽い）
  G.ellipse = function (cx, cy, rx, ry, c) {
    ctx.fillStyle = PAL[c];
    var y, dy, dx;
    for (y = -ry; y <= ry; y++) {
      dy = y / ry;
      dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - dy * dy)));
      ctx.fillRect((cx - dx) | 0, (cy + y) | 0, dx * 2, 1);
    }
  };
  // ウィンドウ枠（外側の濃い線＋明るい中身）
  G.box = function (x, y, w, h, fill) {
    G.rect(x, y, w, h, 0);
    G.rect(x + 2, y + 2, w - 4, h - 4, fill === undefined ? 3 : fill);
    G.rect(x + 4, y + 4, w - 8, 1, 1);               // 内側の細い線（上）
    G.rect(x + 4, y + h - 5, w - 8, 1, 1);           // 内側の細い線（下）
  };
  // 下向き三角（「つづき」のしるし）
  G.arrowDown = function (x, y, c) {
    G.rect(x, y, 9, 2, c); G.rect(x + 2, y + 2, 5, 2, c); G.rect(x + 4, y + 4, 1, 2, c);
  };
  // 右向き三角（カーソル）
  G.cursor = function (x, y, c) {
    G.rect(x, y, 2, 10, c === undefined ? 0 : c);
    G.rect(x + 2, y + 1, 2, 8, c === undefined ? 0 : c);
    G.rect(x + 4, y + 2, 2, 6, c === undefined ? 0 : c);
    G.rect(x + 6, y + 3, 2, 4, c === undefined ? 0 : c);
  };
  // バー（HP・経験値）
  G.bar = function (x, y, w, h, ratio, fillC, bgC) {
    G.rect(x, y, w, h, 0);
    G.rect(x + 1, y + 1, w - 2, h - 2, bgC === undefined ? 3 : bgC);
    var fw = Math.round((w - 2) * MM.clamp(ratio, 0, 1));
    if (fw > 0) G.rect(x + 1, y + 1, fw, h - 2, fillC === undefined ? 0 : fillC);
  };

  // ---------- ドット絵 ----------
  // rows: 文字列配列（'0'〜'3'=パレット番号、'.'=透明、その他の文字は map で番号に変換）
  G.canvasFromRows = function (rows, scale, flip, map) {
    var w = rows[0].length, h = rows.length, x, y, ch, idx, last = -1;
    var cv = document.createElement('canvas');
    cv.width = w * scale; cv.height = h * scale;
    var c = cv.getContext('2d');
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        ch = rows[y].charAt(x);
        if (ch === '.' || ch === ' ') continue;
        idx = map ? map[ch] : (ch.charCodeAt(0) - 48);
        if (idx === undefined || idx === null || idx < 0) continue;
        if (idx !== last) { c.fillStyle = PAL[idx]; last = idx; }
        c.fillRect((flip ? (w - 1 - x) : x) * scale, y * scale, scale, scale);
      }
    }
    return cv;
  };
  G.draw = function (img, x, y, w, h) {
    if (w) ctx.drawImage(img, x | 0, y | 0, w, h);
    else ctx.drawImage(img, x | 0, y | 0);
  };

  var monCache = {}, tileCache = {}, miscCache = {};
  // モンスター（32x32）。flip=true で左右反転（自分側＝背面代わり）
  G.monSprite = function (sid, flip) {
    var key = sid + (flip ? 'f' : '');
    if (monCache[key]) return monCache[key];
    var sp = MM.MONSTERS[sid];
    var rows = MM.SPRITES.monsters[sp.sprite];
    monCache[key] = G.canvasFromRows(rows, 1, !!flip);
    return monCache[key];
  };
  // マップのタイル（16x16 を2倍の 32x32 にしたもの）
  G.tile = function (name) {
    if (tileCache[name]) return tileCache[name];
    tileCache[name] = G.canvasFromRows(MM.SPRITES.tiles[name], 2, false);
    return tileCache[name];
  };
  // 小物（miscグループ）。scale 倍で作る
  G.misc = function (name, scale) {
    var key = name + 'x' + scale;
    if (miscCache[key]) return miscCache[key];
    miscCache[key] = G.canvasFromRows(MM.SPRITES.misc[name], scale || 1, false);
    return miscCache[key];
  };

  // ---------- 文字 ----------
  var glyphCache = {};
  function isHalf(ch) {
    var c = ch.charCodeAt(0);
    return c < 0x100 || (c >= 0xFF61 && c <= 0xFF9F);
  }
  G.charWidth = function (ch, size) { return isHalf(ch) ? size / 2 : size; };
  G.textWidth = function (str, size) {
    size = size || 16;
    var w = 0, i;
    for (i = 0; i < str.length; i++) w += G.charWidth(str.charAt(i), size);
    return w;
  };
  function makeGlyph(ch, size, color) {
    var cv = document.createElement('canvas');
    // 字の入れ物は縦に余裕を持たせる（端末によって字の位置がずれても下が切れないように）
    cv.width = size; cv.height = Math.ceil(size * 1.5);
    var c = cv.getContext('2d', { willReadFrequently: true });
    c.font = size + 'px ' + FONT;
    // 'top' は端末（iPhone など）によって位置がずれて「モ」の下が切れたため、ベースライン（字の下端）を整数で固定する
    c.textBaseline = 'alphabetic';
    c.fillStyle = '#000';
    c.fillText(ch, 0, Math.round(size * 0.9655));
    var img = c.getImageData(0, 0, cv.width, cv.height), d = img.data, i;
    var hex = PAL[color];
    var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    for (i = 0; i < d.length; i += 4) {
      // 細い線が薄く描かれても消えないよう、しきい値は低め
      if (d[i + 3] >= 48) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
      else { d[i + 3] = 0; }
    }
    c.putImageData(img, 0, 0);
    return cv;
  }
  // 文字列を描く。戻り値＝描き終わりのx
  G.text = function (str, x, y, color, size) {
    size = size || 16;
    var i, ch, g, key;
    color = color === undefined ? 0 : color;
    for (i = 0; i < str.length; i++) {
      ch = str.charAt(i);
      if (ch !== ' ' && ch !== '\n') {
        key = size + '|' + color + '|' + ch;
        g = glyphCache[key];
        if (!g) { g = glyphCache[key] = makeGlyph(ch, size, color); }
        ctx.drawImage(g, x | 0, y | 0);
      }
      x += G.charWidth(ch, size);
    }
    return x;
  };
  G.textRight = function (str, rx, y, color, size) {
    G.text(str, rx - G.textWidth(str, size), y, color, size);
  };
  G.textCenter = function (str, cx, y, color, size) {
    G.text(str, cx - G.textWidth(str, size) / 2, y, color, size);
  };
  // フォントが後から読み込まれたら、字の絵を作り直す
  G.clearGlyphs = function () { glyphCache = {}; };
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener('loadingdone', G.clearGlyphs);
  }
  if (document.fonts && document.fonts.load) {
    try { document.fonts.load('16px "DotGothic16"', 'モルックあいう緑0123ABCabc').then(G.clearGlyphs, function () { /* 読めなくても続行 */ }); } catch (e) { /* 無視 */ }
  }

  // 折り返し。半角スペースで区切れるときはそこで改行する
  G.wrap = function (text, maxW, size) {
    size = size || 16;
    var out = [], paras = String(text).split('\n'), p, line, w, last, i, ch, cw, rest;
    for (p = 0; p < paras.length; p++) {
      line = ''; w = 0; last = -1;
      for (i = 0; i < paras[p].length; i++) {
        ch = paras[p].charAt(i);
        cw = G.charWidth(ch, size);
        if (w + cw > maxW && ch !== ' ') {
          if (last > 0) {
            out.push(line.substring(0, last));
            line = line.substring(last + 1);
          } else {
            out.push(line);
            line = '';
          }
          w = G.textWidth(line, size);
          last = line.lastIndexOf(' ');
        }
        line += ch; w += cw;
        if (ch === ' ') last = line.length - 1;
      }
      out.push(line);
    }
    return out;
  };

  // ---------- テキストボックス（1文字ずつ表示・Aで早送り→次へ） ----------
  // opts: { x, y, w, h, auto:自動で進めるまでのフレーム数(0=Aを待つ), lines:1画面の行数 }
  function TextBox(opts) {
    this.x = opts.x; this.y = opts.y; this.w = opts.w; this.h = opts.h;
    this.auto = opts.auto || 0;
    this.perScreen = opts.lines || 2;
    this.speed = opts.speed || 2;       // 何フレームで1文字出すか
    this.lines = [];
    this.top = 0; this.shown = 0; this.timer = 0; this.wait = 0;
    this.state = 'idle';
    this.blink = 0;
  }
  TextBox.prototype.say = function (text) {
    this.lines = G.wrap(text, this.w - 24, 16);
    this.top = 0; this.shown = 0; this.timer = 0; this.wait = 0;
    this.state = 'typing';
  };
  TextBox.prototype.screenChars = function () {
    var n = 0, i;
    for (i = this.top; i < this.top + this.perScreen && i < this.lines.length; i++) n += this.lines[i].length;
    return n;
  };
  // adv=true でAが押された。全部読み終わって次へ進んだら true を返す
  TextBox.prototype.update = function (adv) {
    this.blink++;
    if (this.state === 'typing') {
      if (adv) { this.shown = this.screenChars(); this.state = 'wait'; this.wait = 0; return false; }
      this.timer++;
      if (this.timer >= this.speed) {
        this.timer = 0; this.shown++;
        if (this.shown >= this.screenChars()) { this.state = 'wait'; this.wait = 0; }
      }
      return false;
    }
    if (this.state === 'wait') {
      this.wait++;
      if (adv || (this.auto && this.wait >= this.auto)) {
        if (this.top + this.perScreen < this.lines.length) {
          this.top += this.perScreen; this.shown = 0; this.state = 'typing'; this.timer = 0;
          return false;
        }
        this.state = 'end';
        return true;
      }
    }
    return false;
  };
  TextBox.prototype.moreLines = function () { return this.top + this.perScreen < this.lines.length; };
  TextBox.prototype.draw = function (noFrame) {
    if (!noFrame) G.box(this.x, this.y, this.w, this.h);
    var remain = this.shown, i, ln, n, ty = this.y + 11;
    for (i = this.top; i < this.top + this.perScreen && i < this.lines.length; i++) {
      ln = this.lines[i];
      n = Math.min(ln.length, remain);
      if (n > 0) G.text(ln.substring(0, n), this.x + 12, ty, 0);
      remain -= n;
      ty += 22;
    }
    if (this.state === 'wait' && !this.auto && ((this.blink >> 4) & 1) === 0) {
      G.arrowDown(this.x + this.w - 22, this.y + this.h - 16, 0);
    }
  };
  MM.TextBox = TextBox;

  // ---------- 画面効果（シャッター・フラッシュ） ----------
  // 中間色が出ないよう、半透明は使わず矩形だけで表現する
  var fx = MM.fx = { mode: 'none', t: 0, dur: 0, cb: null, closedFor: 0 };
  var SHUTTER = 14;
  fx.active = function () { return fx.mode === 'out' || fx.mode === 'in' || fx.mode === 'flash'; };
  fx.out = function (cb) { fx.mode = 'out'; fx.t = 0; fx.dur = SHUTTER; fx.cb = cb || null; };
  fx.in = function (cb) { fx.mode = 'in'; fx.t = 0; fx.dur = SHUTTER; fx.cb = cb || null; };
  fx.flash = function (cb) { fx.mode = 'flash'; fx.t = 0; fx.dur = 30; fx.cb = cb || null; };
  fx.update = function () {
    var cb;
    if (fx.mode === 'closed') {
      fx.closedFor++;
      if (fx.closedFor > 180) { fx.mode = 'none'; }   // 開け忘れ防止
      return;
    }
    if (!fx.active()) return;
    fx.t++;
    if (fx.t >= fx.dur) {
      cb = fx.cb; fx.cb = null;
      if (fx.mode === 'out') { fx.mode = 'closed'; fx.closedFor = 0; }
      else fx.mode = 'none';
      if (cb) cb();
    }
  };
  fx.draw = function () {
    var p, c, h;
    if (fx.mode === 'none') return;
    if (fx.mode === 'closed') { G.clear(0); return; }
    if (fx.mode === 'flash') {
      if (((fx.t >> 2) & 1) === 0) G.clear(3); else G.clear(0);
      return;
    }
    p = fx.t / fx.dur;
    if (fx.mode === 'in') p = 1 - p;
    h = Math.round(MM.H * p);
    for (c = 0; c < 10; c++) {
      if (c % 2 === 0) G.rect(c * 32, 0, 32, h, 0);
      else G.rect(c * 32, MM.H - h, 32, h, 0);
    }
  };
})();
