import { tcp } from "@libp2p/tcp";
import { noise } from "@chainsafe/libp2p-noise";
import { mplex } from "@libp2p/mplex";
import { createLibp2p } from "libp2p";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { createFromJSON } from "@libp2p/peer-id-factory";

const peerIdAlice = {
  id: "12D3KooWFYyvJysHGbbYiruVY8bgjKn7sYN9axgbnMxrWVkGXABF",
  privKey:
    "CAESYCtlyHA9SQ9F0yO6frmkrFFmboLCzGt8syr0ix8QkuTcVTVAp9JiBXb2xI1lzK6Fn2mRJUxtQIuuW+3V2mu3DZZVNUCn0mIFdvbEjWXMroWfaZElTG1Ai65b7dXaa7cNlg==",
  pubKey: "CAESIFU1QKfSYgV29sSNZcyuhZ9pkSVMbUCLrlvt1dprtw2W",
};

const peerIdBob = {
  id: "12D3KooWLV3w42LqUb9MWE7oTzG7vwaFjPw9GvDqmsuDif5chTn9",
  privKey:
    "CAESYI44p8HiCHtCBhuUcetU9XdIEtWvon15a5ZLsfyssSj9nn3mt4oZI0t6wXTHOvIA0GSFWrYkdKp1338oFIambdKefea3ihkjS3rBdMc68gDQZIVatiR0qnXffygUhqZt0g==",
  pubKey: "CAESIJ595reKGSNLesF0xzryANBkhVq2JHSqdd9/KBSGpm3S",
};

const peerIdCharlie = {
  id: "12D3KooWNvSZnPi3RrhrTwEY4LuuBeB6K6facKUCJcyWG1aoDd2p",
  privKey:
    "CAESYHyCgD+3HtEHm6kzPO6fuwP+BAr/PxfJKlvAOWhc/IqAwrZjCNn0jz93sSl81cP6R6x/g+iVYmR5Wxmn4ZtzJFnCtmMI2fSPP3exKXzVw/pHrH+D6JViZHlbGafhm3MkWQ==",
  pubKey: "CAESIMK2YwjZ9I8/d7EpfNXD+kesf4PolWJkeVsZp+GbcyRZ",
};

export const AliceNode = await createLibp2p({
  peerId: await createFromJSON(peerIdAlice),
  addresses: {
    listen: ["/ip4/0.0.0.0/tcp/0"],
  },
  transports: [tcp()],
  streamMuxers: [mplex()],
  connectionEncryption: [noise()],
  pubsub: gossipsub({ allowPublishToZeroPeers: true }),
});

export const BobNode = await createLibp2p({
  peerId: await createFromJSON(peerIdBob),
  addresses: {
    listen: ["/ip4/0.0.0.0/tcp/0"],
  },
  transports: [tcp()],
  streamMuxers: [mplex()],
  connectionEncryption: [noise()],
  pubsub: gossipsub({ allowPublishToZeroPeers: true }),
});

export const CharlieNode = await createLibp2p({
  peerId: await createFromJSON(peerIdCharlie),
  addresses: {
    listen: ["/ip4/0.0.0.0/tcp/0"],
  },
  transports: [tcp()],
  streamMuxers: [mplex()],
  connectionEncryption: [noise()],
  pubsub: gossipsub({ allowPublishToZeroPeers: true }),
});
