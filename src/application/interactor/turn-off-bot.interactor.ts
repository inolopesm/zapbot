import { Interactor, InteractorParams } from "../protocols";
import { RemoveGroupBySuffixRepository } from "../repositories";

export type TurnOffBotInteractorParams = {
  removeGroupBySuffixRepository: RemoveGroupBySuffixRepository;
};

export class TurnOffBotInteractor implements Interactor {
  private readonly removeGroupBySuffixRepository: RemoveGroupBySuffixRepository;

  constructor(params: TurnOffBotInteractorParams) {
    this.removeGroupBySuffixRepository = params.removeGroupBySuffixRepository;
  }

  async execute({ remoteJid }: InteractorParams) {
    if (!remoteJid.endsWith("@g.us")) {
      return { text: "o bot só pode ser desligado em um grupo" };
    }

    const [_, suffix] = remoteJid.split("-");

    if (!suffix) {
      throw new Error(`could not get remoteJid (${remoteJid}) suffix`);
    }

    this.removeGroupBySuffixRepository.removeBySuffix({ suffix });

    return { text: "bot desligado desse grupo" };
  }
}
