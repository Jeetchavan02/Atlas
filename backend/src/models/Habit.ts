import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IHabitEntry {
  date: Date;
  completed: boolean;
}

export interface IHabit extends Document {
  name: string;
  category: string;
  currentStreak: number;
  lastCompleted: Date | null;
  history: IHabitEntry[];
  createdAt: Date;
  updatedAt: Date;
  toggleToday: () => boolean;
  recalculateStreak: () => void;
}

const habitEntrySchema = new Schema<IHabitEntry>(
  {
    date: { type: Date, required: true },
    completed: { type: Boolean, required: true },
  },
  { _id: false },
);

interface IHabitMethods {
  toggleToday: () => boolean;
  recalculateStreak: () => void;
}

type HabitModel = Model<IHabit, Record<string, never>, IHabitMethods>;

const habitSchema = new Schema<IHabit, HabitModel, IHabitMethods>(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["fitness", "mindfulness", "learning", "nutrition", "health", "custom"],
      default: "custom",
    },
    currentStreak: { type: Number, default: 0 },
    lastCompleted: { type: Date, default: null },
    history: [habitEntrySchema],
  },
  { timestamps: true },
);

habitSchema.methods.toggleToday = function (this: IHabit): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingIndex = this.history.findIndex((entry) => {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === today.getTime();
  });

  if (existingIndex !== -1) {
    this.history[existingIndex].completed = !this.history[existingIndex].completed;
  } else {
    this.history.push({ date: today, completed: true });
  }

  const todayEntry = this.history.find((entry) => {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === today.getTime();
  });

  const isNowCompleted = todayEntry!.completed;

  this.lastCompleted = isNowCompleted ? today : null;
  this.recalculateStreak();

  return isNowCompleted;
};

habitSchema.methods.recalculateStreak = function (this: IHabit): void {
  const sorted = [...this.history]
    .filter((e) => e.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (sorted.length === 0) {
    this.currentStreak = 0;
    return;
  }

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let checkDate = new Date(today);

  for (const entry of sorted) {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);

    if (entryDate.getTime() === checkDate.getTime()) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (entryDate.getTime() < checkDate.getTime()) {
      break;
    }
  }

  this.currentStreak = streak;
};

export default mongoose.model<IHabit, HabitModel>("Habit", habitSchema);
