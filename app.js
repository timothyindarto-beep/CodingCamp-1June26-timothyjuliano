// === STORAGE UTILS ===

/**
 * Returns true if localStorage is available and writable.
 * Tests by writing, reading back, and deleting a test value.
 */
function storageAvailable() {
  try {
    const testKey = '__pd_storage_test__';
    const testValue = '1';
    localStorage.setItem(testKey, testValue);
    const readBack = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    return readBack === testValue;
  } catch (e) {
    return false;
  }
}

/**
 * Safely reads and JSON-parses a value from localStorage.
 * Returns defaultValue if the key is absent or any error occurs.
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
function safeGetItem(key, defaultValue) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return defaultValue;
    return JSON.parse(value);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Safely JSON-serialises value and writes it to localStorage.
 * Returns true on success, false on QuotaExceededError or any DOMException.
 * @param {string} key
 * @param {*} value
 * @returns {boolean}
 */
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    if (e instanceof DOMException) {
      return false;
    }
    return false;
  }
}

// === THEME ===

const STORAGE_KEY_THEME = 'pd_theme';

/**
 * Reads pd_theme from localStorage, applies it to <body>, and wires the toggle button.
 * Defaults to 'light' if no stored value or an invalid value is found.
 */
function initTheme() {
  const stored = safeGetItem(STORAGE_KEY_THEME, 'light');
  const theme = (stored === 'light' || stored === 'dark') ? stored : 'light';
  applyTheme(theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', toggleTheme);
  }
}

/**
 * Sets body.dataset.theme to the given theme value and updates the toggle button icon.
 * @param {'light'|'dark'} theme
 */
function applyTheme(theme) {
  document.body.dataset.theme = theme;
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

/**
 * Flips the current theme between 'light' and 'dark',
 * persists the new value to localStorage (if available),
 * and applies it to the UI.
 */
function toggleTheme() {
  const current = document.body.dataset.theme === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  // Attempt to persist; if localStorage unavailable, still apply for the session
  safeSetItem(STORAGE_KEY_THEME, next);
  applyTheme(next);
}
// === GREETING ===

const STORAGE_KEY_NAME = 'pd_name';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Returns time in HH:MM 24-hour format from a Date object.
 * Both HH and MM are zero-padded to 2 digits.
 * @param {Date} d
 * @returns {string}
 */
function formatTime(d) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Returns date string in format "Weekday, Month Day, Year"
 * e.g. "Thursday, June 4, 2026"
 * @param {Date} d
 * @returns {string}
 */
function formatDate(d) {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Returns the appropriate greeting prefix based on the hour (0–23).
 * - 05–11: "Good morning"
 * - 12–17: "Good afternoon"
 * - 18–21: "Good evening"
 * - 22–23, 00–04: "Good night"
 * @param {number} hour
 * @returns {string}
 */
function getGreetingPrefix(hour) {
  if (hour >= 5 && hour <= 11) return 'Good morning';
  if (hour >= 12 && hour <= 17) return 'Good afternoon';
  if (hour >= 18 && hour <= 21) return 'Good evening';
  return 'Good night';
}

// In-memory greeting state
let greetingName = '';
let clockInterval = null;

/**
 * Renders the clock, date, and greeting text into the DOM.
 * Uses the current time and greetingName in-memory state.
 */
function renderClock() {
  const now = new Date();
  const timeEl = document.getElementById('current-time');
  const dateEl = document.getElementById('current-date');
  const greetEl = document.getElementById('greeting-text');
  if (timeEl) timeEl.textContent = formatTime(now);
  if (dateEl) dateEl.textContent = formatDate(now);
  if (greetEl) {
    const prefix = getGreetingPrefix(now.getHours());
    greetEl.textContent = greetingName
      ? `${prefix}, ${greetingName}!`
      : `${prefix}!`;
  }
}

/**
 * Calls renderClock() immediately, then starts a 60-second interval.
 * Stores the interval handle in clockInterval.
 */
function startClock() {
  renderClock();
  clockInterval = setInterval(renderClock, 60000);
}

/**
 * Validates and saves the name from #name-input.
 * Trims whitespace before validation.
 * Valid: trimmed length 1–50 → saves to localStorage, updates greetingName, re-renders.
 * Invalid: shows #name-error, does not save.
 */
function saveName() {
  const input = document.getElementById('name-input');
  const errorEl = document.getElementById('name-error');
  if (!input || !errorEl) return;

  const trimmed = input.value.trim();

  if (trimmed.length === 0 || trimmed.length > 50) {
    errorEl.textContent = trimmed.length === 0
      ? 'Please enter a name.'
      : 'Name must be 50 characters or fewer.';
    return;
  }

  errorEl.textContent = '';
  greetingName = trimmed;
  safeSetItem(STORAGE_KEY_NAME, trimmed);
  renderClock();
}

/**
 * Initialises the greeting widget.
 * Reads pd_name from localStorage, starts the clock, wires the save button.
 */
function initGreeting() {
  greetingName = safeGetItem(STORAGE_KEY_NAME, '');
  startClock();

  const saveBtn = document.getElementById('name-save');
  const nameInput = document.getElementById('name-input');
  if (saveBtn) saveBtn.addEventListener('click', saveName);
  // Also allow pressing Enter in the name input to save
  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveName();
    });
    // Pre-fill the input with stored name if available
    if (greetingName) nameInput.value = greetingName;
  }
}

