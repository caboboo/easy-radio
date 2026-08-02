(function initializeStationViews() {
  "use strict";

  const DisplayMode = Object.freeze({
    SINGLE: "single",
    LIST: "list",
    SETTINGS: "settings"
  });

  const toggleButton = document.getElementById("viewToggleButton");
  const toggleIcon = document.getElementById("viewToggleIcon");
  const toggleText = document.getElementById("viewToggleText");
  const settingsButton = document.getElementById("settingsButton");
  const settingsBackButton = document.getElementById("settingsBackButton");
  const mainContent = document.querySelector(".main-content");
  const playerView = document.getElementById("playerView");
  const listView = document.getElementById("stationListView");
  const settingsView = document.getElementById("settingsView");
  const settingsTitle = document.getElementById("settingsTitle");
  const listTitle = document.getElementById("stationListTitle");
  const searchSection = document.getElementById("stationSearchSection");
  const searchInput = document.getElementById("stationSearch");
  const clearButton = document.getElementById("stationSearchClear");
  const searchStatus = document.getElementById("stationSearchStatus");
  const stationList = document.getElementById("stationList");
  const sourceStations = Array.isArray(window.EASY_RADIO_STATIONS)
    ? window.EASY_RADIO_STATIONS
    : [];
  const filterStations = window.EasyRadioStationSearch?.filterStations;
  const shouldShowStationSearch =
    window.EasyRadioStationSearch?.shouldShowStationSearch;
  const player = window.EasyRadioPlayer;
  let displayMode = DisplayMode.LIST;
  let previousDisplayMode = DisplayMode.SINGLE;

  if (
    !toggleButton ||
    !toggleIcon ||
    !toggleText ||
    !settingsButton ||
    !settingsBackButton ||
    !mainContent ||
    !playerView ||
    !listView ||
    !settingsView ||
    !settingsTitle ||
    !listTitle ||
    !searchSection ||
    !searchInput ||
    !clearButton ||
    !searchStatus ||
    !stationList ||
    typeof filterStations !== "function" ||
    typeof shouldShowStationSearch !== "function" ||
    typeof player?.getCurrentStation !== "function" ||
    typeof player?.selectStation !== "function"
  ) {
    console.warn("[Easy Radio] 電台顯示模式無法初始化");
    return;
  }

  function cleanText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function getRenderableStations(stations) {
    const seenIds = new Set();

    return stations.filter((station) => {
      const id = cleanText(station?.id);
      const name = cleanText(station?.name);
      const streamUrl = cleanText(station?.streamUrl);

      if (!id || !name || !streamUrl || seenIds.has(id)) {
        return false;
      }

      seenIds.add(id);
      return true;
    });
  }

  const stations = getRenderableStations(sourceStations);
  const isSearchAvailable = shouldShowStationSearch(stations);

  searchSection.hidden = !isSearchAvailable;
  searchStatus.hidden = !isSearchAvailable;

  function appendText(parent, tagName, className, text) {
    const cleanValue = cleanText(text);

    if (!cleanValue) {
      return;
    }

    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = cleanValue;
    parent.append(element);
  }

  function getStationMetaText(station) {
    const brand = cleanText(station?.brand);
    const frequency = cleanText(station?.frequency);
    const subtitle = cleanText(station?.subtitle);

    if (brand && frequency) {
      return `${brand} · ${frequency}`;
    }

    return subtitle || brand || frequency;
  }

  function createStationOption(station) {
    const currentStation = player.getCurrentStation();
    const isCurrent = currentStation?.id === station.id;
    const option = document.createElement("button");
    const heading = document.createElement("span");

    option.className = "station-option";
    option.type = "button";
    option.dataset.stationId = station.id;
    option.setAttribute("aria-pressed", String(isCurrent));

    heading.className = "station-option-heading";
    appendText(heading, "strong", "station-option-name", station.name);

    if (isCurrent) {
      appendText(
        heading,
        "span",
        "current-station-label",
        "✓ 目前電台"
      );
    }

    option.append(heading);
    appendText(
      option,
      "span",
      "station-option-subtitle",
      getStationMetaText(station)
    );

    return option;
  }

  function renderStations() {
    const rawQuery = isSearchAvailable ? searchInput.value : "";
    const query = rawQuery.trim();
    const filteredStations = filterStations(stations, query);

    if (!isSearchAvailable) {
      searchInput.value = "";
    }

    clearButton.hidden = !isSearchAvailable || rawQuery.length === 0;
    searchStatus.textContent = isSearchAvailable
      ? query
        ? `搜尋結果 ${filteredStations.length} 個電台`
        : `共 ${stations.length} 個電台`
      : "";
    stationList.replaceChildren();

    if (stations.length === 0) {
      appendText(
        stationList,
        "p",
        "station-empty-state",
        "目前尚未收錄電台"
      );
      return;
    }

    if (filteredStations.length === 0) {
      appendText(
        stationList,
        "p",
        "station-empty-state",
        "找不到符合的電台"
      );
      return;
    }

    const fragment = document.createDocumentFragment();
    filteredStations.forEach((station) => {
      fragment.append(createStationOption(station));
    });
    stationList.append(fragment);
  }

  function setDisplayMode(
    nextMode,
    { focusToggle = false, focusSettingsButton = false } = {}
  ) {
    if (!Object.values(DisplayMode).includes(nextMode)) {
      return;
    }

    displayMode = nextMode;
    const showList = displayMode === DisplayMode.LIST;
    const showSettings = displayMode === DisplayMode.SETTINGS;

    playerView.hidden = displayMode !== DisplayMode.SINGLE;
    listView.hidden = !showList;
    settingsView.hidden = !showSettings;
    toggleButton.hidden = showSettings;
    settingsBackButton.hidden = !showSettings;
    settingsButton.hidden = showSettings;
    mainContent.classList.toggle("is-settings-view", showSettings);
    toggleButton.setAttribute("aria-pressed", String(showList));
    toggleButton.setAttribute(
      "aria-label",
      showList ? "顯示目前電台" : "顯示所有電台"
    );
    toggleIcon.textContent = showList ? "▶" : "▦";
    toggleText.textContent = showList ? "目前電台" : "所有電台";

    if (showList) {
      renderStations();
    }

    if (showSettings) {
      settingsBackButton.focus();
    } else if (focusSettingsButton) {
      settingsButton.focus();
    } else if (showList) {
      const firstStation = stationList.querySelector(".station-option");
      (firstStation || toggleButton).focus();
    } else if (focusToggle) {
      toggleButton.focus();
    }
  }

  function toggleDisplayMode() {
    if (displayMode === DisplayMode.SETTINGS) {
      return;
    }

    setDisplayMode(
      displayMode === DisplayMode.SINGLE
        ? DisplayMode.LIST
        : DisplayMode.SINGLE,
      { focusToggle: displayMode === DisplayMode.LIST }
    );
  }

  function openSettings() {
    if (
      displayMode !== DisplayMode.SINGLE &&
      displayMode !== DisplayMode.LIST
    ) {
      return;
    }

    previousDisplayMode = displayMode;
    setDisplayMode(DisplayMode.SETTINGS);
  }

  function getSettingsReturnMode() {
    return previousDisplayMode === DisplayMode.LIST ||
      previousDisplayMode === DisplayMode.SINGLE
      ? previousDisplayMode
      : DisplayMode.SINGLE;
  }

  function returnFromSettings() {
    if (displayMode !== DisplayMode.SETTINGS) {
      return;
    }

    setDisplayMode(getSettingsReturnMode(), {
      focusSettingsButton: true
    });
  }

  function handleStationListClick(event) {
    const stationOption = event.target.closest(".station-option");
    const stationId = stationOption?.dataset.stationId;

    if (!stationId) {
      return;
    }

    player.selectStation(stationId);
    renderStations();
  }

  function handleDocumentKeydown(event) {
    if (event.key !== "Escape") {
      return;
    }

    if (displayMode === DisplayMode.SETTINGS) {
      event.preventDefault();
      returnFromSettings();
      return;
    }
  }

  toggleButton.addEventListener("click", toggleDisplayMode);
  settingsButton.addEventListener("click", openSettings);
  settingsBackButton.addEventListener("click", returnFromSettings);
  stationList.addEventListener("click", handleStationListClick);
  searchInput.addEventListener("input", renderStations);
  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    renderStations();
    searchInput.focus();
  });
  document.addEventListener("keydown", handleDocumentKeydown);
  document.addEventListener("easy-radio:station-change", renderStations);

  setDisplayMode(DisplayMode.LIST);
})();
