import { Group } from "../../domain/entities";

export interface FindAllGroupsRepository {
  findAll(): Promise<Group[]>;
}
