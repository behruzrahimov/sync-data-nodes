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
  await db.add(`${nodeLibp2p.peerId.toString()}MessageSend`, cid);
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
  const someData: string[] = JSON.parse(
    await db.get(`${nodeLibp2p.peerId.toString()}MessageReceived`)
  );

  if (someData.length < allData.length) {
    for (const cid of allData) {
      const find = someData.find((c) => c === cid);
      if (!find) {
        await db.add(`${nodeLibp2p.peerId.toString()}MessageReceived`, cid);
      }
    }
  } else {
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
