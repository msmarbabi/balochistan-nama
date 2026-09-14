/* ============================================================
   Balochistan Nama — actionsheet.js (v1.13)
   منوی انتخاب سفارشی (bottom sheet) — جایگزین <select> بومی
   در مودال تنظیمات: منو دیگر کل صفحه را نمی‌گیرد؛ از پایین به‌صورت
   شیت باز می‌شود و انتخاب در همان ردیف می‌ماند.
   ============================================================ */
(function (global) {
  'use strict';

  var sheetEl = null, backdropEl = null, current = null;

  function ensureDom() {
    if (sheetEl) return;
    backdropEl = document.createElement('div');
    backdropEl.className = 'bx-sheet-backdrop';
    backdropEl.addEventListener('click', close);
    sheetEl = document.createElement('div');
    sheetEl.className = 'bx-sheet';
    sheetEl.setAttribute('role', 'dialog');
    sheetEl.setAttribute('aria-modal', 'true');
    sheetEl.innerHTML =
      '<div class="bx-sheet__grab"></div>' +
      '<div class="bx-sheet__title" id="bxSheetTitle"></div>' +
      '<div class="bx-sheet__list" id="bxSheetList"></div>';
    document.body.appendChild(backdropEl);
    document.body.appendChild(sheetEl);
    // بستن با دکمه برگشت: focus + keydown
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && current) close(); });
  }

  /**
   * باز کردن شیت انتخاب
   * @param {Object} o  {title, options:[{value,label,desc?,icon?}], value, onChange}
   */
  function open(o) {
    ensureDom();
    current = o;
    document.getElementById('bxSheetTitle').textContent = o.title || 'انتخاب کنید';
    var list = document.getElementById('bxSheetList');
    list.innerHTML = '';
    (o.options || []).forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bx-sheet__item' + (opt.value === o.value ? ' selected' : '');
      btn.innerHTML =
        (opt.icon ? '<span class="bx-sheet__icon">' + opt.icon + '</span>' : '') +
        '<span class="bx-sheet__labels"><span class="bx-sheet__label">' +
        (global.BXUtils ? BXUtils.escapeHtml(opt.label) : String(opt.label)) +
        (opt.desc ? '<span class="bx-sheet__desc">' + (global.BXUtils ? BXUtils.escapeHtml(opt.desc) : String(opt.desc)) + '</span>' : '') +
        '</span></span>' +
        (opt.value === o.value ? '<span class="bx-sheet__check">✓</span>' : '');
      btn.addEventListener('click', function () {
        close();
        if (o.onChange) o.onChange(opt.value, opt);
      });
      list.appendChild(btn);
    });
    backdropEl.classList.add('show');
    sheetEl.classList.add('show');
  }

  function close() {
    if (!sheetEl) return;
    backdropEl.classList.remove('show');
    sheetEl.classList.remove('show');
    current = null;
  }

  /**
   * جایگزین یک <select> موجود با دکمه‌ی سفارشی که شیت باز می‌کند
   * @param {string} selId  آیدی select
   * @param {string} title  عنوان شیت
   */
  function replaceSelect(selId, title) {
    var sel = document.getElementById(selId);
    if (!sel || sel.__bxReplaced) return;
    sel.__bxReplaced = true;
    sel.style.display = 'none';

    function labelOf(v) {
      var opt = null;
      sel.querySelectorAll('option').forEach(function (o) { if (o.value === v) opt = o; });
      return opt ? opt.textContent : '';
    }
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'select bx-select-btn';
    btn.id = selId + '__btn';
    btn.innerHTML = '<span class="bx-select-btn__label">' + labelOf(sel.value) + '</span><span class="bx-select-btn__chev">▾</span>';
    // مقدار select را همیشه در sync نگه دار (applySettingsFromForm از sel.value می‌خواند)
    function syncBtn() { btn.querySelector('.bx-select-btn__label').textContent = labelOf(sel.value); }
    btn.addEventListener('click', function () {
      var options = [];
      sel.querySelectorAll('option').forEach(function (o) {
        if (o.value) options.push({ value: o.value, label: o.textContent, desc: o.__bxDesc });
      });
      open({
        title: title || 'انتخاب کنید',
        options: options,
        value: sel.value,
        onChange: function (v) { sel.value = v; syncBtn(); if (sel.onchange) sel.onchange(); }
      });
    });
    sel.__bxSyncBtn = syncBtn;
    if (sel.parentNode) sel.parentNode.insertBefore(btn, sel);
    // sync اولیه بعد از هر openSettings
    syncBtn();
  }

  // sync همه دکمه‌ها بعد از openSettings (مقادیر عوض می‌شوند)
  function syncAll() {
    document.querySelectorAll('.bx-select-btn').forEach(function (b) {
      if (b.__bxSync) b.__bxSync();
    });
    // هر دکمه sync خودش را از data-attr می‌گیرد — در نسخه ساده: dispatch
    document.querySelectorAll('select[__bxReplaced]') .forEach(function (sel) {
      if (sel.__bxSyncBtn) sel.__bxSyncBtn();
    });
  }

  global.BXSheet = { open: open, close: close, replaceSelect: replaceSelect, syncAll: syncAll };
})(typeof window !== 'undefined' ? window : this);
