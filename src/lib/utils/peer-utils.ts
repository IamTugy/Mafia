// This file is kept for backward compatibility.
// New code should use src/lib/p2p/peer-utils.ts directly.
export { createPeer, destroyPeer as cleanupPeer } from '../p2p/peer-utils';
export { parseP2PMessage as parseMessage } from '../p2p/peer-utils';
