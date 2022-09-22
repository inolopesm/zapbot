import { Interactor } from "../protocols";
import { FindOneRandomPensadorPhraseRepository } from "../repositories";

export type PensadorInteractorParams = {
  findOneRandomPensadorPhraseRepository: FindOneRandomPensadorPhraseRepository;
};

export class PensadorInteractor implements Interactor {
  private readonly findOneRandomPensadorPhraseRepository: FindOneRandomPensadorPhraseRepository;

  constructor({ findOneRandomPensadorPhraseRepository }: PensadorInteractorParams) {
    this.findOneRandomPensadorPhraseRepository = findOneRandomPensadorPhraseRepository;
  }

  async execute() {
    const result = await this.findOneRandomPensadorPhraseRepository.findOneRandom();

    if (!result) {
      return { text: "Não encontrei nenhuma frase" };
    }

    return { text: result.phrase };
  }
}
