import mongoose from "mongoose";
import "dotenv/config";
import Task from "../src/models/Task.js";
import CalendarEvent from "../src/models/CalendarEvent.js";

(async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/atlas");
  
  const tasks = await Task.find({});
  console.log("Tasks:", JSON.stringify(tasks, null, 2));

  const events = await CalendarEvent.find({});
  console.log("Events:", JSON.stringify(events, null, 2));
  
  process.exit(0);
})();
