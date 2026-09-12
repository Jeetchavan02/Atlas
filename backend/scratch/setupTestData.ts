import mongoose from "mongoose";
import "dotenv/config";
import Goal from "../src/models/Goal.js";
import Task from "../src/models/Task.js";
import HealthMetric from "../src/models/HealthMetric.js";
import CalendarEvent from "../src/models/CalendarEvent.js";

(async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/atlas");
  console.log("Connected to MongoDB");

  const today = new Date();
  today.setHours(0,0,0,0);

  // 1. Goal
  await Goal.updateOne(
    { title: "Launch Atlas V1" },
    { title: "Launch Atlas V1", status: "ACTIVE", priority: "HIGH" },
    { upsert: true }
  );

  // 2. High Priority Task with deadline tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await Task.updateOne(
    { title: "Finish Atlas backend" },
    { title: "Finish Atlas backend", priority: "high", dueDate: tomorrow, project: "Atlas" },
    { upsert: true }
  );

  // 3. Calendar event (Meeting at 14:00)
  await CalendarEvent.updateOne(
    { title: "Meeting" },
    { title: "Meeting", startHour: 14, endHour: 15, category: "Social", date: today, day: today.getDay() },
    { upsert: true }
  );

  // 4. Low Recovery
  await HealthMetric.updateOne(
    { date: today },
    { date: today, recoveryScore: 32, restingHeartRate: 65, hrv: 30, activeSessions: [] },
    { upsert: true }
  );

  console.log("Test data inserted successfully.");
  process.exit(0);
})();
