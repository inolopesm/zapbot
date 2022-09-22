export type CreateGroupRepositoryParams = {
  suffix: string;
};

export interface CreateGroupRepository {
  create(params: CreateGroupRepositoryParams): Promise<void>;
}
