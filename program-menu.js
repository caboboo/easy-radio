(function initializeProgramMenu() {
  "use strict";

  const menuButton = document.getElementById("programMenuButton");
  const panel = document.getElementById("programPanel");
  const overlay = document.getElementById("programOverlay");
  const closeButton = document.getElementById("programCloseButton");
  const panelTitle = document.getElementById("programPanelTitle");
  const programCount = document.getElementById("programCount");
  const searchInput = document.getElementById("programSearch");
  const clearButton = document.getElementById("programSearchClear");
  const searchStatus = document.getElementById("programSearchStatus");
  const programList = document.getElementById("programList");
  const app = document.querySelector(".app");
  const sourcePrograms = Array.isArray(window.EASY_RADIO_PROGRAMS)
    ? window.EASY_RADIO_PROGRAMS
    : [];
  const filterPrograms = window.EasyRadioProgramSearch?.filterPrograms;
  const expandedPrograms = new Set();
  let pageScrollY = 0;
  let isOpen = false;

  if (
    !menuButton ||
    !panel ||
    !overlay ||
    !closeButton ||
    !panelTitle ||
    !programCount ||
    !searchInput ||
    !clearButton ||
    !searchStatus ||
    !programList ||
    !app ||
    typeof filterPrograms !== "function"
  ) {
    console.warn("[Easy Radio] 節目選單無法初始化");
    return;
  }

  function cleanText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function cleanList(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map(cleanText).filter(Boolean);
  }

  function getRenderablePrograms(programs) {
    const seenIds = new Set();

    return programs.filter((program) => {
      const id = cleanText(program?.id);
      const title = cleanText(program?.title);

      if (!id || !title || seenIds.has(id)) {
        return false;
      }

      seenIds.add(id);
      return true;
    });
  }

  const programs = getRenderablePrograms(sourcePrograms);

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

  function createDetailRow(label, value) {
    const cleanValue = cleanText(value);

    if (!cleanValue) {
      return null;
    }

    const row = document.createElement("p");
    row.className = "program-detail-row";

    const labelElement = document.createElement("strong");
    labelElement.textContent = `${label}：`;

    const valueElement = document.createElement("span");
    valueElement.textContent = cleanValue;

    row.append(labelElement, valueElement);
    return row;
  }

  function createProgramCard(program) {
    const programId = cleanText(program.id);
    const detailsId = `program-details-${encodeURIComponent(programId)}`;
    const card = document.createElement("article");
    const summaryButton = document.createElement("button");
    const summary = document.createElement("span");
    const details = document.createElement("div");
    const isExpanded = expandedPrograms.has(programId);
    const hosts = cleanList(program.hosts);
    const keywords = cleanList(program.keywords);

    card.className = "program-card";
    summaryButton.className = "program-summary";
    summaryButton.type = "button";
    summaryButton.dataset.programId = programId;
    summaryButton.setAttribute("aria-expanded", String(isExpanded));
    summaryButton.setAttribute("aria-controls", detailsId);

    summary.className = "program-summary-text";
    appendText(summary, "h3", "program-title", program.title);
    appendText(summary, "span", "program-station", program.stationName);
    appendText(summary, "span", "program-hosts", hosts.join("、"));

    const expandText = document.createElement("span");
    expandText.className = "program-expand-text";
    expandText.textContent = isExpanded ? "收合" : "查看";

    details.id = detailsId;
    details.className = "program-details";
    details.hidden = !isExpanded;

    [
      createDetailRow("播出時間", program.scheduleText),
      createDetailRow("節目簡介", program.description),
      createDetailRow("關鍵字", keywords.join("、"))
    ].forEach((row) => {
      if (row) {
        details.append(row);
      }
    });

    if (details.childElementCount > 0) {
      summaryButton.append(summary, expandText);
      card.append(summaryButton, details);
    } else {
      const staticSummary = document.createElement("div");
      staticSummary.className = "program-summary program-summary-static";
      staticSummary.append(summary);
      card.append(staticSummary);
    }

    return card;
  }

  function renderPrograms() {
    const rawQuery = searchInput.value;
    const query = rawQuery.trim();
    const filteredPrograms = filterPrograms(programs, query);

    clearButton.hidden = rawQuery.length === 0;
    programCount.textContent = String(programs.length);
    searchStatus.textContent = query
      ? `搜尋結果 ${filteredPrograms.length} 筆`
      : `共 ${programs.length} 筆節目`;
    programList.replaceChildren();

    if (programs.length === 0) {
      appendText(
        programList,
        "p",
        "program-empty-state",
        "目前尚未收錄節目"
      );
      return;
    }

    if (filteredPrograms.length === 0) {
      appendText(
        programList,
        "p",
        "program-empty-state",
        "找不到符合的節目"
      );
      return;
    }

    const fragment = document.createDocumentFragment();
    filteredPrograms.forEach((program) => {
      fragment.append(createProgramCard(program));
    });
    programList.append(fragment);
  }

  function lockPageScroll() {
    pageScrollY = window.scrollY;
    document.body.style.top = `-${pageScrollY}px`;
    document.body.classList.add("program-menu-open");
  }

  function unlockPageScroll() {
    document.body.classList.remove("program-menu-open");
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

  function handleProgramListClick(event) {
    const summaryButton = event.target.closest(".program-summary");

    if (!summaryButton || summaryButton.disabled) {
      return;
    }

    const programId = summaryButton.dataset.programId;
    const detailsId = summaryButton.getAttribute("aria-controls");
    const details = detailsId ? document.getElementById(detailsId) : null;

    if (!programId || !details) {
      return;
    }

    const shouldExpand =
      summaryButton.getAttribute("aria-expanded") !== "true";
    summaryButton.setAttribute("aria-expanded", String(shouldExpand));
    summaryButton.querySelector(".program-expand-text").textContent =
      shouldExpand ? "收合" : "查看";
    details.hidden = !shouldExpand;

    if (shouldExpand) {
      expandedPrograms.add(programId);
    } else {
      expandedPrograms.delete(programId);
    }
  }

  menuButton.addEventListener("click", openMenu);
  closeButton.addEventListener("click", () => closeMenu());
  overlay.addEventListener("click", () => closeMenu());
  panel.addEventListener("keydown", handlePanelKeydown);
  programList.addEventListener("click", handleProgramListClick);
  searchInput.addEventListener("input", renderPrograms);
  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    renderPrograms();
    searchInput.focus();
  });

  renderPrograms();
})();
