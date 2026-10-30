// items.js : 道具（バッグの中身）
(function () {
  'use strict';
  var MM = window.MM;

  MM.ITEMS = {
    moluck:      { id: 'moluck', name: 'モルック', kind: 'catch', desc: 'やせいの モルモンに なげて つかまえる どうぐ。' },
    potion:      { id: 'potion', name: 'おしぼり', kind: 'heal', heal: 20, desc: 'モルモンの HPを 20 かいふくする。' },
    superpotion: { id: 'superpotion', name: 'スポドリ', kind: 'heal', heal: 50, desc: 'モルモンの HPを 50 かいふくする。' }
  };
  MM.ITEM_ORDER = ['moluck', 'potion', 'superpotion'];

  MM.giveItem = function (id, n) {
    var b = MM.state.bag;
    b[id] = (b[id] || 0) + n;
  };
})();
