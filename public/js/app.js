/* Bread Bot — pure client-side calculator.
 *
 * All percentages are baker's percentages: everything is scaled off TOTAL
 * flour. The app computes total flour from the requested loaf weight using
 * doughYield, the fraction of the finished dough that is flour.
 */
(function () {
  'use strict';

  // Size ladders. Bread uses loaf weights; bagels and pretzels use
  // per-piece weights, since those are portioned by count, not by tin.
  const LOAF_SIZES = [
    { key: 'small',      label: 'Small',       grams: 400 },
    { key: 'medium',     label: 'Medium',      grams: 680 },
    { key: 'large',      label: 'Large',       grams: 900 },
    { key: 'extraLarge', label: 'Extra large', grams: 1200 },
    { key: 'party',      label: 'Party',       grams: 1600 },
  ];

  const BAGEL_SIZES = [
    { key: 'mini',    label: 'Mini',    grams: 60 },
    { key: 'regular', label: 'Regular', grams: 100 },
    { key: 'large',   label: 'Large',   grams: 130 },
  ];

  const PRETZEL_SIZES = [
    { key: 'mini',    label: 'Mini',    grams: 45 },
    { key: 'regular', label: 'Regular', grams: 90 },
    { key: 'large',   label: 'Large',   grams: 140 },
  ];

  const BREADS = [
    {
      id: 'sourdough',
      name: 'Sourdough',
      unit: 'loaf',
      sizes: LOAF_SIZES,
      note: 'Wild yeast, long fermentation, tangy crumb.',
      hydration: [65, 70, 75, 80],
      ingredients: { salt: 2, starter: 20 },
      doughYield: 1.82,
      rises: [
        { name: 'Bulk ferment', min: '4 h', max: '6 h', note: 'at 21 to 24°C, fold every 30 min for the first 2 h' },
        { name: 'Shape and proof', min: '2 h', max: '4 h', note: 'bench rest 30 min, then proof in the banneton' },
      ],
      bake: { temp: '230°C', steam: '20 min covered, then', finish: '35 to 45 min uncovered at 210°C' },
    },
    {
      id: 'bagel',
      name: 'Bagel',
      unit: 'bagel',
      sizes: BAGEL_SIZES,
      note: 'Chewy, dense, boiled before baking. The dough is stiff, so hydration stays low.',
      hydration: [50, 55, 58],
      ingredients: { salt: 2, oil: 2, malt: 2, yeast: 1 },
      doughYield: 1.59,
      rises: [
        { name: 'Bulk ferment', min: '1 h', max: '1.5 h', note: 'room temperature, then refrigerate overnight for flavor' },
        { name: 'Proof', min: '20 min', max: '40 min', note: 'cold proof overnight, then boil 60 to 90 s per side' },
      ],
      bake: { temp: '220°C', steam: null, finish: '18 to 22 min until deep golden' },
    },
    {
      id: 'sourdough-bagel',
      name: 'Sourdough bagel',
      unit: 'bagel',
      sizes: BAGEL_SIZES,
      note: 'Bagel dough raised on a sourdough starter. Slower and tangier.',
      hydration: [50, 55, 58],
      ingredients: { salt: 2, starter: 20, oil: 2, malt: 2 },
      doughYield: 1.59,
      rises: [
        { name: 'Bulk ferment', min: '3 h', max: '4 h', note: 'at 21 to 24°C, then refrigerate overnight' },
        { name: 'Proof', min: '2 h', max: '3 h', note: 'after boiling, add 30 min room-temp proof' },
      ],
      bake: { temp: '220°C', steam: null, finish: '20 to 24 min until deep golden' },
    },
    {
      id: 'rye',
      name: 'Rye loaf',
      unit: 'loaf',
      sizes: LOAF_SIZES,
      note: 'Rye has little gluten, so keep hydration moderate and expect a denser loaf.',
      hydration: [65, 70, 75],
      ingredients: { salt: 2, starter: 20, caraway: 2 },
      doughYield: 1.82,
      rises: [
        { name: 'Bulk ferment', min: '3 h', max: '5 h', note: 'stops rising earlier than wheat; do not over-ferment' },
        { name: 'Shape and proof', min: '1.5 h', max: '3 h', note: 'rye proof is shorter; done when puffy, not doubled' },
      ],
      bake: { temp: '230°C', steam: '20 min covered, then', finish: '40 to 50 min uncovered at 210°C' },
    },
    {
      id: 'sandwich',
      name: 'Sandwich loaf',
      unit: 'loaf',
      sizes: LOAF_SIZES,
      note: 'Soft crumb, enriched dough, baked in a tin.',
      hydration: [60, 63, 65],
      ingredients: { salt: 2, butter: 5, sugar: 5, milk: 10, yeast: 1.5 },
      doughYield: 1.87,
      rises: [
        { name: 'Bulk ferment', min: '1.5 h', max: '2 h', note: 'until puffy, not necessarily doubled' },
        { name: 'Tin proof', min: '45 min', max: '75 min', note: 'until the dough crowns the tin by about 2 cm' },
      ],
      bake: { temp: '190°C', steam: null, finish: '30 to 35 min until deep gold' },
    },
    {
      id: 'pretzel',
      name: 'Pretzel',
      unit: 'pretzel',
      sizes: PRETZEL_SIZES,
      note: 'Chewy, alkaline-dipped, coarse salt on top. Boil in baking-soda water before baking.',
      hydration: [50, 55, 60],
      ingredients: { salt: 2, butter: 4, malt: 2, yeast: 1 },
      doughYield: 1.61,
      rises: [
        { name: 'Bulk ferment', min: '1 h', max: '1.5 h', note: 'room temperature, until puffy' },
        { name: 'Shape and rest', min: '20 min', max: '40 min', note: 'dip in 3% baking-soda solution, then score and salt' },
      ],
      bake: { temp: '220°C', steam: null, finish: '14 to 18 min until deep brown' },
    },
  ];

  const INGREDIENT_LABELS = {
    flour: 'Flour',
    water: 'Water',
    salt: 'Salt',
    starter: 'Starter (100% hydration)',
    yeast: 'Instant yeast',
    oil: 'Oil',
    malt: 'Barley malt syrup',
    butter: 'Butter',
    sugar: 'Sugar',
    milk: 'Milk powder',
    caraway: 'Caraway seeds',
  };

  const el = {
    breadType: document.getElementById('bread-type'),
    hydration: document.getElementById('hydration'),
    loafCount: document.getElementById('loaf-count'),
    loafSize: document.getElementById('loaf-size'),
    breadNote: document.getElementById('bread-note'),
    hydrationNote: document.getElementById('hydration-note'),
    loafSizeNote: document.getElementById('loaf-size-note'),
    result: document.getElementById('result'),
  };

  function fillSelect(sel, items, selected) {
    sel.innerHTML = items.map(function (it) {
      return '<option value="' + it.value + '">' + it.label + '</option>';
    }).join('');
    sel.value = selected;
  }

  function currentBread() {
    return BREADS.find(function (b) { return b.id === el.breadType.value; }) || BREADS[0];
  }

  function populateBreads() {
    fillSelect(el.breadType,
      BREADS.map(function (b) { return { value: b.id, label: b.name }; }),
      'sourdough');
  }

  function populateHydration() {
    const b = currentBread();
    fillSelect(el.hydration,
      b.hydration.map(function (h) {
        const level = h >= 75 ? 'high' : h >= 65 ? 'medium' : 'low';
        return { value: String(h), label: h + '% (' + level + ')' };
      }),
      String(b.hydration[1] !== undefined ? b.hydration[1] : b.hydration[0]));
    el.hydrationNote.textContent = b.note;
  }

  function plural(unit, n) {
    if (n === 1) return '1 ' + unit;
    if (unit === 'loaf') return n + ' loaves';
    return n + ' ' + unit + 's';
  }

  function populateCount() {
    const unit = currentBread().unit;
    fillSelect(el.loafCount,
      [1, 2, 3, 4, 6, 8, 12].map(function (n) {
        return { value: String(n), label: plural(unit, n) };
      }),
      '2');
  }

  function populateSizes() {
    const sizes = currentBread().sizes;
    const preferred = sizes.some(function (s) { return s.key === el.loafSize.value; })
      ? el.loafSize.value
      : (sizes.find(function (s) { return s.key === 'regular' || s.key === 'medium'; }) || sizes[0]).key;
    fillSelect(el.loafSize,
      sizes.map(function (s) { return { value: s.key, label: s.label + ' — ' + s.grams + ' g' }; }),
      preferred);
  }

  function currentSize() {
    const sizes = currentBread().sizes;
    return sizes.find(function (s) { return s.key === el.loafSize.value; }) || sizes[0];
  }

  function compute() {
    const b = currentBread();
    const hydration = parseInt(el.hydration.value, 10);
    const count = parseInt(el.loafCount.value, 10);
    const size = currentSize();
    const unit = b.unit;

    const totalLoafGrams = size.grams * count;
    const totalFlour = totalLoafGrams / b.doughYield;
    const rows = [
      { label: INGREDIENT_LABELS.flour, grams: totalFlour },
      { label: INGREDIENT_LABELS.water, grams: totalFlour * hydration / 100 },
    ];
    Object.keys(b.ingredients).forEach(function (key) {
      rows.push({ label: INGREDIENT_LABELS[key] || key, grams: totalFlour * b.ingredients[key] / 100 });
    });

    el.result.innerHTML =
      '<div>' +
      '<div class="text-xs uppercase tracking-wide text-violet-300 font-semibold">Recipe</div>' +
      '<div class="text-sm text-zinc-400 mt-0.5">' + b.name + ', ' + hydration + '% hydration, ' + plural(unit, count) + ' at ' + size.grams + ' g (' + totalLoafGrams + ' g total)</div>' +
      '</div>' +

      '<div class="rounded-lg border border-zinc-700/50 divide-y divide-zinc-700/50">' +
      rows.map(function (row) {
        const g = row.grams < 10 ? Math.round(row.grams * 10) / 10 : Math.round(row.grams);
        return '<div class="flex justify-between items-center px-3 py-2">' +
          '<span class="text-sm text-zinc-300">' + row.label + '</span>' +
          '<span class="font-mono text-sm text-zinc-100">' + g + ' g</span>' +
          '</div>';
      }).join('') +
      '</div>' +

      '<div>' +
      '<div class="text-xs uppercase tracking-wide text-violet-300 font-semibold">Rise times</div>' +
      '<div class="mt-1.5 flex flex-col gap-2">' +
      b.rises.map(function (r2) {
        return '<div class="text-sm text-zinc-300"><span class="text-zinc-100 font-medium">' + r2.name + ':</span> ' +
          r2.min + ' to ' + r2.max + ' <span class="text-zinc-500">(' + r2.note + ')</span></div>';
      }).join('') +
      '</div>' +
      '</div>' +

      '<div>' +
      '<div class="text-xs uppercase tracking-wide text-violet-300 font-semibold">Baking</div>' +
      '<div class="text-sm text-zinc-300 mt-1"><span class="text-zinc-100 font-medium">' + b.bake.temp + '</span>' +
      (b.bake.steam ? ' ' + b.bake.steam : '') +
      ' ' + b.bake.finish + '</div>' +
      '</div>';

    el.breadNote.textContent = b.note;
  }

  function syncAll() {
    populateHydration();
    populateCount();
    populateSizes();
    const isPiece = currentBread().unit !== 'loaf';
    el.loafSizeNote.textContent = isPiece
      ? 'Weight per piece of raw dough. Baked pieces come out about 10 to 15% lighter.'
      : 'Dough weight before bake loss. Baked loaves come out about 10 to 15% lighter.';
    compute();
  }

  el.breadType.addEventListener('change', syncAll);
  el.hydration.addEventListener('change', compute);
  el.loafCount.addEventListener('change', compute);
  el.loafSize.addEventListener('change', compute);

  populateBreads();
  syncAll();
})();
