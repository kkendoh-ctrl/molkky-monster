// moves.js : 技データ（16個＋むがむちゅう）
// effect: dmg=ダメージ / stat=能力変化 / heal=回復
(function () {
  'use strict';
  var MM = window.MM;

  MM.MOVES = {
    korogaru:   { id: 'korogaru', name: 'ころがる', type: 'normal', kind: 'dmg', power: 40, acc: 100, pp: 35, desc: 'からだを ころがして ぶつかる。' },
    nageru:     { id: 'nageru', name: 'なげる', type: 'normal', kind: 'dmg', power: 50, acc: 100, pp: 30, desc: 'あいてに むかって なげつける。' },
    taosu:      { id: 'taosu', name: 'たおす', type: 'normal', kind: 'dmg', power: 60, acc: 90, pp: 20, desc: 'いきおいよく あいてを たおす。' },
    shibakari:  { id: 'shibakari', name: 'シバかり', type: 'shiba', kind: 'dmg', power: 40, acc: 100, pp: 30, desc: 'しばを かって あいてに ぶつける。' },
    shibafu:    { id: 'shibafu', name: 'しばふスライド', type: 'shiba', kind: 'dmg', power: 65, acc: 95, pp: 15, desc: 'しばふの うえを すべって ぶつかる。' },
    tsuchikemuri: { id: 'tsuchikemuri', name: 'つちけむり', type: 'tsuchi', kind: 'stat', target: 'foe', stat: 'acc', stages: -1, acc: 100, pp: 20, desc: 'つちけむりで あいての めいちゅうを さげる。' },
    tsuchigatame: { id: 'tsuchigatame', name: 'つちかため', type: 'tsuchi', kind: 'stat', target: 'self', stat: 'def', stages: 1, acc: null, pp: 20, desc: 'つちを かためて じぶんの ぼうぎょを あげる。' },
    dorodango:  { id: 'dorodango', name: 'どろだんご', type: 'tsuchi', kind: 'dmg', power: 60, acc: 95, pp: 15, desc: 'どろだんごを なげつける。' },
    sunaarashi: { id: 'sunaarashi', name: 'すなあらし', type: 'suna', kind: 'dmg', power: 45, acc: 100, pp: 30, desc: 'すなを まきあげて あいてを おそう。' },
    sunahama:   { id: 'sunahama', name: 'すなはま', type: 'suna', kind: 'dmg', power: 65, acc: 95, pp: 15, desc: 'すなはまの なみで あいてを のみこむ。' },
    oikaze:     { id: 'oikaze', name: 'おいかぜ', type: 'kaze', kind: 'stat', target: 'self', stat: 'spd', stages: 1, acc: null, pp: 20, desc: 'おいかぜを うけて じぶんの すばやさを あげる。' },
    mukaikaze:  { id: 'mukaikaze', name: 'むかいかぜ', type: 'kaze', kind: 'dmg', power: 50, acc: 100, pp: 25, desc: 'つよい むかいかぜで あいてを おしもどす。' },
    kazekiri:   { id: 'kazekiri', name: 'かぜきり', type: 'kaze', kind: 'dmg', power: 40, acc: 100, pp: 30, desc: 'かぜを きって つっこむ。' },
    foult:      { id: 'foult', name: 'フォールト', type: 'normal', kind: 'stat', target: 'foe', stat: 'atk', stages: -1, acc: 100, pp: 20, desc: 'はんそくを とって あいての こうげきを さげる。' },
    tatenaoshi: { id: 'tatenaoshi', name: 'たてなおし', type: 'normal', kind: 'heal', frac: 0.5, acc: null, pp: 5, desc: 'たおれた ところから たてなおして HPを はんぶん かいふく。' },
    pittari50:  { id: 'pittari50', name: 'ぴったりごじゅう', type: 'normal', kind: 'dmg', power: 90, acc: 70, pp: 5, desc: 'ぴったり 50てんを ねらう ひっさつの いちげき。（ゴジュッテン せんよう）' },
    // 全部のPPがなくなったときの技（一覧には出ない）
    struggle:   { id: 'struggle', name: 'むがむちゅう', type: 'normal', kind: 'dmg', power: 40, acc: null, pp: 1, recoil: 0.25, desc: 'なりふり かまわず ぶつかる。' }
  };
})();
