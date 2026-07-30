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
assert.equal(new Set(ids).size, ids.length);
assert.equal(stations.length, 1);
assert.equal(stations[0].id, "bcc-i-radio");
assert.equal(stations[0].streamUrl, "https://stream.rcs.revma.com/ndk05tyy2tzuv");

[
  "中廣音樂網",
  "中廣",
  "i Radio",
  "iRadio",
  "FM96.3",
  "96.3"
].forEach((query) => {
  assert.deepEqual(filterStations(stations, query), [stations[0]]);
});

console.log("station search tests passed");
