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

/**
 * The display name WhatsApp reports for each contact, keyed by JID.
 *
 * `pushName` is the name the person set on their own WhatsApp, and it only
 * arrives on *incoming* messages — on our own replies it is our name, so it
 * must never be recorded for the contact. Kept here (not just in the browser)
 * so a client that reconnects or opens in a second tab still shows real names
 * instead of falling back to bare phone numbers.
 */
const contactNames = {};

/**
 * Real phone numbers, keyed by the JID the conversation is filed under.
 *
 * WhatsApp increasingly addresses chats by **LID** ("…@lid") — a per-account
 * privacy identifier whose digits are NOT a phone number (they are longer, and
 * carry no country code). Reading digits straight off the JID therefore showed
 * something like "83997044531227" for an ordinary Malaysian mobile. The number
 * is resolved properly below and recorded here, because it is copied onto the
 * patient request and has to be dialable.
 */
const contactPhones = {};

/** Digits of a JID, whatever its domain. Only a phone JID yields a real number. */
const userOf = (jid) => String(jid || '').split('@')[0].split(':')[0];

/** A JID that addresses a real phone number (not a LID, group or broadcast). */
const isPhoneJid = (jid) => /@(s\.whatsapp\.net|c\.us)$/.test(String(jid || ''));

/** E.164-ish: a plausible subscriber number, not a 14+ digit LID. */
const looksLikePhone = (digits) => /^\d{7,15}$/.test(String(digits || ''));

/**
 * The contact's phone number for a conversation, or '' when it is not known.
 * Prefers, in order: a number already resolved, the phone JID itself, and the
 * `remoteJidAlt` that Baileys sets to the phone JID when `remoteJid` is a LID.
 */
function phoneFor(jid, msg) {
  if (contactPhones[jid]) return contactPhones[jid];

  const candidates = [];
  if (isPhoneJid(jid)) candidates.push(userOf(jid));
  // Baileys fills these with the phone-number JID when addressing by LID.
  const key = msg?.key || {};
  if (isPhoneJid(key.remoteJidAlt)) candidates.push(userOf(key.remoteJidAlt));
  if (isPhoneJid(key.participantAlt)) candidates.push(userOf(key.participantAlt));
  if (isPhoneJid(key.participant)) candidates.push(userOf(key.participant));

  const found = candidates.find(looksLikePhone);
  if (found) {
    contactPhones[jid] = found;
    return found;
  }
  return '';
}

/**
 * Asks Baileys' LID store for the phone number behind a LID. The mapping
 * arrives asynchronously, so this runs after the message is emitted and the
 * number is sent to clients as a follow-up once it lands.
 */
async function resolvePhoneForLid(jid) {
  if (contactPhones[jid] || !String(jid).endsWith('@lid')) return null;
  try {
    const pn = await sock?.signalRepository?.lidMapping?.getPNForLID?.(jid);
    const digits = userOf(pn);
    if (looksLikePhone(digits)) {
      contactPhones[jid] = digits;
      return digits;
    }
  } catch (err) {
    console.warn('Could not resolve phone number for', jid, err?.message || err);
  }
  return null;
}

/**
 * Turns whatever the UI sends into a JID Baileys accepts.
 *
 * Anything that already carries a domain (@s.whatsapp.net, @g.us for groups,
 * @lid, @broadcast) is left alone — appending a second domain produced JIDs
 * like "…@g.us@s.whatsapp.net", which WhatsApp rejects, so the message was
 * never delivered. A bare number is normalised to a user JID.
 */
function toJid(to) {
  const raw = String(to || '').trim();
  if (!raw) return null;
  if (raw.includes('@')) return raw;
  const digits = raw.replace(/\D/g, '');
  return digits ? `${digits}@s.whatsapp.net` : null;
}

function rememberContact(msg) {
  const jid = msg?.key?.remoteJid;
  if (!jid || msg.key.fromMe) return; // our own name, not theirs
  const name = msg.pushName || msg.verifiedBizName;
  if (name && name !== userOf(jid)) contactNames[jid] = name;
}

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

        // Emit ALL messages (both incoming and outgoing) to the UI to see both sides of conversation.
        // `contactName` is resolved here so every client agrees on the name,
        // including one that connected after the contact last messaged.
        rememberContact(msg);
        io.emit('message', { ...msg, contactName: contactNames[sender] || null });

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
              const ENABLE_AUTO_REPLY = false;

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
  // Names learned before this client connected, so it does not start out
  // showing phone numbers for contacts the service already knows.
  socket.emit('contacts', contactNames);
  if (qrCodeData && connectionState !== 'connected') {
    socket.emit('qr', qrCodeData);
  }

  socket.on('send_message', async (data) => {
    const { to, text, clientId } = data || {};
    try {
      const id = toJid(to);
      if (!id) {
        socket.emit('message_sent', { success: false, to, clientId, error: 'No recipient number.' });
        return;
      }
      if (!sock || connectionState !== 'connected') {
        socket.emit('message_sent', { success: false, to, clientId, error: 'WhatsApp is not connected. Scan the QR code in this terminal first.' });
        return;
      }
      if (!String(text || '').trim()) {
        socket.emit('message_sent', { success: false, to, clientId, error: 'Message is empty.' });
        return;
      }

      await sock.sendMessage(id, { text });
      console.log(`Sent message to ${id}`);
      socket.emit('message_sent', { success: true, to, clientId });
    } catch (err) {
      console.error('send_message failed:', err);
      socket.emit('message_sent', { success: false, to, clientId, error: err.message || 'Could not send the message.' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, () => {
  console.log(`WhatsApp Service listening on port ${PORT}`);
});

// A second copy of the service holds the port and silently serves stale code,
// so say plainly what happened instead of dying on an unhandled error.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use — another WhatsApp service is still running.`);
    console.error('Stop that one first (Ctrl+C in its terminal), then start this again.\n');
    process.exit(1);
  }
  throw err;
});
