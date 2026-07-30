(function exposeProgramData(root) {
  "use strict";

  // 只加入已確認的節目資料；正式頁面目前沒有可確認的節目。
  const programs = [];

  root.EASY_RADIO_PROGRAMS = Object.freeze(programs);

  if (typeof module === "object" && module.exports) {
    module.exports = programs;
  }
})(typeof globalThis === "object" ? globalThis : window);
