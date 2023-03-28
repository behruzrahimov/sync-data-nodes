import express from "express";
import cors from "cors";
import { create } from "ipfs-core";
import { Redis } from "./redis.js";
const port = 8082;
const url = "http://localhost:8082";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const urlCharlie = "redis://localhost:6390";
const CharlieRedis = new Redis(urlCharlie, "Charlie");

await CharlieRedis.init();
app.get("/did-some", async (req, res) => {
  const result = await CharlieRedis.get("did-some");
  res.json(result);
});

app.get("/did-another", async (req, res) => {
  const result = await CharlieRedis.get("did-another");
  res.json(result);
});

app.get("/start", async (req, res) => {
  console.log("start");
  const CharlieIPFS: any = await create({
    repo: "ipfs/ipfs3",
    EXPERIMENTAL: {
      pubsub: true,
    },
    config: {
      Bootstrap: [
        "/dns4/p2p-relay-ws.itn.mobi/tcp/443/wss/p2p/12D3KooWPHEjnx8HQKL3F9gvXy6ZJ9Pt19rJihv8EGdBVW48suqY",
      ],
      Addresses: {
        Swarm: ["/ip4/0.0.0.0/tcp/4006", "/ip4/0.0.0.0/tcp/4007/ws"],
      },
      Discovery: {
        MDNS: {
          Enabled: true,
        },
      },
    },
  });

  const ipfsId = await CharlieIPFS.id();
  function uint8ArrayToString(buf: Uint8Array) {
    return new TextDecoder().decode(buf);
  }
  function uint8ArrayFromString(str: string) {
    return new TextEncoder().encode(str);
  }
  const topic = "ipfs-test-news";
  setInterval(async () => {
    const didDocCharlie = {
      id: Date.now(),
      name: "Charlie",
      surname: "Jack",
      age: 20,
    };
    const data = await CharlieIPFS.add(JSON.stringify(didDocCharlie));
    const cid = data.cid.toString();
    // console.log(cid);
    const keySomeDids = uuidv4();
    await CharlieRedis.add(keySomeDids, JSON.stringify([cid]));
    await CharlieRedis.addDID("did-some", keySomeDids);
    await CharlieIPFS.pubsub.publish(
      topic,
      uint8ArrayFromString(JSON.stringify(didDocCharlie))
    );
  }, 3000);

  const allDidSome: string[] = [];
  const resBob = await fetch(" http://localhost:8081/did-some");
  const BobDids: any = await resBob.json();
  const resAlice = await fetch(" http://localhost:8080/did-some");
  const AliceDids: any = await resAlice.json();
  const dids = [JSON.parse(BobDids), JSON.parse(AliceDids)];
  for (const message of dids) {
    for (const cid of message) {
      allDidSome.push(cid);
    }
  }
  const anotherDids = JSON.parse(await CharlieRedis.get("did-another"));
  for (const cid of allDidSome) {
    const find = anotherDids.find((oldCid: string) => cid === oldCid);
    if (!find) {
      anotherDids.push(cid);
      const keyAnotherDid = uuidv4();
      await CharlieRedis.add(`${keyAnotherDid}`, JSON.stringify([cid]));
      await CharlieRedis.addDID("did-another", keyAnotherDid);
    }
  }

  let lastDid = "";

  await CharlieIPFS.pubsub.subscribe(topic, async (msg: any) => {
    if (msg.from === ipfsId.id) return;
    const receivedDid = uint8ArrayToString(msg.data);
    const res = await CharlieIPFS.add(receivedDid);
    const cid = res.cid.toString();
    if (lastDid === "") {
      for (let i = 0; i < anotherDids.length; i++) {
        console.log(">>", await CharlieRedis.get(anotherDids[i]));
      }
      lastDid = anotherDids[anotherDids.length];
    }
    const key = uuidv4();
    await CharlieRedis.add(key, JSON.stringify([cid]));
    await CharlieRedis.addDID("did-another", key);
    console.log(">>", await CharlieRedis.get(key));
  });

  res.json({
    success: true,
  });
});

app.listen(port, () => {
  console.log(`Charlie started on ${url}`);
});
