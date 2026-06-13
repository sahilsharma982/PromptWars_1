import net from 'net';
import pg from 'pg';

const host = 'aws-0-us-east-1.pooler.supabase.com';
const port = 5432;
const projectRef = 'hxxcwdixozalwzeamiwi';
const password = 'mm++fi/RR4CwKc.';

console.log(`Testing TCP socket connection to ${host}:${port}...`);

const socket = new net.Socket();
socket.setTimeout(5000);

socket.connect(port, host, () => {
  console.log('✅ TCP connection to pooler succeeded!');
  socket.destroy();
  
  console.log('\nTrying database client authentication...');
  testAuth();
});

socket.on('error', (err) => {
  console.log(`❌ TCP connection failed: ${err.message}`);
  socket.destroy();
});

socket.on('timeout', () => {
  console.log('❌ TCP connection timed out!');
  socket.destroy();
});

async function testAuth() {
  const client = new pg.Client({
    user: `postgres.${projectRef}`,
    password: password,
    host: host,
    port: port,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('🎉 Database Authentication Succeeded!');
    await client.end();
  } catch (err) {
    console.log(`❌ Database Authentication Failed: ${err.message}`);
    try { await client.end(); } catch {}
  }
}
