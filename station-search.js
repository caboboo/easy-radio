(function exposeStationSearch(root, createSearch) {
  "use strict";

  const search = createSearch();
  root.EasyRadioStationSearch = search;

  if (typeof module === "object" && module.exports) {
    module.exports = search;
  }
})(
  typeof globalThis === "object" ? globalThis : window,
  function createStationSearch() {
    "use strict";

    function normalizeText(value) {
      if (value === null || value === undefined) {
        return "";
      }

      return String(value).trim().toLocaleLowerCase();
    }

    function normalizeList(value) {
      if (Array.isArray(value)) {
        return value;
      }

      return value === null || value === undefined || value === ""
        ? []
        : [value];
    }

    function getSearchText(station) {
      if (!station || typeof station !== "object") {
        return "";
      }

      return [
        station.name,
        station.subtitle,
        station.frequency,
        ...normalizeList(station.keywords)
      ]
        .map(normalizeText)
        .join(" ");
    }

    function filterStations(stations, query) {
      const source = Array.isArray(stations) ? stations : [];
      const normalizedQuery = normalizeText(query);

      if (!normalizedQuery) {
        return source.slice();
      }

      return source.filter((station) =>
        getSearchText(station).includes(normalizedQuery)
      );
    }

    function shouldShowStationSearch(stations, minimumStationCount = 6) {
      const source = Array.isArray(stations) ? stations : [];
      const threshold = Number.isInteger(minimumStationCount)
        ? minimumStationCount
        : 6;

      return source.length >= threshold;
    }

    return Object.freeze({ filterStations, shouldShowStationSearch });
  }
);
