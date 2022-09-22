export type GroupParticipantParams = {
  id: string;
  admin: boolean;
};

export class GroupParticipant {
  private readonly id: string;
  private readonly admin: boolean;

  constructor(params: GroupParticipantParams) {
    this.id = params.id;
    this.admin = params.admin;
  }

  getId() {
    return this.id;
  }

  isAdmin() {
    return this.admin;
  }

  getMention() {
    return `@${this.id.replace("@s.whatsapp.net", "")}`;
  }
}
