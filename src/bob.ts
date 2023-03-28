import { create } from "ipfs-core";
import { BobRedis, CharlieRedis } from "./redis.js";
import express from "express";
import cors from "cors";
const url = " http://localhost:8081";
const port = 8081;
const app = express();
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

await BobRedis.init();
app.get("/did-some", async (req, res) => {
  const result = await BobRedis.get("messages-send");
  res.json(result);
});

app.get("/did-another", async (req, res) => {
  const result = await BobRedis.get("messages-received");
  res.json(result);
});

app.get("/start", async (req, res) => {
  console.log("start");
  const BobIPFS = await create({
    repo: "ipfs/ipfs2",
    EXPERIMENTAL: {
      pubsub: true,
    },
    config: {
      Bootstrap: [
        "/dns4/p2p-relay-ws.itn.mobi/tcp/443/wss/p2p/12D3KooWPHEjnx8HQKL3F9gvXy6ZJ9Pt19rJihv8EGdBVW48suqY",
      ],
      Addresses: {
        Swarm: ["/ip4/0.0.0.0/tcp/4002", "/ip4/0.0.0.0/tcp/4003/ws"],
      },
      Discovery: {
        MDNS: {
          Enabled: true,
        },
      },
    },
  });

  const ipfsId = await BobIPFS.id();
  function uint8ArrayToString(buf: Uint8Array) {
    return new TextDecoder().decode(buf);
  }
  function uint8ArrayFromString(str: string) {
    return new TextEncoder().encode(str);
  }
  const topic = "ipfs-test-news";

  setInterval(async () => {
    const didBob = {
      id: Date.now(),
      name: "Bob",
      surname: "Alex",
      age: 18,
    };
    const data = await BobIPFS.add(JSON.stringify(didBob));
    const cid = data.cid.toString();
    // console.log(cid);
    const keySomeDids = uuidv4();
    await BobRedis.add(keySomeDids, JSON.stringify([cid]));
    await BobRedis.addDID("did-some", keySomeDids);
    await BobIPFS.pubsub.publish(
      topic,
      uint8ArrayFromString(JSON.stringify(didBob))
    );
  }, 3000);

  const allDidSome: string[] = [];
  const resAlice = await fetch(" http://localhost:8080/did-some");
  const AliceDids: any = await resAlice.json();

  const resCharlie = await fetch(" http://localhost:8082/did-some");
  const CharlieDids: any = await resCharlie.json();

  const dids = [JSON.parse(AliceDids), JSON.parse(CharlieDids)];
  for (const message of dids) {
    for (const cid of message) {
      allDidSome.push(cid);
    }
  }

  const anotherDids = JSON.parse(await BobRedis.get("did-another"));
  for (const cid of allDidSome) {
    const find = anotherDids.find((oldCid: string) => cid === oldCid);
    if (!find) {
      anotherDids.push(cid);
      const keyAnotherDid = uuidv4();
      await BobRedis.add(`${keyAnotherDid}`, JSON.stringify([cid]));
      await BobRedis.addDID("did-another", keyAnotherDid);
    }
  }

  let lastDid = "";

  await BobIPFS.pubsub.subscribe(topic, async (msg: any) => {
    if (msg.from === ipfsId.id) return;
    const receivedDid = uint8ArrayToString(msg.data);
    const res = await BobIPFS.add(receivedDid);
    const cid = res.cid.toString();
    if (lastDid === "") {
      for (let i = 0; i < anotherDids.length; i++) {
        console.log(">>", await BobRedis.get(anotherDids[i]));
      }
      lastDid = anotherDids[anotherDids.length];
    }
    const key = uuidv4();
    await BobRedis.add(`${key}`, JSON.stringify([cid]));
    await BobRedis.addDID("did-another", key);
    console.log(">>", await BobRedis.get(key));
  });
  res.json({
    success: true,
  });
});

app.listen(port, () => {
  console.log(`Bob started on ${url}`);
});
