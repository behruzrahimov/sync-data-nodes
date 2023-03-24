import { createClient } from "redis";

export class Redis {
  #url = process.env.REDIS_URL || "redis://localhost:6379";
  #db = createClient({
    url: this.#url,
    password: "1234",
  });

  init() {
    this.#db.on("error", (err) => {
      console.log("Redis Client Error", err);
    });
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

    await this.#db.connect();
    await this.#db.set(key, JSON.stringify(allData));
    await this.#db.disconnect();
  }

  async get(key: string): Promise<string> {
    await this.#db.connect();
    const data = await this.#db.get(key);
    await this.#db.disconnect();
    if (data === null) {
      return JSON.stringify([]);
    }
    return data;
  }
}

export async function add(data: string, nodeIPFS: any): Promise<string> {
  const { cid } = await nodeIPFS.add(data);
  return cid.toString();
}

export async function get(cid: string, nodeIPFS: any) {
  const chunks = [];
  for await (const chunk of nodeIPFS.cat(cid)) {
    chunks.push(chunk);
  }
  return chunks.toString();
}
