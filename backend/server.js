// Import required external modules
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import custom application routes
const authRoutes = require('./src/routes/authRoutes');
const vendorRoutes = require('./src/routes/vendorRoutes');

// Initialize the Express application instance
const app = express();

// Global Middlewares Configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// API routes
app.use('/api/vendors', vendorRoutes);
app.use('/api/auth', authRoutes);

// Root test route
app.get('/', (req, res) => {
  res.status(200).json({ status: "success", message: "Hanthana Backend API is running smoothly." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] Hanthana core engine actively running on port: ${PORT}`);
});
