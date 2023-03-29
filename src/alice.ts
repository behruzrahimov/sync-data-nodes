import { create, IPFS } from "ipfs-core";
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

let AliceIPFS: any;
app.get("/did/:did", async (req, res) => {
  const someData = await AliceRedis.get("did-some");
  const anotherData = await AliceRedis.get("did-another");
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
    const getDid = await AliceRedis.get(find);
    cid = JSON.parse(getDid)[0];
  }
  async function get(cid: string) {
    const chunks = [];
    for await (const chunk of AliceIPFS.cat(cid)) {
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
    await AliceRedis.addDID(
      "did-some",
      JSON.stringify({ key: keySomeDids, value: [cid] })
    );
    await AliceIPFS.pubsub.publish(
      topic,
      uint8ArrayFromString(JSON.stringify({ key: keySomeDids, did: didAlice }))
    );
  }, 3000);

  const allDidSome: string[] = [];
  const resBob = await fetch(" http://localhost:8081/did-some");
  const BobDids: any = await resBob.json();
  const resCharlie = await fetch(" http://localhost:8082/did-some");
  const CharlieDids: any = await resCharlie.json();

  const dids = [...JSON.parse(BobDids), ...JSON.parse(CharlieDids)];
  for (const did of dids) {
    allDidSome.push(did);
  }

  const anotherDids = JSON.parse(await AliceRedis.get("did-another"));
  for (const did of allDidSome) {
    const find = anotherDids.find(
      (oldDId: string) => JSON.parse(did).key === oldDId
    );
    if (!find) {
      anotherDids.push(JSON.parse(did).key);
      await AliceRedis.add(
        JSON.parse(did).key,
        JSON.stringify(JSON.parse(did).value)
      );
      await AliceRedis.addDID("did-another", JSON.parse(did).key);
    }
  }

  let lastDid = "";

  await AliceIPFS.pubsub.subscribe(topic, async (msg: any) => {
    if (msg.from === ipfsId.id) return;
    const receivedDid = uint8ArrayToString(msg.data);
    const { key, did } = JSON.parse(receivedDid);
    const data = await AliceIPFS.add(JSON.stringify(did));
    const cid = data.cid.toString();

    if (lastDid === "") {
      for (let i = 0; i < anotherDids.length; i++) {
        const getCid = JSON.parse(await AliceRedis.get(anotherDids[i]));
        console.log(">>", getCid);
      }
      lastDid = anotherDids[anotherDids.length];
    }
    lastDid = key;
    await AliceRedis.add(key, JSON.stringify([cid]));
    await AliceRedis.addDID("did-another", key);
    const getCid = JSON.parse(await AliceRedis.get(key));
    console.log(">>", getCid);
  });

  res.json({
    success: true,
  });
});

app.listen(port, async () => {
  AliceIPFS = await create({
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
  console.log(`Alice started on ${url}`);
});
