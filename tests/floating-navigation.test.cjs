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

test("the top corners use one text navigation button and one dual-state icon button", () => {
  const topbar =
    html.match(/<header class="topbar">([\s\S]*?)<\/header>/)?.[1] || "";

  assert.equal((html.match(/id="viewToggleButton"/g) || []).length, 1);
  assert.equal((html.match(/id="settingsButton"/g) || []).length, 1);
  assert.match(topbar, /id="viewToggleButton"/);
  assert.doesNotMatch(topbar, /settingsBackButton|settings-back-button/);
  assert.match(html, /id="settingsGearIcon"[\s\S]*?aria-hidden="true"/);
  assert.match(
    html,
    /id="settingsCloseIcon"[\s\S]*?aria-hidden="true"[\s\S]*?hidden/
  );
  assert.doesNotMatch(html, /⚙|⚙️|❌|✕/);
});

test("floating navigation uses safe-area offsets and a shared layout spacer", () => {
  assert.match(
    styles,
    /\.view-toggle-button\s*\{[\s\S]*?position: fixed;[\s\S]*?top: calc\(14px \+ env\(safe-area-inset-top\)\);[\s\S]*?left: calc\(14px \+ env\(safe-area-inset-left\)\);[\s\S]*?z-index: 20;[\s\S]*?min-height: 52px;/
  );
  assert.match(
    styles,
    /\.settings-button\s*\{[\s\S]*?position: fixed;[\s\S]*?top: calc\(14px \+ env\(safe-area-inset-top\)\);[\s\S]*?right: calc\(14px \+ env\(safe-area-inset-right\)\);[\s\S]*?z-index: 20;[\s\S]*?width: 52px;[\s\S]*?min-height: 52px;/
  );
  assert.match(styles, /\.topbar\s*\{[\s\S]*?min-height: 52px;[\s\S]*?background: transparent;[\s\S]*?padding: 0;/);
  assert.match(
    styles,
    /@media \(max-width: 480px\) and \(orientation: portrait\)[\s\S]*?\.view-toggle-button\s*\{[\s\S]*?top: calc\(8px \+ env\(safe-area-inset-top\)\);[\s\S]*?left: calc\(8px \+ env\(safe-area-inset-left\)\);[\s\S]*?min-height: 48px;/
  );
  assert.match(
    styles,
    /@media \(max-width: 900px\) and \(max-height: 500px\) and \(orientation: landscape\)[\s\S]*?\.view-toggle-button\s*\{[\s\S]*?min-height: 44px;[\s\S]*?\.settings-button\s*\{[\s\S]*?min-height: 44px;/
  );
  assert.doesNotMatch(styles, /\.settings-back-button/);
});

test("settings swaps the same button between gear and close behavior", () => {
  assert.match(viewScript, /let previousDisplayMode = DisplayMode\.LIST/);
  assert.match(
    viewScript,
    /showSettings \? "關閉設定" : "設定"/
  );
  assert.match(
    viewScript,
    /settingsGearIcon\.toggleAttribute\("hidden", showSettings\)/
  );
  assert.match(
    viewScript,
    /settingsCloseIcon\.toggleAttribute\("hidden", !showSettings\)/
  );
  assert.match(
    viewScript,
    /previousDisplayMode === DisplayMode\.LIST \|\|[\s\S]*?: DisplayMode\.LIST/
  );
  assert.match(
    viewScript,
    /function handleSettingsButtonClick\(\)[\s\S]*?returnFromSettings\(\)[\s\S]*?openSettings\(\)/
  );
  assert.equal(
    (viewScript.match(/settingsButton\.addEventListener\("click"/g) || []).length,
    1
  );
  assert.equal(
    (viewScript.match(/document\.addEventListener\("keydown"/g) || []).length,
    1
  );
  assert.equal(
    (viewScript.match(/document\.addEventListener\("pointerdown"/g) || []).length,
    1
  );
  assert.doesNotMatch(viewScript, /settingsBackButton/);
});

test("pointer focus stays quiet while keyboard focus remains visible", () => {
  assert.match(viewScript, /const KEYBOARD_FOCUS_CLASS = "uses-keyboard-navigation"/);
  assert.match(
    viewScript,
    /document\.documentElement\.classList\.toggle\([\s\S]*?KEYBOARD_FOCUS_CLASS,[\s\S]*?isKeyboardNavigation/
  );
  assert.match(
    styles,
    /html\.uses-keyboard-navigation \.settings-button:focus\s*\{[\s\S]*?outline: 4px solid #1267c4;/
  );
  assert.match(
    styles,
    /#stationName:focus,[\s\S]*?html:not\(\.uses-keyboard-navigation\) \.settings-button:focus,[\s\S]*?outline: none;/
  );
  assert.doesNotMatch(styles, /(^|\n)\s*\*:focus\s*\{[\s\S]*?outline:\s*none/);
});

test("navigation code remains independent from audio and station selection", () => {
  const navigationFunctions =
    viewScript.match(
      /function setDisplayMode[\s\S]*?function handleStationListClick/
    )?.[0] || "";

  assert.doesNotMatch(
    navigationFunctions,
    /selectStation|audio|radio|\.src|\.load\(|\.play\(|\.pause\(|userWantsPlayback|retry|buffering/
  );
  assert.equal((html.match(/<audio\b/g) || []).length, 1);
  assert.equal((html.match(/id="playButton"/g) || []).length, 1);
  assert.equal((html.match(/id="volumeSlider"/g) || []).length, 1);
  assert.equal((html.match(/id="muteButton"/g) || []).length, 1);
});
