import baileys from '@adiwajshing/baileys'
const { BufferJSON } = baileys

export const makeMongoStore = async (messagesCollection) => ({
  bind: (ev) => {
    ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return

      await messagesCollection.insertMany(
        messages.map(({ message, ...rest }) => ({
          ...rest,
          message: JSON.stringify(message, BufferJSON.replacer)
        }))
      )
    })
  },
})
