import fetch from "node-fetch";
fetch("http://localhost:9097/pins")
  .then((response) => response.body)
  .then((res) =>
    res.on("readable", async () => {
      console.log(await res.read());
    })
  )
  .catch((err) => console.log(err));
