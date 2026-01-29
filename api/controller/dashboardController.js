


import { getCachedData } from '../services/cacheService.js';
import {
    fetchAllAdmins,
    fetchTotalAdminsCount
} from '../services/dashboardServices.js';
// import { getCachedData } from '../services/cacheService.js';
// import {
//   fetchAllAdmins,
//   fetchAllUsers,
//   fetchAdminStats,
//   fetchNotifications,
//   fetchTotalAdminsCount
// } from '../services/dashboardServices.js';

/**
 * Super Admin Dashboard
 * GET /api/dashboard/super-admin
 */

export async function getSuperAdminDashboard(req, res) {
  try {
    const adminId = req.user.id; // From authMiddleware
    console.log("adminId",adminId);
    // Parallel cache checks for better performance
    const [admins, totalAdmins, users, notifications] = await Promise.all([  // they run at the same time, When all three finish, you collect the results in an array
      getCachedData('dashboard:super:admins', 300, fetchAllAdmins), // 5 min cache  cache stores in key dashboard:super:admins (TTL 300s) 
       getCachedData('dashboard:shared:totalAdmins',300,
        fetchTotalAdminsCount
      ),
     //   getCachedData('dashboard:super:users', 300, fetchAllUsers),
    //   getCachedData(`dashboard:super:notifications:${adminId}`, 60, () =>   fetchNotifications(adminId, 'superAdmin'))
    ]);
    
    console.log("admins",admins);
    console.log("admins",users);
    res.json({
      success: true,
      role: 'superAdmin',
      data: {
        admins: { count: admins.length, list: admins },
        users,
        notifications,
        totalAdmins
      }
    });
  } catch (error) {
    console.error('Super Admin Dashboard Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}



/**
 * Regular Admin Dashboard
 * GET /api/dashboard/admin
 */
export async function getAdminDashboard(req, res) {
  try {
    const adminId = req.user.id;

    // Admin-specific cached data
    const [totalAdmins,stats, notifications] = await Promise.all([
      getCachedData(
        'dashboard:shared:totalAdmins',
        300,
        fetchTotalAdminsCount
      )
    //     getCachedData('dashboard:super:admins', 300, fetchAllAdmins), 
    //   getCachedData(`dashboard:admin:${adminId}:stats`, 180, () => 
    //     fetchAdminStats(adminId)
    //   ), // 3 min cache
    //   getCachedData(`dashboard:admin:${adminId}:notifications`, 60, () => 
    //     fetchNotifications(adminId, 'admin')
    //   )
    ]);
     console.log("totalAdmins admin",totalAdmins);
    res.json({
      success: true,
      role: 'admin',
      data: {
        stats,
        notifications,
        totalAdmins
      }
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}



// super admin
//      Redis checks:

// dashboard:super:notifications:123


// If cached → return notifications

// If not cached → call:

// fetchNotifications(adminId, 'superAdmin')


// The return value of fetchNotifications is:

// Stored in Redis

// Returned to the controller

// So notifications are being set automatically by the cache helper.


