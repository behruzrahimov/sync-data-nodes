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

  async addDID(key: string, value: string) {
    const data = await this.get(key);
    const allData: string[] = JSON.parse(data);
    allData.push(value);
    const uniqData = [...new Set(allData)];
    await this.#db.set(key, JSON.stringify(uniqData));
  }

  async addCID(key: string, value: string) {
    const data = await this.get(key);
    const allData: string[] = JSON.parse(data);
    allData.push(value);
    const uniqData = [...new Set(allData)];
    await this.#db.set(key, JSON.stringify(uniqData));
  }

  async add(key: string, value: string) {
    await this.#db.set(key, value);
  }

  async get(key: string): Promise<string> {
    const data = await this.#db.get(key);
    if (data === null) {
      return JSON.stringify([]);
    }
    return data;
  }
}
