const $ = (sel, doc = document) => doc.querySelector(sel);
const $$ = (sel, doc = document) => doc.querySelectorAll(sel);
const imgDefault = `url("./images/default.png")`;
const iconPlay = `<i class="ri-play-fill"></i>`;
const iconPause = `<i class="ri-pause-fill"></i>`;
const refs = {
  appMusic: ".app__music",
  backgroundApp: ".background-app",
  showImage: ".show__image",
  bars: "#bars",
  durationRange: ".duration__range",
  currentTime: ".current-time",
  totalTime: ".total-time",
  btnRepeat: ".controls__repeat",
  btnPrev: ".controls__prev",
  btnPlay: ".controls__play",
  btnNext: ".controls__next",
  btnShuffle: ".controls__shuffle",
  btnPlayList: ".action__list",
  btnLike: ".action__like",
  btnBack: ".action__back",
  songInfoTitle: ".song-info__title",
  songInfoAuthor: ".song-info__author",
  headingPlaylist: ".heading__playlist",
  btnMore: ".action__more",
  volumeRange: ".volume__range",
  btnVolume: ".action__muted",
  showVolume: ".show__volume",
  listClose: ".list__close",
  audio: "#audio",
};

// const refs = {
//   bar: "#bars .bar",
// };

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
  this.init();
}

MokiMusic.prototype.init = function () {
  this._loadElements();
  this._loadEvents();
  this._loadData();
  this._loadSong();
  this._updateSongInfo();
  this._loadSetting();
};

MokiMusic.prototype._loadElements = function () {
  for (key in refs) {
    this[key] = $(refs[key]);
  }
};

MokiMusic.prototype._loadEvents = function () {
  this._audio.addEventListener("loadedmetadata", () => {
    this._updateSongInfo();
  });

  // play
  this._audio.addEventListener("play", () => console.log("play fired"));
  this._audio.addEventListener("playing", () => {});

  this._audio.addEventListener("timeupdate", () => {
    this._updateDuration(this.isSeek);
    this._startSpinDics();
  });

  this._audio.addEventListener("pause", () => {
    // stop spin
    if (this.spin) {
      console.log("clear");
      clearInterval(this.spin);
      this.spin = null;
      console.log(this.spin);
    }
  });

  this._audio.addEventListener("ended", () => {
    console.log("ended");
    if (this.loop) return;
    this.prevOrNext(true);
  });

  this.btnNext.addEventListener("click", () => {
    this.prevOrNext(true);
  });

  this.btnPrev.addEventListener("click", () => {
    this.prevOrNext(false);
  });

  this.btnPlay.addEventListener("click", () => {
    this.handlerPlay();
  });

  this.btnRepeat.addEventListener("click", (e) => {
    // set loop
    this.loop = !this.loop;
    this._audio.loop = this.loop;
    // set css active
    e.currentTarget.classList.toggle("s-active");
    this._saveSetting();
  });

  this.btnShuffle.addEventListener("click", (e) => {
    // set shuffle
    this.shuffle = !this.shuffle;
    // set css active
    e.currentTarget.classList.toggle("s-active");
    this._saveSetting();
  });

  this.showVolume.addEventListener("pointerenter", () => {
    clearTimeout(this._autoHiddenMore);
    this._autoHiddenMore = null;
  });

  this.showVolume.addEventListener("pointerleave", () => {
    this._autoHiddenMore = setTimeout(() => {
      this.showVolume.classList.add("hidden");
    }, 2000);
  });

  this.btnMore.addEventListener("click", (e) => {
    this.showVolume.classList.toggle("hidden");
    const isHidden = this.showVolume.classList.contains("hidden");
    if (!isHidden) {
      this._autoHiddenMore = setTimeout(() => {
        this.showVolume.classList.add("hidden");
      }, 2000);
    }
  });

  this.btnVolume.addEventListener("click", (e) => {
    // set muted
    this.muted = !this.muted;
    this._audio.muted = this.muted;
    // set html
    const html = this.muted
      ? `<i class="ri-volume-mute-line"></i>`
      : `<i class="ri-volume-up-line"></i>`;
    e.currentTarget.innerHTML = html;
  });

  this.durationRange.addEventListener("input", (e) => {
    console.log("input");
    this.isSeek = true;
    this._updateDuration(this.isSeek);
  });

  this.durationRange.addEventListener("change", (e) => {
    console.log("change");
    this._audio.currentTime = this.durationRange.value;
    this._updateDuration(this.isSeek);
    this.play();
    this.isSeek = false;
  });

  this.volumeRange.addEventListener("input", (e) => {
    this._updateVolumne();
    this._saveSetting();
  });

  this.btnPlayList.addEventListener("click", () => {
    this.appMusic.style.transform = `translateX(-50%)`;
  });

  this.listClose.addEventListener("click", () => {
    this.appMusic.style.transform = `translateX(0%)`;
  });
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

  this.spin = setInterval(() => {
    this.degSpin += 0.5;
    this.showImage.style.transform = `translate(-50%, -50%) rotate(${this.degSpin}deg)`;
    if (this.degSpin === 360) {
      this.degSpin = 0;
    }
  }, 16);
};

