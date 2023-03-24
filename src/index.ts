import {
  connect,
  sendMessage,
  receivedMessage,
  subscribe,
  hasSubscription,
} from "./utils.js";
import { MessageSend } from "./types.js";
import { AliceIPFS, BobIPFS, CharlieIPFS, IPFSNodes } from "./db-manager.js";
import { AliceNode, BobNode, CharlieNode } from "./node-libp2p.js";
import { Redis } from "./redis.js";

export const RedisClient = new Redis();

export async function start() {
  const topic = "news";

  await connect(BobNode, AliceNode);
  await connect(AliceNode, CharlieNode);
  await connect(CharlieNode, BobNode);

  const messageBob: MessageSend = {
    id: Date.now(),
    from: "Bob",
    message: "Hello everyone my name is Bob!",
  };

  const messageAlice: MessageSend = {
    id: Date.now(),
    from: "Alice",
    message: "Hello everyone my name is Alice!",
  };

  const messageJack: MessageSend = {
    id: Date.now(),
    from: "Jack",
    message: "Hello everyone my name is Jack!",
  };

  await sendMessage(BobNode, messageBob, topic, BobIPFS);
  await sendMessage(AliceNode, messageAlice, topic, AliceIPFS);
  await sendMessage(CharlieNode, messageJack, topic, CharlieIPFS);

  await receivedMessage(BobNode, BobIPFS);
  await subscribe(BobNode, topic);

  await receivedMessage(AliceNode, AliceIPFS);
  await subscribe(AliceNode, topic);

  await receivedMessage(CharlieNode, CharlieIPFS);
  await subscribe(CharlieNode, topic);

  await hasSubscription(BobNode, AliceNode, topic);
  await hasSubscription(AliceNode, CharlieNode, topic);

  console.log("messagesSend");
  console.log(
    "Bob",
    JSON.parse(await RedisClient.get(`${BobNode.peerId.toString()}MessageSend`))
  );
  console.log(
    "Alice",
    JSON.parse(
      await RedisClient.get(`${AliceNode.peerId.toString()}MessageSend`)
    )
  );
  console.log(
    "Jack",
    JSON.parse(
      await RedisClient.get(`${CharlieNode.peerId.toString()}MessageSend`)
    )
  );

  console.log("\n");
  console.log("messagesReceived");
  console.log(
    "Bob",
    JSON.parse(
      await RedisClient.get(`${BobNode.peerId.toString()}MessageReceived`)
    )
  );
  console.log(
    "ALice",
    JSON.parse(
      await RedisClient.get(`${AliceNode.peerId.toString()}MessageReceived`)
    )
  );
  console.log(
    "Jack",
    JSON.parse(
      await RedisClient.get(`${CharlieNode.peerId.toString()}MessageReceived`)
    )
  );
  // console.log(
  //   "getIPFS",
  //   await get("QmaVXXFaB55fccYCitW4vie7cB2mZNMETZJnNtpDNYBKuT", CharlieIPFS)
  // );

  process.exit();
}
