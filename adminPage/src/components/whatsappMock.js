// A stand-in for the WhatsApp service (whatsapp-service/index.js) so the
// intake inbox can be demoed without a phone, a QR scan or Baileys running.
//
// It speaks the same socket protocol the real service does — the same event
// names and payload shapes — so Chatbox.jsx does not know the difference.
// Switch back to the real connection with VITE_WHATSAPP_MODE=live in .env.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** An ISO time `ago` milliseconds before now. */
const ago = (ms) => new Date(Date.now() - ms).toISOString();

// Sent by the bot when someone first messages — mirrors the service's template.
const WELCOME = 'Selamat datang ke MyCareGivers! 🌟\nBagi membantu kami memproses permohonan penjaga anda, sila balas dan isikan maklumat berikut:\n\nNama: \nUmur: \nJantina: \nLokasi: \nJenis Penjagaan diperlukan: \nTarikh/Masa pilihan: ';
const THANKS = 'Thank you! Our admin will review your request shortly.';

/**
 * The seeded inbox. `ago` on each message is how long before "now" it was
 * sent, so the demo always reads as recent. `parsed` is what the service would
 * have filled in from the patient's reply; `location` a shared pin.
 */
const CONVERSATIONS = [
  {
    jid: '60123348812@s.whatsapp.net', name: 'Zainab Hamid', phone: '60123348812',
    messages: [
      { in: true, ago: 52 * MINUTE, text: 'Assalamualaikum, saya nak tanya pasal penjaga untuk mak saya' },
      { in: false, ago: 52 * MINUTE, text: WELCOME },
      { in: true, ago: 41 * MINUTE, text: 'Nama: Hamidah binti Yusof\nUmur: 78\nJantina: Perempuan\nLokasi: Taman Melawati, Ampang\nJenis Penjagaan diperlukan: Elderly care\nTarikh/Masa pilihan: Isnin depan, 9 pagi' },
      { in: false, ago: 41 * MINUTE, text: THANKS },
      { in: true, ago: 39 * MINUTE, text: 'Mak saya guna kerusi roda ya, rumah ada tangga sikit kat depan' },
    ],
    parsed: { name: 'Hamidah binti Yusof', age: '78', gender: 'Perempuan', location: 'Taman Melawati, Ampang', careType: 'Elderly care', dateTime: 'Isnin depan, 9 pagi' },
  },
  {
    jid: '60197720415@s.whatsapp.net', name: 'Ravi Kumar', phone: '60197720415',
    messages: [
      { in: true, ago: 3 * HOUR, text: 'Hi, my father has a physio session booked with Siti on Thursday 2pm.' },
      { in: true, ago: 3 * HOUR - MINUTE, text: 'Can we move it to Friday same time? He has a hospital appointment on Thursday.' },
      { in: false, ago: 2 * HOUR + 40 * MINUTE, text: 'Hi Ravi, noted. Let me check Siti’s availability for Friday 2pm and get back to you shortly.' },
      { in: true, ago: 2 * HOUR + 38 * MINUTE, text: 'Thank you 🙏' },
    ],
  },
  {
    jid: '83997044531227@lid', name: 'Farah Nadia', phone: '',
    messages: [
      { in: true, ago: 5 * HOUR, text: 'Hello, saya perlukan penjaga untuk ayah lepas pembedahan lutut' },
      { in: false, ago: 5 * HOUR, text: WELCOME },
      { in: true, ago: 4 * HOUR + 30 * MINUTE, text: 'Nama: Abdul Rahman bin Salleh\nUmur: 66\nJantina: Lelaki\nLokasi: Seksyen 7, Shah Alam\nJenis Penjagaan diperlukan: Post-operative care\nTarikh/Masa pilihan: 5/10/2026, 10am' },
      { in: false, ago: 4 * HOUR + 30 * MINUTE, text: THANKS },
    ],
    // A "…@lid" chat: WhatsApp has not shared the number, so the inbox warns before a request is filed.
    parsed: { name: 'Abdul Rahman bin Salleh', age: '66', gender: 'Lelaki', location: 'Seksyen 7, Shah Alam', careType: 'Post-operative care', dateTime: '5/10/2026, 10am' },
  },
  {
    jid: '60162281907@s.whatsapp.net', name: 'Kevin Tan', phone: '60162281907',
    messages: [
      { in: true, ago: DAY + 2 * HOUR, text: 'Hi, how much is it for a caregiver for my grandma? Around 3 hours a day, weekdays.' },
      { in: false, ago: DAY + HOUR + 45 * MINUTE, text: 'Hi Kevin! Elderly care is RM35/hour, so a 3-hour visit is RM105. Weekday packages are available too. Would you like to book?' },
      { in: true, ago: DAY + HOUR + 30 * MINUTE, text: 'Ok noted, let me discuss with my parents first. Will get back to you.' },
    ],
  },
  {
    jid: '60134456720@s.whatsapp.net', name: 'Siti Hajar', phone: '60134456720',
    messages: [
      { in: true, ago: 2 * DAY + 3 * HOUR, text: 'Hi' },
      { in: false, ago: 2 * DAY + 3 * HOUR, text: WELCOME },
      { in: true, ago: 2 * DAY + 2 * HOUR, text: 'Nama: Lee Ah Kow\nUmur: 81\nJantina: Lelaki\nLokasi: Kepong Baru\nJenis Penjagaan diperlukan: Dementia care\nTarikh/Masa pilihan: Every Tue & Thu morning' },
      { in: false, ago: 2 * DAY + 2 * HOUR, text: THANKS },
      { in: true, ago: 2 * DAY + 2 * HOUR - 2 * MINUTE, text: '📍 Location: 40, Jalan Kepong Baru, 52100 Kepong' },
      { in: false, ago: 2 * DAY + 2 * HOUR - 2 * MINUTE, text: 'Location received. We’ve added it to your request.' },
    ],
    parsed: { name: 'Lee Ah Kow', age: '81', gender: 'Lelaki', location: 'Kepong Baru', careType: 'Dementia care', dateTime: 'Every Tue & Thu morning' },
    location: { address: '40, Jalan Kepong Baru, 52100 Kepong', lat: 3.2085, lng: 101.6402 },
  },
  {
    jid: '60178893321@s.whatsapp.net', name: 'Michelle Lim', phone: '60178893321',
    messages: [
      { in: true, ago: 3 * DAY + 5 * HOUR, text: 'Just want to say thank you to Sarah for taking care of my mum today. She was very patient with her 😊' },
      { in: false, ago: 3 * DAY + 4 * HOUR, text: 'Thank you Michelle, we’ll pass this on to Sarah! Glad your mum is doing well.' },
    ],
  },
  {
    // No WhatsApp display name: the inbox falls back to showing the number.
    jid: '60112093874@s.whatsapp.net', name: '', phone: '60112093874',
    messages: [
      { in: true, ago: 6 * MINUTE, text: 'Hello, is this MyCareGivers? Do you provide wound care at home?' },
    ],
  },
];

