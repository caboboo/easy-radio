(function exposeStationFavorites(root, createStationFavorites) {
  "use strict";

  const stationFavorites = createStationFavorites();

  if (typeof module === "object" && module.exports) {
    module.exports = stationFavorites;
  }

  const stationIds = Array.isArray(root.EASY_RADIO_STATIONS)
    ? root.EASY_RADIO_STATIONS.map((station) => station?.id)
    : [];
  let storage = null;

  try {
    storage = root.localStorage;
  } catch (error) {
    storage = null;
  }

  const store = stationFavorites.createFavoriteStore({
    storage,
    stationIds,
    onChange(detail) {
      if (typeof root.document?.dispatchEvent !== "function") {
        return;
      }

      root.document.dispatchEvent(
        new CustomEvent("easy-radio:favorites-change", { detail })
      );
    }
  });

  root.EasyRadioStationFavorites = Object.freeze({
    STORAGE_KEY: stationFavorites.STORAGE_KEY,
    ...store
  });
})(
  typeof globalThis === "object" ? globalThis : window,
  function createStationFavorites() {
    "use strict";

    const STORAGE_KEY = "easyRadio.stationFavorites";

    function normalizeStationId(value) {
      if (value === null || value === undefined) {
        return "";
      }

      return String(value).trim();
    }

    function createFavoriteStore({ storage, stationIds, onChange } = {}) {
      const validStationIds = Array.from(
        new Set(
          (Array.isArray(stationIds) ? stationIds : [])
            .map(normalizeStationId)
            .filter(Boolean)
        )
      );
      const validStationIdSet = new Set(validStationIds);
      let favoriteIds = new Set();

      try {
        const storedValue = storage?.getItem(STORAGE_KEY);
        const storedIds = storedValue ? JSON.parse(storedValue) : [];

        if (Array.isArray(storedIds)) {
          favoriteIds = new Set(
            storedIds
              .map(normalizeStationId)
              .filter((stationId) => validStationIdSet.has(stationId))
          );
        }
      } catch (error) {
        favoriteIds = new Set();
      }

      function getFavoriteIds() {
        return validStationIds.filter((stationId) => favoriteIds.has(stationId));
      }

      function isFavorite(stationId) {
        return favoriteIds.has(normalizeStationId(stationId));
      }

      function save() {
        try {
          storage?.setItem(STORAGE_KEY, JSON.stringify(getFavoriteIds()));
        } catch (error) {
          return;
        }
      }

      function toggle(stationId) {
        const normalizedId = normalizeStationId(stationId);

        if (!validStationIdSet.has(normalizedId)) {
          return false;
        }

        const nextIsFavorite = !favoriteIds.has(normalizedId);

        if (nextIsFavorite) {
          favoriteIds.add(normalizedId);
        } else {
          favoriteIds.delete(normalizedId);
        }

        save();

        if (typeof onChange === "function") {
          onChange({
            stationId: normalizedId,
            isFavorite: nextIsFavorite
          });
        }

        return nextIsFavorite;
      }

      return Object.freeze({
        getFavoriteIds,
        isFavorite,
        toggle
      });
    }

    return Object.freeze({
      STORAGE_KEY,
      normalizeStationId,
      createFavoriteStore
    });
  }
);
