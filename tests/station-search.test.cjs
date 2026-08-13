const assert = require("node:assert/strict");
const stations = require("../stations-data.js");
const {
  filterStations,
  shouldShowStationSearch
} = require("../station-search.js");

const testStations = [
  {
    id: "alpha-test",
    name: "Alpha 測試電台",
    subtitle: "Alpha Radio",
    frequency: "FM88.8",
    keywords: ["ALPHA", "88.8"]
  },
  {
    id: "missing-fields-test",
    name: "缺少選填欄位測試",
    keywords: []
  },
  {
    id: "symbols-test",
    name: "符號測試電台",
    subtitle: "C++ Radio",
    frequency: "FM99.9",
    keywords: ["[測試]"]
  }
];

const originalSnapshot = JSON.stringify(testStations);

assert.equal(shouldShowStationSearch(stations), false);
assert.equal(shouldShowStationSearch(Array(5).fill(null)), false);
assert.equal(shouldShowStationSearch(Array(6).fill(null)), true);
assert.equal(shouldShowStationSearch(Array(7).fill(null)), true);
assert.equal(shouldShowStationSearch(null), false);

assert.deepEqual(filterStations(testStations, ""), testStations);
assert.deepEqual(filterStations(testStations, "   "), testStations);
assert.deepEqual(filterStations(testStations, "Alpha 測試電台"), [
  testStations[0]
]);
assert.deepEqual(filterStations(testStations, "alpha radio"), [
  testStations[0]
]);
assert.deepEqual(filterStations(testStations, "FM88.8"), [testStations[0]]);
assert.deepEqual(filterStations(testStations, "  88.8  "), [testStations[0]]);
assert.deepEqual(filterStations(testStations, "沒有結果"), []);
assert.deepEqual(filterStations(testStations, "C++"), [testStations[2]]);
assert.deepEqual(filterStations(testStations, "["), [testStations[2]]);
assert.deepEqual(
  filterStations([testStations[1]], "缺少選填欄位"),
  [testStations[1]]
);
assert.deepEqual(filterStations(null, "測試"), []);
assert.equal(JSON.stringify(testStations), originalSnapshot);
assert.notEqual(filterStations(testStations, ""), testStations);

const ids = stations.map((station) => station.id);
const serializedStations = JSON.stringify(stations);
const musicStation = stations.find((station) => station.id === "bcc-i-radio");
const popStation = stations.find(
  (station) => station.id === "bcc-i-like-radio"
);
const greenpeaceStation = stations.find(
  (station) => station.id === "greenpeace973"
);

assert.equal(new Set(ids).size, ids.length);
assert.equal(stations.length, 3);
assert.equal(stations[0], musicStation);
assert.equal(stations[1], popStation);
assert.equal(stations[2], greenpeaceStation);
assert.equal(
  musicStation.streamUrl,
  "https://stream.rcs.revma.com/ndk05tyy2tzuv"
);
assert.equal(popStation.name, "中廣流行網");
assert.equal(popStation.brand, "i like radio");
assert.equal(popStation.subtitle, "i like radio FM103.3");
assert.equal(popStation.frequency, "FM103.3");
assert.equal(
  popStation.streamUrl,
  "https://stream.rcs.revma.com/s1zttsg3qtzuv"
);

stations
  .filter((station) => station.streamUrl)
  .forEach((station) => {
    assert.equal(new URL(station.streamUrl).protocol, "https:");
  });
assert.equal(greenpeaceStation.name, "綠色和平廣播");
assert.equal(greenpeaceStation.brand, "");
assert.equal(greenpeaceStation.subtitle, "FM97.3");
assert.equal(greenpeaceStation.frequency, "FM97.3");
assert.equal(greenpeaceStation.streamUrl, "");
assert.equal(
  greenpeaceStation.iframeUrl,
  "https://greenpeace.bcom.tw/playVideo.php"
);
assert.equal(new URL(greenpeaceStation.iframeUrl).protocol, "https:");
assert.equal(new URL(greenpeaceStation.iframeUrl).search, "");
assert.doesNotMatch(serializedStations, /aw9uqyxy2tzuv/);
assert.doesNotMatch(serializedStations, /rj-(?:tok|ttl)|listener-cookie/i);
assert.doesNotMatch(serializedStations, /http:\/\/bcc-app\.nmm\.com\.tw/i);

[
  "中廣音樂網",
  "i Radio",
  "iRadio",
  "FM96.3",
  "96.3"
].forEach((query) => {
  assert.deepEqual(filterStations(stations, query), [musicStation]);
});

[
  "中廣流行網",
  "流行網",
  "i like radio",
  "I LIKE RADIO",
  "ilike",
  "i like",
  "FM103",
  "FM103.3",
  "103",
  "103.3",
  "  I LIKE RADIO  "
].forEach((query) => {
  assert.deepEqual(filterStations(stations, query), [popStation]);
});

[
  "綠色和平",
  "97.3",
  "FM97.3",
  "Greenpeace"
].forEach((query) => {
  assert.deepEqual(filterStations(stations, query), [greenpeaceStation]);
});

assert.deepEqual(filterStations(stations, "中廣"), [musicStation, popStation]);
assert.deepEqual(filterStations(stations, ""), stations);
assert.deepEqual(filterStations(stations, "   "), stations);
assert.deepEqual(filterStations(stations, "["), []);

console.log("station search tests passed");
