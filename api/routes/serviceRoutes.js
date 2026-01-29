import express from 'express';
import {
  getActiveServices,
  getServiceBySlug,
  getAllServices,
  createService,
  updateService,
  deleteService,
  toggleServicePublish,
  reorderServices,
  upload,
} from '../controller/serviceController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const serviceRouter = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * @route   GET /api/services/active
 * @desc    Get all active/published services (for homepage)
 * @access  Public
 * @query   showOnHomepage (optional) - Filter by homepage display
 * 
 * Frontend usage:
 * - getActiveServicesApi({ showOnHomepage: true })
 * - Used in: Homepage, Services page
 * - Cache: 30 minutes (aggressive)
 */
serviceRouter.get('/active', getActiveServices);

/**
 * @route   GET /api/services/slug/:slug
 * @desc    Get single service by slug
 * @access  Public
 * @params  slug - Service slug (e.g., 'research-services')
 * 
 * Frontend usage:
 * - getServiceBySlugApi(slug)
 * - Used in: Service detail page
 * - Cache: 15 minutes
 */
serviceRouter.get('/slug/:slug', getServiceBySlug);

// ============================================
// ADMIN ROUTES (Protected)
// ============================================

/**
 * @route   GET /api/services
 * @desc    Get all services with filters & search (admin dashboard)
 * @access  Admin only
 * @query   page (default: 1)
 * @query   limit (default: 10)
 * @query   status ('active' | 'inactive' | undefined)
 * @query   search (string)
 * @query   showOnHomepage (boolean)
 * 
 * Frontend usage:
 * - getAllServicesApi({ page, limit, status, search, showOnHomepage })
 * - Used in: Service Management dashboard
 * - Cache: 2 minutes
 * - Features: Pagination, search, filters, abort signals
 */
serviceRouter.get(
  '/',
  authMiddleware,
  getAllServices
);

/**
 * @route   POST /api/services
 * @desc    Create new service
 * @access  Admin only
 * @body    FormData with:
 *          - title (string, required)
 *          - slug (string, required)
 *          - subtitle (string, optional)
 *          - shortDescription (string, required, min 50 chars)
 *          - description (string, required)
 *          - iconName (string, default: 'BarChart3')
 *          - heroImage (file, required, max 5MB)
 *          - researchTypes (JSON string array)
 *          - isPublished (string 'true'|'false')
 *          - showOnHomepage (string 'true'|'false')
 *          - displayOrder (number)
 *          - seo (JSON string object)
 * 
 * Frontend usage:
 * - createServiceApi(formData)
 * - Used in: CreateServiceForm
 * - Optimistic update: Yes
 * - Toast notifications: Yes
 */
serviceRouter.post(
  '/',
  authMiddleware,
  upload.single('heroImage'), // ✅ 'heroImage' matches frontend FormData field name
  createService
);

/**
 * @route   PUT /api/services/:serviceId
 * @desc    Update existing service
 * @access  Admin only
 * @params  serviceId - MongoDB ObjectId
 * @body    FormData with:
 *          - All fields from POST (all optional except those being updated)
 *          - heroImage (file, optional - only if uploading new image)
 * 
 * Frontend usage:
 * - updateServiceApi({ serviceId, formData })
 * - Used in: CreateServiceForm (edit mode)
 * - Optimistic update: Yes
 * - Toast notifications: Yes
 * - Image handling: Keeps existing if not uploaded
 */
serviceRouter.put(
  '/:serviceId',
  authMiddleware,
  upload.single('heroImage'), // ✅ Optional: only if uploading new image
  updateService
);

/**
 * @route   DELETE /api/services/:serviceId
 * @desc    Delete service
 * @access  Admin only
 * @params  serviceId - MongoDB ObjectId
 * 
 * Frontend usage:
 * - deleteServiceApi(serviceId)
 * - Used in: Service Management dashboard
 * - Optimistic update: Yes (removes immediately)
 * - Confirmation: Yes (shows dialog)
 * - Rollback: Automatic on error
 */
serviceRouter.delete(
  '/:serviceId',
  authMiddleware,
  deleteService
);

/**
 * @route   PATCH /api/services/:serviceId/publish
 * @desc    Toggle service publish status (quick action)
 * @access  Admin only
 * @params  serviceId - MongoDB ObjectId
 * @body    { isPublished: boolean }
 * 
 * Frontend usage:
 * - toggleServicePublishApi({ serviceId, isPublished })
 * - Used in: Service Management dashboard
 * - Optimistic update: Yes (toggles immediately)
 * - Toast notifications: Yes
 */
serviceRouter.patch(
  '/:serviceId/publish',
  authMiddleware,
  toggleServicePublish
);

/**
 * @route   PATCH /api/services/reorder
 * @desc    Reorder services (bulk update display order)
 * @access  Admin only
 * @body    { orderData: [{ serviceId, displayOrder }, ...] }
 * 
 * Frontend usage:
 * - updateServiceOrderApi(orderData)
 * - Used in: Service Management (drag & drop)
 * - Optimistic update: Yes
 * - Toast notifications: Yes
 * 
 * NOTE: This route MUST be after /:serviceId routes to avoid conflicts
 */
serviceRouter.patch(
  '/reorder',
  authMiddleware,
  reorderServices
);

export default serviceRouter;