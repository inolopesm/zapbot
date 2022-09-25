import { Interactor, InteractorParams, InteractorResult } from "../protocols";

export class OnlyGroupDecorator implements Interactor {
  constructor(private readonly interactor: Interactor) {}

  async execute(params: InteractorParams): Promise<InteractorResult> {
    if (!params.remoteJid.endsWith("@g.us")) {
      return { text: "o bot só pode ser ligado em um grupo" };
    }

    return await this.interactor.execute(params);
  }
}
