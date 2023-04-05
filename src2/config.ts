export const AppConfig = {
  // app: {
  //   domain: process.env.DOMAIN || "http://localhost:3005",
  //   port: process.env.PORT || "3005",
  // },
  ipfs: {
    repo: process.env.IPFS_REPO || "./ipfs",
    apiAddress: process.env.IPFS_API_ADDRESS,
    swarmKeyFile: process.env.SWARM_KEY_FILE || "./swarm/swarm.key",
  },
};
