import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
  useMultiFileAuthState
} from "baileys";

import { Boom } from '@hapi/boom'
import sharp from "sharp";
import { parse as parseHTML } from "node-html-parser";
import { request } from "undici";
import { randomInt } from "crypto";
import ytdl from "ytdl-core";
import FFmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
import { SQLite3Helper } from "./infrastructure/database/helpers/sqlite3.helper";
import { OnlyOwnerDecorator } from "./application/decorators/only-owner.decorator";
import { TurnOnBotInteractor } from "./application/interactor/turn-on-bot.interactor";
import { GroupsSQLite3Repository } from "./infrastructure/database/repositories/groups.sqlite3-repository";

const makeTurnOnBotInteractor = () => {
  const groupsSQLite3Repository = new GroupsSQLite3Repository();

  const turnOnBotInteractor = new TurnOnBotInteractor({
    createGroupRepository: groupsSQLite3Repository,
    findOneGroupBySuffixRepository: groupsSQLite3Repository,
  });

  return new OnlyOwnerDecorator({ interactor: turnOnBotInteractor });
};

const connectToWhatsApp = async (sqlite3Helper: SQLite3Helper) => {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect!.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        connectToWhatsApp(sqlite3Helper);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m) => {
    for (const message of m.messages) {
      const { remoteJid, fromMe, participant } = message.key;
      const { conversation, imageMessage } = message.message ?? {};

      if (!remoteJid) continue;
      if (typeof fromMe !== "boolean") continue;

      if (conversation === "!ligarbot") {
        const interactor = makeTurnOnBotInteractor();
        const result = await interactor.execute({ remoteJid, fromMe });
        await sock.sendMessage(remoteJid, result, { quoted: message });
      }

      if (fromMe && conversation === "!desligarbot") {
        const [_, suffix] = remoteJid.split('-');

        await sqlite3Helper.write({
          sql: "DELETE FROM groups WHERE suffix = ?",
          params: [suffix]
        });

        await sock.sendMessage(
          remoteJid,
          { text: "bot desligado desse grupo" },
          { quoted: message }
        );
      }

      const rows = await sqlite3Helper.read({ sql: "SELECT suffix FROM groups" });
      const groups = rows.map(({ suffix }) => suffix);

      if (!groups.some((group) => remoteJid.endsWith(group))) continue;

      {
        let msg = remoteJid;
        if (participant) msg += `(${participant})`
        msg += ": ";
        if (conversation) msg += conversation;
        else if (imageMessage) msg += "[enviou uma imagem]";
        else msg += "[enviou algo que não reconheço]";
        console.log(msg);
      }

      if (conversation === "!menu") {
        await sock.sendMessage(
          remoteJid,
          {
            text: [
              "!ligarbot",
              "!desligarbot",
              "!ping",
              "!s",
              "!pensador",
              "!mencionartodos",
              "!experimental_yt link_curto_do_video_no_youtube",
              "!experimental_ytmp3 link_curto_do_video_no_youtube",
            ].join("\n"),
          },
          { quoted: message }
        );
      }

      if (conversation === "!ping") {
        await sock.sendMessage(
          remoteJid,
          { text: "pong" },
          { quoted: message }
        );
      }

      if (conversation === "!s") {
        await sock.sendMessage(
          remoteJid,
          { text: "tem que enviar uma imagem de preferência QUADRADA com isso na legenda" },
          { quoted: message }
        );
      }

      if (imageMessage?.caption === "!s") {
        const buffer = await downloadMediaMessage(message, "buffer", {});

        const sticker = await sharp(buffer as Buffer)
          .resize(512, 512)
          .toFormat("webp")
          .toBuffer();

        const HUNDRED_KB = 100 * 1024;

        if (sticker.byteLength > HUNDRED_KB) {
          const length = sticker.byteLength / 1024;

          await sock.sendMessage(
            remoteJid,
            { text: `Figurinha excedeu o limite de 100kb tendo ${length}kb` },
            { quoted: message }
          );
        } else {
          await sock.sendMessage(
            remoteJid,
            { sticker, mimetype: "image/webp" },
            { quoted: message }
          );
        }

        if (conversation === "!mencionartodos") {
          const metadata = await sock.groupMetadata(remoteJid);

          const isAdmin = metadata.participants.some(({ id, admin }) =>
            participant === id && admin
          );

          if (isAdmin || fromMe) {
            const mentions = metadata.participants.map(({ id }) => id);

            const text = mentions
              .map((id) => `@${id.replace("@s.whatsapp.net", "")}`)
              .join(" ");

            await sock.sendMessage(
              remoteJid,
              { text, mentions },
              { quoted: message }
            );
          } else {
            await sock.sendMessage(
              remoteJid,
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
            remoteJid,
            { text: `_${phrases[i]}_` },
            { quoted: message }
          );
        }

        try {
          if (conversation && conversation.startsWith("!experimental_yt ")) {
            await sock.sendMessage(
              remoteJid,
              { text: "Atenção! Este é um comando experimental, então pode não funcionar corretamente" },
              { quoted: message }
            );

            const [_, rawurl] = conversation.split(" ");
            const url = new URL(rawurl as string);
            const id = url.pathname.substring(1);
            const link = `https://www.youtube.com/watch?v=${id}`;
            const info = await ytdl.getInfo(link);
            const stream = ytdl(link);
            const buffers: Buffer[] = [];
            for await (const data of stream) buffers.push(data);
            const video = Buffer.concat(buffers);

            await sock.sendMessage(
              remoteJid,
              { video, caption: info.videoDetails.title },
              { quoted: message }
            );
          }

          if (conversation && conversation.startsWith("!experimental_ytmp3 ")) {
            await sock.sendMessage(
              remoteJid,
              { text: "Atenção! Este é um comando experimental, então pode não funcionar corretamente" },
              { quoted: message }
            );

            const [_, rawurl] = conversation.split(" ");
            const url = new URL(rawurl as string);
            const id = url.pathname.substring(1);
            const link = `https://www.youtube.com/watch?v=${id}`;
            const stream = ytdl(link);

            const audio = await new Promise<Buffer>((resolve, reject) => {
              const target = new PassThrough();
              FFmpeg({ source: stream }).toFormat("opus").writeToStream(target);
              const buffers: Buffer[] = [];
              target.on("data", (buffer) => buffers.push(buffer));
              target.on("end", () => resolve(Buffer.concat(buffers)));
              target.on("error", (err) => reject(err));
            });

            await sock.sendMessage(remoteJid, { audio }, { quoted: message });
          }
        } catch (error) {
          await sock.sendMessage(
            remoteJid,
            { text: String(error) },
            { quoted: message }
          );
        }
      }
    }
  });
};

const main = async (): Promise<void> => {
  const sqlite3Helper = SQLite3Helper.getInstance();
  await sqlite3Helper.connect({ filename: "db.sqlite3" });

  await sqlite3Helper.write({
    sql: `
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY,
        suffix TEXT NOT NULL
      )
    `,
  });

  connectToWhatsApp(sqlite3Helper);
};

main();
