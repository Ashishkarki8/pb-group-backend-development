
// import User from '../models/User.js';
// import Course from '../models/Course.js';

import Admin from "../models/admin.model.js";

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