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

test("the fixed settings button is accessible and uses a decorative inline SVG", () => {
  assert.match(
    html,
    /<button[\s\S]*?id="settingsButton"[\s\S]*?type="button"[\s\S]*?aria-label="設定"[\s\S]*?aria-controls="settingsView"/
  );
  assert.match(
    html,
    /id="settingsButton"[\s\S]*?<svg[\s\S]*?aria-hidden="true"[\s\S]*?focusable="false"/
  );
  assert.doesNotMatch(html, /⚙|⚙️/);
  assert.match(
    styles,
    /\.settings-button\s*\{[\s\S]*?position: fixed;[\s\S]*?top: max\(14px, env\(safe-area-inset-top\)\);[\s\S]*?right: max\(14px, env\(safe-area-inset-right\)\);[\s\S]*?z-index: 20;[\s\S]*?width: 52px;[\s\S]*?min-height: 52px;/
  );
  assert.match(
    styles,
    /@media \(max-width: 900px\)[\s\S]*?\.settings-button\s*\{[\s\S]*?min-height: 44px;/
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
    /checkbox|switch|toggle|email|password|localStorage|登入|自動播放/
  );
  assert.equal((html.match(/id="versionText"/g) || []).length, 1);
  assert.equal((html.match(/id="buildText"/g) || []).length, 1);
  assert.doesNotMatch(html, /<footer class="footer">/);
  assert.match(
    styles,
    /\.settings-version\s*\{[\s\S]*?margin-top: auto;/
  );
});

test("settings mode remembers and validates the previous primary view", () => {
  assert.match(viewScript, /let previousDisplayMode = DisplayMode\.SINGLE/);
  assert.match(
    viewScript,
    /displayMode !== DisplayMode\.SINGLE[\s\S]*?displayMode !== DisplayMode\.LIST/
  );
  assert.match(viewScript, /previousDisplayMode = displayMode/);
  assert.match(
    viewScript,
    /previousDisplayMode === DisplayMode\.LIST \|\|[\s\S]*?previousDisplayMode === DisplayMode\.SINGLE[\s\S]*?\? previousDisplayMode[\s\S]*?: DisplayMode\.SINGLE/
  );
  assert.match(
    viewScript,
    /setDisplayMode\(getSettingsReturnMode\(\), \{[\s\S]*?focusSettingsButton: true/
  );
  assert.match(viewScript, /settingsButton\.hidden = showSettings/);
  assert.match(viewScript, /toggleButton\.hidden = showSettings/);
  assert.match(viewScript, /settingsBackButton\.hidden = !showSettings/);
});

test("settings entry, return, and Escape only change view state and focus", () => {
  const openSettings =
    viewScript.match(/function openSettings\(\) \{([\s\S]*?)\n  \}/)?.[1] ||
    "";
  const returnFromSettings =
    viewScript.match(
      /function returnFromSettings\(\) \{([\s\S]*?)\n  \}/
    )?.[1] || "";

  assert.match(openSettings, /setDisplayMode\(DisplayMode\.SETTINGS\)/);
  assert.match(returnFromSettings, /getSettingsReturnMode/);
  assert.match(viewScript, /if \(displayMode === DisplayMode\.SETTINGS\)/);
  assert.match(viewScript, /settingsBackButton\.focus\(\)/);
  assert.match(viewScript, /settingsButton\.focus\(\)/);
  assert.match(viewScript, /settingsButton\.addEventListener\("click", openSettings\)/);
  assert.match(
    viewScript,
    /settingsBackButton\.addEventListener\("click", returnFromSettings\)/
  );
  assert.doesNotMatch(
    openSettings + returnFromSettings,
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