import { Interactor, InteractorResult } from "../protocols";

export class PingInteractor implements Interactor {
  async execute(): Promise<InteractorResult> {
    return { text: "pong" };
  }
}
