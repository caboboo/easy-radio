(function exposeStationData(root) {
  "use strict";

  const stations = [
    Object.freeze({
      id: "bcc-i-radio",
      name: "中廣音樂網",
      brand: "i Radio",
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
    }),
    Object.freeze({
      id: "bcc-i-like-radio",
      name: "中廣流行網",
      brand: "i like radio",
      subtitle: "i like radio FM103.3",
      frequency: "FM103.3",
      streamUrl: "https://stream.rcs.revma.com/s1zttsg3qtzuv",
      keywords: Object.freeze([
        "中廣流行網",
        "中廣",
        "i like radio",
        "ilike",
        "i like",
        "FM103",
        "FM103.3",
        "103",
        "103.3"
      ])
    }),
    Object.freeze({
      id: "greenpeace973",
      name: "綠色和平廣播",
      brand: "",
      subtitle: "FM97.3",
      frequency: "FM97.3",
      streamUrl: "",
      iframeUrl: "https://greenpeace.bcom.tw/playVideo.php",
      keywords: Object.freeze([
        "綠色和平",
        "97.3",
        "FM97.3",
        "Greenpeace"
      ])
    })
  ];

  root.EASY_RADIO_STATIONS = Object.freeze(stations);

  if (typeof module === "object" && module.exports) {
    module.exports = stations;
  }
})(typeof globalThis === "object" ? globalThis : window);
