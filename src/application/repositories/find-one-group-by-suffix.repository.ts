import { Group } from "../../domain/entities";

export type FindOneGroupBySuffixRepositoryParams = {
  suffix: string;
};

export interface FindOneGroupBySuffixRepository {
  findOneBySuffix(
    params: FindOneGroupBySuffixRepositoryParams
  ): Promise<Group | null>;
}
