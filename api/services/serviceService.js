import Service from "../models/serviceModel.js";
import cloudinary from "cloudinary";

// ============================================
// HELPER: UPLOAD IMAGE TO CLOUDINARY
// ============================================
const uploadImageToCloudinary = async (imageBuffer, isPublished, slug) => {
  return new Promise((resolve, reject) => {
    const folder = isPublished
      ? "pbgroup/services/active"
      : "pbgroup/services/inactive";

    const uploadStream = cloudinary.v2.uploader.upload_stream(
      {
        folder,
        public_id: slug,
        format: "webp",
        transformation: [
          { width: 1920, height: 1280, crop: "limit" },
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);

        // ✅ Use Cloudinary metadata ONLY
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      },
    );

    uploadStream.end(imageBuffer);
  });
};

// ============================================
// HELPER: MOVE IMAGE BETWEEN FOLDERS
// ============================================
const moveCloudinaryImage = async (oldPublicId, newFolder, slug) => {
  try {
    const newPublicId = `${newFolder}/${slug}`;

    // Rename (move) the image to new folder
    await cloudinary.v2.uploader.rename(oldPublicId, newPublicId);

    return newPublicId;
  } catch (error) {
    console.error("Error moving image in Cloudinary:", error);
    throw error;
  }
};

// ============================================
// SERVICE: FETCH ACTIVE SERVICES (PUBLIC)
// ============================================
export async function fetchActiveServices({ showOnHomepage = true } = {}) {
  const filter = { isPublished: true };

  if (showOnHomepage !== undefined) {
    filter.showOnHomepage = showOnHomepage;
  }

  const services = await Service.find(filter)
    .select(
      "title slug subtitle shortDescription iconName heroImage displayOrder isPublished showOnHomepage",
    )
    .sort({ displayOrder: 1, createdAt: -1 })
    .lean();

  return services;
}

// ============================================
// SERVICE: FETCH SERVICE BY SLUG (PUBLIC)
// ============================================
export async function fetchServiceBySlug(slug) {
  const service = await Service.findOne({ slug, isPublished: true })
    .select("-__v")
    .lean();

  if (!service) {
    throw new Error("Service not found");
  }

  // ✅ Increment view count asynchronously (don't wait)
  Service.incrementView(service._id).catch((err) =>
    console.error("Failed to increment view count:", err),
  );

  return service;
}

// ============================================
// SERVICE: FETCH ALL SERVICES (ADMIN)
// ============================================
export async function fetchAllServices({
  page = 1,
  limit = 10,
  status,
  search = "",
  showOnHomepage,
}) {
  const filter = {};

  // Apply status filter
  if (status === "active") {
    filter.isPublished = true;
  } else if (status === "inactive") {
    filter.isPublished = false;
  }

  // Apply homepage filter
  if (showOnHomepage !== undefined) {
    filter.showOnHomepage = showOnHomepage === "true";
  }

  // ✅ Apply search using MongoDB text search
  let query;
  if (search && search.trim()) {
    // Use text search for better performance
    query = Service.find(
      {
        ...filter,
        $text: { $search: search.trim() },
      },
      { score: { $meta: "textScore" } },
    ).sort({ score: { $meta: "textScore" } });
  } else {
    query = Service.find(filter).sort({ displayOrder: 1, createdAt: -1 });
  }

  // Fetch services with pagination
  const services = await query
    .limit(Number(limit))
    .skip((page - 1) * limit)
    .select("-__v")
    .lean();

  // Get total count
  const totalServices =
    search && search.trim()
      ? await Service.countDocuments({
          ...filter,
          $text: { $search: search.trim() },
        })
      : await Service.countDocuments(filter);

  return {
    services,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(totalServices / limit),
      totalServices,
      limit: Number(limit),
    },
  };
}

// ============================================
// SERVICE: CREATE SERVICE (ADMIN)
// ============================================
export async function createServiceService({
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
  imageFile,
  username,
}) {
  // Check if slug already exists
  const existingService = await Service.findOne({ slug });
  if (existingService) {
    throw new Error("Service with this slug already exists");
  }

  // ✅ Parse boolean from string (FormData sends as 'true'/'false')
  const shouldPublish = isPublished === "true" || isPublished === true;

  // ✅ Upload image with metadata
  const cloudinaryResult = await uploadImageToCloudinary(
    imageFile.buffer,
    shouldPublish,
    slug,
  );

  // ✅ Parse arrays if they come as JSON strings
  const parsedResearchTypes = Array.isArray(researchTypes) 
    ? researchTypes 
    : (typeof researchTypes === 'string' ? JSON.parse(researchTypes || '[]') : []);

  // Create service record with correct structure
  const newService = await Service.create({
    title,
    slug,
    subtitle: subtitle || undefined,
    shortDescription,
    description,
    iconName: iconName || 'BarChart3',
    heroImage: {
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      format: cloudinaryResult.format,
      size: cloudinaryResult.bytes,
    },
    researchTypes: parsedResearchTypes,
    isPublished: shouldPublish,
    showOnHomepage: showOnHomepage === "true" || showOnHomepage === true,
    displayOrder: parseInt(displayOrder) || 0,
    seo: seo || {},
    createdBy: username,
  });

  return newService;
}

