import {
  connect,
  sendMessage,
  receivedMessage,
  subscribe,
  hasSubscription,
} from "./utils.js";
import { MessageSend } from "./types.js";
import { get, IPFSNodes, Redis } from "./dbMeneger.js";
import { Libp2pNodes } from "./nodeLibp2p.js";
export async function start() {
  const topic = "news";

  await connect(Libp2pNodes[0], Libp2pNodes[1]);
  await connect(Libp2pNodes[1], Libp2pNodes[2]);
  await connect(Libp2pNodes[2], Libp2pNodes[0]);

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

  await sendMessage(Libp2pNodes[0], messageBob, topic, IPFSNodes[0]);
  await sendMessage(Libp2pNodes[1], messageAlice, topic, IPFSNodes[1]);
  await sendMessage(Libp2pNodes[2], messageJack, topic, IPFSNodes[2]);

  await receivedMessage(Libp2pNodes[0], IPFSNodes[0]);
  await subscribe(Libp2pNodes[0], topic);

  await receivedMessage(Libp2pNodes[1], IPFSNodes[1]);
  await subscribe(Libp2pNodes[1], topic);

  await receivedMessage(Libp2pNodes[2], IPFSNodes[2]);
  await subscribe(Libp2pNodes[2], topic);

  await hasSubscription(Libp2pNodes[0], Libp2pNodes[1], topic);
  await hasSubscription(Libp2pNodes[1], Libp2pNodes[2], topic);

  const db = new Redis();
  console.log("messagesSend");
  console.log(
    "Bob",
    JSON.parse(await db.get(`${Libp2pNodes[0].peerId.toString()}MessageSend`))
  );
  console.log(
    "Alice",
    JSON.parse(await db.get(`${Libp2pNodes[1].peerId.toString()}MessageSend`))
  );
  console.log(
    "Jack",
    JSON.parse(await db.get(`${Libp2pNodes[2].peerId.toString()}MessageSend`))
  );

  console.log("\n");
  console.log("messagesReceived");
  console.log(
    "Bob",
    JSON.parse(
      await db.get(`${Libp2pNodes[0].peerId.toString()}MessageReceived`)
    )
  );
  console.log(
    "ALice",
    JSON.parse(
      await db.get(`${Libp2pNodes[1].peerId.toString()}MessageReceived`)
    )
  );
  console.log(
    "Jack",
    JSON.parse(
      await db.get(`${Libp2pNodes[2].peerId.toString()}MessageReceived`)
    )
  );
  // console.log(
  //   "getIPFS",
  //   await get("QmaVXXFaB55fccYCitW4vie7cB2mZNMETZJnNtpDNYBKuT", IPFSNodes[2])
  // );

  process.exit();
}
