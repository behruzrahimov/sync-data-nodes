import { create } from "ipfs-core";
import { Redis } from "./redis.js";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
const url = " http://localhost:8080";
const port = 8080;
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const urlAlice = "redis://localhost:6379";
const AliceRedis = new Redis(urlAlice, "Alice");

await AliceRedis.init();

app.get("/did-some", async (req, res) => {
  const result = await AliceRedis.get("did-some");
  res.json(result);
});

app.get("/did-another", async (req, res) => {
  const result = await AliceRedis.get("did-another");
  res.json(result);
});

app.get("/start", async (req, res) => {
  console.log("start");
  const AliceIPFS = await create({
    repo: "ipfs/ipfs1",
    EXPERIMENTAL: {
      pubsub: true,
    },
    config: {
      Bootstrap: [
        "/dns4/p2p-relay-ws.itn.mobi/tcp/443/wss/p2p/12D3KooWPHEjnx8HQKL3F9gvXy6ZJ9Pt19rJihv8EGdBVW48suqY",
      ],
      Addresses: {
        Swarm: ["/ip4/0.0.0.0/tcp/4004", "/ip4/0.0.0.0/tcp/4005/ws"],
      },
    },
    Discovery: {
      MDNS: {
        Enabled: true,
      },
    },
  });

  const ipfsId = await AliceIPFS.id();

  function uint8ArrayToString(buf: Uint8Array) {
    return new TextDecoder().decode(buf);
  }
  function uint8ArrayFromString(str: string) {
    return new TextEncoder().encode(str);
  }

  const topic = "ipfs-test-news";
  setInterval(async () => {
    const didAlice = {
      id: Date.now(),
      name: "Alice",
      surname: "Alison",
      age: 10,
    };
    const data = await AliceIPFS.add(JSON.stringify(didAlice));
    const cid = data.cid.toString();
    // console.log(cid);
    const keySomeDids = uuidv4();
    await AliceRedis.add(keySomeDids, JSON.stringify([cid]));
    await AliceRedis.addDID("did-some", keySomeDids);
    await AliceIPFS.pubsub.publish(
      topic,
      uint8ArrayFromString(JSON.stringify(didAlice))
    );
  }, 3000);

  const allDidSome: string[] = [];
  const resBob = await fetch(" http://localhost:8081/did-some");
  const BobDids: any = await resBob.json();
  const resCharlie = await fetch(" http://localhost:8082/did-some");
  const CharlieDids: any = await resCharlie.json();
  const dids = [JSON.parse(BobDids), JSON.parse(CharlieDids)];
  for (const message of dids) {
    for (const cid of message) {
      allDidSome.push(cid);
    }
  }
  const anotherDids = JSON.parse(await AliceRedis.get("did-another"));
  for (const cid of allDidSome) {
    const find = anotherDids.find((oldCid: string) => cid === oldCid);
    if (!find) {
      anotherDids.push(cid);
      const keyAnotherDid = uuidv4();
      await AliceRedis.add(`${keyAnotherDid}`, JSON.stringify([cid]));
      await AliceRedis.addDID("did-another", keyAnotherDid);
    }
  }

  let lastDid = "";
  await AliceIPFS.pubsub.subscribe(topic, async (msg: any) => {
    if (msg.from === ipfsId.id) return;
    const receivedDid = uint8ArrayToString(msg.data);
    const res = await AliceIPFS.add(receivedDid);
    const cid = res.cid.toString();
    if (lastDid === "") {
      for (let i = 0; i < anotherDids.length; i++) {
        console.log(">>", await AliceRedis.get(anotherDids[i]));
      }
      lastDid = anotherDids[anotherDids.length];
    }
    const key = uuidv4();
    await AliceRedis.add(`${key}`, JSON.stringify([cid]));
    await AliceRedis.addDID("did-another", key);
    console.log(">>", await AliceRedis.get(key));
  });

  res.json({
    success: true,
  });
});

app.listen(port, () => {
  console.log(`Alice started on ${url}`);
});
