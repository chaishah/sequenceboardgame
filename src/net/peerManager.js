/**
 * PeerJS P2P WebRTC Connection Manager
 * Enables multi-device gameplay (phone/tablet/PC) without a backend server!
 */

import Peer from 'peerjs';

const PEER_PREFIX = 'seqbg-room-';

export class NetworkManager {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.connections = []; // For host managing multiple peers
    this.isHost = false;
    this.roomCode = null;
    this.callbacks = {
      onConnected: () => {},
      onDisconnected: () => {},
      onAction: () => {},
      onStateSync: () => {},
      onError: () => {}
    };
  }

  /**
   * Generates a random 4-digit room code (e.g., "7392")
   */
  generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Host creates a game room
   */
  createRoom(roomCode = this.generateRoomCode()) {
    this.isHost = true;
    this.roomCode = roomCode;
    const peerId = `${PEER_PREFIX}${roomCode}`;

    this.cleanup();

    this.peer = new Peer(peerId, {
      debug: 1
    });

    return new Promise((resolve, reject) => {
      this.peer.on('open', (id) => {
        console.log('Room created with Peer ID:', id);
        resolve(roomCode);
      });

      this.peer.on('connection', (conn) => {
        console.log('Guest connected:', conn.peer);
        this.connections.push(conn);
        this.setupConnectionEvents(conn);
        this.callbacks.onConnected({ isHost: true, peerId: conn.peer });
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS Host Error:', err);
        this.callbacks.onError(err);
        reject(err);
      });
    });
  }

  /**
   * Guest joins an existing room by code
   */
  joinRoom(roomCode) {
    this.isHost = false;
    this.roomCode = roomCode;
    const hostPeerId = `${PEER_PREFIX}${roomCode}`;

    this.cleanup();

    this.peer = new Peer({
      debug: 1
    });

    return new Promise((resolve, reject) => {
      this.peer.on('open', () => {
        this.connection = this.peer.connect(hostPeerId, { reliable: true });

        this.connection.on('open', () => {
          console.log('Connected to Host!');
          this.setupConnectionEvents(this.connection);
          this.callbacks.onConnected({ isHost: false, hostPeerId });
          resolve(roomCode);
        });

        this.connection.on('error', (err) => {
          console.error('Connection error:', err);
          this.callbacks.onError(err);
          reject(err);
        });
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS Guest Error:', err);
        this.callbacks.onError(err);
        reject(err);
      });
    });
  }

  setupConnectionEvents(conn) {
    conn.on('data', (data) => {
      if (!data || !data.type) return;

      if (data.type === 'ACTION') {
        this.callbacks.onAction(data.payload);
      } else if (data.type === 'STATE_SYNC') {
        this.callbacks.onStateSync(data.payload);
      }
    });

    conn.on('close', () => {
      console.log('Connection closed');
      this.callbacks.onDisconnected();
    });

    conn.on('error', (err) => {
      console.error('Data connection error:', err);
    });
  }

  /**
   * Broadcast state update (Host -> Guests)
   */
  broadcastState(state) {
    const msg = { type: 'STATE_SYNC', payload: state };
    if (this.isHost) {
      this.connections.forEach(conn => {
        if (conn.open) conn.send(msg);
      });
    } else if (this.connection && this.connection.open) {
      this.connection.send(msg);
    }
  }

  /**
   * Send action to Host (Guest -> Host)
   */
  sendAction(actionType, payload) {
    const msg = { type: 'ACTION', payload: { type: actionType, ...payload } };
    if (this.connection && this.connection.open) {
      this.connection.send(msg);
    } else if (this.isHost) {
      // Host handles local action directly
      this.callbacks.onAction({ type: actionType, ...payload });
    }
  }

  cleanup() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    this.connections.forEach(c => c.close());
    this.connections = [];
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
