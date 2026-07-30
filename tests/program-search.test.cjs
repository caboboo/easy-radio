const assert = require("node:assert/strict");
const programs = require("../programs-data.js");
const { filterPrograms } = require("../program-search.js");

const testPrograms = [
  {
    id: "morning-test",
    title: "晨間測試節目",
    stationName: "測試電台",
    hosts: ["林小明"],
    scheduleText: "週一 09:00",
    description: "只供自動測試使用的節目資料",
    keywords: ["生活", "Morning"]
  },
  {
    id: "music-test",
    title: "音樂測試節目",
    stationName: "另一個測試電台",
    hosts: ["陳小華"],
    scheduleText: "週二 10:00",
    description: "包含 C++ 特殊符號",
    keywords: ["Music", "訪談"]
  },
  {
    id: "missing-fields-test",
    title: "缺少欄位測試",
    stationName: "測試電台"
  }
];

const originalSnapshot = JSON.stringify(testPrograms);

assert.deepEqual(filterPrograms(testPrograms, ""), testPrograms);
assert.deepEqual(filterPrograms(testPrograms, "   "), testPrograms);
assert.deepEqual(filterPrograms(testPrograms, "晨間"), [testPrograms[0]]);
assert.deepEqual(filterPrograms(testPrograms, "另一個測試電台"), [
  testPrograms[1]
]);
assert.deepEqual(filterPrograms(testPrograms, "林小明"), [testPrograms[0]]);
assert.deepEqual(filterPrograms(testPrograms, "訪談"), [testPrograms[1]]);
assert.deepEqual(filterPrograms(testPrograms, "自動測試"), [testPrograms[0]]);
assert.deepEqual(filterPrograms(testPrograms, "morning"), [testPrograms[0]]);
assert.deepEqual(filterPrograms(testPrograms, "  MUSIC  "), [testPrograms[1]]);
assert.deepEqual(filterPrograms(testPrograms, "沒有結果"), []);
assert.deepEqual(filterPrograms(testPrograms, "C++"), [testPrograms[1]]);
assert.deepEqual(filterPrograms(testPrograms, "["), []);
assert.deepEqual(filterPrograms([testPrograms[2]], "測試電台"), [
  testPrograms[2]
]);
assert.deepEqual(filterPrograms(null, "測試"), []);
assert.equal(JSON.stringify(testPrograms), originalSnapshot);
assert.notEqual(filterPrograms(testPrograms, ""), testPrograms);

const ids = programs.map((program) => program.id);
assert.equal(new Set(ids).size, ids.length);
assert.equal(programs.length, 0);

console.log("program search tests passed");
