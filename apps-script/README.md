# allthethings as a private Google web app

Running the journal from Apps Script instead of GitHub Pages buys one thing:
**the same journal on every device.** State lives in a Google Sheet you own
rather than in one browser's localStorage, so the phone and the laptop see the
same week, and nothing is published — the app is visible only to you.

The GitHub Pages version keeps working exactly as before. The two are separate
journals with separate data; they don't sync to each other.

## Setup, one time

1. Go to [sheets.new](https://sheets.new) and name the spreadsheet (e.g. "allthethings").
2. **Extensions → Apps Script**.
3. Replace the default `Code.gs` contents with [`Code.gs`](./Code.gs) from this folder.
4. Click **+** next to Files → **HTML** → name it exactly `Index` → paste in
   [`Index.html`](./Index.html). It is big (a whole React app in one file) — use
   the **Copy raw file** button on GitHub rather than selecting by hand.
5. **Save**, then **Deploy → New deployment** → type: **Web app** → Execute as:
   **Me** → Who has access: **Only myself** → **Deploy**, and authorize when prompted.
6. Bookmark the web app URL — the one ending in `/exec`. That's the app. On a
   phone, "Add to Home Screen" gives it an icon.

The `Data` and `History` sheets appear by themselves on the first save.

## Updating it later

`Index.html` is rebuilt by CI on every push that touches `src/`, so to pick up
changes: copy the current `Index.html` over the `Index` file in the editor,
Save, then **Deploy → Manage deployments → edit (pencil) → Version: New
version → Deploy**. Editing without a new version changes nothing at `/exec`.

`Code.gs` changes far less often; re-paste it the same way when it does.

To rebuild locally instead: `npm install && npm run build:apps-script`.

## What's in the spreadsheet

**Data** — current state, one row per key. Values over 50,000 characters (a
cell's limit) are split across numbered chunks, and chunk 0 carries a revision
counter. Editing these cells by hand is a good way to corrupt the journal;
read them freely, change them via the app.

**History** — an automatic snapshot per key, at most one an hour, keeping the
last 100. This is your undo of last resort.

To roll back: find the row you want in **History**, note its row number, then in
the Apps Script editor pick `restoreFromHistory` from the function dropdown,
run it once (it will complain that it needs an argument), and instead call it
from the editor's console or temporarily wrap it:

```js
function restoreYesterday() {
  return restoreFromHistory(37); // ← the History row number
}
```

Run that, then reload the web app.

## How saving behaves

- Writes are queued and sent one at a time, so a fast burst of edits becomes one
  save rather than a pile-up of overlapping ones.
- Every write is mirrored into localStorage first and only cleared once the
  Sheet confirms it. Losing signal, closing the tab mid-save, or a flat battery
  costs you nothing — the write is replayed next time you open the app.
- Each write carries the revision it was based on. If another tab or device
  saved in between, the Sheet refuses the write and the app asks which version
  to keep instead of silently overwriting the other one.
- A small indicator appears bottom-right only when there's something to say:
  a brief "saved", or a warning that stays put while syncing is broken.

## Two things that stay per-device

**Uploaded fonts** live in IndexedDB, not the Sheet — a font file is megabytes
of binary and doesn't belong in a spreadsheet cell. Upload it again on each
device. Everything else, theme included, syncs.

**Google Fonts** are still fetched from Google's CDN, so the app wants a network
connection to look right on first load in a new browser.

## Limits worth knowing

Apps Script allows roughly 90 minutes of script runtime a day for a consumer
account — a save is well under a second, so ordinary use isn't close. A Sheets
round trip is 0.5–2s, which is why the app never blocks on one.
