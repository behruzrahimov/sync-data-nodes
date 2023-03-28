import { MessageSend } from "./types.js";
import { create } from "ipfs-core";
import { BobRedis } from "./redis.js";
import express from "express";
import cors from "cors";
const url = " http://localhost:8081";
const port = 8081;
const app = express();
import fetch from "node-fetch";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

await BobRedis.init();
app.get("/get-message-send", async (req, res) => {
  const result = await BobRedis.get("messages-send");
  res.json(result);
});

app.get("/get-message-received", async (req, res) => {
  const result = await BobRedis.get("messages-received");
  res.json(result);
});

app.get("/start", async (req, res) => {
  console.log("start");
  const BobIPFS = await create({
    repo: "ipfs/ipfs1",
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
    const messageBob: MessageSend = {
      id: Date.now(),
      from: "Bob",
      message: "Hello everyone my name is Bob!",
    };
    const res = await BobIPFS.add(JSON.stringify(messageBob));
    const cid = res.cid.toString();
    // console.log(cid);
    await BobRedis.add("messages-send", cid);
    await BobIPFS.pubsub.publish(
      topic,
      uint8ArrayFromString(JSON.stringify(messageBob))
    );
  }, 3000);

  const resAlice = await fetch(" http://localhost:8080/get-message-send");
  const sendMessageAlice: any = await resAlice.json();

  const resCharlie = await fetch(" http://localhost:8082/get-message-send");
  const sendMessageCharlie: any = await resCharlie.json();

  const allMessageSend: string[] = [];

  const messages = [
    JSON.parse(sendMessageAlice),
    JSON.parse(sendMessageCharlie),
  ];
  for (const message of messages) {
    for (const cid of message) {
      allMessageSend.push(cid);
    }
  }

  const receivedCids = JSON.parse(await BobRedis.get("messages-received"));
  for (const cid of allMessageSend) {
    const find = receivedCids.find(
      (receivedCid: string) => cid === receivedCid
    );
    if (!find) {
      receivedCids.push(cid);
      await BobRedis.add("messages-received", cid);
    }
  }

  let latestMessage = "";

  await BobIPFS.pubsub.subscribe(topic, async (msg: any) => {
    if (msg.from === ipfsId.id) return;
    const receivedMessage = uint8ArrayToString(msg.data);
    const res = await BobIPFS.add(receivedMessage);
    const cid = res.cid.toString();
    if (latestMessage === "") {
      for (let i = 0; i < receivedCids.length; i++) {
        console.log(">>", receivedCids[i]);
      }
      latestMessage = receivedCids[receivedCids.length];
    }
    console.log(">>", cid);
    await BobRedis.add("messages-received", cid);
  });
  res.json({
    success: true,
  });
});

app.listen(port, () => {
  console.log(`Bob started on ${url}`);
});
