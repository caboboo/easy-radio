const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const script = fs.readFileSync(path.join(projectRoot, "script.js"), "utf8");
const styles = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");
const detailView =
  html.match(/<section id="playerView"[\s\S]*?<\/section>/)?.[0] || "";

test("single is an accessible station detail view with only verified fields", () => {
  assert.match(
    detailView,
    /class="player-card" aria-labelledby="stationName" hidden/
  );
  assert.match(detailView, /class="station-mark" aria-hidden="true"/);
  assert.match(detailView, /<h1 id="stationName" tabindex="-1"><\/h1>/);
  assert.match(detailView, /id="stationSubtitle" class="frequency"/);
  assert.match(detailView, /<p class="station-detail-status">目前電台<\/p>/);
  assert.doesNotMatch(
    detailView,
    /主持人|節目表|目前節目|下一個節目|資料準備中|即將推出|暫無資料|Coming soon/
  );
  assert.doesNotMatch(detailView, /playButton|volumeSlider|muteButton|<audio\b/);
  assert.equal((html.match(/id="playButton"/g) || []).length, 1);
  assert.equal((html.match(/<audio\b/g) || []).length, 1);
});

test("station detail rendering uses the current station data safely", () => {
  const renderer =
    script.match(/function cleanStationText[\s\S]*?function initializeCurrentStation/)?.[0] || "";

  assert.match(renderer, /value === null \|\| value === undefined/);
  assert.match(renderer, /return String\(value\)\.trim\(\)/);
  assert.match(renderer, /function getStationDetailMeta\(station\)/);
  assert.match(renderer, /return `\$\{brand\} · \$\{frequency\}`/);
  assert.match(renderer, /return subtitle \|\| brand \|\| frequency/);
  assert.match(renderer, /stationNameElement\.textContent = name/);
  assert.match(renderer, /stationNameElement\.hidden = !name/);
  assert.match(renderer, /stationSubtitleElement\.textContent = detailMeta/);
  assert.match(renderer, /stationSubtitleElement\.hidden = !detailMeta/);
  assert.match(renderer, /stationMarkElement\.hidden = !brand/);
  assert.match(
    renderer,
    /stationDetailElement\.classList\.toggle\("has-station-logo", Boolean\(brand\)\)/
  );
  assert.doesNotMatch(renderer, /\.innerHTML\s*=/);
});

test("station detail hierarchy stays bounded and responsive", () => {
  assert.match(
    styles,
    /\.player-card\s*\{[\s\S]*?grid-template-columns: minmax\(170px, 280px\) minmax\(0, 1fr\);[\s\S]*?width: min\(100%, 1080px\);/
  );
  assert.match(styles, /\.station-mark\s*\{[\s\S]*?width: min\(100%, 280px\);/);
  assert.match(
    styles,
    /\.station-info h1\s*\{[\s\S]*?font-size: clamp\(38px, 5vw, 70px\);[\s\S]*?overflow-wrap: anywhere;/
  );
  assert.match(
    styles,
    /\.station-detail-status\s*\{[\s\S]*?background: #f1e5d1;[\s\S]*?color: #5b4634;/
  );
  assert.match(
    styles,
    /@media \(orientation: portrait\)[\s\S]*?\.player-card\s*\{[\s\S]*?width: min\(100%, 760px\);[\s\S]*?grid-template-columns: 1fr;/
  );
  assert.match(
    styles,
    /@media \(max-width: 900px\) and \(max-height: 500px\) and \(orientation: landscape\)[\s\S]*?\.station-info\s*\{[\s\S]*?gap: 4px;/
  );
});
