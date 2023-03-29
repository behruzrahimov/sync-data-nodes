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

let CharlieIPFS: any;
app.get("/did/:did", async (req, res) => {
  const someData = await CharlieRedis.get("did-some");
  const anotherData = await CharlieRedis.get("did-another");
  const keys = [];
  for (const data of JSON.parse(someData)) {
    const parseData = JSON.parse(data);
    keys.push(parseData.key);
  }
  for (const data of JSON.parse(anotherData)) {
    keys.push(data);
  }
  const find = keys.find((key) => key === req.params.did);
  let cid = "";
  if (find) {
    const getDid = await CharlieRedis.get(find);
    cid = JSON.parse(getDid)[0];
  }
  async function get(cid: string) {
    const chunks = [];
    for await (const chunk of CharlieIPFS.cat(cid)) {
      chunks.push(chunk);
    }
    return chunks.toString();
  }
  let didDoc: string = "";
  if (find) {
    didDoc = await get(cid);
    console.log("DidDoc find", didDoc);
  } else {
    console.log("DidDoc not find");
  }
  res.json(didDoc);
});

app.get("/start", async (req, res) => {
  console.log("start");

  const ipfsId = await CharlieIPFS.id();
  function uint8ArrayToString(buf: Uint8Array) {
    return new TextDecoder().decode(buf);
  }
  function uint8ArrayFromString(str: string) {
    return new TextEncoder().encode(str);
  }
  const topic = "ipfs-test-news";
  setInterval(async () => {
    const didCharlie = {
      id: Date.now(),
      name: "Charlie",
      surname: "Jack",
      age: 20,
    };
    const data = await CharlieIPFS.add(JSON.stringify(didCharlie));
    const cid = data.cid.toString();
    // console.log(cid);
    const keySomeDids = uuidv4();
    await CharlieRedis.add(keySomeDids, JSON.stringify([cid]));
    await CharlieRedis.addDID(
      "did-some",
      JSON.stringify({ key: keySomeDids, value: [cid] })
    );
    await CharlieIPFS.pubsub.publish(
      topic,
      uint8ArrayFromString(
        JSON.stringify({ key: keySomeDids, did: didCharlie })
      )
    );
  }, 3000);

  const allDidSome: string[] = [];
  const resBob = await fetch(" http://localhost:8081/did-some");
  const BobDids: any = await resBob.json();
  const resAlice = await fetch(" http://localhost:8080/did-some");
  const AliceDids: any = await resAlice.json();

  const dids = [...JSON.parse(BobDids), ...JSON.parse(AliceDids)];
  for (const did of dids) {
    allDidSome.push(did);
  }
  const anotherDids = JSON.parse(await CharlieRedis.get("did-another"));
  for (const did of allDidSome) {
    const find = anotherDids.find(
      (oldDId: string) => JSON.parse(did).key === oldDId
    );
    if (!find) {
      anotherDids.push(JSON.parse(did).key);
      await CharlieRedis.add(
        JSON.parse(did).key,
        JSON.stringify(JSON.parse(did).value)
      );
      await CharlieRedis.addDID("did-another", JSON.parse(did).key);
    }
  }
  let lastDid = "";
  await CharlieIPFS.pubsub.subscribe(topic, async (msg: any) => {
    if (msg.from === ipfsId.id) return;
    const receivedDid = uint8ArrayToString(msg.data);
    const { key, did } = JSON.parse(receivedDid);
    const data = await CharlieIPFS.add(JSON.stringify(did));
    const cid = data.cid.toString();
    if (lastDid === "") {
      for (let i = 0; i < anotherDids.length; i++) {
        const getCid = JSON.parse(await CharlieRedis.get(anotherDids[i]));
        console.log(">>", getCid);
      }
      lastDid = anotherDids[anotherDids.length];
    }
    lastDid = key;
    await CharlieRedis.add(key, JSON.stringify([cid]));
    await CharlieRedis.addDID("did-another", key);
    const getCid = JSON.parse(await CharlieRedis.get(key));
    console.log(">>", getCid);
  });

  res.json({
    success: true,
  });
});

app.listen(port, async () => {
  CharlieIPFS = await create({
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
  console.log(`Charlie started on ${url}`);
});
