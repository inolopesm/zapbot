import { Interactor, InteractorParams } from "../protocols";
import {
  CreateGroupRepository,
  FindAllGroupsRepository,
} from "../repositories";

export class TurnOnBotInteractor implements Interactor {
  constructor(
    private readonly findAllGroupsRepository: FindAllGroupsRepository,
    private readonly createGroupRepository: CreateGroupRepository
  ) {}

  async execute({ remoteJid }: InteractorParams) {
    const [_, suffix] = remoteJid.split("-");

    if (!suffix) {
      throw new Error(`could not get remoteJid (${remoteJid}) suffix`);
    }

    const groups = await this.findAllGroupsRepository.findAll();

    for (const group of groups) {
      if (group.getSuffix() === suffix) {
        return { text: "bot já está ligado nesse grupo" };
      }
    }

    await this.createGroupRepository.create(suffix);

    return { text: "bot ligado nesse grupo" };
  }
}
