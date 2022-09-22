import { promisify } from "node:util";
import SQLite3 from "sqlite3";
import { SQLite3NotConnectedError } from "./sqlite3-not-connected.error";

export type SQLite3HelperConnectParams = {
  filename: string;
};

export type SQLite3HelperWriteParams = {
  sql: string;
  params?: unknown[];
};

export type SQLite3HelperReadParams = {
  sql: string;
  params?: unknown[];
};

export class SQLite3Helper {
  private database?: SQLite3.Database;

  private constructor() {}

  connect({ filename }: SQLite3HelperConnectParams) {
    return new Promise<void>((resolve, reject) => {
      this.database = new SQLite3.Database(filename, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async write({ sql, params }: SQLite3HelperWriteParams) {
    if (!this.database) {
      throw new SQLite3NotConnectedError();
    }

    const run = this.database.run.bind(this.database);
    const asyncRun = promisify<string, any[], void>(run);
    return await asyncRun(sql, params ?? []);
  }

  async read({ sql, params }: SQLite3HelperReadParams) {
    if (!this.database) {
      throw new SQLite3NotConnectedError();
    }

    const all = this.database.all.bind(this.database);
    const asyncAll = promisify<string, any[], any[]>(all);
    return await asyncAll(sql, params ?? []);
  }

  private static instance?: SQLite3Helper;

  static getInstance() {
    if (!SQLite3Helper.instance) {
      SQLite3Helper.instance = new SQLite3Helper();
    }

    return SQLite3Helper.instance;
  }
}
