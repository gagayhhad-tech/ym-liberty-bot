// --- DOM Elements ---
const dom = {
  views: document.querySelectorAll('.view'),
  navBtns: document.querySelectorAll('.nav-btn'),
  
  miniPlayer: document.getElementById('mini-player'),
  fullPlayer: document.getElementById('full-player'),
  dynamicBg: document.getElementById('dynamic-bg'),
  
  btnClosePlayer: document.getElementById('btn-close-player'),
  miniBtnPlay: document.getElementById('mini-btn-play'),
  fullBtnPlay: document.getElementById('btn-full-play'),
  vibePlayBtn: document.getElementById('btn-vibe-play'),
  
  miniCover: document.getElementById('mini-cover'),
  miniTitle: document.getElementById('mini-title'),
  miniArtist: document.getElementById('mini-artist'),
  fullCover: document.getElementById('full-cover'),
  fullTitle: document.getElementById('full-title'),
  fullArtist: document.getElementById('full-artist'),
  
  toggleDynamicBg: document.getElementById('toggle-dynamic-bg'),
  colorBtns: document.querySelectorAll('.color-btn'),
  
  // Auth
  authModal: document.getElementById('auth-modal'),
  btnLoginModal: document.getElementById('btn-login-modal'),
  btnCloseAuth: document.getElementById('btn-close-auth'),
  inputToken: document.getElementById('input-token'),
  btnSubmitToken: document.getElementById('btn-submit-token'),
  authStatus: document.getElementById('auth-status'),
  
  // Settings Account Info
  accountName: document.getElementById('account-name'),
  accountSub: document.getElementById('account-sub'),
  headerAvatar: document.getElementById('header-avatar'),
  
  // Library
  tracksList: document.getElementById('tracks-list'),
  likesCount: document.getElementById('likes-count'),
  
  // Audio
  audioPlayer: document.getElementById('audio-player')
};

// --- State ---
const state = {
  token: localStorage.getItem('ym_token') || '',
  user: null,
  tracks: [],
  currentTrack: null,
  isPlaying: false
};

// --- Navigation Logic ---
dom.navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    dom.navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const targetId = btn.getAttribute('data-target');
    dom.views.forEach(view => {
      if (view.id === targetId) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });
  });
});

// --- Auth Logic ---
dom.btnLoginModal.addEventListener('click', () => dom.authModal.classList.remove('hidden'));
dom.btnCloseAuth.addEventListener('click', () => dom.authModal.classList.add('hidden'));

dom.btnSubmitToken.addEventListener('click', async () => {
  const token = dom.inputToken.value.trim();
  if (!token) return;
  
  dom.authStatus.textContent = "Проверка...";
  dom.authStatus.style.color = "#fed42b";
  
  await fetchLibrary(token);
});

