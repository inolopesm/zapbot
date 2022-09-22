import makeWASocket from "baileys";
import { FindAllGroupParticipantsByRemoteJidRepository } from "../../application/repositories";
import { GroupParticipant } from "../../domain/entities";

export class GroupParticipantsBaileysRepository
  implements FindAllGroupParticipantsByRemoteJidRepository
{
  constructor(private readonly waSocket: ReturnType<typeof makeWASocket>) {}

  async findAllByJid(jid: string): Promise<GroupParticipant[]> {
    const metadata = await this.waSocket.groupMetadata(jid);
    const groupParticipants: GroupParticipant[] = [];

    for (const { id, admin } of metadata.participants) {
      const groupParticipant = new GroupParticipant({ id, admin: !!admin });
      groupParticipants.push(groupParticipant);
    }

    return groupParticipants;
  }
}
