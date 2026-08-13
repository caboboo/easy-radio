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
  assert.doesNotMatch(embeddedPlayer, /<iframe\b/);
  assert.match(
    styles,
    /#embeddedStationPlayerHost iframe\s*\{[\s\S]*?width: 100%;[\s\S]*?height: clamp\(260px, 52vh, 420px\);[\s\S]*?border: 0;/
  );
});

test("the iframe is created only for the embedded station and can be destroyed", () => {
  assert.match(script, /function isEmbeddedPlayerStation\(station\)/);
  assert.match(script, /document\.createElement\("iframe"\)/);
  assert.match(script, /iframe\.src = cleanStationText\(station\.iframeUrl\)/);
  assert.match(script, /iframe\.allow = "autoplay"/);
  assert.match(script, /embeddedStationPlayerHost\.append\(iframe\)/);
  assert.match(
    script,
    /function destroyEmbeddedStationPlayer\(\) \{[\s\S]*?replaceChildren\(\);[\s\S]*?hidden = true;/
  );
  assert.doesNotMatch(script, /fetch\s*\(/);
  assert.doesNotMatch(script, /\.contentWindow|postMessage\s*\(/);
});

test("embedded selection stops the shared audio while normal stations keep the existing path", () => {
  assert.match(
    script,
    /if \(isEmbeddedPlayerStation\(currentStation\)\) \{[\s\S]*?userWantsPlayback = false;[\s\S]*?radioSource\.removeAttribute\("src"\);[\s\S]*?radio\.load\(\);[\s\S]*?showEmbeddedStationPlayer\(currentStation\);[\s\S]*?reason: "embedded-player"/
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

test("the page still owns exactly one audio element and one shared playback button", () => {
  assert.equal((html.match(/<audio\b/g) || []).length, 1);
  assert.equal((html.match(/id="playButton"/g) || []).length, 1);
});