// ============================================
// SERVICE: UPDATE SERVICE (ADMIN)
// ============================================
export async function updateServiceService({
  serviceId,
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
  newImageFile,
  username,
}) {
  // Find existing service
  const existingService = await Service.findById(serviceId);

  if (!existingService) {
    throw new Error("Service not found");
  }

  // Check if new slug conflicts with another service
  if (slug && slug !== existingService.slug) {
    const conflictingService = await Service.findOne({ slug });
    if (conflictingService && conflictingService._id.toString() !== serviceId) {
      throw new Error("Service with this slug already exists");
    }
  }

  // ✅ Parse boolean from string
  const shouldPublish = isPublished === "true" || isPublished === true;
  const wasPublished = existingService.isPublished;
  const newSlug = slug || existingService.slug;

  // ============================================
  // HANDLE IMAGE UPDATE
  // ============================================
  if (newImageFile) {
    // Delete old image from Cloudinary
    try {
      await cloudinary.v2.uploader.destroy(existingService.heroImage.publicId);
    } catch (cloudinaryError) {
      console.warn("⚠️ Warning: Failed to delete old image:", cloudinaryError);
    }

    // Upload new image
    const cloudinaryResult = await uploadImageToCloudinary(
      newImageFile.buffer,
      shouldPublish,
      newSlug,
    );

    // ✅ FIXED: Use correct property names from cloudinaryResult
    existingService.heroImage = {
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      width: cloudinaryResult.width,      // ✅ Fixed from originalWidth
      height: cloudinaryResult.height,    // ✅ Fixed from originalHeight
      format: cloudinaryResult.format,
      size: cloudinaryResult.bytes,
    };
  } else if (shouldPublish !== wasPublished) {
    // ✅ Move image between active/inactive folders if status changed
    try {
      const oldPublicId = existingService.heroImage.publicId;
      const newFolder = shouldPublish
        ? "pbgroup/services/active"
        : "pbgroup/services/inactive";

      const newPublicId = await moveCloudinaryImage(
        oldPublicId,
        newFolder,
        newSlug,
      );

      // Update URL and publicId
      existingService.heroImage.publicId = newPublicId;
      existingService.heroImage.url = existingService.heroImage.url.replace(
        oldPublicId,
        newPublicId,
      );
    } catch (cloudinaryError) {
      console.warn("⚠️ Warning: Failed to move image:", cloudinaryError);
    }
  }

  // ============================================
  // UPDATE SERVICE FIELDS
  // ============================================
  if (title !== undefined) existingService.title = title;
  if (slug !== undefined) existingService.slug = slug;
  if (subtitle !== undefined) existingService.subtitle = subtitle;
  if (shortDescription !== undefined)
    existingService.shortDescription = shortDescription;
  if (description !== undefined) existingService.description = description;
  if (iconName !== undefined) existingService.iconName = iconName;
  
  // ✅ Parse arrays if they come as JSON strings
  if (researchTypes !== undefined) {
    existingService.researchTypes = Array.isArray(researchTypes)
      ? researchTypes
      : (typeof researchTypes === 'string' ? JSON.parse(researchTypes || '[]') : []);
  }
  
  if (isPublished !== undefined) existingService.isPublished = shouldPublish;
  if (showOnHomepage !== undefined) {
    existingService.showOnHomepage =
      showOnHomepage === "true" || showOnHomepage === true;
  }
  if (displayOrder !== undefined)
    existingService.displayOrder = parseInt(displayOrder) || 0;
  if (seo !== undefined)
    existingService.seo = { ...existingService.seo, ...seo };

  existingService.updatedBy = username;

  await existingService.save();

  return existingService;
}

// ============================================
// SERVICE: DELETE SERVICE (ADMIN)
// ============================================
export async function deleteServiceService(serviceId) {
  const serviceToDelete = await Service.findById(serviceId);

  if (!serviceToDelete) {
    throw new Error("Service not found");
  }

  // Delete image from Cloudinary
  try {
    await cloudinary.v2.uploader.destroy(serviceToDelete.heroImage.publicId);
  } catch (cloudinaryError) {
    console.warn(
      "⚠️ Warning: Failed to delete image from Cloudinary:",
      cloudinaryError,
    );
  }

  // Delete service from database
  await Service.findByIdAndDelete(serviceId);

  return { success: true };
}

// ============================================
// SERVICE: TOGGLE PUBLISH STATUS (ADMIN)
// ============================================
export async function toggleServicePublishService({
  serviceId,
  isPublished,
  username,
}) {
  const service = await Service.findById(serviceId);

  if (!service) {
    throw new Error("Service not found");
  }

  const shouldPublish = isPublished === "true" || isPublished === true;
  const wasPublished = service.isPublished;

  // Move image between folders if status changed
  if (shouldPublish !== wasPublished) {
    try {
      const oldPublicId = service.heroImage.publicId;
      const newFolder = shouldPublish
        ? "pbgroup/services/active"
        : "pbgroup/services/inactive";

      const newPublicId = await moveCloudinaryImage(
        oldPublicId,
        newFolder,
        service.slug,
      );

      service.heroImage.publicId = newPublicId;
      service.heroImage.url = service.heroImage.url.replace(
        oldPublicId,
        newPublicId,
      );
    } catch (cloudinaryError) {
      console.warn("⚠️ Warning: Failed to move image:", cloudinaryError);
    }
  }

  service.isPublished = shouldPublish;
  service.updatedBy = username;

  await service.save();

  return service;
}

// ============================================
// SERVICE: REORDER SERVICES (ADMIN)
// ============================================
export async function reorderServicesService(orderData) {
  // orderData: [{ serviceId, displayOrder }, ...]

  if (!Array.isArray(orderData) || orderData.length === 0) {
    throw new Error("orderData must be a non-empty array");
  }

  const bulkOps = orderData.map(({ serviceId, displayOrder }) => ({
    updateOne: {
      filter: { _id: serviceId },
      update: { $set: { displayOrder } },
    },
  }));

  await Service.bulkWrite(bulkOps);

  return { success: true };
}