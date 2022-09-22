import { Interactor, InteractorParams } from "../protocols";
import { FindAllGroupParticipantsByRemoteJidRepository } from "../repositories";

export class MentionAllInteractor implements Interactor {
  constructor(
    private readonly findAllGroupParticipantsByRemoteJidRepository: FindAllGroupParticipantsByRemoteJidRepository
  ) {}

  async execute({ remoteJid }: InteractorParams) {
    const groupParticipants =
      await this.findAllGroupParticipantsByRemoteJidRepository.findAllByJid(
        remoteJid
      );

    const mentions = groupParticipants.map((groupParticipant) =>
      groupParticipant.getId()
    );

    const text = groupParticipants
      .map((groupParticipant) => groupParticipant.getMention())
      .join(" ");

    return { text, mentions };
  }
}
