/**
 * Sandbox-local PostgreSQL (portable Zonky binaries — no system install needed).
 *
 * Ensures a PostgreSQL 17 server is running on port 5433 with database "sms"
 * (user postgres / password postgres). Binaries live in ./.pgbin, data in
 * ./.pgdata (both gitignored). Safe to run repeatedly — exits early if the
 * server is already up.
 *
 *   bun scripts/db-server.ts
 *
 * .env then uses:
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sms"
 *
 * (Production on Vercel uses Neon — see .env.example.)
 */
import { spawnSync } from "child_process";
import { existsSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { Client } from "pg";

const ROOT = process.cwd();
const BIN = join(ROOT, ".pgbin", "bin");
const DATA = join(ROOT, ".pgdata");
const PORT = 5433;
const DB_NAME = "sms";
const URL = `postgresql://postgres:postgres@localhost:${PORT}`;

async function serverUp(): Promise<boolean> {
  const client = new Client({
    connectionString: `${URL}/postgres`,
    connectionTimeoutMillis: 2000,
  });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (await serverUp()) {
    console.log(`PostgreSQL already running on port ${PORT}.`);
  } else {
    if (!existsSync(join(DATA, "PG_VERSION"))) {
      rmSync(join(DATA), { recursive: true, force: true });
      const pwFile = join(DATA, "..", ".pg_pwfile");
      writeFileSync(pwFile, "postgres\n");
      const r = spawnSync(
        join(BIN, "initdb"),
        ["-D", DATA, "-U", "postgres", "-A", "password", "--pwfile=" + pwFile, "-E", "UTF8", "--locale=C"],
        { stdio: "inherit" }
      );
      if (r.status !== 0) throw new Error("initdb failed");
    }
    const s = spawnSync(
      join(BIN, "pg_ctl"),
      ["-D", DATA, "-o", `-p ${PORT} -k /tmp`, "-l", join(ROOT, "pgdata-server.log"), "start"],
      { stdio: "inherit" }
    );
    if (s.status !== 0) throw new Error("pg_ctl start failed");
    // wait for the server to accept connections
    for (let i = 0; i < 30; i++) {
      if (await serverUp()) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    console.log(`PostgreSQL started on port ${PORT}.`);
  }

  // ensure the "sms" database exists
  const client = new Client({ connectionString: `${URL}/postgres` });
  await client.connect();
  const res = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [DB_NAME]);
  if (res.rowCount === 0) {
    await client.query(`CREATE DATABASE ${DB_NAME}`);
    console.log(`Created database "${DB_NAME}".`);
  } else {
    console.log(`Database "${DB_NAME}" already exists.`);
  }
  await client.end();
  console.log(`Ready: ${URL}/${DB_NAME}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
