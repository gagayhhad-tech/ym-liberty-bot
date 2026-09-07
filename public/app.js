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
    btnLoginYandexLibrary: document.getElementById('btn-login-yandex-library'),

    // Settings View
    cardAccount: document.getElementById('card-account'),
    accountDisplayName: document.getElementById('account-display-name'),
    accountSubStatus: document.getElementById('account-sub-status'),
    accountLoggedOutBlock: document.getElementById('account-logged-out-block'),
    accountLoggedInBlock: document.getElementById('account-logged-in-block'),
    badgePlusStatus: document.getElementById('badge-plus-status'),
    btnLogout: document.getElementById('btn-logout'),
    btnLoginYandexSettings: document.getElementById('btn-login-yandex-settings'),
    btnToggleManualToken: document.getElementById('btn-toggle-manual-token'),
    manualTokenGroup: document.getElementById('manual-token-group'),
    inputToken: document.getElementById('input-token'),
    btnSaveToken: document.getElementById('btn-save-token'),
    tokenStatus: document.getElementById('token-status'),
    libertyDbStatus: document.getElementById('liberty-db-status'),
    libertyDbCount: document.getElementById('liberty-db-count'),

    // Modern Yandex ID Auth Modal (Device Flow & Fallbacks)
    modalYandexLogin: document.getElementById('modal-yandex-login'),
    deviceCodeDisplay: document.getElementById('device-code-display'),
    btnCopyDeviceCode: document.getElementById('btn-copy-device-code'),
    btnCopyCodeText: document.getElementById('btn-copy-code-text'),
    btnOpenYandexDevice: document.getElementById('btn-open-yandex-device'),
    devicePollIndicator: document.getElementById('device-poll-indicator'),
    devicePollText: document.getElementById('device-poll-text'),
    btnToggleAltMethods: document.getElementById('btn-toggle-alt-methods'),
    iconToggleAlt: document.getElementById('icon-toggle-alt'),
    authAltContent: document.getElementById('auth-alt-content'),
    inputModalToken: document.getElementById('input-modal-token'),
    btnSubmitModalToken: document.getElementById('btn-submit-modal-token'),
    btnPasteClipboardToken: document.getElementById('btn-paste-clipboard-token'),
    modalTokenStatus: document.getElementById('modal-token-status'),
    btnCloseYandexLogin: document.getElementById('btn-close-yandex-login'),

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
      const playIconHtml = state.isPlaying
        ? '<i class="bi bi-pause-fill"></i>'
        : '<i class="bi bi-play-fill"></i>';
      if (dom.btnMiniPlay) dom.btnMiniPlay.innerHTML = playIconHtml;
      if (dom.btnPlayerPlay) dom.btnPlayerPlay.innerHTML = playIconHtml;

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
      const iconHtml = isLiked
        ? '<i class="bi bi-heart-fill liked"></i>'
        : '<i class="bi bi-heart"></i>';
      if (dom.btnMiniLike) dom.btnMiniLike.innerHTML = iconHtml;
      if (dom.btnPlayerLike) dom.btnPlayerLike.innerHTML = iconHtml;
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
          ${isLiberty ? '<span class="badge-liberty" title="Без цензуры"><i class="bi bi-shield-fill-check"></i></span>' : ''}
        </div>
        <span class="track-artist">${escapeHtml(track.artists || 'Неизвестен')}</span>
      </div>
      <button class="track-action-btn" title="Воспроизвести"><i class="bi bi-play-fill"></i></button>
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
          <div class="popular-card-play-btn"><i class="bi bi-play-fill"></i></div>
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

  function extractToken(raw) {
    if (!raw) return '';
    raw = String(raw).trim();

    // 1. Desktop Mod JSON data: {"accessToken":"OAuth y0_...", "experiments":...} or {"value":"y0_..."}
    if ((raw.startsWith('{') && raw.endsWith('}')) || raw.includes('"accessToken"') || raw.includes('"value"')) {
      try {
        const obj = JSON.parse(raw);
        if (obj.accessToken) return extractToken(obj.accessToken);
        if (obj.value) return extractToken(obj.value);
        if (obj.token) return extractToken(obj.token);
      } catch (e) {}
    }

    // 2. Intercept copy-pasting the authorization page URL without access_token
    if (raw.includes('oauth.yandex.ru/authorize') && !raw.includes('access_token=')) {
      showToast('Вы скопировали ссылку на страницу входа, а не токен. Введите код на ya.ru/device', true);
      return null;
    }

    // 3. Extract access_token from URL hash or query parameters
    if (raw.includes('access_token=')) {
      const match = raw.match(/access_token=([^&#\s]+)/);
      if (match) return decodeURIComponent(match[1]);
    }

    // 4. Strip "OAuth " or "Bearer " prefix
    if (raw.startsWith('OAuth ')) {
      raw = raw.slice(6).trim();
    } else if (raw.startsWith('Bearer ')) {
      raw = raw.slice(7).trim();
    }

    // 5. Clean quotes and whitespace
    raw = raw.replace(/^["']|["']$/g, '').trim();

    return raw;
  }

  let devicePollTimer = null;
  let currentDeviceCode = null;

  async function startDeviceAuth() {
    stopDeviceAuth();
    if (!dom.deviceCodeDisplay) return;

    dom.deviceCodeDisplay.textContent = '••••••••';
    if (dom.devicePollText) {
      dom.devicePollText.textContent = 'Получение кода входа...';
      dom.devicePollText.style.color = 'var(--text-secondary)';
    }
    if (dom.btnCopyCodeText) dom.btnCopyCodeText.textContent = 'Скопировать код';
    if (dom.modalTokenStatus) dom.modalTokenStatus.textContent = '';

    try {
      const res = await fetch('/api/auth?action=code');
      const data = await res.json();

      if (!res.ok || !data.device_code) {
        dom.deviceCodeDisplay.textContent = 'ОШИБКА';
        if (dom.devicePollText) {
          dom.devicePollText.textContent = 'Не удалось получить код с сервера';
          dom.devicePollText.style.color = '#e63946';
        }
        return;
      }

      currentDeviceCode = data.device_code;
      const userCode = (data.user_code || '').toUpperCase();
      const verificationUrl = data.verification_url || 'https://ya.ru/device';

      dom.deviceCodeDisplay.textContent = userCode;
      if (dom.devicePollText) {
        dom.devicePollText.textContent = 'Ожидание подтверждения на ' + verificationUrl.replace('https://', '') + '...';
        dom.devicePollText.style.color = 'var(--text-secondary)';
      }

      if (dom.btnOpenYandexDevice) {
        dom.btnOpenYandexDevice.href = verificationUrl;
      }

      const intervalSec = Math.max(3, data.interval || 5);
      const expiresAt = Date.now() + (data.expires_in || 300) * 1000;

      devicePollTimer = setInterval(async () => {
        if (Date.now() > expiresAt) {
          stopDeviceAuth();
          if (dom.devicePollText) {
            dom.devicePollText.textContent = 'Время действия кода истекло. Откройте окно снова.';
            dom.devicePollText.style.color = '#e63946';
          }
          return;
        }

        try {
          const pollRes = await fetch(`/api/auth?action=poll&device_code=${encodeURIComponent(currentDeviceCode)}`);
          const pollData = await pollRes.json();

          if (pollData.status === 'success' && pollData.access_token) {
            stopDeviceAuth();
            if (dom.devicePollText) {
              dom.devicePollText.textContent = '✓ Вход подтвержден!';
              dom.devicePollText.style.color = '#48bb78';
            }
            await verifyAndSaveToken(pollData.access_token);
          } else if (pollData.status === 'error') {
            stopDeviceAuth();
            if (dom.devicePollText) {
              dom.devicePollText.textContent = `Ошибка: ${pollData.error_description || pollData.error}`;
              dom.devicePollText.style.color = '#e63946';
            }
          }
        } catch (e) {
          console.warn('Device poll error:', e);
        }
      }, intervalSec * 1000);
    } catch (err) {
      console.error('startDeviceAuth error:', err);
      dom.deviceCodeDisplay.textContent = 'ОШИБКА';
      if (dom.devicePollText) {
        dom.devicePollText.textContent = 'Проверьте соединение с интернетом';
        dom.devicePollText.style.color = '#e63946';
      }
    }
  }

  function stopDeviceAuth() {
    if (devicePollTimer) {
      clearInterval(devicePollTimer);
      devicePollTimer = null;
    }
  }

  function openYandexLoginModal() {
    if (!dom.modalYandexLogin) return;
    dom.modalYandexLogin.classList.remove('hidden');
    startDeviceAuth();
  }

  function closeYandexLoginModal() {
    if (!dom.modalYandexLogin) return;
    dom.modalYandexLogin.classList.add('hidden');
    stopDeviceAuth();
  }

  async function verifyAndSaveToken(rawToken) {
    const token = extractToken(rawToken);

    if (token === null) {
      // User pasted invalid format and toast was already displayed
      return;
    }

    if (!token) {
      localStorage.removeItem('ym_token');
      state.token = '';
      state.user = null;
      state.likedTracks = [];

      dom.tokenStatus.textContent = 'Токен удален';
      dom.tokenStatus.style.color = '#929298';
      dom.headerAvatar.textContent = '👤';
      dom.headerAvatar.style.background = '#2a2a2a';
      dom.headerAvatar.style.color = '#fff';

      if (dom.accountDisplayName) dom.accountDisplayName.textContent = 'Яндекс Аккаунт';
      if (dom.accountSubStatus) dom.accountSubStatus.textContent = 'Не выполнен вход';
      if (dom.accountLoggedOutBlock) dom.accountLoggedOutBlock.classList.remove('hidden');
      if (dom.accountLoggedInBlock) dom.accountLoggedInBlock.classList.add('hidden');
      if (dom.inputToken) dom.inputToken.value = '';

      renderLikedTracks([]);
      return;
    }

    if (dom.tokenStatus) {
      dom.tokenStatus.textContent = 'Проверка Яндекс ID...';
      dom.tokenStatus.style.color = '#fed42b';
    }
    if (dom.modalTokenStatus) {
      dom.modalTokenStatus.textContent = 'Проверка аккаунта...';
      dom.modalTokenStatus.style.color = '#fed42b';
    }

    try {
      const res = await fetch(`/api/library?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        const errMsg = data.error || 'Недействительный токен';
        if (dom.tokenStatus) {
          dom.tokenStatus.textContent = `Ошибка: ${errMsg}`;
          dom.tokenStatus.style.color = '#e63946';
        }
        if (dom.modalTokenStatus) {
          dom.modalTokenStatus.textContent = `Ошибка: ${errMsg}`;
          dom.modalTokenStatus.style.color = '#e63946';
        }
        showToast(errMsg, true);
        return;
      }

      state.token = token;
      localStorage.setItem('ym_token', token);
      state.user = data.user;
      state.likedTracks = data.tracks || [];

      // Update Header Avatar
      const userInitial = (data.user.fullName || data.user.login || 'U')[0].toUpperCase();
      dom.headerAvatar.textContent = userInitial;
      dom.headerAvatar.style.background = '#fed42b';
      dom.headerAvatar.style.color = '#000';
      dom.headerAvatar.style.fontWeight = '700';

      // Update Settings Account Card
      if (dom.accountDisplayName) dom.accountDisplayName.textContent = data.user.fullName || data.user.login;
      if (dom.accountSubStatus) dom.accountSubStatus.textContent = `@${data.user.login}`;
      if (dom.badgePlusStatus) {
        dom.badgePlusStatus.textContent = data.user.hasPlus ? 'Плюс Активен ✨' : 'Без Плюса';
        dom.badgePlusStatus.style.background = data.user.hasPlus
          ? 'linear-gradient(135deg, #7928ca, #ff0080)'
          : 'rgba(255,255,255,0.15)';
      }
      if (dom.accountLoggedOutBlock) dom.accountLoggedOutBlock.classList.add('hidden');
      if (dom.accountLoggedInBlock) dom.accountLoggedInBlock.classList.remove('hidden');

      if (dom.tokenStatus) {
        dom.tokenStatus.textContent = `✓ Вход выполнен: ${data.user.fullName || data.user.login}`;
        dom.tokenStatus.style.color = '#48bb78';
      }

      if (dom.modalTokenStatus) {
        dom.modalTokenStatus.textContent = '✓ Успешно! Добро пожаловать.';
        dom.modalTokenStatus.style.color = '#48bb78';
      }

      // Close modal on success
      stopDeviceAuth();
      setTimeout(() => {
        if (dom.modalYandexLogin) dom.modalYandexLogin.classList.add('hidden');
      }, 700);

      renderLikedTracks(state.likedTracks);
      showToast(`Добро пожаловать, ${data.user.fullName || data.user.login}!`);
    } catch (err) {
      console.error('Verify token error:', err);
      if (dom.tokenStatus) {
        dom.tokenStatus.textContent = 'Ошибка сети при проверке токена';
        dom.tokenStatus.style.color = '#e63946';
      }
      if (dom.modalTokenStatus) {
        dom.modalTokenStatus.textContent = 'Ошибка сети при проверке токена';
        dom.modalTokenStatus.style.color = '#e63946';
      }
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

    dom.miniPlayer?.addEventListener('click', (e) => {
      if (e.target.closest('#btn-mini-play') || e.target.closest('#btn-mini-like')) return;
      dom.playerModal.classList.remove('closed');
    });

    dom.btnMiniPlay?.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.togglePlay();
    });

    dom.btnMiniLike?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLikeCurrentTrack();
    });

    dom.btnPlayerClose?.addEventListener('click', () => {
      dom.playerModal.classList.add('closed');
    });

    dom.btnPlayerPlay?.addEventListener('click', () => {
      audio.togglePlay();
    });

    dom.btnPlayerNext?.addEventListener('click', () => {
      audio.playNext();
    });

    dom.btnPlayerPrev?.addEventListener('click', () => {
      audio.playPrev();
    });

    dom.btnPlayerLike?.addEventListener('click', () => {
      toggleLikeCurrentTrack();
    });

    dom.btnPlayerShuffle?.addEventListener('click', () => {
      state.isShuffle = !state.isShuffle;
      dom.btnPlayerShuffle.classList.toggle('active', state.isShuffle);
      showToast(state.isShuffle ? 'Перемешивание включено' : 'Перемешивание выключено');
    });

    dom.btnPlayerRepeat?.addEventListener('click', () => {
      if (state.repeatMode === 'off') {
        state.repeatMode = 'all';
        dom.btnPlayerRepeat.classList.add('active');
        dom.btnPlayerRepeat.innerHTML = '<i class="bi bi-repeat"></i>';
        showToast('Повтор списка');
      } else if (state.repeatMode === 'all') {
        state.repeatMode = 'one';
        dom.btnPlayerRepeat.classList.add('active');
        dom.btnPlayerRepeat.innerHTML = '<i class="bi bi-repeat-1"></i>';
        showToast('Повтор одного трека');
      } else {
        state.repeatMode = 'off';
        dom.btnPlayerRepeat.classList.remove('active');
        dom.btnPlayerRepeat.innerHTML = '<i class="bi bi-repeat"></i>';
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

    // Settings manual token save
    if (dom.btnSaveToken) {
      dom.btnSaveToken.addEventListener('click', () => {
        verifyAndSaveToken(dom.inputToken.value);
      });
    }

    if (dom.btnToggleManualToken) {
      dom.btnToggleManualToken.addEventListener('click', () => {
        dom.manualTokenGroup.classList.toggle('hidden');
      });
    }

    // Logout
    if (dom.btnLogout) {
      dom.btnLogout.addEventListener('click', () => {
        verifyAndSaveToken('');
        showToast('Вы вышли из аккаунта');
      });
    }

    // Open Yandex ID Modal buttons
    if (dom.btnLoginYandexLibrary) {
      dom.btnLoginYandexLibrary.addEventListener('click', () => {
        openYandexLoginModal();
      });
    }

    if (dom.btnLoginYandexSettings) {
      dom.btnLoginYandexSettings.addEventListener('click', () => {
        openYandexLoginModal();
      });
    }

    // Close Yandex ID Modal
    if (dom.btnCloseYandexLogin) {
      dom.btnCloseYandexLogin.addEventListener('click', () => {
        closeYandexLoginModal();
      });
    }

    if (dom.modalYandexLogin) {
      dom.modalYandexLogin.addEventListener('click', (e) => {
        if (e.target === dom.modalYandexLogin) {
          closeYandexLoginModal();
        }
      });
    }

    // Device Code Flow: Copy Code Button
    if (dom.btnCopyDeviceCode) {
      dom.btnCopyDeviceCode.addEventListener('click', () => {
        const code = dom.deviceCodeDisplay ? dom.deviceCodeDisplay.textContent.trim() : '';
        if (code && code !== '••••••••' && code !== 'ОШИБКА') {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(() => {
              if (dom.btnCopyCodeText) dom.btnCopyCodeText.textContent = '✓ Скопировано!';
              showToast(`Код ${code} скопирован в буфер`);
              setTimeout(() => {
                if (dom.btnCopyCodeText) dom.btnCopyCodeText.textContent = 'Скопировать код';
              }, 2500);
            }).catch(() => {
              showToast(`Код: ${code}`);
            });
          } else {
            showToast(`Код: ${code}`);
          }
        }
      });
    }

    // Device Code Flow: Open ya.ru/device Link
    if (dom.btnOpenYandexDevice) {
      dom.btnOpenYandexDevice.addEventListener('click', () => {
        const code = dom.deviceCodeDisplay ? dom.deviceCodeDisplay.textContent.trim() : '';
        if (code && code !== '••••••••' && code !== 'ОШИБКА') {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).catch(() => {});
          }
          showToast(`Код ${code} скопирован! Вставьте его на открывшейся странице`);
        }
      });
    }

    // Toggle Alternative Login Methods
    if (dom.btnToggleAltMethods && dom.authAltContent) {
      dom.btnToggleAltMethods.addEventListener('click', () => {
        const isHidden = dom.authAltContent.classList.toggle('hidden');
        if (dom.iconToggleAlt) {
          dom.iconToggleAlt.className = isHidden ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
        }
      });
    }

    // Paste from Clipboard (Mod JSON or token)
    if (dom.btnPasteClipboardToken) {
      dom.btnPasteClipboardToken.addEventListener('click', async () => {
        try {
          let text = '';
          if (navigator.clipboard && navigator.clipboard.readText) {
            text = await navigator.clipboard.readText();
          }
          if (!text && dom.inputModalToken && dom.inputModalToken.value) {
            text = dom.inputModalToken.value;
          }

          const token = extractToken(text);
          if (token && token.length > 5) {
            await verifyAndSaveToken(token);
          } else if (token !== null) {
            showToast('В буфере не найден токен или JSON. Скопируйте данные из мода', true);
            dom.inputModalToken?.focus();
          }
        } catch (err) {
          console.warn('Clipboard read error:', err);
          showToast('Вставьте скопированный токен в поле ввода', true);
          dom.inputModalToken?.focus();
        }
      });
    }

    // Submit from modal input
    if (dom.btnSubmitModalToken) {
      dom.btnSubmitModalToken.addEventListener('click', () => {
        const val = dom.inputModalToken ? dom.inputModalToken.value : '';
        const token = extractToken(val);
        if (token && token.length > 5) {
          verifyAndSaveToken(token);
        } else if (token !== null) {
          showToast('Пожалуйста, введите токен или данные авторизации', true);
        }
      });
    }
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
          .then(reg => {
            console.log('PWA ServiceWorker registered:', reg.scope);
            reg.update();
          })
          .catch(err => console.warn('PWA ServiceWorker registration failed:', err));
      });
    }
  }

  function checkUrlForToken() {
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      const token = extractToken(window.location.hash);
      if (token) {
        verifyAndSaveToken(token);
        try {
          history.replaceState(null, document.title, window.location.pathname + window.location.search);
        } catch (e) {}
      }
    }
  }

  function init() {
    dom.greetingText.textContent = getGreeting();

    checkUrlForToken();

    if (state.token) {
      if (dom.inputToken) dom.inputToken.value = state.token;
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