// === FOCUS TIMER ===

const STORAGE_KEY_TIMER = 'pd_timer_duration';

// Timer state
let timerInterval   = null;   // setInterval handle — MUST be cleared on stop/reset
let timerRunning    = false;
let timerDuration   = 25;     // minutes
let timerRemaining  = 0;      // seconds
let pendingDuration = null;   // new duration saved while timer is running

/**
 * Converts total seconds to a zero-padded "MM:SS" string.
 * MM: Math.floor(seconds / 60), SS: seconds % 60, both padded to 2 digits.
 * @param {number} seconds
 * @returns {string}
 */
function formatMMSS(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Updates #timer-display with the current timerRemaining formatted as MM:SS.
 */
function updateTimerDisplay() {
  const el = document.getElementById('timer-display');
  if (el) el.textContent = formatMMSS(timerRemaining);
}

/**
 * Updates the disabled state of start/stop buttons to match current timer state.
 */
function updateTimerButtons() {
  const startBtn = document.getElementById('timer-start');
  const stopBtn  = document.getElementById('timer-stop');
  if (startBtn) startBtn.disabled = timerRunning;
  if (stopBtn)  stopBtn.disabled  = !timerRunning;
}

/**
 * Stops the timer: clears the interval, sets timerRunning to false, updates buttons.
 */
function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning  = false;
  updateTimerButtons();
}

/**
 * Resets the timer: stops it, restores timerRemaining to full duration, updates display.
 * Hides the completion signal if visible.
 */
function resetTimer() {
  stopTimer();
  timerRemaining = timerDuration * 60;
  updateTimerDisplay();
  const signal = document.getElementById('timer-complete-signal');
  if (signal) signal.classList.add('hidden');
}

/**
 * Called when countdown reaches 00:00.
 * Stops timer, shows completion signal for ≥3 seconds.
 * Applies pendingDuration if one was saved during the session.
 */
function handleTimerComplete() {
  stopTimer();
  const signal = document.getElementById('timer-complete-signal');
  if (signal) {
    signal.classList.remove('hidden');
    setTimeout(() => signal.classList.add('hidden'), 3000);
  }
  // Apply a pending duration change if one was queued during the session
  if (pendingDuration !== null) {
    timerDuration    = pendingDuration;
    timerRemaining   = pendingDuration * 60;
    pendingDuration  = null;
    updateTimerDisplay();
  }
}

/**
 * Called each second while the timer is running.
 * Decrements timerRemaining by 1; fires handleTimerComplete when it reaches 0.
 */
function tickTimer() {
  timerRemaining -= 1;
  if (timerRemaining > 0) {
    updateTimerDisplay();
  } else {
    timerRemaining = 0;
    updateTimerDisplay();
    handleTimerComplete();
  }
}

