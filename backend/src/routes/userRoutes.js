const express = require("express");
const router = express.Router();

const {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  updateUserStatus
} = require("../controllers/userController");

const { protect } = require("../middlewares/authMiddleware");


// Get all users
router.get("/", protect, getUsers);




router.post("/", protect,  createUser);

// router.put("/:id", protect,  updateUser);

router.delete("/:id", protect, deleteUser);

router.patch('/:id/status', updateUserStatus);

router.put('/:id', updateUser);



module.exports = router;