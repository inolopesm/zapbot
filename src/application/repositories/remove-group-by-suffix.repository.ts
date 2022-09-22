export type RemoveGroupBySuffixRepositoryParams = {
  suffix: string;
};

export interface RemoveGroupBySuffixRepository {
  removeBySuffix(params: RemoveGroupBySuffixRepositoryParams): Promise<void>;
}
