const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const departmentRoutes = require('./src/routes/departmentRoutes');
const positionRoutes = require('./src/routes/positionRoutes');

const ordersRoutes = require('./src/routes/ordersRoutes');
const productsRoutes = require('./src/routes/productsRoutes');
const vendorsRoutes = require('./src/routes/vendorsRoutes');

const app = express();

// Global middleware
app.use(cors({
  origin: 'http://localhost:5173',    // adjust to your frontend URL
  credentials: true
}));
app.use(express.json());

// API route mounting
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/positions', positionRoutes);

app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/vendors', vendorsRoutes);   

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Hanthana Backend API is running smoothly.'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] Hanthana core engine actively running on port: ${PORT}`);
});
