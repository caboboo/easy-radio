const radio = document.getElementById("radio");
const playButton = document.getElementById("playButton");
const playIcon = document.getElementById("playIcon");
const playText = document.getElementById("playText");
const status = document.getElementById("status");
const statusText = document.getElementById("statusText");
const dateElement = document.getElementById("date");
const timeElement = document.getElementById("time");

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

async function startRadio() {
  try {
    setStatus("連線中，請稍候…", "is-loading");

    // 直播若曾中斷，重新載入串流可提高再次連線的成功率。
    if (radio.error) {
      radio.load();
    }

    await radio.play();
  } catch (error) {
    console.error(error);
    setPlayingUI(false);
    setStatus("無法播放，請再按一次", "is-error");
  }
}

function stopRadio() {
  radio.pause();
  setPlayingUI(false);
  setStatus("已暫停");
}

playButton.addEventListener("click", () => {
  if (radio.paused) {
    startRadio();
  } else {
    stopRadio();
  }
});

radio.addEventListener("playing", () => {
  setPlayingUI(true);
  setStatus("正在播放", "is-playing");
});

radio.addEventListener("waiting", () => {
  setStatus("網路緩衝中…", "is-loading");
});

radio.addEventListener("stalled", () => {
  setStatus("訊號不穩，重新連線中…", "is-loading");
});

radio.addEventListener("error", () => {
  setPlayingUI(false);
  setStatus("播放失敗，請檢查網路後再按播放", "is-error");
});

radio.addEventListener("pause", () => {
  if (!radio.ended) {
    setPlayingUI(false);
  }
});

updateClock();
setInterval(updateClock, 1000);
