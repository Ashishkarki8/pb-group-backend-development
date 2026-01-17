// import mongoose from "mongoose";
// import appConfig from "./appConfig.js";

// const connectDb = async (retries = 5) => {
//   let attempt = 0;
//   while (attempt < retries) {
//     try {
//       await mongoose.connect(appConfig.mongoURL);
//       console.log("✅ Connected to MongoDB successfully");

//       // Handle connection events for ongoing monitoring
//       mongoose.connection.on("disconnected", () => {
//         console.warn("⚠️ MongoDB disconnected. Attempting to reconnect...");
//       });

//       mongoose.connection.on("error", (err) => {
//         console.error("❌ MongoDB connection error:", err.message);
//       });

//       return; // Success - exit function
//     } catch (error) {
//       attempt += 1;

//       // Specific error handling
//       if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
//         console.error(
//           "❌ Cannot reach MongoDB host. Check network or server status."
//         );
//       } else if (error.name === "MongooseServerSelectionError") {
//         console.error(
//           "❌ Server selection failed. Verify MongoDB URI or cluster accessibility."
//         );
//       } else if (error.message?.includes("authentication")) {
//         console.error("❌ Authentication failed. Check credentials.");
//         throw error; // Don't retry auth errors
//       } else {
//         console.error("❌ MongoDB connection error:", error.message);
//       }

//       if (attempt < retries) {
//         const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
//         console.log(
//           `🔁 Retrying in ${delay / 1000}s... (Attempt ${attempt}/${retries})`
//         );
//         await new Promise((res) => setTimeout(res, delay));
//       }
//     }
//   }

//   // All retries exhausted - throw error instead of process.exit()
//   throw new Error("Failed to connect to MongoDB after multiple attempts");
// };

// export default connectDb;



import mongoose from "mongoose";
import appConfig from "./appConfig.js";

let isConnected = false;

const connectDb = async (retries = 5) => {
  if (isConnected) return;

  // Register listeners ONCE
  mongoose.connection.once("connected", () => {
    console.log("✅ Connected to MongoDB successfully");
    isConnected = true;
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected");
  });

  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

  let attempt = 0;

  while (attempt < retries) {
    try {
      await mongoose.connect(appConfig.mongoURL);
      return;
    } catch (error) {
      attempt++;

      if (error.message?.includes("authentication")) {
        throw error; // never retry auth errors
      }

      const delay = Math.min(1000 * 2 ** attempt, 30000);
      console.log(`🔁 Retrying MongoDB in ${delay / 1000}s...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }

  throw new Error("Failed to connect to MongoDB after multiple attempts");
};

export default connectDb;
