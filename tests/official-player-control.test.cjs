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

function getFunctionSource(name, source = script) {
  const functionSource =
    source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))?.[0] ||
    "";

  assert.ok(functionSource, `missing ${name}`);
  return functionSource;
}

test("the Greenpeace control uses one accessible display icon instead of Play", () => {
  const playButton =
    html.match(/<button id="playButton"[\s\S]*?<\/button>/)?.[0] || "";

  assert.match(playButton, /id="playIcon"[\s\S]*?>▶<\/span>/);
  assert.match(
    playButton,
    /<svg[\s\S]*?id="officialPlayerIcon"[\s\S]*?aria-hidden="true"[\s\S]*?focusable="false"[\s\S]*?hidden/
  );
  assert.match(playButton, /<rect[^>]*><\/rect>/);
  assert.match(playButton, /<path d="M8 21h8M12 18v3"><\/path>/);
  assert.equal((html.match(/id="officialPlayerIcon"/g) || []).length, 1);
});

test("Greenpeace labels follow the existing view and collapsed state", () => {
  const context = {};

  vm.runInNewContext(
    `
      let currentDisplayMode = "list";
      let isEmbeddedStationPlayerCollapsed = false;
      ${getFunctionSource("getEmbeddedPlayerControlLabel")}
      globalThis.control = {
        label: getEmbeddedPlayerControlLabel,
        setView(value) { currentDisplayMode = value; },
        setCollapsed(value) { isEmbeddedStationPlayerCollapsed = value; }
      };
    `,
    context
  );

  assert.equal(context.control.label(), "前往官方播放器");
  context.control.setView("settings");
  assert.equal(context.control.label(), "前往官方播放器");
  context.control.setView("single");
  assert.equal(context.control.label(), "官方播放器");
  context.control.setCollapsed(true);
  assert.equal(context.control.label(), "顯示官方播放器");
  assert.doesNotMatch(script, /回到官方播放器/);
});

test("Greenpeace UI swaps icons while regular Play and Pause remain unchanged", () => {
  const updateFunction = getFunctionSource("updatePlaybackUI");

  assert.match(updateFunction, /const controlLabel = getEmbeddedPlayerControlLabel\(\)/);
  assert.match(updateFunction, /playButton\.setAttribute\("aria-label", controlLabel\)/);
  assert.match(updateFunction, /playIcon\.hidden = true/);
  assert.match(
    updateFunction,
    /officialPlayerIcon\.toggleAttribute\("hidden", false\)/
  );
  assert.match(updateFunction, /playText\.textContent = controlLabel/);
  assert.match(updateFunction, /playIcon\.hidden = false/);
  assert.match(
    updateFunction,
    /officialPlayerIcon\.toggleAttribute\("hidden", true\)/
  );
  assert.match(updateFunction, /playIcon\.textContent = canCancelPlayback \? "Ⅱ" : "▶"/);
  assert.match(updateFunction, /canCancelPlayback[\s\S]*?"暫停播放"[\s\S]*?: "播放"/);
});

test("the Greenpeace bottom action only navigates, reveals and scrolls", () => {
  const activateFunction = getFunctionSource(
    "activateEmbeddedStationPlayerControl"
  );
  const scrollFunction = getFunctionSource(
    "scrollEmbeddedStationPlayerIntoView"
  );

  assert.match(activateFunction, /currentDisplayMode !== "single"/);
  assert.match(activateFunction, /new CustomEvent\("easy-radio:show-current-station"\)/);
  assert.match(
    activateFunction,
    /isEmbeddedStationPlayerCollapsed[\s\S]*?toggleEmbeddedStationPlayer\(\)/
  );
  assert.match(activateFunction, /scrollEmbeddedStationPlayerIntoView\(\)/);
  assert.match(
    scrollFunction,
    /embeddedStationPlayerElement\.scrollIntoView\(\{ block: "start" \}\)/
  );
  assert.doesNotMatch(
    `${activateFunction}\n${scrollFunction}`,
    /destroyEmbeddedStationPlayer|resetEmbeddedStationPlayer|createElement|\.src|contentWindow|\.play\(|\.pause\(/
  );
});

test("official-player navigation reuses the central Current Station view switch", () => {
  const requestHandler = getFunctionSource(
    "handleShowCurrentStationRequest",
    stationMenu
  );

  assert.match(requestHandler, /setDisplayMode\(DisplayMode\.SINGLE\)/);
  assert.match(
    stationMenu,
    /document\.addEventListener\(\s*"easy-radio:show-current-station",\s*handleShowCurrentStationRequest\s*\)/
  );
  assert.doesNotMatch(stationMenu, /closeSettingsForGreenpeaceOnly/);
});

test("upper show and hide keep the bottom label synchronized", () => {
  const visibilityFunction = getFunctionSource(
    "updateEmbeddedStationPlayerVisibility"
  );
  const toggleFunction = getFunctionSource("toggleEmbeddedStationPlayer");

  assert.match(visibilityFunction, /"顯示官方播放器"/);
  assert.match(visibilityFunction, /"收起官方播放器"/);
  assert.match(visibilityFunction, /updatePlaybackUI\(\)/);
  assert.match(toggleFunction, /isEmbeddedStationPlayerCollapsed =/);
  assert.match(toggleFunction, /updateEmbeddedStationPlayerVisibility\(\)/);
});

test("the display icon preserves the large responsive control", () => {
  assert.match(
    styles,
    /\.official-player-icon\s*\{[\s\S]*?width: 0\.95em;[\s\S]*?stroke: currentColor;[\s\S]*?stroke-width: 2;/
  );
  assert.match(
    styles,
    /\.play-button\.is-official-player-action\s*\{[\s\S]*?white-space: nowrap;/
  );
  assert.match(
    styles,
    /@media \(max-width: 480px\) and \(orientation: portrait\)[\s\S]*?\.play-button\.is-official-player-action\s*\{[\s\S]*?font-size: clamp\(22px, 6\.2vw, 26px\);/
  );
});
