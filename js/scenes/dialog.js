// dialog.js : 会話ウィンドウ（1文字ずつ表示。Aで早送り→次へ。選択肢つきも作れる）
(function () {
  'use strict';
  var MM = window.MM, G = MM.gfx, I = MM.input;

  function Dialog(text, choices) {
    this.name = 'dialog';
    this.opaque = false;
    this.done = false;
    this.result = 0;
    this.tb = new MM.TextBox({ x: 0, y: 212, w: MM.W, h: 76, lines: 2 });
    this.tb.say(text);
    this.choices = choices || null;
    this.sel = 0;
    this.phase = 'text';
  }
  Dialog.prototype.finish = function () {
    this.done = true;
    MM.remove(this);
  };
  Dialog.prototype.update = function () {
    var n;
    if (this.phase === 'text') {
      if (this.tb.update(I.pressed.a)) {
        if (this.choices) { this.phase = 'choose'; this.sel = 0; }
        else this.finish();
      }
      return;
    }
    n = this.choices.length;
    if (I.pressed.up) this.sel = (this.sel + n - 1) % n;
    if (I.pressed.down) this.sel = (this.sel + 1) % n;
    if (I.pressed.a) { this.result = this.sel; this.finish(); }
    else if (I.pressed.b) { this.result = n - 1; this.finish(); }
  };
  Dialog.prototype.draw = function () {
    var i, w, h, x, y, maxw = 0;
    this.tb.draw();
    if (this.phase === 'choose') {
      for (i = 0; i < this.choices.length; i++) maxw = Math.max(maxw, G.textWidth(this.choices[i]));
      w = maxw + 44; h = this.choices.length * 24 + 16;
      x = MM.W - w - 6; y = 212 - h - 4;
      G.box(x, y, w, h);
      for (i = 0; i < this.choices.length; i++) {
        G.text(this.choices[i], x + 30, y + 10 + i * 24, 0);
        if (i === this.sel) G.cursor(x + 14, y + 14 + i * 24);
      }
    }
  };

  // スクリプトから使う入口
  MM.dlg = {
    say: function (text) {
      var d = new Dialog(text, null);
      MM.push(d);
      return d;
    },
    ask: function (text, choices) {
      var d = new Dialog(text, choices);
      MM.push(d);
      return d;
    }
  };
  MM.scenes = MM.scenes || {};
  MM.scenes.Dialog = Dialog;
})();
