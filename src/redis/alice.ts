import { Redis } from "./redis.js";

const url = "redis://localhost:6379";

export const AliceRedis = new Redis(url, "Alice");
