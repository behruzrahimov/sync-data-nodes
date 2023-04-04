import { create, IPFS } from "ipfs-core";
import { preSharedKey } from "libp2p/pnet";
import fse from "fs-extra";
import { pipe } from "it-pipe";
import { AppConfig } from "./config.js";
import { Redis } from "./redis.js";
import { multiaddr } from "@multiformats/multiaddr";
import { v4 as uuidv4 } from "uuid";
import * as lp from "it-length-prefixed";
import map from "it-map";
import { peerIdFromString } from "@libp2p/peer-id";
import { PeerId } from "@libp2p/interface-peer-id";

async function removeLockIfExist(name: string) {
  const lockfile = `${AppConfig.ipfs.repo}/${name}/repo.lock`;
  const isLockExist = await fse.pathExists(lockfile);
  if (isLockExist) {
    await fse.remove(lockfile);
  }
}

function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function uint8ArrayToString(buf: Uint8Array) {
  return new TextDecoder().decode(buf);
}

function uint8ArrayFromString(str: string) {
  return new TextEncoder().encode(str);
}
function generateRandomPort() {
  const min = 2000;
  const max = 65000;
  return Math.floor(Math.random() * (max - min)) + min;
}

export async function start(name: string, urlRedis: string) {
  const topic = "news-ipfs-test";
  const redis = new Redis(urlRedis, name);
  await redis.init();
  const swarmKey = await fse.readFile(AppConfig.ipfs.swarmKeyFile);
  await removeLockIfExist(name);
  const portIpfs = generateRandomPort();
  const ipfs = await create({
    repo: `${AppConfig.ipfs.repo}/${name}`,
    EXPERIMENTAL: {
      pubsub: true,
    },
    config: {
      Bootstrap: [
        "/dns4/p2p-relay-ws.itn.mobi/tcp/443/wss/p2p/12D3KooWPHEjnx8HQKL3F9gvXy6ZJ9Pt19rJihv8EGdBVW48suqY",
      ],
      Addresses: {
        Swarm: [
          `/ip4/0.0.0.0/tcp/${portIpfs}`,
          `/ip4/0.0.0.0/tcp/${portIpfs + 1}/ws`,
        ],
      },
    },
    Discovery: {
      MDNS: {
        Enabled: true,
      },
    },
    libp2p: {
      modules: {
        connProtector: preSharedKey({
          psk: swarmKey,
        }),
      },
    },
  });

  //========================================================//
  //received messages
  await ipfs.pubsub.subscribe(topic, async (msg: any) => {
    const ipfsId = await ipfs.id();
    if (msg.from === ipfsId.id) return;
    const receivedMessage = uint8ArrayToString(msg.data);
    const { key, data } = JSON.parse(receivedMessage);
    const resIpfs = await ipfs.add(JSON.stringify(data));
    const cid = resIpfs.cid.toString();
    if (data.type === "comm") {
      await redis.addAll("comm-another", key);
    } else {
      await redis.addAll("dids-another", key);
    }
    console.log("received message", JSON.parse(receivedMessage));
    await redis.add(key, JSON.stringify([cid]));
  });

  //=============================================================//
  //send request

  (ipfs as any).libp2p.connectionManager.addEventListener("peer:connect");
  await (ipfs as any).libp2p.handle(
    "/echo/1.0.0",
    async ({ stream }: any) => await streamToRead(stream, ipfs, redis)
  );

  const peers = await ipfs.pubsub.peers(topic);
  console.log("find subscribed peers", peers);
  for (let peerId of peers) {
    await sendRequest(ipfs, redis, peerId, "get-dids");
  }

  //==============================================================//
  //send messages
  const didDoc = {
    id: Date.now(),
    type: "did",
    name: name,
    surname: "Alison",
    age: 10,
  };

  const dataDidDoc = await ipfs.add(JSON.stringify(didDoc));
  const cidDidDoc = dataDidDoc.cid.toString();
  const keyDidDoc = `did:${uuidv4()}`;
  await redis.add(keyDidDoc, JSON.stringify([cidDidDoc]));
  await redis.addAll(
    "did-some",
    JSON.stringify({ key: keyDidDoc, value: [cidDidDoc] })
  );

  const community = {
    id: Date.now(),
    type: "comm",
    name: name,
    nick: "Hacker",
    group: "programmers",
  };
  const dataComm = await ipfs.add(JSON.stringify(community));
  const cidComm = dataComm.cid.toString();
  const keyComm = `comm:${uuidv4()}`;
  await redis.add(keyComm, JSON.stringify([cidComm]));
  await redis.addAll(
    "comm-some",
    JSON.stringify({ key: keyComm, value: [cidComm] })
  );

  await delay(2000);
  await ipfs.pubsub.publish(
    topic,
    uint8ArrayFromString(JSON.stringify({ key: keyDidDoc, data: didDoc }))
  );
  await ipfs.pubsub.publish(
    topic,
    uint8ArrayFromString(JSON.stringify({ key: keyComm, data: community }))
  );
}

