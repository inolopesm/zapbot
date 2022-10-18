import baileys from '@adiwajshing/baileys'
const { BufferJSON, initAuthCreds, proto } = baileys

export const useMongoAuthState = async (colletion) => {
	const writeData = async (data, file) => {
		await colletion.updateOne(
			{ file: fixFileName(file) },
			{ $set: { data: JSON.stringify(data, BufferJSON.replacer) } },
			{ upsert: true }
		)
	}

	const readData = async (file) => {
		const document = await colletion.findOne({ file: fixFileName(file) })
		if (!document) return null
		return JSON.parse(document.data, BufferJSON.reviver)
	}

	const removeData = async (file) => {
		await colletion.deleteOne({ file: fixFileName(file) })
	}

	const fixFileName = (file) => file?.replace(/\//g, '__')?.replace(/:/g, '-')

	const creds = await readData('creds.json') ?? initAuthCreds()

	return {
		state: {
			creds,
			keys: {
				get: async (type, ids) => {
					const data = {}

					await Promise.all(
						ids.map(async (id) => {
							let value = await readData(`${type}-${id}.json`)

							if(type === 'app-state-sync-key' && value) {
								value = proto.Message.AppStateSyncKeyData.fromObject(value)
							}

							data[id] = value
						})
					)

					return data
				},

				set: async (data) => {
					const tasks = []

					for (const category in data) {
						for (const id in data[category]) {
							const value = data[category][id]
							const file = `${category}-${id}.json`
							tasks.push(value ? writeData(value, file) : removeData(file))
						}
					}

					await Promise.all(tasks)
				}
			}
		},

		saveCreds: async () => {
			await writeData(creds, 'creds.json')
		},
	}
}
