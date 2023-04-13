import { create } from "ipfs-http-client";

const client = create(new URL("http://127.0.0.1:5002"));

const { cid } = await client.add("hii");

console.log(cid);
