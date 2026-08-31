/**
 * allthethings — Apps Script back end.
 *
 * Serves the bullet journal as a private web app and persists its state into
 * the bound spreadsheet, so the same journal follows you across every device
 * signed in as you. The browser build (GitHub Pages) keeps using localStorage;
 * this file only enters the picture when the app is served from `/exec`, where
 * `google.script.run` exists.
 *
 * Two sheets, created on demand:
 *   Data    — current state. One row per (key, chunk); values longer than a
 *             cell's 50k-character ceiling are split across numbered chunks.
 *             Chunk 0 also carries the revision counter.
 *   History — periodic snapshots for rollback, newest last, trimmed to
 *             HISTORY_LIMIT rows.
 *
 * Every write carries the revision the client last saw. If the stored revision
 * has moved on — a second tab or another device saved in between — the write is
 * refused rather than applied, and the client decides. Losing a week of tasks
 * to a stale tab is the one failure this app cannot shrug off.
 */

var DATA_SHEET = 'Data';
var HISTORY_SHEET = 'History';

// Sheets caps a cell at 50,000 characters; leave headroom.
var CHUNK_CHARS = 40000;

// Snapshot cadence. The app saves on a 400ms debounce, so without a floor every
// keystroke burst would evict yesterday's state out of the history.
var HISTORY_MIN_INTERVAL_MS = 60 * 60 * 1000; // one snapshot per key per hour
var HISTORY_LIMIT = 100;

var DATA_HEADER = ['key', 'chunk', 'value', 'rev', 'updatedAt'];
var HISTORY_HEADER = ['savedAt', 'key', 'rev', 'chars', 'value'];

/* ─── web app entry point ─── */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('this week')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ─── client API (called via google.script.run) ─── */

/**
 * Returns {value, rev} for `key`, or null when nothing is stored yet.
 * The client hands `rev` back on its next save so we can spot a clobber.
 */
function loadState(key) {
  var found = readKey_(dataSheet_(), key);
  return found ? { value: found.value, rev: found.rev } : null;
}

/**
 * Writes `value` under `key` and appends a history snapshot when one is due.
 *
 * `expectedRev` is the revision the client last saw: null for a first write,
 * a number for an ordinary one, or '*' to overwrite deliberately after the
 * client has shown the conflict to the user.
 *
 * Returns {ok: true, rev, savedAt, chars}, or on a stale write
 * {ok: false, conflict: true, rev, value} carrying what is actually stored.
 */
function saveState(key, value, expectedRev) {
  var text = value == null ? '' : String(value);
  var lock = LockService.getDocumentLock();
  // A save can queue behind a snapshot write; 30s is generous for both.
  if (!lock.tryLock(30000)) {
    throw new Error('Could not get a write lock — another save is in flight.');
  }
  try {
    var sheet = dataSheet_();
    var current = readKey_(sheet, key);
    var currentRev = current ? current.rev : 0;

    var stale = current && expectedRev !== '*' &&
      (expectedRev == null || Number(expectedRev) !== currentRev);
    if (stale) {
      return { ok: false, conflict: true, rev: currentRev, value: current.value };
    }

    var rev = currentRev + 1;
    writeChunks_(sheet, key, text, rev);
    maybeSnapshot_(key, text, rev);
    SpreadsheetApp.flush();
    return { ok: true, rev: rev, savedAt: new Date().toISOString(), chars: text.length };
  } finally {
    lock.releaseLock();
  }
}

/* ─── Data sheet ─── */

function readKey_(sheet, key) {
  var last = sheet.getLastRow();
  if (last < 2) return null;
  var rows = sheet.getRange(2, 1, last - 1, DATA_HEADER.length).getValues();

  var chunks = [];
  var rev = 0;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) !== String(key)) continue;
    var index = Number(rows[i][1]) || 0;
    chunks.push([index, String(rows[i][2] == null ? '' : rows[i][2])]);
    if (index === 0) rev = Number(rows[i][3]) || 0;
  }
  if (!chunks.length) return null;

  chunks.sort(function (a, b) { return a[0] - b[0]; });
  return {
    value: chunks.map(function (c) { return c[1]; }).join(''),
    rev: rev,
  };
}

function writeChunks_(sheet, key, text, rev) {
  var last = sheet.getLastRow();
  var rows = last > 1 ? sheet.getRange(2, 1, last - 1, DATA_HEADER.length).getValues() : [];

  // Keep every row belonging to another key, in order, then re-lay the sheet.
  var kept = [];
  for (var i = 0; i < rows.length; i++) {
    var k = String(rows[i][0]);
    if (k !== String(key) && k !== '') kept.push(rows[i]);
  }

  var now = new Date();
  var parts = splitChunks_(text);
  for (var c = 0; c < parts.length; c++) {
    kept.push([key, c, parts[c], c === 0 ? rev : '', c === 0 ? now : '']);
  }

  if (last > 1) sheet.getRange(2, 1, last - 1, DATA_HEADER.length).clearContent();
  if (kept.length) sheet.getRange(2, 1, kept.length, DATA_HEADER.length).setValues(kept);
}

function splitChunks_(text) {
  if (text.length <= CHUNK_CHARS) return [text];
  var parts = [];
  for (var i = 0; i < text.length; i += CHUNK_CHARS) {
    parts.push(text.substring(i, i + CHUNK_CHARS));
  }
  return parts;
}

/* ─── History sheet ─── */

function maybeSnapshot_(key, text, rev) {
  var sheet = historySheet_();
  var last = sheet.getLastRow();

  // Newest rows are appended last, so walk back to find this key's latest.
  if (last > 1) {
    var scan = Math.min(last - 1, HISTORY_LIMIT);
    var recent = sheet.getRange(last - scan + 1, 1, scan, 2).getValues();
    for (var i = recent.length - 1; i >= 0; i--) {
      if (String(recent[i][1]) !== String(key)) continue;
      var when = recent[i][0] instanceof Date
        ? recent[i][0].getTime()
        : Date.parse(recent[i][0]);
      if (when && Date.now() - when < HISTORY_MIN_INTERVAL_MS) return; // too soon
      break;
    }
  }

  var row = [new Date(), key, rev, text.length].concat(splitChunks_(text));
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  trimHistory_(sheet);
}

function trimHistory_(sheet) {
  var extra = sheet.getLastRow() - 1 - HISTORY_LIMIT;
  if (extra > 0) sheet.deleteRows(2, extra);
}

/**
 * Rollback helper — run this from the Apps Script editor, not the web app.
 * Copies the snapshot on `rowNumber` of the History sheet (the row number as
 * shown in the sheet's own gutter) back into Data, making it current again.
 * Reload the web app afterwards to see it.
 */
function restoreFromHistory(rowNumber) {
  var sheet = historySheet_();
  if (!rowNumber || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
    throw new Error('Pick a History row between 2 and ' + sheet.getLastRow() + '.');
  }
  var row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
  var key = String(row[1]);
  if (!key) throw new Error('That row has no key — pick a snapshot row.');
  var value = row.slice(4).map(function (v) { return v == null ? '' : String(v); }).join('');

  var data = dataSheet_();
  var current = readKey_(data, key);
  writeChunks_(data, key, value, (current ? current.rev : 0) + 1);
  SpreadsheetApp.flush();
  return 'Restored ' + value.length + ' characters into "' + key + '".';
}

/* ─── sheet plumbing ─── */

function dataSheet_() { return ensureSheet_(DATA_SHEET, DATA_HEADER); }
function historySheet_() { return ensureSheet_(HISTORY_SHEET, HISTORY_HEADER); }

function ensureSheet_(name, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}
