import Admin from "../models/admin.model.js";
import CallToAction from "../models/callToActionModel.js";
import cloudinary from 'cloudinary';

// Super Admin queries
export async function fetchAllAdmins() {
  console.log("inside fetchAll Admins");
  return await Admin.find({ role: 'admin' }) //node crude operation ko lagi hami admin model pani use garnai parcha
    .select('name email createdAt status')
    .lean(); // Use .lean() for better performance
}

export async function fetchTotalAdminsCount() {
  return await Admin.countDocuments({ role: 'admin' });
}


const uploadImageToCloudinary = (imageBuffer, isActive) => {
  return new Promise((resolve, reject) => {
    // Organize images: active banners in 'active' folder, inactive in 'inactive' folder
    const folder = isActive
      ? 'calltoaction-banners/active'
      : 'calltoaction-banners/inactive';

    const uploadStream = cloudinary.v2.uploader.upload_stream(
      {
        folder,
        format: 'webp', // Convert to WebP for better compression
        transformation: [
          { width: 1920, height: 1080, crop: 'limit' }, // Maintain aspect ratio
          { quality: 'auto:good' }, // Automatic quality optimization
          { fetch_format: 'auto' }, // Serve best format based on browser
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(imageBuffer);
  });
};

// ============================================
// HELPER: DEACTIVATE ALL ACTIVE BANNERS
// ============================================
const deactivateAllBanners = async () => {
  await CallToAction.updateMany(
    { isActive: true },
    { isActive: false, updatedAt: new Date() }
  );
};

// ============================================
// HELPER: EXTRACT CLOUDINARY PUBLIC ID FROM URL
// ============================================
const extractCloudinaryPublicId = (imageUrl) => {
  // Example: https://res.cloudinary.com/.../calltoaction-banners/active/abc123.webp
  const parts = imageUrl.split('/');
  const folderAndFile = parts.slice(-2).join('/'); // Get last two parts (folder/filename)
  return folderAndFile.replace(/\.[^/.]+$/, ''); // Remove file extension
};

// ============================================
// HELPER: MOVE IMAGE BETWEEN CLOUDINARY FOLDERS
// ============================================
const moveCloudinaryImage = async (oldPublicId, newFolder) => {
  try {
    // Extract filename from public ID
    const filename = oldPublicId.split('/').pop();
    const newPublicId = `${newFolder}/${filename}`;

    // Rename (move) the image to new folder
    await cloudinary.v2.uploader.rename(oldPublicId, newPublicId);

    return newPublicId;
  } catch (error) {
    console.error('Error moving image in Cloudinary:', error);
    throw error;
  }
};

// ============================================
// SERVICE: FETCH ALL BANNERS (ADMIN)
// ============================================
export async function fetchAllBanners({ page = 1, limit = 10, status }) { //status means selection
  const filter = {};

  // Apply status filter
  if (status === 'active') {
    filter.isActive = true;
  } else if (status === 'inactive') {
    filter.isActive = false;
  }

  
  // Fetch banners with pagination
  const banners = await CallToAction.find(filter)  //empty bhayo bhani all  filter ={}
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((page - 1) * limit) //skip means to skip the first nth number of cards so 0 inthiscase and in page 2 skip = (2 - 1) * 10 = 10 means it skips 1st 10th number of data
    .lean();

  const totalBanners = await CallToAction.countDocuments(filter);

  return {
    banners,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(totalBanners / limit),
      totalBanners,
    },
  };
}

// ============================================
// SERVICE: CREATE BANNER (ADMIN)
// ============================================
export async function createBannerService({
  link,
  altText,
  isActive,
  imageFile,
  username,
}) {
  const shouldActivate = isActive === 'true' || isActive === true;

  // If creating an active banner, deactivate all existing active banners
  if (shouldActivate) {
    await deactivateAllBanners();
  }

  // Upload image to appropriate Cloudinary folder
  const cloudinaryResult = await uploadImageToCloudinary(
    imageFile.buffer,
    shouldActivate
  );

  // Create banner record in database
  const newBanner = await CallToAction.create({
    imageUrl: cloudinaryResult.secure_url,
    link: link || null,
    altText: altText || 'Call to Action Banner',
    isActive: shouldActivate,
    createdBy: username,
  });

  return newBanner;
}

// ============================================
// SERVICE: UPDATE BANNER (ADMIN)
// ============================================
export async function updateBannerService({
  bannerId,
  link,
  altText,
  isActive,
  newImageFile,
}) {
  // Find existing banner
  const existingBanner = await CallToAction.findById(bannerId);

  if (!existingBanner) {
    throw new Error('Banner not found');
  }

  const shouldActivate = isActive === 'true' || isActive === true;
  const wasActive = existingBanner.isActive;

  // If activating this banner, deactivate all others
  if (shouldActivate && !wasActive) {
    await deactivateAllBanners();
  }

  // Handle image replacement
  if (newImageFile) {
    // Delete old image from Cloudinary
    try {
      const oldPublicId = extractCloudinaryPublicId(existingBanner.imageUrl);
      await cloudinary.v2.uploader.destroy(oldPublicId);
    } catch (cloudinaryError) {
      console.warn(
        '⚠️ Warning: Failed to delete old image from Cloudinary:',
        cloudinaryError
      );
    }

    // Upload new image
    const cloudinaryResult = await uploadImageToCloudinary(
      newImageFile.buffer,
      shouldActivate
    );
    existingBanner.imageUrl = cloudinaryResult.secure_url;
  } else if (shouldActivate !== wasActive) {
    // If only status changed (no new image), move image between folders
    try {
      const oldPublicId = extractCloudinaryPublicId(existingBanner.imageUrl);
      const newFolder = shouldActivate
        ? 'calltoaction-banners/active'
        : 'calltoaction-banners/inactive';

      const newPublicId = await moveCloudinaryImage(oldPublicId, newFolder);

      // Update URL to reflect new folder
      existingBanner.imageUrl = existingBanner.imageUrl.replace(
        oldPublicId,
        newPublicId
      );
    } catch (cloudinaryError) {
      console.warn(
        '⚠️ Warning: Failed to move image in Cloudinary:',
        cloudinaryError
      );
    }
  }

  // Update banner fields
  if (link !== undefined) existingBanner.link = link || null;
  if (altText !== undefined) existingBanner.altText = altText;
  if (isActive !== undefined) existingBanner.isActive = shouldActivate;
  existingBanner.updatedAt = new Date();

  await existingBanner.save();

  return existingBanner;
}

// ============================================
// SERVICE: DELETE BANNER (ADMIN)
// ============================================
export async function deleteBannerService(bannerId) {
  // Find banner to delete
  const bannerToDelete = await CallToAction.findById(bannerId);

  if (!bannerToDelete) {
    throw new Error('Banner not found');
  }

  // Delete image from Cloudinary
  try {
    const publicId = extractCloudinaryPublicId(bannerToDelete.imageUrl);
    await cloudinary.v2.uploader.destroy(publicId);
  } catch (cloudinaryError) {
    console.warn(
      '⚠️ Warning: Failed to delete image from Cloudinary:',
      cloudinaryError
    );
    // Continue with database deletion even if Cloudinary fails
  }

  // Delete banner from database
  await CallToAction.findByIdAndDelete(bannerId);

  return { success: true };
}

















// export async function fetchAllUsers() {
//   const total = await User.countDocuments();
//   const active = await User.countDocuments({ status: 'active' });
//   return { total, active };
// }

// Regular Admin queries
// export async function fetchAdminCourses(adminId) {
//   return await Course.countDocuments({ createdBy: adminId });
// }

// export async function fetchAdminStats(adminId) {
//   const totalCourses = await Course.countDocuments({ createdBy: adminId });
//   const totalViews = await Course.aggregate([
//     { $match: { createdBy: adminId } },
//     { $group: { _id: null, totalViews: { $sum: '$views' } } }
//   ]);
  
//   return {
//     totalCourses,
//     totalViews: totalViews[0]?.totalViews || 0
//   };
// }

// Shared data (notifications, recent activity, etc.)
// export async function fetchNotifications(userId, role) {
//   // Fetch role-specific notifications
//   return []; // Replace with actual logic
// }