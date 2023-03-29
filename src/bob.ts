import { create } from "ipfs-core";
import { Redis } from "./redis.js";
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

const urlBob = "redis://localhost:6385";
const BobRedis = new Redis(urlBob, "Bob");

await BobRedis.init();

app.get("/did-some", async (req, res) => {
  const result = await BobRedis.get("did-some");
  res.json(result);
});

app.get("/did-another", async (req, res) => {
  const result = await BobRedis.get("did-another");
  res.json(result);
});

app.get("/comm-some", async (req, res) => {
  const result = await BobRedis.get("comm-some");
  res.json(result);
});

app.get("/comm-another", async (req, res) => {
  const result = await BobRedis.get("comm-another");
  res.json(result);
});

let BobIPFS: any;
app.get("/did/:did", async (req, res) => {
  const someData = await BobRedis.get("did-some");
  const anotherData = await BobRedis.get("did-another");
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
    const getDid = await BobRedis.get(find);
    cid = JSON.parse(getDid)[0];
  }
  async function get(cid: string) {
    const chunks = [];
    for await (const chunk of BobIPFS.cat(cid)) {
      chunks.push(chunk);
    }
    return chunks.toString();
  }

  let didDoc: string = "";

  if (find) {
    didDoc = await get(cid);
    console.log("DidDoc find", JSON.parse(didDoc));
  } else {
    console.log("DidDoc not find");
  }
  res.json(find ? didDoc : "didDoc not find");
});

app.get("/comm/:comm", async (req, res) => {
  const someData = await BobRedis.get("comm-some");
  const anotherData = await BobRedis.get("comm-another");
  const keys = [];
  for (const data of JSON.parse(someData)) {
    const parseData = JSON.parse(data);
    keys.push(parseData.key);
  }
  for (const data of JSON.parse(anotherData)) {
    keys.push(data);
  }
  const find = keys.find((key) => key === req.params.comm);
  let cid = "";
  if (find) {
    const getDid = await BobRedis.get(find);
    cid = JSON.parse(getDid)[0];
  }
  async function get(cid: string) {
    const chunks = [];
    for await (const chunk of BobIPFS.cat(cid)) {
      chunks.push(chunk);
    }
    return chunks.toString();
  }
  let community: string = "";
  if (find) {
    community = await get(cid);
    console.log("community find", JSON.parse(community));
  }
  res.json(find ? community : "community not find");
});

app.get("/start", async (req, res) => {
  console.log("start");

  const ipfsId = await BobIPFS.id();
  function uint8ArrayToString(buf: Uint8Array) {
    return new TextDecoder().decode(buf);
  }
  function uint8ArrayFromString(str: string) {
    return new TextEncoder().encode(str);
  }

  const topic = "ipfs-test-news";

  setInterval(async () => {
    const didDocBob = {
      id: Date.now(),
      type: "did",
      name: "Bob",
      surname: "Alex",
      age: 18,
    };

    const dataDidDoc = await BobIPFS.add(JSON.stringify(didDocBob));
    const cidDidDoc = dataDidDoc.cid.toString();
    const keyDidDoc = `did:${uuidv4()}`;
    await BobRedis.add(keyDidDoc, JSON.stringify([cidDidDoc]));
    await BobRedis.addDID(
      "did-some",
      JSON.stringify({ key: keyDidDoc, value: [cidDidDoc] })
    );

    await BobIPFS.pubsub.publish(
      topic,
      uint8ArrayFromString(JSON.stringify({ key: keyDidDoc, data: didDocBob }))
    );

    const communityBob = {
      id: Date.now(),
      type: "comm",
      name: "Bob",
      nick: "Jack",
      group: "football",
    };
    const dataComm = await BobIPFS.add(JSON.stringify(communityBob));
    const cidComm = dataComm.cid.toString();
    const keyComm = `comm:${uuidv4()}`;
    await BobRedis.add(keyComm, JSON.stringify([cidComm]));
    await BobRedis.addDID(
      "comm-some",
      JSON.stringify({ key: keyComm, value: [cidComm] })
    );
    await BobIPFS.pubsub.publish(
      topic,
      uint8ArrayFromString(JSON.stringify({ key: keyComm, data: communityBob }))
    );
  }, 3000);

  let allDidSome: string[] = [];
  const resAlice = await fetch(" http://localhost:8080/did-some");
  const AliceDids: any = await resAlice.json();
  const resCharlie = await fetch(" http://localhost:8082/did-some");
  const CharlieDids: any = await resCharlie.json();

  const dids = [...JSON.parse(AliceDids), ...JSON.parse(CharlieDids)];
  for (const did of dids) {
    allDidSome.push(did);
    allDidSome = [...new Set(allDidSome)];
  }

  const anotherDids = JSON.parse(await BobRedis.get("did-another"));
  for (const did of allDidSome) {
    const find = anotherDids.find(
      (oldDId: string) => JSON.parse(did).key === oldDId
    );
    if (!find) {
      anotherDids.push(JSON.parse(did).key);
      await BobRedis.add(
        JSON.parse(did).key,
        JSON.stringify(JSON.parse(did).value)
      );
      await BobRedis.addDID("did-another", JSON.parse(did).key);
    }
  }

  let allCommSome: string[] = [];
  const resAliceComm = await fetch(" http://localhost:8080/comm-some");
  const AliceComm: any = await resAliceComm.json();
  const resCharlieComm = await fetch(" http://localhost:8082/comm-some");
  const CharlieComm: any = await resCharlieComm.json();

  const comm = [...JSON.parse(AliceComm), ...JSON.parse(CharlieComm)];
  for (const com of comm) {
    allCommSome.push(com);
    allCommSome = [...new Set(allCommSome)];
  }

  const anotherComm = JSON.parse(await BobRedis.get("comm-another"));
  for (const com of allCommSome) {
    const find = anotherComm.find(
      (oldComm: string) => JSON.parse(com).key === oldComm
    );
    if (!find) {
      anotherComm.push(JSON.parse(com).key);
      await BobRedis.add(
        JSON.parse(com).key,
        JSON.stringify(JSON.parse(com).value)
      );
      await BobRedis.addDID("comm-another", JSON.parse(com).key);
    }
  }

  let lastDid = "";
  let lastComm = "";
  await BobIPFS.pubsub.subscribe(topic, async (msg: any) => {
    if (msg.from === ipfsId.id) return;
    const receivedDid = uint8ArrayToString(msg.data);
    const { key, data } = JSON.parse(receivedDid);
    const dataIpfs = await BobIPFS.add(JSON.stringify(data));
    const cid = dataIpfs.cid.toString();

    if (lastDid === "") {
      for (let i = 0; i < anotherDids.length; i++) {
        const getCid = JSON.parse(await BobRedis.get(anotherDids[i]));
        console.log("of>>", getCid);
      }
      lastDid = anotherDids[anotherDids.length];
    }
    lastDid = key;

    if (lastComm === "") {
      for (let i = 0; i < anotherComm.length; i++) {
        const getCid = JSON.parse(await BobRedis.get(anotherComm[i]));
        console.log("of>>", getCid);
      }
      lastComm = anotherComm[anotherComm.length];
    }
    lastComm = key;

    await BobRedis.add(key, JSON.stringify([cid]));

    if (data.type === "comm") {
      await BobRedis.addDID("comm-another", key);
    } else {
      await BobRedis.addDID("did-another", key);
    }
    const getCid = JSON.parse(await BobRedis.get(key));
    console.log("on>>", getCid);
  });

  res.json({
    success: true,
  });
});

app.listen(port, async () => {
  BobIPFS = await create({
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
  console.log(`Bob started on ${url}`);
});
