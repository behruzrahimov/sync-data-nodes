import { create } from "ipfs-core";
import { preSharedKey } from "libp2p/pnet";
import fse from "fs-extra";
import { pipe } from "it-pipe";
import { AppConfig } from "./config.js";
import { Redis } from "../src1/redis.js";

async function removeLockIfExist(name: string) {
  const lockfile = `${AppConfig.ipfs.repo}/${name}/repo.lock`;
  const isLockExist = await fse.pathExists(lockfile);
  if (isLockExist) {
    await fse.remove(lockfile);
  }
}

function uint8ArrayToString(buf: Uint8Array) {
  return new TextDecoder().decode(buf);
}

function uint8ArrayFromString(str: string) {
  return new TextEncoder().encode(str);
}

async function start(name: string, urlRedis: string, portIpfs: number) {
  const topic = "news-ipfs-test";
  const redis = new Redis(urlRedis, name);
  await redis.init();
  const swarmKey = await fse.readFile(AppConfig.ipfs.swarmKeyFile);
  await removeLockIfExist(name);
  const ipfs: any = await create({
    repo: `${AppConfig.ipfs.repo}/${name}`,
    EXPERIMENTAL: {
      pubsub: true,
    },
    config: {
      Bootstrap: [
        "/dns4/p2p-relay-ws.itn.mobi/tcp/443/wss/p2p/12D3KooWPHEjnx8HQKL3F9gvXy6ZJ9Pt19rJihv8EGdBVW48suqY",
      ],
      Addresses: {
        Swarm: [
          `/ip4/0.0.0.0/tcp/${portIpfs}`,
          `/ip4/0.0.0.0/tcp/${portIpfs + 1}/ws`,
        ],
      },
    },
    Discovery: {
      MDNS: {
        Enabled: true,
      },
    },
    libp2p: {
      modules: {
        connProtector: preSharedKey({
          psk: swarmKey,
        }),
      },
    },
  });

  await ipfs.pubsub.subscribe(topic, async (msg: any) => {
    const ipfsId = await ipfs.id();
    if (msg.from === ipfsId.id) return;
    const receivedDid = uint8ArrayToString(msg.data);
    console.log(receivedDid);
  });

  await ipfs.pubsub.publish(
    topic,
    uint8ArrayFromString("hello my name is" + name)
  );

  ipfs.libp2p.connectionManager.addEventListener("peer:connect", (evt: any) => {
    const connection = evt.detail;
    // console.log("received dial to me from:", connection.remotePeer.toString());
  });

  await ipfs.libp2p.handle("/echo/1.0.0", ({ stream }: any) =>
    pipe(stream.source, stream.sink)
  );

  console.log("Listener ready, listening on:");
  ipfs.libp2p.getMultiaddrs().forEach((ma: any) => {
    console.log(ma.toString());
  });
  console.log(ipfs.pubsub.getSubscribers);
}

await start("Alice", "redis://localhost:6379", 4004);
await start("Bob", "redis://localhost:6379", 4007);
