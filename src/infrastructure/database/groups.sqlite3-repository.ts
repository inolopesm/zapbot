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
  async findAll() {
    const sqlite3Helper = SQLite3Helper.getInstance();
    const sql = "SELECT * FROM groups";
    const rows = await sqlite3Helper.read({ sql });
    const groups: Group[] = [];

    for (const row of rows) {
      const group = new Group(row);
      groups.push(group);
    }

    return groups;
  }

  async create(suffix: string) {
    const sqlite3Helper = SQLite3Helper.getInstance();
    const sql = "INSERT INTO groups (suffix) VALUES (?)";
    await sqlite3Helper.write({ sql, params: [suffix] });
  }

  async removeBySuffix(suffix: string) {
    const sqlite3Helper = SQLite3Helper.getInstance();
    const sql = "DELETE FROM groups WHERE suffix = ?";
    await sqlite3Helper.write({ sql, params: [suffix] });
  }
}
