import express from 'express';


import { authMiddleware, requireAdmin, requireSuperAdmin } from '../middlewares/authMiddleware.js';
import { getSuperAdminDashboard } from '../controller/dashboardController.js';

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
  getSuperAdminDashboard
);

export default router;