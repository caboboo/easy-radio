(function exposeStationData(root) {
  "use strict";

  const stations = [
    Object.freeze({
      id: "bcc-i-radio",
      name: "中廣音樂網",
      subtitle: "i Radio FM96.3",
      frequency: "FM96.3",
      streamUrl: "https://stream.rcs.revma.com/ndk05tyy2tzuv",
      keywords: Object.freeze([
        "中廣音樂網",
        "中廣",
        "i Radio",
        "iRadio",
        "FM96.3",
        "96.3"
      ])
    })
  ];

  root.EASY_RADIO_STATIONS = Object.freeze(stations);

  if (typeof module === "object" && module.exports) {
    module.exports = stations;
  }
})(typeof globalThis === "object" ? globalThis : window);
