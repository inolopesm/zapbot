import { Interactor, InteractorParams } from "../protocols";
import { FindAllGroupsRepository } from "../repositories";

export class OnlyRegisteredGroupDecorator implements Interactor {
  constructor(
    private readonly findAllGroupsRepository: FindAllGroupsRepository,
    private readonly interactor: Interactor
  ) {}

  async execute(params: InteractorParams) {
    const groups = await this.findAllGroupsRepository.findAll();

    for (const group of groups) {
      const suffix = group.getSuffix();

      if (params.remoteJid.endsWith(suffix)) {
        return await this.interactor.execute(params);
      }
    }

    return { text: "o bot está desativado nesse grupo/coversa" };
  }
}