/**
 * Starts the timer countdown.
 * Guards: does nothing if already running.
 * Shows validation message if timerRemaining is 0.
 */
function startTimer() {
  if (timerRunning) return;

  const zeroError = document.getElementById('timer-zero-error');
  if (timerRemaining === 0) {
    if (zeroError) zeroError.textContent = 'Set a duration greater than 0 to start.';
    return;
  }
  if (zeroError) zeroError.textContent = '';

  // Clear any stale interval before starting a new one (prevents stacking)
  clearInterval(timerInterval);
  timerRunning  = true;
  timerInterval = setInterval(tickTimer, 1000);
  updateTimerButtons();
}

/**
 * Validates the duration input (1–120 minutes) and saves it.
 * If timer is not running: applies immediately (resets display).
 * If timer is running: stores as pendingDuration to apply at next session start.
 */
function saveDuration() {
  const input    = document.getElementById('duration-input');
  const errorEl  = document.getElementById('duration-error');
  if (!input || !errorEl) return;

  const n = parseInt(input.value, 10);

  if (isNaN(n) || n < 1 || n > 120) {
    errorEl.textContent = 'Duration must be a whole number between 1 and 120.';
    return;
  }

  errorEl.textContent = '';
  safeSetItem(STORAGE_KEY_TIMER, n);

  if (!timerRunning) {
    timerDuration  = n;
    timerRemaining = n * 60;
    updateTimerDisplay();
  } else {
    // Queue the change; it will be applied when the current session completes
    pendingDuration = n;
  }
}

/**
 * Initialises the Focus Timer widget.
 * Reads pd_timer_duration from localStorage, sets state, wires all buttons.
 */
function initTimer() {
  const stored = safeGetItem(STORAGE_KEY_TIMER, 25);
  timerDuration  = (typeof stored === 'number' && stored >= 1 && stored <= 120) ? stored : 25;
  timerRemaining = timerDuration * 60;
  updateTimerDisplay();
  updateTimerButtons();

  const startBtn    = document.getElementById('timer-start');
  const stopBtn     = document.getElementById('timer-stop');
  const resetBtn    = document.getElementById('timer-reset');
  const durationSave = document.getElementById('duration-save');
  const durationInput = document.getElementById('duration-input');

  if (startBtn)     startBtn.addEventListener('click', startTimer);
  if (stopBtn)      stopBtn.addEventListener('click', stopTimer);
  if (resetBtn)     resetBtn.addEventListener('click', resetTimer);
  if (durationSave) durationSave.addEventListener('click', saveDuration);
  // Pre-fill duration input with current value
  if (durationInput) durationInput.value = timerDuration;
}

// === TO-DO LIST ===

const STORAGE_KEY_TASKS = 'pd_tasks';

let tasks = []; // Array<{ id: string, text: string, done: boolean }>

function saveTasks() {
  return safeSetItem(STORAGE_KEY_TASKS, tasks);
}

function renderTaskItem(task) {
  const li = document.createElement('li');
  li.className = 'task-item' + (task.done ? ' done' : '');
  li.dataset.id = task.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-check';
  checkbox.checked = task.done;
  checkbox.setAttribute('aria-label', 'Mark complete');

  const span = document.createElement('span');
  span.className = 'task-text';
  span.textContent = task.text;
  if (task.done) span.style.textDecoration = 'line-through';

  const editBtn = document.createElement('button');
  editBtn.className = 'task-edit-btn';
  editBtn.setAttribute('aria-label', 'Edit task');
  editBtn.textContent = '✏️';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'task-delete-btn';
  deleteBtn.setAttribute('aria-label', 'Delete task');
  deleteBtn.textContent = '🗑️';

  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(editBtn);
  li.appendChild(deleteBtn);
  return li;
}

function renderTasks() {
  const list = document.getElementById('task-list');
  if (!list) return;
  list.innerHTML = '';
  if (tasks.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'task-empty';
    empty.textContent = 'No tasks yet. Add one above!';
    list.appendChild(empty);
    return;
  }
  tasks.forEach(task => list.appendChild(renderTaskItem(task)));
}

