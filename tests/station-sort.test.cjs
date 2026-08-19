const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const stations = require("../stations-data.js");
const {
  SortMode,
  STORAGE_KEY,
  getFrequencyValue,
  loadSortMode,
  normalizeSortMode,
  saveSortMode,
  sortStations
} = require("../station-sort.js");
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const styles = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");
const stationMenu = fs.readFileSync(
  path.join(projectRoot, "station-menu.js"),
  "utf8"
);

function createStorage(initialValue = null) {
  const values = new Map();
  if (initialValue !== null) {
    values.set(STORAGE_KEY, initialValue);
  }

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

test("station sort modes and storage key stay small and explicit", () => {
  assert.deepEqual({ ...SortMode }, {
    DEFAULT: "default",
    NAME: "name",
    FREQUENCY_ASC: "frequency-asc",
    FREQUENCY_DESC: "frequency-desc"
  });
  assert.equal(STORAGE_KEY, "easyRadio.stationSort");
});

test("default sorting restores source order without mutating the source", () => {
  const sourceSnapshot = stations.slice();
  const result = sortStations(stations, SortMode.DEFAULT);

  assert.notEqual(result, stations);
  assert.deepEqual(result, stations);
  assert.deepEqual(stations, sourceSnapshot);
});

test("name sorting uses display names and remains stable for equal names", () => {
  const equalNames = [
    { id: "first", name: "同名電台" },
    { id: "second", name: "同名電台" }
  ];
  const expectedNames = stations
    .map((station) => station.name)
    .slice()
    .sort((left, right) =>
      new Intl.Collator("zh-Hant", {
        numeric: true,
        sensitivity: "base"
      }).compare(left, right)
    );

  assert.deepEqual(
    sortStations(stations, SortMode.NAME).map((station) => station.name),
    expectedNames
  );
  assert.deepEqual(
    sortStations(equalNames, SortMode.NAME).map((station) => station.id),
    ["first", "second"]
  );
});

test("frequency sorting compares numeric FM values in both directions", () => {
  assert.equal(getFrequencyValue({ frequency: "FM103.3" }), 103.3);
  assert.deepEqual(
    sortStations(stations, SortMode.FREQUENCY_ASC).map(
      (station) => station.frequency
    ),
    ["FM96.3", "FM97.3", "FM103.3"]
  );
  assert.deepEqual(
    sortStations(stations, SortMode.FREQUENCY_DESC).map(
      (station) => station.frequency
    ),
    ["FM103.3", "FM97.3", "FM96.3"]
  );
});

test("missing or invalid storage safely falls back to default", () => {
  assert.equal(loadSortMode(createStorage()), SortMode.DEFAULT);
  assert.equal(loadSortMode(createStorage("")), SortMode.DEFAULT);
  assert.equal(loadSortMode(createStorage("broken-value")), SortMode.DEFAULT);
  assert.equal(normalizeSortMode("broken-value"), SortMode.DEFAULT);
  assert.equal(
    loadSortMode({
      getItem() {
        throw new Error("storage unavailable");
      }
    }),
    SortMode.DEFAULT
  );
});

test("valid sorting preferences save and load without storing station data", () => {
  const storage = createStorage();

  assert.equal(
    saveSortMode(storage, SortMode.FREQUENCY_DESC),
    SortMode.FREQUENCY_DESC
  );
  assert.equal(loadSortMode(storage), SortMode.FREQUENCY_DESC);
  assert.equal(
    saveSortMode(storage, "broken-value"),
    SortMode.DEFAULT
  );
  assert.equal(loadSortMode(storage), SortMode.DEFAULT);
});

test("All Stations owns one accessible sorting control with four options", () => {
  const listView = html.match(
    /<section(?=[^>]*id="stationListView")[\s\S]*?<\/section>/
  )?.[0] || "";
  const playerView = html.match(
    /<section id="playerView"[\s\S]*?<\/section>/
  )?.[0] || "";
  const settingsView = html.match(
    /<section[\s\S]*?id="settingsView"[\s\S]*?<\/section>/
  )?.[0] || "";

  assert.match(listView, /id="stationSortButton"/);
  assert.match(listView, /aria-label="電台排序"/);
  assert.match(listView, /title="電台排序"/);
  assert.match(listView, /aria-haspopup="menu"/);
  assert.equal((listView.match(/role="menuitemradio"/g) || []).length, 4);
  assert.doesNotMatch(playerView, /stationSort/);
  assert.doesNotMatch(settingsView, /stationSort/);
  assert.equal((html.match(/id="stationSortButton"/g) || []).length, 1);
});

test("sorting control and menu stay viewport-fixed and safely layered", () => {
  const controlRule = styles.match(
    /\.station-sort-control\s*\{[\s\S]*?\}/
  )?.[0] || "";
  const menuRule = styles.match(
    /\.station-sort-menu\s*\{[\s\S]*?\}/
  )?.[0] || "";

  assert.match(controlRule, /position:\s*fixed/);
  assert.match(
    controlRule,
    /top:\s*calc\(14px \+ env\(safe-area-inset-top\)\)/
  );
  assert.match(
    controlRule,
    /right:\s*calc\(14px \+ env\(safe-area-inset-right\)\)/
  );
  assert.match(controlRule, /z-index:\s*15/);
  assert.match(menuRule, /position:\s*absolute/);
  assert.match(menuRule, /top:\s*calc\(100% \+ 8px\)/);
  assert.match(menuRule, /right:\s*0/);
  assert.doesNotMatch(controlRule, /position:\s*(?:absolute|sticky)/);
});

test("menu state, outside click, selection, and view changes close safely", () => {
  assert.match(stationMenu, /sortButton\.setAttribute\("aria-expanded", "true"\)/);
  assert.match(stationMenu, /sortButton\.setAttribute\("aria-expanded", "false"\)/);
  assert.match(
    stationMenu,
    /!sortMenu\.hidden && !sortControl\.contains\(event\.target\)/
  );
  assert.match(stationMenu, /sortControl\.hidden = !showList/);
  assert.match(stationMenu, /if \(!showList\) \{[\s\S]*?closeStationSortMenu\(\)/);
  assert.match(
    stationMenu,
    /stationSort\.saveSortMode\(sortStorage, nextMode\)[\s\S]*?renderStations\(\)[\s\S]*?closeStationSortMenu/
  );
  assert.match(
    stationMenu,
    /if \(!sortMenu\.hidden\) \{[\s\S]*?closeStationSortMenu\(\{ focusButton: true \}\)/
  );
});

test("sorting preserves station IDs and never touches player or iframe state", () => {
  const renderFunction = stationMenu.match(
    /function renderStations\(\) \{[\s\S]*?\n  \}/
  )?.[0] || "";
  const sortSelection = stationMenu.match(
    /function applyStationSortMode\(nextMode\) \{[\s\S]*?\n  \}/
  )?.[0] || "";
  const stationSelection = stationMenu.match(
    /function handleStationListClick\(event\) \{[\s\S]*?\n  \}/
  )?.[0] || "";

  assert.match(renderFunction, /sortStations\(filteredStations, stationSortMode\)/);
  assert.match(renderFunction, /sortedStations\.forEach/);
  assert.match(stationMenu, /option\.dataset\.stationId = station\.id/);
  assert.match(stationSelection, /player\.selectStation\(stationId\)/);
  assert.doesNotMatch(sortSelection, /player\.|audio|iframe|EmbeddedStationPlayer/);
});
