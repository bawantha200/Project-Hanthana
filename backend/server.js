const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes'); 
const ordersRoutes = require('./src/routes/ordersRoutes');
const productsRoutes = require('./src/routes/productsRoutes');
const vendorsRoutes = require('./src/routes/vendorsRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const roleRoutes = require('./src/routes/roleRoutes');
const positionRoutes = require('./src/routes/positionRoutes');
const permissionRoutes = require('./src/routes/permissionRoutes');

const forecastRoutes = require('./src/routes/forecastRoutes');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const salaryRoutes = require('./src/routes/salaryRoutes');
const contactRoutes = require('./src/routes/contactRoutes');

const app = express();

// Global middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API route mounting
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api', permissionRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/vendors', vendorsRoutes); 
app.use('/api/customers', customerRoutes);  
app.use('/api/forecast', forecastRoutes); 
app.use('/api/inventory', inventoryRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/salaries', salaryRoutes);


app.use('/api/contact', contactRoutes); 

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