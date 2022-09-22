import { GroupParticipant } from "../../domain/entities";

export type FindAllGroupParticipantsByRemoteJidRepositoryParams = {
  remoteJid: string;
};

export interface FindAllGroupParticipantsByRemoteJidRepository {
  findAllByJid(
    params: FindAllGroupParticipantsByRemoteJidRepositoryParams
  ): Promise<GroupParticipant[]>;
}
