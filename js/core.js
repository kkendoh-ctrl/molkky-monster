// core.js : グローバル名前空間 MM・定数・パレット・乱数・ゲーム状態
// （ES modules は使わず、classic script で順に読み込む。file:// でも動く）
(function () {
  'use strict';
  var MM = window.MM = window.MM || {};

  MM.VERSION = '0.1.6';
  MM.W = 320;          // 論理解像度（ゲームボーイ 160x144 の2倍）
  MM.H = 288;
  MM.TILE = 32;        // タイル1マスの大きさ（論理px）
  MM.SAVE_KEY = 'molkkymon_green_save_v1';

  // 4色の緑パレット（これ以外の色は使わない）
  MM.PAL = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];

  // 設定（ライバルの名前はここ1か所で変えられる）
  MM.config = {
    rivalName: 'ライバル',
    playerName: '左手の勇者',
    encounterRate: 0.1   // 草むら1歩あたりの遭遇率
  };

  MM.DIRS = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 }
  };
  MM.OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

  // ---- 乱数・便利関数 ----
  MM.rnd = function (n) { return Math.floor(Math.random() * n); };   // 0〜n-1
  MM.chance = function (p) { return Math.random() < p; };
  MM.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  MM.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  // ---- ゲーム状態（セーブ対象） ----
  MM.state = null;
  MM.newState = function () {
    return {
      v: 1,
      map: 'house2f', x: 2, y: 2, dir: 'down',
      party: [],
      box: [],
      bag: { moluck: 5, potion: 3, superpotion: 0 },
      dex: {},                 // 図鑑 { 種族id: 1=みた, 2=つかまえた }
      flags: {},               // イベント進行フラグ
      play: 0,                 // プレイ時間（フレーム数）
      heal: { map: 'hamano', x: 15, y: 12, dir: 'left' }   // 全滅したとき戻る場所
    };
  };

  // 図鑑登録
  MM.dexSee = function (sid) {
    var d = MM.state.dex;
    if (!d[sid]) d[sid] = 1;
  };
  MM.dexCatch = function (sid) { MM.state.dex[sid] = 2; };

  // 手持ち全回復
  MM.healAll = function () {
    var p = MM.state.party, i, j, m, mv;
    for (i = 0; i < p.length; i++) {
      m = p[i];
      m.hp = m.maxHp;
      for (j = 0; j < m.moves.length; j++) {
        mv = MM.MOVES[m.moves[j].id];
        m.moves[j].pp = mv.pp;
      }
    }
  };

  // URL に ?debug=1 があるときだけ、捕獲結果の固定などのデバッグ機能を有効にする
  MM.debugMode = !!window.location && /[?&]debug=1(&|$)/.test(window.location.search || '');

  // デバッグ用フック（自動テストから読む）
  MM.debug = {
    timeScale: 1,        // 1フレームあたりの更新回数（テスト高速化用）
    noEncounter: false,  // true で草むらの遭遇を止める
    rig: null            // 'catchFail' / 'catchOk' で捕獲結果を固定
  };
})();
