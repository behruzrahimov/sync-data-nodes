import { create, IPFS } from "ipfs-core";

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

export async function add(data: string, nodeIPFS: any): Promise<string> {
  const { cid } = await nodeIPFS.add(data);
  return cid.toString();
}

export async function get(cid: string, nodeIPFS: any) {
  const chunks = [];
  for await (const chunk of nodeIPFS.cat(cid)) {
    chunks.push(chunk);
  }
  return chunks.toString();
}
