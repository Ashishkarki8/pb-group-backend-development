
//without no optimisation for public poster
// import cloudinary from 'cloudinary';
// import appConfig from '../config/appConfig.js';
// import CallToAction from '../models/callToActionModel.js';
// import multer from 'multer';
// import { getCachedData, invalidateCachePattern } from '../services/cacheService.js';
// import {
//   fetchAllBanners,
//   createBannerService,
//   updateBannerService, 
//   deleteBannerService,
// } from '../services/dashboardServices.js';

// // ============================================
// // CLOUDINARY CONFIGURATION
// // ============================================
// cloudinary.v2.config({
//   cloudinary_url: appConfig.cloudinaryUrl,
// });

// // ============================================
// // MULTER CONFIGURATION FOR IMAGE UPLOADS
// // ============================================
// const storage = multer.memoryStorage();

// export const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
//   fileFilter: (req, file, cb) => {
//     // Only accept image files
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only image files are allowed'), false);
//     }
//   },
// });

// // ============================================
// // CONTROLLER: CREATE NEW BANNER (ADMIN)
// // ============================================
// export const createBanner = async (req, res) => {
//   try {
//     const { link, altText, isActive } = req.body;
//     const imageFile = req.file;

//     // Validate image file presence
//     if (!imageFile) {
//       return res.status(400).json({
//         success: false,
//         message: 'Image file is required',
//       });
//     }

//     // Create banner via service
//     const newBanner = await createBannerService({
//       link,
//       altText,
//       isActive,
//       imageFile,
//       username: req.user.username,
//     });

//     // Invalidate all banner-related cache
//     await invalidateCachePattern('dashboard:shared:banners*');

//     res.status(201).json({
//       success: true,
//       message: 'Banner created successfully',
//       data: {
//         banner: newBanner,
//       },
//     });
//   } catch (error) {
//     console.error('❌ Error creating banner:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create banner',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined,
//     });
//   }
// };

// // ============================================
// // CONTROLLER: GET ACTIVE BANNER (PUBLIC)
// // ============================================
// export const getActiveBanner = async (req, res) => {
//   try {
//     // Fetch the most recently created active banner
//     const activeBanner = await CallToAction.findOne({ isActive: true })
//       .sort({ createdAt: -1 })
//       .select('imageUrl link altText')
//       .lean();

//     res.status(200).json({
//       success: true,
//       data: {
//         banner: activeBanner || null,
//       },
//     });
//   } catch (error) {
//     console.error('❌ Error fetching active banner:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch active banner',
//     });
//   }
// };

// // ============================================
// // CONTROLLER: GET ALL BANNERS (ADMIN)
// // ============================================
// export const getAllBanners = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, status } = req.query;
//     console.log("status",status)
//     // Create unique cache key based on query parameters
//     const cacheKey = `dashboard:shared:banners:page=${page}:limit=${limit}:status=${status || 'all'}`;

//     // Fetch with Redis cache (5 min TTL)
//     const bannersData = await getCachedData(cacheKey,300,() => fetchAllBanners({ page, limit, status }));

//     res.status(200).json({
//       success: true,
//       data: bannersData,
//     });
//   } catch (error) {
//     console.error('❌ Error fetching banners:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch banners',
//     });
//   }
// };

// // ============================================
// // CONTROLLER: UPDATE BANNER (ADMIN)
// // ============================================
// export const updateBanner = async (req, res) => {
//   try {
//     const { bannerId } = req.params;
//     const { link, altText, isActive } = req.body;
//     const newImageFile = req.file;

//     // Update banner via service
//     const updatedBanner = await updateBannerService({
//       bannerId,
//       link,
//       altText,
//       isActive,
//       newImageFile,
//     });

//     // Invalidate all banner-related cache
//     await invalidateCachePattern('dashboard:shared:banners*');

//     res.status(200).json({
//       success: true,
//       message: 'Banner updated successfully',
//       data: {
//         banner: updatedBanner,
//       },
//     });
//   } catch (error) {
//     console.error('❌ Error updating banner:', error);
    
//     // Handle specific errors
//     if (error.message === 'Banner not found') {
//       return res.status(404).json({
//         success: false,
//         message: 'Banner not found',
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: 'Failed to update banner',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined,
//     });
//   }
// };

