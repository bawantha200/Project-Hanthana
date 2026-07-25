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
const vendorOrdersRoutes = require('./src/routes/vendorOrderRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const roleRoutes = require('./src/routes/roleRoutes');
const positionRoutes = require('./src/routes/positionRoutes');
const permissionRoutes = require('./src/routes/permissionRoutes');
const notificationsRoutes = require('./src/routes/notificationsRoutes');

const { startPaymentReminderJob } = require('./src/jobs/paymentReminderJob');
const { startInventoryReminderJob } = require('./src/jobs/inventoryReminderJob');
const { maintenanceMiddleware } = require('./src/middlewares/maintenanceMiddleware');

const maintenanceRoutes = require('./src/routes/maintenanceRoutes'); // 🆕
const { startMaintenanceReminderJob } = require('./src/jobs/maintenanceReminderJob'); // 🆕
const { initBackupScheduler } = require('./src/utils/backupScheduler');

const forecastRoutes = require('./src/routes/forecastRoutes');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const salaryRoutes = require('./src/routes/salaryRoutes');
const contactRoutes = require('./src/routes/contactRoutes');
const deliveryRoutes = require('./src/routes/deliveryRoutes');
const invoiceRoutes = require('./src/routes/invoiceRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const stockRoutes = require('./src/routes/stockRoutes');
const emptyBottlesRoutes = require('./src/routes/emptyBottlesRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const salesRoutes = require('./src/routes/salesRoutes');


const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
];


// Global middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy does not allow origin ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(maintenanceMiddleware);

// API route mounting
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api', permissionRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/vendor-orders', vendorOrdersRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/empty-bottles', emptyBottlesRoutes);
app.use('/api/vendor-orders', vendorOrdersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/maintenance', maintenanceRoutes); // 🆕
app.use('/api/sales', salesRoutes);



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
  startPaymentReminderJob(); 
  startInventoryReminderJob();
  startMaintenanceReminderJob();
  initBackupScheduler();
});