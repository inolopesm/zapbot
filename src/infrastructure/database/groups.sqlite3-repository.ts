import {
  CreateGroupRepository,
  FindAllGroupsRepository,
  RemoveGroupBySuffixRepository,
} from "../../application/repositories";
import { Group } from "../../domain/entities";
import { SQLite3Helper } from "./sqlite3.helper";

export class GroupsSQLite3Repository
  implements
    FindAllGroupsRepository,
    CreateGroupRepository,
    RemoveGroupBySuffixRepository
{
  async findAll(): Promise<Group[]> {
    const sql = "SELECT * FROM groups";
    const rows = await SQLite3Helper.getInstance().read(sql);
    return rows.map((row) => new Group(row));
  }

  async create(suffix: string): Promise<void> {
    const sql = "INSERT INTO groups (suffix) VALUES (?)";
    await SQLite3Helper.getInstance().write(sql, [suffix]);
  }

  async removeBySuffix(suffix: string): Promise<void> {
    const sql = "DELETE FROM groups WHERE suffix = ?";
    await SQLite3Helper.getInstance().write(sql, [suffix]);
  }
}
