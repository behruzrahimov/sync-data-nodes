import { Redis } from "./redis.js";

const url = process.env.REDIS_URL || "redis://localhost:6390";

export const CharlieRedis = new Redis(url, "Charlie");
