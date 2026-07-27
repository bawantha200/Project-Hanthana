const express = require('express');
const router = express.Router();
const {
  postMaintenanceWindow,
  getMaintenanceWindows,
  toggleMaintenanceMode,
  getMaintenanceStatus,
  deleteMaintenanceWindow,
  updateMaintenanceWindow,
} = require('../controllers/maintenanceController');
const { protect } = require('../middlewares/authMiddleware');


router.get('/mode', getMaintenanceStatus);
router.get('/', getMaintenanceWindows);

router.use(protect); 

router.post('/', postMaintenanceWindow);
router.put('/mode', toggleMaintenanceMode);   
router.put('/:id', updateMaintenanceWindow);  
router.delete('/:id', deleteMaintenanceWindow);

module.exports = router;