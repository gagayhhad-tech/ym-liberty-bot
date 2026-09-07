// --- DOM Elements ---
const dom = {
  // Views
  views: document.querySelectorAll('.view'),
  navBtns: document.querySelectorAll('.nav-btn'),
  
  // Players
  miniPlayer: document.getElementById('mini-player'),
  fullPlayer: document.getElementById('full-player'),
  dynamicBg: document.getElementById('dynamic-bg'),
  
  // Buttons
  btnClosePlayer: document.getElementById('btn-close-player'),
  miniBtnPlay: document.getElementById('mini-btn-play'),
  fullBtnPlay: document.getElementById('btn-full-play'),
  vibePlayBtn: document.getElementById('btn-vibe-play'),
  
  // Info
  miniCover: document.getElementById('mini-cover'),
  miniTitle: document.getElementById('mini-title'),
  miniArtist: document.getElementById('mini-artist'),
  fullCover: document.getElementById('full-cover'),
  fullTitle: document.getElementById('full-title'),
  fullArtist: document.getElementById('full-artist'),
  
  // Settings
  toggleDynamicBg: document.getElementById('toggle-dynamic-bg'),
};

// --- State ---
let isPlaying = false;
let currentTrack = null;

// --- Mock Data for UI Preview ---
const mockTracks = [
  {
    title: "Stardust",
    artist: "Luna Sol",
    cover: "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?q=80&w=400&auto=format&fit=crop",
  },
  {
    title: "Neon Pulse",
    artist: "Midnight Riders",
    cover: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=400&auto=format&fit=crop",
  },
  {
    title: "Cyberfunk",
    artist: "Future Funk",
    cover: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop",
  }
];

// --- Navigation Logic ---
dom.navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Update active button
    dom.navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Show target view
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

// --- Player UI Logic ---

// Open Full Player
dom.miniPlayer.addEventListener('click', (e) => {
  // Prevent opening if clicking on controls
  if (e.target.closest('.mini-controls')) return;
  dom.fullPlayer.classList.remove('translateY-100');
});

// Close Full Player
dom.btnClosePlayer.addEventListener('click', () => {
  dom.fullPlayer.classList.add('translateY-100');
});

// Update UI with Track Info
function loadTrack(track) {
  currentTrack = track;
  
  // Update texts
  dom.miniTitle.textContent = track.title;
  dom.miniArtist.textContent = track.artist;
  dom.fullTitle.textContent = track.title;
  dom.fullArtist.textContent = track.artist;
  
  // Update covers
  dom.miniCover.src = track.cover;
  dom.fullCover.src = track.cover;
  
  // Update dynamic background
  if (dom.toggleDynamicBg.checked) {
    dom.dynamicBg.style.backgroundImage = `url(${track.cover})`;
  }
  
  // Show mini player if hidden
  dom.miniPlayer.classList.remove('hidden');
}

// Toggle Play/Pause UI
function togglePlay() {
  isPlaying = !isPlaying;
  
  const playIconClass = isPlaying ? 'bi-pause-fill' : 'bi-play-fill';
  
  // Update buttons
  dom.miniBtnPlay.innerHTML = `<i class="bi ${playIconClass}"></i>`;
  dom.fullBtnPlay.innerHTML = `<i class="bi ${playIconClass}"></i>`;
  dom.vibePlayBtn.innerHTML = `<i class="bi ${playIconClass}"></i>`;
  
  // Vibe animation state
  const waves = document.querySelectorAll('.wave');
  waves.forEach(wave => {
    wave.style.animationPlayState = isPlaying ? 'running' : 'paused';
  });
}

// Play button listeners
dom.miniBtnPlay.addEventListener('click', togglePlay);
dom.fullBtnPlay.addEventListener('click', togglePlay);

// Vibe main button listener
dom.vibePlayBtn.addEventListener('click', () => {
  if (!currentTrack) {
    // Load random mock track on first play
    const randomTrack = mockTracks[Math.floor(Math.random() * mockTracks.length)];
    loadTrack(randomTrack);
  }
  togglePlay();
});

// Dynamic BG Toggle
dom.toggleDynamicBg.addEventListener('change', (e) => {
  if (e.target.checked && currentTrack) {
    dom.dynamicBg.style.backgroundImage = `url(${currentTrack.cover})`;
  } else {
    dom.dynamicBg.style.backgroundImage = 'none';
  }
});

// --- Initialization ---
// Hide full player on load
dom.fullPlayer.classList.add('translateY-100');

// Pre-pause wave animations
document.querySelectorAll('.wave').forEach(w => w.style.animationPlayState = 'paused');
