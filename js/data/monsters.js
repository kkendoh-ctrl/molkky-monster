// monsters.js : モルモン図鑑（9体）とモルモンの作成・能力計算
(function () {
  'use strict';
  var MM = window.MM;

  // base: HP / こうげき / ぼうぎょ / すばやさ
  // learn: [覚えるレベル, 技id] / evolvesTo・evolveLevel は v0.1 では使わない（欄だけ用意）
  MM.MONSTERS = {
    shibamoru: {
      no: 1, name: 'シバモル', type: 'shiba', sprite: 'shibamoru',
      base: { hp: 45, atk: 49, def: 49, spd: 45 }, baseExp: 64, catchRate: 45,
      learn: [[1, 'korogaru'], [1, 'shibakari'], [3, 'tsuchigatame'], [7, 'shibafu'], [11, 'tatenaoshi']],
      evolvesTo: null, evolveLevel: null,
      desc: 'しばふの うえの モルックぼうが\nいのちを もった すがた。\nあたまの しばは きげんの めじるし。',
      where: 'けんきゅうじょ'
    },
    tsuchipin: {
      no: 2, name: 'ツチピン', type: 'tsuchi', sprite: 'tsuchipin',
      base: { hp: 44, atk: 48, def: 52, spd: 43 }, baseExp: 64, catchRate: 45,
      learn: [[1, 'korogaru'], [1, 'tsuchikemuri'], [3, 'dorodango'], [7, 'tsuchigatame'], [11, 'tatenaoshi']],
      evolvesTo: null, evolveLevel: null,
      desc: 'つちに ささった スキットルが\nめざめた すがた。ななめの かおに\nじぶんの ばんごうが かいてある。',
      where: 'けんきゅうじょ'
    },
    sunabou: {
      no: 3, name: 'スナボウ', type: 'suna', sprite: 'sunabou',
      base: { hp: 43, atk: 52, def: 43, spd: 51 }, baseExp: 64, catchRate: 45,
      learn: [[1, 'korogaru'], [1, 'sunaarashi'], [3, 'foult'], [7, 'sunahama'], [11, 'tatenaoshi']],
      evolvesTo: null, evolveLevel: null,
      desc: 'すなはまで なげられた モルックぼうが\nとぶのが だいすきな すがた。\nすなけむりを のこして とびまわる。',
      where: 'けんきゅうじょ'
    },
    skitten: {
      no: 4, name: 'スキットン', type: 'normal', sprite: 'skitten',
      base: { hp: 40, atk: 40, def: 40, spd: 45 }, baseExp: 50, catchRate: 200,
      learn: [[1, 'korogaru'], [4, 'nageru'], [8, 'taosu']],
      evolvesTo: null, evolveLevel: null,
      desc: '1から 12までの ばんごうふだを つけた\nちいさな ピン。\nくさむらに いちばん たくさん いる。',
      where: '1ばんどうろ（よくでる）'
    },
    carli: {
      no: 5, name: 'カーリ', type: 'tsuchi', sprite: 'carli',
      base: { hp: 45, atk: 45, def: 55, spd: 30 }, baseExp: 55, catchRate: 150,
      learn: [[1, 'korogaru'], [1, 'tsuchikemuri'], [6, 'dorodango'], [10, 'tsuchigatame']],
      evolvesTo: null, evolveLevel: null,
      desc: 'モルッカーリ（なげる わく）が\nモルモンに なった すがた。\nまえの ぼうと 45どの うでが じまん。',
      where: '1ばんどうろ（ふつう）'
    },
    fault: {
      no: 6, name: 'フォルト', type: 'kaze', sprite: 'fault',
      base: { hp: 35, atk: 45, def: 35, spd: 60 }, baseExp: 55, catchRate: 150,
      learn: [[1, 'kazekiri'], [1, 'foult'], [5, 'oikaze'], [8, 'mukaikaze']],
      evolvesTo: null, evolveLevel: null,
      desc: 'フォールト（はんそく）の おばけ。\nはたを ふって「はんそく！」と\nさけぶ。 ふみこすと よろこぶ。',
      where: '1ばんどうろ（ふつう）'
    },
    nijugo: {
      no: 7, name: 'ニジュウゴ', type: 'normal', sprite: 'nijugo',
      base: { hp: 55, atk: 40, def: 40, spd: 35 }, baseExp: 70, catchRate: 90,
      learn: [[1, 'korogaru'], [1, 'foult'], [7, 'tatenaoshi'], [10, 'taosu']],
      evolvesTo: null, evolveLevel: null,
      desc: '50てんを こえて 25てんに もどされた\nかなしみから うまれた モルモン。\nいつも あまぐもと いっしょ。',
      where: '1ばんどうろ（まれ）'
    },
    yokonage: {
      no: 8, name: 'ヨコナゲ', type: 'kaze', sprite: 'yokonage',
      base: { hp: 45, atk: 55, def: 40, spd: 65 }, baseExp: 65, catchRate: 120,
      learn: [[1, 'kazekiri'], [1, 'nageru'], [6, 'oikaze'], [9, 'mukaikaze']],
      evolvesTo: null, evolveLevel: null,
      desc: 'よこから なげられた ぼうが\nモルモンに なった。かぜを きって\nまっすぐ とぶ。あいぼうに ぴったり。',
      where: 'トレーナーが つかう'
    },
    gojuten: {
      no: 9, name: 'ゴジュッテン', type: 'normal', sprite: 'gojuten',
      base: { hp: 70, atk: 70, def: 70, spd: 60 }, baseExp: 120, catchRate: 45,
      learn: [[1, 'nageru'], [1, 'korogaru'], [5, 'tatenaoshi'], [6, 'pittari50']],
      evolvesTo: null, evolveLevel: null,
      desc: 'ぴったり 50てんで かった えいこうが\nかたちに なった モルモン。\nかんむりの モルモンは めずらしい。',
      where: '1ばんどうろ（とてもまれ）'
    }
  };
  // 図鑑の並び順（番号順）
  MM.MON_ORDER = ['shibamoru', 'tsuchipin', 'sunabou', 'skitten', 'carli', 'fault', 'nijugo', 'yokonage', 'gojuten'];

  MM.MAX_LEVEL = 50;
  // レベル → 必要な累計経験値
  MM.expFor = function (lv) { return Math.floor(lv * lv * lv * 0.5); };

  // 能力値を計算して m に入れる（HPの増減は呼び出し側で調整）
  MM.calcStats = function (m) {
    var b = MM.MONSTERS[m.sid].base, lv = m.lv;
    m.maxHp = Math.floor(b.hp * 2 * lv / 100) + lv + 10;
    m.atk = Math.floor(b.atk * 2 * lv / 100) + 5;
    m.def = Math.floor(b.def * 2 * lv / 100) + 5;
    m.spd = Math.floor(b.spd * 2 * lv / 100) + 5;
  };

  // そのレベルで覚えている技（最後の4つ）
  MM.initialMoves = function (sid, lv) {
    var learn = MM.MONSTERS[sid].learn, ids = [], i;
    for (i = 0; i < learn.length; i++) {
      if (learn[i][0] <= lv && ids.indexOf(learn[i][1]) < 0) ids.push(learn[i][1]);
    }
    ids = ids.slice(-4);
    return ids.map(function (id) { return { id: id, pp: MM.MOVES[id].pp }; });
  };

  MM.makeMon = function (sid, lv) {
    var m = { sid: sid, lv: lv, exp: MM.expFor(lv), hp: 1, maxHp: 1, atk: 1, def: 1, spd: 1, moves: [] };
    MM.calcStats(m);
    m.hp = m.maxHp;
    m.moves = MM.initialMoves(sid, lv);
    return m;
  };

  // 手持ちに加える（6体まで。超えたらボックスへ）。戻り値 'party' or 'box'
  MM.addMon = function (m) {
    var s = MM.state;
    if (s.party.length < 6) { s.party.push(m); return 'party'; }
    s.box.push(m);
    return 'box';
  };
})();
