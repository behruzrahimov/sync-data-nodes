import express from "express";
import cors from "cors";
import { MessageSend } from "./types.js";
import { create } from "ipfs-core";
import { CharlieRedis } from "./redis.js";
await CharlieRedis.init();
const port = 8082;
const url = "http://localhost:8082";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/get-message-send", async (req, res) => {
  const result = await CharlieRedis.get("messages-send");
  res.json(result);
});

app.get("/get-message-received", async (req, res) => {
  const result = await CharlieRedis.get("messages-received");
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
    const messageCharlie: MessageSend = {
      id: Date.now(),
      from: "Charlie",
      message: "Hello everyone my name is Charlie!",
    };
    const res = await CharlieIPFS.add(JSON.stringify(messageCharlie));
    const cid = res.cid.toString();
    // console.log(cid);
    await CharlieRedis.add("messages-send", cid);
    await CharlieIPFS.pubsub.publish(
      topic,
      uint8ArrayFromString(JSON.stringify(messageCharlie))
    );
  }, 3000);

  const resAlice = await fetch(" http://localhost:8080/get-message-send");
  const sendMessageAlice: any = await resAlice.json();
  const resBob = await fetch(" http://localhost:8081/get-message-send");
  const sendMessageBob: any = await resBob.json();
  const allMessageSend: string[] = [];

  const messages = [JSON.parse(sendMessageBob), JSON.parse(sendMessageAlice)];
  for (const message of messages) {
    for (const cid of message) {
      allMessageSend.push(cid);
    }
  }

  const receivedCids = JSON.parse(await CharlieRedis.get("messages-received"));
  for (const cid of allMessageSend) {
    const find = receivedCids.find(
      (receivedCid: string) => cid === receivedCid
    );
    if (!find) {
      receivedCids.push(cid);
      await CharlieRedis.add("messages-received", cid);
    }
  }
  let latestMessage = "";

  await CharlieIPFS.pubsub.subscribe(topic, async (msg: any) => {
    if (msg.from === ipfsId.id) return;
    const receivedMessage = uint8ArrayToString(msg.data);
    const res = await CharlieIPFS.add(receivedMessage);
    const cid = res.cid.toString();
    if (latestMessage === "") {
      for (let i = 0; i < receivedCids.length; i++) {
        console.log(">>", receivedCids[i]);
      }
      latestMessage = receivedCids[receivedCids.length];
    }
    console.log(">>", cid);
    await CharlieRedis.add("messages-received", cid);
  });

  res.json({
    success: true,
  });
});

app.listen(port, () => {
  console.log(`Charlie started on ${url}`);
});
