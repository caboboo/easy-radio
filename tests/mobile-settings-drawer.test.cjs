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

const floatingBar =
  html.match(
    /<div class="playback-controls shared-playback-controls floating-playback-bar">[\s\S]*?(?=<audio id="radio")/
  )?.[0] || "";
const mobileStyles =
  styles.match(
    /@media \(max-width: 760px\) \{([\s\S]*?)(?=@media \(max-width: 480px\) and \(orientation: portrait\))/
  )?.[1] || "";

test("one mobile control rail owns mode, play, and settings controls", () => {
  assert.match(
    floatingBar,
    /class="playback-primary-controls"[\s\S]*?id="viewToggleButton"[\s\S]*?id="playButton"[\s\S]*?id="settingsButton"/
  );
  assert.equal((html.match(/id="viewToggleButton"/g) || []).length, 1);
  assert.equal((html.match(/id="playButton"/g) || []).length, 1);
  assert.equal((html.match(/id="settingsButton"/g) || []).length, 1);
  assert.equal((html.match(/<audio\b/g) || []).length, 1);
});

test("the existing 760px breakpoint becomes a clipped two-position viewport", () => {
  assert.match(viewScript, /const MOBILE_DRAWER_QUERY = "\(max-width: 760px\)"/);
  assert.match(mobileStyles, /--mobile-control-size: 52px;/);
  assert.match(mobileStyles, /--mobile-control-gap: 10px;/);
  assert.match(mobileStyles, /overflow: hidden;/);
  assert.match(mobileStyles, /touch-action: pan-y;/);
  assert.match(mobileStyles, /\.settings-button[\s\S]*?box-shadow: none;/);
  assert.match(
    mobileStyles,
    /\.is-settings-revealed \.view-toggle-button[\s\S]*?box-shadow: none;/
  );
  assert.match(
    mobileStyles,
    /grid-template-columns:[\s\S]*?var\(--mobile-control-size\)[\s\S]*?minmax\(0, 1fr\)[\s\S]*?var\(--mobile-control-size\)/
  );
  assert.match(
    mobileStyles,
    /width: calc\(100% \+ var\(--mobile-control-size\) \+ var\(--mobile-control-gap\)\);/
  );
  assert.match(
    mobileStyles,
    /\.is-settings-revealed[\s\S]*?-1 \* \(var\(--mobile-control-size\) \+ var\(--mobile-control-gap\)\)/
  );
  assert.match(
    mobileStyles,
    /\.playback-primary-controls \.settings-button[\s\S]*?position: static;[\s\S]*?grid-column: 3;/
  );
  assert.match(
    styles,
    /\.settings-button\s*\{[\s\S]*?position: fixed;[\s\S]*?env\(safe-area-inset-top\)[\s\S]*?env\(safe-area-inset-right\)/
  );
});

test("drawer state stays separate from list, single, and settings display modes", () => {
  assert.match(viewScript, /const DrawerPosition = Object\.freeze\(\{[\s\S]*?PRIMARY: "primary"[\s\S]*?SETTINGS_REVEALED: "settings-revealed"/);
  assert.match(viewScript, /let displayMode = DisplayMode\.LIST/);
  assert.match(viewScript, /let drawerPosition = DrawerPosition\.PRIMARY/);
  assert.match(
    viewScript,
    /setDrawerPosition\([\s\S]*?showSettings[\s\S]*?DrawerPosition\.SETTINGS_REVEALED[\s\S]*?DrawerPosition\.PRIMARY/
  );
  assert.match(
    viewScript,
    /isMobileDrawer\(\) && displayMode === DisplayMode\.SETTINGS[\s\S]*?DrawerPosition\.SETTINGS_REVEALED[\s\S]*?DrawerPosition\.PRIMARY/
  );
  assert.doesNotMatch(
    viewScript,
    /DisplayMode\.(PRIMARY|SETTINGS_REVEALED)/
  );
});

test("gesture intent and drag activation use separate, phone-friendly thresholds", () => {
  assert.match(viewScript, /const GESTURE_INTENT_THRESHOLD = 5;/);
  assert.match(viewScript, /const DRAG_ACTIVATION_THRESHOLD = 8;/);
  assert.match(viewScript, /const HORIZONTAL_INTENT_RATIO = 1\.2;/);
  assert.match(
    viewScript,
    /Math\.max\(absoluteX, absoluteY\) < GESTURE_INTENT_THRESHOLD/
  );
  assert.match(
    viewScript,
    /absoluteY >= DRAG_ACTIVATION_THRESHOLD[\s\S]*?absoluteY > absoluteX \* HORIZONTAL_INTENT_RATIO/
  );
  assert.match(
    viewScript,
    /absoluteX < DRAG_ACTIVATION_THRESHOLD[\s\S]*?absoluteX <= absoluteY \* HORIZONTAL_INTENT_RATIO/
  );
  assert.match(viewScript, /drawerGesture\.direction = "vertical"/);
  assert.match(viewScript, /playbackBar\.setPointerCapture\(event\.pointerId\)/);
});

test("distance and recent velocity snapping work symmetrically from either endpoint", () => {
  assert.match(viewScript, /const SNAP_PROGRESS_THRESHOLD = 0\.28;/);
  assert.match(viewScript, /const MIN_FLING_DISTANCE = 16;/);
  assert.match(viewScript, /const FLING_VELOCITY_THRESHOLD = 0\.35;/);
  assert.match(viewScript, /const VELOCITY_SAMPLE_WINDOW = 100;/);
  assert.match(viewScript, /samples: \[\{ x: event\.clientX, time: startTime \}\]/);
  assert.match(viewScript, /sampleTime - VELOCITY_SAMPLE_WINDOW/);
  assert.match(viewScript, /samples\[0\]\.time < cutoff/);
  assert.match(
    viewScript,
    /return \(lastSample\.x - firstSample\.x\) \/ elapsed;/
  );
  assert.match(
    viewScript,
    /gesture\.currentOffset - gesture\.startOffset/
  );
  assert.match(
    viewScript,
    /startPosition === DrawerPosition\.PRIMARY && movementX < 0[\s\S]*?DrawerPosition\.SETTINGS_REVEALED/
  );
  assert.match(
    viewScript,
    /startPosition === DrawerPosition\.SETTINGS_REVEALED &&[\s\S]*?movementX > 0[\s\S]*?DrawerPosition\.PRIMARY/
  );
  assert.match(viewScript, /progress >= SNAP_PROGRESS_THRESHOLD/);
  assert.match(viewScript, /flingTarget !== gesture\.startPosition/);
});

test("pointer gestures clamp, cancel, and reset to legal drawer positions", () => {
  assert.match(viewScript, /event\.preventDefault\(\);[\s\S]*?clampDrawerOffset/);
  assert.match(viewScript, /Math\.min\(0, Math\.max\(-travelDistance, value\)\)/);
  assert.match(viewScript, /progress >= 0\.5/);
  assert.match(viewScript, /pointercancel", cancelDrawerGesture/);
  assert.match(viewScript, /lostpointercapture", cancelDrawerGesture/);
  assert.match(viewScript, /const suppressClick = drawerGesture\.dragging;/);
  assert.match(viewScript, /window\.addEventListener\("orientationchange", resetDrawerForViewport\)/);
  assert.match(
    viewScript,
    /function resetDrawerForViewport\(\) \{[\s\S]*?suppressNextDrawerClick = false;/
  );
  assert.match(viewScript, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/);
});

test("a drag suppresses only its click and settings remains locked in place", () => {
  assert.match(viewScript, /suppressNextDrawerClick = false;[\s\S]*?drawerGesture = \{/);
  assert.match(viewScript, /if \(suppressClick\) \{[\s\S]*?suppressNextDrawerClick = true;/);
  assert.match(
    viewScript,
    /function handleDrawerClickCapture[\s\S]*?event\.detail === 0[\s\S]*?suppressNextDrawerClick = false;[\s\S]*?preventDefault\(\);[\s\S]*?stopImmediatePropagation\(\);/
  );
  assert.match(
    viewScript,
    /canMove: displayMode !== DisplayMode\.SETTINGS/
  );
  assert.match(
    viewScript,
    /if \(drawerGesture\.canMove\) \{[\s\S]*?--mobile-drawer-offset/
  );
  assert.match(
    viewScript,
    /if \(!drawerGesture\.canMove\) \{[\s\S]*?nextPosition = DrawerPosition\.SETTINGS_REVEALED;/
  );
});

test("offscreen mobile controls leave Tab and accessibility navigation", () => {
  assert.match(viewScript, /element\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(viewScript, /element\.setAttribute\("inert", ""\)/);
  assert.match(viewScript, /element\.setAttribute\("tabindex", "-1"\)/);
  assert.match(viewScript, /drawerTabIndexes = new WeakMap\(\)/);
  assert.match(
    viewScript,
    /deferAvailability[\s\S]*?transitionend[\s\S]*?handleDrawerTransitionEnd/
  );
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.playback-primary-controls\s*\{[\s\S]*?transition: none;/
  );
});

test("drawer listeners are registered once and never touch audio state", () => {
  for (const eventName of [
    "pointerdown",
    "pointermove",
    "pointerup",
    "pointercancel",
    "lostpointercapture"
  ]) {
    assert.equal(
      (viewScript.match(new RegExp(`playbackBar\\.addEventListener\\("${eventName}"`, "g")) || []).length,
      1
    );
  }

  const drawerFunctions =
    viewScript.match(
      /function clampDrawerOffset[\s\S]*?(?=  toggleButton\.addEventListener)/
    )?.[0] || "";

  assert.doesNotMatch(
    drawerFunctions,
    /selectStation|userWantsPlayback|playbackState|activePlayRequest|retryTimer|bufferingTimer|\.src|\.load\(|\.play\(|\.pause\(/
  );
});