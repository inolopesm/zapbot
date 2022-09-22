import { Interactor, InteractorParams } from "../protocols";
import { FindAllGroupParticipantsByRemoteJidRepository } from "../repositories";

export type MentionAllInteractorParams = {
  findAllGroupParticipantsByRemoteJidRepository: FindAllGroupParticipantsByRemoteJidRepository;
};

export class MentionAllInteractor implements Interactor {
  private readonly findAllGroupParticipantsByRemoteJidRepository: FindAllGroupParticipantsByRemoteJidRepository;

  constructor(params: MentionAllInteractorParams) {
    this.findAllGroupParticipantsByRemoteJidRepository = params.findAllGroupParticipantsByRemoteJidRepository;
  }

  async execute({ remoteJid, fromMe, participant }: InteractorParams) {
    const groupParticipants = await this.findAllGroupParticipantsByRemoteJidRepository.findAllByJid({ remoteJid });


    const admin = groupParticipants.some((groupParticipant) =>
      participant === groupParticipant.getId() && groupParticipant.isAdmin()
    );

    if (!(admin || fromMe)) {
      return { text: "tu não é admin rapá" };
    }

    const mentions = groupParticipants.map((groupParticipant) =>
      groupParticipant.getId()
    );

    const text = groupParticipants
      .map((groupParticipant) => groupParticipant.getMention())
      .join(" ");

    return { text, mentions };
  }
}
