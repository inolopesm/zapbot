export type GroupParams = {
  id: number;
  suffix: string;
};

export class Group {
  private readonly id: number;
  private readonly suffix: string;

  constructor(params: GroupParams) {
    this.id = params.id;
    this.suffix = params.suffix;
  }

  getId() {
    return this.id;
  }

  getSuffix() {
    return this.suffix;
  }
}
