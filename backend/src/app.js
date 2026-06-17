// const express = require('express');
// const cors = require('cors');
// const customerRoutes = require('./routes/customerRoutes');

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Routes
// app.use('/api/customers', customerRoutes);

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({
//     success: false,
//     message: 'Something went wrong!',
//     error: err.message
//   });
// });

// module.exports = app;
