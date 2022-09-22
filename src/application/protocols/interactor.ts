export type InteractorParams = {
  remoteJid: string;
  fromMe: boolean;
  participant: string | null | undefined;
};

export type InteractorResult = {
  text: string;
  mentions?: string[];
};

export interface Interactor {
  execute(params: InteractorParams): Promise<InteractorResult>;
}