async function fetchLibrary(token) {
  try {
    const res = await fetch(`/api/library?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    
    if (!res.ok || data.error) {
      dom.authStatus.textContent = `Ошибка: ${data.error || 'Неизвестная ошибка'}`;
      dom.authStatus.style.color = "#e63946";
      return;
    }
    
    // Success
    state.token = token;
    localStorage.setItem('ym_token', token);
    state.user = data.user;
    state.tracks = data.tracks || [];
    
    // Update UI
    dom.authModal.classList.add('hidden');
    
    const login = data.user.login || 'User';
    dom.accountName.textContent = data.user.fullName || login;
    dom.accountSub.textContent = `@${login} | ${data.user.hasPlus ? 'Плюс Активен' : 'Без Плюса'}`;
    dom.headerAvatar.textContent = login[0].toUpperCase();
    
    dom.btnLoginModal.textContent = "Выйти";
    dom.btnLoginModal.onclick = () => {
      localStorage.removeItem('ym_token');
      location.reload();
    };
    
    renderTracks();
    
  } catch (e) {
    console.error(e);
    if (dom.authStatus) {
       dom.authStatus.textContent = "Сетевая ошибка";
       dom.authStatus.style.color = "#e63946";
    }
  }
}

function renderTracks() {
  dom.likesCount.textContent = `${state.tracks.length} треков`;
  dom.tracksList.innerHTML = '';
  
  if (state.tracks.length === 0) {
    dom.tracksList.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-music-note-beamed"></i>
        <p>Нет загруженных треков</p>
      </div>`;
    return;
  }
  
  state.tracks.forEach(t => {
    const track = t.track;
    if (!track) return;
    
    const div = document.createElement('div');
    div.className = 'track-item';
    
    const artist = track.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
    let coverUrl = '/favicon.png';
    if (track.coverUri) {
      coverUrl = `https://${track.coverUri.replace('%%', '100x100')}`;
    }
    
    div.innerHTML = `
      <img src="${coverUrl}" alt="cover">
      <div class="track-info">
        <div class="track-title">${track.title}</div>
        <div class="track-artist">${artist}</div>
      </div>
      <i class="bi bi-three-dots"></i>
    `;
    
    div.addEventListener('click', () => {
      playTrack(track.id, track.title, artist, coverUrl.replace('100x100', '400x400'));
    });
    
    dom.tracksList.appendChild(div);
  });
}

// --- Player Logic ---

async function playTrack(id, title, artist, cover) {
  // Update UI immediately (Optimistic)
  const trackInfo = { title, artist, cover };
  if (document.startViewTransition) {
    document.startViewTransition(() => updateTrackUI(trackInfo));
  } else {
    updateTrackUI(trackInfo);
  }
  
  // Set Loading State
  state.isPlaying = false;
  updatePlayButtons();
  
  try {
    const res = await fetch(`/api/stream?trackId=${id}&token=${encodeURIComponent(state.token)}`);
    const data = await res.json();
    
    if (!res.ok || data.error) {
      alert(`Ошибка воспроизведения: ${data.error}`);
      return;
    }
    
    dom.audioPlayer.src = data.url;
    dom.audioPlayer.play();
    state.isPlaying = true;
    updatePlayButtons();
    
  } catch (e) {
    console.error("Play error:", e);
    alert("Сетевая ошибка при загрузке трека");
  }
}

function updateTrackUI(track) {
  state.currentTrack = track;
  
  dom.miniTitle.textContent = track.title;
  dom.miniArtist.textContent = track.artist;
  dom.fullTitle.textContent = track.title;
  dom.fullArtist.textContent = track.artist;
  
  dom.miniCover.src = track.cover;
  dom.fullCover.src = track.cover;
  
  if (dom.toggleDynamicBg.checked) {
    dom.dynamicBg.style.backgroundImage = `url(${track.cover})`;
  }
  
  const blobs = document.querySelectorAll('.blob');
  blobs.forEach(blob => {
    blob.style.backgroundImage = `url(${track.cover})`;
  });
  
  dom.miniPlayer.classList.remove('hidden');
}

function updatePlayButtons() {
  const icon = state.isPlaying ? 'bi-pause-fill' : 'bi-play-fill';
  dom.miniBtnPlay.innerHTML = `<i class="bi ${icon}"></i>`;
  dom.fullBtnPlay.innerHTML = `<i class="bi ${icon}"></i>`;
  dom.vibePlayBtn.innerHTML = `<i class="bi ${icon}"></i>`;
  
  const blobs = document.querySelectorAll('.blob');
  blobs.forEach(blob => {
    blob.style.animationPlayState = state.isPlaying ? 'running' : 'paused';
  });
}

// Audio Events
dom.audioPlayer.addEventListener('play', () => {
  state.isPlaying = true;
  updatePlayButtons();
});
dom.audioPlayer.addEventListener('pause', () => {
  state.isPlaying = false;
  updatePlayButtons();
});
dom.audioPlayer.addEventListener('ended', () => {
  state.isPlaying = false;
  updatePlayButtons();
});

// UI Play Toggles
function handlePlayToggle(e) {
  e.stopPropagation();
  if (!state.currentTrack) return;
  if (state.isPlaying) {
    dom.audioPlayer.pause();
  } else {
    dom.audioPlayer.play();
  }
}

dom.miniBtnPlay.addEventListener('click', handlePlayToggle);
dom.fullBtnPlay.addEventListener('click', handlePlayToggle);
dom.vibePlayBtn.addEventListener('click', handlePlayToggle);

// Open/Close Full Player
dom.miniPlayer.addEventListener('click', (e) => {
  if (e.target.closest('.mini-controls')) return;
  dom.fullPlayer.classList.remove('translateY-100');
});
dom.btnClosePlayer.addEventListener('click', () => {
  dom.fullPlayer.classList.add('translateY-100');
});

// Dynamic BG Toggle
dom.toggleDynamicBg.addEventListener('change', (e) => {
  if (e.target.checked && state.currentTrack) {
    dom.dynamicBg.style.backgroundImage = `url(${state.currentTrack.cover})`;
  } else {
    dom.dynamicBg.style.backgroundImage = 'none';
  }
});

// Color Picker Logic
dom.colorBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    dom.colorBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.documentElement.style.setProperty('--accent-color', btn.getAttribute('data-color'));
  });
});

// --- Init ---
dom.fullPlayer.classList.add('translateY-100');
document.querySelectorAll('.blob').forEach(b => b.style.animationPlayState = 'paused');

// Auto Login
if (state.token) {
  fetchLibrary(state.token);
} else {
  setTimeout(() => dom.authModal.classList.remove('hidden'), 500);
}
