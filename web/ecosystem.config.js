module.exports = {
  apps: [
    {
      name: 'app',
      script: 'npm',
      args: 'run start:prod',
      time: true,
      exec_mode: 'fork', // explicitly declare mode to avoid fallback
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production', // Set environment to production
      },
    },
  ],
};
