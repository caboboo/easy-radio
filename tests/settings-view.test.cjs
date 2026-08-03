const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const script = fs.readFileSync(path.join(projectRoot, "script.js"), "utf8");
const viewScript = fs.readFileSync(
  path.join(projectRoot, "station-menu.js"),
  "utf8"
);
const styles = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");

test("date and time are removed without leaving visible clock markup", () => {
  assert.doesNotMatch(html, /id="date"|id="time"|class="clock"/);
  assert.doesNotMatch(styles, /\.clock\s*\{|#date\s*\{|#time\s*\{/);
  assert.doesNotMatch(
    script,
    /dateElement|timeElement|dateFormatter|timeFormatter|updateClock|millisecondsUntilNextMinute/
  );
});

test("the fixed settings control exposes decorative gear and close SVGs", () => {
  assert.match(
    html,
    /<button[\s\S]*?id="settingsButton"[\s\S]*?type="button"[\s\S]*?aria-label="設定"[\s\S]*?aria-controls="settingsView"/
  );
  assert.match(
    html,
    /id="settingsGearIcon"[\s\S]*?aria-hidden="true"[\s\S]*?focusable="false"/
  );
  assert.match(
    html,
    /id="settingsCloseIcon"[\s\S]*?aria-hidden="true"[\s\S]*?focusable="false"[\s\S]*?hidden/
  );
  assert.doesNotMatch(html, /⚙|⚙️|settingsBackButton|settings-back-button/);
  assert.match(
    styles,
    /\.settings-button\s*\{[\s\S]*?position: fixed;[\s\S]*?top: calc\(14px \+ env\(safe-area-inset-top\)\);[\s\S]*?right: calc\(14px \+ env\(safe-area-inset-right\)\);[\s\S]*?z-index: 20;[\s\S]*?width: 52px;[\s\S]*?min-height: 52px;/
  );
  assert.match(
    styles,
    /@media \(max-width: 480px\) and \(orientation: portrait\)[\s\S]*?\.settings-button\s*\{[\s\S]*?min-height: 48px;/
  );
  assert.match(
    styles,
    /\.settings-button:focus-visible,[\s\S]*?outline: 4px solid #1267c4;/
  );
});

test("settings view contains only the requested shell and version footer", () => {
  const settingsView =
    html.match(
      /<section[\s\S]*?id="settingsView"[\s\S]*?<\/section>/
    )?.[0] || "";

  assert.match(settingsView, /aria-labelledby="settingsTitle"/);
  assert.match(settingsView, /<h1 id="settingsTitle" tabindex="-1">設定<\/h1>/);
  assert.match(settingsView, /目前尚無可調整的設定/);
  assert.match(settingsView, /<footer class="settings-version">/);
  assert.match(settingsView, /<strong>Easy Radio<\/strong>/);
  assert.match(settingsView, /id="versionText"/);
  assert.match(settingsView, /id="buildText"/);
  assert.doesNotMatch(
    settingsView,
    /settingsBackButton|<button|checkbox|switch|toggle|email|password|localStorage|登入|自動播放/
  );
  assert.equal((html.match(/id="versionText"/g) || []).length, 1);
  assert.equal((html.match(/id="buildText"/g) || []).length, 1);
  assert.doesNotMatch(html, /<footer class="footer">/);
  assert.match(
    styles,
    /\.settings-version\s*\{[\s\S]*?margin-top: auto;/
  );
});

test("settings mode remembers only primary views and falls back to list", () => {
  assert.match(viewScript, /let previousDisplayMode = DisplayMode\.LIST/);
  assert.match(
    viewScript,
    /displayMode !== DisplayMode\.SINGLE[\s\S]*?displayMode !== DisplayMode\.LIST/
  );
  assert.match(viewScript, /previousDisplayMode = displayMode/);
  assert.match(
    viewScript,
    /previousDisplayMode === DisplayMode\.LIST \|\|[\s\S]*?previousDisplayMode === DisplayMode\.SINGLE[\s\S]*?\? previousDisplayMode[\s\S]*?: DisplayMode\.LIST/
  );
  assert.match(
    viewScript,
    /setDisplayMode\(getSettingsReturnMode\(\), \{[\s\S]*?focusSettingsButton: true/
  );
  assert.match(viewScript, /toggleButton\.hidden = showSettings/);
  assert.doesNotMatch(viewScript, /settingsButton\.hidden/);
});

test("one settings button swaps icon, label, action, and focus", () => {
  const openSettings =
    viewScript.match(/function openSettings\(\) \{([\s\S]*?)\n  \}/)?.[1] ||
    "";
  const returnFromSettings =
    viewScript.match(
      /function returnFromSettings\(\) \{([\s\S]*?)\n  \}/
    )?.[1] || "";
  const settingsHandler =
    viewScript.match(
      /function handleSettingsButtonClick\(\) \{([\s\S]*?)\n  \}/
    )?.[1] || "";

  assert.match(openSettings, /setDisplayMode\(DisplayMode\.SETTINGS\)/);
  assert.match(returnFromSettings, /getSettingsReturnMode/);
  assert.match(settingsHandler, /displayMode === DisplayMode\.SETTINGS/);
  assert.match(settingsHandler, /returnFromSettings\(\)/);
  assert.match(settingsHandler, /openSettings\(\)/);
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
  assert.match(viewScript, /if \(showSettings\) \{[\s\S]*?settingsButton\.focus\(\)/);
  assert.match(viewScript, /settingsButton\.addEventListener\("click", handleSettingsButtonClick\)/);
  assert.equal(
    (viewScript.match(/settingsButton\.addEventListener\("click"/g) || []).length,
    1
  );
  assert.doesNotMatch(viewScript, /settingsBackButton/);
  assert.doesNotMatch(
    openSettings + returnFromSettings + settingsHandler,
    /selectStation|\.src|\.load\(|\.play\(|\.pause\(|userWantsPlayback|retry/
  );
});

test("the shared audio and floating controls are untouched by view ownership", () => {
  assert.equal((html.match(/<audio\b/g) || []).length, 1);
  assert.equal((html.match(/id="playButton"/g) || []).length, 1);
  assert.equal((html.match(/id="volumeSlider"/g) || []).length, 1);
  assert.equal((html.match(/id="muteButton"/g) || []).length, 1);
  assert.match(styles, /\.floating-playback-bar\s*\{[\s\S]*?z-index: 30;/);
  assert.match(styles, /\.settings-button\s*\{[\s\S]*?z-index: 20;/);
});
