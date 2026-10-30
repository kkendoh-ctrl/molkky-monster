// types.js : タイプ（5種）と相性表。表データなので後から増やせる。
(function () {
  'use strict';
  var MM = window.MM;

  MM.TYPE_NAMES = {
    shiba: 'シバ',
    tsuchi: 'ツチ',
    suna: 'スナ',
    kaze: 'カゼ',
    normal: 'ノーマル'
  };

  // 攻撃タイプ → 防御タイプ → 倍率（書いていない組み合わせは ×1）
  // 三すくみ：シバ→ツチ→スナ→シバ（芝は土をおおう／土は砂を固める／砂は芝を埋める）。カゼは砂を吹き飛ばす。
  MM.TYPE_CHART = {
    shiba: { shiba: 0.5, tsuchi: 2, suna: 0.5 },
    tsuchi: { shiba: 0.5, suna: 2 },
    suna: { shiba: 2, tsuchi: 0.5, kaze: 0.5 },
    kaze: { suna: 2 },
    normal: {}
  };

  MM.typeMul = function (att, def) {
    var row = MM.TYPE_CHART[att];
    if (!row) return 1;
    var v = row[def];
    return v === undefined ? 1 : v;
  };
})();
