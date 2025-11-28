const $ = (sel, doc = document) => doc.querySelector(sel);
const $$ = (sel, doc = document) => doc.querySelectorAll(sel);

const DEFAULT = {
  image: `url("./images/default.png")`,
  timeVolume: 2000, // mini second
  volume: 65, // %
  iconPlay: `<i class="ri-play-large-line"></i>`,
  iconPause: `<i class="ri-pause-large-line"></i>`,
  iconVolume: `<i class="ri-volume-up-line"></i>`,
  iconMuted: `<i class="ri-volume-mute-line"></i>`,
  amountVol: 10,
  skip: 5, // second
};

const refs = {
  // app
  appMusic: ".app__music",
  backgroundApp: ".background-app",

  // show
  showImage: ".show__image",
  showVolume: ".show__volume",
  bars: "#bars",

  // controls
  durationRange: ".duration__range",
  currentTime: ".current-time",
  totalTime: ".total-time",
  controls: ".controls",
  btnRepeat: ".controls__repeat",
  btnPrev: ".controls__prev",
  btnPlay: ".controls__play",
  btnNext: ".controls__next",
  btnShuffle: ".controls__shuffle",

  // action
  btnPlayList: ".action__list",
  btnLike: ".action__like",
  btnBack: ".action__back",
  volumeRange: ".volume__range",
  btnVolume: ".action__muted",
  btnMore: ".action__more",

  // info
  songInfoTitle: ".song-info__title",
  songInfoAuthor: ".song-info__author",
  headingPlaylist: ".heading__playlist",
  listClose: ".music__close",
  musicList: ".music__list",
  musicTitle: ".music__playlist__title",
  musicPlaying: ".music__item.playing",
};

function MokiMusic(selAudio) {
  this._audio = $(selAudio);
  this._currentSong = null;
  this._currentSongIndex = null;
  this.degSpin = 0;
  this.loop = false;
  this.shuffle = false;
  this.isSeek = false;
  this.muted = false;
  this.songsed = [];
  this._autoHiddenMore = null;
  this._ctx = null;
  this._analyser = null;
  this._frequencyData = null;
  this._srcNode = null;
  this._isAnimating = false;

  this._loadElements();
  this._loadEvents();
  this._loadData();
  this._loadSong(true);
  this._updateSongInfo();
  this._loadSetting();
  this._loadPlayList();
  this._loadHotkey();
}

MokiMusic.prototype._loadElements = function () {
  for (key in refs) {
    this[key] = $(refs[key]);
  }
  this.bars = $$(".music__bars .bar");
};

