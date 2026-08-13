const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const script = fs.readFileSync(path.join(projectRoot, "script.js"), "utf8");
const stationMenu = fs.readFileSync(
  path.join(projectRoot, "station-menu.js"),
  "utf8"
);
const styles = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");
const stations = require("../stations-data.js");

const greenpeaceStation = stations.find(
  (station) => station.id === "greenpeace973"
);

test("Greenpeace Radio uses only the official iframe URL", () => {
  assert.ok(greenpeaceStation);
  assert.equal(greenpeaceStation.name, "綠色和平廣播");
  assert.equal(greenpeaceStation.frequency, "FM97.3");
  assert.equal(greenpeaceStation.streamUrl, "");
  assert.equal(
    greenpeaceStation.iframeUrl,
    "https://greenpeace.bcom.tw/playVideo.php"
  );
  assert.equal(new URL(greenpeaceStation.iframeUrl).search, "");
  assert.ok(Object.isFrozen(greenpeaceStation));
  assert.ok(Object.isFrozen(greenpeaceStation.keywords));
});

test("the station list accepts either an audio stream or an iframe source", () => {
  assert.match(
    stationMenu,
    /\(!streamUrl && !iframeUrl\)/
  );
  assert.match(stationMenu, /iframeUrl = cleanText\(station\?\.iframeUrl\)/);
});

test("the official player host starts empty and is styled responsively", () => {
  const embeddedPlayer =
    html.match(
      /<section[\s\S]*?id="embeddedStationPlayer"[\s\S]*?<\/section>/
    )?.[0] || "";

  assert.match(embeddedPlayer, /綠色和平官方播放器/);
  assert.match(embeddedPlayer, /請按播放器中的「確定」開始收聽/);
  assert.match(embeddedPlayer, /id="embeddedStationPlayerHost"/);
  assert.match(embeddedPlayer, /id="embeddedStationPlayerToggle"/);
  assert.match(embeddedPlayer, /id="embeddedStationPlayerReset"/);
  assert.match(embeddedPlayer, /aria-controls="embeddedStationPlayerHost"/);
  assert.match(embeddedPlayer, /aria-expanded="true"/);
  assert.match(embeddedPlayer, /收起官方播放器/);
  assert.match(embeddedPlayer, /重新載入官方播放器/);
  assert.doesNotMatch(embeddedPlayer, /<iframe\b/);

  const listViewStart = html.indexOf('id="stationListView"');
  const listViewEnd = html.indexOf("</section>", listViewStart);
  const embeddedPlayerStart = html.indexOf('id="embeddedStationPlayer"');
  const singleViewStart = html.indexOf('id="playerView"');

  assert.ok(listViewStart >= 0);
  assert.ok(listViewEnd > listViewStart);
  assert.ok(embeddedPlayerStart > listViewEnd);
  assert.ok(embeddedPlayerStart > singleViewStart);
  assert.match(
    styles,
    /#embeddedStationPlayerHost iframe\s*\{[\s\S]*?width: 100%;[\s\S]*?height: clamp\(260px, 52vh, 420px\);[\s\S]*?border: 0;/
  );
});

