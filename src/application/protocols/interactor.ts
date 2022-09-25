export interface InteractorParams {
  remoteJid: string;
  fromMe: boolean;
  participant: string | null | undefined;
}

export interface InteractorResult {
  text: string;
  mentions?: string[];
}

export interface Interactor {
  execute: (params: InteractorParams) => Promise<InteractorResult>;
}
