const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

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
  assert.match(embeddedPlayer, /若播放器出現「確定」，請先按下開始收聽/);
  assert.doesNotMatch(embeddedPlayer, /請按播放器中的「確定」開始收聽/);
  assert.match(script, /若播放器出現「確定」，請先按下開始收聽/);
  assert.doesNotMatch(script, /請按播放器中的「確定」開始收聽/);
  assert.match(embeddedPlayer, /id="embeddedStationPlayerHost"/);
  assert.match(embeddedPlayer, /id="embeddedStationPlayerLockToggle"/);
  assert.match(embeddedPlayer, /解鎖官方播放器/);
  assert.match(embeddedPlayer, /id="embeddedStationPlayerReset"/);
  assert.match(embeddedPlayer, /aria-controls="embeddedStationPlayerHost"/);
  assert.match(embeddedPlayer, /重新載入官方播放器/);
  assert.doesNotMatch(embeddedPlayer, /id="embeddedStationPlayerToggle"/);
  assert.doesNotMatch(embeddedPlayer, /class="embedded-station-player-toggle"/);
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
    /--greenpeace-player-full-page-height:\s*520px;[\s\S]*?--greenpeace-player-unlocked-height:\s*clamp\(260px, 52vh, 420px\);/
  );
  assert.match(
    styles,
    /#embeddedStationPlayerHost\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*100%;[\s\S]*?overflow:\s*hidden;/
  );
  assert.match(
    styles,
    /#embeddedStationPlayerHost iframe\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*100%;[\s\S]*?height:\s*var\(--greenpeace-player-full-page-height\);[\s\S]*?border:\s*0;/
  );
  assert.match(
    styles,
    /\.embedded-station-player\.is-unlocked #embeddedStationPlayerHost iframe\s*\{[\s\S]*?height:\s*var\(--greenpeace-player-unlocked-height\);/
  );
});