test("the iframe is created only when the embedded session does not exist", () => {
  assert.match(script, /function isEmbeddedPlayerStation\(station\)/);
  assert.match(script, /document\.createElement\("iframe"\)/);
  assert.match(script, /iframe\.src = cleanStationText\(station\.iframeUrl\)/);
  assert.match(script, /iframe\.allow = "autoplay"/);
  assert.match(script, /embeddedStationPlayerHost\.append\(iframe\)/);
  assert.match(script, /if \(embeddedStationPlayerFrame === null\)/);
  assert.match(
    script,
    /function destroyEmbeddedStationPlayer\(\) \{[\s\S]*?replaceChildren\(\);/
  );
  assert.doesNotMatch(script, /fetch\s*\(/);
  assert.doesNotMatch(script, /\.contentWindow|postMessage\s*\(/);
});

test("embedded selection waits for the single view while normal stations keep the existing path", () => {
  assert.match(
    script,
    /if \(isEmbeddedPlayerStation\(currentStation\)\) \{[\s\S]*?userWantsPlayback = false;[\s\S]*?radioSource\.removeAttribute\("src"\);[\s\S]*?radio\.load\(\);[\s\S]*?currentDisplayMode === "single"[\s\S]*?showEmbeddedStationPlayer\(currentStation\);[\s\S]*?parkEmbeddedStationPlayer\(\);[\s\S]*?reason: "embedded-player"/
  );
  assert.match(
    script,
    /destroyEmbeddedStationPlayer\(\);[\s\S]*?radioSource\.src = currentStation\.streamUrl;[\s\S]*?radio\.load\(\);/
  );
  assert.match(script, /void attemptPlayback\("station-change"\)/);
  assert.match(
    script,
    /playButton\.addEventListener\("click", \(\) => \{\s*if \(isEmbeddedPlayerStation\(currentStation\)\) \{\s*return;/
  );
});
test("collapse keeps the same iframe instance rendered offscreen", () => {
  const toggleFunction =
    script.match(
      /function toggleEmbeddedStationPlayer\(\) \{[\s\S]*?\n\}/
    )?.[0] || "";
  const visibilityFunction =
    script.match(
      /function updateEmbeddedStationPlayerVisibility\(\) \{[\s\S]*?\n\}/
    )?.[0] || "";

  assert.match(toggleFunction, /isEmbeddedStationPlayerCollapsed =/);
  assert.match(toggleFunction, /updateEmbeddedStationPlayerVisibility\(\)/);
  assert.doesNotMatch(
    toggleFunction,
    /destroyEmbeddedStationPlayer|showEmbeddedStationPlayer|replaceChildren|remove\(|\.src|append\(/
  );
  assert.match(
    visibilityFunction,
    /classList\.toggle\("is-collapsed", isCollapsed\)/
  );
  assert.match(visibilityFunction, /"顯示官方播放器"/);
  assert.match(visibilityFunction, /"收起官方播放器"/);
  assert.match(
    visibilityFunction,
    /tabIndex = isActive && !isCollapsed \? 0 : -1/
  );
  assert.match(
    styles,
    /\.embedded-station-player\.is-collapsed #embeddedStationPlayerHost,[\s\S]*?position: fixed;[\s\S]*?left: -10000px;[\s\S]*?pointer-events: none;/
  );
  assert.doesNotMatch(
    styles,
    /\.embedded-station-player\.is-collapsed[\s\S]{0,220}display:\s*none/
  );
  assert.equal(
    (script.match(/document\.createElement\("iframe"\)/g) || []).length,
    1
  );
  assert.equal(
    (script.match(/embeddedStationPlayerHost\.append\(iframe\)/g) || []).length,
    1
  );
});

test("view changes park and restore the same iframe session", () => {
  const showFunction =
    script.match(
      /function showEmbeddedStationPlayer\(station\) \{[\s\S]*?\n\}/
    )?.[0] || "";
  const parkFunction =
    script.match(
      /function parkEmbeddedStationPlayer\(\) \{[\s\S]*?\n\}/
    )?.[0] || "";
  const viewHandler =
    script.match(
      /function handleDisplayModeChange\(event\) \{[\s\S]*?\n\}/
    )?.[0] || "";

  assert.match(showFunction, /currentDisplayMode !== "single"/);
  assert.match(showFunction, /embeddedStationPlayerFrame === null/);
  assert.doesNotMatch(
    showFunction,
    /destroyEmbeddedStationPlayer|replaceChildren|remove\(|about:blank/
  );
  assert.match(parkFunction, /updateEmbeddedStationPlayerVisibility\(\)/);
  assert.doesNotMatch(
    parkFunction,
    /destroyEmbeddedStationPlayer|replaceChildren|remove\(|\.src|createElement/
  );
  assert.match(viewHandler, /nextDisplayMode/);
  assert.match(
    viewHandler,
    /currentDisplayMode === "single"[\s\S]*?showEmbeddedStationPlayer\(currentStation\)/
  );
  assert.match(viewHandler, /parkEmbeddedStationPlayer\(\)/);
  assert.match(
    stationMenu,
    /new CustomEvent\("easy-radio:view-change", \{[\s\S]*?detail: \{ displayMode \}/
  );
  assert.match(
    script,
    /document\.addEventListener\(\s*"easy-radio:view-change",\s*handleDisplayModeChange\s*\)/
  );
  assert.match(
    script,
    /embeddedStationPlayerElement\.classList\.toggle\("is-parked", isParked\)/
  );
  assert.match(
    styles,
    /\.embedded-station-player\.is-parked #embeddedStationPlayerHost\s*\{[\s\S]*?position: fixed;[\s\S]*?left: -10000px;[\s\S]*?pointer-events: none;/
  );
});

test("a real station change destroys the Greenpeace iframe session", () => {
  const selectStationFunction =
    script.match(/function selectStation[\s\S]*?\n\}/)?.[0] || "";

  assert.match(
    selectStationFunction,
    /if \(isEmbeddedPlayerStation\(currentStation\)\)[\s\S]*?return \{ changed: true, reason: "embedded-player" \};[\s\S]*?destroyEmbeddedStationPlayer\(\);[\s\S]*?radioSource\.src = currentStation\.streamUrl;/
  );
  const ordinaryStationBranch = selectStationFunction.slice(
    selectStationFunction.indexOf("  destroyEmbeddedStationPlayer();")
  );
  assert.doesNotMatch(
    ordinaryStationBranch,
    /parkEmbeddedStationPlayer\(\);[\s\S]*?radioSource\.src = currentStation\.streamUrl;/
  );
});
test("manual reset is the explicit iframe destroy and recreate recovery path", () => {
  const destroyFunction =
    script.match(
      /function destroyEmbeddedStationPlayer\(\) \{[\s\S]*?\n\}/
    )?.[0] || "";
  const resetFunction =
    script.match(
      /function resetEmbeddedStationPlayer\(\) \{[\s\S]*?\n\}/
    )?.[0] || "";

  assert.match(destroyFunction, /embeddedStationPlayerFrame = null/);
  assert.match(destroyFunction, /isEmbeddedStationPlayerCollapsed = false/);
  assert.match(
    destroyFunction,
    /embeddedStationPlayerHost\.replaceChildren\(\)/
  );
  assert.match(resetFunction, /destroyEmbeddedStationPlayer\(\)/);
  assert.match(resetFunction, /showEmbeddedStationPlayer\(currentStation\)/);
  assert.match(
    script,
    /embeddedStationPlayerReset\.addEventListener\(\s*"click",\s*resetEmbeddedStationPlayer\s*\)/
  );
});
test("the page still owns exactly one audio element and one shared playback button", () => {
  assert.equal((html.match(/<audio\b/g) || []).length, 1);
  assert.equal((html.match(/id="playButton"/g) || []).length, 1);
});
