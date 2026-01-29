import cloudinary from 'cloudinary';
import appConfig from '../config/appConfig.js';
import multer from 'multer';
import { getCachedData, invalidateCachePattern } from '../services/cacheService.js';
import {
  fetchActiveServices,
  fetchServiceBySlug,
  fetchAllServices,
  createServiceService,
  updateServiceService,
  deleteServiceService,
  toggleServicePublishService,
  reorderServicesService,
} from '../services/serviceService.js';

// ============================================
// CLOUDINARY CONFIGURATION
// ============================================
cloudinary.v2.config({
  cloudinary_url: appConfig.cloudinaryUrl,
});

// ============================================
// MULTER CONFIGURATION FOR IMAGE UPLOADS
// ============================================
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// ============================================
// CONTROLLER: GET ACTIVE SERVICES (PUBLIC)
// ============================================
export const getActiveServices = async (req, res) => {
  try {
    const { showOnHomepage } = req.query;
    
    const cacheKey = `services:active:homepage=${showOnHomepage || 'all'}`;
    
    // ✅ Aggressive caching - 30 minutes (services don't change frequently)
    const services = await getCachedData(
      cacheKey,
      30 * 60, // 30 minutes
      async () => {
        return await fetchActiveServices({ 
          showOnHomepage: showOnHomepage !== undefined ? showOnHomepage === 'true' : undefined 
        });
      }
    );

    res.status(200).json({
      success: true,
      data: {
        services: services || [],
      },
    });
  } catch (error) {
    console.error('❌ Error fetching active services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
    });
  }
};

// ============================================
// CONTROLLER: GET SERVICE BY SLUG (PUBLIC)
// ============================================
export const getServiceBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Slug is required',
      });
    }
    
    const cacheKey = `service:slug:${slug}`;
    
    // ✅ Cache individual service for 15 minutes
    const service = await getCachedData(
      cacheKey,
      15 * 60, // 15 minutes
      async () => {
        return await fetchServiceBySlug(slug);
      }
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        service,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching service by slug:', error);
    
    if (error.message === 'Service not found') {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service',
    });
  }
};

// ============================================
// CONTROLLER: GET ALL SERVICES (ADMIN)
// ============================================
export const getAllServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search = '', showOnHomepage } = req.query;
    
    // Create unique cache key based on query parameters
    const cacheKey = `dashboard:shared:services:page=${page}:limit=${limit}:status=${status || 'all'}:search=${search}:homepage=${showOnHomepage || 'all'}`;

    // ✅ Cache admin list for 2 minutes (matches frontend staleTime)
    const servicesData = await getCachedData(
      cacheKey,
      2 * 60, // 2 minutes
      async () => {
        return await fetchAllServices({ page, limit, status, search, showOnHomepage });
      }
    );

    res.status(200).json({
      success: true,
      data: servicesData,
    });
  } catch (error) {
    console.error('❌ Error fetching all services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
    });
  }
};

