import { create } from "ipfs-http-client";

const client = create(new URL("http://127.0.0.1:5001"));

const { cid } = await client.add("Hello world!");
