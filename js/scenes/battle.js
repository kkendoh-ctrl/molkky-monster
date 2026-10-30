// battle.js : ターン制バトル（野生・トレーナー）と「モルックをなげて捕まえる」処理
// 進行は function*（ジェネレータ）で書き、メッセージ・HPバー・演出の終わりを yield で待つ。
(function () {
  'use strict';
  var MM = window.MM, G = MM.gfx, I = MM.input;

  var STAT_JA = { atk: 'こうげき', def: 'ぼうぎょ', spd: 'すばやさ', acc: 'めいちゅう' };
  var CMDS = ['たたかう', 'モルモン', 'バッグ', 'にげる'];

  function stageMul(s) { return s >= 0 ? (2 + s) / 2 : 2 / (2 - s); }
  function accMul(s) { return s >= 0 ? (3 + s) / 3 : 3 / (3 - s); }
  function name(m) { return MM.MONSTERS[m.sid].name; }
  function mkBattler(mon) {
    return { mon: mon, st: { atk: 0, def: 0, spd: 0, acc: 0 }, hpShown: mon.hp, hide: false, sink: 0, blink: 0 };
  }
  function firstAlive(party) {
    var i;
    for (i = 0; i < party.length; i++) if (party[i].hp > 0) return party[i];
    return null;
  }
  function getStat(b, key) { return Math.max(1, Math.floor(b.mon[key] * stageMul(b.st[key]))); }

  function Battle(def, onEnd) {
    var tr = def.trainer, list;
    this.name = 'battle';
    this.opaque = true;
    MM.debug.battleCount = (MM.debug.battleCount || 0) + 1;   // テスト用：バトル開始の回数
    this.def = def;
    this.onEnd = onEnd;
    this.isTrainer = !!tr;
    this.trainer = tr || null;
    this.trName = tr ? (typeof tr.name === 'function' ? tr.name() : tr.name) : '';
    if (tr) {
      list = typeof tr.mons === 'function' ? tr.mons() : tr.mons;
      this.foes = list.map(function (e) { return MM.makeMon(e[0], e[1]); });
    } else {
      this.foes = [def.wild];
    }
    this.foeIdx = 0;
    this.E = mkBattler(this.foes[0]);
    this.P = mkBattler(firstAlive(MM.state.party));
    MM.dexSee(this.E.mon.sid);
    this.tb = new MM.TextBox({ x: 0, y: 224, w: MM.W, h: 64, lines: 2, auto: 40 });
    this.phase = 'msg';
    this.cmdSel = 0; this.moveSel = 0;
    this.cmdText = '';
    this.picked = null;
    this.opts = null; this.optSel = 0; this.optResult = null;   // 選択肢（はい/いいえ）
    this.forgetInfo = '';
    this.shake = 0;
    this.anim = null;          // 投げる・ゆれる 演出
    this.pinOn = false;
    this.slide = 36;
    this.t = 0;
    this.missCount = 0;
    this.runAttempts = 0;
    this.ended = false;
    this.result = null;
    this.gen = this.run();
    this.wait = null;
  }

  // ---------- メッセージ ----------
  Battle.prototype.msg = function (text) {
    var self = this;
    this.phase = 'msg';
    this.tb.say(text);
    return function () { return self.tb.state === 'end'; };
  };
  Battle.prototype.fxWait = function (n) {
    var c = 0;
    return function () { c++; return c >= n; };
  };
  Battle.prototype.hpWait = function (b) {
    return function () { return Math.abs(b.hpShown - b.mon.hp) < 0.5; };
  };
  // 名前（文頭にも文中にも使える形）
  Battle.prototype.nm = function (b) {
    if (b === this.P) return name(b.mon);
    return (this.isTrainer ? 'あいての ' : 'やせいの ') + name(b.mon);
  };

  // ---------- 進行本体 ----------
  Battle.prototype.run = function* () {
    var act, res;
    if (this.isTrainer) {
      yield this.fxWait(10);
      yield this.msg(this.trName + 'が しょうぶを しかけてきた！');
      yield this.msg(this.trName + 'は ' + name(this.E.mon) + ' を くりだした！');
    } else {
      yield this.fxWait(10);
      yield this.msg('あっ！ やせいの ' + name(this.E.mon) + ' が\nとびだしてきた！');
    }
    yield this.msg('ゆけ！ ' + name(this.P.mon) + '！');
    while (!this.ended) {
      act = yield* this.chooseAction();
      res = yield* this.doTurn(act);
      if (res === 'end') break;
    }
    this.finish();
  };

  Battle.prototype.chooseAction = function* () {
    var self = this, pk, r;
    while (true) {
      this.picked = null;
      this.phase = 'cmd';
      this.cmdText = name(this.P.mon) + 'は\nどうする？';
      // 使える技がひとつもないときは「むがむちゅう」
      if (this.P.mon.moves.every(function (m) { return m.pp <= 0; })) {
        yield this.msg(name(this.P.mon) + 'は もう つかえる わざが ない！');
        return { type: 'fight', idx: -1 };
      }
      yield function () { return self.picked !== null; };
      pk = this.picked; this.picked = null;
      if (pk.type === 'bag') { r = yield* this.bagFlow(); if (r) return r; continue; }
      if (pk.type === 'party') { r = yield* this.partyFlow(); if (r) return r; continue; }
      if (pk.type === 'run') {
        if (this.isTrainer) { yield this.msg('トレーナーせんでは にげられない！'); continue; }
        return pk;
      }
      if (pk.type === 'fight') return pk;
    }
  };

  // 子シーン（バッグ・モルモン一覧）を開いて結果を待つ
  Battle.prototype.openSub = function (scene, holder) {
    holder.done = false;
    this.phase = 'sub';
    MM.push(scene);
    return function () { return holder.done; };
  };

  Battle.prototype.bagFlow = function* () {
    var h = { done: false, id: null }, idx, m;
    yield this.openSub(new MM.scenes.BagScene({
      battle: true,
      onPick: function (id) { h.id = id; h.done = true; }
    }), h);
    if (!h.id) return null;
    if (h.id === 'moluck') {
      if (this.isTrainer) { yield this.msg('ひとの モルモンは つかまえられない！'); return null; }
      if ((MM.state.bag.moluck || 0) <= 0) { yield this.msg('モルックが もう ない！'); return null; }
      return { type: 'throw' };
    }
    idx = yield* this.pickParty('だれに つかう？', true, function (mon) {
      if (mon.hp <= 0) return 'たおれた モルモンには つかえない！';
      if (mon.hp >= mon.maxHp) return 'HPは まんたんだ！';
      return null;
    });
    if (idx === null) return null;
    m = MM.state.party[idx];
    return { type: 'item', id: h.id, mon: m };
  };

  Battle.prototype.partyFlow = function* () {
    var self = this, idx;
    idx = yield* this.pickParty('どの モルモンを だす？', true, function (mon) {
      if (mon === self.P.mon) return 'もう でている！';
      if (mon.hp <= 0) return 'たおれていて たたかえない！';
      return null;
    });
    if (idx === null) return null;
    return { type: 'switch', mon: MM.state.party[idx] };
  };

  Battle.prototype.pickParty = function* (title, canCancel, valid) {
    var h = { done: false, idx: null };
    yield this.openSub(new MM.scenes.PartyScene({
      mode: 'pick', title: title, canCancel: canCancel, valid: valid,
      onPick: function (i) { h.idx = i; h.done = true; }
    }), h);
    return h.idx;
  };

  // ---------- 1ターン ----------
  Battle.prototype.pickFoeMove = function () {
    var ms = this.E.mon.moves.filter(function (m) { return m.pp > 0; }), total = 0, i, w, r;
    if (!ms.length) return { id: 'struggle', pp: 1 };
    w = ms.map(function (m) { var k = MM.MOVES[m.id].kind === 'dmg' ? 3 : 1; total += k; return k; });
    r = MM.rnd(total);
    for (i = 0; i < ms.length; i++) { r -= w[i]; if (r < 0) return ms[i]; }
    return ms[0];
  };

  Battle.prototype.doTurn = function* (act) {
    var P = this.P, E = this.E, eMove = this.pickFoeMove(), pMove = null, order, i, who, r, pFirst, ps, es, faintHappened = false;
    if (act.type === 'fight') {
      this.missCount = 0;
      pMove = act.idx >= 0 ? P.mon.moves[act.idx] : { id: 'struggle', pp: 1 };
      ps = getStat(P, 'spd'); es = getStat(E, 'spd');
      pFirst = ps > es || (ps === es && MM.chance(0.5));
      order = pFirst ? ['p', 'e'] : ['e', 'p'];
    } else {
      r = yield* this.playerNonAttack(act);
      if (r === 'end') return 'end';
      order = ['e'];
    }
    for (i = 0; i < order.length; i++) {
      who = order[i];
      if (who === 'p') {
        if (this.P.mon.hp <= 0) continue;
        yield* this.useMove(this.P, this.E, pMove);
      } else {
        if (this.E.mon.hp <= 0 || this.P.mon.hp <= 0) continue;
        yield* this.useMove(this.E, this.P, eMove);
      }
      if (this.E.mon.hp <= 0) {
        faintHappened = true;
        r = yield* this.foeFainted();
        if (r === 'end') return 'end';
      }
      if (this.P.mon.hp <= 0) {
        faintHappened = true;
        r = yield* this.playerFainted();
        if (r === 'end') return 'end';
      }
      if (faintHappened) break;
    }
    return 'continue';
  };

  Battle.prototype.playerNonAttack = function* (act) {
    var P = this.P, mon, it, amount, before, ok, odds, B;
    if (act.type === 'switch') {
      this.missCount = 0;
      yield this.msg('もどれ！ ' + name(P.mon) + '！');
      this.P = mkBattler(act.mon);
      yield this.msg('ゆけ！ ' + name(act.mon) + '！');
      return 'continue';
    }
    if (act.type === 'item') {
      this.missCount = 0;
      it = MM.ITEMS[act.id]; mon = act.mon;
      MM.state.bag[act.id]--;
      before = mon.hp;
      mon.hp = Math.min(mon.maxHp, mon.hp + it.heal);
      if (mon === this.P.mon) { yield this.msg(MM.config.playerName + 'は ' + it.name + ' を つかった！'); yield this.hpWait(this.P); }
      else { this.P.hpShown = this.P.mon.hp; yield this.msg(MM.config.playerName + 'は ' + name(mon) + ' に\n' + it.name + ' を つかった！'); }
      yield this.msg(name(mon) + 'の HPが ' + (mon.hp - before) + ' かいふくした！');
      return 'continue';
    }
    if (act.type === 'run') {
      this.runAttempts++;
      B = Math.max(1, Math.floor(getStat(this.E, 'spd') / 4) % 256);
      odds = Math.floor(getStat(P, 'spd') * 32 / B) + 30 * this.runAttempts;
      ok = odds > 255 || MM.rnd(256) < odds;
      if (ok) {
        yield this.msg('うまく にげきれた！');
        this.result = 'run';
        return 'end';
      }
      yield this.msg('にげられなかった！');
      return 'continue';
    }
    if (act.type === 'throw') return yield* this.throwMoluck();
    return 'continue';
  };

  // ---------- 技の実行 ----------
  Battle.prototype.useMove = function* (A, D, entry) {
    var mv = MM.MOVES[entry.id], hit, chance, crit, mul, dmg, base, stab, att, def, aSide, dSide, tgt, s, cur, amt, before, recoil;
    if (entry.id !== 'struggle') entry.pp = Math.max(0, entry.pp - 1);
    yield this.msg(this.nm(A) + 'の\n' + mv.name + '！');
    // 命中判定
    hit = true;
    if (mv.acc !== null && mv.acc !== undefined) {
      chance = mv.acc * accMul(A.st.acc) / 100;
      hit = Math.random() < chance;
    }
    if (!hit) {
      yield this.msg(this.nm(A) + 'の こうげきは はずれた！');
      return;
    }
    if (mv.kind === 'dmg') {
      att = getStat(A, 'atk'); def = getStat(D, 'def');
      crit = MM.chance(1 / 16);
      mul = MM.typeMul(mv.type, MM.MONSTERS[D.mon.sid].type);
      stab = (mv.type === MM.MONSTERS[A.mon.sid].type) ? 1.5 : 1;
      base = Math.floor(((2 * A.mon.lv / 5 + 2) * mv.power * att / def) / 50) + 2;
      dmg = Math.max(1, Math.floor(base * mul * stab * (crit ? 1.5 : 1) * (0.85 + Math.random() * 0.15)));
      // ヒット演出
      D.blink = 24; this.shake = 14;
      yield this.fxWait(22);
      D.mon.hp = Math.max(0, D.mon.hp - dmg);
      yield this.hpWait(D);
      if (crit) yield this.msg('きゅうしょに あたった！');
      if (mul > 1) yield this.msg('こうかは ばつぐんだ！');
      else if (mul < 1) yield this.msg('こうかは いまひとつの ようだ…');
      if (mv.recoil) {
        recoil = Math.max(1, Math.floor(A.mon.maxHp * mv.recoil));
        A.mon.hp = Math.max(0, A.mon.hp - recoil);
        yield this.hpWait(A);
        yield this.msg(this.nm(A) + 'は はんどうで ダメージを うけた！');
      }
      return;
    }
    if (mv.kind === 'stat') {
      tgt = mv.target === 'self' ? A : D;
      cur = tgt.st[mv.stat];
      if (mv.stages < 0 && cur <= -6) { yield this.msg(this.nm(tgt) + 'の ' + STAT_JA[mv.stat] + 'は\nこれいじょう さがらない！'); return; }
      if (mv.stages > 0 && cur >= 6) { yield this.msg(this.nm(tgt) + 'の ' + STAT_JA[mv.stat] + 'は\nこれいじょう あがらない！'); return; }
      tgt.st[mv.stat] = MM.clamp(cur + mv.stages, -6, 6);
      yield this.msg(this.nm(tgt) + 'の ' + STAT_JA[mv.stat] + 'が\n' + (mv.stages > 0 ? 'あがった！' : 'さがった！'));
      return;
    }
    if (mv.kind === 'heal') {
      if (A.mon.hp >= A.mon.maxHp) { yield this.msg('しかし うまく きまらなかった！'); return; }
      amt = Math.max(1, Math.floor(A.mon.maxHp * mv.frac));
      before = A.mon.hp;
      A.mon.hp = Math.min(A.mon.maxHp, A.mon.hp + amt);
      yield this.hpWait(A);
      yield this.msg(this.nm(A) + 'は たてなおして\nHPを かいふくした！');
    }
  };

  // ---------- 倒れたとき ----------
  Battle.prototype.foeFainted = function* () {
    var E = this.E, mon = E.mon, sp = MM.MONSTERS[mon.sid], gain, self = this, next;
    E.sink = 0.001;
    yield function () { return E.sink >= 1; };
    E.hide = true;
    yield this.msg(this.nm(E) + 'は たおれた！');
    gain = Math.max(1, Math.floor(sp.baseExp * mon.lv / 7 * (this.isTrainer ? 1.5 : 1)));
    if (this.P.mon.hp > 0) {
      yield this.msg(name(this.P.mon) + 'は\n' + gain + ' けいけんちを もらった！');
      yield* this.gainExp(this.P.mon, gain);
    }
    if (this.isTrainer && this.foeIdx + 1 < this.foes.length) {
      this.foeIdx++;
      next = this.foes[this.foeIdx];
      this.E = mkBattler(next);
      MM.dexSee(next.sid);
      yield this.msg(this.trName + 'は ' + name(next) + ' を くりだした！');
      return 'continue';
    }
    if (this.isTrainer) {
      yield this.msg(MM.config.playerName + 'は ' + this.trName + ' との\nしょうぶに かった！');
      if (this.trainer.lose) {
        yield this.msg(typeof this.trainer.lose === 'function' ? this.trainer.lose() : this.trainer.lose);
      }
    }
    this.result = 'win';
    return 'end';
  };

  Battle.prototype.playerFainted = function* () {
    var P = this.P, party = MM.state.party, idx;
    P.sink = 0.001;
    yield function () { return P.sink >= 1; };
    P.hide = true;
    yield this.msg(name(P.mon) + 'は たおれた！');
    if (!firstAlive(party)) {
      if (this.def.noBlackout) {
        yield this.msg(MM.config.playerName + 'は しょうぶに まけた…');
      } else {
        yield this.msg(MM.config.playerName + 'は\nめのまえが まっしろに なった！');
      }
      this.result = 'lose';
      return 'end';
    }
    idx = yield* this.pickParty('どの モルモンを だす？', false, function (mon) {
      if (mon.hp <= 0) return 'たおれていて たたかえない！';
      return null;
    });
    this.P = mkBattler(party[idx]);
    this.missCount = 0;
    yield this.msg('ゆけ！ ' + name(party[idx]) + '！');
    return 'continue';
  };

  // ---------- 経験値・レベルアップ・新しい技 ----------
  Battle.prototype.gainExp = function* (mon, gain) {
    var oldMax, learn, i, lv;
    mon.exp += gain;
    while (mon.lv < MM.MAX_LEVEL && mon.exp >= MM.expFor(mon.lv + 1)) {
      oldMax = mon.maxHp;
      mon.lv++;
      MM.calcStats(mon);
      mon.hp += (mon.maxHp - oldMax);
      if (mon === this.P.mon) this.P.hpShown = mon.hp;
      yield this.msg(name(mon) + 'は レベル ' + mon.lv + ' に\nあがった！');
      learn = MM.MONSTERS[mon.sid].learn;
      for (i = 0; i < learn.length; i++) {
        if (learn[i][0] === mon.lv) yield* this.learnMove(mon, learn[i][1]);
      }
    }
    lv = mon.lv;
  };

  Battle.prototype.learnMove = function* (mon, id) {
    var mv = MM.MOVES[id], i, self = this, which;
    for (i = 0; i < mon.moves.length; i++) if (mon.moves[i].id === id) return;
    if (mon.moves.length < 4) {
      mon.moves.push({ id: id, pp: mv.pp });
      yield this.msg(name(mon) + 'は ' + mv.name + ' を\nおぼえた！');
      return;
    }
    yield this.msg(name(mon) + 'は ' + mv.name + ' を\nおぼえたい…！');
    yield this.msg('でも わざが 4つ いっぱいだ。\nほかの わざを わすれて おぼえる？');
    this.opts = ['おぼえる', 'あきらめる']; this.optSel = 0; this.optResult = null; this.phase = 'choice';
    yield function () { return self.optResult !== null; };
    this.opts = null;
    if (this.optResult !== 0) { yield this.msg(name(mon) + 'は ' + mv.name + ' を\nおぼえるのを あきらめた。'); return; }
    this.forgetMon = mon; this.forgetInfo = 'どれを わすれる？（Bで やめる）';
    this.picked = null; this.phase = 'forget'; this.moveSel = 0;
    yield function () { return self.picked !== null; };
    which = this.picked.idx; this.picked = null;
    if (which < 0) { yield this.msg(name(mon) + 'は ' + mv.name + ' を\nおぼえるのを あきらめた。'); return; }
    yield this.msg(name(mon) + 'は ' + MM.MOVES[mon.moves[which].id].name + ' を\nわすれて…');
    mon.moves[which] = { id: id, pp: mv.pp };
    yield this.msg('ぽろっ！ ' + mv.name + ' を おぼえた！');
  };

  // ---------- モルックを なげて つかまえる ----------
  Battle.prototype.throwMoluck = function* () {
    var self = this, E = this.E, mon = E.mon, sp = MM.MONSTERS[mon.sid], f, p, ok, shakes, i, where;
    MM.state.bag.moluck--;
    yield this.msg(MM.config.playerName + 'は モルックを なげた！');
    this.anim = { kind: 'throw', t: 0 };
    yield function () { return self.anim === null; };
    // 相手は棒に吸い込まれる代わりに、スキットルがゆれる
    E.hide = true; this.pinOn = true;
    f = (3 * mon.maxHp - 2 * mon.hp) * sp.catchRate / (3 * mon.maxHp);
    p = MM.clamp(f / 255, 0.02, 0.95);
    if (MM.debugMode && MM.debug.rig === 'catchFail') p = 0;
    if (MM.debugMode && MM.debug.rig === 'catchOk') p = 1;
    ok = Math.random() < p;
    shakes = ok ? 3 : 1 + MM.rnd(3);   // ゆれる回数は 1〜3（成功のときは3回ゆれて成功）
    yield this.msg('スキットルが ゆれている…');
    for (i = 0; i < shakes; i++) {
      this.anim = { kind: 'wobble', t: 0 };
      yield function () { return self.anim === null; };
    }
    if (ok) {
      yield this.msg('やった！ ' + name(mon) + ' を\nつかまえた！');
      MM.dexCatch(mon.sid);
      where = MM.addMon(mon);
      if (where === 'box') yield this.msg(name(mon) + 'は\nあずかりボックスに おくられた！');
      this.result = 'caught';
      return 'end';
    }
    this.pinOn = false; E.hide = false;
    this.missCount++;
    if (this.missCount >= 3) {
      yield this.msg('3かい ミス！\n' + name(mon) + 'は にげてしまった…');
      this.result = 'fled';
      return 'end';
    }
    if (shakes === 1) yield this.msg('だめだ！ モルックは はずれた！');
    else if (shakes === 2) yield this.msg('あー！ つかまえたと おもったのに！');
    else yield this.msg('おしい！ もうすこしだったのに！');
    yield this.msg(this.missCount + 'かい れんぞく ミス！\nあと ' + (3 - this.missCount) + 'かいで にげられてしまう！');
    return 'continue';
  };

  Battle.prototype.finish = function () {
    var self = this, res = this.result || 'win';
    this.ended = true;
    this.phase = 'busy';
    MM.fx.out(function () {
      MM.remove(self);
      MM.fx.in(function () { self.onEnd(res); });
    });
  };

  // ---------- 更新 ----------
  Battle.prototype.animHp = function (b) {
    var spd = Math.max(0.3, b.mon.maxHp / 70);
    if (b.hpShown > b.mon.hp) b.hpShown = Math.max(b.mon.hp, b.hpShown - spd);
    else if (b.hpShown < b.mon.hp) b.hpShown = Math.min(b.mon.hp, b.hpShown + spd);
  };

  Battle.prototype.update = function () {
    var n, p;
    this.t++;
    if (this.slide > 0) this.slide--;
    this.animHp(this.P); this.animHp(this.E);
    if (this.shake > 0) this.shake--;
    if (this.P.blink > 0) this.P.blink--;
    if (this.E.blink > 0) this.E.blink--;
    if (this.P.sink > 0 && this.P.sink < 1) this.P.sink = Math.min(1, this.P.sink + 1 / 26);
    if (this.E.sink > 0 && this.E.sink < 1) this.E.sink = Math.min(1, this.E.sink + 1 / 26);
    if (this.anim) {
      this.anim.t++;
      if (this.anim.kind === 'throw' && this.anim.t >= 30) this.anim = null;
      else if (this.anim.kind === 'wobble' && this.anim.t >= 34) this.anim = null;
    }

    if (this.phase === 'msg') {
      this.tb.update(I.pressed.a);
    } else if (this.phase === 'cmd') {
      if (I.pressed.left || I.pressed.right) this.cmdSel ^= 1;
      if (I.pressed.up || I.pressed.down) this.cmdSel ^= 2;
      if (I.pressed.a) {
        if (this.cmdSel === 0) { this.phase = 'fight'; if (this.moveSel >= this.P.mon.moves.length) this.moveSel = 0; }
        else if (this.cmdSel === 1) this.picked = { type: 'party' };
        else if (this.cmdSel === 2) this.picked = { type: 'bag' };
        else this.picked = { type: 'run' };
      }
    } else if (this.phase === 'fight' || this.phase === 'forget') {
      n = (this.phase === 'forget' ? this.forgetMon : this.P.mon).moves.length;
      if ((I.pressed.up || I.pressed.down) && (this.moveSel ^ 2) < n) this.moveSel ^= 2;
      if ((I.pressed.left || I.pressed.right) && (this.moveSel ^ 1) < n) this.moveSel ^= 1;
      if (I.pressed.b) {
        if (this.phase === 'fight') this.phase = 'cmd';
        else this.picked = { idx: -1 };
      } else if (I.pressed.a) {
        if (this.phase === 'forget') this.picked = { idx: this.moveSel };
        else {
          p = this.P.mon.moves[this.moveSel];
          if (p.pp > 0) this.picked = { type: 'fight', idx: this.moveSel };
        }
      }
    } else if (this.phase === 'choice') {
      if (I.pressed.up || I.pressed.down) this.optSel ^= 1;
      if (I.pressed.a) this.optResult = this.optSel;
      else if (I.pressed.b) this.optResult = this.opts.length - 1;
    }
    this.pump();
  };

  Battle.prototype.pump = function () {
    var r;
    if (this.ended) return;
    try {
      if (this.wait && !this.wait()) return;
      this.wait = null;
      r = this.gen.next();
      if (r.done) { if (!this.ended) this.finish(); return; }
      this.wait = (typeof r.value === 'function') ? r.value : null;
    } catch (e) {
      if (window.console) console.error('バトルでエラー', e);
      this.result = this.result || 'run';
      this.finish();
    }
  };

  // ---------- 描画 ----------
  function drawInfo(x, y, w, h, b, isPlayer) {
    var m = b.mon, sp = MM.MONSTERS[m.sid], ratio = b.hpShown / m.maxHp, lo, hi;
    G.box(x, y, w, h);
    G.text(sp.name, x + 10, y + 6, 0);
    G.textRight('Lv' + m.lv, x + w - 10, y + 6, 0);
    G.text('HP', x + 10, y + 26, 0);
    G.bar(x + 34, y + 30, w - 46, 8, ratio, 0, 3);
    if (isPlayer) {
      G.textRight(Math.ceil(b.hpShown) + '/' + m.maxHp, x + w - 10, y + 42, 0);
      lo = MM.expFor(m.lv); hi = MM.expFor(m.lv + 1);
      G.text('XP', x + 10, y + 56, 0);
      G.bar(x + 34, y + 62, w - 46, 6, m.lv >= MM.MAX_LEVEL ? 1 : (m.exp - lo) / (hi - lo), 1, 3);
    }
  }

  Battle.prototype.draw = function () {
    var sx = 0, ex, px, i, sp, img, vis, a, sh, y;
    if (this.shake > 0) sx = ((this.shake >> 1) & 1) ? 3 : -3;
    G.clear(3);
    G.ellipse(254, 100, 54, 8, 2);
    G.ellipse(70, 198, 58, 9, 2);
    // 相手
    ex = 206 + (this.slide * 6);
    if (!this.E.hide && this.E.sink < 1) this.drawMon(this.E, false, ex + (this.E.blink ? sx : 0), 4);
    if (this.pinOn) this.drawPin(206, 4);
    // 自分
    px = 22 - (this.slide * 6);
    if (!this.P.hide && this.P.sink < 1) this.drawMon(this.P, true, px + (this.P.blink ? sx : 0), 100);
    // 情報ウィンドウ
    drawInfo(4, 6, 168, 46, this.E, false);
    drawInfo(148, 118, 168, 76, this.P, true);
    // 投げたモルック（ウィンドウより手前を飛ぶ）
    if (this.anim && this.anim.kind === 'throw') {
      a = this.anim.t / 30;
      G.draw(G.misc(((this.anim.t >> 2) & 1) ? 'stickA' : 'stickB', 2),
        Math.round(70 + (254 - 70) * a - 16), Math.round(130 + (60 - 130) * a - Math.sin(Math.PI * a) * 50 - 16));
    }
    this.drawBottom();
  };

  Battle.prototype.drawMon = function (b, back, x, y) {
    var img = G.monSprite(b.mon.sid, back), sink = b.sink;
    if (b.blink && ((b.blink >> 2) & 1)) return;
    if (sink > 0) {
      // 地面にしずむ（上から切って下げる）
      var h = Math.round(32 * (1 - sink));
      if (h <= 0) return;
      G.ctx.drawImage(img, 0, 0, 32, h, x, y + Math.round(96 * sink), 96, h * 3);
      return;
    }
    G.ctx.drawImage(img, x, y, 96, 96);
  };

  Battle.prototype.drawPin = function (x, y) {
    var fr = 'skittle', t, img;
    if (this.anim && this.anim.kind === 'wobble') {
      t = this.anim.t;
      if (t < 6) fr = 'skittleL'; else if (t < 12) fr = 'skittle'; else if (t < 18) fr = 'skittleR'; else fr = 'skittle';
    }
    G.ctx.drawImage(G.misc(fr, 1), x, y, 96, 96);
  };

  Battle.prototype.drawMoves = function (mon, info) {
    var i, mv, e, x, y;
    G.box(0, 200, MM.W, 88);
    for (i = 0; i < mon.moves.length; i++) {
      e = mon.moves[i]; mv = MM.MOVES[e.id];
      x = (i % 2) ? 150 : 22; y = 210 + (i >> 1) * 24;
      G.text(mv.name, x, y, e.pp > 0 ? 0 : 1);
      if (i === this.moveSel) G.cursor(x - 14, y + 3);
    }
    e = mon.moves[this.moveSel]; mv = MM.MOVES[e.id];
    if (info) {
      G.text(info, 22, 262, 0);
    } else {
      G.text('PP ' + e.pp + '/' + mv.pp, 22, 262, 0);
      G.text('タイプ ' + MM.TYPE_NAMES[mv.type], 120, 262, 0);
    }
  };

  Battle.prototype.drawBottom = function () {
    var i, lines, x, y, w, h;
    if (this.phase === 'cmd') {
      G.box(0, 224, 160, 64);
      lines = this.cmdText.split('\n');
      for (i = 0; i < lines.length; i++) G.text(lines[i], 14, 234 + i * 22, 0);
      G.box(160, 224, 160, 64);
      for (i = 0; i < 4; i++) {
        x = 178 + (i % 2) * 72; y = 233 + (i >> 1) * 22;
        G.text(CMDS[i], x, y, 0);
        if (i === this.cmdSel) G.cursor(x - 14, y + 3);
      }
    } else if (this.phase === 'fight') {
      this.drawMoves(this.P.mon, null);
    } else if (this.phase === 'forget') {
      this.drawMoves(this.forgetMon, this.forgetInfo);
    } else {
      this.tb.draw();
      if (this.phase === 'choice' && this.opts) {
        w = 150; h = this.opts.length * 24 + 16; x = MM.W - w - 6; y = 224 - h - 4;
        G.box(x, y, w, h);
        for (i = 0; i < this.opts.length; i++) {
          G.text(this.opts[i], x + 30, y + 10 + i * 24, 0);
          if (i === this.optSel) G.cursor(x + 14, y + 14 + i * 24);
        }
      }
    }
  };

  MM.scenes = MM.scenes || {};
  MM.scenes.Battle = Battle;
  MM.debug.battle = function () {
    var b = MM.top && MM.top();
    return b && b.name === 'battle' ? { phase: b.phase, miss: b.missCount, foe: b.E.mon.sid, foeHp: b.E.mon.hp, hp: b.P.mon.hp, result: b.result, cmdSel: b.cmdSel, moveSel: b.moveSel, trainer: b.isTrainer, anim: b.anim ? b.anim.kind : null } : null;
  };
})();
