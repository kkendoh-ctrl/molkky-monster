// chars.js : 人物ドット絵（16x16）。型紙の文字を、人ごとの色に置き換えて作る。
// 型紙の文字: o=ふち(濃) h=かみ s=はだ c=ふく k=ぼうし l=くつ・ズボン e=め(濃) .=透明
// 色は 0〜3 のパレット番号で指定する。
(function () {
  'use strict';
  var MM = window.MM;

  function mirror(half) {
    var r = '', i;
    for (i = half.length - 1; i >= 0; i--) r += half.charAt(i);
    return half + r;
  }
  function mir(arr) { return arr.map(mirror); }

  // ---- 正面（down）----
  var DOWN_HEAD = mir([
    '........', '.....ooo', '....ohhh', '...ohhhh', '...ohhhh', '...ohhss', '...osess', '...ossss', '....osss'
  ]);
  var BODY = mir(['..occccc', '..occccc', '..oscccc', '...okkkk']);
  var LEG_STAND = mir(['....ollo', '....ollo', '....oooo']);
  var DOWN_A = ['....olloollo....', '....ollo.oo.....', '....oooo........'];
  var DOWN_B = ['....olloollo....', '.....oo.ollo....', '........oooo....'];

  // ---- 背面（up）----
  var UP_HEAD = mir([
    '........', '.....ooo', '....ohhh', '...ohhhh', '...ohhhh', '...ohhhh', '...ohhhh', '...ohhhh', '....ohhh'
  ]);
  var UP_BODY = mir(['..occccc', '..occccc', '..occccc', '...okkkk']);

  // ---- 横向き（left。rightは左右反転）----
  var LEFT_HEAD = [
    '................', '.....oooooo.....', '....ohhhhhho....', '...ohhhhhhhho...', '...ohhhhhhhho...',
    '...osshhhhhho...', '...oesshhhhho...', '...osssshhho....', '....ossssho.....'
  ];
  var LEFT_BODY = ['.....occcco.....', '....occccco.....', '....osccccco....', '....osccccco....'];
  var LEFT_STAND = ['.....olllo......', '.....olllo......', '.....ooooo......'];
  var LEFT_A = ['....ollllo......', '....ollo.oll....', '....ooo...ooo...'];
  var LEFT_B = ['.....olllo......', '.....olo.olo....', '.....ooo.ooo....'];

  // 見た目の部品を差し替える（ぼうし・ながいかみ）
  function variant(rows, look, dir) {
    var r = rows.slice(), i;
    if (look.cap) {
      var to = (dir === 'up') ? 8 : 5;
      for (i = 1; i <= to; i++) r[i] = r[i].replace(/h/g, 'k');
      if (dir === 'down') r[5] = r[5].replace(/ss/g, 'ks').replace('ks', 'kk');
    }
    if (look.long) {
      if (dir === 'down') {
        r[6] = mirror('...ohess'); r[7] = mirror('...ohsss'); r[8] = mirror('....ohss');
      } else if (dir === 'left') {
        r[7] = '...ossshhhhho...'; r[8] = '....oshhhho.....';
      }
    }
    return r;
  }

  MM.LOOKS = {
    hero:    { h: 0, s: 3, c: 1, k: 2, l: 0, cap: true },
    mom:     { h: 1, s: 3, c: 2, k: 1, l: 1, long: true },
    hakase:  { h: 1, s: 3, c: 3, k: 2, l: 1 },
    rival:   { h: 0, s: 3, c: 2, k: 2, l: 1 },
    boy:     { h: 0, s: 3, c: 2, k: 1, l: 1 },
    girl:    { h: 1, s: 3, c: 3, k: 1, l: 1, long: true },
    oldman:  { h: 3, s: 2, c: 1, k: 3, l: 0 },
    camper:  { h: 1, s: 2, c: 2, k: 1, l: 1, cap: true },
    kenta:   { h: 0, s: 3, c: 3, k: 0, l: 1, cap: true },
    misaki:  { h: 1, s: 3, c: 1, k: 1, l: 1, long: true }
  };

  var cache = {};
  // look名 → { down:[立ち,歩きA,歩きB], up:[...], left:[...], right:[...] }（2倍の 32x32）
  MM.buildChar = function (name) {
    if (cache[name]) return cache[name];
    var look = MM.LOOKS[name] || MM.LOOKS.boy;
    var map = { o: 0, e: 0, h: look.h, s: look.s, c: look.c, k: look.k, l: look.l };
    var G = MM.gfx;
    function mk(rows, flip) { return G.canvasFromRows(rows, 2, flip, map); }
    var set = {};
    var dh = variant(DOWN_HEAD, look, 'down'), uh = variant(UP_HEAD, look, 'up'), lh = variant(LEFT_HEAD, look, 'left');
    set.down = [
      mk(dh.concat(BODY, LEG_STAND)), mk(dh.concat(BODY, DOWN_A)), mk(dh.concat(BODY, DOWN_B))
    ];
    set.up = [
      mk(uh.concat(UP_BODY, LEG_STAND)), mk(uh.concat(UP_BODY, DOWN_A)), mk(uh.concat(UP_BODY, DOWN_B))
    ];
    set.left = [
      mk(lh.concat(LEFT_BODY, LEFT_STAND)), mk(lh.concat(LEFT_BODY, LEFT_A)), mk(lh.concat(LEFT_BODY, LEFT_B))
    ];
    set.right = [
      mk(lh.concat(LEFT_BODY, LEFT_STAND), true), mk(lh.concat(LEFT_BODY, LEFT_A), true), mk(lh.concat(LEFT_BODY, LEFT_B), true)
    ];
    cache[name] = set;
    return set;
  };
})();
