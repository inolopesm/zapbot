import { inspect } from 'node:util'
import baileys from 'baileys'
import { MongoClient } from 'mongodb'
import { useMongoAuthState } from './useMongoAuthState.mjs'

const { default: makeWASocket, DisconnectReason } = baileys

let mongoCollection

const connectToWhatsApp = async () => {
  if (!mongoCollection) {
    const mongoClient = new MongoClient('mongodb://localhost/auth_info_baileys')
    await mongoClient.connect()
    mongoCollection = mongoClient.db().collection('auth_info_baileys')
  }

  const { state, saveCreds } = await useMongoAuthState(mongoCollection)

  const waSocket = makeWASocket({ printQRInTerminal: true, auth: state })

  waSocket.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        connectToWhatsApp()
      }
    }
  })

  waSocket.ev.on('messages.upsert', ({ messages, type }) => {
    console.log(inspect({ type, messages }, { depth: null }))
  })

  waSocket.ev.on('creds.update', saveCreds)
}

connectToWhatsApp()
