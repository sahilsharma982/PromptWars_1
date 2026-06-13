import { readFileSync } from 'fs';
import pg from 'pg';

// Parse .env manually to extract DATABASE_URL
let dbUrl = '';

try {
  const envContent = readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'DATABASE_URL') {
        dbUrl = val;
      }
    }
  }
} catch (e) {
  console.error('❌ Failed to read .env file:', e.message);
  process.exit(1);
}

if (!dbUrl) {
  console.error('❌ DATABASE_URL is not set in your .env file.');
  process.exit(1);
}

console.log('📡 Connecting to Supabase database...');

// Parse the postgresql URL manually to avoid URL encoding issues with special characters in password
// Format: postgresql://username:password@host:port/database
const regex = /^postgresql?:\/\/([^:]+):(.+)@([^:]+):(\d+)\/(.+)$/;
const match = dbUrl.replace(/^"|"$/g, '').match(regex);

let clientConfig = {};
if (match) {
  const [, user, password, host, port, database] = match;
  clientConfig = {
    user,
    password,
    host,
    port: parseInt(port, 10),
    database,
    ssl: {
      rejectUnauthorized: false
    }
  };
  console.log(`Connection details: host=${host}, port=${port}, user=${user}, database=${database}`);
} else {
  console.warn('⚠️ Could not parse DATABASE_URL with regex, falling back to connectionString');
  clientConfig = {
    connectionString: dbUrl.replace(/^"|"$/g, ''),
    ssl: {
      rejectUnauthorized: false
    }
  };
}

const client = new pg.Client(clientConfig);

async function main() {
  await client.connect();
  console.log('✅ Connected successfully!');
  
  console.log('📖 Reading database/schema.sql...');
  const schema = readFileSync('database/schema.sql', 'utf8');
  
  console.log('🚀 Executing SQL schema...');
  // We can execute the whole schema string directly using client.query
  try {
    await client.query(schema);
    console.log('🎉 Schema migration applied successfully!');
  } catch (err) {
    console.error('❌ Error executing schema:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
