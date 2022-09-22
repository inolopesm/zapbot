import {
  CreateGroupRepository,
  CreateGroupRepositoryParams,
  FindOneGroupBySuffixRepository,
  FindOneGroupBySuffixRepositoryParams,
  RemoveGroupBySuffixRepository,
  RemoveGroupBySuffixRepositoryParams,
} from "../../../application/repositories";
import { Group } from "../../../domain/entities";
import { SQLite3Helper } from "../helpers";

export class GroupsSQLite3Repository
  implements
    FindOneGroupBySuffixRepository,
    CreateGroupRepository,
    RemoveGroupBySuffixRepository
{
  async findOneBySuffix({
    suffix,
  }: FindOneGroupBySuffixRepositoryParams): Promise<Group | null> {
    const sqlite3Helper = SQLite3Helper.getInstance();
    const sql = "SELECT * FROM groups WHERE suffix = ?";
    const [row] = await sqlite3Helper.read({ sql, params: [suffix] });
    if (!row) return null;
    return new Group(row);
  }

  async create({ suffix }: CreateGroupRepositoryParams) {
    const sqlite3Helper = SQLite3Helper.getInstance();
    const sql = "INSERT INTO groups (suffix) VALUES (?)";
    await sqlite3Helper.write({ sql, params: [suffix] });
  }

  async removeBySuffix({
    suffix
  }: RemoveGroupBySuffixRepositoryParams): Promise<void> {
    const sqlite3Helper = SQLite3Helper.getInstance();
    const sql = "DELETE FROM groups WHERE suffix = ?";
    await sqlite3Helper.write({ sql, params: [suffix] });
  }
}
