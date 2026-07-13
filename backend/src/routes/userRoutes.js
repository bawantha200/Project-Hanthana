const express = require("express");
const router = express.Router();

const {
  getUsers,
  getUserById,
  createUser,
  createUserFromEmployee,
  updateUser,
  deleteUser,
  updateUserStatus
} = require("../controllers/userController");

const { protect } = require("../middlewares/authMiddleware");

// ===== All routes require authentication =====
router.use(protect);

router.get("/", getUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.post("/from-employee", createUserFromEmployee);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.patch("/:id/status", updateUserStatus);

module.exports = router;