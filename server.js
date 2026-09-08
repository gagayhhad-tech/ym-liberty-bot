const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

const libraryHandler = require('./api/_handlers/library');
const streamHandler = require('./api/_handlers/stream');
const vibeHandler = require('./api/_handlers/vibe');
const searchHandler = require('./api/_handlers/search');
const artistHandler = require('./api/_handlers/artist');
const feedbackHandler = require('./api/_handlers/feedback');

const PORT = process.env.PORT || 3000;

// Middleware for parsing body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/library', libraryHandler);
app.get('/api/stream', streamHandler);
app.get('/api/vibe', vibeHandler);
app.get('/api/search', searchHandler);
app.get('/api/artist', artistHandler);
app.post('/api/feedback', feedbackHandler);

const apiRoutes = ['auth', 'library', 'search', 'popular', 'stream', 'proxy-audio', 'like', 'playlists', 'playlist', 'album', 'playlist-add', 'bot', 'report', 'version', 'feed'];

apiRoutes.forEach(route => {
  const handler = require(path.join(__dirname, 'api', '_handlers', `${route}.js`));
  // Vercel serverless functions handle both GET and POST usually,
  // so we use 'use' or both get/post to mimic that behavior
  app.all(`/api/${route}`, async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(`Error in /api/${route}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });
});

// Fallback for SPA routing (if needed)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
