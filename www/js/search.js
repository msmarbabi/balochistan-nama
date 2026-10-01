/* ============================================================
   Balochistan Nama — search.js (v2.0)
   M2: جستجو و آرشیو full-text روی مناسبت‌ها + یادداشت‌ها + وظایف
   فیلتر: ماه / سال / نوع
   ============================================================ */
(function (global) {
  'use strict';

  var state = {
    q: '',
    month: 0,   // 0 = همه، 1-12 = جلالی
    year: 0,    // 0 = همه
    type: 'all' // all / events / notes / tasks
  };

  function norm(s) {
    return String(s || '')
      .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
      .replace(/ه/g, 'ه')
      .toLowerCase();
  }

  function readJSON(key, fb) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || 'null');
      return v || fb;
    } catch (e) { return fb; }
  }

  // جمع‌آوری همه آیتم‌ها
  function collect() {
    var items = [];

    // مناسبت‌های شخصی (blx_personal_events)
    var pe = readJSON('blx_personal_events', []);
    pe.forEach(function (ev) {
      if (!ev) return;
      var t = norm(ev.title || '');
      var body = norm(ev.title + ' ' + (ev.desc || '') + ' ' + (ev.type || ''));
      items.push({
        kind: 'event',
        icon: ev.type === 'holiday' ? '🎉' : ev.type === 'birthday' ? '🎂' : '📅',
        title: ev.title || 'مناسبت',
        sub: (ev.date ? ev.date : '') + (ev.desc ? ' — ' + ev.desc : ''),
        jy: ev.jy || 0, jm: ev.jm || 0,
        raw: body, id: ev.id
      });
    });

    // مناسبت‌های داخلی (Events اگر موجود باشد)
    if (typeof Events !== 'undefined' && Events.all) {
      try {
        var built = Events.all ? Events.all() : [];
        built.forEach(function (ev) {
          if (!ev || !ev.title) return;
          items.push({
            kind: 'event',
            icon: ev.hijri ? '🌙' : '📅',
            title: ev.title,
            sub: ev.jalali ? ev.jalali : '',
            jy: ev.jy || 0, jm: ev.jm || 0,
            raw: norm(ev.title + ' ' + (ev.desc || '')),
            builtIn: true
          });
        });
      } catch (e) {}
    }

    // یادداشت‌ها
    var notes = readJSON('blx_nama_notes', []);
    notes.forEach(function (n) {
      if (!n) return;
      items.push({
        kind: 'note',
        icon: '📝',
        title: n.title || 'یادداشت بدون عنوان',
        sub: n.body ? n.body.slice(0, 80) : '',
        raw: norm(n.title + ' ' + (n.body || '')),
        date: n.created || 0
      });
    });

    // وظایف
    var tasks = readJSON('blx_tasks', []);
    tasks.forEach(function (t) {
      if (!t) return;
      items.push({
        kind: 'task',
        icon: t.done ? '✅' : '☐',
        title: t.title || 'وظیفه',
        sub: (t.deadline ? '📅 ' + t.deadline : '') + (t.repeat ? ' 🔁' : ''),
        raw: norm(t.title + ' ' + (t.note || '')),
        jy: t.jy || 0, jm: t.jm || 0
      });
    });

    return items;
  }

  function search() {
    var items = collect();
    var q = norm(state.q);
    var out = [];
    items.forEach(function (it) {
      if (state.type !== 'all' && it.kind !== state.type) return;
      if (state.month && it.jm && it.jm !== state.month) return;
      if (state.year && it.jy && it.jy !== state.year) return;
      if (q && it.raw.indexOf(q) === -1) return;
      out.push(it);
    });
    // مرتب‌سازی: رویدادها اول، بعد یادداشت، بعد وظایف
    var order = { event: 0, note: 1, task: 2 };
    out.sort(function (a, b) { return (order[a.kind] - order[b.kind]) || a.title.localeCompare(b.title); });
    return out;
  }

  function render(container) {
    var box = document.getElementById(container);
    if (!box) return;
    var results = search();

    // UI فیلتر
    var filterHtml =
      '<div class="search-filter" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">' +
      '<select class="select" id="searchTypeSel" style="max-width:90px;">' +
      '<option value="all" ' + (state.type === 'all' ? 'selected' : '') + '>همه</option>' +
      '<option value="event" ' + (state.type === 'event' ? 'selected' : '') + '>مناسبت</option>' +
      '<option value="note" ' + (state.type === 'note' ? 'selected' : '') + '>یادداشت</option>' +
      '<option value="task" ' + (state.type === 'task' ? 'selected' : '') + '>وظیفه</option>' +
      '</select>' +
      '<select class="select" id="searchMonthSel" style="max-width:100px;">' +
      '<option value="0" ' + (state.month === 0 ? 'selected' : '') + '>همه ماه‌ها</option>' +
      '<option value="1">فروردین</option><option value="2">اردیبهشت</option>' +
      '<option value="3">خرداد</option><option value="4">تیر</option>' +
      '<option value="5">مرداد</option><option value="6">شهریور</option>' +
      '<option value="7">مهر</option><option value="8">آبان</option>' +
      '<option value="9">آذر</option><option value="10">دی</option>' +
      '<option value="11">بهمن</option><option value="12">اسفند</option>' +
      '</select>' +
      '<span class="text-small text-muted">' + results.length + ' نتیجه</span>' +
      '</div>';

    var listHtml = results.length
      ? results.slice(0, 50).map(function (it) {
          return '<div class="search-item" data-id="' + (it.id || '') + '" data-kind="' + it.kind + '" ' +
            'style="padding:8px 10px; border:1px solid var(--line); border-radius:10px; margin-bottom:6px; display:flex; align-items:center; gap:8px;">' +
            '<span style="font-size:20px;">' + it.icon + '</span>' +
            '<div style="flex:1; min-width:0;">' +
            '<div style="font-size:14px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' +
            (typeof global !== 'undefined' && global.App && global.App.escapeHtml ? global.App.escapeHtml(it.title) : it.title) +
            '</div>' +
            (it.sub ? '<div class="text-small text-muted" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' +
            (typeof global !== 'undefined' && global.App && global.App.escapeHtml ? global.App.escapeHtml(it.sub) : it.sub) +
            '</div>' : '') +
            '</div>' +
            (it.kind === 'event' ? '<span class="text-small text-muted">📅</span>' :
             it.kind === 'note' ? '<span class="text-small text-muted">📝</span>' : '') +
            '</div>';
        }).join('')
      : '<div class="text-small text-muted" style="text-align:center; padding:20px;">' +
        (state.q ? 'نتیجه‌ای برای «' + state.q + '» پیدا نشد' : 'جستجو را شروع کن — مثلاً «هانی»') +
        '</div>';

    box.innerHTML = filterHtml + listHtml;

    // بایند فیلترها
    var typeSel = document.getElementById('searchTypeSel');
    if (typeSel) typeSel.addEventListener('change', function () { state.type = this.value; render(container); });
    var monthSel = document.getElementById('searchMonthSel');
    if (monthSel) monthSel.addEventListener('change', function () { state.month = parseInt(this.value, 10); render(container); });

    // کلیک روی آیتم
    box.querySelectorAll('.search-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var kind = el.getAttribute('data-kind');
        if (kind === 'note' && typeof Notes !== 'undefined' && Notes.open) {
          Notes.open();
        } else if (kind === 'task' && typeof App !== 'undefined' && App.switchRoute) {
          App.switchRoute('calendar');
        } else if (kind === 'event' && typeof App !== 'undefined' && App.switchRoute) {
          App.switchRoute('calendar');
        }
      });
    });
  }

  // UI سراسری: search bar در toolbar
  function initGlobalSearch() {
    var inp = document.getElementById('globalSearch');
    var view = document.getElementById('view-search');
    if (!inp) return;

    // search input در toolbar → باز کردن view-search
    inp.addEventListener('input', function () {
      state.q = inp.value;
      if (typeof App !== 'undefined' && App.switchRoute) App.switchRoute('search');
      render('searchResults');
    });

    // view-search
    if (view) {
      var searchInput = view.querySelector('input[type="search"]') || document.getElementById('searchInput');
      if (searchInput && searchInput !== inp) {
        searchInput.addEventListener('input', function () {
          state.q = searchInput.value;
          render('searchResults');
        });
      }
    }
  }

  global.BXSearch = {
    search: search,
    render: render,
    init: initGlobalSearch,
    getState: function () { return JSON.parse(JSON.stringify(state)); }
  };
})(typeof window !== 'undefined' ? window : this);
