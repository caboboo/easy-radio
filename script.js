const radio = document.getElementById("radio");
const radioSource = document.getElementById("radioSource");
const playButton = document.getElementById("playButton");
const playIcon = document.getElementById("playIcon");
const playText = document.getElementById("playText");
const statusText = document.getElementById("statusText");
const dateElement = document.getElementById("date");
const timeElement = document.getElementById("time");
const desktopVolume = document.getElementById("desktopVolume");
const volumeSlider = document.getElementById("volumeSlider");
const volumeText = document.getElementById("volumeText");
const muteButton = document.getElementById("muteButton");
const stationNameElement = document.getElementById("stationName");
const stationSubtitleElement = document.getElementById("stationSubtitle");
const stationFrequencyElement = document.getElementById("stationFrequency");
const stationBrandLeadElement = document.getElementById("stationBrandLead");
const stationBrandTextElement = document.getElementById("stationBrandText");
const stationMarkElement = document.querySelector(".station-mark");
const versionTextElement = document.getElementById("versionText");
const buildTextElement = document.getElementById("buildText");
const stations = Array.isArray(window.EASY_RADIO_STATIONS)
  ? window.EASY_RADIO_STATIONS
  : [];
const releaseInfo = window.EASY_RADIO_VERSION;

const PlaybackState = Object.freeze({
  READY: "ready",
  CONNECTING: "connecting",
  PLAYING: "playing",
  BUFFERING: "buffering",
  OFFLINE: "offline",
  RECONNECTING: "reconnecting",
  ERROR: "error",
  NEEDS_USER: "needs-user",
  PAUSED: "paused"
});

const RETRY_DELAYS_MS = [3000, 8000, 15000, 30000];
const BUFFERING_NOTICE_DELAY_MS = 1200;
const BUFFERING_RECONNECT_DELAY_MS = 10800;

