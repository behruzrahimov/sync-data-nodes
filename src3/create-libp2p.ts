import { tcp } from "@libp2p/tcp";
import { noise } from "@chainsafe/libp2p-noise";
import { mplex } from "@libp2p/mplex";
import { createLibp2p } from "libp2p";
import { webSockets } from "@libp2p/websockets";
import { bootstrap } from "@libp2p/bootstrap";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { pubsubPeerDiscovery } from "@libp2p/pubsub-peer-discovery";
import { kadDHT } from "@libp2p/kad-dht";

export const createNodeLibp2p = async () => {
  return await createLibp2p({
    addresses: {
      listen: [`/ip4/0.0.0.0/tcp/0`, `/ip4/0.0.0.0/tcp/0/ws`],
    },
    transports: [webSockets(), tcp()],
    streamMuxers: [mplex()],
    connectionEncryption: [noise()],
    pubsub: gossipsub({ allowPublishToZeroPeers: true }),

    peerDiscovery: [
      pubsubPeerDiscovery({
        interval: 5000,
      }),
      bootstrap({
        list: [
          "/dns4/p2p-relay-ws.itn.mobi/tcp/443/wss/p2p/12D3KooWPHEjnx8HQKL3F9gvXy6ZJ9Pt19rJihv8EGdBVW48suqY",
        ],
      }),
    ],
    dht: kadDHT({
      kBucketSize: 20,
      querySelfInterval: 300e3,
      pingTimeout: 10e3,
      clientMode: false,
    }),
  });
};
