export class SQLite3NotConnectedError extends Error {
  constructor() {
    super("SQLite3 not connected");
    this.name = "SQLite3NotConnectedError";
  }
}
