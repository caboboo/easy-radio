const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

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

function getFunctionSource(functionName) {
  return stationMenu.match(
    new RegExp(`function ${functionName}\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}`)
  )?.[0] || "";
}

function createStationRendererHarness(currentStationId = stations[0].id) {
  class FakeElement {
    constructor(tagName) {
      this.tagName = tagName;
      this.children = [];
      this.className = "";
      this.dataset = {};
      this.attributes = {};
      this.textContent = "";
      this.type = "";
    }

    append(...children) {
      this.children.push(...children);
    }

    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
  }

  const functionNames = [
    "cleanText",
    "appendText",
    "getStationMetaText",
    "isFrequencySortMode",
    "getFrequencySortMetaText",
    "createStationOption"
  ];
  const source = `(() => {
    let stationSortMode = SortMode.DEFAULT;
    ${functionNames.map(getFunctionSource).join("\n")}
    return {
      create(station) { return createStationOption(station); },
      setMode(mode) { stationSortMode = mode; }
    };
  })()`;
  const context = {
    SortMode,
    document: {
      createElement(tagName) {
        return new FakeElement(tagName);
      }
    },
    player: {
      getCurrentStation() {
        return stations.find(station => station.id === currentStationId);
      }
    }
  };

  return vm.runInNewContext(source, context);
}

