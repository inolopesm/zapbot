export type FindAllPensadorPhrasesRepositoryResult = {
  phrase: string;
};

export interface FindAllPensadorPhrasesRepository {
  findAll(): Promise<string[]>;
}
