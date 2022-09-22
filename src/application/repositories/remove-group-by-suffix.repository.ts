export interface RemoveGroupBySuffixRepository {
  removeBySuffix(suffix: string): Promise<void>;
}