test("reload is presented as a secondary recovery action", () => {
  const embeddedPlayer =
    html.match(
      /<section[\s\S]*?id="embeddedStationPlayer"[\s\S]*?<\/section>/
    )?.[0] || "";

  assert.match(
    embeddedPlayer,
    /class="embedded-station-player-recovery"[\s\S]*?若播放器無法正常使用[\s\S]*?<button[\s\S]*?id="embeddedStationPlayerReset"[\s\S]*?class="embedded-station-player-reset embedded-station-player-recovery-action"/
  );
  assert.match(
    embeddedPlayer,
    /id="embeddedStationPlayerReset"[\s\S]*?aria-describedby="embeddedStationPlayerRecoveryHint"[\s\S]*?重新載入官方播放器[\s\S]*?<\/button>/
  );
  assert.doesNotMatch(embeddedPlayer, /embeddedStationPlayerToggle/);
  assert.doesNotMatch(styles, /\.embedded-station-player-toggle/);
  assert.match(
    styles,
    /\.embedded-station-player-reset\s*\{[\s\S]*?min-height: 44px;[\s\S]*?border: 1px solid #a58f73;[\s\S]*?background: transparent;/
  );
  assert.match(
    styles,
    /\.embedded-station-player\.is-parked \.embedded-station-player-recovery,[\s\S]*?display: none;/
  );
  assert.doesNotMatch(script, /\bconfirm\s*\(/);
});

test("lock and unlock are one low-priority layout fallback", () => {
  const embeddedPlayer =
    html.match(
      /<section[\s\S]*?id="embeddedStationPlayer"[\s\S]*?<\/section>/
    )?.[0] || "";
  const modeControl =
    embeddedPlayer.match(
      /<button[\s\S]*?id="embeddedStationPlayerLockToggle"[\s\S]*?<\/button>/
    )?.[0] || "";
  const visibilityFunction =
    script.match(
      /function updateEmbeddedStationPlayerVisibility\(\) \{[\s\S]*?\n\}/
    )?.[0] || "";
  const toggleFunction =
    script.match(
      /function toggleEmbeddedStationPlayerLock\(\) \{[\s\S]*?\n\}/
    )?.[0] || "";

  assert.equal(
    (embeddedPlayer.match(/id="embeddedStationPlayerLockToggle"/g) || [])
      .length,
    1
  );
  assert.match(modeControl, /type="button"/);
  assert.match(modeControl, /aria-controls="embeddedStationPlayerHost"/);
  assert.match(modeControl, /hidden/);
  assert.match(modeControl, /解鎖官方播放器/);
  assert.match(
    styles,
    /\.embedded-station-player-lock-toggle\s*\{[\s\S]*?min-height:\s*44px;[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;/
  );
  assert.match(
    visibilityFunction,
    /classList\.toggle\([\s\S]*?"is-unlocked",[\s\S]*?isEmbeddedStationPlayerUnlocked/
  );
  assert.match(
    visibilityFunction,
    /embeddedStationPlayerLockToggle\.hidden = !isActive \|\| isCollapsed/
  );
  assert.match(
    visibilityFunction,
    /"鎖定官方播放器"[\s\S]*?: "解鎖官方播放器"/
  );
  assert.match(
    visibilityFunction,
    /"scrolling",[\s\S]*?isEmbeddedStationPlayerUnlocked \? "auto" : "no"/
  );
  assert.match(
    toggleFunction,
    /isEmbeddedStationPlayerUnlocked = !isEmbeddedStationPlayerUnlocked/
  );
  assert.match(toggleFunction, /updateEmbeddedStationPlayerVisibility\(\)/);
  assert.doesNotMatch(
    toggleFunction,
    /destroyEmbeddedStationPlayer|showEmbeddedStationPlayer|replaceChildren|remove\(|\.src|append\(|createElement/
  );
  assert.doesNotMatch(
    `${html}\n${script}`,
    /contentDocument|MutationObserver|postMessage|embedded-station-player-overlay/
  );
  assert.doesNotMatch(
    styles.match(/#embeddedStationPlayerHost iframe\s*\{[\s\S]*?\}/)?.[0] || "",
    /pointer-events/
  );
});

test("normal player content precedes the single recovery section", () => {
  const embeddedPlayer =
    html.match(
      /<section[\s\S]*?id="embeddedStationPlayer"[\s\S]*?<\/section>/
    )?.[0] || "";
  const helperIndex = embeddedPlayer.indexOf('id="embeddedStationPlayerStatus"');
  const hostIndex = embeddedPlayer.indexOf('id="embeddedStationPlayerHost"');
  const modeControlIndex = embeddedPlayer.indexOf(
    'class="embedded-station-player-mode-control"'
  );
  const recoveryIndex = embeddedPlayer.indexOf(
    'class="embedded-station-player-recovery"'
  );

  assert.ok(helperIndex >= 0);
  assert.ok(hostIndex > helperIndex);
  assert.ok(modeControlIndex > hostIndex);
  assert.ok(recoveryIndex > modeControlIndex);
  assert.equal(
    (embeddedPlayer.match(/class="embedded-station-player-recovery"/g) || [])
      .length,
    1
  );
  assert.equal(
    (embeddedPlayer.match(/id="embeddedStationPlayerReset"/g) || []).length,
    1
  );
  assert.match(
    styles,
    /@media \(max-width: 760px\) \{[\s\S]*?\.embedded-station-player-recovery\s*\{[\s\S]*?margin-bottom: 64px;/
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
    /parkEmbeddedStationPlayer\(\);[\s\S]*?radioSource\.src = currentStation\.streamUrl;[\s\S]*?radio\.load\(\);/
  );
  assert.match(script, /void attemptPlayback\("station-change"\)/);
  assert.match(
    script,
    /playButton\.addEventListener\("click", \(\) => \{\s*if \(isEmbeddedPlayerStation\(currentStation\)\) \{\s*activateEmbeddedStationPlayerControl\(\);\s*return;/
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
  assert.match(visibilityFunction, /"官方播放器已收起"/);
  assert.doesNotMatch(visibilityFunction, /embeddedStationPlayerToggle/);
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

test("station changes park and preserve the Greenpeace iframe session", () => {
  const initializeFunction =
    script.match(/function initializeCurrentStation[\s\S]*?\n\}/)?.[0] || "";
  const selectStationFunction =
    script.match(/function selectStation[\s\S]*?\n\}/)?.[0] || "";
  const embeddedReturn =
    'return { changed: true, reason: "embedded-player" };';
  const embeddedReturnIndex = selectStationFunction.indexOf(embeddedReturn);

  assert.ok(embeddedReturnIndex >= 0);
  const ordinaryStationBranch = selectStationFunction.slice(
    embeddedReturnIndex + embeddedReturn.length
  );

  assert.match(
    initializeFunction,
    /parkEmbeddedStationPlayer\(\);[\s\S]*?radioSource\.src = currentStation\.streamUrl;/
  );
  assert.doesNotMatch(initializeFunction, /destroyEmbeddedStationPlayer\(\)/);
  assert.match(
    ordinaryStationBranch,
    /parkEmbeddedStationPlayer\(\);[\s\S]*?radioSource\.src = currentStation\.streamUrl;[\s\S]*?radio\.load\(\);/
  );
  assert.doesNotMatch(
    ordinaryStationBranch,
    /destroyEmbeddedStationPlayer|replaceChildren|remove\(|about:blank/
  );
  assert.equal(
    (script.match(/destroyEmbeddedStationPlayer\(\);/g) || []).length,
    1
  );
});

test("runtime lifecycle preserves iframe identity, src and marker until manual reload", () => {
  const functionNames = [
    "cleanStationText",
    "isEmbeddedPlayerStation",
    "updateEmbeddedStationPlayerVisibility",
    "destroyEmbeddedStationPlayer",
    "showEmbeddedStationPlayer",
    "parkEmbeddedStationPlayer",
    "resetEmbeddedStationPlayer",
    "toggleEmbeddedStationPlayer",
    "toggleEmbeddedStationPlayerLock"
  ];
  const functionSources = functionNames.map((name) => {
    const source =
      script.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))?.[0] ||
      "";
    assert.ok(source, `missing ${name}`);
    return source;
  });
  const context = {};

  vm.runInNewContext(
    `
      const greenpeace = {
        name: "綠色和平廣播",
        streamUrl: "",
        iframeUrl: "https://greenpeace.bcom.tw/playVideo.php"
      };
      const ordinary = {
        name: "中廣音樂網",
        streamUrl: "https://example.com/live.mp3",
        iframeUrl: ""
      };
      let currentStation = greenpeace;
      let currentDisplayMode = "single";
      let embeddedStationPlayerFrame = null;
      let isEmbeddedStationPlayerCollapsed = false;
      let isEmbeddedStationPlayerUnlocked = false;
      let iframeRequestCount = 0;
      let iframeSrcAssignmentCount = 0;

      function updatePlaybackUI() {}

      function createElementState() {
        const classes = new Set();
        const attributes = new Map();
        return {
          hidden: false,
          tabIndex: 0,
          textContent: "",
          dataset: {},
          classList: {
            toggle(name, enabled) {
              if (enabled) classes.add(name);
              else classes.delete(name);
              return enabled;
            },
            contains(name) {
              return classes.has(name);
            }
          },
          setAttribute(name, value) {
            attributes.set(name, String(value));
          },
          getAttribute(name) {
            return attributes.get(name);
          }
        };
      }

      const embeddedStationPlayerElement = createElementState();
      const embeddedStationPlayerReset = createElementState();
      const embeddedStationPlayerLockToggle = createElementState();
      const embeddedStationPlayerStatus = createElementState();
      const embeddedStationPlayerHost = {
        ...createElementState(),
        children: [],
        append(frame) {
          this.children.push(frame);
          frame.parentNode = this;
        },
        replaceChildren() {
          for (const child of this.children) child.parentNode = null;
          this.children = [];
        }
      };
      const document = {
        createElement(tagName) {
          if (tagName !== "iframe") throw new Error("unexpected element");
          iframeRequestCount += 1;
          const frame = {
            ...createElementState(),
            tagName: "IFRAME",
            title: "",
            allow: "",
            loading: "",
            tabIndex: -1,
            parentNode: null,
            dataset: {}
          };
          let src = "";
          Object.defineProperty(frame, "src", {
            get() {
              return src;
            },
            set(value) {
              iframeSrcAssignmentCount += 1;
              src = value;
            }
          });
          return frame;
        }
      };

      ${functionSources.join("\n")}

      globalThis.lifecycle = {
        greenpeace,
        ordinary,
        show: showEmbeddedStationPlayer,
        park: parkEmbeddedStationPlayer,
        reset: resetEmbeddedStationPlayer,
        toggle: toggleEmbeddedStationPlayer,
        toggleLock: toggleEmbeddedStationPlayerLock,
        setStation(station) {
          currentStation = station;
          updateEmbeddedStationPlayerVisibility();
        },
        setView(view) {
          currentDisplayMode = view;
          updateEmbeddedStationPlayerVisibility();
        },
        frame() {
          return embeddedStationPlayerFrame;
        },
        requestCount() {
          return iframeRequestCount;
        },
        srcAssignmentCount() {
          return iframeSrcAssignmentCount;
        },
        mode() {
          return embeddedStationPlayerElement.dataset.playerMode;
        },
        modeLabel() {
          return embeddedStationPlayerLockToggle.textContent;
        },
        modeControlHidden() {
          return embeddedStationPlayerLockToggle.hidden;
        },
        hostContains(frame) {
          return embeddedStationPlayerHost.children.includes(frame);
        }
      };
    `,
    context
  );

  const lifecycle = context.lifecycle;
  lifecycle.show(lifecycle.greenpeace);
  const frameA = lifecycle.frame();
  const originalSrc = frameA.src;
  frameA.__sessionMarker = "session-A";

  assert.equal(lifecycle.requestCount(), 1);
  assert.equal(lifecycle.srcAssignmentCount(), 1);
  assert.ok(lifecycle.hostContains(frameA));
  assert.equal(lifecycle.mode(), "locked");
  assert.equal(lifecycle.modeLabel(), "解鎖官方播放器");
  assert.equal(frameA.getAttribute("scrolling"), "no");

  lifecycle.toggleLock();
  assert.equal(lifecycle.frame(), frameA);
  assert.equal(lifecycle.mode(), "unlocked");
  assert.equal(lifecycle.modeLabel(), "鎖定官方播放器");
  assert.equal(frameA.getAttribute("scrolling"), "auto");
  assert.equal(lifecycle.requestCount(), 1);
  assert.equal(lifecycle.srcAssignmentCount(), 1);

  lifecycle.toggle();
  assert.equal(lifecycle.frame(), frameA);
  assert.equal(lifecycle.modeControlHidden(), true);
  assert.equal(lifecycle.mode(), "unlocked");
  lifecycle.toggle();
  assert.equal(lifecycle.frame(), frameA);
  assert.equal(lifecycle.modeControlHidden(), false);
  assert.equal(lifecycle.mode(), "unlocked");

  lifecycle.setView("list");
  lifecycle.park();
  lifecycle.setView("single");
  lifecycle.show(lifecycle.greenpeace);
  assert.equal(lifecycle.frame(), frameA);
  assert.equal(lifecycle.mode(), "unlocked");

  lifecycle.setView("settings");
  lifecycle.park();
  lifecycle.setView("single");
  lifecycle.show(lifecycle.greenpeace);
  assert.equal(lifecycle.frame(), frameA);
  assert.equal(lifecycle.mode(), "unlocked");

  lifecycle.setStation(lifecycle.ordinary);
  lifecycle.park();
  lifecycle.setView("list");
  lifecycle.park();
  lifecycle.setView("single");
  lifecycle.park();
  assert.equal(lifecycle.frame(), frameA);
  assert.ok(lifecycle.hostContains(frameA));

  lifecycle.setStation(lifecycle.greenpeace);
  lifecycle.show(lifecycle.greenpeace);
  for (let index = 0; index < 6; index += 1) {
    lifecycle.toggle();
  }

  assert.equal(lifecycle.frame(), frameA);
  assert.equal(lifecycle.frame().__sessionMarker, "session-A");
  assert.equal(lifecycle.frame().src, originalSrc);
  assert.equal(lifecycle.requestCount(), 1);
  assert.equal(lifecycle.srcAssignmentCount(), 1);
  assert.equal(lifecycle.mode(), "unlocked");

  lifecycle.toggleLock();
  assert.equal(lifecycle.frame(), frameA);
  assert.equal(lifecycle.mode(), "locked");
  assert.equal(lifecycle.modeLabel(), "解鎖官方播放器");
  assert.equal(frameA.getAttribute("scrolling"), "no");
  assert.equal(lifecycle.requestCount(), 1);
  assert.equal(lifecycle.srcAssignmentCount(), 1);

  lifecycle.reset();
  const frameB = lifecycle.frame();

  assert.notEqual(frameB, frameA);
  assert.equal(frameA.parentNode, null);
  assert.ok(lifecycle.hostContains(frameB));
  assert.equal(frameB.__sessionMarker, undefined);
  assert.equal(frameB.src, originalSrc);
  assert.equal(lifecycle.requestCount(), 2);
  assert.equal(lifecycle.srcAssignmentCount(), 2);
  assert.equal(lifecycle.mode(), "locked");
  assert.equal(frameB.getAttribute("scrolling"), "no");
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
  assert.match(destroyFunction, /isEmbeddedStationPlayerUnlocked = false/);
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
