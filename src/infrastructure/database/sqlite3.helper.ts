import { promisify } from "node:util";
import SQLite3 from "sqlite3";
import { SQLite3NotConnectedError } from "./sqlite3-not-connected.error";

export class SQLite3Helper {
  private database?: SQLite3.Database;

  private constructor() {}

  async connect(filename: string): Promise<void> {
    return await new Promise<void>((resolve, reject) => {
      this.database = new SQLite3.Database(filename, (err) => {
        if (err != null) reject(err);
        else resolve();
      });
    });
  }

  async write(sql: string, params?: any[]): Promise<void> {
    if (this.database == null) throw new SQLite3NotConnectedError();
    const run = this.database.run.bind(this.database);
    const asyncRun = promisify<string, any[], unknown>(run);
    await asyncRun(sql, params ?? []);
  }

  async read(sql: string, params?: any[]): Promise<any[]> {
    if (this.database == null) throw new SQLite3NotConnectedError();
    const all = this.database.all.bind(this.database);
    const asyncAll = promisify<string, any[], any[]>(all);
    return await asyncAll(sql, params ?? []);
  }

  private static instance?: SQLite3Helper;

  static getInstance(): SQLite3Helper {
    if (SQLite3Helper.instance == null) {
      SQLite3Helper.instance = new SQLite3Helper();
    }

    return SQLite3Helper.instance;
  }
}
