const radio = document.getElementById("radio");
const playButton = document.getElementById("playButton");
const playIcon = document.getElementById("playIcon");
const playText = document.getElementById("playText");
const status = document.getElementById("status");
const statusText = document.getElementById("statusText");
const dateElement = document.getElementById("date");
const timeElement = document.getElementById("time");
const volumeNote = document.getElementById("volumeNote");
const desktopVolume = document.getElementById("desktopVolume");
const volumeSlider = document.getElementById("volumeSlider");
const volumeText = document.getElementById("volumeText");
const muteButton = document.getElementById("muteButton");

let wantsToPlay = false;
let playRequestId = 0;
let volumeBeforeMute = 1;
let volumeAtSliderStart = 1;

function updateClock() {
  const now = new Date();

  dateElement.textContent = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(now);

  timeElement.textContent = new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(now);
}

function setStatus(message, state = "") {
  statusText.textContent = message;
  status.className = `status${state ? ` ${state}` : ""}`;
}

function setPlayingUI(isPlaying) {
  playButton.classList.toggle("is-playing", isPlaying);
  playButton.setAttribute("aria-pressed", String(isPlaying));
  playIcon.textContent = isPlaying ? "Ⅱ" : "▶";
  playText.textContent = isPlaying ? "暫停播放" : "播放";
}

function isIOSDevice() {
  const isClassicIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIPadDesktopMode =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return isClassicIOS || isIPadDesktopMode;
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
  if (isIOSDevice()) {
    volumeNote.hidden = false;
    desktopVolume.hidden = true;
    return;
  }

  volumeNote.hidden = true;
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

async function startRadio() {
  wantsToPlay = true;
  const requestId = ++playRequestId;

  try {
    setStatus("連線中，請稍候…", "is-loading");

    // 直播若曾中斷，重新載入串流可提高再次連線的成功率。
    if (radio.error || radio.ended) {
      radio.load();
    }

    await radio.play();
  } catch (error) {
    if (!wantsToPlay || requestId !== playRequestId) {
      return;
    }

    console.error(error);
    wantsToPlay = false;
    setPlayingUI(false);
    setStatus("無法播放，請再按一次", "is-error");
  }
}

function stopRadio() {
  wantsToPlay = false;
  playRequestId += 1;
  radio.pause();
  setPlayingUI(false);
  setStatus("已暫停");
}

playButton.addEventListener("click", () => {
  if (wantsToPlay || !radio.paused) {
    stopRadio();
  } else {
    startRadio();
  }
});

volumeSlider.addEventListener("pointerdown", rememberSliderStartVolume);
volumeSlider.addEventListener("keydown", rememberSliderStartVolume);
volumeSlider.addEventListener("input", setVolumeFromSlider);
muteButton.addEventListener("click", toggleMute);
radio.addEventListener("volumechange", syncVolumeUI);

radio.addEventListener("playing", () => {
  if (!wantsToPlay) {
    radio.pause();
    return;
  }

  setPlayingUI(true);
  setStatus("正在播放", "is-playing");
});

radio.addEventListener("waiting", () => {
  if (wantsToPlay) {
    setStatus("網路緩衝中…", "is-loading");
  }
});

radio.addEventListener("stalled", () => {
  if (wantsToPlay) {
    setStatus("訊號不穩，請稍候…", "is-loading");
  }
});

radio.addEventListener("error", () => {
  if (!wantsToPlay) {
    return;
  }

  wantsToPlay = false;
  playRequestId += 1;
  setPlayingUI(false);
  setStatus("播放失敗，請檢查網路後再按播放", "is-error");
});

radio.addEventListener("pause", () => {
  if (!radio.ended) {
    wantsToPlay = false;
    playRequestId += 1;
    setPlayingUI(false);
    setStatus("已暫停");
  }
});

radio.addEventListener("ended", () => {
  wantsToPlay = false;
  playRequestId += 1;
  setPlayingUI(false);
  setStatus("播放已結束，請再按播放");
});

initializeVolumeControls();
updateClock();

const millisecondsUntilNextMinute = 60000 - (Date.now() % 60000);
setTimeout(() => {
  updateClock();
  setInterval(updateClock, 60000);
}, millisecondsUntilNextMinute);
