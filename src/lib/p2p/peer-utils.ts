import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { P2PWireMessageSchema, type P2PWireMessage } from './types';

export const parseP2PMessage = (data: unknown): P2PWireMessage | null => {
  let parsed: unknown = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      return null;
    }
  }
  const result = P2PWireMessageSchema.safeParse(parsed);
  if (!result.success) {
    console.error('P2P message parsing failed:', result.error);
    return null;
  }
  return result.data;
};

export const serializeP2PMessage = (message: P2PWireMessage): string =>
  JSON.stringify(message);

const generateShortId = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const createPeer = (useShortId?: boolean, explicitId?: string): Promise<Peer> =>
  new Promise((resolve, reject) => {
    const peer = explicitId ? new Peer(explicitId) : useShortId ? new Peer(generateShortId()) : new Peer();
    peer.on('open', () => resolve(peer));
    peer.on('error', (err) => reject(err));
  });

export const destroyPeer = (peer: Peer): void => {
  const connections = peer.connections;
  if (connections) {
    Object.values(connections)
      .flat()
      .forEach((conn) => (conn as DataConnection).close());
  }
  peer.destroy();
};
