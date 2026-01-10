// validations/admin.validation.js
import { z } from 'zod';
import validator from 'validator';

export const adminRegisterSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(50)
    .transform((val) => val.trim())
    .transform((val) => validator.escape(val)),

  email: z
    .string()
    .email("Invalid email address")
    .transform((val) => validator.normalizeEmail(val) || val),

  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .transform((val) => val.trim().toLowerCase())
    .transform((val) => validator.escape(val)),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),

  role: z
    .string()
    .optional() // optional in case frontend doesn't send it
    .transform((val) => val?.toLowerCase() || 'admin') // default to 'admin'
    .refine((val) => ['admin', 'super_admin'].includes(val), {
      message: "Role must be either 'admin' or 'super_admin'"
    })
});
