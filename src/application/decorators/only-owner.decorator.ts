import { Interactor, InteractorParams, InteractorResult } from "../protocols";

export class OnlyOwnerDecorator implements Interactor {
  constructor(private readonly interactor: Interactor) {}

  async execute(params: InteractorParams): Promise<InteractorResult> {
    if (!params.fromMe) {
      return { text: "apenas o dono do bot pode usar este comando" };
    }

    return await this.interactor.execute(params);
  }
}
