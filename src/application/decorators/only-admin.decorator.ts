import { Interactor, InteractorParams } from "../protocols";
import { FindAllGroupParticipantsByRemoteJidRepository } from "../repositories";

export class OnlyAdminDecorator implements Interactor {
  constructor(
    private readonly findAllGroupParticipantsByRemoteJidRepository: FindAllGroupParticipantsByRemoteJidRepository,
    private readonly interactor: Interactor
  ) {}

  async execute(params: InteractorParams) {
    const groupParticipants =
      await this.findAllGroupParticipantsByRemoteJidRepository.findAllByJid(
        params.remoteJid
      );

    for (const groupParticipant of groupParticipants) {
      if (params.participant === groupParticipant.getId()) {
        if (groupParticipant.isAdmin()) {
          return await this.interactor.execute(params);
        }
      }
    }

    return { text: "você precisa ser admin para executar esse comando" };
  }
}
