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
app.get("/get/:type/:typeData", async (req, res) => {
  let result: string = "";
  if (req.params.type === "did") {
    if (req.params.typeData === "some") {
      result = await CharlieRedis.get("did-some");
    } else if (req.params.typeData === "another") {
      result = await CharlieRedis.get("did-another");
    }
  } else if (req.params.type === "comm") {
    if (req.params.typeData === "some") {
      result = await CharlieRedis.get("comm-some");
    } else if (req.params.typeData === "another") {
      result = await CharlieRedis.get("comm-another");
    }
  }
  res.json(result);
});

let CharlieIPFS: any;
app.get("/find/:type/:id", async (req, res) => {
  let someData: string;
  let anotherData: string;
  if (req.params.type === "did") {
    someData = await CharlieRedis.get("did-some");
    anotherData = await CharlieRedis.get("did-another");
  } else {
    someData = await CharlieRedis.get("comm-some");
    anotherData = await CharlieRedis.get("comm-another");
  }
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
      type: "did",
      name: "Charlie",
      surname: "Jack",
      age: 20,
    };

    const dataDidDoc = await CharlieIPFS.add(JSON.stringify(didDocCharlie));
    const cidDidDoc = dataDidDoc.cid.toString();
    // console.log(cid);
    const keyDidDoc = `did:${uuidv4()}`;
    await CharlieRedis.add(keyDidDoc, JSON.stringify([cidDidDoc]));
    await CharlieRedis.addDID(
      "did-some",
      JSON.stringify({ key: keyDidDoc, value: [cidDidDoc] })
    );
    await CharlieIPFS.pubsub.publish(
      topic,
      uint8ArrayFromString(
        JSON.stringify({ key: keyDidDoc, data: didDocCharlie })
      )
    );

    const communityCharlie = {
      id: Date.now(),
      type: "comm",
      name: "Charlie",
      nick: "Sami",
      group: "Students",
    };
    const dataComm = await CharlieIPFS.add(JSON.stringify(communityCharlie));
    const cidComm = dataComm.cid.toString();
    const keyComm = `comm:${uuidv4()}`;
    await CharlieRedis.add(keyComm, JSON.stringify([cidComm]));
    await CharlieRedis.addDID(
      "comm-some",
      JSON.stringify({ key: keyComm, value: [cidComm] })
    );
    await CharlieIPFS.pubsub.publish(
      topic,
      uint8ArrayFromString(
        JSON.stringify({ key: keyComm, data: communityCharlie })
      )
    );
  }, 3000);

  let allDidSome: string[] = [];
  const resAliceDid = await fetch(" http://localhost:8080/get/did/some");
  const AliceDid: any = await resAliceDid.json();
  const resBobDid = await fetch(" http://localhost:8081/get/did/some");
  const BobDids: any = await resBobDid.json();
  const dids = [...JSON.parse(BobDids), ...JSON.parse(AliceDid)];
  for (const did of dids) {
    allDidSome.push(did);
    allDidSome = [...new Set(allDidSome)];
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

  let allCommSome: string[] = [];
  const resAliceComm = await fetch(" http://localhost:8080/get/comm/some");
  const AliceComm: any = await resAliceComm.json();
  const resBobComm = await fetch(" http://localhost:8081/get/comm/some");
  const BobComm: any = await resBobComm.json();
  const comm = [...JSON.parse(BobComm), ...JSON.parse(AliceComm)];
  for (const com of comm) {
    allCommSome.push(com);
    allCommSome = [...new Set(allCommSome)];
  }

  const anotherComm = JSON.parse(await CharlieRedis.get("comm-another"));
  for (const com of allCommSome) {
    const find = anotherComm.find(
      (oldComm: string) => JSON.parse(com).key === oldComm
    );
    if (!find) {
      anotherComm.push(JSON.parse(com).key);
      await CharlieRedis.add(
        JSON.parse(com).key,
        JSON.stringify(JSON.parse(com).value)
      );
      await CharlieRedis.addDID("comm-another", JSON.parse(com).key);
    }
  }

  let lastDid = "";
  let lastComm = "";
  await CharlieIPFS.pubsub.subscribe(topic, async (msg: any) => {
    if (msg.from === ipfsId.id) return;
    const receivedDid = uint8ArrayToString(msg.data);
    const { key, data } = JSON.parse(receivedDid);
    const resIpfs = await CharlieIPFS.add(JSON.stringify(data));
    const cid = resIpfs.cid.toString();

    if (lastDid === "") {
      for (let i = 0; i < anotherDids.length; i++) {
        const getCid = JSON.parse(await CharlieRedis.get(anotherDids[i]));
        console.log("of>>", getCid);
      }
      lastDid = anotherDids[anotherDids.length];
    }
    lastDid = key;

    if (lastComm === "") {
      for (let i = 0; i < anotherComm.length; i++) {
        const getCid = JSON.parse(await CharlieRedis.get(anotherComm[i]));
        console.log("of>>", getCid);
      }
      lastComm = anotherComm[anotherComm.length];
    }
    lastComm = key;

    await CharlieRedis.add(key, JSON.stringify([cid]));
    if (data.type === "comm") {
      await CharlieRedis.addDID("comm-another", key);
    } else {
      await CharlieRedis.addDID("did-another", key);
    }
    const getCid = JSON.parse(await CharlieRedis.get(key));
    console.log("on>>", getCid);
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