function addTask(text) {
  const errorEl = document.getElementById('todo-add-error');
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 500) {
    if (errorEl) errorEl.textContent = trimmed.length === 0
      ? 'Task cannot be empty.'
      : 'Task must be 500 characters or fewer.';
    return;
  }
  if (errorEl) errorEl.textContent = '';
  tasks.push({ id: crypto.randomUUID(), text: trimmed, done: false });
  const input = document.getElementById('todo-input');
  if (input) input.value = '';
  saveTasks();
  renderTasks();
}

function startEditTask(id) {
  const li = document.querySelector(`#task-list [data-id="${id}"]`);
  if (!li) return;
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  li.innerHTML = '';

  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'task-edit-input';
  editInput.maxLength = 255;
  editInput.value = task.text;

  const saveBtn = document.createElement('button');
  saveBtn.className = 'task-edit-save';
  saveBtn.textContent = '✓';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'task-edit-cancel';
  cancelBtn.textContent = '✕';

  const errP = document.createElement('p');
  errP.className = 'task-edit-error validation-msg';

  const confirm = () => confirmEditTask(id, editInput.value);
  const cancel  = () => renderTasks();

  saveBtn.addEventListener('click', confirm);
  cancelBtn.addEventListener('click', cancel);
  editInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') cancel();
  });

  li.appendChild(editInput);
  li.appendChild(saveBtn);
  li.appendChild(cancelBtn);
  li.appendChild(errP);
  editInput.focus();
}

function confirmEditTask(id, newText) {
  const li = document.querySelector(`#task-list [data-id="${id}"]`);
  const errP = li ? li.querySelector('.task-edit-error') : null;
  const trimmed = newText.trim();
  if (trimmed.length === 0) {
    if (errP) errP.textContent = 'Task cannot be empty.';
    return;
  }
  const task = tasks.find(t => t.id === id);
  if (task) task.text = trimmed;
  saveTasks();
  renderTasks();
}

function toggleTask(id) {
  const snapshot = tasks.map(t => ({ ...t }));
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  const ok = saveTasks();
  if (!ok) {
    tasks = snapshot;
    const warn = document.getElementById('todo-storage-warning');
    if (warn) { warn.textContent = 'Could not save. Change not persisted.'; warn.classList.remove('hidden'); }
  } else {
    renderTasks();
  }
}

function deleteTask(id) {
  const snapshot = tasks.map(t => ({ ...t }));
  tasks = tasks.filter(t => t.id !== id);
  const ok = saveTasks();
  if (!ok) {
    tasks = snapshot;
    const warn = document.getElementById('todo-storage-warning');
    if (warn) { warn.textContent = 'Could not save. Change not persisted.'; warn.classList.remove('hidden'); }
  } else {
    renderTasks();
  }
}

function initTodo() {
  const warn = document.getElementById('todo-storage-warning');
  tasks = safeGetItem(STORAGE_KEY_TASKS, []);
  if (!Array.isArray(tasks)) tasks = [];
  renderTasks();

  const input  = document.getElementById('todo-input');
  const addBtn = document.getElementById('todo-add-btn');
  if (addBtn) addBtn.addEventListener('click', () => addTask(input ? input.value : ''));
  if (input)  input.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(input.value); });

  // Event delegation for edit / delete / toggle inside #task-list
  const list = document.getElementById('task-list');
  if (list) {
    list.addEventListener('click', e => {
      const li = e.target.closest('.task-item');
      if (!li) return;
      const id = li.dataset.id;
      if (e.target.classList.contains('task-edit-btn'))   startEditTask(id);
      if (e.target.classList.contains('task-delete-btn')) deleteTask(id);
    });
    list.addEventListener('change', e => {
      if (e.target.classList.contains('task-check')) {
        const li = e.target.closest('.task-item');
        if (li) toggleTask(li.dataset.id);
      }
    });
  }

  if (!storageAvailable() && warn) {
    warn.textContent = 'Storage unavailable. Tasks will not be saved.';
    warn.classList.remove('hidden');
  }
}

// === QUICK LINKS ===

