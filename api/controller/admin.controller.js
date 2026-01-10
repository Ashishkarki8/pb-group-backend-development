// export const adminRegister = async (req, res) => {
//   const { email, username } = req.body;

//   const exists = await Admin.findOne({
//     $or: [{ email }, { username }],
//   });

//   if (exists) {
//     return res.status(409).json({
//       message: "Email or username already exists",
//     });
//   }

//   const admin = await Admin.create(req.body);

//   res.status(201).json({
//     message: "Admin registered successfully",
//   });
// };



import bcrypt from 'bcryptjs';
import Admin from '../models/admin.model.js';

export const registerAdmin = async (req, res) => {
  try {
    const sanitizedData = req.body;

    // Step 1: Check if super_admin already exists in the database
    const existingSuperAdmin = await Admin.findOne({ role: 'super_admin' });

    // If the request tries to register as super_admin, block it
    // (optional: you can remove this if only your manual super_admin registration exists)
    if (sanitizedData.role === 'super_admin' && existingSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "A super_admin already exists. Only one super_admin is allowed."
      });
    }

    // Step 2: Check if email or username already exists
    const existingAdmin = await Admin.findOne({
      $or: [
        { email: sanitizedData.email },
        { username: sanitizedData.username }
      ]
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: existingAdmin.email === sanitizedData.email
          ? "Email already registered"
          : "Username already taken"
      });
    }

    // Step 3: Hash the password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(sanitizedData.password, salt);

    // Step 4: Prepare admin data
    const adminData = {
      ...sanitizedData,
      password: hashedPassword,
      role: existingSuperAdmin ? 'admin' : 'super_admin', // automatically assign role
      createdBy: req.user?._id || null,
      isActive: true,
      emailVerified: false
    };

    // Step 5: Create admin in the database
    const newAdmin = await Admin.create(adminData);

    // Step 6: Prepare response (never send password)
    const adminResponse = {
      _id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
      username: newAdmin.username,
      role: newAdmin.role,
      createdAt: newAdmin.createdAt
    };

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: adminResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message
    });
  }
};





// {
//   "name": "Khem Raj Pokhrel",
//   "email": "pbgroup2079@gmail.com",
//   "username": "pbgroup2079SuperAdmin",
//   "password": "@Khemrajpokhrel2079",
//   "role": "super_admin" 
// }




// {
//   "name": "Aswikar khanal",
//   "email": "Aswikarkhanal222@gmail.com",
//   "username": "pbgroup2079AdminAswikar",
//   "password": "@Aswikarkhanal2079",
//   "role": "admin"
// }