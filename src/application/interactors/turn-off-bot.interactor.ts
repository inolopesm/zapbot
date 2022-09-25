import { Interactor, InteractorParams, InteractorResult } from "../protocols";
import { RemoveGroupBySuffixRepository } from "../repositories";

export class TurnOffBotInteractor implements Interactor {
  constructor(
    private readonly removeGroupBySuffixRepository: RemoveGroupBySuffixRepository
  ) {}

  async execute({ remoteJid }: InteractorParams): Promise<InteractorResult> {
    if (!remoteJid.endsWith("@g.us")) {
      return { text: "o bot só pode ser desligado em um grupo" };
    }

    let suffix: string | undefined;

    // grupos antigos
    if (remoteJid.match(/\d+-\d+@g\.us/) !== null) {
      const [, secondPart] = remoteJid.split("-");
      suffix = secondPart;
    }

    // grupos novos
    if (remoteJid.match(/\d+@g\.us/) !== null) {
      suffix = remoteJid;
    }

    if (suffix === undefined) {
      throw new Error(`could not get remoteJid (${remoteJid}) suffix`);
    }

    await this.removeGroupBySuffixRepository.removeBySuffix(suffix);

    return { text: "bot desligado desse grupo" };
  }
}