async function sendRequest(
  ipfs: IPFS,
  redis: Redis,
  peerId: PeerId,
  type: string
) {
  console.log("sending stream message to", peerId.toString());
  const stream = await (ipfs as any).libp2p.dialProtocol(peerId, "/echo/1.0.0");
  await sendToStream(
    stream,
    JSON.stringify({
      type: type,
      from: (ipfs as any).libp2p.peerId as PeerId,
    })
  );
  await streamToRead(stream, ipfs, redis);
}

async function sendData(
  stream: any,
  ipfs: IPFS,
  peerId: string,
  redis: Redis,
  type: string
) {
  console.log("sending stream message to", peerId);
  if (type === "get-dids") {
    const dids = JSON.parse(await redis.get("did-some"));
    await sendToStream(
      stream,
      JSON.stringify({
        type: "dids",
        from: (ipfs as any).libp2p.peerId as PeerId,
        data: dids,
      })
    );
  } else if (type === "get-comm") {
    const comm = JSON.parse(await redis.get("comm-some"));
    await sendToStream(
      stream,
      JSON.stringify({
        type: "comm",
        from: (ipfs as any).libp2p.peerId as PeerId,
        data: comm,
      })
    );
  }
}

async function sendToStream(stream: any, message: string) {
  await pipe(
    [message],
    (source) => map(source, (string) => uint8ArrayFromString(string)),
    lp.encode(),
    stream.sink
  );
}

async function streamToRead(stream: any, ipfs: IPFS, redis: Redis) {
  await pipe(
    stream.source,
    lp.decode(),
    (source) => map(source, (buf) => uint8ArrayToString(buf.subarray())),
    async function (source) {
      for await (const msg of source) {
        // console.log("> " + msg.toString().replace("\n", ""));
        const messages = JSON.parse(msg);
        if (messages.type === "get-dids" || messages.type === "get-comm") {
          console.log(messages);
          await sendData(stream, ipfs, messages.from, redis, messages.type);
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

async function find(ipfs: IPFS, redis: Redis, key: string, type: string) {
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
  const find = keys.find((key) => key === key);
  let cid = "";
  if (find) {
    const getDid = await redis.get(find);
    cid = JSON.parse(getDid)[0];
  }
  async function get(cid: string) {
    const chunks = [];
    for await (const chunk of (ipfs as any).cat(cid)) {
      chunks.push(chunk);
    }
    return chunks.toString();
  }
  let didDoc: string = "";
  if (find) {
    didDoc = await get(cid);
    if (type === "did") {
      console.log("DidDoc find", JSON.parse(didDoc));
    } else {
      console.log("Community find", JSON.parse(didDoc));
    }
  }
  if (type === "did") {
    console.log(find ? didDoc : "DidDoc not find");
  } else {
    console.log(find ? didDoc : "Community not find");
  }
}
