import { Redis } from "./redis.js";
import { PeerId } from "@libp2p/interface-peer-id";
import { pipe } from "it-pipe";
import map from "it-map";
import * as lp from "it-length-prefixed";
import { Libp2p } from "libp2p";
import { IPFSHTTPClient } from "ipfs-http-client";

export function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function uint8ArrayToString(buf: Uint8Array) {
  return new TextDecoder().decode(buf);
}

export function uint8ArrayFromString(str: string) {
  return new TextEncoder().encode(str);
}
export function generateRandomPort() {
  const min = 2000;
  const max = 65000;
  return Math.floor(Math.random() * (max - min)) + min;
}

export async function sendRequest(
  libp2p: Libp2p,
  redis: Redis,
  peerId: PeerId,
  type: string
) {
  console.log("sending stream message to", peerId.toString());
  const stream = await libp2p.dialProtocol(peerId, "/echo/1.0.0");
  await writeStream(
    stream,
    JSON.stringify({
      type: type,
      from: await libp2p.peerId,
    })
  );
  await readStream(stream, libp2p, redis);
}

export async function sendData(
  stream: any,
  libp2p: Libp2p,
  peerId: string,
  redis: Redis,
  type: string
) {
  console.log("sending stream message to", peerId);
  if (type === "get-dids") {
    const dids = JSON.parse(await redis.get("did-some"));
    await writeStream(
      stream,
      JSON.stringify({
        type: "dids",
        from: await libp2p.peerId,
        data: dids,
      })
    );
  } else if (type === "get-comm") {
    const comm = JSON.parse(await redis.get("comm-some"));
    await writeStream(
      stream,
      JSON.stringify({
        type: "comm",
        from: await libp2p.peerId,
        data: comm,
      })
    );
  }
}

export async function writeStream(stream: any, message: string) {
  await pipe(
    [message],
    (source) => map(source, (string) => uint8ArrayFromString(string)),
    lp.encode(),
    stream.sink
  );
}

export async function readStream(stream: any, libp2p: Libp2p, redis: Redis) {
  await pipe(
    stream.source,
    lp.decode(),
    (source) => map(source, (buf) => uint8ArrayToString(buf.subarray())),
    async function (source) {
      for await (const msg of source) {
        // console.log("> " + msg.toString().replace("\n", ""));
        const messages = JSON.parse(msg);
        console.log("===============================================");
        console.log("received message", msg);
        console.log("===============================================\n");
        if (messages.type === "get-dids" || messages.type === "get-comm") {
          await sendData(stream, libp2p, messages.from, redis, messages.type);
        }
        if (messages.type === "dids" || messages.type === "comm") {
          const res = await redis.get(`${messages.type}-another`);
          const someData = JSON.parse(res);
          if (someData.length === 0) {
            for (const message of messages.data) {
              await redis.add(
                JSON.parse(message).key,
                JSON.stringify(JSON.parse(message).value)
              );
              await redis.addAll(
                `${messages.type}-another`,
                JSON.parse(message).key
              );
            }
          } else {
            for (const data of messages.data) {
              const find = someData.find(
                (key: string) => JSON.parse(data).key === key
              );
              if (!find) {
                await redis.add(
                  JSON.parse(data).key,
                  JSON.stringify(JSON.parse(data).value)
                );
                await redis.addAll(
                  `${messages.type}-another`,
                  JSON.parse(data).key
                );
              }
            }
          }
        }
      }
    }
  );
}
function findIndex(str: string, key: string) {
  let index = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === key) {
      index = i;
      break;
    }
  }
  return index;
}
export async function find(ipfs: IPFSHTTPClient, redis: Redis, key: string) {
  let type = "";
  for (let i = 0; i < findIndex(key, ":"); i++) {
    type += key[i];
  }
  const someData = await redis.get(`${type}-some`);
  const anotherData = await redis.get(`${type}-another`);
  const keys = [];
  for (const data of JSON.parse(someData)) {
    const parseData = JSON.parse(data);
    keys.push(parseData.key);
  }
  for (const data of JSON.parse(anotherData)) {
    keys.push(data);
  }
  const find = keys.find((k) => k === key);
  let cid = "";
  if (find) {
    const getDid = await redis.get(find);
    cid = JSON.parse(getDid)[0];
  }

  if (!find) {
    return undefined;
  }
  return await getInIpfs(cid, ipfs);
}

async function getInIpfs(cid: string, ipfs: IPFSHTTPClient) {
  const chunks = [];
  for await (const chunk of (ipfs as any).cat(cid)) {
    chunks.push(chunk);
  }
  return chunks.toString();
}

export async function synchronize(args: {
  libp2p: Libp2p;
  redis: Redis;
  topic: string;
  peerId?: PeerId;
}) {
  const sync = async (peerId: PeerId) => {
    console.log("===============================================");
    console.log("Synchronizing with:", peerId.toString());
    console.log("===============================================\n");

    await sendRequest(args.libp2p, args.redis, peerId, "get-dids");
    await sendRequest(args.libp2p, args.redis, peerId, "get-comm");
  };

  if (args.peerId) {
    let syncAttempts = 10;
    const interval = setInterval(async () => {
      const peers = args.libp2p.pubsub.getSubscribers(args.topic);
      const newSubscriber = peers.find(
        (it) => args.peerId && it.toString() === args.peerId.toString()
      );
      if (newSubscriber) {
        clearInterval(interval);
        await sync(newSubscriber);
      } else {
        syncAttempts--;
        if (syncAttempts === 0) clearInterval(interval);
      }
    }, 1000);
  } else {
    const peers = args.libp2p.pubsub.getSubscribers(args.topic);
    for (let peerId of peers) {
      await sync(peerId);
    }
  }
}
