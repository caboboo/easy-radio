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
  assert.match(viewScript, /function handleDrawerLostPointerCapture/);
  assert.match(viewScript, /event\.target !== playbackBar/);
  assert.match(viewScript, /!drawerGesture/);
  assert.match(
    viewScript,
    /event\.pointerId !== drawerGesture\.pointerId/
  );
  assert.match(viewScript, /cancelDrawerGesture\(event\);/);
  assert.match(
    viewScript,
    /playbackBar\.addEventListener\(\s*"lostpointercapture",\s*handleDrawerLostPointerCapture\s*\);/
  );
  assert.doesNotMatch(
    viewScript,
    /addEventListener\("lostpointercapture", cancelDrawerGesture\)/
  );  assert.match(viewScript, /const suppressClick = drawerGesture\.dragging;/);
  assert.match(viewScript, /window\.addEventListener\("orientationchange", resetDrawerForViewport\)/);
  assert.match(
    viewScript,
    /function resetDrawerForViewport\(\) \{[\s\S]*?suppressNextDrawerClick = false;/
  );
  assert.match(viewScript, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/);
});

test("Settings uses the existing drawer thresholds without moving its controls", () => {
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
    /drawerGesture\.currentOffset = clampDrawerOffset\([\s\S]*?if \(drawerGesture\.canMove\) \{[\s\S]*?--mobile-drawer-offset/
  );
  assert.match(
    viewScript,
    /if \(!drawerGesture\.canMove\) \{[\s\S]*?nextPosition = DrawerPosition\.SETTINGS_REVEALED;/
  );
  assert.match(
    viewScript,
    /const shouldReturnFromSettings =[\s\S]*?displayMode === DisplayMode\.SETTINGS[\s\S]*?nextPosition === DrawerPosition\.PRIMARY/
  );
  assert.match(
    viewScript,
    /if \(shouldReturnFromSettings\) \{[\s\S]*?returnFromSettings\(\);/
  );
});

test("the mobile control viewport captures pointer sequences from control buttons", () => {
  assert.match(
    viewScript,
    /playbackBar\.addEventListener\("pointerdown", handleDrawerPointerDown, \{\s*capture: true\s*\}\);/
  );
  assert.match(
    viewScript,
    /playbackBar\.addEventListener\("pointermove", handleDrawerPointerMove, \{\s*capture: true,\s*passive: false\s*\}\);/
  );
  assert.match(
    viewScript,
    /playbackBar\.addEventListener\("pointerup", handleDrawerPointerUp, \{\s*capture: true\s*\}\);/
  );
  assert.match(
    viewScript,
    /playbackBar\.addEventListener\("pointercancel", cancelDrawerGesture, \{\s*capture: true\s*\}\);/
  );
  assert.match(viewScript, /originTarget: event\.target/);
  assert.match(
    viewScript,
    /originButton: event\.target\.closest\?\.\("button"\) \|\| null/
  );
  assert.doesNotMatch(
    viewScript,
    /if \([^)]*(?:closest\(["']button["']\)|tagName)[^)]*\)\s*\{?\s*return;/
  );
});

test("pointer capture starts only after a horizontal drag is confirmed", () => {
  const pointerDown =
    viewScript.match(
      /function handleDrawerPointerDown\(event\) \{[\s\S]*?(?=\n  function handleDrawerPointerMove)/
    )?.[0] || "";
  const pointerMove =
    viewScript.match(
      /function handleDrawerPointerMove\(event\) \{[\s\S]*?(?=\n  function finishDrawerGesture)/
    )?.[0] || "";

  assert.doesNotMatch(pointerDown, /setPointerCapture/);
  assert.match(
    pointerMove,
    /drawerGesture\.direction = "horizontal";[\s\S]*?drawerGesture\.dragging = true;[\s\S]*?setPointerCapture\(event\.pointerId\)/
  );
});

test("mobile control descendants share touch handling and decorative targets do not intercept pointers", () => {
  assert.match(
    mobileStyles,
    /\.floating-playback-bar \{[\s\S]*?touch-action: pan-y;[\s\S]*?user-select: none;[\s\S]*?-webkit-user-select: none;[\s\S]*?-webkit-touch-callout: none;/
  );
  assert.match(
    mobileStyles,
    /\.playback-primary-controls \{[\s\S]*?touch-action: pan-y;/
  );
  assert.match(
    mobileStyles,
    /\.playback-primary-controls \.view-toggle-button,[\s\S]*?\.playback-primary-controls \.settings-button \{\s*touch-action: pan-y;\s*\}/
  );
  assert.match(
    mobileStyles,
    /\.playback-primary-controls \.view-toggle-icon,[\s\S]*?\.playback-primary-controls #playText \{\s*pointer-events: none;\s*\}/
  );
  assert.doesNotMatch(
    styles,
    /(?:^|\n)\s*(?:svg|span)\s*\{[\s\S]*?pointer-events: none;/
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
      (viewScript.match(new RegExp(`playbackBar\\.addEventListener\\(\\s*"${eventName}"`, "g")) || []).length,
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
function extractDrawerFunction(name) {
  const match = viewScript.match(
    new RegExp(
      `  function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?(?=\\n  function |\\n  toggleButton\\.addEventListener)`
    )
  );

  assert.ok(match, `Expected to extract ${name} from station-menu.js.`);
  return match[0];
}

function createDrawerGestureHarness(
  initialPosition = "primary",
  { initialDisplayMode = "list", returnMode = "list" } = {}
) {
  const capturedPointers = new Set();
  const activeClasses = new Set();
  const customStyles = new Map();
  const playbackBar = {
    classList: {
      add(name) {
        activeClasses.add(name);
      },
      remove(name) {
        activeClasses.delete(name);
      },
      contains(name) {
        return activeClasses.has(name);
      }
    },
    style: {
      setProperty(name, value) {
        customStyles.set(name, value);
      },
      removeProperty(name) {
        customStyles.delete(name);
      }
    },
    setPointerCapture(pointerId) {
      capturedPointers.add(pointerId);
    },
    hasPointerCapture(pointerId) {
      return capturedPointers.has(pointerId);
    },
    releasePointerCapture(pointerId) {
      capturedPointers.delete(pointerId);
    }
  };
  const functionNames = [
    "clampDrawerOffset",
    "recordDrawerPointerSample",
    "getRecentDrawerVelocity",
    "getDirectionalDrawerPosition",
    "getDrawerSnapPosition",
    "handleDrawerPointerDown",
    "handleDrawerPointerMove",
    "finishDrawerGesture",
    "handleDrawerPointerUp",
    "cancelDrawerGesture",
    "handleDrawerLostPointerCapture",
    "handleDrawerClickCapture"
  ];
  const functions = functionNames.map(extractDrawerFunction).join("\n");
  const makeHarness = new Function(
    "playbackBar",
    "initialPosition",
    "initialDisplayMode",
    "returnMode",
    `
      "use strict";
      const DisplayMode = Object.freeze({
        LIST: "list",
        SINGLE: "single",
        SETTINGS: "settings"
      });
      const DrawerPosition = Object.freeze({
        PRIMARY: "primary",
        SETTINGS_REVEALED: "settings-revealed"
      });
      const GESTURE_INTENT_THRESHOLD = 5;
      const DRAG_ACTIVATION_THRESHOLD = 8;
      const HORIZONTAL_INTENT_RATIO = 1.2;
      const SNAP_PROGRESS_THRESHOLD = 0.28;
      const MIN_FLING_DISTANCE = 16;
      const FLING_VELOCITY_THRESHOLD = 0.35;
      const VELOCITY_SAMPLE_WINDOW = 100;
      let clock = 0;
      const window = {
        performance: {
          now() {
            clock += 100;
            return clock;
          }
        }
      };
      let displayMode = initialDisplayMode;
      let drawerPosition = initialPosition;
      let drawerGesture = null;
      let suppressNextDrawerClick = false;
      let returnFromSettingsCalls = 0;

      function isMobileDrawer() {
        return true;
      }

      function getDrawerTravelDistance() {
        return 54;
      }

      function getDrawerOffset() {
        return drawerPosition === DrawerPosition.SETTINGS_REVEALED ? -54 : 0;
      }

      function setDrawerPosition(nextPosition) {
        drawerPosition = nextPosition;
        playbackBar.classList.remove("is-drawer-dragging");
        playbackBar.style.removeProperty("--mobile-drawer-offset");
      }

      function returnFromSettings() {
        if (displayMode !== DisplayMode.SETTINGS) {
          return;
        }

        returnFromSettingsCalls += 1;
        displayMode = returnMode;
        setDrawerPosition(DrawerPosition.PRIMARY);
      }

      ${functions}

      return {
        pointerDown: handleDrawerPointerDown,
        pointerMove: handleDrawerPointerMove,
        pointerUp: handleDrawerPointerUp,
        pointerCancel: cancelDrawerGesture,
        lostPointerCapture: handleDrawerLostPointerCapture,
        clickCapture: handleDrawerClickCapture,
        state() {
          return {
            displayMode,
            drawerPosition,
            gesture: drawerGesture
              ? {
                  pointerId: drawerGesture.pointerId,
                  dragging: drawerGesture.dragging,
                  direction: drawerGesture.direction,
                  currentOffset: drawerGesture.currentOffset
                }
              : null,
            suppressNextDrawerClick,
            returnFromSettingsCalls,
            draggingClass: playbackBar.classList.contains(
              "is-drawer-dragging"
            )
          };
        }
      };
    `
  );

  return {
    playbackBar,
    ...makeHarness(
      playbackBar,
      initialPosition,
      initialDisplayMode,
      returnMode
    )
  };
}

function createControlTarget(id) {
  return {
    id,
    closest(selector) {
      return selector === "button" ? this : null;
    }
  };
}

function createPointerEvent({
  pointerId = 1,
  target,
  clientX,
  clientY = 0
}) {
  return {
    pointerId,
    target,
    clientX,
    clientY,
    pointerType: "touch",
    button: 0,
    isPrimary: true,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    }
  };
}

function beginHorizontalDrag(harness, target, startX, nextX) {
  harness.pointerDown(
    createPointerEvent({ target, clientX: startX })
  );
  harness.pointerMove(
    createPointerEvent({ target, clientX: nextX })
  );
}

test("descendant pointer capture transfers keep left drags alive", () => {
  for (const id of ["playButton", "viewToggleButton"]) {
    const harness = createDrawerGestureHarness();
    const button = createControlTarget(id);

    beginHorizontalDrag(harness, button, 100, 90);
    harness.lostPointerCapture(
      createPointerEvent({ target: button, clientX: 90 })
    );

    assert.deepEqual(
      {
        dragging: harness.state().gesture?.dragging,
        direction: harness.state().gesture?.direction,
        drawerPosition: harness.state().drawerPosition
      },
      {
        dragging: true,
        direction: "horizontal",
        drawerPosition: "primary"
      }
    );

    harness.pointerMove(
      createPointerEvent({ target: button, clientX: 82 })
    );
    harness.pointerUp(
      createPointerEvent({ target: button, clientX: 82 })
    );

    assert.equal(harness.state().drawerPosition, "settings-revealed");
    assert.equal(harness.state().gesture, null);
  }
});

test("18px of 54px snaps after a play button capture transfer", () => {
  const harness = createDrawerGestureHarness();
  const playButton = createControlTarget("playButton");

  beginHorizontalDrag(harness, playButton, 100, 90);
  harness.lostPointerCapture(
    createPointerEvent({ target: playButton, clientX: 90 })
  );
  harness.pointerMove(
    createPointerEvent({ target: playButton, clientX: 82 })
  );

  assert.equal(harness.state().gesture?.currentOffset, -18);
  harness.pointerUp(
    createPointerEvent({ target: playButton, clientX: 82 })
  );
  assert.equal(harness.state().drawerPosition, "settings-revealed");
});

test("descendant capture transfers keep right drags alive", () => {
  for (const id of ["playButton", "settingsButton"]) {
    const harness = createDrawerGestureHarness("settings-revealed");
    const button = createControlTarget(id);

    beginHorizontalDrag(harness, button, 100, 110);
    harness.lostPointerCapture(
      createPointerEvent({ target: button, clientX: 110 })
    );
    assert.equal(harness.state().gesture?.dragging, true);

    harness.pointerMove(
      createPointerEvent({ target: button, clientX: 118 })
    );
    harness.pointerUp(
      createPointerEvent({ target: button, clientX: 118 })
    );

    assert.equal(harness.state().drawerPosition, "primary");
    assert.equal(harness.state().gesture, null);
  }
});

test("only the active playback bar capture loss cancels a drag", () => {
  const playButton = createControlTarget("playButton");
  const wrongPointerHarness = createDrawerGestureHarness();

  beginHorizontalDrag(wrongPointerHarness, playButton, 100, 90);
  wrongPointerHarness.lostPointerCapture(
    createPointerEvent({
      pointerId: 2,
      target: wrongPointerHarness.playbackBar,
      clientX: 90
    })
  );
  assert.equal(wrongPointerHarness.state().gesture?.pointerId, 1);
  assert.equal(wrongPointerHarness.state().gesture?.dragging, true);

  const activePointerHarness = createDrawerGestureHarness();
  beginHorizontalDrag(activePointerHarness, playButton, 100, 90);
  activePointerHarness.lostPointerCapture(
    createPointerEvent({
      target: activePointerHarness.playbackBar,
      clientX: 90
    })
  );

  assert.equal(activePointerHarness.state().gesture, null);
  assert.equal(activePointerHarness.state().drawerPosition, "primary");
  assert.equal(activePointerHarness.state().draggingClass, false);
});

test("a completed button drag suppresses exactly its derived click", () => {
  const harness = createDrawerGestureHarness();
  const playButton = createControlTarget("playButton");

  beginHorizontalDrag(harness, playButton, 100, 90);
  harness.lostPointerCapture(
    createPointerEvent({ target: playButton, clientX: 90 })
  );
  harness.pointerMove(
    createPointerEvent({ target: playButton, clientX: 82 })
  );
  harness.pointerUp(
    createPointerEvent({ target: playButton, clientX: 82 })
  );

  const firstClick = {
    detail: 1,
    prevented: false,
    stopped: false,
    preventDefault() {
      this.prevented = true;
    },
    stopImmediatePropagation() {
      this.stopped = true;
    }
  };
  harness.clickCapture(firstClick);
  assert.equal(firstClick.prevented, true);
  assert.equal(firstClick.stopped, true);
  assert.equal(harness.state().suppressNextDrawerClick, false);

  const nextClick = {
    detail: 1,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
    stopImmediatePropagation() {}
  };
  harness.clickCapture(nextClick);
  assert.equal(nextClick.prevented, false);
});

test("Settings right swipe uses the same return path for both previous views", () => {
  const starts = [
    { target: createControlTarget("playButton"), returnMode: "list" },
    { target: { id: "playbackBar" }, returnMode: "single" }
  ];

  for (const { target, returnMode } of starts) {
    const harness = createDrawerGestureHarness("settings-revealed", {
      initialDisplayMode: "settings",
      returnMode
    });

    beginHorizontalDrag(harness, target, 100, 110);
    harness.pointerMove(
      createPointerEvent({ target, clientX: 118 })
    );
    harness.pointerUp(
      createPointerEvent({ target, clientX: 118 })
    );

    assert.equal(harness.state().displayMode, returnMode);
    assert.equal(harness.state().drawerPosition, "primary");
    assert.equal(harness.state().returnFromSettingsCalls, 1);
    assert.equal(harness.state().suppressNextDrawerClick, true);
  }
});

test("Settings left, short, and vertical gestures stay open", () => {
  const playButton = createControlTarget("playButton");
  const gestures = [
    [
      createPointerEvent({ target: playButton, clientX: 100 }),
      createPointerEvent({ target: playButton, clientX: 80 })
    ],
    [
      createPointerEvent({ target: playButton, clientX: 100 }),
      createPointerEvent({ target: playButton, clientX: 108 })
    ],
    [
      createPointerEvent({ target: playButton, clientX: 100 }),
      createPointerEvent({ target: playButton, clientX: 102, clientY: 20 })
    ]
  ];

  for (const [start, end] of gestures) {
    const harness = createDrawerGestureHarness("settings-revealed", {
      initialDisplayMode: "settings"
    });

    harness.pointerDown(start);
    harness.pointerMove(end);
    harness.pointerUp(end);

    assert.equal(harness.state().displayMode, "settings");
    assert.equal(harness.state().drawerPosition, "settings-revealed");
    assert.equal(harness.state().returnFromSettingsCalls, 0);
    assert.equal(harness.state().gesture, null);
  }
});

test("Settings cancellation and capture loss never close the view", () => {
  const playButton = createControlTarget("playButton");
  const canceledHarness = createDrawerGestureHarness("settings-revealed", {
    initialDisplayMode: "settings"
  });

  beginHorizontalDrag(canceledHarness, playButton, 100, 118);
  canceledHarness.pointerCancel(
    createPointerEvent({ target: canceledHarness.playbackBar, clientX: 118 })
  );
  assert.equal(canceledHarness.state().displayMode, "settings");
  assert.equal(canceledHarness.state().returnFromSettingsCalls, 0);
  assert.equal(canceledHarness.state().gesture, null);

  const captureHarness = createDrawerGestureHarness("settings-revealed", {
    initialDisplayMode: "settings"
  });
  beginHorizontalDrag(captureHarness, playButton, 100, 110);
  captureHarness.lostPointerCapture(
    createPointerEvent({ target: playButton, clientX: 110 })
  );
  assert.equal(captureHarness.state().gesture?.dragging, true);

  captureHarness.lostPointerCapture(
    createPointerEvent({ target: captureHarness.playbackBar, clientX: 110 })
  );
  assert.equal(captureHarness.state().displayMode, "settings");
  assert.equal(captureHarness.state().returnFromSettingsCalls, 0);
  assert.equal(captureHarness.state().gesture, null);
});

test("Settings swipe suppresses its click while a tap preserves button action", () => {
  const playButton = createControlTarget("playButton");
  const swipeHarness = createDrawerGestureHarness("settings-revealed", {
    initialDisplayMode: "settings"
  });

  beginHorizontalDrag(swipeHarness, playButton, 100, 118);
  swipeHarness.pointerUp(
    createPointerEvent({ target: playButton, clientX: 118 })
  );
  const swipeClick = {
    detail: 1,
    prevented: false,
    stopped: false,
    preventDefault() {
      this.prevented = true;
    },
    stopImmediatePropagation() {
      this.stopped = true;
    }
  };
  swipeHarness.clickCapture(swipeClick);
  assert.equal(swipeClick.prevented, true);
  assert.equal(swipeClick.stopped, true);

  const tapHarness = createDrawerGestureHarness("settings-revealed", {
    initialDisplayMode: "settings"
  });
  const tapEvent = createPointerEvent({ target: playButton, clientX: 100 });
  tapHarness.pointerDown(tapEvent);
  tapHarness.pointerUp(tapEvent);
  const tapClick = {
    detail: 1,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
    stopImmediatePropagation() {}
  };
  tapHarness.clickCapture(tapClick);
  assert.equal(tapClick.prevented, false);
  assert.equal(tapHarness.state().displayMode, "settings");
  assert.equal(tapHarness.state().returnFromSettingsCalls, 0);
});
