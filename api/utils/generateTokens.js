import jwt from 'jsonwebtoken';
import appConfig from '../config/appConfig.js';
// ========================================
// 🎯 GENERATE ACCESS TOKEN
// ========================================
// WHY: Access token is SHORT-LIVED (15 min)
// - Used for every API request
// - Stored in frontend (localStorage or Zustand)
// - If stolen, damage is limited (expires fast)
// ========================================

export const generateAccessToken = (payload) => {
  console.log("🔑 Generating Access Token for:", payload);

  // payload = { userId, username, role }
  // We include ONLY necessary info (no sensitive data!)
  
  const accessToken = jwt.sign(
    payload,  // Data you want to encode
    appConfig.jwtAccessSecret,  // Secret key (MUST be strong!)
    { 
      expiresIn: '15m',  // 15 minutes  //testing 40 sec

      // WHY 15 min? Balance between:
      // - Security (short = less damage if stolen)
      // - UX (not too short = less frequent refreshes)
    }
  );

  console.log("✅ Access Token generated (expires in 15 min)");
  return accessToken;
};


// ========================================
// 🎯 GENERATE REFRESH TOKEN
// ========================================
// WHY: Refresh token is LONG-LIVED (7 days)
// - Used ONLY to get new access tokens
// - Stored in httpOnly cookie (can't be accessed by JS)
// - Also saved in DB (so we can invalidate it)
// ========================================

export const generateRefreshToken = (payload) => {
  console.log("🔄 Generating Refresh Token for:", payload);

  const refreshToken = jwt.sign(
    payload,  // Same payload as access token
    appConfig.jwtRefreshSecret,  // DIFFERENT secret! Very important!
    { 
      expiresIn: '7d',  // 7 days      //testing   1m
      // WHY 7 days? Common practice:
      // - Long enough: user doesn't re-login constantly
      // - Short enough: limits damage if compromised
    }
  );

  console.log("✅ Refresh Token generated (expires in 7 days)");
  return refreshToken;
};


// ========================================
// 🎯 VERIFY ACCESS TOKEN
// ========================================
// WHY: Check if token is valid and not expired
// Used in: authMiddleware (protect routes)
// ========================================

export const verifyAccessToken = (token) => {
  try {
    console.log("🔍 Verifying Access Token...");

    // jwt.verify() does 3 things:
    // 1. Checks signature (was it created with our secret?)
    // 2. Checks expiration (is it still valid?)
    // 3. Decodes payload (returns the data we signed)
    
    const decoded = jwt.verify(token, appConfig.jwtAccessSecret);
    
    console.log("✅ Access Token is valid:", decoded);
    return decoded;  // Returns: { userId, username, role, iat, exp }

  } catch (error) {
    console.log("❌ Access Token verification failed:", error.message);
    
    // Common errors:
    // - "jwt expired" → Token is too old
    // - "invalid signature" → Token was tampered with
    // - "jwt malformed" → Token format is wrong
    
    throw error;  // Let the caller handle it
  }
};


// ========================================
// 🎯 VERIFY REFRESH TOKEN
// ========================================
// WHY: Check if refresh token is valid
// Used in: refresh token route
// ========================================

export const verifyRefreshToken = (token) => {
  try {
    console.log("🔍 Verifying Refresh Token...");

    // IMPORTANT: We use JWT_REFRESH_SECRET (not access secret!)
    const decoded = jwt.verify(token, appConfig.jwtRefreshSecret);
    
    console.log("✅ Refresh Token is valid:", decoded);
    return decoded;

  } catch (error) {
    console.log("❌ Refresh Token verification failed:", error.message);
    throw error;
  }
};