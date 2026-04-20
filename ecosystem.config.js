// ecosystem.config.js
// Configuración PM2 optimizada para VPS con 12 CPUs AMD EPYC
//
// Estrategia:
// - 4 instancias en cluster mode
// - Mientras una instancia espera respuesta de OpenAI (bloqueada en I/O),
//   las otras 3 siguen procesando peticiones del resto de usuarios
// - Se reservan 8 CPUs para OS, Nginx y headroom

module.exports = {
  apps: [
    {
      name: 'petfhans',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/petfhans',

      // ── Cluster mode: 4 procesos ──────────────────────────────────────
      instances: 4,
      exec_mode: 'cluster',

      // ── Entorno ───────────────────────────────────────────────────────
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // ── Estabilidad ───────────────────────────────────────────────────
      autorestart: true,
      watch: false,

      // Reiniciar instancia si supera 800MB de RAM
      max_memory_restart: '800M',

      // Zero-downtime: levantar nueva instancia antes de matar la anterior
      wait_ready: true,
      listen_timeout: 15000,
      kill_timeout: 5000,

      // Evitar reinicio en bucle si hay error de arranque
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '30s',

      // ── Logs ──────────────────────────────────────────────────────────
      log_file:        '/var/log/pm2/petfhans-combined.log',
      out_file:        '/var/log/pm2/petfhans-out.log',
      error_file:      '/var/log/pm2/petfhans-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      log_type:        'json',
    },
  ],
}
