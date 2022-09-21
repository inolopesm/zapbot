import baileys, {
  DisconnectReason,
  downloadMediaMessage,
  useMultiFileAuthState
} from "baileys";

import sharp from "sharp";
import sqlite3 from "sqlite3";
import { promisify } from "util";
import { parse as parseHTML } from "node-html-parser";
import { request } from "undici";
import { randomInt } from "crypto";

const { default: makeWASocket } = baileys;
const db = new sqlite3.Database("db.sqlite3");

db.run = promisify(db.run);
db.all = promisify(db.all);

await db.run(`
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY,
    suffix TEXT NOT NULL
  )
`);

async function connectToWhatsApp () {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const sock = makeWASocket({
    // can provide additional config here
    printQRInTerminal: true,
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log(
        `connection closed due to ${lastDisconnect.error}, reconnecting ${shouldReconnect}`
      );

      // reconnect if not logged out
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if(connection === "open") {
      console.log("opened connection");
    }
  })

  sock.ev.on("messages.upsert", async (m) => {
    for (const message of m.messages) {
      const { remoteJid, participant, fromMe } = message.key;

      const {
        conversation,
        imageMessage,
        extendedTextMessage
      } = message.message ?? {};

      if (fromMe) {
        if (conversation === "!ligarbot") {
          const [_, suffix] = remoteJid.split('-');

          const [exists] = await db.all(
            "SELECT * FROM groups WHERE suffix = ?",
            suffix
          );

          if (!exists) {
            await db.run(`INSERT INTO groups (suffix) VALUES (?)`, suffix);

            await sock.sendMessage(
              remoteJid,
              { text: "bot ligado nesse grupo" },
              { quoted: message }
            );
          } else {
            await sock.sendMessage(
              remoteJid,
              { text: "bot já está ligado nesse grupo" },
              { quoted: message }
            );
          }
        }

        if (conversation === "!desligarbot") {
          const [_, suffix] = remoteJid.split('-');

          await db.run(`DELETE FROM groups WHERE suffix = ?`, suffix);

          await sock.sendMessage(
            remoteJid,
            { text: "bot desligado desse grupo" },
            { quoted: message }
          );
        }
      }

      const rows = await db.all("SELECT suffix FROM groups");
      const groups = rows.map(({ suffix }) => suffix);

      // libera o uso apenas para alguns grupos
      if (!groups.some((group) => remoteJid.endsWith(group))) {
        continue;
      }

      {
        let msg = remoteJid;
        if (participant) msg += `(${participant})`
        msg += ": ";
        if (conversation) msg += conversation;
        else if (imageMessage) msg += "[enviou uma imagem]";
        else msg += "[enviou algo que não reconheço]";
        console.log(msg);
      }

      if (conversation === "!ping") {
        await sock.sendMessage(
          message.key.remoteJid,
          { text: "pong" },
          { quoted: message }
        );
      }

      if (conversation === "!s") {
        await sock.sendMessage(
          message.key.remoteJid,
          { text: "tem que enviar uma imagem de preferência QUADRADA com isso na legenda" },
          { quoted: message }
        );
      }

      if (imageMessage?.caption === "!s") {
        const buffer = await downloadMediaMessage(message, "buffer", {});

        const sticker = await sharp(buffer)
          .resize(512, 512)
          .toFormat("webp")
          .toBuffer();

        const HUNDRED_KB = 100 * 1024;

        if (sticker.byteLength > HUNDRED_KB) {
          const length = sticker.byteLength / 1024;

          await sock.sendMessage(
            message.key.remoteJid,
            { text: `Figurinha excedeu o limite de 100kb tendo ${length}kb` },
            { quoted: message }
          );
        } else {
          await sock.sendMessage(
            message.key.remoteJid,
            { sticker, mimetype: "image/webp" },
            { quoted: message }
          );
        }
      }

      if (conversation === "!mencionartodos") {
        const metadata = await sock.groupMetadata(remoteJid);

        const isAdmin = metadata.participants.some(({ id, admin }) =>
          participant === id && admin
        );

        if (isAdmin) {
          const mentions = metadata.participants.map(({ id }) => id);

          const text = mentions
            .map((id) => `@${id.replace("@s.whatsapp.net", "")}`)
            .join(" ");

          await sock.sendMessage(
            message.key.remoteJid,
            { text, mentions },
            { quoted: message }
          );
        } else {
          await sock.sendMessage(
            message.key.remoteJid,
            { text: "tu não é admin rapá" },
            { quoted: message }
          );
        }
      }

      if (conversation === "!pensador") {
        const response = await request("https://www.pensador.com/recentes/");
        const data = await response.body.text();
        const $root = parseHTML(data);

        const phrases = $root
          .querySelectorAll(".frase.fr")
          .map(($element) => $element.innerHTML)
          .map((phrase) => phrase.replace(/&quot;/g, '"'));

        const i = randomInt(0, phrases.length)

        await sock.sendMessage(
          message.key.remoteJid,
          { text: `_${phrases[i]}_` },
          { quoted: message }
        );
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// run in main file
connectToWhatsApp();
