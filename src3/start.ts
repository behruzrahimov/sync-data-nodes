import { Redis } from "./redis.js";
import { Cluster } from "./cluster.js";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";
export async function start(
  name: string,
  urlRedis: string,
  urlCluster: string
) {
  const redis = new Redis(urlRedis, name);
  await redis.init();
  const cluster = new Cluster(urlCluster);
  const didDoc = {
    id: Date.now(),
    type: "did",
    name: name,
    surname: "Alison",
    age: 10,
  };
  const cidDidDoc = await cluster.add(JSON.stringify(didDoc));
  await cluster.pin(cidDidDoc);
  const keyDidDoc = `did:${uuidv4()}`;
  await redis.add(keyDidDoc, JSON.stringify([cidDidDoc]));
  await redis.addAll(
    "did",
    JSON.stringify({ key: keyDidDoc, value: [cidDidDoc] })
  );
  // console.log(cidDidDoc);
  const getPins = await cluster.getPins();
  // console.log(getPins);
}
