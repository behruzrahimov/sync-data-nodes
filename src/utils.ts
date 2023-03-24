import { Libp2p } from "libp2p";
import { MessageSend } from "./types.js";
import { add, Redis } from "./dbMeneger.js";
import { Libp2pNodes } from "./nodeLibp2p.js";

export function uint8ArrayToString(buf: Uint8Array) {
  return new TextDecoder().decode(buf);
}
export function uint8ArrayFromString(str: string) {
  return new TextEncoder().encode(str);
}

export async function connect(someNode: Libp2p, anotherNode: Libp2p) {
  await someNode.peerStore.addressBook.set(
    anotherNode.peerId,
    anotherNode.getMultiaddrs()
  );
  const res = await someNode.dial(anotherNode.peerId);
  // console.log(
  //   someNode.peerId.toString(),
  //   "connected to",
  //   res.remotePeer.toString()
  // );
  return res;
}

export async function sendMessage(
  nodeLibp2p: Libp2p,
  message: MessageSend,
  topic: string,
  nodeIPFS: any
) {
  nodeLibp2p.pubsub
    .publish(topic, uint8ArrayFromString(JSON.stringify(message)))
    .catch((err) => {
      console.error(err);
    });
  const cid = await add(JSON.stringify(message), nodeIPFS);
  const db = new Redis();
  await db.add(`${JSON.stringify(nodeLibp2p.peerId)}MessageSend`, cid);
}
export async function receivedMessage(nodeLibp2p: Libp2p, nodeIPFS: any) {
  await nodeLibp2p.pubsub.addEventListener("message", async (evt) => {
    // console.log(
    //   `${nodeLibp2p.peerId} received: ${uint8ArrayToString(
    //     evt.detail.data
    //   )} on topic ${evt.detail.topic}\n`
    // );
  });
  const db = new Redis();
  const allData: string[] = [];
  for (const node of Libp2pNodes) {
    if (nodeLibp2p.peerId.toString() !== node.peerId.toString()) {
      const res = await db.get(`${node.peerId.toString()}MessageSend`);
      for (let parseElement of JSON.parse(res)) {
        allData.push(parseElement);
      }
    }
  }
  const res = await db.get(
    `${nodeLibp2p.peerId.toString()}MessageReceived`
  );
  const someData: string[] = JSON.parse(res);
  if (someData.length === allData.length) {
    return;
  }
  if (someData.length === 0) {
    const cid = await add(JSON.stringify(allData), nodeIPFS);
    await db.add(`${nodeLibp2p.peerId.toString()}MessageReceived`, cid);
    return;
  }
  if (someData.length !== 0 && someData.length < allData.length) {
    const res = syncData(someData, allData);
    const cid = await add(JSON.stringify(res), nodeIPFS);
    await db.add(`${nodeLibp2p.peerId.toString()}MessageReceived`, cid);
    return;
  }
}

export async function subscribe(node: Libp2p, topic: string) {
  await node.pubsub.subscribe(topic);
}

export async function hasSubscription(
  node1: Libp2p,
  node2: Libp2p,
  topic: string
) {
  while (true) {
    const subs = node1.pubsub.getSubscribers(topic);
    if (subs.map((peer) => peer.toString()).includes(node2.peerId.toString())) {
      return;
    }
    // wait for subscriptions to propagate
    await delay(100);
  }
}

export async function delay(ms: number) {
  await new Promise<any>((resolve: any) => {
    setTimeout(() => resolve(), ms);
  });
}

function findIndex(someData: string[], allData: string[]) {
  const lastSD = someData[someData.length - 1];
  let index = 0;
  for (let i = 0; i < allData.length; i++) {
    if (lastSD === allData[i]) {
      index = i;
      break;
    }
  }
  return index;
}
function syncData(someData: string[], allData: string[]) {
  const lastMessageIndex = findIndex(someData, allData);
  for (let i = lastMessageIndex; i < allData.length; i++) {
    someData.push(allData[i]);
  }
  return someData;
}
