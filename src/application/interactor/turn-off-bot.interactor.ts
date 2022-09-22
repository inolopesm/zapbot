import { Interactor, InteractorParams } from "../protocols";
import { RemoveGroupBySuffixRepository } from "../repositories";

export class TurnOffBotInteractor implements Interactor {
  constructor(
    private readonly removeGroupBySuffixRepository: RemoveGroupBySuffixRepository
  ) {}

  async execute({ remoteJid }: InteractorParams) {
    if (!remoteJid.endsWith("@g.us")) {
      return { text: "o bot só pode ser desligado em um grupo" };
    }

    const [_, suffix] = remoteJid.split("-");

    if (!suffix) {
      throw new Error(`could not get remoteJid (${remoteJid}) suffix`);
    }

    this.removeGroupBySuffixRepository.removeBySuffix(suffix);

    return { text: "bot desligado desse grupo" };
  }
}
