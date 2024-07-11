import makeWASocket, { DisconnectReason, useMultiFileAuthState, proto } from '@whiskeysocket/baileys';
import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ownerNumber = '628xxxxxxxxxx'; // Ganti dengan nomor WhatsApp Anda

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const sock = makeWASocket({
    auth: state
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Koneksi terputus, apakah reconnect?', shouldReconnect, lastDisconnect?.error);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('Koneksi terbuka!');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Fitur .save
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.key.fromMe && msg.message?.conversation === '.save') {
      await sock.sendMessage(ownerNumber, {
        document: { url: './auth_info_baileys/creds.json' },
        mimetype: 'application/json',
        fileName: 'creds.json'
      });
    }
  });

  // Pilihan metode autentikasi
  rl.question('Pilih metode autentikasi (1: QR code, 2: Pairing code): ', async (choice) => {
    if (choice === '1') {
      console.log('Silakan scan QR code di terminal...');
    } else if (choice === '2') {
      const code = await sock.requestPairingCode();
      console.log('Masukkan pairing code ini di WhatsApp:', code);
    } else {
      console.log('Pilihan tidak valid.');
      rl.close();
      return;
    }
    rl.close();
  });
}

connectToWhatsApp();