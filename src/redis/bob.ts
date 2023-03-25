import { Redis } from "./redis.js";

const url = "redis://localhost:6385";

export const BobRedis = new Redis(url, "Bob");
