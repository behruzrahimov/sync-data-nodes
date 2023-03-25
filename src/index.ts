import {
  connect,
  sendMessage,
  receivedMessage,
  subscribe,
  hasSubscription,
} from "./utils.js";
import { MessageSend } from "./types.js";
import { AliceIPFS, BobIPFS, CharlieIPFS } from "./db-manager.js";
import { AliceNode, BobNode, CharlieNode } from "./node-libp2p.js";
import { AliceRedis } from "./redis/alice.js";
import { BobRedis } from "./redis/bob.js";
import { CharlieRedis } from "./redis/charlie.js";

export async function start() {
  const topic = "news";

  await connect(AliceNode, BobNode);
  await connect(BobNode, CharlieNode);
  await connect(CharlieNode, AliceNode);

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

  const messageCharlie: MessageSend = {
    id: Date.now(),
    from: "Charlie",
    message: "Hello everyone my name is Charlie!",
  };

  await sendMessage(AliceNode, messageAlice, topic, AliceIPFS, AliceRedis);
  await sendMessage(BobNode, messageBob, topic, BobIPFS, BobRedis);
  await sendMessage(
    CharlieNode,
    messageCharlie,
    topic,
    CharlieIPFS,
    CharlieRedis
  );

  await receivedMessage(AliceNode, AliceRedis);
  await subscribe(AliceNode, topic);

  await receivedMessage(BobNode, BobRedis);
  await subscribe(BobNode, topic);

  await receivedMessage(CharlieNode, CharlieRedis);
  await subscribe(CharlieNode, topic);

  await hasSubscription(AliceNode, BobNode, topic);
  await hasSubscription(BobNode, CharlieNode, topic);

  console.log("\nmessagesSend");
  console.log("Alice", JSON.parse(await AliceRedis.get("MessageSend")));
  console.log("Bob", JSON.parse(await BobRedis.get("MessageSend")));
  console.log("Charlie", JSON.parse(await CharlieRedis.get("MessageSend")));

  console.log("\n");
  console.log("messagesReceived");
  console.log("Alice", JSON.parse(await AliceRedis.get("MessageReceived")));
  console.log("Bob", JSON.parse(await BobRedis.get("MessageReceived")));
  console.log("Charlie", JSON.parse(await CharlieRedis.get("MessageReceived")));

  // console.log(
  //   "getIPFS",
  //   await get("QmXrurFshMPCHt8yza1XiY39ML5fMNeL486y1rRfLpvg6X", AliceIPFS)
  // );

  process.exit();
}
