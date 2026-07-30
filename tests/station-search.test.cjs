const assert = require("node:assert/strict");
const stations = require("../stations-data.js");
const { filterStations } = require("../station-search.js");

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

assert.equal(new Set(ids).size, ids.length);
assert.equal(stations.length, 2);
assert.equal(stations[0], musicStation);
assert.equal(stations[1], popStation);
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

stations.forEach((station) => {
  assert.equal(new URL(station.streamUrl).protocol, "https:");
});
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

assert.deepEqual(filterStations(stations, "中廣"), stations);
assert.deepEqual(filterStations(stations, ""), stations);
assert.deepEqual(filterStations(stations, "   "), stations);
assert.deepEqual(filterStations(stations, "["), []);

console.log("station search tests passed");
