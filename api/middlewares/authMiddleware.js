

import Admin from '../models/admin.model.js';
import { verifyAccessToken } from '../utils/generateTokens.js';

// ========================================
// 🛡️ AUTHENTICATION MIDDLEWARE
// ========================================
// PURPOSE: Protect routes that need authentication
// USAGE: Add to routes like this:
//   router.get('/dashboard', authMiddleware, getDashboard)
// 
// WHAT IT DOES:
// 1. Check if Authorization header exists
// 2. Extract access token
// 3. Verify token is valid
// 4. Attach user info to req.user
// 5. Allow request to continue
// ========================================

export const authMiddleware = async (req, res, next) => {
  try {
    console.log('🛡️ Auth middleware triggered');

    // ========================================
    // STEP 1: GET TOKEN FROM HEADER
    // ========================================
    // Expected format: "Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No authorization header or wrong format');
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    // Extract token (remove "Bearer " prefix)
    const token = authHeader.split(' ')[1];
    console.log('✅ Token extracted from header');

    // ========================================
    // STEP 2: VERIFY ACCESS TOKEN
    // ========================================
    let decoded;
    try {
      decoded = verifyAccessToken(token);
      console.log('✅ Access token verified:', decoded);
    } catch (error) {
      console.log('❌ Invalid or expired access token:', error.message);
      
      // WHY return 401?
      // Frontend axios interceptor will catch this
      // and automatically call /refresh endpoint
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired access token',
        code: 'TOKEN_EXPIRED', // ✅ Frontend can check this
      });
    }

    // ========================================
    // STEP 3: CHECK IF USER STILL EXISTS
    // ========================================
    // WHY? User might have been deleted after token was issued
    const admin = await Admin.findById(decoded.userId);

    if (!admin) {
      console.log('❌ Admin not found in database');
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // ========================================
    // STEP 4: CHECK IF ACCOUNT IS ACTIVE
    // ========================================
    if (!admin.isActive) {
      console.log('❌ Account is deactivated');
      return res.status(403).json({
        success: false,
        message: 'Account deactivated',
      });
    }

    // ========================================
    // STEP 5: ATTACH USER TO REQUEST
    // ========================================
    // Now other controllers can access req.user
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };

    console.log('✅ User authenticated:', req.user);

    // ========================================
    // STEP 6: CONTINUE TO NEXT MIDDLEWARE/CONTROLLER
    // ========================================
    next();

  } catch (error) {
    console.error('🚨 Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


// ========================================
// 🔐 ROLE-BASED MIDDLEWARE (for Phase 2)
// ========================================
// PURPOSE: Protect routes that need specific roles
// USAGE: router.post('/register', authMiddleware, requireSuperAdmin, registerAdmin)
// 
// This checks if user has required role
// Use AFTER authMiddleware (needs req.user)
// ========================================

export const requireSuperAdmin = (req, res, next) => {
  console.log('🔐 Checking SuperAdmin role...');

  if (!req.user) {
    console.log('❌ No user in request (authMiddleware not run?)');
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'super_admin') {
    console.log('❌ User is not SuperAdmin:', req.user.role);
    return res.status(403).json({
      success: false,
      message: 'SuperAdmin access required',
    });
  }

  console.log('✅ User is SuperAdmin');
  next();
};

// ========================================
// 🔐 REQUIRE ANY ADMIN (admin or super_admin)
// ========================================
export const requireAdmin = (req, res, next) => {
  console.log('🔐 Checking Admin role...');

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    console.log('❌ User is not an admin:', req.user.role);
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  console.log('✅ User is an admin');
  next();
};



// Login
//  ├─ Issue Access Token (15 min)  
//  ├─ Issue Refresh Token (7 days)
//  ├─ Store refresh token in DB/Redis
//  └─ Send refresh token as HttpOnly cookie

// API Request
//  └─ Access token validates route

// Access Token Expired
//  └─ /refresh uses refresh token
//  ├─ Old refresh token revoked means from now the used refresh token stops working next time for future use there it deleates replaces and leaves a sign this is useless?
//  ├─ New refresh token issued  note please tell me my which function does this?
//  └─ New access token issued   note please tell me my which function does this?

// Logout
//  ├─ Delete refresh token from DB/Redis
//  └─ Clear cookie




// // Yes — You MUST match cookie token with DB/Redis token

// // This is the core security rule.

// // During /refresh request:

// // Read refresh token from HttpOnly cookie

// // Verify JWT signature + expiry

// // Extract userId

// // Fetch stored refresh token from DB/Redis

// // Compare them

// // If mismatch → reject

// // If match → rotate






// 1. Extract refresh token from cookie
// 2. Verify JWT (secret + expiry)
// 3. Get userId from token payload
// 4. Fetch stored refresh token for user
// 5. Compare:
//    cookieToken === storedToken ?
// 6. If NO → reject (403)
// 7. If YES → rotate



// is it that even i refresh the url the new refresh token is created ? what do you mean that?
// DB refreshToken = TOKEN_A
// Cookie refreshToken = TOKEN_A
// Client calls /refresh
// Server does:
// java
// Copy code
// DELETE TOKEN_A
// GENERATE TOKEN_B
// STORE TOKEN_B
// SEND TOKEN_B (cookie)

// TOKEN_A → dead

// TOKEN_B → valid


// refresh token logic POST /auth/refresh




// // refreshController
// refreshToken()
//  ├─ read cookie token
//  ├─ verify JWT
//  ├─ compare with DB/Redis
//  ├─ rotate refresh token
//  ├─ issue new access token
//  └─ return new access token




//  logout()
//  ├─ delete refresh token from DB/Redis
//  ├─ clear cookie
//  └─ user logged out
