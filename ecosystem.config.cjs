module.exports = {
  apps: [
    {
      name: "skytype",
      script: "server.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
        TRUST_PROXY: "1",
      },
    },
  ],
};
