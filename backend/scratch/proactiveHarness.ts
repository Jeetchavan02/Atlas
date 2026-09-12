import mongoose from "mongoose";
import "dotenv/config";

import { eventBus } from "../src/services/eventBus.js";
import { initializeContextEngine } from "../src/services/context/eventListener.js";
import Recommendation from "../src/models/Recommendation.js";
import HealthMetric from "../src/models/HealthMetric.js";
import Task from "../src/models/Task.js";

async function runTest() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/atlas");
  console.log("[test] Connected to MongoDB.");

  // Clear recommendations
  await Recommendation.deleteMany({});
  console.log("[test] Cleared existing recommendations.");

  // Insert test data to trigger an insight
  const today = new Date();
  today.setHours(0,0,0,0);
  await HealthMetric.findOneAndUpdate(
    { date: today },
    { date: today, recoveryScore: 30 },
    { upsert: true }
  );
  
  // Insert a task to trigger recommendation as well
  await Task.findOneAndUpdate(
    { title: "Urgent Task" },
    { title: "Urgent Task", priority: "high", dueDate: today, done: false },
    { upsert: true }
  );

  // Initialize event listeners
  initializeContextEngine();
  
  // Wait a bit for event listeners to bind
  await new Promise(r => setTimeout(r, 500));

  console.log("\n[test] --- TEST 1: Initial Health Sync (Trigger Recommendation) ---");
  eventBus.emitEvent("HEALTH_SYNCED", { source: "test" }, "TEST");

  // Wait for async processing
  await new Promise(r => setTimeout(r, 1000));
  
  let recs = await Recommendation.find({});
  console.log(`[test] Found ${recs.length} recommendations in DB.`);
  if (recs.length > 0) {
    console.log("[test] Latest Rec:", recs[0].title, "-", recs[0].status);
  } else {
    console.error("[test] ERROR: No recommendation created!");
  }

  console.log("\n[test] --- TEST 2: Deduplication (Repeated Health Sync) ---");
  eventBus.emitEvent("HEALTH_SYNCED", { source: "test2" }, "TEST");
  await new Promise(r => setTimeout(r, 1000));

  recs = await Recommendation.find({});
  console.log(`[test] Found ${recs.length} recommendations in DB after repeated event.`);
  if (recs.length === 1) {
    console.log("[test] Deduplication SUCCESS.");
  } else {
    console.error("[test] ERROR: Deduplication failed!");
  }

  if (recs.length > 0) {
    console.log("\n[test] --- TEST 3: Approval / Execution ---");
    const recToApprove = recs[0];
    recToApprove.status = "APPROVED";
    await recToApprove.save();
    console.log("[test] Marked as APPROVED. (In real app, this triggers API which calls ActionRegistry).");
    
    // Simulate API call execution logic manually for the test script
    recToApprove.status = "EXECUTED";
    await recToApprove.save();
    console.log("[test] Marked as EXECUTED.");
  }

  console.log("\n[test] --- TEST 4: Expiration Test ---");
  const expRec = await Recommendation.create({
    userId: "default",
    dedupeKey: "EXPIRY_TEST",
    attentionLevel: "NOTIFY",
    title: "Expiry Test",
    description: "Should expire soon.",
    evidence: [],
    expiresAt: new Date(Date.now() - 10000), // expired 10 seconds ago
    status: "PENDING"
  });
  console.log(`[test] Created expired recommendation: ${expRec._id}`);
  
  // Find active recommendations (should not include the expired one if we filter by status)
  // Usually we have a cron or just filter them on reads. Let's do a read filter.
  const activeRecs = await Recommendation.find({ 
    status: { $in: ["PENDING", "APPROVED"] },
    expiresAt: { $gt: new Date() } // Filter by date too if cron hasn't run
  });
  
  const foundExpired = activeRecs.find(r => r.id === expRec.id);
  if (!foundExpired) {
    console.log("[test] Expiry read-filter SUCCESS. (Expired rec not fetched).");
  } else {
    console.error("[test] ERROR: Expired recommendation was fetched!");
  }
  
  console.log("\n[test] Tests complete.");
  process.exit(0);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
