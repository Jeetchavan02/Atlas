import mongoose, { Schema, type Document } from "mongoose";

export interface IGymExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  pr: boolean;
}

export interface IGymSession extends Document {
  date: Date;
  name: string;
  duration: number;
  exercises: IGymExercise[];
  strain: number;
  hrv: number;
  rhr: number;
  createdAt: Date;
  updatedAt: Date;
}

const gymExerciseSchema = new Schema<IGymExercise>(
  {
    name: { type: String, required: true },
    sets: { type: Number, required: true },
    reps: { type: Number, required: true },
    weight: { type: Number, required: true },
    pr: { type: Boolean, default: false },
  },
  { _id: false },
);

const gymSessionSchema = new Schema<IGymSession>(
  {
    date: { type: Date, default: Date.now },
    name: { type: String, required: true, trim: true },
    duration: { type: Number, default: 0 },
    exercises: [gymExerciseSchema],
    strain: { type: Number, default: 0 },
    hrv: { type: Number, default: 0 },
    rhr: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model<IGymSession>("GymSession", gymSessionSchema);
