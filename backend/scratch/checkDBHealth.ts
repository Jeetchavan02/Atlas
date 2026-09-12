import mongoose from "mongoose";
import "dotenv/config";
import HealthMetric from "../src/models/HealthMetric.js";

(async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/atlas");
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const metrics = await HealthMetric.find({ date: today });
  console.log("HealthMetrics:", JSON.stringify(metrics, null, 2));

  process.exit(0);
})();
