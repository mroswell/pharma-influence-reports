/* =========================================================================
   charts.js — hand-coded, dependency-free interactive graphics.
   Progressive enhancement: every widget has a static fallback in the HTML;
   these modules only run when they find their hook, and only after we mark
   <html class="js">. Nothing here requires a network request.
   ========================================================================= */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var SVGNS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, text) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function money(n) { return '$' + n.toLocaleString('en-US'); }
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* =======================================================================
     1) TOP-20 — sort + filter the existing bar chart AND the data table.
        Reads data straight from the DOM the server already rendered, so
        there is no duplicated data source to drift out of sync.
     ======================================================================= */
  function initTop20() {
    var root = document.querySelector('[data-chart="top20"]');
    if (!root) return;
    var chart = document.querySelector('[data-top20="chart"]');
    var table = document.querySelector('[data-top20="table"] tbody');
    if (!chart) return;

    var partyOf = function (barEl) {
      return barEl.classList.contains('dem') ? 'dem'
           : barEl.classList.contains('rep') ? 'rep'
           : barEl.classList.contains('ind') ? 'ind' : '';
    };

    // Build a model from the chart rows.
    var rows = [].map.call(chart.querySelectorAll('.barchart__row'), function (row, i) {
      var nameEl = row.querySelector('.barchart__name');
      var stEl = nameEl.querySelector('.st');
      var name = nameEl.childNodes[0].textContent.trim();
      var amount = parseInt(row.querySelector('.barchart__val').textContent.replace(/[^0-9]/g, ''), 10);
      var party = partyOf(row.querySelector('.barchart__bar'));
      var trow = table ? table.querySelectorAll('tr')[i] : null;
      return { name: name, state: stEl ? stEl.textContent.trim() : '', amount: amount,
               party: party, order: i, chartRow: row, tableRow: trow };
    });

    var state = { party: 'all', sort: 'amount' };

    function apply() {
      var view = rows.slice();
      view.sort(function (a, b) {
        if (state.sort === 'amount') return b.amount - a.amount;
        if (state.sort === 'name') return a.name.localeCompare(b.name);
        if (state.sort === 'state') return a.state.localeCompare(b.state) || b.amount - a.amount;
        return a.order - b.order;
      });
      var shown = 0;
      view.forEach(function (r) {
        var vis = state.party === 'all' || r.party === state.party;
        r.chartRow.hidden = !vis;
        if (r.tableRow) r.tableRow.hidden = !vis;
        if (vis) shown++;
        chart.appendChild(r.chartRow);                 // reorder chart
        if (r.tableRow) table.appendChild(r.tableRow);  // reorder table (rank cell updates below)
      });
      // renumber visible table rank cells to reflect current order
      if (table) {
        var rank = 1;
        [].forEach.call(table.querySelectorAll('tr'), function (tr) {
          if (tr.hidden) return;
          var rc = tr.querySelector('.rank');
          if (rc) rc.textContent = state.sort === 'amount' ? rank++ : '·';
        });
      }
      note.textContent = 'Showing ' + shown + ' of ' + rows.length + ' senators'
        + (state.party === 'all' ? '' : ' · ' + ({dem:'Democrats',rep:'Republicans',ind:'Independents'}[state.party]))
        + ' · sorted by ' + ({amount:'amount',name:'name',state:'state'}[state.sort]) + '.';
    }

    // Controls UI
    var controls = document.createElement('div');
    controls.className = 'controls js-only';
    controls.innerHTML =
      '<div class="controls__group"><span class="controls__label">Party</span>' +
        '<button class="chip" data-party="all" aria-pressed="true">All</button>' +
        '<button class="chip dem" data-party="dem" aria-pressed="false">Democrat</button>' +
        '<button class="chip rep" data-party="rep" aria-pressed="false">Republican</button>' +
        '<button class="chip ind" data-party="ind" aria-pressed="false">Independent</button>' +
      '</div>' +
      '<div class="controls__group"><span class="controls__label">Sort by</span>' +
        '<select class="control-select" data-sort>' +
          '<option value="amount">Amount (high → low)</option>' +
          '<option value="name">Senator (A → Z)</option>' +
          '<option value="state">State (A → Z)</option>' +
        '</select>' +
      '</div>';
    root.insertBefore(controls, root.firstChild);
    var note = document.createElement('p');
    note.className = 'count-note js-only';
    root.insertBefore(note, controls.nextSibling);

    controls.querySelectorAll('[data-party]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.party = btn.getAttribute('data-party');
        controls.querySelectorAll('[data-party]').forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        apply();
      });
    });
    controls.querySelector('[data-sort]').addEventListener('change', function (e) {
      state.sort = e.target.value; apply();
    });
    apply();
  }

  /* =======================================================================
     2) SCATTER / BEESWARM — contributions vs. IRA vote.
        Data embedded in a JSON <script>. Two lanes (Against / For), each
        dot placed by dollar amount; group means drawn honestly.
     ======================================================================= */
  function initScatter() {
    var host = document.getElementById('scatter');
    if (!host) return;
    var data;
    try { data = JSON.parse(document.getElementById('scatter-data').textContent); }
    catch (e) { return; }

    var lanes = [
      { key: 'against', label: 'Voted AGAINST' },
      { key: 'for', label: 'Voted FOR' }
    ];
    var W = 720, padL = 28, padR = 28, padT = 34, laneH = 132, axisH = 46;
    var H = padT + lanes.length * laneH + axisH;
    var maxAmt = 350000;
    var x = function (v) { return padL + (v / maxAmt) * (W - padL - padR); };

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': 'Beeswarm chart: pharmaceutical contributions by senators who voted for versus against the Inflation Reduction Act drug-pricing provisions.' });

    // x gridlines + labels
    [0, 100000, 200000, 300000].forEach(function (g) {
      svg.appendChild(el('line', { class: 'swarm-grid', x1: x(g), y1: padT - 8, x2: x(g), y2: padT + lanes.length * laneH }));
      svg.appendChild(el('text', { class: 'swarm-axis-label', x: x(g), y: H - axisH + 26, 'text-anchor': 'middle' },
        g === 0 ? '$0' : '$' + (g / 1000) + 'k'));
    });
    svg.appendChild(el('text', { class: 'swarm-axis-label', x: (W) / 2, y: H - 6, 'text-anchor': 'middle' },
      'Pharmaceutical contributions received, 2023–24 cycle'));

    var tip = document.getElementById('scatter-tip');
    function place(dots, laneTop) {
      // simple vertical jitter to avoid overlap: sort by amount, stagger
      var sorted = dots.slice().sort(function (a, b) { return a.amount - b.amount; });
      var used = [];
      sorted.forEach(function (d) {
        var cx = x(d.amount), r = 8, row = 0;
        while (used.some(function (u) { return u.row === row && Math.abs(u.cx - cx) < r * 2.05; })) row++;
        used.push({ row: row, cx: cx });
        d._cx = cx; d._cy = laneTop + 52 - row * (r * 2.1);
      });
    }

    lanes.forEach(function (lane, li) {
      var laneTop = padT + li * laneH;
      var group = data.filter(function (d) { return d.vote === lane.key; });
      svg.appendChild(el('line', { class: 'swarm-axis-line', x1: padL, y1: laneTop + 60, x2: W - padR, y2: laneTop + 60 }));
      svg.appendChild(el('text', { class: 'swarm-lane-label', x: padL, y: laneTop + 14 }, lane.label));
      // group mean
      var mean = group.reduce(function (s, d) { return s + d.amount; }, 0) / group.length;
      svg.appendChild(el('line', { class: 'swarm-mean', x1: x(mean), y1: laneTop + 4, x2: x(mean), y2: laneTop + 74 }));
      svg.appendChild(el('text', { class: 'swarm-mean-label', x: x(mean), y: laneTop + 90, 'text-anchor': 'middle', fill: '#1c1a16' },
        'avg ' + money(Math.round(mean))));

      place(group, laneTop);
      group.forEach(function (d) {
        var g = el('g', { class: 'dot ' + d.party, tabindex: '0', role: 'listitem',
          'aria-label': d.name + ', ' + money(d.amount) + ', voted ' + lane.key });
        g.appendChild(el('circle', { cx: d._cx, cy: d._cy, r: 8 }));
        function show(e) {
          if (!tip) return;
          tip.innerHTML = '<strong>' + d.name + '</strong> · ' + d.stateParty +
            '<br><span class="v">' + money(d.amount) + '</span> · voted ' + (lane.key === 'against' ? 'AGAINST' : 'FOR');
          var box = host.getBoundingClientRect();
          var pt = g.getBoundingClientRect();
          tip.style.left = (pt.left - box.left + pt.width / 2) + 'px';
          tip.style.top = (pt.top - box.top) + 'px';
          tip.style.opacity = '1';
        }
        function hide() { if (tip) tip.style.opacity = '0'; }
        g.addEventListener('mouseenter', show);
        g.addEventListener('mouseleave', hide);
        g.addEventListener('focus', show);
        g.addEventListener('blur', hide);
        svg.appendChild(g);
      });
    });

    host.innerHTML = '';
    host.appendChild(svg);
  }

  /* =======================================================================
     3) RISK TOGGLE — relative (95%) vs absolute (~0.84%, NNT ~119).
     ======================================================================= */
  function initRisk() {
    var root = document.getElementById('risk');
    if (!root) return;
    var tabs = root.querySelectorAll('.risk__tab');
    var panels = root.querySelectorAll('.risk__panel');
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x, j) {
          x.setAttribute('aria-selected', j === i ? 'true' : 'false');
          panels[j].hidden = j !== i;
        });
      });
    });
    var built = false;
    function buildWaffle() {
      if (built) return; built = true;
      var w = root.querySelector('#risk-waffle');
      if (!w) return;
      for (var k = 0; k < 119; k++) {
        var i = document.createElement('i');
        if (k === 0) i.className = 'on';           // the one case prevented
        else i.className = 'faint';
        w.appendChild(i);
      }
    }
    buildWaffle();
  }

  /* =======================================================================
     4) TIMELINE — data-driven, reused across reports. Clickable nodes reveal
        detail; keyboard-accessible; falls back to the <ol> already in HTML.
     ======================================================================= */
  function initTimelines() {
    document.querySelectorAll('[data-widget="timeline"]').forEach(function (root) {
      var data;
      try { data = JSON.parse(root.querySelector('script[type="application/json"]').textContent); }
      catch (e) { return; }

      var wrap = document.createElement('div');
      wrap.className = 'timeline js-only';
      var track = document.createElement('div');
      track.className = 'timeline__track';
      track.setAttribute('role', 'tablist');
      var detail = document.createElement('div');
      detail.className = 'timeline__detail';
      detail.setAttribute('role', 'region');
      detail.setAttribute('aria-live', 'polite');

      function select(idx) {
        data.forEach(function (d, i) {
          nodes[i].setAttribute('aria-expanded', i === idx ? 'true' : 'false');
          nodes[i].setAttribute('aria-selected', i === idx ? 'true' : 'false');
        });
        var d = data[idx];
        detail.innerHTML = '<span class="d">' + d.date + '</span>' +
          '<h4>' + d.title + '</h4><p>' + d.body + '</p>';
        nodes[idx].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }

      var nodes = data.map(function (d, i) {
        var b = document.createElement('button');
        b.className = 'tl-node';
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-expanded', 'false');
        b.innerHTML = '<span class="tl-node__date">' + d.date + '</span>' +
          '<span class="tl-node__dot"></span>' +
          '<span class="tl-node__title">' + d.title + '</span>';
        b.addEventListener('click', function () { select(i); });
        b.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowRight') { e.preventDefault(); nodes[Math.min(i + 1, data.length - 1)].focus(); select(Math.min(i + 1, data.length - 1)); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); nodes[Math.max(i - 1, 0)].focus(); select(Math.max(i - 1, 0)); }
        });
        track.appendChild(b);
        return b;
      });

      var hint = document.createElement('p');
      hint.className = 'timeline__hint';
      hint.textContent = 'Select a point on the timeline to read more · use ← → keys to move.';

      wrap.appendChild(track);
      wrap.appendChild(hint);
      wrap.appendChild(detail);
      root.appendChild(wrap);
      select(0);
    });
  }

  ready(function () {
    initTop20();
    initScatter();
    initRisk();
    initTimelines();
  });
})();