MokiMusic.prototype._loadEvents = function () {
  this._audio.addEventListener("loadedmetadata", () => {
    this._updateSongInfo();
  });

  // onPlay
  this._audio.addEventListener("play", () => {
    if (!this._ctx) this._createAudioContext();
    this._connectAudio();
    this._startVisualizer();
    const musicItems = $$(".music__item:not(.playing)", this.musicList);
    removesClass(musicItems, "s-active");
    const songIndex = this._playList.songs.findIndex((songId) => {
      return songId === this._currentSong.id;
    });
    musicItems[songIndex]?.classList?.add("s-active");
  });

  // onPause
  this._audio.addEventListener("pause", () => {
    this._stopSpinDics();
    this._stopVisualizer();
  });

  // onTimeupdate
  this._audio.addEventListener("timeupdate", () => {
    this._updateDuration(this.isSeek);
    this._startSpinDics();
  });

  // onEnded
  this._audio.addEventListener("ended", () => {
    if (this.loop) return;
    this.prevOrNext(true);
  });

  // Control next
  this.btnNext.addEventListener("click", () => {
    this.prevOrNext(true);
  });

  // Control prev
  this.btnPrev.addEventListener("click", () => {
    this.prevOrNext(false);
  });

  // Control play
  this.btnPlay.addEventListener("click", () => {
    this.togglePlay();
  });

  // Control repeat
  this.btnRepeat.addEventListener("click", (e) => {
    // set loop
    this.loop = !this.loop;
    this._audio.loop = this.loop;

    // set css active
    e.currentTarget.classList.toggle("s-active");
    this._saveSetting();
  });

  // Control Shuffle
  this.btnShuffle.addEventListener("click", (e) => {
    // set shuffle
    this.shuffle = !this.shuffle;

    // set css active
    e.currentTarget.classList.toggle("s-active");
    this._saveSetting();
  });

  // Control Volume
  this.showVolume.addEventListener("pointerenter", () => {
    clearTimeout(this._autoHiddenMore);
    this._autoHiddenMore = null;
  });

  // Control Volume
  this.showVolume.addEventListener("pointerleave", () => {
    this._autoHiddenMore = setTimeout(() => {
      this.showVolume.classList.add("hidden");
      this.btnMore.classList.remove("d-none");
    }, DEFAULT.timeVolume);
  });

  // action more
  this.btnMore.addEventListener("click", (e) => {
    this._showVolumeRange();
    this._autoHiddenShowVolume();
  });

  // action muted
  this.btnVolume.addEventListener("click", (e) => {
    this.toggleMuted();
  });

  // duration range
  this.durationRange.addEventListener("input", (e) => {
    this.isSeek = true;
    this._updateDuration(this.isSeek);
  });

  // duration range
  this.durationRange.addEventListener("change", (e) => {
    this._audio.currentTime = this.durationRange.value;
    this._updateDuration(this.isSeek);
    this.play();
    this.isSeek = false;
  });

  // Volume range
  this.volumeRange.addEventListener("input", (e) => {
    this._updateVolumne();
    this._saveSetting();
  });

  // action playlist
  this.btnPlayList.addEventListener("click", () => {
    this.controls.classList.add("view__list");
    this.appMusic.style.transform = `translateX(-50%)`;
  });

  // action listClose
  this.listClose.addEventListener("click", () => {
    this.controls.classList.remove("view__list");
    this.appMusic.style.transform = `translateX(0%)`;
  });
};

MokiMusic.prototype._showVolumeRange = function () {
  this.btnMore.classList.add("d-none");
  this.showVolume.classList.remove("hidden");
};

MokiMusic.prototype._autoHiddenShowVolume = function () {
  this._autoHiddenMore = setTimeout(() => {
    this.showVolume.classList.add("hidden");
    this.btnMore.classList.remove("d-none");
  }, DEFAULT.timeVolume);
};

MokiMusic.prototype._updateDuration = function () {
  const timeUse = this.isSeek
    ? this.durationRange.value
    : this._audio.currentTime;
  const val = Math.ceil((timeUse / this._audio.duration) * 100);
  if (typeof val !== "number" || val !== val) return;
  this.durationRange.style.setProperty("--val", `${val}%`);
  this.currentTime.textContent = formatDuration(timeUse);

  if (!this.isSeek) {
    this.durationRange.value = timeUse;
  }
};

MokiMusic.prototype._updateVolumne = function () {
  const val = this.volumeRange.value;
  this._audio.volume = val / 100;
  this.volumeRange.style.setProperty("--val", `${val}%`);
};

MokiMusic.prototype._changeVolume = function (amount) {
  this.volumeRange.value = Math.min(
    100,
    Math.max(0, Number(this.volumeRange.value) + amount)
  );
  this._updateVolumne();
  this._saveSetting();
  clearTimeout(this._autoHiddenMore);
  this._autoHiddenMore = null;
  this._showVolumeRange();
  this._autoHiddenShowVolume();
};

MokiMusic.prototype._saveSetting = function () {
  this.setting = {
    vol: this.volumeRange.value,
    loop: this.loop,
    shuffle: this.shuffle,
  };

  localStorage.setItem("setting", JSON.stringify(this.setting));
};

