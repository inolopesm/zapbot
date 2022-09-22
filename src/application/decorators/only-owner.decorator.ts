import { Interactor, InteractorParams } from "../protocols";

export type OnlyOwnerDecoratorParams = {
  interactor: Interactor;
};

export class OnlyOwnerDecorator implements Interactor {
  private readonly interactor: Interactor;

  constructor(params: OnlyOwnerDecoratorParams) {
    this.interactor = params.interactor;
  }

  async execute(params: InteractorParams) {
    if (!params.fromMe) {
      return { text: "apenas o dono do bot pode usar este comando" };
    }

    return await this.interactor.execute(params);
  }
}
