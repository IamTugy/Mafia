import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { usePeerStore } from './store/peer-store';

interface PeerMessage {
  type: string;
  id?: string;
  name?: string;
  content?: string;
  peers?: Array<{ id: string; name: string }>;
}

const generateShortId = () => {
  // Generate a random 6-digit number
  const num = Math.floor(100000 + Math.random() * 900000);
  return num.toString();
};

export const createPeer = (): Promise<{ peer: Peer; id: string }> => {
  return new Promise((resolve, reject) => {
    const id = generateShortId();
    console.log('Generated peer ID:', id);
    
    const peer = new Peer(id, {
      host: '0.peerjs.com',
      port: 443,
      secure: true,
      debug: 3,
    });

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

export const connectToPeer = (peer: Peer, hostId: string, name: string) => {
  console.log('Attempting to connect to host:', hostId);
  const connection = peer.connect(hostId);
  
  connection.on('open', () => {
    console.log('Connection opened with host');
    // Send join message to host
    connection.send({ type: 'join', id: peer.id, name });
  });

  connection.on('data', (data: unknown) => {
    const message = data as PeerMessage;
    console.log('Received message from host:', message);
    if (message.type === 'peerList') {
      console.log('Received peer list:', message.peers);
    }
  });

  connection.on('close', () => {
    console.log('Connection to host closed');
  });

  connection.on('error', (err) => {
    console.error('Connection error:', err);
  });

  return connection;
};

export const setupHost = (peer: Peer) => {
  const store = usePeerStore.getState();
  store.setHost(true);
  console.log('Setting up host with peer ID:', peer.id);

  peer.on('connection', (connection) => {
    console.log('New connection received from:', connection.peer);
    
    connection.on('open', () => {
      console.log('Connection opened with peer:', connection.peer);
    });

    connection.on('data', (data: unknown) => {
      const message = data as PeerMessage;
      console.log('Received message from peer:', message);
      
      if (message.type === 'join' && message.id && message.name) {
        console.log('Adding peer to store:', message.id, message.name);
        
        // Add peer to store
        store.addPeer({
          id: message.id,
          name: message.name,
          connection,
        });

        // Get updated peer list and broadcast to all connected peers
        const peerList = store.getPeerList();
        console.log('Broadcasting peer list:', peerList);
        
        store.connectedPeers.forEach((peer) => {
          peer.connection.send({ 
            type: 'peerList', 
            peers: peerList.map(p => ({ id: p.id, name: p.name }))
          });
        });
      } else if (message.type === 'leave') {
        console.log('Peer leaving:', message.id);
        if (message.id) {
          store.removePeer(message.id);
          
          // Broadcast updated peer list to remaining peers
          const peerList = store.getPeerList();
          store.connectedPeers.forEach((peer) => {
            peer.connection.send({ 
              type: 'peerList', 
              peers: peerList.map(p => ({ id: p.id, name: p.name }))
            });
          });
        }
      }
    });

    connection.on('close', () => {
      console.log('Connection closed with peer:', connection.peer);
      // Remove peer from store when disconnected
      store.removePeer(connection.peer);
      
      // Broadcast updated peer list to remaining peers
      const peerList = store.getPeerList();
      store.connectedPeers.forEach((peer) => {
        peer.connection.send({ 
          type: 'peerList', 
          peers: peerList.map(p => ({ id: p.id, name: p.name }))
        });
      });
    });

    connection.on('error', (err) => {
      console.error('Connection error:', err);
    });
  });

  peer.on('error', (err) => {
    console.error('Host peer error:', err);
  });
};

export const cleanupPeer = (peer: Peer) => {
  const store = usePeerStore.getState();
  
  // If this peer is connected to a host, send leave message
  if (!store.isHost) {
    store.connectedPeers.forEach((connectedPeer) => {
      connectedPeer.connection.send({ type: 'leave', id: peer.id });
    });
  }

  // Close all connections
  const connections = peer.connections;
  if (connections) {
    Object.values(connections).flat().forEach((connection: DataConnection) => {
      connection.close();
    });
  }

  // Destroy the peer
  peer.destroy();
};

export const sendMessage = (connection: DataConnection, message: string) => {
  connection.send({ type: 'message', content: message });
};

export const onMessage = (connection: DataConnection, callback: (data: PeerMessage) => void) => {
  connection.on('data', (data: unknown) => callback(data as PeerMessage));
}; 