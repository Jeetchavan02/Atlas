import mongoose, { Schema, type Document } from "mongoose";

export type EventCategory = "Deep" | "Health" | "Social" | "Priority";

export interface ICalendarEvent extends Document {
  title: string;
  day: number;
  startHour: number;
  endHour: number;
  color: string;
  category: EventCategory;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const calendarEventSchema = new Schema<ICalendarEvent>(
  {
    title: { type: String, required: true, trim: true },
    day: { type: Number, required: true, min: 0, max: 6 },
    startHour: { type: Number, required: true },
    endHour: { type: Number, required: true },
    color: { type: String, default: "iris" },
    category: {
      type: String,
      enum: ["Deep", "Health", "Social", "Priority"],
      default: "Deep",
    },
    date: { type: Date, required: true },
  },
  { timestamps: true },
);

export default mongoose.model<ICalendarEvent>("CalendarEvent", calendarEventSchema);
