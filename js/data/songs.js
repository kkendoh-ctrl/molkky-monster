// songs.js : BGM の曲データ（すべてオリジナル。音のファイルは使わず、bgm.js がその場で音を作る）
//
// 書き方（1小節 = 16ステップ = 16分音符16個。4/4拍子）
//   音の列  : 'G4:2 C5:2 E5:4' のように「音名オクターブ:長さ(ステップ数)」を空白で並べる。
//             半音は # と b（例 F#5, Bb5）。休符は 'r:長さ'。小節の区切りに '|' を入れてよい（読み飛ばす）。
//   drum    : 'k.h.s.h.' のように1文字=1ステップ。k=低い音 s=中くらい h=短く高い音 .=なし
//   lead    : メロディ（矩形波）  harm : ハモリ（細い矩形波）  bass : ベース（三角波）
//   bars    : 小節数（各パートはちょうど bars*16 ステップにする。ずれると bgm.js が警告を出す）
//   loop    : false のときは1回だけ鳴らす（勝利ファンファーレ）
//   cutIn   : true の曲は、鳴っている「ループなし」の曲（ファンファーレ）を途中で切って始められる
(function () {
  'use strict';
  var MM = window.MM;

  // ---- 書きやすくするための小さな部品 ----
  function bars(list) { return list.join(' | '); }
  // ハモリ：休符をはさんだ裏拍の刻み（a と b を交互に）
  function stab(a, b) { return 'r:2 ' + a + ':2 r:2 ' + b + ':2 r:2 ' + a + ':2 r:2 ' + b + ':2'; }
  // ハモリ：和音の分散（a b c b a b c b）
  function arp(a, b, c) { return a + ':2 ' + b + ':2 ' + c + ':2 ' + b + ':2 ' + a + ':2 ' + b + ':2 ' + c + ':2 ' + b + ':2'; }
  // 半小節ずつ別の和音にするとき用（arp の半分）
  function arpHalf(a, b, c) { return a + ':2 ' + b + ':2 ' + c + ':2 ' + b + ':2'; }
  // ベース：根音(r)と5度(v)を4分音符で
  function bassQ(r, v) { return r + ':4 ' + v + ':4 ' + r + ':4 ' + v + ':4'; }
  // ベース：はねる8分（根音と5度）
  function bassHop(r, v) { return r + ':2 r:2 ' + v + ':2 r:2 ' + r + ':2 r:2 ' + v + ':2 r:2'; }
  // ベース：走る8分（根音を刻み、ときどき1オクターブ上 R）
  function bassRun(r, R) { return r + ':2 ' + r + ':2 ' + R + ':2 ' + r + ':2 ' + r + ':2 ' + r + ':2 ' + R + ':2 ' + r + ':2'; }
  function rep(s, n) { var o = [], i; for (i = 0; i < n; i++) o.push(s); return o; }

  MM.songs = {

    // ---------------------------------------------------------------
    // タイトル：ハ長調・テンポ112。明るく少し行進曲っぽい（8小節）
    // ---------------------------------------------------------------
    title: {
      name: 'タイトル', bpm: 112, bars: 8, loop: true, cutIn: true,
      lead: bars([
        'G4:2 C5:2 E5:4 G5:4 E5:2 C5:2',
        'B4:2 E5:2 G5:4 B5:4 G5:4',
        'A4:2 C5:2 F5:4 E5:2 D5:2 C5:4',
        'D5:4 G5:4 F5:2 E5:2 D5:4',
        'E5:2 A5:2 G5:2 E5:2 C5:4 E5:4',
        'F5:4 A5:4 G5:2 F5:2 E5:2 D5:2',
        'D5:4 F5:4 B4:4 D5:4',
        'C5:6 r:2 E5:4 G4:4'
      ]),
      harm: bars([
        stab('E4', 'G4'), stab('G4', 'B4'), stab('A4', 'C5'), stab('B4', 'D5'),
        stab('C5', 'E5'), stab('A4', 'C5'),
        'F4:2 r:2 A4:2 r:2 B4:2 r:2 D5:2 r:2',
        stab('E4', 'G4')
      ]),
      bass: bars([
        bassQ('C3', 'G3'), bassQ('E3', 'B3'), bassQ('F3', 'C4'), bassQ('G3', 'D4'),
        bassQ('A2', 'E3'), bassQ('F3', 'C4'),
        'D3:4 A3:4 G3:4 D4:4',
        bassQ('C3', 'G3')
      ]),
      drum: bars(rep('k.h.s.h.k.h.s.h.', 7).concat(['k.h.s.h.k.h.ssss']))
    },

    // ---------------------------------------------------------------
    // まち（研究所・家の中も共通）：ト長調・テンポ96。のんびりやさしい（16小節）
    // ---------------------------------------------------------------
    town: {
      name: 'まち', bpm: 96, bars: 16, loop: true,
      lead: bars([
        // A（8小節）
        'B4:4 D5:4 G5:6 F#5:2',
        'E5:4 D5:2 B4:2 G4:8',
        'C5:4 E5:4 G5:4 E5:2 C5:2',
        'D5:4 F#5:4 A4:4 D5:4',
        'B4:2 D5:2 G5:4 D5:4 B4:4',
        'D5:4 F#5:4 B5:4 A5:2 F#5:2',
        'E5:4 C5:4 A4:4 C5:4',
        'D5:4 E5:2 F#5:2 A5:6 r:2',
        // B（8小節）
        'E5:6 D5:2 C5:4 G4:4',
        'B4:4 G4:4 D5:8',
        'C5:4 E5:4 A5:8',
        'A5:4 F#5:4 D5:4 F#5:4',
        'G5:6 F#5:2 E5:4 B4:4',
        'C5:2 D5:2 E5:4 G5:4 E5:4',
        'A4:4 C5:4 D5:4 F#5:4',
        'G5:8 D5:4 r:4'
      ]),
      harm: bars([
        arp('B3', 'D4', 'G4'), arp('B3', 'E4', 'G4'), arp('C4', 'E4', 'G4'), arp('A3', 'D4', 'F#4'),
        arp('B3', 'D4', 'G4'), arp('B3', 'D4', 'F#4'), arp('C4', 'E4', 'A4'), arp('A3', 'D4', 'F#4'),
        arp('C4', 'E4', 'G4'), arp('B3', 'D4', 'G4'), arp('C4', 'E4', 'A4'), arp('A3', 'D4', 'F#4'),
        arp('B3', 'E4', 'G4'), arp('C4', 'E4', 'G4'),
        arpHalf('C4', 'E4', 'A4') + ' ' + arpHalf('A3', 'D4', 'F#4'),
        arp('B3', 'D4', 'G4')
      ]),
      bass: bars([
        bassHop('G3', 'D4'), bassHop('E3', 'B3'), bassHop('C3', 'G3'), bassHop('D3', 'A3'),
        bassHop('G3', 'D4'), bassHop('B2', 'F#3'), bassHop('A2', 'E3'), bassHop('D3', 'A3'),
        bassHop('C3', 'G3'), bassHop('G3', 'D4'), bassHop('A2', 'E3'), bassHop('D3', 'A3'),
        bassHop('E3', 'B3'), bassHop('C3', 'G3'),
        'A2:2 r:2 E3:2 r:2 D3:2 r:2 A3:2 r:2',
        bassHop('G3', 'D4')
      ]),
      drum: bars(rep('k...h...k...h...', 16))
    },

    // ---------------------------------------------------------------
    // 1ばんどうろ：ニ長調（ミクソリディア風）・テンポ132。元気に歩く（16小節）
    // ---------------------------------------------------------------
    route: {
      name: '1ばんどうろ', bpm: 132, bars: 16, loop: true,
      lead: bars([
        // A（8小節）
        'D5:2 F#5:2 A5:2 F#5:2 D5:2 F#5:2 A5:4',
        'C5:2 E5:2 G5:2 E5:2 C5:2 E5:2 G5:4',
        'B4:2 D5:2 G5:2 D5:2 B4:2 D5:2 G5:4',
        'A5:4 F#5:2 D5:2 E5:4 D5:4',
        'B4:2 D5:2 F#5:2 D5:2 B4:2 D5:2 F#5:2 B5:2',
        'G5:4 B5:4 A5:2 G5:2 F#5:4',
        'E5:2 A5:2 C#6:4 B5:2 A5:2 E5:4',
        'A5:8 r:2 E5:2 A5:4',
        // B（8小節）
        'F#5:3 F#5:3 A5:2 r:2 D6:6',
        'E5:3 E5:3 G5:2 r:2 C6:6',
        'D5:3 D5:3 G5:2 r:2 B5:6',
        'A5:3 A5:3 F#5:2 r:2 D5:6',
        'D5:2 F#5:2 B5:4 A5:2 F#5:2 D5:4',
        'B5:2 A5:2 G5:4 D5:2 E5:2 G5:4',
        'A5:4 G5:2 F#5:2 E5:4 C#5:4',
        'E5:4 C#5:4 E5:4 A4:4'
      ]),
      harm: bars([
        // A
        stab('F#4', 'A4'), stab('E4', 'G4'), stab('B3', 'D4'), stab('F#4', 'A4'),
        stab('D4', 'F#4'), stab('B3', 'D4'), stab('C#4', 'E4'), stab('C#4', 'E4'),
        // B
        stab('F#4', 'A4'), stab('E4', 'G4'), stab('B3', 'D4'), stab('F#4', 'A4'),
        stab('D4', 'F#4'), stab('B3', 'D4'), stab('C#4', 'E4'), stab('C#4', 'E4')
      ]),
      bass: bars([
        bassRun('D3', 'D4'), bassRun('C3', 'C4'), bassRun('G2', 'G3'), bassRun('D3', 'D4'),
        bassRun('B2', 'B3'), bassRun('G2', 'G3'), bassRun('A2', 'A3'), bassRun('A2', 'A3'),
        bassRun('D3', 'D4'), bassRun('C3', 'C4'), bassRun('G2', 'G3'), bassRun('D3', 'D4'),
        bassRun('B2', 'B3'), bassRun('G2', 'G3'), bassRun('A2', 'A3'), bassRun('A2', 'A3')
      ]),
      drum: bars(rep('k.h.s.h.k.k.s.h.', 15).concat(['k.h.s.h.k.ksksss']))
    },

    // ---------------------------------------------------------------
    // バトル（野生・トレーナー共通）：ホ短調・テンポ156。せまる感じの16分の刻み（12小節）
    // ---------------------------------------------------------------
    battle: {
      name: 'バトル', bpm: 156, bars: 12, loop: true, cutIn: true,
      lead: bars([
        'E5:2 E5:1 G5:1 B5:2 G5:2 E5:2 G5:1 B5:1 E6:4',
        'D6:2 B5:2 G5:2 B5:2 A5:2 G5:2 E5:4',
        'C6:2 G5:2 E5:2 G5:2 C6:2 G5:2 E5:1 G5:1 C6:2',
        'D6:2 A5:2 F#5:2 A5:2 D6:4 C#6:2 D6:2',
        'E5:2 E5:1 G5:1 B5:2 G5:2 E5:2 G5:1 B5:1 E6:4',
        'B5:2 G5:2 B5:2 E6:2 D6:4 B5:4',
        'C6:2 G5:2 E5:2 G5:2 C6:2 G5:2 E5:1 G5:1 C6:2',
        'B5:2 D#6:2 F#6:2 D#6:2 B5:4 r:2 F#5:2',
        // B（4小節）
        'A5:4 C6:4 E6:4 C6:2 A5:2',
        'G5:4 C6:4 E6:4 G6:4',
        'F#5:2 A5:2 D6:2 F#6:2 E6:4 D6:4',
        'D#6:2 F#6:2 B5:4 F#6:2 D#6:2 B5:4'
      ]),
      harm: bars([
        stab('G4', 'B4'), stab('G4', 'B4'), stab('E4', 'G4'), stab('F#4', 'A4'),
        stab('G4', 'B4'), stab('G4', 'B4'), stab('E4', 'G4'), stab('D#4', 'F#4'),
        stab('C4', 'E4'), stab('E4', 'G4'), stab('F#4', 'A4'), stab('D#4', 'F#4')
      ]),
      bass: bars([
        bassRun('E3', 'E4'), bassRun('E3', 'E4'), bassRun('C3', 'C4'), bassRun('D3', 'D4'),
        bassRun('E3', 'E4'), bassRun('E3', 'E4'), bassRun('C3', 'C4'), bassRun('B2', 'B3'),
        bassRun('A2', 'A3'), bassRun('C3', 'C4'), bassRun('D3', 'D4'), bassRun('B2', 'B3')
      ]),
      drum: bars(rep('k.h.s.h.k.k.s.hs', 12))
    },

    // ---------------------------------------------------------------
    // 勝利ファンファーレ：ヘ長調・テンポ152。1回だけ鳴る（3小節）
    // ---------------------------------------------------------------
    victory: {
      name: 'しょうり', bpm: 152, bars: 3, loop: false,
      lead: bars([
        'F5:2 A5:2 C6:4 A5:2 C6:2 F6:4',
        'D6:4 Bb5:4 E6:4 C6:4',
        'F6:12 r:4'
      ]),
      harm: bars([
        arp('A4', 'C5', 'F5'),
        'D5:2 F5:2 D5:2 F5:2 E5:2 G5:2 E5:2 G5:2',
        'A5:12 r:4'
      ]),
      bass: bars([
        bassQ('F3', 'C4'),
        'Bb2:4 F3:4 C3:4 G3:4',
        'F3:12 r:4'
      ]),
      drum: bars(['k.h.s.h.k.k.ssss', 'k.h.s.h.k.k.ssss', 'k...............'])
    }
  };

  // 場面ごとの曲の割り当て（マップID → 曲ID。ここにないマップは 'town'）
  MM.songOfMap = {
    hamano: 'town', house1f: 'town', house2f: 'town', lab: 'town',
    route1: 'route'
  };
})();
