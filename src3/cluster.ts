import fetch from "node-fetch";
import FormData from "form-data";

export class Cluster {
  readonly #url: string = "";

  constructor(url: string) {
    this.#url = url;
  }

  async id(): Promise<string> {
    const response = await fetch(`${this.#url}/id`);
    return ((await response.json()) as any).id;
  }

  async peers() {
    const response = await fetch(`${this.#url}/peers`);
    if (!response.body) throw new Error("no body");
    const peers = [];
    for await (const chunk of response.body) {
      peers.push(JSON.parse(chunk.toString()));
    }
    return peers;
  }

  async version() {
    const response = await fetch(`${this.#url}/version`);
    return await response.json();
  }

  async delPeerId(peerId: string) {
    await fetch(`${this.#url}/peers/${peerId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(`${peerId} deleted from cluster`),
    });
  }

  async add(data: string): Promise<string> {
    const formData = new FormData();
    formData.append("data", data);
    const res = await fetch(`${this.#url}/add`, {
      method: "POST",
      body: formData,
    });
    const { cid } = (await res.json()) as any;
    return cid;
  }

  // async allocations() {
  //   const response = await fetch(`${this.#url}/allocations`);
  //   return await response.json();
  // }
  //
  // async allocationsCid(cid: string) {
  //   const response = await fetch(`${this.#url}/allocations/${cid}`);
  //   return await response.json();
  // }

  async getPins() {
    const response = await fetch(`${this.#url}/pins`);
    if (!response.body) throw new Error("no body");
    const pins: any[] = [];
    const matcher = /\r?\n/;
    let buffer = "";
    const decoder = new TextDecoder("utf8");
    for await (const chunk of response.body) {
      const a =
        typeof chunk === "string"
          ? chunk
          : decoder.decode(chunk, { stream: true });

      buffer += a;
      const parts = buffer.split(matcher);
      buffer = parts.pop() || "";
      for (const part of parts) {
        pins.push(JSON.parse(part));
      }
    }
    return pins;
  }

  async getPin(cid: string) {
    const response = await fetch(`${this.#url}/pins/${cid}`);
    return response.json();
  }

  async pin(cid: string) {
    const formData = new FormData();
    formData.append("data", cid);
    const res = await fetch(`${this.#url}/add`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  }

  async unpin(cid: string) {
    const response = await fetch(`${this.#url}/pins/${cid}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: `${cid} deleted`,
    });
    if (response.status === 404) {
      return `${cid} not found`;
    }
    if (response.status === 200) {
      return `${cid} successful unpinned `;
    }
  }

  async recoverCid(cid: string) {
    const res = await fetch(`${this.#url}/pins/${cid}/recover`, {
      method: "POST",
    });
    return res.json();
  }

  async recoverCids() {
    return await fetch(`${this.#url}/pins/recover`, {
      method: "POST",
    });
  }
}
