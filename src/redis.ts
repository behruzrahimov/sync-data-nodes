import { createClient, RedisClientType } from "redis";

export class Redis {
  readonly #url: string = "";
  readonly #name: string = "";
  #db: RedisClientType;

  constructor(url: string, name: string) {
    this.#url = url;
    this.#name = name;
    this.#db = createClient({
      url: this.#url,
      name: this.#name,
    });
  }

  async init() {
    await this.#db.connect();
  }

  async destroy() {
    await this.#db.disconnect();
  }

  async add(key: string, value: string) {
    const data = await this.get(key);
    const allData: string[] = JSON.parse(data);
    allData.push(value);
    const uniqData = [...new Set(allData)];
    await this.#db.set(key, JSON.stringify(uniqData));
  }

  async get(key: string): Promise<string> {
    const data = await this.#db.get(key);
    if (data === null) {
      return JSON.stringify([]);
    }
    return data;
  }
}

const urlAlice = "redis://localhost:6379";
export const AliceRedis = new Redis(urlAlice, "Alice");

const urlBob = "redis://localhost:6385";
export const BobRedis = new Redis(urlBob, "Bob");

const urlCharlie = "redis://localhost:6390";
export const CharlieRedis = new Redis(urlCharlie, "Charlie");
