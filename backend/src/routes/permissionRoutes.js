const express = require("express");
const router = express.Router();

const {
  getAllPermissions,
  getRolePermissions,
  assignPermission,
  removePermission,
} = require("../controllers/permissionController");

router.get("/permissions", getAllPermissions);
router.get("/roles/:roleId/permissions", getRolePermissions);
router.post("/role-permissions", assignPermission);
router.delete("/role-permissions", removePermission);

module.exports = router;