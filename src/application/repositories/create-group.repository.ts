export interface CreateGroupRepository {
  create(suffix: string): Promise<void>;
}