const STORAGE_KEY_LINKS = 'pd_links';
const MAX_LINKS = 50;

let links = []; // Array<{ id: string, label: string, url: string }>

function isValidUrl(url) {
  return /^https?:\/\/[^/\s]+/.test(url);
}

function saveLinks() {
  return safeSetItem(STORAGE_KEY_LINKS, links);
}

function renderLinks() {
  const grid = document.getElementById('links-grid');
  if (!grid) return;
  grid.innerHTML = '';
  links.forEach(link => {
    const card = document.createElement('div');
    card.className = 'link-card';
    card.setAttribute('role', 'listitem');
    card.dataset.id = link.id;

    const a = document.createElement('a');
    a.className = 'link-btn';
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = link.label;

    const delBtn = document.createElement('button');
    delBtn.className = 'link-delete-btn';
    delBtn.setAttribute('aria-label', 'Delete link');
    delBtn.textContent = '✕';

    card.appendChild(a);
    card.appendChild(delBtn);
    grid.appendChild(card);
  });
}

function addLink(label, url) {
  const errorEl = document.getElementById('link-add-error');
  const trimLabel = label.trim();
  const trimUrl   = url.trim();

  if (trimLabel.length === 0 || trimLabel.length > 100) {
    if (errorEl) errorEl.textContent = 'Label must be 1–100 characters.';
    return;
  }
  if (!isValidUrl(trimUrl)) {
    if (errorEl) errorEl.textContent = 'Enter a valid URL starting with http:// or https://';
    return;
  }
  if (links.length >= MAX_LINKS) {
    if (errorEl) errorEl.textContent = `Maximum of ${MAX_LINKS} links reached.`;
    return;
  }
  if (errorEl) errorEl.textContent = '';
  links.push({ id: crypto.randomUUID(), label: trimLabel, url: trimUrl });
  saveLinks();
  renderLinks();
}

function deleteLink(id) {
  const snapshot = links.map(l => ({ ...l }));
  links = links.filter(l => l.id !== id);
  const ok = saveLinks();
  if (!ok) {
    links = snapshot;
    const warn = document.getElementById('links-storage-warning');
    if (warn) { warn.textContent = 'Could not save. Change not persisted.'; warn.classList.remove('hidden'); }
  } else {
    renderLinks();
  }
}

function initLinks() {
  const warn = document.getElementById('links-storage-warning');
  links = safeGetItem(STORAGE_KEY_LINKS, []);
  if (!Array.isArray(links)) links = [];
  renderLinks();

  const form = document.getElementById('link-add-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const labelInput = document.getElementById('link-label-input');
      const urlInput   = document.getElementById('link-url-input');
      addLink(labelInput ? labelInput.value : '', urlInput ? urlInput.value : '');
      if (labelInput) labelInput.value = '';
      if (urlInput)   urlInput.value   = '';
    });
  }

  // Event delegation for delete buttons
  const grid = document.getElementById('links-grid');
  if (grid) {
    grid.addEventListener('click', e => {
      if (e.target.classList.contains('link-delete-btn')) {
        const card = e.target.closest('.link-card');
        if (card) deleteLink(card.dataset.id);
      }
    });
  }

  if (!storageAvailable() && warn) {
    warn.textContent = 'Storage unavailable. Links will not be saved.';
    warn.classList.remove('hidden');
  }
}

// === INIT ===

document.addEventListener('DOMContentLoaded', () => {
  // Check storage availability and show top-level warning if unavailable
  if (!storageAvailable()) {
    const banner = document.getElementById('storage-unavailable-warning');
    if (banner) {
      banner.textContent = 'localStorage is unavailable. Your data will not be saved between sessions.';
      banner.classList.remove('hidden');
    }
  }

  initTheme();
  initGreeting();
  initTimer();
  initTodo();
  initLinks();
});

// Expose pure functions for testing (no module system needed)
window._test = {
  formatTime,
  formatDate,
  getGreetingPrefix,
  formatMMSS,
  isValidUrl,
  saveName,
  addTask,
  confirmEditTask,
  toggleTask,
  deleteTask,
  addLink,
  deleteLink,
};
