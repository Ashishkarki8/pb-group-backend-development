import appConfig from "./appConfig.js";

const isDevelopment = appConfig.nodeEnv === "development";

const productionOrigins = [
    appConfig.frontendURL,   // ✅ https://classy-monstera-7ae2df.netlify.app
];

const developmentOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

const allowedOrigins = new Set([
    ...productionOrigins,
    ...(isDevelopment ? developmentOrigins : []),
]);

// ✅ DEBUG: See exactly which origins are allowed
console.log('🔍 Allowed Origins:', Array.from(allowedOrigins));

const corsOptions = {
    origin: (origin, callback) => {
        // ✅ DEBUG: Log every incoming request
        console.log('📥 Incoming request from origin:', origin);
        
        // Allow requests with no origin (Postman, server-to-server) in dev
        if (isDevelopment && !origin) {
            console.log('✅ No origin - allowed in development');
            return callback(null, true);
        }

        if (origin && allowedOrigins.has(origin)) {
            console.log('✅ Origin ALLOWED:', origin);
            return callback(null, true);
        }

        console.log('❌ Origin BLOCKED:', origin);
        console.log('❌ Available origins:', Array.from(allowedOrigins));
        callback(new Error("Not allowed by CORS"));
    },

    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
    ],

    exposedHeaders: [
        "Content-Length",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
    ],

    credentials: true,

    maxAge: isDevelopment ? 86400 : 7200, // 24h dev, 2h prod

    preflightContinue: false,
    optionsSuccessStatus: 204,
};

export default corsOptions;