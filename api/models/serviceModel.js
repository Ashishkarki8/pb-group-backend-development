import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    // ============================================
    // BASIC INFORMATION
    // ============================================
    title: {
      type: String,
      required: [true, 'Service title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
      index: true, // ✅ Index for search optimization
    },
    
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
      index: true, // ✅ Index for fast slug lookups
    },
    
    subtitle: {
      type: String,
      trim: true,
      maxlength: [250, 'Subtitle cannot exceed 250 characters'],
    },
    
    shortDescription: {
      type: String,
      required: [true, 'Short description is required'],
      trim: true,
      minlength: [50, 'Short description must be at least 50 characters'],
      maxlength: [350, 'Short description cannot exceed 350 characters'],
    },
    
    description: {
      type: String,
      required: [true, 'Full description is required'],
      trim: true,
      minlength: [50, 'Description must be at least 50 characters'],
    },

    // ============================================
    // VISUAL ELEMENTS
    // ============================================
    iconName: {
      type: String,
      required: [true, 'Icon name is required'],
      enum: ['BarChart3', 'Smartphone', 'TrendingUp', 'Monitor', 'Grid3x3', 'GraduationCap'],
      default: 'BarChart3',
    },
    
    heroImage: {
      url: {
        type: String,
        required: [true, 'Hero image URL is required'],
      },
      publicId: {
        type: String,
        required: [true, 'Cloudinary public ID is required'],
      },
      width: {
        type: Number,

      },
      height: {
        type: Number,

      },
      format: {
        type: String,
        default: 'webp',
      },
      size: {
        type: Number, // File size in bytes
      },
    },

    // ============================================
    // CATEGORIZATION
    // ============================================
    researchTypes: {
      type: [String],
      default: [],
      validate: {
        validator: function(arr) {
          return arr.length <= 10; // Max 10 research types
        },
        message: 'Cannot have more than 10 research types',
      },
    },

    // ============================================
    // PUBLISHING CONTROLS
    // ============================================
    isPublished: {
      type: Boolean,
      default: false,
      index: true, // ✅ Index for filtering published services
    },
    
    showOnHomepage: {
      type: Boolean,
      default: true,
      index: true, // ✅ Index for homepage queries
    },
    
    displayOrder: {
      type: Number,
      default: 0,
      index: true, // ✅ Index for sorting
    },

    // ============================================
    // SEO OPTIMIZATION
    // ============================================
    seo: {
      metaTitle: {
        type: String,
        trim: true,
        maxlength: [70, 'Meta title cannot exceed 70 characters'],
      },
      metaDescription: {
        type: String,
        trim: true,
        maxlength: [160, 'Meta description cannot exceed 160 characters'],
      },
      metaKeywords: {
        type: [String],
        default: [],
        validate: {
          validator: function(arr) {
            return arr.length <= 15;
          },
          message: 'Cannot have more than 15 meta keywords',
        },
      },
    },

    // ============================================
    // ANALYTICS & TRACKING
    // ============================================
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    lastViewedAt: {
      type: Date,
    },

    // ============================================
    // AUDIT FIELDS
    // ============================================
    createdBy: {
      type: String,
      required: [true, 'Creator username is required'],
    },
    
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true, // ✅ Auto-generates createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// ✅ Compound index for homepage query (most common query)
serviceSchema.index({ isPublished: 1, showOnHomepage: 1, displayOrder: 1 });

// ✅ Text index for search functionality
serviceSchema.index(
  { 
    title: 'text', 
    shortDescription: 'text', 
    description: 'text' 
  },
  {
    weights: {
      title: 10,           // Title matches are most important
      shortDescription: 5, // Short description is medium
      description: 1,      // Full description is least important
    },
    name: 'service_search_index',
  }
);

// ============================================
// VIRTUAL FIELDS
// ============================================

// Virtual for full SEO-optimized title
serviceSchema.virtual('fullTitle').get(function() {
  return this.seo?.metaTitle || this.title;
});

// Virtual for full SEO-optimized description
serviceSchema.virtual('fullDescription').get(function() {
  return this.seo?.metaDescription || this.shortDescription;
});

// Virtual to check if service is active
serviceSchema.virtual('isActive').get(function() {
  return this.isPublished && this.heroImage?.url;
});

// ============================================
// MIDDLEWARE HOOKS
// ============================================

// Pre-save: Auto-generate slug if not provided
serviceSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.isModified('slug')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Pre-save: Update SEO fields if empty
serviceSchema.pre('save', function(next) {
  if (!this.seo) {
    this.seo = {};
  }
  
  if (!this.seo.metaTitle) {
    this.seo.metaTitle = this.title.substring(0, 70);
  }
  
  if (!this.seo.metaDescription) {
    this.seo.metaDescription = this.shortDescription.substring(0, 160);
  }
  
  next();
});

// ============================================
// STATIC METHODS
// ============================================

// Get active services for homepage
serviceSchema.statics.getActiveServices = function(options = {}) {
  const { limit = 6, showOnHomepage = true } = options;
  
  return this.find({
    isPublished: true,
    ...(showOnHomepage !== undefined && { showOnHomepage }),
  })
    .select('title slug subtitle shortDescription iconName heroImage displayOrder')
    .sort({ displayOrder: 1, createdAt: -1 })
    .limit(limit)
    .lean();
};

// Search services
serviceSchema.statics.searchServices = function(searchTerm, options = {}) {
  const { limit = 20, skip = 0 } = options;
  
  return this.find(
    { $text: { $search: searchTerm } },
    { score: { $meta: 'textScore' } }
  )
    .select('title slug shortDescription iconName heroImage isPublished')
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Increment view count
serviceSchema.statics.incrementView = async function(serviceId) {
  return this.findByIdAndUpdate(
    serviceId,
    {
      $inc: { viewCount: 1 },
      $set: { lastViewedAt: new Date() },
    },
    { new: true }
  );
};

// ============================================
// INSTANCE METHODS
// ============================================

// Method to update display order
serviceSchema.methods.updateOrder = function(newOrder) {
  this.displayOrder = newOrder;
  return this.save();
};

// Method to toggle publish status
serviceSchema.methods.togglePublish = function() {
  this.isPublished = !this.isPublished;
  return this.save();
};

// Method to get public data (for API responses)
serviceSchema.methods.getPublicData = function() {
  return {
    id: this._id,
    title: this.title,
    slug: this.slug,
    subtitle: this.subtitle,
    shortDescription: this.shortDescription,
    description: this.description,
    iconName: this.iconName,
    heroImage: this.heroImage,
    researchTypes: this.researchTypes,
    isPublished: this.isPublished,
    displayOrder: this.displayOrder,
    viewCount: this.viewCount,
    seo: this.seo,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// ============================================
// EXPORT MODEL
// ============================================

const Service = mongoose.model('Service', serviceSchema);

export default Service;