MokiMusic.prototype._startSpinDics = function () {
  if (this.spin || this._audio.paused) {
    return;
  }

  const rotate = () => {
    this.degSpin += 0.5;
    if (this.degSpin >= 360) this.degSpin -= 360;

    this.showImage.style.transform = `translate(-50%, -50%) rotate(${this.degSpin}deg)`;
    this.spin = requestAnimationFrame(rotate);
  };

  this.spin = requestAnimationFrame(rotate);
};

MokiMusic.prototype._stopSpinDics = function () {
  if (this.spin) {
    cancelAnimationFrame(this.spin);
  }
  this.spin = null;
};

MokiMusic.prototype._resetSpinDics = function () {
  this._stopSpinDics();
  this.degSpin = 0;
  this._startSpinDics();
};

MokiMusic.prototype._loadData = function () {
  this.data = {
    songs: [
      {
        id: 1,
        url: "./songs/song1.mp3",
        title: "Có duyên không nợ | Remix",
        author: "Tina Hồ",
        isLike: false,
        image: "./images/img1.png",
        duration: 0,
        isSelected: false,
      },
      {
        id: 2,
        url: "./songs/song2.mp3",
        title: "Nơi vực nơi trời | Remix",
        author: "Lê Bảo Bình",
        isLike: false,
        image: "./images/img2.png",
        duration: 0,
        isSelected: false,
      },
      {
        id: 5,
        url: "./songs/song5.mp3",
        title: "Xóa hết | Remix",
        author: "Du Thiên",
        isLike: false,
        image: "./images/img5.jpg",
        duration: 0,
        isSelected: false,
      },
      {
        id: 3,
        url: "./songs/song3.mp3",
        title: "Anh thôi nhân nhượng | Remix",
        author: "Dương Hoàng Phạm",
        isLike: false,
        image: "./images/img3.png",
        duration: 0,
        isSelected: false,
      },
      {
        id: 4,
        url: "./songs/song4.mp3",
        title: "Mất kết nối",
        author: "Dương Domic",
        isLike: false,
        image: "./images/img4.jpg",
        duration: 0,
        isSelected: false,
      },
    ],
    playList: [
      {
        id: 2,
        title: "Khi Remix Gọi Tên 😎",
        songs: [5, 1, 2, 3, 4],
        isSelected: true,
      },
      { id: 1, title: "Top Rankings ", songs: [4, 2, 1], isSelected: true },
    ],
  };
};

MokiMusic.prototype._loadSong = function (isFirst = false) {
  if (isFirst) {
    this._playList = this.data.playList[0];
    this._currentSongIndex = 0;
    this.headingPlaylist.textContent = this._playList.title;
  }

  const songId = this._playList.songs[this._currentSongIndex];
  this._currentSong = this._getSongById(songId);
  this.data.songs.forEach((song) => {
    song.isSelected = false;
  });
  this._currentSong.isSelected = true;
  this._loadMusicPlaying();
  this._audio.setAttribute("src", this._currentSong.url);
  this._audio.loop = this.loop;
  this._resetSpinDics();
};

MokiMusic.prototype._loadSetting = function () {
  this.setting = JSON.parse(localStorage.getItem("setting"));
  if (!this.setting) {
    this.setting = {
      vol: 65,
      loop: true,
      shuffle: false,
    };
    localStorage.setItem("setting", JSON.stringify(this.setting));
  }

  // volume
  this._audio.volume = this.setting.vol / 100;
  this.volumeRange.value = this.setting.vol;

  // loop
  this._audio.loop = this.setting.loop;
  this.loop = this.setting.loop;
  if (this.loop) {
    this.btnRepeat.classList.add("s-active");
  }

  // shuffle
  this.shuffle = this.setting.shuffle;
  if (this.shuffle) {
    this.btnShuffle.classList.add("s-active");
  }
  this._updateVolumne();
};

MokiMusic.prototype._createAudioContext = function () {
  this._ctx = new AudioContext();
  this._analyser = this._ctx.createAnalyser();

  this._analyser.fftSize = 64;
  this._analyser.smoothingTimeConstant = 0.6;

  this._frequencyData = new Uint8Array(this._analyser.frequencyBinCount);
};

