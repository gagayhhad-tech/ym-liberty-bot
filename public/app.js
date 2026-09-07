/**
 * Yandex Music Liberty - Mobile Web PWA Client
 * Handles Audio Engine, Navigation, Search, Library, and YM Liberty Streams
 */

(() => {
  'use strict';

  // --- State ---
  const state = {
    currentTrack: null,
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 'off', // 'off' | 'all' | 'one'
    token: localStorage.getItem('ym_token') || '',
    user: null,
    history: JSON.parse(localStorage.getItem('ym_history') || '[]'),
    popularTracks: [],
    likedTracks: [],
    isSeeking: false,
    activeView: 'view-home',
  };

  // --- DOM Elements Cache ---
  const dom = {
    audio: document.getElementById('audio-element'),
    views: document.querySelectorAll('.view'),
    navItems: document.querySelectorAll('.nav-item'),
    headerAvatar: document.getElementById('header-avatar'),
    btnHeaderAccount: document.getElementById('btn-header-account'),
    
    // Home View
    popularList: document.getElementById('popular-tracks-list'),
    recentList: document.getElementById('recent-tracks-list'),
    btnStartVibe: document.getElementById('btn-start-vibe'),
    greetingText: document.getElementById('greeting-text'),

    // Search View
    searchInput: document.getElementById('search-input'),
    btnSearchClear: document.getElementById('btn-search-clear'),
    searchResultsList: document.getElementById('search-results-list'),
    searchLoading: document.getElementById('search-loading'),
    tagChips: document.querySelectorAll('.tag-chip'),

    // Library View
    libraryAuthPrompt: document.getElementById('library-auth-prompt'),
    libraryContent: document.getElementById('library-content'),
    likedTracksList: document.getElementById('liked-tracks-list'),
    likedCountText: document.getElementById('liked-count-text'),
    btnPlayLiked: document.getElementById('btn-play-liked'),
    btnGotoSettings: document.getElementById('btn-goto-settings'),

    // Settings View
    inputToken: document.getElementById('input-token'),
    btnSaveToken: document.getElementById('btn-save-token'),
    tokenStatus: document.getElementById('token-status'),
    btnHelpToken: document.getElementById('btn-help-token'),
    modalTokenHelp: document.getElementById('modal-token-help'),
    btnCloseTokenHelp: document.getElementById('btn-close-token-help'),
    libertyDbStatus: document.getElementById('liberty-db-status'),
    libertyDbCount: document.getElementById('liberty-db-count'),

    // Mini Player
    miniPlayer: document.getElementById('mini-player'),
    miniCover: document.getElementById('mini-cover'),
    miniTitle: document.getElementById('mini-title'),
    miniArtist: document.getElementById('mini-artist'),
    miniLibertyBadge: document.getElementById('mini-liberty-badge'),
    btnMiniPlay: document.getElementById('btn-mini-play'),
    btnMiniLike: document.getElementById('btn-mini-like'),
    miniProgressFill: document.getElementById('mini-progress-fill'),

    // Full Player Modal Sheet
    playerModal: document.getElementById('player-modal'),
    playerCover: document.getElementById('player-cover'),
    playerTitle: document.getElementById('player-title'),
    playerArtist: document.getElementById('player-artist'),
    playerLibertyBadge: document.getElementById('player-liberty-badge'),
    btnPlayerClose: document.getElementById('btn-player-close'),
    btnPlayerLike: document.getElementById('btn-player-like'),
    btnPlayerShuffle: document.getElementById('btn-player-shuffle'),
    btnPlayerPrev: document.getElementById('btn-player-prev'),
    btnPlayerPlay: document.getElementById('btn-player-play'),
    btnPlayerNext: document.getElementById('btn-player-next'),
    btnPlayerRepeat: document.getElementById('btn-player-repeat'),
    playerSeekContainer: document.getElementById('player-seek-container'),
    playerSeekFill: document.getElementById('player-seek-fill'),
    playerSeekThumb: document.getElementById('player-seek-thumb'),
    playerTimeCurrent: document.getElementById('player-time-current'),
    playerTimeTotal: document.getElementById('player-time-total'),
    playerAmbient: document.getElementById('player-ambient'),
    playerSourceInfo: document.getElementById('player-source-info'),
  };

  // --- Utilities ---
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Доброе утро';
    if (hour >= 12 && hour < 18) return 'Добрый день';
    if (hour >= 18 && hour < 23) return 'Добрый вечер';
    return 'Доброй ночи';
  }

  function showToast(message, isError = false) {
    const existing = document.querySelector('.app-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.style.cssText = `
      position: fixed;
      top: calc(16px + env(safe-area-inset-top, 0px));
      left: 50%;
      transform: translateX(-50%);
      background: ${isError ? 'rgba(230, 57, 70, 0.95)' : 'rgba(30, 30, 32, 0.95)'};
      color: #fff;
      padding: 10px 18px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      z-index: 999;
      box-shadow: 0 4px 18px rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.15);
      animation: fadeIn 0.25s ease;
      max-width: 90%;
      text-align: center;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // --- Audio Engine ---
  class AudioEngine {
    constructor() {
      this.initMediaSession();
      this.bindAudioEvents();
    }

    bindAudioEvents() {
      dom.audio.addEventListener('play', () => {
        state.isPlaying = true;
        this.updatePlayState();
      });

      dom.audio.addEventListener('pause', () => {
        state.isPlaying = false;
        this.updatePlayState();
      });

      dom.audio.addEventListener('timeupdate', () => {
        if (state.isSeeking) return;
        const current = dom.audio.currentTime;
        const duration = dom.audio.duration || (state.currentTrack ? state.currentTrack.durationMs / 1000 : 0);
        const percent = duration > 0 ? (current / duration) * 100 : 0;

        dom.miniProgressFill.style.width = `${percent}%`;
        dom.playerSeekFill.style.width = `${percent}%`;
        dom.playerSeekThumb.style.left = `${percent}%`;
        dom.playerTimeCurrent.textContent = formatTime(current);

        if (duration > 0) {
          dom.playerTimeTotal.textContent = formatTime(duration);
        }
      });

      dom.audio.addEventListener('loadedmetadata', () => {
        const duration = dom.audio.duration;
        if (duration && !isNaN(duration)) {
          dom.playerTimeTotal.textContent = formatTime(duration);
        }
      });

      dom.audio.addEventListener('ended', () => {
        if (state.repeatMode === 'one') {
          dom.audio.currentTime = 0;
          dom.audio.play();
        } else {
          this.playNext();
        }
      });

      dom.audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        showToast('Ошибка воспроизведения аудио', true);
        state.isPlaying = false;
        this.updatePlayState();
      });
    }

    initMediaSession() {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => this.resume());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrev());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime && dom.audio.duration) {
            dom.audio.currentTime = details.seekTime;
          }
        });
      }
    }

    async playTrack(track, queue = null) {
      if (!track) return;

      if (queue) {
        state.queue = queue;
        state.queueIndex = queue.findIndex(t => String(t.id) === String(track.id));
      }

      state.currentTrack = track;
      this.addToHistory(track);
      this.updatePlayerUI(track);

      dom.miniPlayer.classList.remove('hidden');

      try {
        let streamUrl = track.streamUrl;
        let isLiberty = track.isLiberty;

        // Fetch stream if not directly provided
        if (!streamUrl) {
          showToast(`Загрузка: ${track.title}...`);
          const params = new URLSearchParams({ trackId: track.id });
          if (state.token) params.append('token', state.token);

          const res = await fetch(`/api/stream?${params.toString()}`);
          const data = await res.json();

          if (!res.ok || !data.streamUrl) {
            if (data.needAuth) {
              showToast('Трек требует Яндекс Плюс токен в Настройках', true);
              switchView('view-settings');
              return;
            }
            throw new Error(data.error || 'Не удалось получить поток');
          }

          streamUrl = data.streamUrl;
          isLiberty = Boolean(data.isLiberty);
          track.streamUrl = streamUrl;
          track.isLiberty = isLiberty;
        }

        dom.audio.src = streamUrl;
        await dom.audio.play();
        state.isPlaying = true;
        this.updatePlayState();

        // Update footer info
        dom.playerSourceInfo.textContent = isLiberty
          ? '🕊️ YM Liberty CDN (Hugging Face) • 320 kbps MP3'
          : '⚡ Яндекс Музыка Official CDN • HQ MP3';

        // Update MediaSession
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artists || 'Неизвестен',
            album: isLiberty ? 'YM Liberty (Без цензуры)' : 'Яндекс Музыка',
            artwork: [
              { src: track.coverUri || '/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: track.coverUri || '/icon-512.png', sizes: '512x512', type: 'image/png' },
            ],
          });
        }
      } catch (err) {
        console.error('Play error:', err);
        showToast(err.message || 'Ошибка запуска трека', true);
      }
    }

    togglePlay() {
      if (!state.currentTrack) {
        if (state.popularTracks.length > 0) {
          this.playTrack(state.popularTracks[0], state.popularTracks);
        }
        return;
      }

      if (dom.audio.paused) {
        this.resume();
      } else {
        this.pause();
      }
    }

    resume() {
      dom.audio.play().catch(e => console.warn('Resume error:', e));
    }

    pause() {
      dom.audio.pause();
    }

    playNext() {
      if (!state.queue.length) return;

      let nextIndex = state.queueIndex + 1;
      if (state.isShuffle) {
        nextIndex = Math.floor(Math.random() * state.queue.length);
      } else if (nextIndex >= state.queue.length) {
        if (state.repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return; // End of queue
        }
      }

      state.queueIndex = nextIndex;
      this.playTrack(state.queue[nextIndex]);
    }

    playPrev() {
      if (!state.queue.length) return;

      // If playing > 3s, restart current track
      if (dom.audio.currentTime > 3) {
        dom.audio.currentTime = 0;
        return;
      }

      let prevIndex = state.queueIndex - 1;
      if (prevIndex < 0) {
        prevIndex = state.queue.length - 1;
      }

      state.queueIndex = prevIndex;
      this.playTrack(state.queue[prevIndex]);
    }

    seek(fraction) {
      const duration = dom.audio.duration || (state.currentTrack ? state.currentTrack.durationMs / 1000 : 0);
      if (duration > 0) {
        dom.audio.currentTime = fraction * duration;
      }
    }

    updatePlayState() {
      const playIcon = state.isPlaying ? '⏸' : '▶';
      dom.btnMiniPlay.textContent = playIcon;
      dom.btnPlayerPlay.textContent = playIcon;

      // Update .playing active class in lists
      document.querySelectorAll('.track-item').forEach(el => {
        const id = el.dataset.trackId;
        if (state.currentTrack && String(id) === String(state.currentTrack.id)) {
          el.classList.add('playing');
        } else {
          el.classList.remove('playing');
        }
      });
    }

    updatePlayerUI(track) {
      const cover = track.coverUri || '/favicon.png';
      const isLiberty = Boolean(track.isLiberty);

      // Mini Player
      dom.miniCover.src = cover;
      dom.miniTitle.textContent = track.title;
      dom.miniArtist.textContent = track.artists || '—';
      dom.miniLibertyBadge.classList.toggle('hidden', !isLiberty);

      // Full Player
      dom.playerCover.src = cover;
      dom.playerTitle.textContent = track.title;
      dom.playerArtist.textContent = track.artists || '—';
      dom.playerLibertyBadge.classList.toggle('hidden', !isLiberty);
      dom.playerTimeTotal.textContent = formatTime((track.durationMs || 0) / 1000);

      // Update ambient gradient color based on Liberty state
      if (isLiberty) {
        dom.playerAmbient.style.background = 'radial-gradient(circle at 50% 30%, rgba(74, 158, 255, 0.35) 0%, transparent 70%)';
      } else {
        dom.playerAmbient.style.background = 'radial-gradient(circle at 50% 30%, rgba(254, 212, 43, 0.25) 0%, transparent 70%)';
      }

      this.updateLikeButtons(track);
    }

    updateLikeButtons(track) {
      const isLiked = state.likedTracks.some(t => String(t.id) === String(track.id));
      const icon = isLiked ? '❤️' : '🤍';
      dom.btnMiniLike.textContent = icon;
      dom.btnPlayerLike.textContent = icon;
    }

    addToHistory(track) {
      const filtered = state.history.filter(t => String(t.id) !== String(track.id));
      filtered.unshift(track);
      state.history = filtered.slice(0, 30);
      localStorage.setItem('ym_history', JSON.stringify(state.history));
      renderHistoryList();
    }
  }

  const audio = new AudioEngine();

  // --- View Management ---
  function switchView(viewId) {
    state.activeView = viewId;

    dom.views.forEach(v => {
      v.classList.toggle('active', v.id === viewId);
    });

    dom.navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.target === viewId);
    });

    window.scrollTo(0, 0);

    // Refresh view specific data
    if (viewId === 'view-library') {
      loadLibrary();
    }
  }

  // --- Render Functions ---
  function createTrackElement(track, onPlay) {
    const item = document.createElement('div');
    item.className = `track-item ${state.currentTrack && String(state.currentTrack.id) === String(track.id) ? 'playing' : ''}`;
    item.dataset.trackId = track.id;

    const cover = track.coverUri || '/favicon.png';
    const isLiberty = Boolean(track.isLiberty);

    item.innerHTML = `
      <img class="track-cover" src="${cover}" alt="Cover" loading="lazy">
      <div class="track-info">
        <div class="track-title-row">
          <span class="track-title">${escapeHtml(track.title)}</span>
          ${isLiberty ? '<span class="badge-liberty" title="Без цензуры">🕊️</span>' : ''}
        </div>
        <span class="track-artist">${escapeHtml(track.artists || 'Неизвестен')}</span>
      </div>
      <button class="track-action-btn" title="Воспроизвести">▶</button>
    `;

    item.addEventListener('click', () => {
      if (onPlay) onPlay(track);
    });

    return item;
  }

  function renderPopularTracks(tracks) {
    dom.popularList.innerHTML = '';
    if (!tracks || !tracks.length) {
      dom.popularList.innerHTML = '<p class="empty-state">Хиты загружаются...</p>';
      return;
    }

    tracks.forEach(track => {
      const card = document.createElement('div');
      card.className = 'popular-card';
      const cover = track.coverUri || '/favicon.png';

      card.innerHTML = `
        <div class="popular-card-cover-wrapper">
          <img class="popular-card-cover" src="${cover}" alt="${escapeHtml(track.title)}" loading="lazy">
          <div class="popular-card-play-btn">▶</div>
        </div>
        <div class="popular-card-title">${escapeHtml(track.title)}</div>
        <div class="popular-card-artist">${escapeHtml(track.artists || 'Неизвестен')}</div>
      `;

      card.addEventListener('click', () => {
        audio.playTrack(track, tracks);
      });

      dom.popularList.appendChild(card);
    });
  }

  function renderHistoryList() {
    dom.recentList.innerHTML = '';
    if (!state.history.length) {
      dom.recentList.innerHTML = '<p class="empty-state">Вы ещё ничего не слушали</p>';
      return;
    }

    state.history.slice(0, 8).forEach(track => {
      const el = createTrackElement(track, () => {
        audio.playTrack(track, state.history);
      });
      dom.recentList.appendChild(el);
    });
  }

  function renderSearchResults(tracks) {
    dom.searchResultsList.innerHTML = '';
    if (!tracks || !tracks.length) {
      dom.searchResultsList.innerHTML = `
        <div class="search-placeholder-msg">
          <span class="placeholder-icon">😕</span>
          <p>Ничего не найдено</p>
          <small>Попробуйте изменить запрос</small>
        </div>
      `;
      return;
    }

    tracks.forEach(track => {
      const el = createTrackElement(track, () => {
        audio.playTrack(track, tracks);
      });
      dom.searchResultsList.appendChild(el);
    });
  }

  function renderLikedTracks(tracks) {
    dom.likedTracksList.innerHTML = '';
    if (!tracks || !tracks.length) {
      dom.likedTracksList.innerHTML = '<p class="empty-state">Нет сохраненных треков</p>';
      dom.likedCountText.textContent = '0 треков';
      return;
    }

    dom.likedCountText.textContent = `${tracks.length} треков`;

    tracks.forEach(track => {
      const el = createTrackElement(track, () => {
        audio.playTrack(track, tracks);
      });
      dom.likedTracksList.appendChild(el);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- API Integrations ---
  async function loadPopularTracks() {
    try {
      const res = await fetch('/api/popular');
      const data = await res.json();
      if (data.tracks && data.tracks.length) {
        state.popularTracks = data.tracks;
        renderPopularTracks(data.tracks);
      }
    } catch (err) {
      console.warn('Failed to load popular tracks:', err);
    }
  }

  let searchTimeout = null;
  async function performSearch(query) {
    query = (query || '').trim();
    if (!query) {
      dom.searchResultsList.innerHTML = `
        <div class="search-placeholder-msg">
          <span class="placeholder-icon">🎧</span>
          <p>Введите запрос для поиска по всей Яндекс Музыке</p>
          <small>Треки из базы YM Liberty отмечены бейджем 🕊️</small>
        </div>
      `;
      dom.btnSearchClear.classList.add('hidden');
      dom.searchLoading.classList.add('hidden');
      return;
    }

    dom.btnSearchClear.classList.remove('hidden');
    dom.searchLoading.classList.remove('hidden');

    try {
      const params = new URLSearchParams({ q: query });
      if (state.token) params.append('token', state.token);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();

      dom.searchLoading.classList.add('hidden');

      if (data.tracks) {
        renderSearchResults(data.tracks);
      } else {
        renderSearchResults([]);
      }
    } catch (err) {
      console.error('Search request error:', err);
      dom.searchLoading.classList.add('hidden');
      showToast('Ошибка поиска', true);
    }
  }

  async function loadLibrary() {
    if (!state.token) {
      dom.libraryAuthPrompt.classList.remove('hidden');
      dom.libraryContent.classList.add('hidden');
      return;
    }

    dom.libraryAuthPrompt.classList.add('hidden');
    dom.libraryContent.classList.remove('hidden');

    try {
      const res = await fetch(`/api/library?token=${encodeURIComponent(state.token)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        showToast(data.error || 'Ошибка загрузки коллекции', true);
        dom.tokenStatus.textContent = 'Ошибка: неверный токен';
        dom.tokenStatus.style.color = '#e63946';
        return;
      }

      state.user = data.user;
      state.likedTracks = data.tracks || [];

      if (state.user && state.user.login) {
        dom.headerAvatar.textContent = state.user.login[0].toUpperCase();
        dom.headerAvatar.style.background = '#fed42b';
        dom.headerAvatar.style.color = '#000';
        dom.headerAvatar.style.fontWeight = '700';
      }

      renderLikedTracks(state.likedTracks);
    } catch (err) {
      console.error('Library fetch error:', err);
      showToast('Не удалось загрузить коллекцию', true);
    }
  }

  async function verifyAndSaveToken(token) {
    token = (token || '').trim();
    if (!token) {
      localStorage.removeItem('ym_token');
      state.token = '';
      dom.tokenStatus.textContent = 'Токен удален';
      dom.tokenStatus.style.color = '#929298';
      dom.headerAvatar.textContent = '👤';
      dom.headerAvatar.style.background = '#2a2a2a';
      dom.headerAvatar.style.color = '#fff';
      return;
    }

    dom.tokenStatus.textContent = 'Проверка токена...';
    dom.tokenStatus.style.color = '#fed42b';

    try {
      const res = await fetch(`/api/library?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        dom.tokenStatus.textContent = `Ошибка: ${data.error || 'Недействительный токен'}`;
        dom.tokenStatus.style.color = '#e63946';
        return;
      }

      state.token = token;
      localStorage.setItem('ym_token', token);
      state.user = data.user;

      dom.tokenStatus.textContent = `✓ Успешно: ${data.user.fullName || data.user.login} (${data.user.hasPlus ? 'Плюс активен' : 'Без Плюса'})`;
      dom.tokenStatus.style.color = '#48bb78';

      dom.headerAvatar.textContent = (data.user.login || 'U')[0].toUpperCase();
      dom.headerAvatar.style.background = '#fed42b';
      dom.headerAvatar.style.color = '#000';
      dom.headerAvatar.style.fontWeight = '700';

      showToast('Токен Яндекс сохранен!');
    } catch (err) {
      dom.tokenStatus.textContent = 'Ошибка сети при проверке токена';
      dom.tokenStatus.style.color = '#e63946';
    }
  }

  // --- Event Listeners ---
  function initEventListeners() {
    dom.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const target = item.dataset.target;
        if (target) switchView(target);
      });
    });

    dom.btnHeaderAccount.addEventListener('click', () => {
      switchView('view-settings');
    });

    dom.btnStartVibe.addEventListener('click', () => {
      if (state.likedTracks.length > 0) {
        audio.playTrack(state.likedTracks[0], state.likedTracks);
      } else if (state.popularTracks.length > 0) {
        audio.playTrack(state.popularTracks[0], state.popularTracks);
      } else {
        showToast('Загружаем треки...');
      }
      dom.playerModal.classList.remove('closed');
    });

    dom.btnPlayLiked.addEventListener('click', () => {
      if (state.likedTracks.length > 0) {
        audio.playTrack(state.likedTracks[0], state.likedTracks);
        dom.playerModal.classList.remove('closed');
      } else {
        showToast('Нет треков в коллекции', true);
      }
    });

    dom.btnGotoSettings.addEventListener('click', () => {
      switchView('view-settings');
    });

    dom.miniPlayer.addEventListener('click', (e) => {
      if (e.target.closest('#btn-mini-play') || e.target.closest('#btn-mini-like')) return;
      dom.playerModal.classList.remove('closed');
    });

    dom.btnMiniPlay.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.togglePlay();
    });

    dom.btnMiniLike.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLikeCurrentTrack();
    });

    dom.btnPlayerClose.addEventListener('click', () => {
      dom.playerModal.classList.add('closed');
    });

    dom.btnPlayerPlay.addEventListener('click', () => {
      audio.togglePlay();
    });

    dom.btnPlayerNext.addEventListener('click', () => {
      audio.playNext();
    });

    dom.btnPlayerPrev.addEventListener('click', () => {
      audio.playPrev();
    });

    dom.btnPlayerLike.addEventListener('click', () => {
      toggleLikeCurrentTrack();
    });

    dom.btnPlayerShuffle.addEventListener('click', () => {
      state.isShuffle = !state.isShuffle;
      dom.btnPlayerShuffle.classList.toggle('active', state.isShuffle);
      showToast(state.isShuffle ? 'Перемешивание включено' : 'Перемешивание выключено');
    });

    dom.btnPlayerRepeat.addEventListener('click', () => {
      if (state.repeatMode === 'off') {
        state.repeatMode = 'all';
        dom.btnPlayerRepeat.classList.add('active');
        dom.btnPlayerRepeat.textContent = '🔁';
        showToast('Повтор списка');
      } else if (state.repeatMode === 'all') {
        state.repeatMode = 'one';
        dom.btnPlayerRepeat.classList.add('active');
        dom.btnPlayerRepeat.textContent = '🔂';
        showToast('Повтор одного трека');
      } else {
        state.repeatMode = 'off';
        dom.btnPlayerRepeat.classList.remove('active');
        dom.btnPlayerRepeat.textContent = '🔁';
        showToast('Повтор выключен');
      }
    });

    function handleSeek(e) {
      const rect = dom.playerSeekContainer.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const fraction = x / rect.width;

      dom.playerSeekFill.style.width = `${fraction * 100}%`;
      dom.playerSeekThumb.style.left = `${fraction * 100}%`;

      const duration = dom.audio.duration || (state.currentTrack ? state.currentTrack.durationMs / 1000 : 0);
      dom.playerTimeCurrent.textContent = formatTime(fraction * duration);

      return fraction;
    }

    dom.playerSeekContainer.addEventListener('mousedown', (e) => {
      state.isSeeking = true;
      handleSeek(e);

      const onMouseMove = (moveEvent) => {
        if (state.isSeeking) handleSeek(moveEvent);
      };

      const onMouseUp = (upEvent) => {
        if (state.isSeeking) {
          const fraction = handleSeek(upEvent);
          audio.seek(fraction);
          state.isSeeking = false;
        }
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    dom.playerSeekContainer.addEventListener('touchstart', (e) => {
      state.isSeeking = true;
      handleSeek(e);
    }, { passive: true });

    dom.playerSeekContainer.addEventListener('touchmove', (e) => {
      if (state.isSeeking) handleSeek(e);
    }, { passive: true });

    dom.playerSeekContainer.addEventListener('touchend', (e) => {
      if (state.isSeeking) {
        const rect = dom.playerSeekContainer.getBoundingClientRect();
        const clientX = e.changedTouches ? e.changedTouches[0].clientX : 0;
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const fraction = x / rect.width;
        audio.seek(fraction);
        state.isSeeking = false;
      }
    });

    dom.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const val = e.target.value;
      searchTimeout = setTimeout(() => {
        performSearch(val);
      }, 350);
    });

    dom.btnSearchClear.addEventListener('click', () => {
      dom.searchInput.value = '';
      performSearch('');
    });

    dom.tagChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.dataset.query;
        dom.searchInput.value = query;
        performSearch(query);
      });
    });

    dom.btnSaveToken.addEventListener('click', () => {
      verifyAndSaveToken(dom.inputToken.value);
    });

    dom.btnHelpToken.addEventListener('click', () => {
      dom.modalTokenHelp.classList.remove('hidden');
    });

    dom.btnCloseTokenHelp.addEventListener('click', () => {
      dom.modalTokenHelp.classList.add('hidden');
    });

    dom.modalTokenHelp.addEventListener('click', (e) => {
      if (e.target === dom.modalTokenHelp) {
        dom.modalTokenHelp.classList.add('hidden');
      }
    });
  }

  function toggleLikeCurrentTrack() {
    if (!state.currentTrack) return;
    const track = state.currentTrack;
    const index = state.likedTracks.findIndex(t => String(t.id) === String(track.id));

    if (index > -1) {
      state.likedTracks.splice(index, 1);
      showToast('Удалено из Мне нравится');
    } else {
      state.likedTracks.unshift(track);
      showToast('Добавлено в Мне нравится ❤️');
    }

    audio.updateLikeButtons(track);
    renderLikedTracks(state.likedTracks);
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('PWA ServiceWorker registered:', reg.scope))
          .catch(err => console.warn('PWA ServiceWorker registration failed:', err));
      });
    }
  }

  function init() {
    dom.greetingText.textContent = getGreeting();

    if (state.token) {
      dom.inputToken.value = state.token;
      verifyAndSaveToken(state.token);
    }

    renderHistoryList();
    loadPopularTracks();
    initEventListeners();
    registerServiceWorker();

    fetch('https://cdn.jsdelivr.net/gh/gagayhhad-tech/ym-liberty-db@main/list.json')
      .then(res => res.json())
      .then(data => {
        const count = Object.keys(data.tracks || data).length;
        if (dom.libertyDbStatus) {
          dom.libertyDbStatus.textContent = 'Активна';
          dom.libertyDbStatus.className = 'status-badge green';
        }
        if (dom.libertyDbCount) {
          dom.libertyDbCount.textContent = `${count} треков`;
        }
      })
      .catch(() => {
        if (dom.libertyDbStatus) {
          dom.libertyDbStatus.textContent = 'Работает (Кэш)';
          dom.libertyDbStatus.className = 'status-badge green';
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
