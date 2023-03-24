import {
  connect,
  sendMessage,
  receivedMessage,
  subscribe,
  hasSubscription,
  // get,
} from "./utils.js";
import { MessageSend } from "./types.js";
import { IPFSNodes } from "./dbMeneger.js";
import { Libp2pNodes } from "./nodeLibp2p.js";
export async function start() {
  const topic = "news";

  await connect(Libp2pNodes[0], Libp2pNodes[1]);
  await connect(Libp2pNodes[1], Libp2pNodes[2]);
  await connect(Libp2pNodes[2], Libp2pNodes[0]);

  // await receivedMessage(Libp2pNodes[0], IPFSNodes[0]);
  await subscribe(Libp2pNodes[0], topic);

  await receivedMessage(Libp2pNodes[1], IPFSNodes[1]);
  await subscribe(Libp2pNodes[1], topic);

  // await receivedMessage(Libp2pNodes[2], IPFSNodes[2]);
  await subscribe(Libp2pNodes[2], topic);

  await hasSubscription(Libp2pNodes[0], Libp2pNodes[1], topic);
  await hasSubscription(Libp2pNodes[1], Libp2pNodes[2], topic);
  await hasSubscription(Libp2pNodes[2], Libp2pNodes[0], topic);

  const messageBob: MessageSend = {
    id: Date.now(),
    from: "Bob",
    message: "Hello everyone my name is Bob!",
  };
  await sendMessage(Libp2pNodes[0], messageBob, topic, IPFSNodes[0]);

  const messageAlice: MessageSend = {
    id: Date.now(),
    from: "Alice",
    message: "Hello everyone my name is Alice!",
  };
  // await sendMessage(nodeAlice, messageAlice, topic, db[1]);

  const messageJack: MessageSend = {
    id: Date.now(),
    from: "Jack",
    message: "Hello everyone my name is Jack!",
  };
  // await sendMessage(nodeJack, messageJack, topic, db[2]);

  // console.log("messagesSend");
  // console.log("Bob", await get(db[0], "messageSend"));
  // console.log("Alice", await get(db[1], "messageSend"));
  // console.log("Jack", await get(db[2], "messageSend"));
  // console.log("\n");
  // console.log("messagesReceived");
  // console.log("Bob", await get(db[0], "messageReceived"));
  // console.log("Alice", await get(db[1], "messageReceived"));
  // console.log("Jack", await get(db[2], "messageReceived"));

  process.exit();
}
