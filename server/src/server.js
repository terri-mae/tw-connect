// server/src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ----------------------
// CORS Configuration
// ----------------------
app.use(cors({
  origin: 'https://tw-connect-frontend.onrender.com', // replace with your actual frontend URL
  credentials: true
}));

// ----------------------
// Middleware
// ----------------------
app.use(express.json()); // for parsing JSON request bodies
app.use(express.urlencoded({ extended: true })); // for parsing URL-encoded bodies

// ----------------------
// Routes
// ----------------------
// Example route to test server
app.get('/test', (req, res) => {
  res.json({ message: 'TW Connect API is running!' });
});

// You can import and use your other route files here
// const userRoutes = require('./routes/users');
// app.use('/users', userRoutes);

module.exports = app;