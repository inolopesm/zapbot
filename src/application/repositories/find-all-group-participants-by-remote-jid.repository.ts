import { GroupParticipant } from "../../domain/entities";

export interface FindAllGroupParticipantsByRemoteJidRepository {
  findAllByJid(jid: string): Promise<GroupParticipant[]>;
}
