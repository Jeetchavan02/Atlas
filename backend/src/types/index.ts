import type { Request, Response, NextFunction } from "express";

export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface DateRangeQuery {
  start?: string;
  end?: string;
}

export interface ApiResponse<T> {
  message?: string;
  error?: string;
  details?: string[];
  data?: T;
}
