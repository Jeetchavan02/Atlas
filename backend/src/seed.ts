import "dotenv/config";
import { connectDB } from "./config/db.js";
import Habit from "./models/Habit.js";
import Task from "./models/Task.js";
import GymSession from "./models/GymSession.js";
import HealthMetric from "./models/HealthMetric.js";
import CalendarEvent from "./models/CalendarEvent.js";

async function seed() {
  await connectDB();

  // Clear all collections
  await Promise.all([
    Habit.deleteMany({}),
    Task.deleteMany({}),
    GymSession.deleteMany({}),
    HealthMetric.deleteMany({}),
    CalendarEvent.deleteMany({}),
  ]);

  // --- Habits ---
  const seedHabits = [
    { name: "Morning Run", category: "fitness" },
    { name: "Meditation", category: "mindfulness" },
    { name: "Reading", category: "learning" },
    { name: "Cold Plunge", category: "health" },
    { name: "Journal", category: "mindfulness" },
    { name: "No Sugar", category: "nutrition" },
  ];

  const now = new Date();
  const habits = await Promise.all(
    seedHabits.map((h) => {
      const history = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - (29 - i));
        d.setHours(0, 0, 0, 0);
        history.push({ date: d, completed: Math.random() > 0.25 });
      }
      return Habit.create({ ...h, history });
    }),
  );

  for (const habit of habits) {
    habit.recalculateStreak();
    await habit.save();
  }
  console.log(`[seed] ${habits.length} habits created`);

  // --- Tasks ---
  const taskData = [
    { title: "Ship Atlas V1 dashboard", project: "Atlas", priority: "high", dueLabel: "Today", dueDate: now },
    { title: "Review Q3 OKRs", project: "Work", priority: "high", dueLabel: "Today", dueDate: now },
    { title: "Reply to investor thread", project: "Atlas", priority: "high", dueLabel: "Today", dueDate: now },
    { title: "Strength session — push day", project: "Health", priority: "med", dueLabel: "Today", dueDate: now, done: true },
    { title: "Read 30 pages — Deep Work", project: "Personal", priority: "low", dueLabel: "Today", dueDate: now },
    { title: "Plan weekend trip", project: "Personal", priority: "low", dueLabel: "Tomorrow", dueDate: new Date(now.getTime() + 86400000) },
    { title: "Design AI conversation flow", project: "Atlas", priority: "med", dueLabel: "Tomorrow", dueDate: new Date(now.getTime() + 86400000) },
  ];
  await Task.insertMany(taskData);
  console.log(`[seed] ${taskData.length} tasks created`);

  // --- Gym Sessions ---
  const gymSessions = [
    {
      name: "Push",
      duration: 60,
      date: new Date(now.getTime() - 2 * 86400000),
      exercises: [
        { name: "Bench Press", sets: 4, reps: 8, weight: 85, pr: true },
        { name: "Overhead Press", sets: 4, reps: 6, weight: 55, pr: false },
        { name: "Incline Dumbbell", sets: 3, reps: 10, weight: 30, pr: false },
        { name: "Cable Fly", sets: 3, reps: 12, weight: 20, pr: false },
        { name: "Tricep Pushdown", sets: 4, reps: 12, weight: 32, pr: true },
      ],
      strain: 14.2,
      hrv: 78,
      rhr: 52,
    },
    {
      name: "Pull",
      duration: 55,
      date: new Date(now.getTime() - 4 * 86400000),
      exercises: [
        { name: "Deadlift", sets: 4, reps: 5, weight: 140, pr: false },
        { name: "Pull Ups", sets: 4, reps: 10, weight: 0, pr: false },
        { name: "Barbell Row", sets: 4, reps: 8, weight: 70, pr: true },
        { name: "Face Pull", sets: 3, reps: 15, weight: 15, pr: false },
      ],
      strain: 15.1,
      hrv: 72,
      rhr: 54,
    },
    {
      name: "Legs",
      duration: 65,
      date: new Date(now.getTime() - 6 * 86400000),
      exercises: [
        { name: "Squat", sets: 4, reps: 6, weight: 120, pr: false },
        { name: "Romanian Deadlift", sets: 3, reps: 10, weight: 80, pr: false },
        { name: "Leg Press", sets: 4, reps: 12, weight: 180, pr: false },
        { name: "Calf Raises", sets: 4, reps: 15, weight: 60, pr: false },
      ],
      strain: 16.0,
      hrv: 68,
      rhr: 56,
    },
  ];
  await GymSession.insertMany(gymSessions);
  console.log(`[seed] ${gymSessions.length} gym sessions created`);

  // --- Health Metrics ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hrReadings = [];
  for (let i = 0; i < 48; i++) {
    hrReadings.push({
      time: i,
      bpm: 60 + Math.round(Math.sin(i / 4) * 8 + Math.random() * 5 + (i > 30 ? 20 : 0)),
    });
  }

  await HealthMetric.create({
    date: today,
    steps: 8412,
    caloriesBurned: 2140,
    caloriesConsumed: 1840,
    waterLiters: 1.8,
    restingHeartRate: 52,
    sleepHours: 6.2,
    sleepScore: 74,
    macros: { protein: 138, carbs: 210, fat: 62 },
    macroTargets: { protein: 180, carbs: 280, fat: 80 },
    heartRateReadings: hrReadings,
    weight: 77.8,
  });

  // Weight history for last 30 days
  for (let i = 29; i > 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    await HealthMetric.create({
      date: d,
      weight: 78 - i * 0.04 + Math.sin(i / 4) * 0.3,
    });
  }
  console.log("[seed] health metrics created");

  // --- Calendar Events ---
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const eventData = [
    { title: "Morning run", day: 0, startHour: 7, endHour: 8, color: "mint", category: "Health" },
    { title: "Deep work · Atlas", day: 0, startHour: 10, endHour: 12, color: "iris", category: "Deep" },
    { title: "1:1 — Maya", day: 0, startHour: 14, endHour: 15, color: "cyan-glow", category: "Social" },
    { title: "Investor call", day: 1, startHour: 9, endHour: 10.5, color: "amber-glow", category: "Priority" },
    { title: "Design review", day: 1, startHour: 13, endHour: 15, color: "iris", category: "Deep" },
    { title: "Gym · push", day: 2, startHour: 7.5, endHour: 8.5, color: "mint", category: "Health" },
    { title: "Deep work", day: 2, startHour: 11, endHour: 13, color: "iris", category: "Deep" },
    { title: "Standup", day: 3, startHour: 10, endHour: 11, color: "cyan-glow", category: "Social" },
    { title: "Atlas demo prep", day: 3, startHour: 16, endHour: 18, color: "iris", category: "Priority" },
    { title: "Yoga", day: 4, startHour: 9, endHour: 10, color: "mint", category: "Health" },
    { title: "Ship V1", day: 4, startHour: 14, endHour: 17, color: "amber-glow", category: "Priority" },
    { title: "Coffee with Sam", day: 5, startHour: 11, endHour: 13, color: "cyan-glow", category: "Social" },
    { title: "Dinner — Mira", day: 6, startHour: 18, endHour: 20, color: "iris", category: "Social" },
  ];

  const eventDocs = eventData.map((e) => {
    const eventDate = new Date(startOfWeek);
    eventDate.setDate(eventDate.getDate() + e.day);
    return { ...e, date: eventDate };
  });

  await CalendarEvent.insertMany(eventDocs);
  console.log(`[seed] ${eventDocs.length} calendar events created`);

  console.log("[seed] complete");
  process.exit(0);
}

seed().catch((err) => {
  console.error(`[seed] failed: ${(err as Error).message}`);
  process.exit(1);
});
