import { Interactor, InteractorParams } from "../protocols";
import {
  CreateGroupRepository,
  FindOneGroupBySuffixRepository,
} from "../repositories";

export type TurnOnBotInteractorParams = {
  findOneGroupBySuffixRepository: FindOneGroupBySuffixRepository;
  createGroupRepository: CreateGroupRepository;
};

export class TurnOnBotInteractor implements Interactor {
  private readonly findOneGroupBySuffixRepository: FindOneGroupBySuffixRepository;
  private readonly createGroupRepository: CreateGroupRepository;

  constructor(params: TurnOnBotInteractorParams) {
    this.findOneGroupBySuffixRepository = params.findOneGroupBySuffixRepository;
    this.createGroupRepository = params.createGroupRepository;
  }

  async execute({ remoteJid }: InteractorParams) {
    const [_, suffix] = remoteJid.split("-");

    if (!suffix) {
      throw new Error(`could not get remoteJid (${remoteJid}) suffix`);
    }

    const exists = await this.findOneGroupBySuffixRepository.findOneBySuffix({
      suffix,
    });

    if (exists) {
      return { text: "bot já está ligado nesse grupo" };
    }

    await this.createGroupRepository.create({ suffix });

    return { text: "bot ligado nesse grupo" };
  }
}