MokiMusic.prototype._loadData = function () {
  localStorage.clear();
  this.data = JSON.parse(localStorage.getItem("data"));
  this.setting = JSON.parse(localStorage.getItem("setting"));
  if (!this.data) {
    this.data = {
      songs: [
        {
          id: 1,
          url: "./songs/song1.mp3",
          title: "Có duyên không nợ | Remix",
          author: "NB3 Hoài Bảo",
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
          id: 3,
          url: "./songs/song3.mp3",
          title: "Anh thôi nhân nhượng | Remix",
          author: "An Clock",
          isLike: false,
          image: "./images/img3.png",
          duration: 0,
          isSelected: false,
        },
        {
          id: 4,
          url: "./songs/song4.mp3",
          title: "Mất kết nối | Remix",
          author: "Dương Domic",
          isLike: false,
          image: "./images/img4.jpg",
          duration: 0,
          isSelected: false,
        },
      ],
      playList: [
        { id: 2, title: "Bài Hát Yêu Thích 💗", songs: [1, 2, 3, 4] },
        { id: 1, title: "Top Rankings ", songs: [4, 2, 1] },
      ],
    };
    localStorage.setItem("data", JSON.stringify(this.data));
  }
  if (!this.setting) {
    this.setting = {
      vol: 65,
      loop: true,
      shuffle: false,
    };
    localStorage.setItem("setting", JSON.stringify(this.setting));
  }
  this._loadSong(true);
};

MokiMusic.prototype._loadSong = function (isFirst = false) {
  if (isFirst) {
    this._playList = this.data.playList[0];
    this._currentSongIndex = 0;
    this.headingPlaylist.textContent = this._playList.title;
  }

  const songId = this._playList.songs[this._currentSongIndex];
  this._currentSong = this._getSongById(songId);
  this._audio.setAttribute("src", this._currentSong.url);
  this._audio.loop = this.loop;
};

MokiMusic.prototype._loadSetting = function () {
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

MokiMusic.prototype._updateSongInfo = function () {
  // get song and load metadata
  // song info
  this.songInfoTitle.textContent = this._currentSong.title;
  this.songInfoAuthor.textContent = this._currentSong.author;
  // image
  const imageSong = this._currentSong.image
    ? this._currentSong.image
    : imgDefault;
  this.backgroundApp.style.backgroundImage = `url("${imageSong}")`;
  // this.bar
  this.showImage.style.backgroundImage = `url("${imageSong}")`;
  // Play
  this.btnPlay.innerHTML = this._audio.paused ? iconPlay : iconPause;
  // time
  this.currentTime.textContent = formatDuration(0);
  this.totalTime.textContent = formatDuration(this._audio.duration);
  // duration range
  this.durationRange.min = 0;
  this.durationRange.max = this._audio.duration;
  this.durationRange.value = 0;
};

MokiMusic.prototype.handlerPlay = function () {
  if (this._audio.paused) {
    this.play();
  } else {
    this.pause();
  }
};

MokiMusic.prototype.play = function () {
  this._audio.play();
  this.btnPlay.innerHTML = `<i class="ri-pause-fill"></i>`;
};

MokiMusic.prototype.pause = function () {
  this._audio.pause();
  this.btnPlay.innerHTML = `<i class="ri-play-fill"></i>`;
};

MokiMusic.prototype.goToPlay = function (id) {
  const song = this._getSongById(id);
  if (!song) {
    console.log(`Không tìm thấy song theo id:${id}`);
    return;
  }

  this._audio.setAttribute("src", song.url);
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

function nextOrPrevIndex(current, step, length) {
  console.log(current, step, length);
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

function renderCopyright(sel, author = "moki", license = "Học viên của F8.") {
  const yearText = new Date().getFullYear();
  const contentFotter = `© ${yearText}. @${author} - ${license}`;
  document.querySelector(sel).textContent = contentFotter;
}
renderCopyright("#copyright");
