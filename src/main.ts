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
import { SQLite3Helper } from "./infrastructure/database/helpers";
import { OnlyOwnerDecorator } from "./application/decorators";
import { MentionAllInteractor, TurnOffBotInteractor, TurnOnBotInteractor } from "./application/interactor";
import { GroupsSQLite3Repository } from "./infrastructure/database/repositories";
import { Interactor } from "./application/protocols";
import { GroupParticipantsSQLite3Repository } from "./infrastructure/database/repositories/group-participants.sqlite3-repository";

const makeTurnOnBotInteractor = () => {
  const groupsSQLite3Repository = new GroupsSQLite3Repository();

  const turnOnBotInteractor = new TurnOnBotInteractor({
    createGroupRepository: groupsSQLite3Repository,
    findOneGroupBySuffixRepository: groupsSQLite3Repository,
  });

  return new OnlyOwnerDecorator({ interactor: turnOnBotInteractor });
};

const makeTurnOffBotInteractor = () => {
  const groupsSQLite3Repository = new GroupsSQLite3Repository();

  const turnOffBotInteractor = new TurnOffBotInteractor({
    removeGroupBySuffixRepository: groupsSQLite3Repository,
  });

  return new OnlyOwnerDecorator({ interactor: turnOffBotInteractor });
};

type MakeMentionAllInteractorParams = {
  waSocket: ReturnType<typeof makeWASocket>;
};

const makeMentionAllInteractor = ({ waSocket }: MakeMentionAllInteractorParams) => {
  const groupParticipantsSQLite3Repository = new GroupParticipantsSQLite3Repository({ waSocket });

  return new MentionAllInteractor({
    findAllGroupParticipantsByRemoteJidRepository: groupParticipantsSQLite3Repository,
  });
};

const connectToWhatsApp = async (sqlite3Helper: SQLite3Helper) => {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const waSocket = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });

  waSocket.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect!.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        connectToWhatsApp(sqlite3Helper);
      }
    }
  });

  waSocket.ev.on("creds.update", saveCreds);

  waSocket.ev.on("messages.upsert", async (m) => {
    for (const message of m.messages) {
      const { remoteJid, fromMe, participant } = message.key;
      const { conversation, imageMessage } = message.message ?? {};

      if (!remoteJid) continue;
      if (typeof fromMe !== "boolean") continue;

      const interactors: Record<string, Interactor> = {
        "!ligarbot": makeTurnOnBotInteractor(),
        "!desligarbot": makeTurnOffBotInteractor(),
        "!mencionartodos": makeMentionAllInteractor({ waSocket }),
      };

      if (conversation) {
        const interactor = interactors[conversation];

        if (interactor) {
          const params = { remoteJid, fromMe, participant };
          const result = await interactor.execute(params);
          await waSocket.sendMessage(remoteJid, result, { quoted: message });
        }
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
        await waSocket.sendMessage(
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
        await waSocket.sendMessage(
          remoteJid,
          { text: "pong" },
          { quoted: message }
        );
      }

      if (conversation === "!s") {
        await waSocket.sendMessage(
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

          await waSocket.sendMessage(
            remoteJid,
            { text: `Figurinha excedeu o limite de 100kb tendo ${length}kb` },
            { quoted: message }
          );
        } else {
          await waSocket.sendMessage(
            remoteJid,
            { sticker, mimetype: "image/webp" },
            { quoted: message }
          );
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

          await waSocket.sendMessage(
            remoteJid,
            { text: `_${phrases[i]}_` },
            { quoted: message }
          );
        }

        try {
          if (conversation && conversation.startsWith("!experimental_yt ")) {
            await waSocket.sendMessage(
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

            await waSocket.sendMessage(
              remoteJid,
              { video, caption: info.videoDetails.title },
              { quoted: message }
            );
          }

          if (conversation && conversation.startsWith("!experimental_ytmp3 ")) {
            await waSocket.sendMessage(
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

            await waSocket.sendMessage(remoteJid, { audio }, { quoted: message });
          }
        } catch (error) {
          await waSocket.sendMessage(
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
