import makeWASocket from "baileys";
import {
  FindAllGroupParticipantsByRemoteJidRepository,
  FindAllGroupParticipantsByRemoteJidRepositoryParams,
} from "../../application/repositories";
import { GroupParticipant } from "../../domain/entities";

export type GroupParticipantsSQLite3RepositoryParams = {
  waSocket: ReturnType<typeof makeWASocket>;
};

export class GroupParticipantsSQLite3Repository
  implements FindAllGroupParticipantsByRemoteJidRepository
{
  private readonly waSocket: ReturnType<typeof makeWASocket>;

  constructor(params: GroupParticipantsSQLite3RepositoryParams) {
    this.waSocket = params.waSocket;
  }

  async findAllByJid({
    remoteJid,
  }: FindAllGroupParticipantsByRemoteJidRepositoryParams): Promise<
    GroupParticipant[]
  > {
    const metadata = await this.waSocket.groupMetadata(remoteJid);
    const groupParticipants: GroupParticipant[] = [];

    for (const { id, admin } of metadata.participants) {
      const groupParticipant = new GroupParticipant({ id, admin: !!admin });
      groupParticipants.push(groupParticipant);
    }

    return groupParticipants;
  }
}
