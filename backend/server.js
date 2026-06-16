// Import required external modules
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import custom application routes
const authRoutes = require('./src/routes/authRoutes');
const customerRoutes = require('./src/routes/customerRoutes');

// Initialize the Express application instance
const app = express();

// Global Middlewares Configuration
// CORS allows your React frontend (e.g., port 5173/3000) to safely talk to this backend API
app.use(cors({
  origin: 'http://localhost:5173', // Change this to your exact frontend local URL if needed
  credentials: true
}));

// Built-in express middleware to automatically parse incoming JSON request bodies
app.use(express.json());

// Main API Routes Configurations
// This prefixes all authentication endpoints with '/api/auth'
// Example: The register route becomes -> http://localhost:5000/api/auth/register
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);

// Root test route to verify server operational health
app.get('/', (req, res) => {
  res.status(200).json({ status: "success", message: "Hanthana Backend API is running smoothly." });
});

// Configure backend listening port via env variables or default fallback port
const PORT = process.env.PORT || 5000;

// Start listening for incoming network requests
app.listen(PORT, () => {
  console.log(`[Server] Hanthana core engine actively running on port: ${PORT}`);
});