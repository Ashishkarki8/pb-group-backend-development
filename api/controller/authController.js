import bcrypt from 'bcryptjs';
import Admin from '../models/admin.model.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateTokens.js';
import appConfig from '../config/appConfig.js';

// ========================================
// 🎯 LOGIN CONTROLLER
// ========================================
export const loginAdmin = async (req, res) => {
  try {
    console.log("🔐 Login attempt:", req.body.username);

    const { username, password } = req.body;

    // 1️⃣ VALIDATION
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Username and password required" 
      });
    }

    // 2️⃣ FIND USER
    const admin = await Admin.findOne({ username }).select("+password");
    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" // Don't say "user not found" (security)
      });
    }
    
      // STEP 3: CHECK IF ACCOUNT IS ACTIVE
    // ========================================
    if (!admin.isActive) {
      console.log('❌ Account is deactivated');
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact super admin support.',
      });
    }

    // 3️⃣ VERIFY PASSWORD
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // 4️⃣ GENERATE TOKENS
    const payload = {
      userId: admin._id,
      username: admin.username,
      role: admin.role, // 'admin' or 'superadmin'
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // 5️⃣ SAVE REFRESH TOKEN IN DB (for logout/invalidation)
    admin.refreshToken = refreshToken; // Add this field to your Admin model
    admin.loginAttempts = 0; // Reset attempts on successful login
    admin.lockUntil = null; // Clear any locks
    admin.lastLogin = new Date();
    await admin.save();

    // 6️⃣ SET REFRESH TOKEN IN COOKIE
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,    // Can't access via JavaScript (XSS protection)
      secure: appConfig.nodeEnv === 'production', // HTTPS only in prod
      sameSite: 'strict', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 7️⃣ SEND RESPONSE
    console.log("✅ Login successful for:", username);
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          userId: admin._id,
          username: admin.username,
          role: admin.role,
        },
        accessToken, // Send this to frontend
      }
    });

  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ 
      success: false,
      message: "Login failed" 
    });
  }
};




// ========================================
// 🔄 REFRESH TOKEN CONTROLLER
// ========================================
// FLOW:
// 1. Get refresh token from cookie
// 2. Verify it's valid
// 3. Check if it matches the one in DB
// 4. Generate NEW access token
// 5. (Optional) Rotate refresh token
// 6. Send new access token
// ========================================

export const refreshAccessToken = async (req, res) => {
  try {
    console.log('🔄 Refresh token request received');

    // ========================================
    // STEP 1: GET REFRESH TOKEN FROM COOKIE
    // ========================================
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      console.log('❌ No refresh token in cookie');
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found',
      });
    }

    console.log('✅ Refresh token found in cookie');

    // ========================================
    // STEP 2: VERIFY REFRESH TOKEN
    // ========================================
    let decoded;
    try {
      const { verifyRefreshToken } = await import('../utils/generateTokens.js');
      decoded = verifyRefreshToken(refreshToken);
      console.log('✅ Refresh token is valid:', decoded);
    } catch (error) {
      console.log('❌ Invalid or expired refresh token:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    // ========================================
    // STEP 3: FIND ADMIN IN DATABASE
    // ========================================
    const admin = await Admin.findById(decoded.userId);

    if (!admin) {
      console.log('❌ Admin not found');
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // ========================================
    // STEP 4: CHECK IF REFRESH TOKEN MATCHES DB
    // ========================================
    // WHY? Security! Someone might have an old token
    // ========================================
    if (admin.refreshToken !== refreshToken) {
      console.log('❌ Refresh token does not match database');
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    console.log('✅ Refresh token matches database');

    // ========================================
    // STEP 5: CHECK IF ACCOUNT IS STILL ACTIVE
    // ========================================
    if (!admin.isActive) {
      console.log('❌ Account is deactivated');
      return res.status(403).json({
        success: false,
        message: 'Account deactivated',
      });
    }

    // ========================================
    // STEP 6: GENERATE NEW ACCESS TOKEN
    // ========================================
    const payload = {
      userId: admin._id,
      username: admin.username,
      role: admin.role,
    };

    const newAccessToken = generateAccessToken(payload);
    console.log('✅ New access token generated');

    // ========================================
    // STEP 7 (OPTIONAL): ROTATE REFRESH TOKEN
    // ========================================
    // WHAT IS TOKEN ROTATION?
    // Every time we refresh, we also create a NEW refresh token
    // This is MORE SECURE but optional for now
    // 
    // Uncomment this block to enable rotation:
    // ========================================
    
    const newRefreshToken = generateRefreshToken(payload);
    admin.refreshToken = newRefreshToken;
    await admin.save();

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log('✅ Refresh token rotated');
   

    // ========================================
    // STEP 8: SEND NEW ACCESS TOKEN
    // ========================================
    return res.status(200).json({
      success: true,
      message: 'Access token refreshed',
      data: {
        accessToken: newAccessToken,
      },
    });

  } catch (error) {
    console.error('🚨 Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};






// ========================================
// 🚪 LOGOUT CONTROLLER
// ========================================
// FLOW:
// 1. Get user ID from request (from auth middleware)
// 2. Clear refresh token from database
// 3. Clear refresh token cookie
// ========================================

export const logoutAdmin = async (req, res) => {
  try {
    console.log('🚪 Logout request received');

    // ========================================
    // STEP 1: GET USER ID
    // ========================================
    // This will come from auth middleware (we'll create it next)
    const userId = req.user?.userId;

    if (!userId) {
      console.log('❌ No user ID found');
      return res.status(400).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // ========================================
    // STEP 2: CLEAR REFRESH TOKEN FROM DB
    // ========================================
    const admin = await Admin.findById(userId);
    
    if (admin) {
      admin.refreshToken = null;
      await admin.save();
      console.log('✅ Refresh token cleared from database');
    }

    // ========================================
    // STEP 3: CLEAR COOKIE
    // ========================================
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    console.log('✅ Refresh token cookie cleared');

    // ========================================
    // STEP 4: SEND RESPONSE
    // ========================================
    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    });

  } catch (error) {
    console.error('🚨 Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};