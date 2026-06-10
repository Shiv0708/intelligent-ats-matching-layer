import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import net from 'net';
import tls from 'tls';
import dns from 'dns/promises';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const hostMatch = url.match(/@([^/]+)\//);
const host = hostMatch?.[1]?.split(':')[0];
console.log('DATABASE_URL host:', host);

try {
  const addrs = await dns.lookup(host, { all: true });
  console.log('DNS:', addrs.map((a) => `${a.address} (${a.family})`).join(', '));
} catch (e) {
  console.error('DNS failed:', e.message);
}

function tcpConnect(hostname, port, ms = 8000) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: hostname, port, family: 4 }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(ms);
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

const port = 5432;
const ok = await tcpConnect(host, port);
console.log(`TCP IPv4 ${host}:${port} =>`, ok ? 'OK' : 'FAIL');

function tlsProbe(hostname) {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: hostname, port: 5432, servername: hostname, rejectUnauthorized: true },
      () => {
        socket.end();
        resolve('OK');
      }
    );
    socket.setTimeout(8000);
    socket.on('timeout', () => {
      socket.destroy();
      resolve('TIMEOUT');
    });
    socket.on('error', (e) => resolve(`ERR: ${e.message}`));
  });
}

console.log('TLS probe:', await tlsProbe(host));

const prisma = new PrismaClient();
try {
  const rows = await prisma.$queryRaw`SELECT 1 as ok`;
  console.log('Prisma query:', rows);
  const candidates = await prisma.candidate.count();
  const jobs = await prisma.jobDescription.count();
  console.log(`Data: ${candidates} candidates, ${jobs} jobs`);
} catch (e) {
  console.error('Prisma error:', e.message);
} finally {
  await prisma.$disconnect();
}
