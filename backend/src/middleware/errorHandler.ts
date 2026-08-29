import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

export function errorHandler(
  err: Error & { status?: number; code?: number },
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(`[error] ${err.message}`);

  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({ error: "Validation failed", details: messages });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: "Invalid ID format" });
    return;
  }

  if (err.code === 11000) {
    res.status(409).json({ error: "Duplicate entry" });
    return;
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
}
