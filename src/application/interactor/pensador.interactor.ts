import { randomInt } from "node:crypto";
import { Interactor } from "../protocols";
import { FindAllPensadorPhrasesRepository } from "../repositories";

export class PensadorInteractor implements Interactor {
  constructor(
    private readonly findAllPensadorPhrasesRepository: FindAllPensadorPhrasesRepository
  ) {}

  async execute() {
    const results = await this.findAllPensadorPhrasesRepository.findAll();

    if (!results.length) {
      return { text: "Não encontrei nenhuma frase" };
    }

    const i = randomInt(0, results.length);
    const result = results[i];

    if (!result) {
      throw new Error(`value (${i}) is of of range (${results.length})`);
    }

    return { text: result };
  }
}
