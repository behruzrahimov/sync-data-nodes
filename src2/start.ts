import { Redis } from "./redis.js";
import { v4 as uuidv4 } from "uuid";
import {
  delay,
  find,
  removeLockIfExist,
  readStream,
  uint8ArrayFromString,
  uint8ArrayToString,
  synchronize,
} from "./utils.js";
import { createNodeLibp2p } from "./create-libp2p.js";
import { create } from "ipfs-http-client";

export async function start(name: string, urlRedis: string, url: string) {
  // const topic = "news-ipfs-test";
  // const redis = new Redis(urlRedis, name);
  // await redis.init();
  // await removeLockIfExist(name);
  // const ipfs = create(new URL(url));
  // const libp2p = await createNodeLibp2p();
  //
  // libp2p.addEventListener("peer:connect", async (evt) => {
  //   const peerId = evt.detail.remotePeer;
  //   console.log(`Connected to: ${peerId.toString()}`);
  //   await synchronize({ libp2p, redis, ipfs, topic, peerId });
  // });
  // libp2p.addEventListener("peer:disconnect", (evt) => {
  //   console.log(`Disconnected from: ${evt.detail.remotePeer}`);
  // });
  //
  // console.log("Libp2p started:", {
  //   peerId: libp2p.peerId.toString(),
  //   addrs: libp2p.getMultiaddrs().map((it) => it.toString()),
  // });
  //
  // //========================================================//
  // //find data
  // console.log("===============================================");
  // console.log("find");
  // const f = await find(
  //   ipfs,
  //   redis,
  //   "comm:98f19031-3222-4e63-be30-32e70752122a"
  // );
  // console.log(f);
  // console.log("===============================================\n");
  // //========================================================//
  // //received messages
  // await libp2p.pubsub.subscribe(topic);
  //
  // await libp2p.pubsub.addEventListener("message", async (evt) => {
  //   if (evt.detail.topic !== topic) return;
  //   const receivedMessage = uint8ArrayToString(evt.detail.data);
  //   const { key, data } = JSON.parse(receivedMessage);
  //   const resIpfs = await ipfs.add(JSON.stringify(data));
  //   console.log(resIpfs);
  //   const cid = resIpfs.cid.toString();
  //   if (data.type === "comm") {
  //     await redis.addAll("comm-another", key);
  //   } else {
  //     await redis.addAll("dids-another", key);
  //   }
  //   console.log("===============================================");
  //   console.log("received message", receivedMessage);
  //   console.log("===============================================\n");
  //   await redis.add(key, JSON.stringify([cid]));
  // });
  //
  // //=============================================================//
  // //send request
  //
  // await libp2p.handle(
  //   "/echo/1.0.0",
  //   async ({ stream }: any) => await readStream(stream, ipfs, libp2p, redis)
  // );
  //
  // //send messages
  // const didDoc = {
  //   id: Date.now(),
  //   type: "did",
  //   name: name,
  //   surname: "Alison",
  //   age: 10,
  // };
  //
  // const dataDidDoc = await ipfs.add(JSON.stringify(didDoc));
  // const cidDidDoc = dataDidDoc.cid.toString();
  // const keyDidDoc = `did:${uuidv4()}`;
  // await redis.add(keyDidDoc, JSON.stringify([cidDidDoc]));
  // await redis.addAll(
  //   "did-some",
  //   JSON.stringify({ key: keyDidDoc, value: [cidDidDoc] })
  // );
  //
  // const community = {
  //   id: Date.now(),
  //   type: "comm",
  //   name: name,
  //   nick: "Hacker",
  //   group: "programmers",
  // };
  // const dataComm = await ipfs.add(JSON.stringify(community));
  // const cidComm = dataComm.cid.toString();
  // const keyComm = `comm:${uuidv4()}`;
  // await redis.add(keyComm, JSON.stringify([cidComm]));
  // await redis.addAll(
  //   "comm-some",
  //   JSON.stringify({ key: keyComm, value: [cidComm] })
  // );
  //
  // await delay(2000);
  // await libp2p.pubsub.publish(
  //   topic,
  //   uint8ArrayFromString(JSON.stringify({ key: keyDidDoc, data: didDoc }))
  // );
  // await libp2p.pubsub.publish(
  //   topic,
  //   uint8ArrayFromString(JSON.stringify({ key: keyComm, data: community }))
  // );
}
