const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const menuScript = fs.readFileSync(
  path.join(projectRoot, "station-menu.js"),
  "utf8"
);
const styles = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");

test("station selector shows the simplified heading and hides search initially", () => {
  assert.match(
    html,
    /<h2 id="stationPanelTitle" tabindex="-1">選擇電台<\/h2>/
  );
  assert.doesNotMatch(html, /id="stationCount"/);
  assert.match(
    html,
    /<div id="stationSearchSection" class="station-search" hidden>/
  );
  assert.match(
    html,
    /id="stationSearchStatus"[\s\S]*?aria-live="polite"[\s\S]*?hidden/
  );
});

test("station cards are one accessible button with one current-station label", () => {
  assert.match(menuScript, /document\.createElement\("button"\)/);
  assert.match(menuScript, /option\.type = "button"/);
  assert.match(menuScript, /option\.setAttribute\("aria-pressed", String\(isCurrent\)\)/);
  assert.match(menuScript, /"✓ 目前電台"/);
  assert.doesNotMatch(menuScript, /station-type-label|station-action-label/);
  assert.doesNotMatch(menuScript, /"目前播放"|"切換電台"/);
});

test("search visibility follows the six-station threshold without leaving layout rows", () => {
  assert.match(menuScript, /shouldShowStationSearch\(stations\)/);
  assert.match(menuScript, /searchSection\.hidden = !isSearchAvailable/);
  assert.match(menuScript, /searchStatus\.hidden = !isSearchAvailable/);
  assert.match(menuScript, /closeButton\.focus\(\)/);
  assert.match(
    styles,
    /\.station-panel\s*\{[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\)/
  );
  assert.match(
    styles,
    /\.station-panel\.has-search\s*\{[\s\S]*?grid-template-rows: auto auto auto minmax\(0, 1fr\)/
  );
});
