import { create, IPFS } from "ipfs-core";

export const BobIPFS: IPFS = await create({
  repo: "ipfs/ipfs1",
  EXPERIMENTAL: {
    pubsub: true,
  },
  config: {
    Bootstrap: [],
    Addresses: {
      API: "/ip4/0.0.0.0/tcp/5001",
      Swarm: [
        "/ip4/0.0.0.0/tcp/4002",
        "/ip4/0.0.0.0/udp/4002/quic",
        "/ip4/0.0.0.0/tcp/4003/ws",
      ],
    },
  },
});

export const AliceIPFS: IPFS = await create({
  repo: "ipfs/ipfs2",
  EXPERIMENTAL: {
    pubsub: true,
  },
  config: {
    Bootstrap: [],
    Addresses: {
      API: "/ip4/0.0.0.0/tcp/5002",
      Swarm: [
        "/ip4/0.0.0.0/tcp/4004",
        "/ip4/0.0.0.0/udp/4004/quic",
        "/ip4/0.0.0.0/tcp/4005/ws",
      ],
    },
  },
});

export const CharlieIPFS: IPFS = await create({
  repo: "ipfs/ipfs3",
  EXPERIMENTAL: {
    pubsub: true,
  },
  config: {
    Bootstrap: [],
    Addresses: {
      API: "/ip4/0.0.0.0/tcp/5003",
      Swarm: [
        "/ip4/0.0.0.0/tcp/4006",
        "/ip4/0.0.0.0/udp/4006/quic",
        "/ip4/0.0.0.0/tcp/4006/ws",
      ],
    },
  },
});

export const IPFSNodes: IPFS[] = [BobIPFS, AliceIPFS, CharlieIPFS];
