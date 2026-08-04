(function initializeStationViews() {
  "use strict";

  const DisplayMode = Object.freeze({
    SINGLE: "single",
    LIST: "list",
    SETTINGS: "settings"
  });
  const DrawerPosition = Object.freeze({
    PRIMARY: "primary",
    SETTINGS_REVEALED: "settings-revealed"
  });
  const KEYBOARD_FOCUS_CLASS = "uses-keyboard-navigation";
  const MOBILE_DRAWER_QUERY = "(max-width: 760px)";
  const GESTURE_INTENT_THRESHOLD = 5;
  const DRAG_ACTIVATION_THRESHOLD = 8;
  const HORIZONTAL_INTENT_RATIO = 1.2;
  const SNAP_PROGRESS_THRESHOLD = 0.28;
  const MIN_FLING_DISTANCE = 16;
  const FLING_VELOCITY_THRESHOLD = 0.35;
  const VELOCITY_SAMPLE_WINDOW = 100;

  const toggleButton = document.getElementById("viewToggleButton");
  const singleViewIcon = document.getElementById("viewSingleIcon");
  const listViewIcon = document.getElementById("viewListIcon");
  const settingsButton = document.getElementById("settingsButton");
  const settingsGearIcon = document.getElementById("settingsGearIcon");
  const settingsCloseIcon = document.getElementById("settingsCloseIcon");
  const playbackBar = document.querySelector(".floating-playback-bar");
  const controlTrack = document.querySelector(".playback-primary-controls");
  const mainContent = document.querySelector(".main-content");
  const playerView = document.getElementById("playerView");
  const listView = document.getElementById("stationListView");
  const settingsView = document.getElementById("settingsView");
  const settingsTitle = document.getElementById("settingsTitle");
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
  const mobileDrawerMedia = window.matchMedia(MOBILE_DRAWER_QUERY);
  const drawerTabIndexes = new WeakMap();
  let displayMode = DisplayMode.LIST;
  let previousDisplayMode = DisplayMode.LIST;
  let drawerPosition = DrawerPosition.PRIMARY;
  let drawerGesture = null;
  let drawerAvailabilityTimer = 0;
  let suppressNextDrawerClick = false;

  if (
    !toggleButton ||
    !singleViewIcon ||
    !listViewIcon ||
    !settingsButton ||
    !settingsGearIcon ||
    !settingsCloseIcon ||
    !playbackBar ||
    !controlTrack ||
    !mainContent ||
    !playerView ||
    !listView ||
    !settingsView ||
    !settingsTitle ||
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

  function isMobileDrawer() {
    return mobileDrawerMedia.matches;
  }

  function setDrawerControlAvailability(element, isAvailable) {
    if (isAvailable) {
      element.removeAttribute("aria-hidden");
      element.removeAttribute("inert");

      if (drawerTabIndexes.has(element)) {
        const previousTabIndex = drawerTabIndexes.get(element);

        if (previousTabIndex === null) {
          element.removeAttribute("tabindex");
        } else {
          element.setAttribute("tabindex", previousTabIndex);
        }

        drawerTabIndexes.delete(element);
      }

      return;
    }

    if (!drawerTabIndexes.has(element)) {
      drawerTabIndexes.set(element, element.getAttribute("tabindex"));
    }

    element.setAttribute("aria-hidden", "true");
    element.setAttribute("inert", "");
    element.setAttribute("tabindex", "-1");
  }

  function updateDrawerControlAvailability() {
    if (!isMobileDrawer()) {
      setDrawerControlAvailability(toggleButton, true);
      setDrawerControlAvailability(settingsButton, true);
      return;
    }

    const showSettingsControl =
      displayMode === DisplayMode.SETTINGS ||
      drawerPosition === DrawerPosition.SETTINGS_REVEALED;
    const showModeControl =
      displayMode !== DisplayMode.SETTINGS &&
      drawerPosition === DrawerPosition.PRIMARY;

    setDrawerControlAvailability(toggleButton, showModeControl);
    setDrawerControlAvailability(settingsButton, showSettingsControl);
  }

  function finishDrawerAvailabilityUpdate() {
    if (drawerAvailabilityTimer) {
      window.clearTimeout(drawerAvailabilityTimer);
      drawerAvailabilityTimer = 0;
    }

    updateDrawerControlAvailability();
  }

  function setDrawerPosition(
    nextPosition,
    { deferAvailability = false } = {}
  ) {
    if (!Object.values(DrawerPosition).includes(nextPosition)) {
      return;
    }

    if (drawerAvailabilityTimer) {
      window.clearTimeout(drawerAvailabilityTimer);
      drawerAvailabilityTimer = 0;
    }

    drawerPosition = nextPosition;
    playbackBar.classList.remove("is-drawer-dragging");
    playbackBar.classList.toggle(
      "is-settings-revealed",
      isMobileDrawer() &&
        drawerPosition === DrawerPosition.SETTINGS_REVEALED
    );
    playbackBar.style.removeProperty("--mobile-drawer-offset");

    if (
      deferAvailability &&
      isMobileDrawer() &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      drawerAvailabilityTimer = window.setTimeout(
        finishDrawerAvailabilityUpdate,
        260
      );
      return;
    }

    updateDrawerControlAvailability();
  }

  function getDrawerTravelDistance() {
    const styles = window.getComputedStyle(playbackBar);
    const controlSize = Number.parseFloat(
      styles.getPropertyValue("--mobile-control-size")
    );
    const renderedModeWidth = toggleButton.getBoundingClientRect().width;
    const gap = Number.parseFloat(
      window.getComputedStyle(controlTrack).columnGap
    );
    const buttonWidth = Number.isFinite(controlSize) && controlSize > 0
      ? controlSize
      : renderedModeWidth;

    return buttonWidth + (Number.isFinite(gap) ? gap : 0);
  }

  function getDrawerOffset() {
    return drawerPosition === DrawerPosition.SETTINGS_REVEALED
      ? -getDrawerTravelDistance()
      : 0;
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
    settingsButton.setAttribute(
      "aria-label",
      showSettings ? "關閉設定" : "設定"
    );
    settingsGearIcon.toggleAttribute("hidden", showSettings);
    settingsCloseIcon.toggleAttribute("hidden", !showSettings);
    mainContent.classList.toggle("is-settings-view", showSettings);
    toggleButton.setAttribute(
      "aria-label",
      showList ? "切換到目前電台" : "切換到所有電台"
    );
    toggleButton.title = showList ? "目前電台" : "所有電台";
    singleViewIcon.toggleAttribute("hidden", !showList);
    listViewIcon.toggleAttribute("hidden", showList);
    setDrawerPosition(
      showSettings
        ? DrawerPosition.SETTINGS_REVEALED
        : DrawerPosition.PRIMARY
    );

    if (showList) {
      renderStations();
    }

    if (showSettings) {
      settingsButton.focus();
    } else if (focusSettingsButton) {
      (isMobileDrawer() ? toggleButton : settingsButton).focus();
    } else if (focusToggle) {
      toggleButton.focus();
    }
  }

  function setKeyboardFocusVisibility(isKeyboardNavigation) {
    document.documentElement.classList.toggle(
      KEYBOARD_FOCUS_CLASS,
      isKeyboardNavigation
    );
  }

  function handleDocumentPointerdown() {
    setKeyboardFocusVisibility(false);
  }

  function toggleDisplayMode() {
    if (displayMode === DisplayMode.SETTINGS) {
      return;
    }

    setDisplayMode(
      displayMode === DisplayMode.SINGLE
        ? DisplayMode.LIST
        : DisplayMode.SINGLE,
      { focusToggle: true }
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
      : DisplayMode.LIST;
  }

  function returnFromSettings() {
    if (displayMode !== DisplayMode.SETTINGS) {
      return;
    }

    setDisplayMode(getSettingsReturnMode(), {
      focusSettingsButton: true
    });
  }

  function handleSettingsButtonClick() {
    if (displayMode === DisplayMode.SETTINGS) {
      returnFromSettings();
      return;
    }

    openSettings();
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
    setKeyboardFocusVisibility(true);

    if (event.key !== "Escape") {
      return;
    }

    if (displayMode === DisplayMode.SETTINGS) {
      event.preventDefault();
      returnFromSettings();
      return;
    }
  }

  function clampDrawerOffset(value, travelDistance) {
    return Math.min(0, Math.max(-travelDistance, value));
  }

  function recordDrawerPointerSample(event) {
    const sampleTime = window.performance.now();
    const samples = drawerGesture.samples;
    samples.push({ x: event.clientX, time: sampleTime });

    const cutoff = sampleTime - VELOCITY_SAMPLE_WINDOW;
    while (samples.length > 2 && samples[0].time < cutoff) {
      samples.shift();
    }
  }

  function getRecentDrawerVelocity(gesture) {
    const firstSample = gesture.samples[0];
    const lastSample = gesture.samples[gesture.samples.length - 1];
    const elapsed = Math.max(1, lastSample.time - firstSample.time);

    return (lastSample.x - firstSample.x) / elapsed;
  }

  function getDirectionalDrawerPosition(startPosition, movementX) {
    if (startPosition === DrawerPosition.PRIMARY && movementX < 0) {
      return DrawerPosition.SETTINGS_REVEALED;
    }

    if (
      startPosition === DrawerPosition.SETTINGS_REVEALED &&
      movementX > 0
    ) {
      return DrawerPosition.PRIMARY;
    }

    return startPosition;
  }

  function getDrawerSnapPosition(gesture, travelDistance, deltaX, velocity) {
    if (!gesture.canMove) {
      return DrawerPosition.SETTINGS_REVEALED;
    }

    const drawerMovement = gesture.currentOffset - gesture.startOffset;
    const progress = Math.abs(drawerMovement) / travelDistance;
    const flingTarget = getDirectionalDrawerPosition(
      gesture.startPosition,
      velocity
    );
    const isFastSwipe =
      Math.abs(deltaX) >= MIN_FLING_DISTANCE &&
      Math.abs(velocity) >= FLING_VELOCITY_THRESHOLD &&
      flingTarget !== gesture.startPosition;

    if (isFastSwipe) {
      return flingTarget;
    }

    if (progress >= SNAP_PROGRESS_THRESHOLD) {
      return getDirectionalDrawerPosition(
        gesture.startPosition,
        drawerMovement
      );
    }

    return gesture.startPosition;
  }

  function handleDrawerPointerDown(event) {
    if (
      !isMobileDrawer() ||
      drawerGesture ||
      event.isPrimary === false ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }

    const startTime = window.performance.now();
    const startOffset = getDrawerOffset();
    suppressNextDrawerClick = false;
    drawerGesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset,
      currentOffset: startOffset,
      startPosition: drawerPosition,
      direction: "pending",
      dragging: false,
      canMove: displayMode !== DisplayMode.SETTINGS,
      samples: [{ x: event.clientX, time: startTime }]
    };
  }

  function handleDrawerPointerMove(event) {
    if (!drawerGesture || event.pointerId !== drawerGesture.pointerId) {
      return;
    }

    recordDrawerPointerSample(event);
    const deltaX = event.clientX - drawerGesture.startX;
    const deltaY = event.clientY - drawerGesture.startY;
    const absoluteX = Math.abs(deltaX);
    const absoluteY = Math.abs(deltaY);

    if (drawerGesture.direction === "pending") {
      if (
        Math.max(absoluteX, absoluteY) < GESTURE_INTENT_THRESHOLD
      ) {
        return;
      }

      if (
        absoluteY >= DRAG_ACTIVATION_THRESHOLD &&
        absoluteY > absoluteX * HORIZONTAL_INTENT_RATIO
      ) {
        drawerGesture.direction = "vertical";
        return;
      }

      if (
        absoluteX < DRAG_ACTIVATION_THRESHOLD ||
        absoluteX <= absoluteY * HORIZONTAL_INTENT_RATIO
      ) {
        return;
      }

      drawerGesture.direction = "horizontal";
      drawerGesture.dragging = true;
      playbackBar.classList.add("is-drawer-dragging");

      try {
        playbackBar.setPointerCapture(event.pointerId);
      } catch (error) {
        console.debug("[Easy Radio] Pointer capture unavailable.", error);
      }
    }

    if (drawerGesture.direction !== "horizontal") {
      return;
    }

    event.preventDefault();
    if (drawerGesture.canMove) {
      const travelDistance = getDrawerTravelDistance();
      drawerGesture.currentOffset = clampDrawerOffset(
        drawerGesture.startOffset + deltaX,
        travelDistance
      );
      playbackBar.style.setProperty(
        "--mobile-drawer-offset",
        `${drawerGesture.currentOffset}px`
      );
    }
  }

  function finishDrawerGesture(nextPosition, suppressClick) {
    const activeGesture = drawerGesture;
    drawerGesture = null;

    if (suppressClick) {
      suppressNextDrawerClick = true;
    }

    setDrawerPosition(nextPosition, { deferAvailability: true });

    if (
      activeGesture &&
      playbackBar.hasPointerCapture(activeGesture.pointerId)
    ) {
      playbackBar.releasePointerCapture(activeGesture.pointerId);
    }
  }

  function handleDrawerPointerUp(event) {
    if (!drawerGesture || event.pointerId !== drawerGesture.pointerId) {
      return;
    }

    if (!drawerGesture.dragging) {
      drawerGesture = null;
      return;
    }

    event.preventDefault();
    recordDrawerPointerSample(event);
    const travelDistance = getDrawerTravelDistance();
    const deltaX = event.clientX - drawerGesture.startX;
    const velocity = getRecentDrawerVelocity(drawerGesture);
    const nextPosition = getDrawerSnapPosition(
      drawerGesture,
      travelDistance,
      deltaX,
      velocity
    );

    finishDrawerGesture(nextPosition, true);
  }

  function cancelDrawerGesture(event) {
    if (
      !drawerGesture ||
      (event?.pointerId !== undefined &&
        event.pointerId !== drawerGesture.pointerId)
    ) {
      return;
    }

    const travelDistance = getDrawerTravelDistance();
    const progress = Math.abs(drawerGesture.currentOffset) / travelDistance;
    const suppressClick = drawerGesture.dragging;
    let nextPosition = drawerPosition;

    if (!drawerGesture.canMove) {
      nextPosition = DrawerPosition.SETTINGS_REVEALED;
    } else if (drawerGesture.dragging) {
      nextPosition = progress >= 0.5
        ? DrawerPosition.SETTINGS_REVEALED
        : DrawerPosition.PRIMARY;
    }

    finishDrawerGesture(nextPosition, suppressClick);
  }

  function handleDrawerClickCapture(event) {
    if (!suppressNextDrawerClick || event.detail === 0) {
      return;
    }

    suppressNextDrawerClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function resetDrawerForViewport() {
    suppressNextDrawerClick = false;

    if (drawerGesture) {
      finishDrawerGesture(drawerPosition, false);
    }

    setDrawerPosition(
      isMobileDrawer() && displayMode === DisplayMode.SETTINGS
        ? DrawerPosition.SETTINGS_REVEALED
        : DrawerPosition.PRIMARY
    );
  }

  function handleDrawerTransitionEnd(event) {
    if (
      event.target === controlTrack &&
      event.propertyName === "transform" &&
      drawerAvailabilityTimer
    ) {
      finishDrawerAvailabilityUpdate();
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "hidden") {
      resetDrawerForViewport();
    }
  }

  toggleButton.addEventListener("click", toggleDisplayMode);
  settingsButton.addEventListener("click", handleSettingsButtonClick);
  playbackBar.addEventListener("click", handleDrawerClickCapture, true);
  playbackBar.addEventListener("pointerdown", handleDrawerPointerDown);
  playbackBar.addEventListener("pointermove", handleDrawerPointerMove, {
    passive: false
  });
  playbackBar.addEventListener("pointerup", handleDrawerPointerUp);
  playbackBar.addEventListener("pointercancel", cancelDrawerGesture);
  playbackBar.addEventListener("lostpointercapture", cancelDrawerGesture);
  controlTrack.addEventListener("transitionend", handleDrawerTransitionEnd);
  stationList.addEventListener("click", handleStationListClick);
  searchInput.addEventListener("input", renderStations);
  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    renderStations();
    searchInput.focus();
  });
  document.addEventListener("keydown", handleDocumentKeydown);
  document.addEventListener("pointerdown", handleDocumentPointerdown);
  document.addEventListener("easy-radio:station-change", renderStations);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("resize", resetDrawerForViewport);
  window.addEventListener("orientationchange", resetDrawerForViewport);

  if (typeof mobileDrawerMedia.addEventListener === "function") {
    mobileDrawerMedia.addEventListener("change", resetDrawerForViewport);
  } else {
    mobileDrawerMedia.addListener(resetDrawerForViewport);
  }

  setDisplayMode(DisplayMode.LIST);
})();
