/**
 * ============================================================
 * Application Bootstrap File
 * ============================================================
 * Purpose:
 * - Initialize Express application
 * - Apply global middleware (security, parsing, performance)
 * - Connect to database
 * - Register API routes
 * - Handle errors and server lifecycle
 *
 * This file contains ONE-TIME application setup.
 * Business logic must live elsewhere (routes/controllers/services).
 * ============================================================
 */

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import 'express-async-errors';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';

// App config & utilities
import appConfig from './api/config/appConfig.js';
import connectDb from './api/config/connectDb.js';
import corsOptions from './api/config/corsConfig.js';

// Middleware
import errorHandler from './api/middlewares/errorHandler.js';
import xssSanitizer from './api/middlewares/xssSanitizer.js';
import adminRouter from './api/routes/admin.routes.js';
import router from './api/routes/dashboardRoutes.js';
import bannerRouter from './api/routes/callToActionRoutes.js';
import serviceRouter from './api/routes/serviceRoutes.js';



/**
 * ============================================================
 * 1. Create Express Application
 * ============================================================
 */
const app = express();

/**
 * ============================================================
 * 2. Connect to Database
 * ============================================================
 * Fail fast if database connection fails.
 */
connectDb();

/**
 * ============================================================
 * 3. Global Security Middleware
 * ============================================================
 */

// Secure HTTP headers
app.use(helmet());

// Enable CORS with credentials (cookies)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/**
 * ============================================================
 * 4. Rate Limiting (Basic DDoS Protection)
 * ============================================================
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res) => {
    console.log('🚨 Rate limit exceeded for IP:', req.ip);
    res.status(429).send('Too many requests');
  }
});

app.use('/api/', apiLimiter);

/**
 * ============================================================
 * 5. Request Parsing Middleware
 * ============================================================
 */

// Parse JSON & form data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Parse cookies (required for refresh tokens)
app.use(cookieParser());

/**
 * ============================================================
 * 6. Input Sanitization & Protection
 * ============================================================
 */

// Prevent NoSQL injection
app.use(mongoSanitize());

// Prevent HTTP parameter pollution
app.use(hpp());

// Sanitize user input against XSS
app.use(xssSanitizer);

/**
 * ============================================================
 * 7. Performance Middleware
 * ============================================================
 */

// Compress responses
app.use(compression());

/**
 * ============================================================
 * 8. Logging (Development Only)
 * ============================================================
 */
if (appConfig.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

/**
 * ============================================================
 * 9. Health Check Endpoint
 * ============================================================
 * Used by load balancers / monitoring tools.
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: appConfig.nodeEnv,
  });
});

/**
 * ============================================================
 * 10. API Routes
 * ============================================================
 */
// app.use('/api/auth', authRoutes);
// app.use('/api/admins', adminRoutes);
// app.use('/api/posters', posterRoutes);

app.use('/api/auth',adminRouter)
app.use('/api/dashboard',router)
app.use('/api/banners',bannerRouter);
app.use('/api/services',serviceRouter);


/**
 * ============================================================
 * 11. 404 Handler
 * ============================================================
 * Handles unknown routes.
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

/**
 * ============================================================
 * 12. Global Error Handler
 * ============================================================
 * Must be registered LAST.
 */
app.use(errorHandler);

/**
 * ============================================================
 * Export App (Server is started elsewhere)
 * ============================================================
 */


export default app;



// ❓ Which code runs EVERY request?

//  helmet

//  cors

//  rateLimiter

//  body parser

//  cookie parser

//  sanitizers

//  compression

//  routes

//  controllers






//  ❓ Which code runs ONCE?

//   connectDb()

//   app.use(...) registrations

//   app.use('/api/...')

//   app.listen()