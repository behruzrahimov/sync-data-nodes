import { createClient, RedisClientType } from "redis";
import { create } from "ipfs-core";
import { AliceNode } from "../node-libp2p.js";

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
    this.#db.on("error", (err) => {
      console.log("Redis Client Error", err);
    });
  }

  async destroy() {
    await this.#db.disconnect();
  }

  async add(key: string, value: string) {
    const allData: string[] = [];
    const data = await this.get(key);
    let checkData = JSON.parse(data);
    if (checkData.length === 0) {
      allData.push(value);
    } else {
      for (const message of checkData) {
        allData.push(message);
      }
      allData.push(value);
    }

    await this.#db.set(key, JSON.stringify(allData));
  }

  async get(key: string): Promise<string> {
    const data = await this.#db.get(key);
    const ci = await this.#db.clientInfo();
    console.log(`get ${ci.name}`, data);
    if (data === null) {
      return JSON.stringify([]);
    }
    return data;
  }
}
