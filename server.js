const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes - dynamically load handlers from the api folder
const apiRoutes = ['auth', 'library', 'search', 'popular', 'stream'];

apiRoutes.forEach(route => {
  const handler = require(path.join(__dirname, 'api', `${route}.js`));
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
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
