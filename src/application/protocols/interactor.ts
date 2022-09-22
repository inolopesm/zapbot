export type InteractorParams = {
  remoteJid: string;
  fromMe: boolean;
};

export type InteractorResult = {
  text: string;
};

export interface Interactor {
  execute(params: InteractorParams): Promise<InteractorResult>;
}
