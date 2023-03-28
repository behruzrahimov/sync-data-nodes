import { MessageSend } from "./types.js";
import { create } from "ipfs-core";
import { AliceRedis } from "./redis.js";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
const url = " http://localhost:8080";
const port = 8080;
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

await AliceRedis.init();
app.get("/get-message-send", async (req, res) => {
  const result = await AliceRedis.get("messages-send");
  res.json(result);
});

app.get("/get-message-received", async (req, res) => {
  const result = await AliceRedis.get("messages-received");
  res.json(result);
});

app.get("/start", async (req, res) => {
  console.log("start");
  const AliceIPFS = await create({
    repo: "ipfs/ipfs2",
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
  const topic = "ipfs-test-news";

  function uint8ArrayToString(buf: Uint8Array) {
    return new TextDecoder().decode(buf);
  }
  function uint8ArrayFromString(str: string) {
    return new TextEncoder().encode(str);
  }

  setInterval(async () => {
    const messageAlice: MessageSend = {
      id: Date.now(),
      from: "Alice",
      message: "Hello everyone my name is Alice!",
    };
    const res = await AliceIPFS.add(JSON.stringify(messageAlice));
    const cid = res.cid.toString();
    // console.log(cid);
    await AliceRedis.add("messages-send", cid);
    await AliceIPFS.pubsub.publish(
      topic,
      uint8ArrayFromString(JSON.stringify(messageAlice))
    );
  }, 3000);

  const allMessageSend: string[] = [];
  const resBob = await fetch(" http://localhost:8081/get-message-send");
  const sendMessageBob: any = await resBob.json();
  const resCharlie = await fetch(" http://localhost:8082/get-message-send");
  const sendMessageCharlie: any = await resCharlie.json();
  const messages = [JSON.parse(sendMessageBob), JSON.parse(sendMessageCharlie)];
  for (const message of messages) {
    for (const cid of message) {
      allMessageSend.push(cid);
    }
  }
  const receivedCids = JSON.parse(await AliceRedis.get("messages-received"));
  for (const cid of allMessageSend) {
    const find = receivedCids.find(
      (receivedCid: string) => cid === receivedCid
    );
    if (!find) {
      receivedCids.push(cid);
      await AliceRedis.add("messages-received", cid);
    }
  }
  let latestMessage = "";
  await AliceIPFS.pubsub.subscribe(topic, async (msg: any) => {
    if (msg.from === ipfsId.id) return;
    const receivedMessage = uint8ArrayToString(msg.data);
    const res = await AliceIPFS.add(receivedMessage);
    const cid = res.cid.toString();
    if (latestMessage === "") {
      for (let i = 0; i < receivedCids.length; i++) {
        console.log(">>", receivedCids[i]);
      }
      latestMessage = receivedCids[receivedCids.length];
    }
    console.log(">>", cid);
    await AliceRedis.add("messages-received", cid);
  });

  res.json({
    success: true,
  });
});

app.listen(port, () => {
  console.log(`Alice started on ${url}`);
});