// ============================================
// CONTROLLER: CREATE SERVICE (ADMIN)
// ============================================
export const createService = async (req, res) => {
  try {
    const {
      title,
      slug,
      subtitle,
      shortDescription,
      description,
      iconName,
      researchTypes,
      isPublished,
      showOnHomepage,
      displayOrder,
      seo,
    } = req.body;

    const imageFile = req.file;

    // ============================================
    // VALIDATION
    // ============================================
    
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    if (!slug || !slug.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Slug is required',
      });
    }

    if (!shortDescription || shortDescription.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Short description must be at least 50 characters',
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Description is required',
      });
    }

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: 'Hero image is required',
      });
    }

    // ============================================
    // PARSE JSON STRINGS FROM FORMDATA
    // ============================================
    
    let parsedResearchTypes = [];
    if (researchTypes) {
      try {
        parsedResearchTypes = typeof researchTypes === 'string' 
          ? JSON.parse(researchTypes) 
          : researchTypes;
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid researchTypes format',
        });
      }
    }
    
    let parsedSeo = {};
    if (seo) {
      try {
        parsedSeo = typeof seo === 'string' 
          ? JSON.parse(seo) 
          : seo;
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid SEO format',
        });
      }
    }

    // ============================================
    // CREATE SERVICE
    // ============================================

    const newService = await createServiceService({
      title: title.trim(),
      slug: slug.trim(),
      subtitle: subtitle?.trim(),
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      iconName: iconName || 'BarChart3',
      researchTypes: parsedResearchTypes,
      isPublished,
      showOnHomepage,
      displayOrder,
      seo: parsedSeo,
      imageFile,
      username: req.user.username,
    });

    // ============================================
    // INVALIDATE REDIS CACHES
    // ============================================
    
    await Promise.all([
      invalidateCachePattern('dashboard:shared:services*'),
      invalidateCachePattern('services:active:*'),
      invalidateCachePattern('service:slug:*'),
    ]);

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: { service: newService },
    });
  } catch (error) {
    console.error('❌ Error creating service:', error);
    
    if (error.message === 'Service with this slug already exists') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    if (error.message && error.message.includes('validation')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================
// CONTROLLER: UPDATE SERVICE (ADMIN)
// ============================================
export const updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required',
      });
    }

    const {
      title,
      slug,
      subtitle,
      shortDescription,
      description,
      iconName,
      researchTypes,
      isPublished,
      showOnHomepage,
      displayOrder,
      seo,
    } = req.body;

    const newImageFile = req.file;

    // ============================================
    // VALIDATION (only validate provided fields)
    // ============================================
    
    if (title !== undefined && !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title cannot be empty',
      });
    }

    if (slug !== undefined && !slug.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Slug cannot be empty',
      });
    }

    if (shortDescription !== undefined && shortDescription.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Short description must be at least 50 characters',
      });
    }

    if (description !== undefined && !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Description cannot be empty',
      });
    }

    // ============================================
    // PARSE JSON STRINGS FROM FORMDATA
    // ============================================
    
    let parsedResearchTypes = researchTypes;
    if (researchTypes) {
      try {
        parsedResearchTypes = typeof researchTypes === 'string' 
          ? JSON.parse(researchTypes) 
          : researchTypes;
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid researchTypes format',
        });
      }
    }
    
    let parsedSeo = seo;
    if (seo) {
      try {
        parsedSeo = typeof seo === 'string' 
          ? JSON.parse(seo) 
          : seo;
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid SEO format',
        });
      }
    }

    // ============================================
    // UPDATE SERVICE
    // ============================================

    const updatedService = await updateServiceService({
      serviceId,
      title: title?.trim(),
      slug: slug?.trim(),
      subtitle: subtitle?.trim(),
      shortDescription: shortDescription?.trim(),
      description: description?.trim(),
      iconName,
      researchTypes: parsedResearchTypes,
      isPublished,
      showOnHomepage,
      displayOrder,
      seo: parsedSeo,
      newImageFile,
      username: req.user.username,
    });

    // ============================================
    // INVALIDATE REDIS CACHES
    // ============================================
    
    await Promise.all([
      invalidateCachePattern('dashboard:shared:services*'),
      invalidateCachePattern('services:active:*'),
      invalidateCachePattern(`service:slug:*`),
    ]);

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: { service: updatedService },
    });
  } catch (error) {
    console.error('❌ Error updating service:', error);
    
    if (error.message === 'Service not found') {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }
    
    if (error.message === 'Service with this slug already exists') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    if (error.message && error.message.includes('validation')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================
// CONTROLLER: DELETE SERVICE (ADMIN)
// ============================================
export const deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required',
      });
    }

    await deleteServiceService(serviceId);

    // ============================================
    // INVALIDATE REDIS CACHES
    // ============================================
    
    await Promise.all([
      invalidateCachePattern('dashboard:shared:services*'),
      invalidateCachePattern('services:active:*'),
      invalidateCachePattern('service:slug:*'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting service:', error);
    
    if (error.message === 'Service not found') {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================
// CONTROLLER: TOGGLE PUBLISH STATUS (ADMIN)
// ============================================
export const toggleServicePublish = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { isPublished } = req.body;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required',
      });
    }

    if (isPublished === undefined) {
      return res.status(400).json({
        success: false,
        message: 'isPublished field is required',
      });
    }

    const updatedService = await toggleServicePublishService({
      serviceId,
      isPublished,
      username: req.user.username,
    });

    // ============================================
    // INVALIDATE REDIS CACHES
    // ============================================
    
    await Promise.all([
      invalidateCachePattern('dashboard:shared:services*'),
      invalidateCachePattern('services:active:*'),
      invalidateCachePattern(`service:slug:${updatedService.slug}`),
    ]);

    res.status(200).json({
      success: true,
      message: `Service ${isPublished ? 'published' : 'unpublished'} successfully`,
      data: { service: updatedService },
    });
  } catch (error) {
    console.error('❌ Error toggling service publish status:', error);
    
    if (error.message === 'Service not found') {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update publish status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ============================================
// CONTROLLER: REORDER SERVICES (ADMIN)
// ============================================
export const reorderServices = async (req, res) => {
  try {
    const { orderData } = req.body;

    // ============================================
    // VALIDATION
    // ============================================
    
    if (!orderData) {
      return res.status(400).json({
        success: false,
        message: 'orderData is required',
      });
    }

    if (!Array.isArray(orderData)) {
      return res.status(400).json({
        success: false,
        message: 'orderData must be an array',
      });
    }

    if (orderData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'orderData cannot be empty',
      });
    }

    // Validate each item has serviceId and displayOrder
    const isValid = orderData.every(
      item => item.serviceId && typeof item.displayOrder === 'number'
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Each item must have serviceId and displayOrder (number)',
      });
    }

    await reorderServicesService(orderData);

    // ============================================
    // INVALIDATE REDIS CACHES
    // ============================================
    
    await Promise.all([
      invalidateCachePattern('dashboard:shared:services*'),
      invalidateCachePattern('services:active:*'),
    ]);

    res.status(200).json({
      success: true,
      message: 'Services reordered successfully',
    });
  } catch (error) {
    console.error('❌ Error reordering services:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reorder services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};