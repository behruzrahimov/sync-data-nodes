import * as IPFS from "ipfs-core";
import { createClient } from "redis";

const ipfsConfig1: any = {
  repo: "ipfs/ipfs1",
  EXPERIMENTAL: {
    pubsub: true,
  },
  config: {
    Bootstrap: [],
    Addresses: {
      API: "/ip4/0.0.0.0/tcp/5001",
      Swarm: [
        "/ip4/0.0.0.0/tcp/4002",
        "/ip4/0.0.0.0/udp/4002/quic",
        "/ip4/0.0.0.0/tcp/4003/ws",
      ],
    },
  },
};
const ipfsConfig2: any = {
  repo: "ipfs/ipfs2",
  EXPERIMENTAL: {
    pubsub: true,
  },
  config: {
    Bootstrap: [],
    Addresses: {
      API: "/ip4/0.0.0.0/tcp/5002",
      Swarm: [
        "/ip4/0.0.0.0/tcp/4004",
        "/ip4/0.0.0.0/udp/4004/quic",
        "/ip4/0.0.0.0/tcp/4005/ws",
      ],
    },
  },
};

const ipfsConfig3: any = {
  repo: "ipfs/ipfs3",
  EXPERIMENTAL: {
    pubsub: true,
  },
  config: {
    Bootstrap: [],
    Addresses: {
      API: "/ip4/0.0.0.0/tcp/5003",
      Swarm: [
        "/ip4/0.0.0.0/tcp/4006",
        "/ip4/0.0.0.0/udp/4006/quic",
        "/ip4/0.0.0.0/tcp/4006/ws",
      ],
    },
  },
};

export class Redis {
  private url = process.env.REDIS_URL || "redis://localhost:6379";
  private db = createClient({
    url: this.url,
    password: "1234",
  });
  private on = this.db.on("error", (err) =>
    console.log("Redis Client Error", err)
  );

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

    await this.db.connect();
    await this.db.set(key, JSON.stringify(allData));
    await this.db.disconnect();
  }
  async get(key: string): Promise<string> {
    await this.db.connect();
    const data = await this.db.get(key);
    await this.db.disconnect();
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

const nodeIPFS1: any = await IPFS.create(ipfsConfig1);
const nodeIPFS2: any = await IPFS.create(ipfsConfig2);
const nodeIPFS3: any = await IPFS.create(ipfsConfig3);
export const IPFSNodes = [nodeIPFS1, nodeIPFS2, nodeIPFS3];
