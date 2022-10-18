import { inspect } from 'node:util'
import baileys from '@adiwajshing/baileys'
import { MongoClient } from 'mongodb'
import sharp from 'sharp'
import { useMongoAuthState } from './useMongoAuthState.mjs'

const { default: makeWASocket, DisconnectReason, downloadMediaMessage } = baileys

let mongoClient

const connectToWhatsApp = async () => {
  if (!mongoClient) {
    mongoClient = new MongoClient('mongodb://localhost/auth_info_baileys')
    await mongoClient.connect()
  }

  const baileysCollection = mongoClient.db().collection('auth_info_baileys')
  const groupsCollection = mongoClient.db().collection('groups')

  const { state, saveCreds } = await useMongoAuthState(baileysCollection)

  const waSocket = makeWASocket({ printQRInTerminal: true, auth: state })

  waSocket.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        connectToWhatsApp()
      }
    }
  })

  waSocket.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log(inspect({ type, messages }, { depth: null, colors: true }))

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
        const buffer = await downloadMediaMessage(message, "buffer", {})
        const image = sharp(buffer)
        const { width, height } = await image.metadata()
        console.log({ width, height })
        console.log('width - height', width - height)

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
    }
  })

  waSocket.ev.on('creds.update', saveCreds)
}

connectToWhatsApp()
