export interface GroupParticipantParams {
  id: string;
  admin: boolean;
}

export class GroupParticipant {
  private readonly id: string;
  private readonly admin: boolean;

  constructor(params: GroupParticipantParams) {
    this.id = params.id;
    this.admin = params.admin;
  }

  getId(): string {
    return this.id;
  }

  isAdmin(): boolean {
    return this.admin;
  }

  getMention(): string {
    return `@${this.id.replace("@s.whatsapp.net", "")}`;
  }
}
