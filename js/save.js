// save.js : セーブ（localStorage）。読み書きは必ず try/catch。使えない環境でもゲームは動く。
(function () {
  'use strict';
  var MM = window.MM;

  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }

  // モルモン1体が壊れていないか確かめて、直せるところは直す。だめなら null
  function cleanMon(m) {
    var i, mv, out;
    if (!m || typeof m !== 'object' || !MM.MONSTERS[m.sid]) return null;
    if (!isInt(m.lv) || m.lv < 1 || m.lv > MM.MAX_LEVEL) return null;
    if (!isInt(m.exp) || m.exp < 0) return null;
    if (!Array.isArray(m.moves) || m.moves.length < 1 || m.moves.length > 4) return null;
    out = { sid: m.sid, lv: m.lv, exp: m.exp, hp: 1, maxHp: 1, atk: 1, def: 1, spd: 1, moves: [] };
    for (i = 0; i < m.moves.length; i++) {
      mv = m.moves[i];
      if (!mv || !MM.MOVES[mv.id] || !isInt(mv.pp)) return null;
      out.moves.push({ id: mv.id, pp: MM.clamp(mv.pp, 0, MM.MOVES[mv.id].pp) });
    }
    MM.calcStats(out);
    if (!isInt(m.hp)) return null;
    out.hp = MM.clamp(m.hp, 0, out.maxHp);
    return out;
  }

  // 読み込んだデータを検査して、使える状態オブジェクトにする。だめなら null
  function validate(o) {
    var s, i, m, k;
    if (!o || typeof o !== 'object' || o.v !== 1) return null;
    if (!MM.maps[o.map]) return null;
    if (!isInt(o.x) || !isInt(o.y) || !MM.DIRS[o.dir]) return null;
    if (!Array.isArray(o.party) || o.party.length < 1 || o.party.length > 6) return null;
    if (!Array.isArray(o.box)) return null;
    if (!o.bag || typeof o.bag !== 'object') return null;
    if (!o.flags || typeof o.flags !== 'object') return null;
    s = MM.newState();
    s.map = o.map; s.x = o.x; s.y = o.y; s.dir = o.dir;
    s.party = []; s.box = [];
    for (i = 0; i < o.party.length; i++) { m = cleanMon(o.party[i]); if (!m) return null; s.party.push(m); }
    for (i = 0; i < o.box.length; i++) { m = cleanMon(o.box[i]); if (!m) return null; s.box.push(m); }
    for (k in s.bag) { s.bag[k] = isInt(o.bag[k]) && o.bag[k] >= 0 ? o.bag[k] : 0; }
    s.dex = {};
    if (o.dex && typeof o.dex === 'object') {
      for (k in o.dex) { if (MM.MONSTERS[k] && (o.dex[k] === 1 || o.dex[k] === 2)) s.dex[k] = o.dex[k]; }
    }
    s.flags = {};
    for (k in o.flags) { if (typeof o.flags[k] === 'number' || typeof o.flags[k] === 'string' || typeof o.flags[k] === 'boolean') s.flags[k] = o.flags[k]; }
    s.play = isInt(o.play) && o.play >= 0 ? o.play : 0;
    if (o.heal && MM.maps[o.heal.map] && isInt(o.heal.x) && isInt(o.heal.y) && MM.DIRS[o.heal.dir]) s.heal = o.heal;
    return s;
  }

  MM.save = {
    // セーブデータを読む。ないとき・壊れているときは null
    read: function () {
      var raw, o;
      try {
        raw = window.localStorage.getItem(MM.SAVE_KEY);
        if (!raw) return null;
        o = JSON.parse(raw);
      } catch (e) { return null; }
      try { return validate(o); } catch (e2) { return null; }
    },
    exists: function () { return MM.save.read() !== null; },
    // 保存する。成功したら true
    write: function () {
      var s = MM.state, p;
      if (!s || s.party.length === 0) return false;   // 手持ち0体は保存しない（前のセーブを壊さない）
      try {
        if (MM.Field && MM.Field.player) {
          p = MM.Field.player;
          s.map = MM.Field.mapId; s.x = p.x; s.y = p.y; s.dir = p.dir;
        }
        window.localStorage.setItem(MM.SAVE_KEY, JSON.stringify(s));
        return true;
      } catch (e) { return false; }
    }
  };
})();
