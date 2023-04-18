import { Cluster } from "./src3/cluster.js";

const cluster = new Cluster("http://localhost:9094");

// const id = await cluster.id();
// const peers = await cluster.peers();
// const version = await cluster.version();
// const delPeerId = await cluster.delPeerId(peerId);
// const cid = await cluster.add(data);
// const getPins = await cluster.getPins();
// const getPin = await cluster.getPin(cid);
// const pin = await cluster.pin(cid);
// const unpin = await cluster.unpin(cid);
// const recoverCid = await cluster.recoverCid(cid);
// const recoverCids = await cluster.recoverCids();
