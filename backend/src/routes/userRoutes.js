const express = require("express");
const router = express.Router();

const {
  getUsers,
  getUserById,
  createUser,
  createUserFromEmployee,
  updateUser,
  deleteUser,
  updateUserStatus,
  updateUserRole
} = require("../controllers/userController");

const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");   // ✅ NEW

// ===== All routes require authentication =====
router.use(protect);

router.get("/", getUsers);
router.get("/:id", getUserById);
router.post("/", upload.single("profileImage"), createUser);        // ✅ NEW
router.post("/from-employee", createUserFromEmployee);
router.put("/:id", upload.single("profileImage"), updateUser);       // ✅ NEW
router.delete("/:id", deleteUser);
router.patch("/:id/status", updateUserStatus);
router.patch("/:id/role", updateUserRole);

module.exports = router;