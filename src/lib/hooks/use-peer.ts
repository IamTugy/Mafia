import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { 
  PeerMessageSchema, 
  type PeerMessage,
  type MessageContent 
} from '@/lib/store/types';

// Zod-based serialization function
export const serializeData = (data: unknown): unknown => {
  const result = PeerMessageSchema.safeParse(data);
  if (!result.success) {
    console.error('Data serialization failed:', result.error);
    throw new Error('Invalid data format');
  }
  return result.data;
};

// Validate and parse received messages
export const parseMessage = (data: unknown): PeerMessage | null => {
  const result = PeerMessageSchema.safeParse(data);
  if (!result.success) {
    console.error('Message parsing failed:', result.error);
    return null;
  }
  return result.data;
};

// Re-export types for convenience
export type { PeerMessage, MessageContent };

interface UsePeerReturn {
  createPeer: (useShortId?: boolean) => Promise<{ peer: Peer; id: string }>;
  cleanupPeer: (peer: Peer) => void;
}

const generateShortId = (): string => {
  const num = Math.floor(100000 + Math.random() * 900000);
  return num.toString();
};

export function usePeer(hostId?: string): UsePeerReturn {
  const createPeer = (useShortId?: boolean): Promise<{ peer: Peer; id: string }> => {
    return new Promise((resolve, reject) => {
      const peer = useShortId ? new Peer(generateShortId()) : new Peer();

      console.log('Generated peer ID:', peer.id);

      peer.on('open', (peerId: string) => {
        console.log('Peer opened with id:', peerId);
        resolve({ peer, id: peerId });
      });

      peer.on('error', (err) => {
        console.error('Peer creation error:', err);
        reject(err);
      });
    });
  };

  const cleanupPeer = (peer: Peer): void => {
    if (hostId === peer.id) {
      // If host is leaving, notify all peers
      console.log('Host leaving, notifying peers');
    } else {
      // If regular peer is leaving, just notify the host
      console.log('Client leaving');
    }

    const connections = peer.connections;
    if (connections) {
      Object.values(connections)
        .flat()
        .forEach((connection: DataConnection) => {
          connection.close();
        });
    }

    peer.destroy();
  };

  return {
    createPeer,
    cleanupPeer,
  };
}
