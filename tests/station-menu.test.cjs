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
  assert.match(html, /id="stationListTitle" tabindex="-1">選擇電台<\/h1>/);
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
  assert.match(viewScript, /showList \? "返回播放" : "所有電台"/);
  assert.match(viewScript, /event\.key !== "Escape"/);
  assert.doesNotMatch(
    viewScript,
    /\b(?:audio|radio)\.(?:load|play|pause)|userWantsPlayback|retryCount/
  );
});

test("station cards remain one accessible button and selection returns to player", () => {
  assert.match(viewScript, /document\.createElement\("button"\)/);
  assert.match(viewScript, /option\.type = "button"/);
  assert.match(
    viewScript,
    /option\.setAttribute\("aria-pressed", String\(isCurrent\)\)/
  );
  assert.match(viewScript, /"✓ 目前電台"/);
  assert.match(viewScript, /player\.selectStation\(stationId\)/);
  assert.match(
    viewScript,
    /setDisplayMode\(DisplayMode\.SINGLE, \{ focusToggle: true \}\)/
  );
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
