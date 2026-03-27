import { readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const PID_FILE = join(tmpdir(), 'mafia-peerjs.pid');

export default async function globalTeardown() {
  try {
    const pid = Number(readFileSync(PID_FILE, 'utf-8').trim());
    process.kill(pid, 'SIGTERM');
    unlinkSync(PID_FILE);
  } catch {
    // Already stopped or PID file missing
  }
}