// Canned replies from the patient after the admin sends something, in turn.
const REPLIES = ['Ok, thank you!', 'Baik, terima kasih 🙏', 'Noted 👍', 'Alright, I’ll wait for your update.'];

// A new request that arrives while the inbox is open, to show live intake.
const LATE_ARRIVAL = {
  jid: '60196642018@s.whatsapp.net', name: 'Aminah Daud', phone: '60196642018', delay: 40 * 1000,
  text: 'Nama: Daud bin Osman\nUmur: 72\nJantina: Lelaki\nLokasi: Wangsa Maju, Setapak\nJenis Penjagaan diperlukan: Medication management\nTarikh/Masa pilihan: Esok, 8 pagi',
  parsed: { name: 'Daud bin Osman', age: '72', gender: 'Lelaki', location: 'Wangsa Maju, Setapak', careType: 'Medication management', dateTime: 'Esok, 8 pagi' },
};

let messageCount = 0;

/** A message in the shape Baileys delivers (and the service forwards), plus `at`. */
function toWire({ jid, name, phone }, { in: incoming, text, at }) {
  messageCount += 1;
  return {
    key: { remoteJid: jid, fromMe: !incoming, id: `MOCK${messageCount}` },
    message: { conversation: text },
    pushName: incoming ? name : 'MyCareGivers',
    contactName: name || null,
    contactPhone: phone || '',
    // Real messages are stamped on arrival; seeded history carries its own time.
    at,
  };
}

