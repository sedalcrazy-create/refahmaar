'use strict';

const cluster = require('cluster');
const os = require('os');

// Use 7 workers (leave 1 core for OS)
const numWorkers = Math.min(os.cpus().length - 1, 7);

if (cluster.isMaster) {
    console.log(`
==============================================
🚀 Yalda Snake - Cluster Mode
==============================================
Master PID: ${process.pid}
CPU Cores: ${os.cpus().length}
Workers: ${numWorkers}
RAM: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB
==============================================
    `);

    // Fork workers
    for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    // Handle worker death
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('Master received SIGTERM. Shutting down workers...');
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
        process.exit(0);
    });

} else {
    // Workers run the app
    require('./app.js');
    console.log(`Worker ${process.pid} started`);
}
