import dotenv from "dotenv";

dotenv.config(); 

const appConfig = {
  mongoURL: process.env.MONGO_URL,
  serverPort: process.env.PORT || 9000, // Render provides PORT automatically
  frontendURL: process.env.FRONTEND_URL,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtExpirationTime: process.env.JWT_EXPIRATION_TIME || "8h",
  nodeEnv: process.env.NODE_ENV || "development",
  hiddenLoginPath: process.env.HIDDEN_LOGIN_PATH || "x7k9p2m",
  cloudinaryUrl: process.env.CLOUDINARY_URL,
};

// Validation
if (
  !appConfig.mongoURL ||
  !appConfig.jwtAccessSecret ||
  !appConfig.jwtRefreshSecret
) {
  throw new Error(
    "Missing critical environment variables. Check your Render environment variables."
  );
}

export default appConfig;