let userWantsPlayback = false;
let playbackState = PlaybackState.READY;
let playbackStateBeforeOffline = PlaybackState.READY;
let retryCount = 0;
let retryTimer = null;
let bufferingTimer = null;
let playRequestId = 0;
let activePlayRequest = null;
let lastPlayingTime = 0;
let volumeBeforeMute = 1;
let volumeAtSliderStart = 1;
let currentStation = stations[0] || null;

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short"
});
const timeFormatter = new Intl.DateTimeFormat("zh-TW", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function updateClock() {
  const now = new Date();
  const nextDate = dateFormatter.format(now);
  const nextTime = timeFormatter.format(now);

  if (dateElement.textContent !== nextDate) {
    dateElement.textContent = nextDate;
  }

  if (timeElement.textContent !== nextTime) {
    timeElement.textContent = nextTime;
  }
}

function initializeVersionDisplay() {
  const version = releaseInfo?.version;
  const build = releaseInfo?.build;

  if (
    typeof version !== "string" ||
    !Number.isInteger(build) ||
    build < 1
  ) {
    console.warn("[Easy Radio] 無法讀取有效的 Version／Build 資訊");
    return;
  }

  versionTextElement.textContent = `Version ${version}`;
  buildTextElement.textContent = `Build ${String(build).padStart(3, "0")}`;
}

const playbackUI = {
  [PlaybackState.READY]: { message: "準備播放" },
  [PlaybackState.CONNECTING]: { message: "正在連線" },
  [PlaybackState.PLAYING]: { message: "正在播放" },
  [PlaybackState.BUFFERING]: { message: "正在緩衝" },
  [PlaybackState.OFFLINE]: { message: "網路連線中斷" },
  [PlaybackState.RECONNECTING]: { message: "正在重新連線" },
  [PlaybackState.ERROR]: { message: "暫時無法播放" },
  [PlaybackState.NEEDS_USER]: { message: "請按播放繼續收聽" },
  [PlaybackState.PAUSED]: { message: "已暫停" }
};

function logPlayback(message, details) {
  if (details === undefined) {
    console.info(`[Easy Radio] ${message}`);
    return;
  }

  console.info(`[Easy Radio] ${message}`, details);
}

function updatePlaybackUI() {
  const ui = playbackUI[playbackState];
  const isPlaying = playbackState === PlaybackState.PLAYING;
  const canCancelPlayback =
    userWantsPlayback &&
    playbackState !== PlaybackState.READY &&
    playbackState !== PlaybackState.PAUSED &&
    playbackState !== PlaybackState.NEEDS_USER;
  const shouldOfferReplay =
    playbackState === PlaybackState.NEEDS_USER ||
    (playbackState === PlaybackState.ERROR && !userWantsPlayback);

  statusText.textContent = ui.message;
  playButton.classList.toggle("is-stop-action", canCancelPlayback);
  playButton.setAttribute("aria-pressed", String(isPlaying));
  playIcon.textContent = canCancelPlayback ? "Ⅱ" : "▶";
  playText.textContent = shouldOfferReplay
    ? "重新播放"
    : canCancelPlayback
      ? "暫停播放"
      : "播放";
}

function setPlaybackState(nextState) {
  if (playbackState !== nextState) {
    logPlayback("播放狀態變更", {
      from: playbackState,
      to: nextState
    });
    playbackState = nextState;
  }

  updatePlaybackUI();
}

function updateStationUI(station) {
  const brand = station?.brand ? String(station.brand).trim() : "";
  const subtitle = station?.subtitle ? String(station.subtitle).trim() : "";
  const frequency = station?.frequency ? String(station.frequency).trim() : "";
  const [brandLead = "", ...brandTextParts] = brand.split(/\s+/);
  const brandText = brandTextParts.join(" ");
  const showFrequencyInMark =
    Boolean(frequency) && !subtitle.includes(frequency);

  stationNameElement.textContent = station?.name || "";
  stationBrandLeadElement.textContent = brandLead;
  stationBrandLeadElement.hidden = !brandLead;
  stationBrandTextElement.textContent = brandText;
  stationBrandTextElement.hidden = !brandText;
  stationMarkElement.classList.toggle("has-long-brand", brandText.length > 7);
  stationSubtitleElement.textContent = subtitle;
  stationSubtitleElement.hidden = !subtitle;
  stationFrequencyElement.textContent = showFrequencyInMark ? frequency : "";
  stationFrequencyElement.hidden = !showFrequencyInMark;
}

function initializeCurrentStation() {
  if (!currentStation?.streamUrl) {
    console.warn("[Easy Radio] 沒有可播放的電台資料");
    playButton.disabled = true;
    statusText.textContent = "目前沒有可播放的電台";
    return;
  }

  updateStationUI(currentStation);
  radioSource.src = currentStation.streamUrl;
}

function notifyStationChange(station) {
  document.dispatchEvent(
    new CustomEvent("easy-radio:station-change", {
      detail: { stationId: station.id }
    })
  );
}

function selectStation(stationId) {
  const nextStation = stations.find((station) => station.id === stationId);

  if (!nextStation?.streamUrl) {
    console.warn("[Easy Radio] 找不到可切換的電台", { stationId });
    return { changed: false, reason: "not-found" };
  }

  if (currentStation?.id === nextStation.id) {
    logPlayback("選擇目前電台，保持現有串流", {
      stationId: nextStation.id
    });
    return { changed: false, reason: "already-selected" };
  }

  const shouldContinuePlayback = userWantsPlayback;

  logPlayback("使用者切換電台", {
    from: currentStation?.id || null,
    to: nextStation.id,
    continuePlayback: shouldContinuePlayback
  });

  cancelReconnect("使用者切換電台");
  cancelBufferingWatch("使用者切換電台");
  invalidateActivePlayRequest();
  retryCount = 0;
  currentStation = nextStation;
  updateStationUI(currentStation);

  if (shouldContinuePlayback) {
    setPlaybackState(PlaybackState.RECONNECTING);
  } else {
    setPlaybackState(PlaybackState.PAUSED);
  }

  try {
    if (!radio.paused) {
      radio.pause();
    }

    radioSource.src = currentStation.streamUrl;
    radio.load();
  } catch (error) {
    console.warn("[Easy Radio] 切換電台失敗", {
      name: error?.name || "UnknownError",
      stationId: currentStation.id
    });
    notifyStationChange(currentStation);

    if (shouldContinuePlayback) {
      setPlaybackState(PlaybackState.ERROR);
      scheduleReconnect("切換電台失敗");
    }

    return { changed: true, reason: "load-failed" };
  }

  notifyStationChange(currentStation);

  if (shouldContinuePlayback) {
    void attemptPlayback("station-change");
  }

  return {
    changed: true,
    reason: shouldContinuePlayback ? "continue-playback" : "remain-paused"
  };
}

function usesDeviceVolumeControls() {
  const isClassicIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIPadDesktopMode =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isMobilePointer = window.matchMedia(
    "(hover: none) and (pointer: coarse)"
  ).matches;

  return isClassicIOS || isIPadDesktopMode || isMobilePointer;
}

function syncVolumeUI() {
  const volumePercent = Math.round(radio.volume * 100);
  const isSilent = radio.muted || volumePercent === 0;

  volumeSlider.value = String(volumePercent);
  volumeText.textContent = `音量 ${volumePercent}%${isSilent ? "（靜音）" : ""}`;
  volumeSlider.setAttribute(
    "aria-valuetext",
    isSilent ? `靜音，音量設定 ${volumePercent}%` : `音量 ${volumePercent}%`
  );
  muteButton.textContent = isSilent ? "恢復音量" : "靜音";
  muteButton.setAttribute("aria-pressed", String(isSilent));
}

function initializeVolumeControls() {
  if (usesDeviceVolumeControls()) {
    desktopVolume.hidden = true;
    return;
  }

  desktopVolume.hidden = false;
  radio.volume = 1;
  radio.muted = false;
  syncVolumeUI();
}

function setVolumeFromSlider() {
  const nextVolume = Number(volumeSlider.value) / 100;

  radio.volume = nextVolume;

  if (nextVolume > 0) {
    volumeBeforeMute = nextVolume;
    radio.muted = false;
  } else {
    if (volumeAtSliderStart > 0) {
      volumeBeforeMute = volumeAtSliderStart;
    }
    radio.muted = true;
  }

  syncVolumeUI();
}

function rememberSliderStartVolume() {
  if (!radio.muted && radio.volume > 0) {
    volumeAtSliderStart = radio.volume;
  }
}

function toggleMute() {
  const isSilent = radio.muted || radio.volume === 0;

  if (isSilent) {
    radio.volume = volumeBeforeMute > 0 ? volumeBeforeMute : 1;
    radio.muted = false;
  } else {
    volumeBeforeMute = radio.volume;
    radio.muted = true;
  }

  syncVolumeUI();
}

function cancelReconnect(reason) {
  if (retryTimer === null) {
    return;
  }

  clearTimeout(retryTimer);
  retryTimer = null;
  logPlayback("取消重新連線", reason);
}

function cancelBufferingWatch(reason) {
  if (bufferingTimer === null) {
    return;
  }

  clearTimeout(bufferingTimer);
  bufferingTimer = null;
  logPlayback("取消緩衝監看", reason);
}

function invalidateActivePlayRequest() {
  playRequestId += 1;
  activePlayRequest = null;
}

function isPlaybackActive() {
  return playbackState === PlaybackState.PLAYING && !radio.paused;
}

function isAutoplayBlocked(error) {
  return error?.name === "NotAllowedError" || error?.name === "SecurityError";
}

function requireUserAction(error) {
  userWantsPlayback = false;
  cancelReconnect("瀏覽器要求使用者操作");
  cancelBufferingWatch("瀏覽器要求使用者操作");
  invalidateActivePlayRequest();
  console.warn("[Easy Radio] play() 被瀏覽器阻止", {
    name: error?.name || "UnknownError"
  });
  setPlaybackState(PlaybackState.NEEDS_USER);
}

function scheduleReconnect(reason) {
  if (
    !userWantsPlayback ||
    retryTimer !== null ||
    isPlaybackActive()
  ) {
    return;
  }

  if (!navigator.onLine) {
    setPlaybackState(PlaybackState.OFFLINE);
    return;
  }

  const delay =
    RETRY_DELAYS_MS[Math.min(retryCount, RETRY_DELAYS_MS.length - 1)];
  const nextAttempt = retryCount + 1;

  retryTimer = setTimeout(() => {
    retryTimer = null;
    void attemptReconnect(reason);
  }, delay);

  logPlayback("安排重新連線", {
    attempt: nextAttempt,
    delaySeconds: delay / 1000,
    reason
  });
}

function startBufferingWatch(trigger) {
  if (
    !userWantsPlayback ||
    !navigator.onLine ||
    bufferingTimer !== null ||
    playbackState === PlaybackState.RECONNECTING
  ) {
    return;
  }

  bufferingTimer = setTimeout(() => {
    bufferingTimer = null;

    if (!userWantsPlayback) {
      return;
    }

    setPlaybackState(PlaybackState.BUFFERING);

    bufferingTimer = setTimeout(() => {
      bufferingTimer = null;

      if (!userWantsPlayback) {
        return;
      }

      logPlayback("緩衝逾時", {
        trigger,
        secondsSincePlaying: lastPlayingTime
          ? Math.round((Date.now() - lastPlayingTime) / 1000)
          : null
      });
      scheduleReconnect("緩衝逾時");
    }, BUFFERING_RECONNECT_DELAY_MS);
  }, BUFFERING_NOTICE_DELAY_MS);
}

function handlePlayRejection(error, requestId, origin) {
  if (requestId !== playRequestId || !userWantsPlayback) {
    return;
  }

  if (isAutoplayBlocked(error)) {
    requireUserAction(error);
    return;
  }

  console.warn("[Easy Radio] play() 失敗", {
    origin,
    name: error?.name || "UnknownError"
  });

  if (!navigator.onLine) {
    setPlaybackState(PlaybackState.OFFLINE);
    return;
  }

  setPlaybackState(PlaybackState.ERROR);
  scheduleReconnect("play() 失敗");
}

async function attemptPlayback(origin) {
  if (
    !userWantsPlayback ||
    activePlayRequest !== null ||
    isPlaybackActive()
  ) {
    return;
  }

  if (!navigator.onLine) {
    setPlaybackState(PlaybackState.OFFLINE);
    return;
  }

  const requestId = ++playRequestId;
  let playPromise;

  try {
    playPromise = Promise.resolve(radio.play());
  } catch (error) {
    handlePlayRejection(error, requestId, origin);
    return;
  }

  activePlayRequest = { id: requestId, promise: playPromise };

  try {
    await playPromise;
  } catch (error) {
    handlePlayRejection(error, requestId, origin);
  } finally {
    if (activePlayRequest?.id === requestId) {
      activePlayRequest = null;
    }
  }
}

async function attemptReconnect(reason) {
  if (
    !userWantsPlayback ||
    !navigator.onLine ||
    isPlaybackActive()
  ) {
    return;
  }

  retryCount += 1;
  cancelBufferingWatch("開始重新連線");
  setPlaybackState(PlaybackState.RECONNECTING);
  logPlayback("嘗試重新連線", {
    attempt: retryCount,
    reason
  });

  invalidateActivePlayRequest();

  // 只有進入受控重連流程時才重新載入同一個 audio 元件。
  try {
    if (!radio.paused) {
      radio.pause();
    }
    radio.load();
  } catch (error) {
    console.warn("[Easy Radio] 重新載入串流失敗", {
      name: error?.name || "UnknownError"
    });
    setPlaybackState(PlaybackState.ERROR);
    scheduleReconnect("重新載入失敗");
    return;
  }

  await attemptPlayback("reconnect");
}

function startPlaybackFromUserAction() {
  if (userWantsPlayback) {
    return;
  }

  logPlayback("使用者按下播放");
  userWantsPlayback = true;
  retryCount = 0;
  cancelReconnect("使用者重新開始播放");
  cancelBufferingWatch("使用者重新開始播放");

  if (!navigator.onLine) {
    setPlaybackState(PlaybackState.OFFLINE);
    return;
  }

  setPlaybackState(PlaybackState.CONNECTING);
  void attemptPlayback("user");
}

function pausePlaybackFromUserAction() {
  logPlayback("使用者按下暫停");
  userWantsPlayback = false;
  retryCount = 0;
  cancelReconnect("使用者暫停");
  cancelBufferingWatch("使用者暫停");
  invalidateActivePlayRequest();

  if (!radio.paused) {
    radio.pause();
  }

  setPlaybackState(PlaybackState.PAUSED);
}

function handleBufferingSignal(eventName) {
  logPlayback(`audio ${eventName}`);

  if (!userWantsPlayback) {
    return;
  }

  if (!navigator.onLine) {
    setPlaybackState(PlaybackState.OFFLINE);
    return;
  }

  startBufferingWatch(eventName);
}

playButton.addEventListener("click", () => {
  if (userWantsPlayback) {
    pausePlaybackFromUserAction();
  } else {
    startPlaybackFromUserAction();
  }
});

volumeSlider.addEventListener("pointerdown", rememberSliderStartVolume);
volumeSlider.addEventListener("keydown", rememberSliderStartVolume);
volumeSlider.addEventListener("input", setVolumeFromSlider);
muteButton.addEventListener("click", toggleMute);
radio.addEventListener("volumechange", syncVolumeUI);

radio.addEventListener("play", () => {
  logPlayback("audio play");

  if (!userWantsPlayback) {
    radio.pause();
    return;
  }

  if (playbackState !== PlaybackState.RECONNECTING) {
    setPlaybackState(PlaybackState.CONNECTING);
  }
});

radio.addEventListener("playing", () => {
  logPlayback("audio playing");

  if (!userWantsPlayback) {
    radio.pause();
    return;
  }

  cancelBufferingWatch("播放已恢復");
  cancelReconnect("播放已恢復");
  retryCount = 0;
  lastPlayingTime = Date.now();
  setPlaybackState(PlaybackState.PLAYING);
});

radio.addEventListener("waiting", () => {
  handleBufferingSignal("waiting");
});

radio.addEventListener("stalled", () => {
  handleBufferingSignal("stalled");
});

radio.addEventListener("canplay", () => {
  logPlayback("audio canplay");
  cancelBufferingWatch("audio canplay");

  if (!radio.paused || activePlayRequest !== null) {
    cancelReconnect("audio canplay");
  }

  if (
    userWantsPlayback &&
    playbackState === PlaybackState.BUFFERING
  ) {
    setPlaybackState(PlaybackState.CONNECTING);
  }
});

radio.addEventListener("loadedmetadata", () => {
  logPlayback("audio loadedmetadata");
});

radio.addEventListener("error", () => {
  console.warn("[Easy Radio] audio error", {
    code: radio.error?.code || null
  });
  cancelBufferingWatch("audio error");

  if (!userWantsPlayback) {
    return;
  }

  if (!navigator.onLine) {
    setPlaybackState(PlaybackState.OFFLINE);
    return;
  }

  setPlaybackState(PlaybackState.ERROR);
  scheduleReconnect("audio error");
});

radio.addEventListener("pause", () => {
  logPlayback("audio pause");

  if (!userWantsPlayback) {
    setPlaybackState(PlaybackState.PAUSED);
    return;
  }

  if (
    radio.ended ||
    playbackState === PlaybackState.OFFLINE ||
    playbackState === PlaybackState.RECONNECTING
  ) {
    return;
  }

  cancelBufferingWatch("audio 意外暫停");
  setPlaybackState(PlaybackState.ERROR);
  scheduleReconnect("audio 意外暫停");
});

radio.addEventListener("ended", () => {
  logPlayback("audio ended");
  cancelBufferingWatch("audio ended");

  if (!userWantsPlayback) {
    return;
  }

  setPlaybackState(PlaybackState.ERROR);
  scheduleReconnect("audio ended");
});

window.addEventListener("offline", () => {
  logPlayback("瀏覽器 offline");
  playbackStateBeforeOffline = playbackState;
  cancelReconnect("瀏覽器離線");
  cancelBufferingWatch("瀏覽器離線");
  setPlaybackState(PlaybackState.OFFLINE);
});

window.addEventListener("online", () => {
  logPlayback("瀏覽器 online");

  if (!userWantsPlayback) {
    setPlaybackState(
      playbackState === PlaybackState.PAUSED ||
        playbackStateBeforeOffline === PlaybackState.PAUSED
        ? PlaybackState.PAUSED
        : PlaybackState.READY
    );
    return;
  }

  if (isPlaybackActive()) {
    setPlaybackState(PlaybackState.PLAYING);
    return;
  }

  setPlaybackState(PlaybackState.RECONNECTING);
  scheduleReconnect("網路恢復");
});

window.EasyRadioPlayer = Object.freeze({
  getCurrentStation: () => currentStation,
  selectStation
});

initializeCurrentStation();
initializeVolumeControls();
initializeVersionDisplay();
updateClock();
updatePlaybackUI();

if (!navigator.onLine) {
  playbackStateBeforeOffline = PlaybackState.READY;
  setPlaybackState(PlaybackState.OFFLINE);
}

const millisecondsUntilNextMinute = 60000 - (Date.now() % 60000);
setTimeout(() => {
  updateClock();
  setInterval(updateClock, 60000);
}, millisecondsUntilNextMinute);
