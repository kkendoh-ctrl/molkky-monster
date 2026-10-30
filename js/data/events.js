// events.js : イベント（会話・ストーリー進行）とトレーナーのデータ
// スクリプトは function*（ジェネレータ）。F＝Field.api（say / ask / walkNpc / fight など）。
// 進行フラグは MM.state.flags に入る（セーブされる）。
(function () {
  'use strict';
  var MM = window.MM;
  var S = MM.scripts = {};

  function R() { return MM.config.rivalName; }
  function P() { return MM.config.playerName; }   // 主人公の名前
  function typeName(sid) { return MM.TYPE_NAMES[MM.MONSTERS[sid].type]; }

  // ---------------- トレーナー ----------------
  MM.trainers = {
    rival1: {
      id: 'rival1', name: function () { return R(); },
      mons: function () { return [[MM.state.flags.rivalStarter, 3]]; },
      lose: function () { return R() + '「くっ… やるな\n' + P() + '！」'; }
    },
    rival2: {
      id: 'rival2', name: function () { return R(); },
      mons: function () { return [[MM.state.flags.rivalStarter, 6], ['skitten', 5]]; },
      lose: function () { return R() + '「ま… まけた… ！」'; }
    },
    kenta: {
      id: 'kenta', name: 'ケンタ',
      mons: [['skitten', 3], ['carli', 4]],
      pre: 'ケンタ「めが あったな！\nモルモン しょうぶだ！」',
      lose: 'ケンタ「うわー！ まけたー！」',
      after: 'ケンタ「くやしいなあ…\nもっと きたえて また しょうぶだ！」'
    },
    misaki: {
      id: 'misaki', name: 'ミサキ',
      mons: [['fault', 4], ['yokonage', 4]],
      pre: 'ミサキ「わたしの ヨコナゲの はやさに\nついて こられる？」',
      lose: 'ミサキ「つよいわね！ おみごと！」',
      after: 'ミサキ「モルックは なげかたが だいじ。\nヨコナゲは よこから なげるのが とくいなの」'
    }
  };

  // ---------------- 共通 ----------------
  // 看板・調べるもの
  S.sign = function* (F, obj) { yield F.say(obj.text); };

  // 道に落ちている道具
  S.pickup = function* (F, a) {
    var it = a.def.item;
    F.give(it.id, it.n);
    F.set('item_' + a.id, 1);
    yield F.say(P() + 'は ' + MM.ITEMS[it.id].name + ' を\n' + it.n + 'こ ひろった！');
  };

  // トレーナー：話しかけられたとき
  S.trainerTalk = function* (F, a) {
    var tr = MM.trainers[a.def.trainer];
    if (MM.state.flags[a.def.flag]) { yield F.say(tr.after); return; }
    var p = F.player;
    a.dir = MM.OPPOSITE[p.dir];
    yield* S.trainerBattle(F, a);
  };
  // トレーナー：目が合ったとき（近づいてくる）
  S.trainerSpot = function* (F, a) {
    var p = F.player, dist = Math.abs(p.x - a.x) + Math.abs(p.y - a.y), dirs = [], i;
    yield F.exclaim(a);
    for (i = 0; i < dist - 1; i++) dirs.push(a.dir);
    yield F.walkNpc(a, dirs);
    p.dir = MM.OPPOSITE[a.dir];
    yield* S.trainerBattle(F, a);
  };
  S.trainerBattle = function* (F, a) {
    var tr = MM.trainers[a.def.trainer];
    yield F.say(tr.pre);
    var won = yield* F.fight({ trainer: tr });
    if (won) {
      F.set(a.def.flag);
      yield F.say(tr.after);
    }
  };

  // ---------------- ハマノまち ----------------
  S.hakaseStop = function* (F) {
    yield F.say('…' + P() + 'くん！ まちなさい！\n（どこからか ハカセの こえが きこえる）');
    yield F.say('くさむらには やせいの モルモンが いるぞ！\nまずは けんきゅうじょに きなさい！');
    yield F.walkPlayer(['down']);
  };
  S.townGirl = function* (F) {
    yield F.say('モルックは ぴったり 50てんで かち！\nこえたら 25てんに もどっちゃうのよ。');
  };
  S.townOldman = function* (F) {
    yield F.say('くさむらに はいると やせいの モルモンが でるぞ。\nモルックを なげて つかまえるんじゃ。');
    yield F.say('ただし 3かい つづけて ミスすると\nにげられてしまうぞ。きをつけなされ。');
  };
  S.townBoy = function* (F) {
    yield F.say('スキットルは たおれた ばしょで たてなおすんだ。\nだから みんな スキットルの ばしょを おぼえてるよ！');
  };
  S.tentHeal = function* (F, a) {
    yield F.say('ここは きゅうけいじょ！\nモルモンを やすませて いきませんか？');
    yield F.ask('やすんでいく？', ['はい', 'いいえ']);
    if (F.choice === 0) {
      MM.healAll();
      yield F.say('ゆっくり やすんで…\nモルモンたちは げんきに なった！');
    } else {
      yield F.say('また いつでも どうぞ！');
    }
  };

  // ---------------- 主人公の家 ----------------
  S.wakeUp = function* (F) {
    yield F.say('…ふぁ〜あ。 もう あさか。\nしたで おかあさんが よんでいる みたいだ。');
  };
  S.mom = function* (F) {
    if (!F.flag('talkedMom')) {
      F.set('talkedMom');
      yield F.say('おかあさん「おはよう ' + P() + '！\nきょうは ハカセの けんきゅうじょに いく ひでしょ？」');
      yield F.say('おかあさん「モルックの れんしゅうも いいけど\nきを つけて いってらっしゃい！」');
      return;
    }
    MM.healAll();
    yield F.say('おかあさん「つかれたでしょう。\nごはんを たべて いきなさい」');
    yield F.say('モルモンたちも げんきに なった！');
  };

  // ---------------- 研究所 ----------------
  var RIVAL_PICK = { shibamoru: 'sunabou', tsuchipin: 'shibamoru', sunabou: 'tsuchipin' };

  S.labEnter = function* (F) {
    if (F.flag('gotStarter') || F.flag('labIntro')) return;
    F.set('labIntro');
    yield F.say('ハカセ「おお ' + P() + 'くん！\nきたな！」');
    yield F.say('ハカセ「ここに モルックぼうに はいった モルモンが\n3たい いる。 1たいだけ えらんで いいぞ！」');
    yield F.say(R() + '「ちぇっ……\n' + P() + 'が さきかよ。」');
    yield F.say(R() + '「はやく えらべよな！」');
    yield F.say('（ モルックぼうの たての まえで\n　Aボタンを おすと えらべる ）');
  };

  S.pedestal = function* (F, obj) {
    var sid = obj.mon, sp = MM.MONSTERS[sid];
    if (F.flag('gotStarter')) {
      yield F.say('モルックぼうが たてかけて ある。\nモルモンは もう ここには いない。');
      return;
    }
    yield F.say('モルックぼうの なかに ' + sp.name + ' が いる！\nタイプは「' + typeName(sid) + '」だ。');
    yield F.ask(sp.name + ' に する？', ['はい', 'いいえ']);
    if (F.choice !== 0) { yield F.say('ハカセ「ゆっくり かんがえなさい」'); return; }

    // 主人公の仲間にする
    F.set('gotStarter'); F.set('starter', sid);
    MM.addMon(MM.makeMon(sid, 5));
    MM.dexCatch(sid);
    yield F.say(P() + 'は\n' + sp.name + ' を てにいれた！');

    // ライバルは相性で有利な1体を取る
    var rs = RIVAL_PICK[sid], rsp = MM.MONSTERS[rs];
    F.set('rivalStarter', rs);
    MM.dexSee(rs);
    var rv = F.npc('rival1');
    if (rv) rv.dir = 'left';
    yield F.say(R() + '「ふーん。 それなら ぼくは\nこの ' + rsp.name + ' に する！」');
    yield F.say(R() + '「' + P() + '！ しょうぶだ！\nモルモンの つよさを みせてやる！」');
    var won = yield* F.fight({ trainer: MM.trainers.rival1, noBlackout: true });
    // 勝ったときのセリフは戦闘の中で出る。負けたときだけここで言う
    if (!won) yield F.say(R() + '「ははっ！ ぼくの かちだ！\nもっと きたえろよ ' + P() + '！」');
    MM.healAll();
    yield F.say('ハカセ「ふたりとも いい しょうぶ だった！\nモルモンは かいふく しておいたぞ」');
    yield F.say(R() + '「ぼくは さきに 1ばんどうろへ いくぞ！\nじゃあな ' + P() + '！」');
    F.set('rival1Done');
    yield F.say('ハカセ「そうだ ' + P() + 'くん！\nこれを もって いきなさい」');
    F.give('moluck', 5);
    yield F.say(P() + 'は モルックを\n5ほん もらった！');
    yield F.say('ハカセ「やせいの モルモンに モルックを なげると\nつかまえる ことが できるぞ！」');
    yield F.say('ハカセ「ただし 3かい つづけて ミスすると\nにげられてしまう。モルックの ルールと おなじだ」');
    yield F.say('ハカセ「ずかんを うめるのも わすれずにな。\nさあ いってきなさい！」');
  };

  S.rivalLab = function* (F) {
    if (!F.flag('gotStarter')) yield F.say(R() + '「' + P() + 'が えらぶまで\nぼくは まつよ。 さっさと えらべよな」');
    else yield F.say(R() + '「…………」');
  };

  S.hakase = function* (F) {
    var bag = MM.state.bag;
    if (!F.flag('gotStarter')) {
      yield F.say('ハカセ「モルックぼうの なかから 1たい えらびなさい。\nたての まえで Aボタンだ」');
      return;
    }
    MM.healAll();
    if (bag.moluck < 3) {
      MM.giveItem('moluck', 5 - bag.moluck);
      yield F.say('ハカセ「モルックが たりないようじゃな。\nほら ほじゅうして おいたぞ！」');
    }
    if (!F.flag('rival2Done')) {
      yield F.say('ハカセ「1ばんどうろの おくで ライバルが\nまっている はずじゃ。 モルモンを つかまえて\nきたえて おくんじゃぞ」');
      yield F.say('ハカセ「ここでは モルモンを かいふく してやろう」');
    } else {
      yield F.say('ハカセ「ライバルに かったそうじゃな！\nさすが モルックの せんしゅ じゃ！」');
      yield F.say('ハカセ「つづきは また こんど！\nモルモンは かいふく しておいたぞ」');
    }
  };

  // 研究所のPC：あずかりボックスの出し入れ
  S.labPC = function* (F) {
    yield F.say(P() + 'は PCの でんげんを いれた。\n「あずかりボックス」に つながった！');
    var done = false;
    MM.push(new MM.scenes.BoxPC(function () { done = true; }));
    yield function () { return done; };
  };

  // ---------------- 1ばんどうろ ----------------
  S.rivalRoute = function* (F, a) {
    // 話しかけたときも戦う
    yield* S.rival2Battle(F, a);
  };
  S.rival2 = function* (F) {
    var rv = F.npc('rival2'), p = F.player, path = ['down', 'down'];
    if (p.x === 10) path.push('right');
    yield F.exclaim(rv);
    yield F.walkNpc(rv, path);
    rv.dir = 'down';
    p.dir = 'up';
    yield* S.rival2Battle(F, rv);
  };
  S.rival2Battle = function* (F, rv) {
    yield F.say(R() + '「やっと きたか ' + P() + '！\nここから さきには いかせないぞ！」');
    yield F.say(R() + '「ぼくの モルモンも きたえて きた！\nしょうぶだ！」');
    var won = yield* F.fight({ trainer: MM.trainers.rival2 });
    if (!won) return;
    yield F.say(R() + '「' + P() + '… おまえ\nつよく なったな。 ぼくも もっと\nきたえて また しょうぶだ！」');
    yield F.walkNpc(rv, ['up', 'up', 'up']);
    F.set('rival2Done');
    yield F.wait(20);
    yield F.endCard();
    yield F.say('このさきも モルモンの せかいは つづく…\nいまは ここまで。 すきな ところを あるいてみよう！');
  };
})();
