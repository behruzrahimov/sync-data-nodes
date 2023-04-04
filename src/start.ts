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
  let latestReceivedMessage = "";
  const cidExist: string[] = [];
  await ipfs.pubsub.subscribe(topic, async (msg: any) => {
    const ipfsId = await ipfs.id();
    if (msg.from === ipfsId.id) return;
    const receivedDid = uint8ArrayToString(msg.data);
    const { key, data } = JSON.parse(receivedDid);
    const resIpfs = await ipfs.add(JSON.stringify(data));
    const cid = resIpfs.cid.toString();
    cidExist.push(JSON.stringify([cid]));
    console.log("on>>", [cid]);
    if (data.type === "comm") {
      await redis.addAll("comm-another-on", key);
    } else {
      await redis.addAll("did-another-on", key);
    }
    if (latestReceivedMessage === "") {
      const commData = await redis.get("comm-another-on");
      const didData = await redis.get("did-anther-on");
      const keys = [];
      for (const key of JSON.parse(commData)) {
        keys.push(key);
      }
      for (const key of JSON.parse(didData)) {
        keys.push(key);
      }
      for (const key of keys) {
        const cid = await redis.get(key);
        const find = cidExist.find((c) => c === cid);
        if (!find) {
          cidExist.push(cid);
        }
        if (!find) {
          console.log("off>>", cid);
        }
      }
    }
    latestReceivedMessage = cid;
    await redis.add(key, JSON.stringify([cid]));
  });

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

  //=============================================================//
  //send request
  (ipfs as any).libp2p.connectionManager.addEventListener(
    "peer:connect",
    (peer: any) => {
      console.log(`Peer connected: ${peer.detail.remotePeer.toString()}`);
    }
  );

  await (ipfs as any).libp2p.handle("/echo/1.0.0", ({ stream }: any) =>
    pipe(stream, (source) =>
      (async function () {
        for await (const msg of source) {
          const message = JSON.parse(
            uint8ArrayToString((msg as any).subarray())
          );
          console.log("message=========>>>>>>>", message);

          if (message.type === "get-dids" || message.type === "get-comm") {
            await sendData(stream, ipfs, message.from, redis, message.type);
          }
        }
      })()
    )
  );

  const peers = await ipfs.pubsub.peers(topic);
  for (let peerId of peers) {
    await sendRequest(ipfs, peerId, "get-dids");
  }
}

async function sendRequest(ipfs: IPFS, peerId: PeerId, type: string) {
  console.log("sending stream message to", peerId.toString());
  const stream = await (ipfs as any).libp2p.dialProtocol(peerId, "/echo/1.0.0");
  await pipe(
    // Source data
    [
      uint8ArrayFromString(
        JSON.stringify({
          type: type,
          from: (ipfs as any).libp2p.peerId as PeerId,
        })
      ),
    ],
    stream
  );
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
    await pipe(
      [
        uint8ArrayFromString(
          JSON.stringify({
            type: "dids",
            from: (ipfs as any).libp2p.peerId as PeerId,
            data: dids,
          })
        ),
      ],
      stream,
      // Sink function
      async function (source: any) {
        // For each chunk of data
        for await (const data of source) {
          // Output the data
          console.log("received echo:", uint8ArrayToString(data.subarray()));
        }
      }
    );
  } else if (type === "get-comm") {
    const comm = JSON.parse(await redis.get("comm-some"));
    await pipe(
      // Source data
      [
        uint8ArrayFromString(
          JSON.stringify({
            type: "comm",
            from: (ipfs as any).libp2p.peerId as PeerId,
            data: comm,
          })
        ),
      ],
      stream,
      async function (source) {}
    );
  }
}