MokiMusic.prototype._connectAudio = function () {
  if (!this._srcNode) {
    this._srcNode = this._ctx.createMediaElementSource(this._audio);
    this._srcNode.connect(this._analyser);
    this._analyser.connect(this._ctx.destination);
  }
};

MokiMusic.prototype._startVisualizer = function () {
  if (this._isAnimating) return;
  this._isAnimating = true;

  const animate = () => {
    if (!this._isAnimating) return;
    this._rafId = requestAnimationFrame(animate);
    this._analyser.getByteFrequencyData(this._frequencyData);
    const barCount = 8;
    const binSize = Math.floor(this._frequencyData.length / barCount);
    const maxHeight = 35;

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < binSize; j++) {
        sum += this._frequencyData[i * binSize + j];
      }

      const average = sum / binSize;

      const height = (average / 255) * maxHeight;
      this.bars[i].style.height = height + "px";
    }
  };

  animate();
};

MokiMusic.prototype._stopVisualizer = function () {
  this._isAnimating = false;
  if (this._rafId) {
    cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }
  this.bars.forEach((bar) => {
    bar.style.height = "0px";
  });
};

MokiMusic.prototype._loadMusicPlaying = function () {
  const songPlaying = this._currentSong;
  const songThumb = $(".music__thumbnail", this.musicPlaying);
  const songTitle = $(".music__title", this.musicPlaying);
  const songSinger = $(".music__singer", this.musicPlaying);
  songThumb.setAttribute("src", songPlaying.image);
  songTitle.textContent = truncateByWord(songPlaying.title);
  songTitle.title = songPlaying.title;
  songSinger.textContent = truncateByWord(songPlaying.author);
  songSinger.title = songPlaying.author;
};

MokiMusic.prototype._loadPlayList = function () {
  const dataSongId = this._playList.songs;
  if (!dataSongId.length) {
    return;
  }

  this._loadMusicPlaying();

  this.musicTitle.textContent = truncateByWord(this._playList.title);
  this.musicTitle.title = this._playList.title;

  const songs = this._playList.songs.map((songId) => {
    return this._getSongById(songId);
  });

  songs.forEach((song) => {
    const html = `
    <div class="music__item ${song.isSelected ? "s-active" : ""}">
      <img class="music__thumbnail" src="${song.image}">
      <div class="music__info">
        <p class="music__title">${song.title}</p>
        <p class="music__singer">${song.author}</p>
      </div>
    </div>`;

    const songEl = htmlToElement(html);
    songEl.addEventListener("click", () => {
      this.goToPlay(song.id);
    });
    this.musicList.appendChild(songEl);
  });
};

MokiMusic.prototype._loadHotkey = function () {
  document.addEventListener("keydown", (e) => {
    switch (e.code) {
      case "Space":
        e.preventDefault();
        this.togglePlay();
        break;

      case "ArrowUp":
        e.preventDefault();
        this._changeVolume(DEFAULT.amountVol);
        break;

      case "ArrowDown":
        e.preventDefault();
        this._changeVolume(-DEFAULT.amountVol);
        break;

      case "ArrowLeft":
        e.preventDefault();
        this._audio.currentTime = Math.min(
          this._audio.duration,
          Math.max(0, this._audio.currentTime - DEFAULT.skip)
        );
        break;

      case "ArrowRight":
        e.preventDefault();
        this._audio.currentTime = Math.min(
          this._audio.duration,
          Math.max(0, this._audio.currentTime + DEFAULT.skip)
        );
        break;

      case "Escape":
        e.preventDefault();
        this.controls.classList.remove("view__list");
        this.appMusic.style.transform = `translateX(0%)`;
        break;

      case "KeyM":
        e.preventDefault();
        this._changeVolume(0);
        this.toggleMuted();
        break;

      default:
        break;
    }
  });
};

