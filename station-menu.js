(function initializeStationMenu() {
  "use strict";

  const menuButton = document.getElementById("stationMenuButton");
  const panel = document.getElementById("stationPanel");
  const overlay = document.getElementById("stationOverlay");
  const closeButton = document.getElementById("stationCloseButton");
  const panelTitle = document.getElementById("stationPanelTitle");
  const stationCount = document.getElementById("stationCount");
  const searchInput = document.getElementById("stationSearch");
  const clearButton = document.getElementById("stationSearchClear");
  const searchStatus = document.getElementById("stationSearchStatus");
  const stationList = document.getElementById("stationList");
  const app = document.querySelector(".app");
  const sourceStations = Array.isArray(window.EASY_RADIO_STATIONS)
    ? window.EASY_RADIO_STATIONS
    : [];
  const filterStations = window.EasyRadioStationSearch?.filterStations;
  const player = window.EasyRadioPlayer;
  let pageScrollY = 0;
  let isOpen = false;

  if (
    !menuButton ||
    !panel ||
    !overlay ||
    !closeButton ||
    !panelTitle ||
    !stationCount ||
    !searchInput ||
    !clearButton ||
    !searchStatus ||
    !stationList ||
    !app ||
    typeof filterStations !== "function" ||
    typeof player?.getCurrentStation !== "function" ||
    typeof player?.selectStation !== "function"
  ) {
    console.warn("[Easy Radio] 電台選單無法初始化");
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

  function createStationOption(station) {
    const currentStation = player.getCurrentStation();
    const isCurrent = currentStation?.id === station.id;
    const option = document.createElement("button");
    const summary = document.createElement("span");
    const badges = document.createElement("span");

    option.className = "station-option";
    option.type = "button";
    option.dataset.stationId = station.id;
    option.setAttribute("aria-pressed", String(isCurrent));

    summary.className = "station-option-text";
    appendText(summary, "strong", "station-option-name", station.name);
    appendText(summary, "span", "station-option-subtitle", station.subtitle);

    if (
      station.frequency &&
      !cleanText(station.subtitle).includes(cleanText(station.frequency))
    ) {
      appendText(
        summary,
        "span",
        "station-option-frequency",
        station.frequency
      );
    }

    badges.className = "station-option-badges";
    appendText(badges, "span", "station-type-label", "電台");
    appendText(
      badges,
      "span",
      isCurrent ? "current-station-label" : "station-action-label",
      isCurrent ? "目前播放" : "切換電台"
    );

    option.append(summary, badges);
    return option;
  }

  function renderStations() {
    const rawQuery = searchInput.value;
    const query = rawQuery.trim();
    const filteredStations = filterStations(stations, query);

    clearButton.hidden = rawQuery.length === 0;
    stationCount.textContent = String(stations.length);
    searchStatus.textContent = query
      ? `搜尋結果 ${filteredStations.length} 個電台`
      : `共 ${stations.length} 個電台`;
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

  function lockPageScroll() {
    pageScrollY = window.scrollY;
    document.body.style.top = `-${pageScrollY}px`;
    document.body.classList.add("station-menu-open");
  }

  function unlockPageScroll() {
    document.body.classList.remove("station-menu-open");
    document.body.style.removeProperty("top");
    window.scrollTo(0, pageScrollY);
  }

  function openMenu() {
    if (isOpen) {
      return;
    }

    isOpen = true;
    lockPageScroll();
    app.inert = true;
    panel.inert = false;
    panel.setAttribute("aria-hidden", "false");
    menuButton.setAttribute("aria-expanded", "true");
    overlay.classList.add("is-open");
    panel.classList.add("is-open");
    searchInput.focus();
  }

  function closeMenu({ returnFocus = true } = {}) {
    if (!isOpen) {
      return;
    }

    isOpen = false;
    app.inert = false;

    if (returnFocus) {
      menuButton.focus();
    }

    panel.inert = true;
    panel.setAttribute("aria-hidden", "true");
    menuButton.setAttribute("aria-expanded", "false");
    overlay.classList.remove("is-open");
    panel.classList.remove("is-open");
    unlockPageScroll();
  }

  function handlePanelKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = Array.from(
      panel.querySelectorAll(
        'button:not([disabled]):not([hidden]), input:not([disabled])'
      )
    ).filter((element) => !element.hidden);

    if (focusableElements.length === 0) {
      event.preventDefault();
      panelTitle.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function handleStationListClick(event) {
    const stationOption = event.target.closest(".station-option");
    const stationId = stationOption?.dataset.stationId;

    if (!stationId) {
      return;
    }

    player.selectStation(stationId);
    renderStations();
    closeMenu();
  }

  menuButton.addEventListener("click", openMenu);
  closeButton.addEventListener("click", () => closeMenu());
  overlay.addEventListener("click", () => closeMenu());
  panel.addEventListener("keydown", handlePanelKeydown);
  stationList.addEventListener("click", handleStationListClick);
  searchInput.addEventListener("input", renderStations);
  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    renderStations();
    searchInput.focus();
  });
  document.addEventListener("easy-radio:station-change", renderStations);

  renderStations();
})();
