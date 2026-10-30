// maps.js : マップ（タイル文字の並び）・NPC・出入口・イベントの引き金
// 各マップは文字列配列 tiles で表す。文字の意味は MM.TILEDEF を見ること。
(function () {
  'use strict';
  var MM = window.MM;

  // タイル文字 → { art:絵の名前, solid:通れない, enc:草むら(遭遇), ledge:段差(下にだけ降りられる) }
  MM.TILEDEF = {
    '.': { art: 'grass' },
    'g': { art: 'tallgrass', enc: true },
    '_': { art: 'path' },
    'T': { art: 'tree', solid: true },
    'F': { art: 'flower' },
    'f': { art: 'fence', solid: true },
    'S': { art: 'sign', solid: true },
    'L': { art: 'ledge', ledge: true },
    'r': { art: 'roof', solid: true },
    'R': { art: 'roof2', solid: true },
    'w': { art: 'wall', solid: true },
    'W': { art: 'window', solid: true },
    'D': { art: 'door' },
    't': { art: 'tent', solid: true },
    'u': { art: 'tentdoor', solid: true },
    'a': { art: 'water', solid: true },
    'i': { art: 'floor' },
    'I': { art: 'iwall', solid: true },
    'b': { art: 'bed', solid: true },
    'h': { art: 'shelf', solid: true },
    'v': { art: 'tv', solid: true },
    'k': { art: 'table', solid: true },
    'e': { art: 'stairs' },
    'm': { art: 'mat' },
    'P': { art: 'pc', solid: true },
    'o': { art: 'pedestal', solid: true },
    'x': { art: 'plant', solid: true }
  };

  var notStarter = function (f) { return !f.gotStarter; };
  var notRival2 = function (f) { return !f.rival2Done; };

  MM.maps = {
    // ---------------- ハマノまち ----------------
    hamano: {
      name: 'ハマノまち',
      tiles: [
        'TTTTTTTTT__TTTTTTTTT',
        'T........__........T',
        'T..FF...S__....FF..T',
        'T..rrrr..__.RRRRR..T',
        'T..rrrr..__.RRRRR..T',
        'T..wWDw..__.wWDWw..T',
        'T..FS__________S.F.T',
        'T........__........T',
        'T........__........T',
        'T........__........T',
        'T........__..tttt..T',
        'T........__..tuut..T',
        'T........__........T',
        'T..aaa.............T',
        'T..................T',
        'TTTTTTTTTTTTTTTTTTTT'
      ],
      warps: [
        { x: 5, y: 5, to: 'house1f', tx: 3, ty: 4, dir: 'up' },
        { x: 14, y: 5, to: 'lab', tx: 5, ty: 6, dir: 'up' },
        { x: 9, y: 0, to: 'route1', tx: 9, ty: 28, dir: 'up' },
        { x: 10, y: 0, to: 'route1', tx: 10, ty: 28, dir: 'up' }
      ],
      signs: [
        { x: 4, y: 6, text: MM.config.playerName + 'の いえ' },
        { x: 15, y: 6, text: 'モルックハカセの けんきゅうじょ' },
        { x: 8, y: 2, text: 'ここは ハマノまち。\nきたへ すすむと 1ばんどうろ。' }
      ],
      triggers: [
        { x: [9, 10], y: 1, cond: notStarter, script: 'hakaseStop' }
      ],
      npcs: [
        { id: 'girl', x: 7, y: 9, dir: 'down', look: 'girl', script: 'townGirl' },
        { id: 'oldman', x: 12, y: 8, dir: 'left', look: 'oldman', script: 'townOldman' },
        { id: 'boy', x: 4, y: 11, dir: 'right', look: 'boy', script: 'townBoy' },
        { id: 'camper', x: 14, y: 12, dir: 'up', look: 'camper', script: 'tentHeal' }
      ]
    },

    // ---------------- 主人公の家 1階 ----------------
    house1f: {
      name: MM.config.playerName + 'の いえ 1かい',
      tiles: [
        'IIIIIIII',
        'IhhivieI',
        'IiiiiiiI',
        'IiikkiiI',
        'IiiiiiiI',
        'IIImIIII'
      ],
      warps: [
        { x: 3, y: 5, to: 'hamano', tx: 5, ty: 6, dir: 'down' },
        { x: 6, y: 1, to: 'house2f', tx: 5, ty: 2, dir: 'down' }
      ],
      signs: [
        { x: 1, y: 1, text: 'ほんだなには モルックの ほんが ぎっしり。\n「ぼうの もちかた いろは」' },
        { x: 2, y: 1, text: 'モルックの かいすう きろくが かいてある。' },
        { x: 4, y: 1, text: 'テレビでは モルックの たいかいが うつっている。' },
        { x: 3, y: 3, text: 'テーブルには ごはんが ならんでいる。\nいい においが する。' },
        { x: 4, y: 3, text: 'テーブルには ごはんが ならんでいる。\nいい においが する。' }
      ],
      triggers: [],
      npcs: [
        { id: 'mom', x: 5, y: 3, dir: 'left', look: 'mom', script: 'mom' }
      ]
    },

    // ---------------- 主人公の家 2階 ----------------
    house2f: {
      name: MM.config.playerName + 'の いえ 2かい',
      tiles: [
        'IIIIIII',
        'IbhiveI',
        'IiiiiiI',
        'IiiiiiI',
        'IIIIIII'
      ],
      warps: [
        { x: 5, y: 1, to: 'house1f', tx: 6, ty: 2, dir: 'down' }
      ],
      signs: [
        { x: 1, y: 1, text: MM.config.playerName + 'の ベッドだ。\nモルックの ゆめを みた きがする。' },
        { x: 2, y: 1, text: 'モルックの ざっしが ならんでいる。' },
        { x: 4, y: 1, text: 'モルックの ビデオが とまっている。' }
      ],
      triggers: [],
      npcs: []
    },

    // ---------------- モルックハカセの けんきゅうじょ ----------------
    lab: {
      name: 'けんきゅうじょ',
      tiles: [
        'IIIIIIIIII',
        'IhhhiiiPiI',
        'IiiiiiiiiI',
        'IiioioioiI',
        'IiiiiiiiiI',
        'IiiiiiiiiI',
        'IiiiiiiiiI',
        'IIIIImIIII'
      ],
      warps: [
        { x: 5, y: 7, to: 'hamano', tx: 14, ty: 6, dir: 'down' }
      ],
      signs: [
        { x: 1, y: 1, text: 'モルモンの けんきゅうしょが ぎっしり。' },
        { x: 2, y: 1, text: 'モルックの るいけいデータが ならんでいる。' },
        { x: 3, y: 1, text: 'スキットルの かたちを しらべた ほんだ。' }
      ],
      // スターターの台とPCは objects（話しかけて動くもの）で扱う
      objects: [
        { x: 3, y: 3, script: 'pedestal', mon: 'shibamoru' },
        { x: 5, y: 3, script: 'pedestal', mon: 'tsuchipin' },
        { x: 7, y: 3, script: 'pedestal', mon: 'sunabou' },
        { x: 7, y: 1, script: 'labPC' }
      ],
      onEnter: 'labEnter',
      triggers: [],
      npcs: [
        { id: 'hakase', x: 5, y: 2, dir: 'down', look: 'hakase', script: 'hakase' },
        { id: 'rival1', x: 8, y: 5, dir: 'left', look: 'rival', script: 'rivalLab', hideIf: 'rival1Done' }
      ]
    },

    // ---------------- 1ばんどうろ ----------------
    route1: {
      name: '1ばんどうろ',
      tiles: [
        'TTTTTTTTTTTTTTTTTTTT',
        'Tffffffff_SffffffffT',
        'T........__........T',
        'T..FF....__....FF..T',
        'T........__........T',
        'TTTTTTTTT__TTTTTTTTT',
        'TTTTTTTTT__TTTTTTTTT',
        'T........__........T',
        'T..gggg..__..gggg..T',
        'T..gggg..__..gggg..T',
        'T..gggg..__..gggg..T',
        'TTTTTTTTT__TTTTTTTTT',
        'T........__........T',
        'T.LLLLLL.__........T',
        'T...ggg..__..ggg...T',
        'T...ggg..__..ggg...T',
        'T...ggg..__..ggg...T',
        'TTTTTTTTT__TTTTTTTTT',
        'T........__........T',
        'T..FF....__....FF..T',
        'T.ggggggg__ggggggg.T',
        'T.ggggggg__ggggggg.T',
        'T........__........T',
        'T........__........T',
        'T........__........T',
        'T........__........T',
        'T........__........T',
        'T.......S__........T',
        'T........__........T',
        'TTTTTTTTT__TTTTTTTTT'
      ],
      warps: [
        { x: 9, y: 29, to: 'hamano', tx: 9, ty: 1, dir: 'up' },
        { x: 10, y: 29, to: 'hamano', tx: 10, ty: 1, dir: 'up' }
      ],
      signs: [
        { x: 10, y: 1, text: 'この さきは まだ みちが つづいていない。\nv0.1は ここまで！' },
        { x: 8, y: 27, text: '1ばんどうろ\nくさむらに はいると モルモンが とびだすぞ！' }
      ],
      triggers: [
        { x: [9, 10], y: 6, cond: notRival2, script: 'rival2' }
      ],
      encounters: [
        { id: 'skitten', w: 45, min: 3, max: 5 },
        { id: 'carli', w: 25, min: 3, max: 5 },
        { id: 'fault', w: 20, min: 3, max: 5 },
        { id: 'nijugo', w: 8, min: 3, max: 5 },
        { id: 'gojuten', w: 2, min: 4, max: 5 }
      ],
      npcs: [
        { id: 'rest1', x: 5, y: 26, dir: 'right', look: 'camper', script: 'tentHeal' },
        { id: 'rival2', x: 9, y: 3, dir: 'down', look: 'rival', script: 'rivalRoute', hideIf: 'rival2Done' },
        { id: 'misaki', x: 10, y: 11, dir: 'left', look: 'misaki', trainer: 'misaki', sight: 3, flag: 'tr_misaki' },
        { id: 'kenta', x: 9, y: 17, dir: 'right', look: 'kenta', trainer: 'kenta', sight: 3, flag: 'tr_kenta' },
        { id: 'item_a', x: 2, y: 12, dir: 'down', item: { id: 'superpotion', n: 1 }, hideIf: 'item_item_a' },
        { id: 'item_b', x: 17, y: 25, dir: 'down', item: { id: 'moluck', n: 2 }, hideIf: 'item_item_b' }
      ]
    }
  };
})();
