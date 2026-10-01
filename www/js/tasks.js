/* ============================================================
   Balochistan Nama — tasks.js (v2.0)
   M3: وظیفه/تودول مستقل — deadline + تکرار + نمایش در تقویم
   ============================================================ */
(function (global) {
  'use strict';

  var LS_KEY = 'blx_tasks';
  var todayJ = null;

  function readTasks() {
    try {
      var v = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function saveTasks(list) {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  }

  function uid() {
    return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // فرمات: "1405/07/01" (jalali) یا ISO "2026-09-23"
  function todayJalali() {
    if (typeof Cal !== 'undefined' && Cal.toJalaali) {
      var t = new Date();
      return Cal.toJalaali(t.getFullYear(), t.getMonth() + 1, t.getDate());
    }
    return null;
  }

  function isToday(task) {
    if (!task.deadline) return false;
    var t = todayJalali();
    if (!t) return false;
    // deadline فرمت: "1405/07/01"
    var parts = String(task.deadline).split('/');
    if (parts.length !== 3) return false;
    return parseInt(parts[0], 10) === t.jy && parseInt(parts[1], 10) === t.jm && parseInt(parts[2], 10) === t.jd;
  }

  function isOverdue(task) {
    if (!task.deadline || task.done) return false;
    var t = todayJalali();
    if (!t) return false;
    var parts = String(task.deadline).split('/');
    if (parts.length !== 3) return false;
    var dy = parseInt(parts[0], 10), dm = parseInt(parts[1], 10), dd = parseInt(parts[2], 10);
    if (dy < t.jy) return true;
    if (dy === t.jy && dm < t.jm) return true;
    if (dy === t.jy && dm === t.jm && dd < t.jd) return true;
    return false;
  }

  function addTask(title, deadline, repeat, note) {
    var tasks = readTasks();
    var t = {
      id: uid(),
      title: title || 'وظیفه بدون عنوان',
      deadline: deadline || '',
      repeat: repeat || 'none', // none / daily / weekly / monthly
      note: note || '',
      done: false,
      createdAt: new Date().toISOString()
    };
    tasks.push(t);
    saveTasks(tasks);
    return t;
  }

  function updateTask(id, patch) {
    var tasks = readTasks();
    var found = false;
    tasks.forEach(function (t) {
      if (t.id === id) {
        Object.keys(patch || {}).forEach(function (k) { t[k] = patch[k]; });
        found = true;
      }
    });
    if (found) saveTasks(tasks);
    return found;
  }

  function toggleTask(id) {
    var tasks = readTasks();
    var changed = false;
    tasks.forEach(function (t) {
      if (t.id === id) { t.done = !t.done; changed = true; }
    });
    if (changed) saveTasks(tasks);
    return changed;
  }

  function removeTask(id) {
    var tasks = readTasks().filter(function (t) { return t.id !== id; });
    saveTasks(tasks);
  }

  function getTasks() {
    return readTasks();
  }

  // وظایف به‌روز برای یک روز جلالی (برای نمایش در تقویم)
  function tasksForDay(jy, jm, jd) {
    var tasks = readTasks();
    var out = [];
    tasks.forEach(function (t) {
      if (!t.deadline) return;
      var parts = String(t.deadline).split('/');
      if (parts.length !== 3) return;
      var dy = parseInt(parts[0], 10), dm = parseInt(parts[1], 10), dd = parseInt(parts[2], 10);
      if (dy === jy && dm === jm && dd === jd) out.push(t);
      // تکراری‌ها: نمایش در روز متناظر
      else if (t.repeat === 'weekly' && dm === jm && dd === jd && t.done === false) {
        // نمایش هفتگی: هر ۷ روز (تقریبی — برای نسخه ساده فقط deadline اصلی)
      }
    });
    return out;
  }

  // نمایش در نمای تقویم (inject به view-cal اگر موجود باشد)
  function renderInCalendar() {
    var calBox = document.getElementById('calTasksList');
    if (!calBox) return;
    var tasks = readTasks().filter(function (t) { return !t.done; });
    calBox.innerHTML = tasks.length
      ? tasks.map(function (t) {
          var overdue = isOverdue(t);
          return '<div class="cal-task-item' + (overdue ? ' overdue' : '') + '" data-tid="' + t.id + '" ' +
            'style="padding:6px 8px; border:1px solid ' + (overdue ? '#f87171' : 'var(--line)') + '; border-radius:8px; margin:4px 0; font-size:12px; display:flex; align-items:center; gap:6px;">' +
            '<span>' + (t.done ? '✅' : '☐') + '</span>' +
            '<span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' +
            (typeof global !== 'undefined' && global.App && global.App.escapeHtml ? global.App.escapeHtml(t.title) : t.title) + '</span>' +
            (t.deadline ? '<span class="text-muted">📅 ' + t.deadline + '</span>' : '') +
            '</div>';
        }).join('')
      : '<div class="text-small text-muted">وظیفه‌ای ندارید</div>';
  }

  global.BXTask = {
    add: addTask,
    update: updateTask,
    toggle: toggleTask,
    remove: removeTask,
    get: getTasks,
    forDay: tasksForDay,
    isOverdue: isOverdue,
    isToday: isToday,
    renderInCalendar: renderInCalendar
  };
})(typeof window !== 'undefined' ? window : this);
