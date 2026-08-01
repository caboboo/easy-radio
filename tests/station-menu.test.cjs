const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const viewScript = fs.readFileSync(
  path.join(projectRoot, "station-menu.js"),
  "utf8"
);
const styles = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");

test("the page defaults to a single-player view with a valid mode toggle", () => {
  assert.match(html, /id="viewToggleButton"/);
  assert.match(html, /aria-label="顯示所有電台"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /aria-controls="playerView stationListView"/);
  assert.match(html, /id="viewToggleText">所有電台<\/span>/);
  assert.match(html, /<section id="playerView" class="player-card">/);
  assert.match(
    html,
    /id="stationListView"[\s\S]*?aria-labelledby="stationListTitle"[\s\S]*?hidden/
  );
  assert.match(html, /id="stationListTitle">選擇電台<\/h1>/);
});

test("one control set floats at page bottom outside both views", () => {
  const topbar = html.match(/<header class="topbar">([\s\S]*?)<\/header>/)?.[1] || "";
  const floatingBar = html.match(
    /<div class="playback-controls shared-playback-controls floating-playback-bar">[\s\S]*?(?=<audio id="radio")/
  )?.[0] || "";
  const playerView = html.match(/<section id="playerView"[\s\S]*?<\/section>/)?.[0] || "";
  const listView = html.match(/<section[\s\S]*?id="stationListView"[\s\S]*?<\/section>/)?.[0] || "";

  assert.doesNotMatch(topbar, /playButton|volumeSlider|muteButton/);
  assert.match(topbar, /id="viewToggleButton"/);
  assert.match(topbar, /class="clock"/);
  assert.ok(
    topbar.indexOf('id="viewToggleButton"') < topbar.indexOf('class="clock"')
  );
  assert.match(
    styles,
    /\.topbar\s*\{[\s\S]*?display: grid;[\s\S]*?align-items: center;[\s\S]*?justify-content: space-between;/
  );
  assert.match(floatingBar, /id="playButton"/);
  assert.match(floatingBar, /id="volumeSlider"/);
  assert.match(floatingBar, /id="muteButton"/);
  assert.doesNotMatch(playerView, /playButton|volumeSlider|muteButton/);
  assert.doesNotMatch(listView, /playButton|volumeSlider|muteButton/);
  assert.equal((html.match(/id="playButton"/g) || []).length, 1);
  assert.equal((html.match(/id="volumeSlider"/g) || []).length, 1);
  assert.equal((html.match(/id="muteButton"/g) || []).length, 1);
  assert.equal((html.match(/<audio\b/g) || []).length, 1);
  assert.ok(html.indexOf('<footer class="footer">') < html.indexOf('floating-playback-bar'));
  assert.ok(html.indexOf('floating-playback-bar') < html.indexOf('<audio id="radio"'));
  assert.match(
    styles,
    /\.floating-playback-bar\s*\{[\s\S]*?position: fixed;[\s\S]*?bottom: calc\(12px \+ env\(safe-area-inset-bottom\)\);[\s\S]*?max-width: 880px;/
  );
  assert.match(
    styles,
    /\.app\s*\{[\s\S]*?calc\(128px \+ env\(safe-area-inset-bottom\)\)/
  );
  assert.doesNotMatch(styles, /\.footer\s*\{\s*display: none;/);
});

test("an empty song stays available but takes no visible space", () => {
  assert.match(html, /<p id="song" class="song" hidden><\/p>/);
  assert.doesNotMatch(html, /目前曲目：電台未提供|電台未提供/);
  assert.match(styles, /\[hidden\]\s*\{[\s\S]*?display: none !important/);
});

test("the former drawer, overlay, close button, and scroll lock are removed", () => {
  assert.doesNotMatch(
    html,
    /stationOverlay|stationPanel|stationCloseButton|aria-modal|aria-expanded/
  );
  assert.doesNotMatch(
    viewScript,
    /openMenu|closeMenu|lockPageScroll|unlockPageScroll|focusableElements|station-menu-open/
  );
  assert.doesNotMatch(
    styles,
    /station-overlay|station-panel|station-close-button|station-menu-open/
  );
});

test("view state switches content and labels without controlling audio", () => {
  assert.match(viewScript, /SINGLE: "single"/);
  assert.match(viewScript, /LIST: "list"/);
  assert.match(viewScript, /let displayMode = DisplayMode\.SINGLE/);
  assert.match(viewScript, /playerView\.hidden = showList/);
  assert.match(viewScript, /listView\.hidden = !showList/);

  assert.match(viewScript, /stationList\.querySelector\("\.station-option"\)/);
  assert.doesNotMatch(viewScript, /listTitle\.focus\(\)/);
  assert.match(viewScript, /showList \? "返回播放" : "所有電台"/);
  assert.match(viewScript, /event\.key !== "Escape"/);
  assert.doesNotMatch(
    viewScript,
    /\b(?:audio|radio)\.(?:load|play|pause)|userWantsPlayback|retryCount/
  );
});

test("station cards remain accessible and selection stays in the list view", () => {
  const selectionHandler = viewScript.match(
    /function handleStationListClick\(event\) \{([\s\S]*?)\n  \}/
  )?.[1] || "";

  assert.match(viewScript, /document\.createElement\("button"\)/);
  assert.match(viewScript, /option\.type = "button"/);
  assert.match(
    viewScript,
    /option\.setAttribute\("aria-pressed", String\(isCurrent\)\)/
  );
  assert.match(viewScript, /"✓ 目前電台"/);
  assert.match(selectionHandler, /player\.selectStation\(stationId\)/);
  assert.match(selectionHandler, /renderStations\(\)/);
  assert.doesNotMatch(selectionHandler, /setDisplayMode|DisplayMode\.SINGLE/);
  assert.doesNotMatch(viewScript, /station-type-label|station-action-label/);
});

test("search stays hidden below six stations in the main list view", () => {
  assert.match(
    html,
    /<div id="stationSearchSection" class="station-search" hidden>/
  );
  assert.match(viewScript, /shouldShowStationSearch\(stations\)/);
  assert.match(viewScript, /searchSection\.hidden = !isSearchAvailable/);
  assert.match(viewScript, /searchStatus\.hidden = !isSearchAvailable/);
  assert.match(styles, /\.station-list-view\s*\{/);
  assert.match(styles, /\.station-list\s*\{[\s\S]*?display: grid/);
});
