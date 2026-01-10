import { Router } from "express";
import { adminRegisterSchema } from "../validations/admin.validation.js";
import { validate } from "../middlewares/validate.js";
import { registerAdmin } from "../controller/admin.controller.js";
import { loginAdmin, logoutAdmin, refreshAccessToken } from "../controller/authController.js";
import { authMiddleware, requireSuperAdmin } from "../middlewares/authMiddleware.js";

const adminRouter = Router();


adminRouter.post(
  '/admin/register',
  authMiddleware,                  // 1️⃣ Authenticate
  requireSuperAdmin,               // 2️⃣ Authorize
  validate(adminRegisterSchema),    // 3️⃣ Validate data
  registerAdmin                    // 4️⃣ Execute
);




adminRouter.post('/admin/login', loginAdmin);
// POST /api/auth/refresh
// Get new access token using refresh token
// Returns: new access token (+ new refresh token if rotation enabled)
adminRouter.post('/refresh', refreshAccessToken);
// POST /api/auth/logout
// Clear refresh token from DB and cookie
// Requires: Valid access token
adminRouter.post('/logout', authMiddleware, logoutAdmin);



export default adminRouter;