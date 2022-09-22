export type FindOneRandomPensadorPhraseRepositoryResult = {
  phrase: string;
};

export interface FindOneRandomPensadorPhraseRepository {
  findOneRandom(): Promise<FindOneRandomPensadorPhraseRepositoryResult | null>;
}
