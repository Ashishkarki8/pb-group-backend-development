
import express from 'express';
import {
  createBanner,
  getActiveBanner,
  getAllBanners,
  updateBanner,
  deleteBanner,
  upload,
} from '../controller/callToActionController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';


const bannerRouter = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================

// Get currently active banner (for frontend display)
bannerRouter.get('/active', getActiveBanner);

// ============================================
// ADMIN PROTECTED ROUTES
// ============================================

// Get all banners with pagination and filters (admin only)
bannerRouter.get(
  '/',
  authMiddleware,
  getAllBanners
);

// Create new banner (admin only)
bannerRouter.post(
  '/',
  authMiddleware,
  upload.single('image'), // 'image' is the field name in form-data
  createBanner
);

// Update existing banner (admin only)
bannerRouter.put(
  '/:bannerId',
  upload.single('image'), // Optional: only if replacing image
  updateBanner
);

// Delete banner (admin only)
bannerRouter.delete(
  '/:bannerId',
  authMiddleware,
  deleteBanner
);

export default bannerRouter;