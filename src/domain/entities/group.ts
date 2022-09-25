export interface GroupParams {
  id: number;
  suffix: string;
}

export class Group {
  private readonly id: number;
  private readonly suffix: string;

  constructor(params: GroupParams) {
    this.id = params.id;
    this.suffix = params.suffix;
  }

  getId(): number {
    return this.id;
  }

  getSuffix(): string {
    return this.suffix;
  }
}
