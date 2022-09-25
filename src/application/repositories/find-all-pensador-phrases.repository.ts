export interface FindAllPensadorPhrasesRepositoryResult {
  phrase: string;
}

export interface FindAllPensadorPhrasesRepository {
  findAll: () => Promise<string[]>;
}
