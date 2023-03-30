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

app.get("/get/:type/:typeData", async (req, res) => {
  const result = await AliceRedis.get(
    `${req.params.type}-${req.params.typeData}`
  );
  res.json(result);
});

let AliceIPFS: any;
app.get("/find/:type/:id", async (req, res) => {
  const someData = await AliceRedis.get(`${req.params.type}-some`);
  const anotherData = await AliceRedis.get(`${req.params.type}-another`);
  const keys = [];
  for (const data of JSON.parse(someData)) {
    const parseData = JSON.parse(data);
    keys.push(parseData.key);
  }
  for (const data of JSON.parse(anotherData)) {
    keys.push(data);
  }
  const find = keys.find((key) => key === req.params.id);
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
    if (req.params.type === "did") {
      console.log("DidDoc find", JSON.parse(didDoc));
    } else {
      console.log("Community find", JSON.parse(didDoc));
    }
  }
  if (req.params.type === "did") {
    res.json(find ? didDoc : "DidDoc not find");
  } else {
    res.json(find ? didDoc : "Community not find");
  }
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
    const didDocAlice = {
      id: Date.now(),
      type: "did",
      name: "Alice",
      surname: "Alison",
      age: 10,
    };

    const dataDidDoc = await AliceIPFS.add(JSON.stringify(didDocAlice));
    const cidDidDoc = dataDidDoc.cid.toString();
    const keyDidDoc = `did:${uuidv4()}`;
    console.log(keyDidDoc);
    await AliceRedis.add(keyDidDoc, JSON.stringify([cidDidDoc]));
    await AliceRedis.addDID(
      "did-some",
      JSON.stringify({ key: keyDidDoc, value: [cidDidDoc] })
    );
    await AliceIPFS.pubsub.publish(
      topic,
      uint8ArrayFromString(
        JSON.stringify({ key: keyDidDoc, data: didDocAlice })
      )
    );

    const communityAlice = {
      id: Date.now(),
      type: "comm",
      name: "Alice",
      nick: "Hacker",
      group: "programmers",
    };
    const dataComm = await AliceIPFS.add(JSON.stringify(communityAlice));
    const cidComm = dataComm.cid.toString();
    const keyComm = `comm:${uuidv4()}`;
    console.log(keyComm);
    await AliceRedis.add(keyComm, JSON.stringify([cidComm]));
    await AliceRedis.addDID(
      "comm-some",
      JSON.stringify({ key: keyComm, value: [cidComm] })
    );
    await AliceIPFS.pubsub.publish(
      topic,
      uint8ArrayFromString(
        JSON.stringify({ key: keyComm, data: communityAlice })
      )
    );
  }, 3000);

  let allDidSome: string[] = [];
  const resBobDid = await fetch(" http://localhost:8081/get/did/some");
  const BobDids: any = await resBobDid.json();
  const resCharlieDid = await fetch(" http://localhost:8082/get/did/some");
  const CharlieDids: any = await resCharlieDid.json();

  const dids = [...JSON.parse(BobDids), ...JSON.parse(CharlieDids)];
  for (const did of dids) {
    allDidSome.push(did);
    allDidSome = [...new Set(allDidSome)];
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

  let allCommSome: string[] = [];
  const resBobComm = await fetch(" http://localhost:8081/get/comm/some");
  const BobComm: any = await resBobComm.json();
  const resCharlieComm = await fetch(" http://localhost:8082/get/comm/some");
  const CharlieComm: any = await resCharlieComm.json();
  const comm = [...JSON.parse(BobComm), ...JSON.parse(CharlieComm)];
  for (const com of comm) {
    allCommSome.push(com);
    allCommSome = [...new Set(allCommSome)];
  }

  const anotherComm = JSON.parse(await AliceRedis.get("comm-another"));
  for (const com of allCommSome) {
    const find = anotherComm.find(
      (oldComm: string) => JSON.parse(com).key === oldComm
    );
    if (!find) {
      anotherComm.push(JSON.parse(com).key);
      await AliceRedis.add(
        JSON.parse(com).key,
        JSON.stringify(JSON.parse(com).value)
      );
      await AliceRedis.addDID("comm-another", JSON.parse(com).key);
    }
  }

  let lastDid = "";
  let lastComm = "";
  await AliceIPFS.pubsub.subscribe(topic, async (msg: any) => {
    if (msg.from === ipfsId.id) return;
    const receivedDid = uint8ArrayToString(msg.data);
    const { key, data } = JSON.parse(receivedDid);
    const resIpfs = await AliceIPFS.add(JSON.stringify(data));
    const cid = resIpfs.cid.toString();

    if (lastDid === "") {
      for (let i = 0; i < anotherDids.length; i++) {
        const getCid = JSON.parse(await AliceRedis.get(anotherDids[i]));
        console.log("of>>", getCid);
      }
      lastDid = anotherDids[anotherDids.length];
    }
    lastDid = key;

    if (lastComm === "") {
      for (let i = 0; i < anotherComm.length; i++) {
        const getCid = JSON.parse(await AliceRedis.get(anotherComm[i]));
        console.log("of>>", getCid);
      }
      lastComm = anotherComm[anotherComm.length];
    }
    lastComm = key;

    await AliceRedis.add(key, JSON.stringify([cid]));
    if (data.type === "comm") {
      await AliceRedis.addDID("comm-another", key);
    } else {
      await AliceRedis.addDID("did-another", key);
    }
    const getCid = JSON.parse(await AliceRedis.get(key));
    console.log("on>>", getCid);
  });

  res.json({
    success: true,
  });
});

app.listen(port, async () => {
  AliceIPFS = await create({
    repo: `ipfs/ipfs1`,
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
