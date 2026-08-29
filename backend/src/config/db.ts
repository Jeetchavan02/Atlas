import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/atlas-luxe";

  try {
    await mongoose.connect(uri);
    console.log(`[db] connected to MongoDB`);
  } catch (err) {
    console.error(`[db] connection failed: ${(err as Error).message}`);
    process.exit(1);
  }

  mongoose.connection.on("error", (err) => {
    console.error(`[db] runtime error: ${err.message}`);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[db] disconnected");
  });
}
