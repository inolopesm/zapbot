import baileys from '@adiwajshing/baileys'
import { MongoClient } from 'mongodb'
import sharp from 'sharp'
import { useMongoAuthState } from './useMongoAuthState.mjs'
import { makeMongoStore } from './makeMongoStore.mjs'

const {
  default: makeWASocket,
  DisconnectReason,
  downloadMediaMessage,
  BufferJSON,
} = baileys

let mongoClient

const connectToWhatsApp = async () => {
  if (!mongoClient) {
    mongoClient = new MongoClient('mongodb://localhost/auth_info_baileys')
    await mongoClient.connect()
  }

  const baileysCollection = mongoClient.db().collection('auth_info_baileys')
  const groupsCollection = mongoClient.db().collection('groups')
  const messagesCollection = mongoClient.db().collection('messages')

  const { state, saveCreds } = await useMongoAuthState(baileysCollection)
  const store = await makeMongoStore(messagesCollection)

  const waSocket = makeWASocket({ printQRInTerminal: true, auth: state })

  waSocket.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        connectToWhatsApp()
      }
    }
  })

  waSocket.ev.on('creds.update', saveCreds)

  store.bind(waSocket.ev)

  waSocket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const message of messages) {
      const { remoteJid, fromMe } = message.key
      const { conversation } = message.message ?? {}
      const { caption } = message.message?.imageMessage ?? {}
      const quoted = message

      if (conversation === '!ping') {
        await waSocket.sendMessage(remoteJid, { text: '!pong' }, { quoted })
      }

      if (conversation === '!ligarbot') {
        if (!fromMe) {
          const text = 'este comando só o dono pode usar'
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        if (!remoteJid.endsWith('@g.us')) {
          const text = 'este comando só funciona em um grupo'
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        let suffix

        // grupos antigos
        if (remoteJid.match(/\d+-\d+@g\.us/)) {
          const [, secondPart] = remoteJid.split("-");
          suffix = secondPart;
        }

        // grupos novos
        if (remoteJid.match(/\d+@g\.us/)) {
          suffix = remoteJid;
        }

        if (!suffix) {
          const text = `não consegui pegar o sufixo do remoteJid (${remoteJid})`
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        const groups = await groupsCollection.find().toArray()
        let botAlreadyOn = false

        for (const group of groups) {
          if (group.suffix === suffix) {
            botAlreadyOn = true
            break
          }
        }

        if (botAlreadyOn) {
          const text = 'o bot já está ligado nesse grupo'
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        await groupsCollection.insertOne({ suffix })

        const text = 'bot ligado nesse grupo'
        await waSocket.sendMessage(remoteJid, { text }, { quoted })
      }

      if (conversation === '!desligarbot') {
        if (!fromMe) {
          const text = 'este comando só o dono pode usar'
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        if (!remoteJid.endsWith('@g.us')) {
          const text = 'este comando só funciona em um grupo'
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        let suffix

        // grupos antigos
        if (remoteJid.match(/\d+-\d+@g\.us/)) {
          const [, secondPart] = remoteJid.split("-");
          suffix = secondPart;
        }

        // grupos novos
        if (remoteJid.match(/\d+@g\.us/)) {
          suffix = remoteJid;
        }

        if (!suffix) {
          const text = `não consegui pegar o sufixo do remoteJid (${remoteJid})`
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        const groups = await groupsCollection.find().toArray()
        let botAlreadyOff = true

        for (const group of groups) {
          if (group.suffix === suffix) {
            botAlreadyOff = false
            break
          }
        }

        if (botAlreadyOff) {
          const text = 'o bot não está ligado nesse grupo'
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        await groupsCollection.deleteOne({ suffix })
        const text = 'bot desligado desse grupo'
        await waSocket.sendMessage(remoteJid, { text }, { quoted })
      }

      if (caption === '!s') {
        if (!remoteJid.endsWith('@g.us')) {
          const text = 'este comando só funciona em um grupo'
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        let suffix

        // grupos antigos
        if (remoteJid.match(/\d+-\d+@g\.us/)) {
          const [, secondPart] = remoteJid.split("-");
          suffix = secondPart;
        }

        // grupos novos
        if (remoteJid.match(/\d+@g\.us/)) {
          suffix = remoteJid;
        }

        if (!suffix) {
          const text = `não consegui pegar o sufixo do remoteJid (${remoteJid})`
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        const groups = await groupsCollection.find().toArray()
        let allowed = false

        for (const group of groups) {
          if (group.suffix === suffix) {
            allowed = true
            break
          }
        }

        if (!allowed) {
          const text = 'o bot está desligado nesse grupo'
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        const buffer = await downloadMediaMessage(message, "buffer", {})
        const image = sharp(buffer)

        const sticker = await image.resize(512).toFormat("webp").toBuffer()
        const HUNDRED_KB = 100 * 1024

        if (sticker.byteLength > HUNDRED_KB) {
          const length = sticker.byteLength / 1024
          const text = `Figurinha excedeu o limite de 100kb tendo ${length}kb`
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        await waSocket.sendMessage(remoteJid, { sticker, mimetype: "image/webp" }, { quoted })
      }

      if (message.message?.extendedTextMessage?.text === '!s') {
        let suffix

        // grupos antigos
        if (remoteJid.match(/\d+-\d+@g\.us/)) {
          const [, secondPart] = remoteJid.split("-");
          suffix = secondPart;
        }

        // grupos novos
        if (remoteJid.match(/\d+@g\.us/)) {
          suffix = remoteJid;
        }

        if (!suffix) {
          const text = `não consegui pegar o sufixo do remoteJid (${remoteJid})`
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        const groups = await groupsCollection.find().toArray()
        let allowed = false

        for (const group of groups) {
          if (group.suffix === suffix) {
            allowed = true
            break
          }
        }

        if (!allowed) {
          const text = 'o bot está desligado nesse grupo'
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        const document = await messagesCollection.findOne({
          'key.id':  message.message.extendedTextMessage.contextInfo.stanzaId,
        })

        if (!document) {
          const text = 'Não foi possível recuperar a mensagem respondida'
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        const { _id, ...quotedMessage } = document
        quotedMessage.message = JSON.parse(quotedMessage.message, BufferJSON.reviver)

        const buffer = await downloadMediaMessage(quotedMessage, "buffer", {})
        const image = sharp(buffer)

        const sticker = await image.resize(512).toFormat("webp").toBuffer()
        const HUNDRED_KB = 100 * 1024

        if (sticker.byteLength > HUNDRED_KB) {
          const length = sticker.byteLength / 1024
          const text = `Figurinha excedeu o limite de 100kb tendo ${length}kb`
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        await waSocket.sendMessage(remoteJid, { sticker, mimetype: "image/webp" }, { quoted })
      }

      if (conversation === "!mencionartodos") {
        if (!fromMe) {
          const text = 'este comando só o dono pode usar'
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        if (!remoteJid.endsWith('@g.us')) {
          const text = 'este comando só funciona em um grupo'
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        let suffix

        // grupos antigos
        if (remoteJid.match(/\d+-\d+@g\.us/)) {
          const [, secondPart] = remoteJid.split("-");
          suffix = secondPart;
        }

        // grupos novos
        if (remoteJid.match(/\d+@g\.us/)) {
          suffix = remoteJid;
        }

        if (!suffix) {
          const text = `não consegui pegar o sufixo do remoteJid (${remoteJid})`
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        const groups = await groupsCollection.find().toArray()
        let allowed = false

        for (const group of groups) {
          if (group.suffix === suffix) {
            allowed = true
            break
          }
        }

        if (!allowed) {
          const text = 'o bot está desligado nesse grupo'
          await waSocket.sendMessage(remoteJid, { text }, { quoted })
          continue
        }

        const metadata = await waSocket.groupMetadata(remoteJid)

        const mentions = metadata.participants.map(({ id }) => id)
        const text = mentions.map((id) => `@${id.replace('@s.whatsapp.net', '')}`).join(' ')

        await waSocket.sendMessage(remoteJid, { text, mentions }, { quoted })
      }
    }
  })
}

connectToWhatsApp()