// // ============================================
// // CONTROLLER: DELETE BANNER (ADMIN)
// // ============================================
// export const deleteBanner = async (req, res) => {
//   try {
//     const { bannerId } = req.params;

//     // Delete banner via service
//     await deleteBannerService(bannerId);

//     // Invalidate all banner-related cache
//     await invalidateCachePattern('dashboard:shared:banners*');

//     res.status(200).json({
//       success: true,
//       message: 'Banner deleted successfully',
//     });
//   } catch (error) {
//     console.error('❌ Error deleting banner:', error);
//     // Handle specific errors
//     if (error.message === 'Banner not found') {
//       return res.status(404).json({
//         success: false,
//         message: 'Banner not found',
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: 'Failed to delete banner',
//     });
//   }
// };



import cloudinary from 'cloudinary';
import appConfig from '../config/appConfig.js';
import CallToAction from '../models/callToActionModel.js';
import multer from 'multer';
import { getCachedData, invalidateCachePattern } from '../services/cacheService.js';
import {
  fetchAllBanners,
  createBannerService,
  updateBannerService, 
  deleteBannerService,
} from '../services/dashboardServices.js';

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
    // Only accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// CONTROLLER: GET ACTIVE BANNER (PUBLIC) - OPTIMIZED
// ============================================
export const getActiveBanner = async (req, res) => {
  try {
    const cacheKey = 'banner:active:public';
    
    // ✅ Try to get from Redis cache first (30 minute TTL)
    const cachedBanner = await getCachedData(
      cacheKey,
      50 * 60, // 30 minutes - banners don't change frequently
      async () => {
        // Fetch from database if not in cache
        const activeBanner = await CallToAction.findOne({ isActive: true })
          .sort({ createdAt: -1 })
          .select('imageUrl link altText')
          .lean();
        
        return activeBanner;
      }
    );

    res.status(200).json({
      success: true,
      data: {
        banner: cachedBanner || null,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching active banner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active banner',
    });
  }
};

// // CONTROLLER: GET ALL BANNERS (ADMIN)
// ============================================
export const getAllBanners = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    console.log("status",status)
    // Create unique cache key based on query parameters
    const cacheKey = `dashboard:shared:banners:page=${page}:limit=${limit}:status=${status || 'all'}`;

    // Fetch with Redis cache (5 min TTL)
    const bannersData = await getCachedData(cacheKey,300,() => fetchAllBanners({ page, limit, status }));

    res.status(200).json({
      success: true,
      data: bannersData,
    });
  } catch (error) {
    console.error('❌ Error fetching banners:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
    });
  }
};




// ============================================
// UPDATED MUTATION CONTROLLERS
// Must invalidate active banner cache
// ============================================

export const createBanner = async (req, res) => {
  try {
    const { link, altText, isActive } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required',
      });
    }

    const newBanner = await createBannerService({
      link,
      altText,
      isActive,
      imageFile,
      username: req.user.username,
    });

    // ✅ Invalidate both admin dashboard AND public banner cache
    await invalidateCachePattern('dashboard:shared:banners*');
    await invalidateCachePattern('banner:active:*'); // Important!

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: { banner: newBanner },
    });
  } catch (error) {
    console.error('❌ Error creating banner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create banner',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};



export const updateBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;
    const { link, altText, isActive } = req.body;
    const newImageFile = req.file;

    const updatedBanner = await updateBannerService({
      bannerId,
      link,
      altText,
      isActive,
      newImageFile,
    });

    // ✅ Invalidate caches
    await invalidateCachePattern('dashboard:shared:banners*');
    await invalidateCachePattern('banner:active:*');

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: { banner: updatedBanner },
    });
  } catch (error) {
    console.error('❌ Error updating banner:', error);
    
    if (error.message === 'Banner not found') {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update banner',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    await deleteBannerService(bannerId);

    // ✅ Invalidate caches
    await invalidateCachePattern('dashboard:shared:banners*');
    await invalidateCachePattern('banner:active:*');

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting banner:', error);
    // ✅ FIXED: Removed stray 's' from your original code
    
    if (error.message === 'Banner not found') {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete banner',
    });
  }
};