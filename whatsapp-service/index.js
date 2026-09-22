import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { Boom } from '@hapi/boom';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

let sock = null;
let qrCodeData = null;
let connectionState = 'connecting';

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      qrCodeData = qr;
      qrcode.generate(qr, { small: true });
      io.emit('qr', qr);
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
      connectionState = 'disconnected';
      io.emit('connection_state', connectionState);
      
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('opened connection');
      qrCodeData = null;
      connectionState = 'connected';
      io.emit('connection_state', connectionState);
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    if (m.type === 'notify') {
      for (const msg of m.messages) {
        if (!msg.key.fromMe) {
          console.log('Received message:', msg.message?.conversation || msg.message?.extendedTextMessage?.text);
          io.emit('message', msg);
        }
      }
    }
  });
}

connectToWhatsApp();

io.on('connection', (socket) => {
  console.log('Client connected to socket');
  socket.emit('connection_state', connectionState);
  if (qrCodeData && connectionState !== 'connected') {
    socket.emit('qr', qrCodeData);
  }

  socket.on('send_message', async (data) => {
    try {
      const { to, text } = data;
      if (sock && connectionState === 'connected') {
        const id = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
        await sock.sendMessage(id, { text });
        console.log(`Sent message to ${id}`);
        socket.emit('message_sent', { success: true, to });
      } else {
        socket.emit('message_sent', { success: false, error: 'WhatsApp not connected' });
      }
    } catch (err) {
      console.error(err);
      socket.emit('message_sent', { success: false, error: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`WhatsApp Service listening on port ${PORT}`);
});
