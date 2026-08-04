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

test("the bottom player owns one mode button and the shared settings button", () => {
  const floatingBar =
    html.match(
      /<div class="playback-controls shared-playback-controls floating-playback-bar">[\s\S]*?(?=<audio id="radio")/
    )?.[0] || "";

  assert.equal((html.match(/id="viewToggleButton"/g) || []).length, 1);
  assert.equal((html.match(/id="settingsButton"/g) || []).length, 1);
  assert.match(floatingBar, /id="viewToggleButton"[\s\S]*?id="playButton"[\s\S]*?id="settingsButton"/);
  assert.match(floatingBar, /aria-label="切換到目前電台"/);
  assert.match(floatingBar, /id="viewSingleIcon"[\s\S]*?focusable="false"/);
  assert.match(floatingBar, /id="viewListIcon"[\s\S]*?focusable="false"[\s\S]*?hidden/);
  assert.doesNotMatch(html, /class="topbar"|id="viewToggleText"/);
  assert.match(html, /id="settingsGearIcon"[\s\S]*?aria-hidden="true"/);
  assert.match(
    html,
    /id="settingsCloseIcon"[\s\S]*?aria-hidden="true"[\s\S]*?hidden/
  );
  assert.doesNotMatch(html, /⚙|⚙️|❌|✕/);
});

test("the mode button stays in normal player flow while desktop settings keeps safe-area offsets", () => {
  const modeButtonStyles =
    styles.match(/\.view-toggle-button\s*\{([\s\S]*?)\}/)?.[1] || "";

  assert.match(modeButtonStyles, /flex: 0 0 52px;/);
  assert.match(modeButtonStyles, /width: 52px;/);
  assert.match(modeButtonStyles, /min-height: 52px;/);
  assert.doesNotMatch(modeButtonStyles, /position: fixed|\btop:|\bleft:/);
  assert.match(
    styles,
    /\.playback-primary-controls\s*\{[\s\S]*?display: flex;[\s\S]*?gap: 10px;/
  );
  assert.match(
    styles,
    /\.settings-button\s*\{[\s\S]*?position: fixed;[\s\S]*?top: calc\(14px \+ env\(safe-area-inset-top\)\);[\s\S]*?right: calc\(14px \+ env\(safe-area-inset-right\)\);[\s\S]*?z-index: 20;[\s\S]*?width: 52px;[\s\S]*?min-height: 52px;/
  );
  assert.match(styles, /\.main-content\s*\{[\s\S]*?margin: 56px auto 0;/);
  assert.match(
    styles,
    /@media \(max-width: 480px\) and \(orientation: portrait\)[\s\S]*?\.view-toggle-button\s*\{[\s\S]*?flex-basis: 48px;[\s\S]*?width: 48px;[\s\S]*?min-height: 48px;/
  );
  assert.match(
    styles,
    /@media \(max-height: 500px\) and \(orientation: landscape\)[\s\S]*?\.view-toggle-button\s*\{[\s\S]*?flex-basis: 44px;[\s\S]*?width: 44px;[\s\S]*?min-height: 44px;/
  );
  assert.doesNotMatch(styles, /\.topbar|\.settings-back-button/);
});

test("mode icon, label, focus, and settings visibility update from display mode", () => {
  assert.match(
    viewScript,
    /showList \? "切換到目前電台" : "切換到所有電台"/
  );
  assert.match(viewScript, /toggleButton\.title = showList \? "目前電台" : "所有電台"/);
  assert.match(viewScript, /singleViewIcon\.toggleAttribute\("hidden", !showList\)/);
  assert.match(viewScript, /listViewIcon\.toggleAttribute\("hidden", showList\)/);
  assert.match(viewScript, /toggleButton\.hidden = showSettings/);
  assert.match(viewScript, /else if \(focusToggle\) \{[\s\S]*?toggleButton\.focus\(\)/);
  assert.equal(
    (viewScript.match(/toggleButton\.addEventListener\("click"/g) || []).length,
    1
  );
  assert.doesNotMatch(viewScript, /innerHTML|viewToggleText|viewToggleIcon/);
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
