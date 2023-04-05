// import { create } from "ipfs-core";
// import { preSharedKey } from "libp2p/pnet";
// import fse from "fs-extra";
// import { AppConfig } from "./config.js";
// import { Redis } from "./redis.js";
// import { v4 as uuidv4 } from "uuid";
// import {
//   delay,
//   find,
//   generateRandomPort,
//   removeLockIfExist,
//   sendRequest,
//   streamToRead,
//   uint8ArrayFromString,
//   uint8ArrayToString,
// } from "./utils.js";
//
// export async function start(name: string, urlRedis: string) {
//   const topic = "news-ipfs-test";
//   const redis = new Redis(urlRedis, name);
//   await redis.init();
//   const swarmKey = await fse.readFile(AppConfig.ipfs.swarmKeyFile);
//   await removeLockIfExist(name);
//   const portIpfs = generateRandomPort();
//   const ipfs = await create({
//     repo: `${AppConfig.ipfs.repo}/${name}`,
//     EXPERIMENTAL: {
//       pubsub: true,
//     },
//     config: {
//       Bootstrap: [
//         "/dns4/p2p-relay-ws.itn.mobi/tcp/443/wss/p2p/12D3KooWPHEjnx8HQKL3F9gvXy6ZJ9Pt19rJihv8EGdBVW48suqY",
//       ],
//       Addresses: {
//         Swarm: [
//           `/ip4/0.0.0.0/tcp/${portIpfs}`,
//           `/ip4/0.0.0.0/tcp/${portIpfs + 1}/ws`,
//         ],
//       },
//     },
//     Discovery: {
//       MDNS: {
//         Enabled: true,
//       },
//     },
//     libp2p: {
//       modules: {
//         connProtector: preSharedKey({
//           psk: swarmKey,
//         }),
//       },
//     },
//   });
//
//   //========================================================//
//   //find data
//   console.log("===============================================");
//   console.log("find");
//   const f = await find(
//     ipfs,
//     redis,
//     "comm:8e9d6261-7f68-489f-89f2-34fbac727082"
//   );
//   console.log(f);
//   console.log("===============================================\n");
//
//   //========================================================//
//   //received messages
//   await ipfs.pubsub.subscribe(topic, async (msg: any) => {
//     const ipfsId = await ipfs.id();
//     if (msg.from === ipfsId.id) return;
//     const receivedMessage = uint8ArrayToString(msg.data);
//     const { key, data } = JSON.parse(receivedMessage);
//     const resIpfs = await ipfs.add(JSON.stringify(data));
//     const cid = resIpfs.cid.toString();
//     if (data.type === "comm") {
//       await redis.addAll("comm-another", key);
//     } else {
//       await redis.addAll("dids-another", key);
//     }
//     console.log("===============================================");
//     console.log("received message", receivedMessage);
//     console.log("===============================================\n");
//     await redis.add(key, JSON.stringify([cid]));
//   });
//
//   //=============================================================//
//   //send request
//
//   (ipfs as any).libp2p.connectionManager.addEventListener("peer:connect");
//   await (ipfs as any).libp2p.handle(
//     "/echo/1.0.0",
//     async ({ stream }: any) => await streamToRead(stream, ipfs, redis)
//   );
//
//   const peers = await ipfs.pubsub.peers(topic);
//   console.log("===============================================");
//   console.log("find subscribed peers", peers);
//   console.log("===============================================\n");
//   for (let peerId of peers) {
//     await sendRequest(ipfs, redis, peerId, "get-dids");
//     await sendRequest(ipfs, redis, peerId, "get-comm");
//   }
//
//   //==============================================================//
//   //send messages
//   const didDoc = {
//     id: Date.now(),
//     type: "did",
//     name: name,
//     surname: "Alison",
//     age: 10,
//   };
//
//   const dataDidDoc = await ipfs.add(JSON.stringify(didDoc));
//   const cidDidDoc = dataDidDoc.cid.toString();
//   const keyDidDoc = `did:${uuidv4()}`;
//   await redis.add(keyDidDoc, JSON.stringify([cidDidDoc]));
//   await redis.addAll(
//     "did-some",
//     JSON.stringify({ key: keyDidDoc, value: [cidDidDoc] })
//   );
//
//   const community = {
//     id: Date.now(),
//     type: "comm",
//     name: name,
//     nick: "Hacker",
//     group: "programmers",
//   };
//   const dataComm = await ipfs.add(JSON.stringify(community));
//   const cidComm = dataComm.cid.toString();
//   const keyComm = `comm:${uuidv4()}`;
//   await redis.add(keyComm, JSON.stringify([cidComm]));
//   await redis.addAll(
//     "comm-some",
//     JSON.stringify({ key: keyComm, value: [cidComm] })
//   );
//
//   await delay(2000);
//   await ipfs.pubsub.publish(
//     topic,
//     uint8ArrayFromString(JSON.stringify({ key: keyDidDoc, data: didDoc }))
//   );
//   await ipfs.pubsub.publish(
//     topic,
//     uint8ArrayFromString(JSON.stringify({ key: keyComm, data: community }))
//   );
// }
import { create } from "ipfs-http-client";

// connect using a URL
const client = create(new URL("http://127.0.0.1:5001"));
// call Core API methods
const { cid } = await client.add("Hello world!");

console.log(await client);
