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
const userStates = {};

function parsePatientInfo(text) {
  const data = {};
  const lines = text.split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length > 0) {
      const val = rest.join(':').trim();
      const k = key.trim().toLowerCase();
      if (k.includes('name') || k.includes('nama')) data.name = val;
      else if (k.includes('age') || k.includes('umur')) data.age = val;
      else if (k.includes('gender') || k.includes('jantina')) data.gender = val;
      else if (k.includes('location') || k.includes('lokasi')) data.location = val;
      else if (k.includes('care type') || k.includes('care') || k.includes('jenis')) data.careType = val;
      else if (k.includes('date') || k.includes('time') || k.includes('tarikh') || k.includes('masa')) data.dateTime = val;
    }
  }
  return Object.keys(data).length > 0 ? data : null;
}

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
        const sender = msg.key.remoteJid;
        if (sender === 'status@broadcast') continue; // Ignore status updates
        
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
        const locationMsg = msg.message?.locationMessage;
        
        // Emit ALL messages (both incoming and outgoing) to the UI to see both sides of conversation
        io.emit('message', msg);

        if (!msg.key.fromMe) {
          console.log('Received message:', text || 'Location/Media');
          
          if (locationMsg) {
            userStates[sender] = userStates[sender] || {};
            userStates[sender].location = {
              lat: locationMsg.degreesLatitude,
              lng: locationMsg.degreesLongitude,
              address: locationMsg.name || locationMsg.address || 'Shared via WhatsApp Location'
            };
            io.emit('patient_location_received', { sender, location: userStates[sender].location });
            await sock.sendMessage(sender, { text: "Location received. We've added it to your request." });
          } else {
            // Always try to parse the format on EVERY text message
            const parsedData = parsePatientInfo(text || '');
          
          if (parsedData) {
            // If it matches our form format, auto-fill it
            userStates[sender] = { state: 'INFO_RECEIVED', data: parsedData };
            await sock.sendMessage(sender, { text: "Thank you! Our admin will review your request shortly." });
            io.emit('patient_info_received', { sender, parsedData });
          } else {
            // It's a normal text message.
            // Disable the auto-reply bot for now as requested by user
            const ENABLE_AUTO_REPLY = true; 

            if (ENABLE_AUTO_REPLY) {
              const textLower = (text || '').toLowerCase();
              const isTrigger = /hi|hello|hey|book|request|new/i.test(textLower);
              
              if (!userStates[sender] || isTrigger) {
                userStates[sender] = { state: 'AWAITING_INFO' };
                const reply = `Selamat datang ke MyCareGivers! 🌟\nBagi membantu kami memproses permohonan penjaga anda, sila balas dan isikan maklumat berikut:\n\nNama: \nUmur: \nJantina: \nLokasi: \nJenis Penjagaan diperlukan: \nTarikh/Masa pilihan: `;
                await sock.sendMessage(sender, { text: reply });
              }
            }
          }
          }
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