/**
 * A socket.io-like object: `on`, `off` and `emit`, nothing more. The inbox
 * is seeded shortly after it subscribes, as the real service replays state to
 * a client that connects.
 */
export function createMockWhatsApp() {
  const handlers = {};
  const timers = new Set();
  let booting = null;
  let replyIndex = 0;

  const fire = (event, payload) => (handlers[event] || []).forEach((handler) => handler(payload));
  const later = (fn, ms) => {
    const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms);
    timers.add(timer);
  };

  const seed = () => {
    booting = null;
    fire('connection_state', 'connected');
    CONVERSATIONS.forEach((chat) => {
      chat.messages.forEach((message) => fire('message', toWire(chat, { ...message, at: ago(message.ago) })));
      if (chat.parsed) fire('patient_info_received', { sender: chat.jid, parsedData: chat.parsed });
      if (chat.location) fire('patient_location_received', { sender: chat.jid, location: chat.location });
    });

    later(() => {
      fire('message', toWire(LATE_ARRIVAL, { in: true, text: LATE_ARRIVAL.text, at: new Date().toISOString() }));
      fire('message', toWire(LATE_ARRIVAL, { in: false, text: THANKS, at: new Date().toISOString() }));
      fire('patient_info_received', { sender: LATE_ARRIVAL.jid, parsedData: LATE_ARRIVAL.parsed });
    }, LATE_ARRIVAL.delay);
  };

  return {
    on(event, handler) {
      (handlers[event] = handlers[event] || []).push(handler);
      // Re-subscribing (React StrictMode runs effects twice) must not seed twice.
      if (event === 'connection_state' && !booting) {
        booting = setTimeout(seed, 400);
        fire('connection_state', 'connecting');
      }
    },

    off(event) {
      delete handlers[event];
      if (event === 'connection_state') timers.forEach(clearTimeout);
    },

    emit(event, data) {
      if (event !== 'send_message') return;
      const { to, text, clientId } = data || {};
      const chat = CONVERSATIONS.find((item) => item.jid === to) || (LATE_ARRIVAL.jid === to ? LATE_ARRIVAL : { jid: to, name: '', phone: String(to).split('@')[0] });

      later(() => fire('message_sent', { success: true, to, clientId }), 500);

      // The admin sent the intake form: the patient fills it in.
      if (/nama\s*:/i.test(text || '')) {
        later(() => {
          const form = 'Nama: Rosnah binti Ali\nUmur: 70\nJantina: Perempuan\nLokasi: Bangsar\nJenis Penjagaan diperlukan: Wound care\nTarikh/Masa pilihan: Rabu, 3 petang';
          fire('message', toWire(chat, { in: true, text: form, at: new Date().toISOString() }));
          fire('patient_info_received', { sender: to, parsedData: { name: 'Rosnah binti Ali', age: '70', gender: 'Perempuan', location: 'Bangsar', careType: 'Wound care', dateTime: 'Rabu, 3 petang' } });
        }, 4000);
        return;
      }

      const reply = REPLIES[replyIndex % REPLIES.length];
      replyIndex += 1;
      later(() => fire('message', toWire(chat, { in: true, text: reply, at: new Date().toISOString() })), 2500);
    },
  };
}
