(function exposeStationSort(root, createStationSort) {
  "use strict";

  const stationSort = createStationSort();
  root.EasyRadioStationSort = stationSort;

  if (typeof module === "object" && module.exports) {
    module.exports = stationSort;
  }
})(
  typeof globalThis === "object" ? globalThis : window,
  function createStationSort() {
    "use strict";

    const SortMode = Object.freeze({
      DEFAULT: "default",
      NAME: "name",
      FREQUENCY_ASC: "frequency-asc",
      FREQUENCY_DESC: "frequency-desc"
    });
    const STORAGE_KEY = "easyRadio.stationSort";
    const sortModes = new Set(Object.values(SortMode));
    const nameCollator = new Intl.Collator("zh-Hant", {
      numeric: true,
      sensitivity: "base"
    });

    function normalizeSortMode(value) {
      return sortModes.has(value) ? value : SortMode.DEFAULT;
    }

    function getFrequencyValue(station) {
      const match = String(station?.frequency || "").match(/\d+(?:\.\d+)?/);
      return match ? Number.parseFloat(match[0]) : Number.NaN;
    }

    function sortStations(stations, mode) {
      const source = Array.isArray(stations) ? stations : [];
      const normalizedMode = normalizeSortMode(mode);
      const indexedStations = source.map((station, sourceIndex) => ({
        station,
        sourceIndex
      }));

      if (normalizedMode === SortMode.DEFAULT) {
        return indexedStations.map(({ station }) => station);
      }

      indexedStations.sort((left, right) => {
        let comparison = 0;

        if (normalizedMode === SortMode.NAME) {
          comparison = nameCollator.compare(
            String(left.station?.name || ""),
            String(right.station?.name || "")
          );
        } else {
          const leftFrequency = getFrequencyValue(left.station);
          const rightFrequency = getFrequencyValue(right.station);
          const leftHasFrequency = Number.isFinite(leftFrequency);
          const rightHasFrequency = Number.isFinite(rightFrequency);

          if (leftHasFrequency && rightHasFrequency) {
            comparison = leftFrequency - rightFrequency;
            if (normalizedMode === SortMode.FREQUENCY_DESC) {
              comparison *= -1;
            }
          } else if (leftHasFrequency !== rightHasFrequency) {
            comparison = leftHasFrequency ? -1 : 1;
          }
        }

        return comparison || left.sourceIndex - right.sourceIndex;
      });

      return indexedStations.map(({ station }) => station);
    }

    function loadSortMode(storage) {
      try {
        return normalizeSortMode(storage?.getItem(STORAGE_KEY));
      } catch (error) {
        return SortMode.DEFAULT;
      }
    }

    function saveSortMode(storage, mode) {
      const normalizedMode = normalizeSortMode(mode);

      try {
        storage?.setItem(STORAGE_KEY, normalizedMode);
      } catch (error) {
        return normalizedMode;
      }

      return normalizedMode;
    }

    return Object.freeze({
      SortMode,
      STORAGE_KEY,
      normalizeSortMode,
      getFrequencyValue,
      sortStations,
      loadSortMode,
      saveSortMode
    });
  }
);
