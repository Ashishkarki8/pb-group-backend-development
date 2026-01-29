import express from 'express';


import { authMiddleware, requireAdmin, requireSuperAdmin } from '../middlewares/authMiddleware.js';
import { getAdminDashboard, getSuperAdminDashboard } from '../controller/dashboardController.js';

const router = express.Router();

// Super Admin only
router.get(
  '/super-admin',
  authMiddleware,
  requireSuperAdmin,
  getSuperAdminDashboard
);

// Regular Admin (both super and regular can access this)
router.get(
  '/admin',
  authMiddleware,
  requireAdmin, // Allows both admin & superAdmin
  getAdminDashboard
);

export default router;