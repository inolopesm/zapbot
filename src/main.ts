import { PassThrough } from "node:stream";
import { Boom } from "@hapi/boom";
import sharp from "sharp";
import ytdl from "ytdl-core";
import FFmpeg from "fluent-ffmpeg";

import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
  useMultiFileAuthState,
} from "baileys";

import { Interactor } from "./application/protocols";
import { PensadorPhraseRepository } from "./infrastructure/pensador";
import { GroupParticipantsBaileysRepository } from "./infrastructure/baileys";

import {
  GroupsSQLite3Repository,
  SQLite3Helper,
} from "./infrastructure/database";

import {
  MentionAllInteractor,
  PensadorInteractor,
  PingInteractor,
  TurnOffBotInteractor,
  TurnOnBotInteractor,
} from "./application/interactor";

import {
  OnlyAdminDecorator,
  OnlyGroupDecorator,
  OnlyOwnerDecorator,
  OnlyRegisteredGroupDecorator,
} from "./application/decorators";

const makeTurnOnBotInteractor = (): Interactor =>
  new OnlyGroupDecorator(
    new TurnOnBotInteractor(
      new GroupsSQLite3Repository(),
      new GroupsSQLite3Repository()
    )
  );

const makeTurnOffBotInteractor = (): Interactor =>
  new OnlyGroupDecorator(
    new OnlyRegisteredGroupDecorator(
      new GroupsSQLite3Repository(),
      new OnlyOwnerDecorator(
        new TurnOffBotInteractor(new GroupsSQLite3Repository())
      )
    )
  );

type WASocket = ReturnType<typeof makeWASocket>;

const makeOwnerMentionAllInteractor = (waSocket: WASocket): Interactor =>
  new OnlyGroupDecorator(
    new OnlyRegisteredGroupDecorator(
      new GroupsSQLite3Repository(),
      new OnlyOwnerDecorator(
        new MentionAllInteractor(
          new GroupParticipantsBaileysRepository(waSocket)
        )
      )
    )
  );

const makeAdminMentionAllInteractor = (waSocket: WASocket): Interactor =>
  new OnlyGroupDecorator(
    new OnlyRegisteredGroupDecorator(
      new GroupsSQLite3Repository(),
      new OnlyAdminDecorator(
        new GroupParticipantsBaileysRepository(waSocket),
        new MentionAllInteractor(
          new GroupParticipantsBaileysRepository(waSocket)
        )
      )
    )
  );

const makePensadorInteractor = (): Interactor =>
  new OnlyGroupDecorator(
    new OnlyRegisteredGroupDecorator(
      new GroupsSQLite3Repository(),
      new PensadorInteractor(new PensadorPhraseRepository())
    )
  );

const makePingInteractor = (): Interactor =>
  new OnlyGroupDecorator(
    new OnlyRegisteredGroupDecorator(
      new GroupsSQLite3Repository(),
      new PingInteractor()
    )
  );

const connectToWhatsApp = async (db: SQLite3Helper): Promise<void> => {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const waSocket = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });

  waSocket.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection !== "close") return;
    if (!lastDisconnect) return;
    if (!lastDisconnect.error) return;
    const { statusCode } = (lastDisconnect.error as Boom).output;
    if (statusCode === DisconnectReason.loggedOut) return;
    void connectToWhatsApp(db);
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  waSocket.ev.on("creds.update", saveCreds);

  waSocket.ev.on("messages.upsert", ({ messages, type }) => {
    console.log(`recebendo ${messages.length} do tipo ${type}`);

    void Promise.all(
      messages.map(async (message) => {
        console.log(JSON.stringify(message));

        const conversation =
          message.message?.extendedTextMessage?.text ??
          message.message?.imageMessage?.caption ??
          message.message?.conversation;

        const { remoteJid, fromMe, participant } = message.key;
        const { imageMessage } = message.message ?? {};
        const quoted = message;

        if (!remoteJid) return;
        if (typeof fromMe !== "boolean") return;
        if (!conversation) return;

        const interactors: Record<string, Interactor> = {
          "!dono ligarbot": makeTurnOnBotInteractor(),
          "!dono desligarbot": makeTurnOffBotInteractor(),
          "!dono mencionartodos": makeOwnerMentionAllInteractor(waSocket),
          "!admin mencionartodos": makeAdminMentionAllInteractor(waSocket),
          "!pensador": makePensadorInteractor(),
          "!ping": makePingInteractor(),
        };

        const interactor = interactors[conversation];

        if (interactor) {
          const params = { remoteJid, fromMe, participant };
          const result = await interactor.execute(params);
          await waSocket.sendMessage(remoteJid, result, { quoted });
        }

        const rows = await db.read("SELECT suffix FROM groups");
        const groups = rows.map<string>(({ suffix }) => suffix);
        if (!groups.some((group) => remoteJid.endsWith(group))) return;

        if (conversation === "!menu") {
          const text = [
            ...Object.keys(interactors),
            "!s",
            "!experimental_yt link_curto_do_video_no_youtube",
            "!experimental_ytmp3 link_curto_do_video_no_youtube",
          ].join("\n");

          await waSocket.sendMessage(remoteJid, { text }, { quoted });
        }

        if (conversation === "!s") {
          if (!imageMessage) {
            const text =
              "tem que enviar uma imagem de preferência QUADRADA com isso na legenda";

            await waSocket.sendMessage(remoteJid, { text }, { quoted });
          }

          if (imageMessage) {
            const buffer = await downloadMediaMessage(message, "buffer", {});

            const sticker = await sharp(buffer as Buffer)
              .resize(512, 512)
              .toFormat("webp")
              .toBuffer();

            const HUNDRED_KB = 100 * 1024;

            if (sticker.byteLength > HUNDRED_KB) {
              const length = sticker.byteLength / 1024;
              const text = `Figurinha excedeu o limite de 100kb tendo ${length}kb`;
              await waSocket.sendMessage(remoteJid, { text }, { quoted });
            }

            if (sticker.byteLength <= HUNDRED_KB) {
              await waSocket.sendMessage(
                remoteJid,
                { sticker, mimetype: "image/webp" },
                { quoted }
              );
            }
          }
        }

        try {
          if (conversation.startsWith("!experimental_yt ")) {
            const text =
              "Atenção! Este é um comando experimental, então pode não funcionar corretamente";

            await waSocket.sendMessage(remoteJid, { text }, { quoted });
            const [, rawurl] = conversation.split(" ");
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
              { quoted }
            );
          }

          if (conversation.startsWith("!experimental_ytmp3 ")) {
            const text =
              "Atenção! Este é um comando experimental, então pode não funcionar corretamente";

            await waSocket.sendMessage(remoteJid, { text }, { quoted });

            const [, rawurl] = conversation.split(" ");
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

            await waSocket.sendMessage(remoteJid, { audio }, { quoted });
          }
        } catch (error) {
          const text = String(error);
          await waSocket.sendMessage(remoteJid, { text }, { quoted });
        }
      })
    );
  });
};

const main = async (): Promise<void> => {
  const db = SQLite3Helper.getInstance();
  await db.connect("db.sqlite3");

  await db.write(
    "CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY, suffix TEXT NOT NULL)"
  );

  await connectToWhatsApp(db);
};

main().catch(console.error);
