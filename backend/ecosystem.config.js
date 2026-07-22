module.exports = {
  apps: [
    {
      name: 'api',
      script: 'src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'workers',
      script: 'src/queues/workers/index.js',
      instances: 1,
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: 'logs/worker-error.log',
      out_file: 'logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      watch: false,
      max_memory_restart: '512M'
    }
  ]
};
