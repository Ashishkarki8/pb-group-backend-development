// export const validate =(schema) =>
//   (req, res, next) => {
//     try {
//       console.log("schema",schema);
//       schema.parse(req.body);
//       next();
//     } catch (err) {
//       return res.status(400).json({
//         message: "Validation failed",
//         errors: err.errors,
//       });
//     }
//   };




// import { z } from 'zod';
// export const validate = (schema) => {
//   return (req, res, next) => {
//     try {
//       // ✅ Correct implementation
//      const validatedData = schema.parse(req.body);
//      req.body = validatedData;  // Update req.body with transformed data
//      next();
//     } catch (error) {
//       if (error instanceof z.ZodError) {
//         // Format Zod errors nicely
//         const errors = error.errors.map((err) => ({
//           field: err.path.join('.'),
//           message: err.message
//         }));
        
//         return res.status(400).json({
//           success: false,
//           message: "Validation failed",
//           errors
//         });
//       }
//       next(error);
//     }
//   };
// };






export const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    req.body = result.data;
    next();
  };
};