function getRenderedText(element) {
  return [
    element.textContent,
    ...element.children.flatMap(getRenderedText)
  ].filter(Boolean);
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

test("default sorting puts favorites first while preserving source order in both groups", () => {
  const sourceSnapshot = stations.slice();
  const favoriteIds = ["bcc-i-like-radio", "greenpeace973"];

  assert.deepEqual(
    sortStations(stations, SortMode.DEFAULT, favoriteIds).map(
      (station) => station.id
    ),
    ["bcc-i-like-radio", "greenpeace973", "bcc-i-radio"]
  );
  assert.deepEqual(stations, sourceSnapshot);
});

test("name and frequency modes ignore favorites", () => {
  [SortMode.NAME, SortMode.FREQUENCY_ASC, SortMode.FREQUENCY_DESC].forEach(
    (mode) => {
      assert.deepEqual(
        sortStations(stations, mode, ["greenpeace973"]),
        sortStations(stations, mode)
      );
    }
  );
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

test("only frequency sort modes use the frequency-first presentation", () => {
  const modeHelper = getFunctionSource("isFrequencySortMode");

  assert.match(modeHelper, /mode === SortMode\.FREQUENCY_ASC/);
  assert.match(modeHelper, /mode === SortMode\.FREQUENCY_DESC/);
  assert.doesNotMatch(modeHelper, /SortMode\.(?:DEFAULT|NAME)/);
  assert.match(
    stationMenu,
    /stationList\.dataset\.sortLayout = isFrequencySortMode\(stationSortMode\)[\s\S]*?"frequency"[\s\S]*?"standard"/
  );
  assert.match(
    stationMenu,
    /option\.className = usesFrequencyLayout[\s\S]*?"station-option is-frequency-sort"[\s\S]*?"station-option"/
  );
});

test("frequency-first cards read station data directly without duplicate frequency", () => {
  const frequencyMetaHelper = getFunctionSource("getFrequencySortMetaText");
  const renderer = getFunctionSource("createStationOption");

  assert.match(frequencyMetaHelper, /cleanText\(station\?\.brand\)/);
  assert.match(frequencyMetaHelper, /cleanText\(station\?\.frequency\)/);
  assert.match(
    frequencyMetaHelper,
    /return brand \|\| \(subtitle !== frequency \? subtitle : ""\)/
  );
  assert.match(renderer, /"station-option-frequency",\s*station\.frequency/);
  assert.match(renderer, /getFrequencySortMetaText\(station\)/);
  assert.match(renderer, /getStationMetaText\(station\)/);
  assert.doesNotMatch(renderer, /match\(|replace\(|split\(|\d\+|parseFloat/);

  const frequencyDisplays = stations.map((station) => ({
    frequency: station.frequency,
    meta: station.brand ||
      (station.subtitle !== station.frequency ? station.subtitle : "")
  }));

  assert.deepEqual(frequencyDisplays, [
    { frequency: "FM96.3", meta: "i Radio" },
    { frequency: "FM103.3", meta: "i like radio" },
    { frequency: "FM97.3", meta: "" }
  ]);
});

test("rendered cards switch layouts immediately and preserve the current badge", () => {
  const renderer = createStationRendererHarness();
  const musicStation = stations.find(station => station.id === "bcc-i-radio");
  const greenpeace = stations.find(station => station.id === "greenpeace973");

  const defaultCard = renderer.create(musicStation);
  assert.equal(defaultCard.className, "station-option");
  assert.deepEqual(getRenderedText(defaultCard), [
    "中廣音樂網",
    "\u2713 目前電台",
    "i Radio · FM96.3"
  ]);
  assert.equal(defaultCard.attributes["aria-pressed"], "true");

  renderer.setMode(SortMode.FREQUENCY_ASC);
  const frequencyCard = renderer.create(musicStation);
  assert.equal(frequencyCard.className, "station-option is-frequency-sort");
  assert.deepEqual(getRenderedText(frequencyCard), [
    "FM96.3",
    "中廣音樂網",
    "\u2713 目前電台",
    "i Radio"
  ]);
  assert.equal(
    getRenderedText(frequencyCard).filter(text => text.includes("FM96.3")).length,
    1
  );

  const greenpeaceCard = renderer.create(greenpeace);
  assert.deepEqual(getRenderedText(greenpeaceCard), [
    "FM97.3",
    "綠色和平廣播"
  ]);

  renderer.setMode(SortMode.NAME);
  assert.equal(renderer.create(musicStation).className, "station-option");
});

test("frequency-first CSS keeps a stable scan column without changing the card target", () => {
  const frequencyCardRule = styles.match(
    /\.station-option\.is-frequency-sort\s*\{[\s\S]*?\}/
  )?.[0] || "";
  const frequencyTextRule = styles.match(
    /\.station-option-frequency\s*\{[\s\S]*?\}/
  )?.[0] || "";

  assert.match(
    frequencyCardRule,
    /grid-template-columns:\s*86px minmax\(0, 1fr\)/
  );
  assert.match(frequencyTextRule, /font-variant-numeric:\s*tabular-nums/);
  assert.match(frequencyTextRule, /white-space:\s*nowrap/);
  assert.match(stationMenu, /event\.target\.closest\("\.station-option"\)/);
  assert.equal((stationMenu.match(/document\.createElement\("button"\)/g) || []).length, 2);
});

test("frequency-first columns remain bounded at phone and landscape widths", () => {
  const detailsRule = styles.match(
    /\.station-option-details\s*\{[\s\S]*?\}/
  )?.[0] || "";
  const portraitRules = styles.match(
    /@media \(max-width: 480px\) and \(orientation: portrait\)\s*\{[\s\S]*?\n\}/
  )?.[0] || "";
  const landscapeRules = styles.match(
    /@media \(max-width: 900px\) and \(max-height: 500px\) and \(orientation: landscape\)\s*\{[\s\S]*?\n\}/
  )?.[0] || "";

  assert.match(detailsRule, /min-width:\s*0/);
  assert.match(
    portraitRules,
    /grid-template-columns:\s*78px minmax\(0, 1fr\)/
  );
  assert.match(
    landscapeRules,
    /grid-template-columns:\s*76px minmax\(0, 1fr\)/
  );
  assert.match(styles, /\.station-option-name\s*\{[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(
    landscapeRules,
    /\.station-list\s*\{[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/
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

test("stored frequency mode is loaded before the initial list render", () => {
  assert.ok(
    stationMenu.indexOf("stationSortMode = stationSort.loadSortMode(sortStorage)") <
      stationMenu.indexOf("setDisplayMode(DisplayMode.LIST)")
  );
  assert.match(
    stationMenu,
    /applyStationSortMode\(nextMode\)[\s\S]*?saveSortMode\(sortStorage, nextMode\)[\s\S]*?renderStations\(\)/
  );
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

  assert.match(
    renderFunction,
    /sortStations\([\s\S]*?filteredStations,[\s\S]*?stationSortMode,[\s\S]*?stationFavorites\.getFavoriteIds\(\)/
  );
  assert.match(renderFunction, /sortedStations\.forEach/);
  assert.match(stationMenu, /option\.dataset\.stationId = station\.id/);
  assert.match(stationSelection, /player\.selectStation\(stationId\)/);
  assert.doesNotMatch(sortSelection, /player\.|audio|iframe|EmbeddedStationPlayer/);
});
