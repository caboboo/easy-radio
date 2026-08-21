const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const styles = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");
const stationMenu = fs.readFileSync(
  path.join(projectRoot, "station-menu.js"),
  "utf8"
);
const favoritesSource = fs.readFileSync(
  path.join(projectRoot, "station-favorites.js"),
  "utf8"
);
const stations = require("../stations-data.js");
const {
  STORAGE_KEY,
  createFavoriteStore
} = require("../station-favorites.js");

function createMemoryStorage(initialValue) {
  const values = new Map();

  if (initialValue !== undefined) {
    values.set(STORAGE_KEY, initialValue);
  }

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

function getFunctionSource(name) {
  const match = stationMenu.match(
    new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}`)
  );

  assert.ok(match, `Missing function ${name}`);
  return match[0];
}

test("favorites use a dedicated localStorage key and stable station IDs", () => {
  assert.equal(STORAGE_KEY, "easyRadio.stationFavorites");
  assert.match(favoritesSource, /stationIds/);
  assert.match(favoritesSource, /station\?\.id/);
  assert.doesNotMatch(favoritesSource, /cardIndex|sortIndex|textContent/);
});

test("favorite toggle persists and a new store restores the state", () => {
  const stationIds = stations.map((station) => station.id);
  const storage = createMemoryStorage();
  const changes = [];
  const store = createFavoriteStore({
    storage,
    stationIds,
    onChange(change) {
      changes.push(change);
    }
  });

  assert.deepEqual(store.getFavoriteIds(), []);
  assert.equal(store.isFavorite("bcc-i-radio"), false);
  assert.equal(store.toggle("bcc-i-radio"), true);
  assert.equal(store.isFavorite("bcc-i-radio"), true);
  assert.equal(
    storage.getItem(STORAGE_KEY),
    JSON.stringify(["bcc-i-radio"])
  );

  const restoredStore = createFavoriteStore({ storage, stationIds });
  assert.equal(restoredStore.isFavorite("bcc-i-radio"), true);
  assert.deepEqual(changes, [
    { stationId: "bcc-i-radio", isFavorite: true }
  ]);

  assert.equal(store.toggle("bcc-i-radio"), false);
  assert.deepEqual(store.getFavoriteIds(), []);
});

test("invalid persisted data and unknown station IDs fail safely", () => {
  const stationIds = stations.map((station) => station.id);
  const malformedStore = createFavoriteStore({
    storage: createMemoryStorage("not json"),
    stationIds
  });
  const mixedStore = createFavoriteStore({
    storage: createMemoryStorage(
      JSON.stringify(["greenpeace973", "unknown", "greenpeace973"])
    ),
    stationIds
  });

  assert.deepEqual(malformedStore.getFavoriteIds(), []);
  assert.deepEqual(mixedStore.getFavoriteIds(), ["greenpeace973"]);
  assert.equal(mixedStore.toggle("unknown"), false);
  assert.deepEqual(mixedStore.getFavoriteIds(), ["greenpeace973"]);
});

test("All Stations and Current Station use the same favorite store", () => {
  assert.match(html, /id="currentStationFavoriteButton"/);
  assert.match(html, /aria-pressed="false"[\s\S]*?>☆<\/button>/);
  assert.ok(
    html.indexOf('src="station-favorites.js"') <
      html.indexOf('src="station-menu.js"')
  );
  assert.match(stationMenu, /const stationFavorites = window\.EasyRadioStationFavorites/);
  assert.match(
    stationMenu,
    /updateFavoriteButton\(currentStationFavoriteButton, currentStation\)/
  );
  assert.match(
    stationMenu,
    /document\.addEventListener\([\s\S]*?"easy-radio:favorites-change",[\s\S]*?syncStationFavoriteViews/
  );
});

test("favorite buttons remain separate semantic controls with accessible state", () => {
  const listItemRenderer = getFunctionSource("createStationListItem");
  const favoriteRenderer = getFunctionSource("createStationFavoriteButton");
  const favoriteRule = styles.match(
    /\.station-favorite-button\s*\{[\s\S]*?\}/
  )?.[0] || "";

  assert.match(listItemRenderer, /createStationOption\(station\)/);
  assert.match(listItemRenderer, /createStationFavoriteButton\(station\)/);
  assert.doesNotMatch(listItemRenderer, /option\.append/);
  assert.match(favoriteRenderer, /document\.createElement\("button"\)/);
  assert.match(favoriteRenderer, /button\.type = "button"/);
  assert.match(stationMenu, /button\.setAttribute\("aria-pressed"/);
  assert.match(stationMenu, /button\.setAttribute\([\s\S]*?"aria-label"/);
  assert.match(favoriteRule, /width:\s*48px/);
  assert.match(favoriteRule, /min-height:\s*48px/);
  assert.match(favoriteRule, /font-size:\s*29px/);
  assert.match(
    styles,
    /\.station-option-shell \.station-option\s*\{[\s\S]*?padding-right:\s*68px/
  );
  assert.match(
    styles,
    /@media \(max-width: 480px\)[\s\S]*?\.station-option\.is-frequency-sort \.station-option-heading\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/
  );
});

test("favorite card clicks are isolated from station selection", () => {
  const handlerSource = getFunctionSource("handleStationListClick");
  const selected = [];
  const toggled = [];
  let renderCount = 0;
  const context = {
    stationList: { contains: () => true },
    stationFavorites: { toggle: (stationId) => toggled.push(stationId) },
    player: { selectStation: (stationId) => selected.push(stationId) },
    renderStations: () => {
      renderCount += 1;
    }
  };
  const handler = vm.runInNewContext(`(${handlerSource})`, context);
  const favoriteButton = { dataset: { stationId: "greenpeace973" } };
  let propagationStopped = false;

  handler({
    target: {
      closest(selector) {
        return selector === ".station-option-favorite" ? favoriteButton : null;
      }
    },
    stopPropagation() {
      propagationStopped = true;
    }
  });

  assert.deepEqual(toggled, ["greenpeace973"]);
  assert.deepEqual(selected, []);
  assert.equal(renderCount, 0);
  assert.equal(propagationStopped, true);

  const stationOption = { dataset: { stationId: "bcc-i-radio" } };
  handler({
    target: {
      closest(selector) {
        return selector === ".station-option" ? stationOption : null;
      }
    },
    stopPropagation() {}
  });

  assert.deepEqual(selected, ["bcc-i-radio"]);
  assert.equal(renderCount, 1);
});

test("favorite handlers do not touch audio, iframe lifecycle, or gestures", () => {
  const listHandler = getFunctionSource("handleStationListClick");
  const currentHandler = getFunctionSource("handleCurrentStationFavoriteClick");
  const favoriteCode = `${favoritesSource}\n${listHandler}\n${currentHandler}`;

  assert.doesNotMatch(
    favoriteCode,
    /destroyEmbedded|resetEmbedded|createElement\("iframe"\)|\.src\s*=|setPointerCapture|lostpointercapture|play\(|pause\(/
  );
});
