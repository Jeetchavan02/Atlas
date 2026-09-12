import { ContextEngine } from "../src/services/context/ContextEngine.js";
import mongoose from "mongoose";
import "dotenv/config";

(async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/atlas");
  
  const snapshot = await ContextEngine.buildSnapshot("Should I train tonight?");
  console.log(JSON.stringify(snapshot, null, 2));

  process.exit(0);
})();
