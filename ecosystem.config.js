module.exports = {
  apps: [
    {
      name: 'comunica-adv7',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
      },
    },
  ],
} 