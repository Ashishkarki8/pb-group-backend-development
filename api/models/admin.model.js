// ============================================
// 6. MONGOOSE SCHEMA (models/Admin.js)
// ============================================
import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true, // ✅ Mongoose will convert to lowercase
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    lowercase: true // ✅ ensure username stored in lowercase
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false // ✅ Never return password by default
  },
  role: {
    type: String,
    enum: ['admin', 'super_admin'],
    default: 'admin',
    lowercase: true
  },
  refreshToken: { type: String },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,  // ✅ Auto creates createdAt & updatedAt
  strict: true       // ✅ Extra fields sent in JSON will be ignored
});

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