MokiMusic.prototype._updateSongInfo = function () {
  // song info
  this.songInfoTitle.textContent = this._currentSong.title;
  this.songInfoAuthor.textContent = this._currentSong.author;

  // image
  const imageSong = this._currentSong.image
    ? this._currentSong.image
    : DEFAULT.image;
  this.showImage.style.backgroundImage = `url("${imageSong}")`;

  // background
  this.backgroundApp.style.backgroundImage = `url("${imageSong}")`;

  // Play
  this.btnPlay.innerHTML = this._audio.paused
    ? DEFAULT.iconPlay
    : DEFAULT.iconPause;

  // time
  this.currentTime.textContent = formatDuration(0);
  this.totalTime.textContent = formatDuration(this._audio.duration);

  // duration range
  this.durationRange.min = 0;
  this.durationRange.max = this._audio.duration;
  this.durationRange.value = 0;
};

MokiMusic.prototype.togglePlay = function () {
  if (this._audio.paused) {
    this.play();
  } else {
    this.pause();
  }
};

MokiMusic.prototype.toggleMuted = function () {
  this.muted = !this.muted;
  this._audio.muted = this.muted;
  const html = this.muted ? DEFAULT.iconMuted : DEFAULT.iconVolume;
  this.btnVolume.innerHTML = html;
};

MokiMusic.prototype.play = function () {
  this._audio.play();
  this.btnPlay.innerHTML = `<i class="ri-pause-large-line"></i>`;
};

MokiMusic.prototype.pause = function () {
  this._audio.pause();
  this.btnPlay.innerHTML = `<i class="ri-play-large-line"></i>`;
};

MokiMusic.prototype.goToPlay = function (id) {
  const song = this._getSongById(id);
  if (!song) {
    console.log(`Không tìm thấy song theo id:${id}`);
    return;
  }

  this._currentSongIndex = this._playList.songs.indexOf(id);
  this._loadSong();
  this.play();
};

MokiMusic.prototype._getSongById = function (id) {
  return this.data.songs.find((s) => s.id === id);
};

MokiMusic.prototype.prevOrNext = function (isNext = false) {
  const songs = this._playList.songs;
  const total = songs.length;

  if (this.shuffle) {
    if (total > 1) {
      if (this.songsed.length >= total) this._clearSonged();

      let newIndex;
      do {
        newIndex = getRandomInt(0, total - 1);
      } while (
        newIndex === this._currentSongIndex ||
        this.songsed.includes(newIndex)
      );

      this._currentSongIndex = newIndex;
      this._addSonged(newIndex);
    }
  } else {
    this._currentSongIndex = nextOrPrevIndex(
      this._currentSongIndex,
      isNext ? 1 : -1,
      total
    );
  }

  this._loadSong();
  this.play();
};

MokiMusic.prototype._addSonged = function (songId) {
  if (!this.songsed.includes(songId)) {
    this.songsed.push(songId);
  }
};

MokiMusic.prototype._clearSonged = function () {
  this.songsed.length = 0;
};

const player = new MokiMusic("#audio");

// Utils
function spinElement(el) {}

function htmlToElement(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}
function nextOrPrevIndex(current, step, length) {
  return (current + step + length) % length;
}

function formatDuration(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  const formattedMins = mins.toString().padStart(2, "0");
  const formattedSecs = secs.toString().padStart(2, "0");

  return `${formattedMins}:${formattedSecs}`;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function removesClass(els, className) {
  if (els && typeof className === "string") {
    els.forEach((el) => el.classList.remove(className));
  }
}

function truncateByWord(str, maxLength = 20) {
  if (str.length <= maxLength) {
    return str;
  }

  let truncated = str.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 0) {
    truncated = truncated.slice(0, lastSpace);
  }

  return truncated + "...";
}

function renderCopyright(sel, author = "moki", license = "học viên của F8.") {
  const yearText = new Date().getFullYear();
  const contentFotter = `© ${yearText}. @${author} - ${license}`;
  document.querySelector(sel).textContent = contentFotter;
}
renderCopyright("#copyright");
