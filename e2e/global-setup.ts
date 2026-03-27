import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const PID_FILE = join(tmpdir(), 'mafia-peerjs.pid');

export default async function globalSetup() {
  const child = spawn(
    'node',
    ['-e', 'require("peer").PeerServer({ port: 9000, path: "/myapp" })'],
    { detached: true, stdio: 'ignore' }
  );
  child.unref();
  writeFileSync(PID_FILE, String(child.pid));

  // Wait for the server to be ready
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch('http://localhost:9000/myapp/');
      if (res.ok) return;
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
}
