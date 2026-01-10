import appConfig from '../config/appConfig.js';

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors)
            .map(e => e.message)
            .join(', ');
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyPattern)[0];
        message = `${field} already exists`;
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Log error in development
    if (appConfig.nodeEnv === 'development') {
        console.error('❌ Error:', err);
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(appConfig.nodeEnv === 'development' && { stack: err.stack }),
    });
};

export default errorHandler;





// 2️⃣ What this errorHandler ACTUALLY DOES (simple)

// This middleware runs ONLY when an error happens.

// When does it run?

// throw new Error()

// next(error)

// async error inside controller

// JWT error

// MongoDB error

// How Express reaches this middleware

// Example:

// router.post('/login', async (req, res) => {
//   throw new Error('Invalid credentials');
// });


// Because you use:

// import 'express-async-errors';


// Express automatically sends this error to:

// app.use(errorHandler);

// What your errorHandler does (line by line logic)
// Default values
// let statusCode = err.statusCode || 500;
// let message = err.message || 'Internal Server Error';


// If error has no custom code → return 500