import { request } from "undici";
import { parse } from "node-html-parser";
import { FindAllPensadorPhrasesRepository } from "../../application/repositories";

export class PensadorPhraseRepository
  implements FindAllPensadorPhrasesRepository
{
  async findAll(): Promise<string[]> {
    const response = await request("https://www.pensador.com/recentes/");
    const data = await response.body.text();
    const $root = parse(data);

    return $root
      .querySelectorAll(".frase.fr")
      .map(($element: HTMLElement) => $element.innerHTML)
      .map((phrase: string) => phrase.replace(/&quot;/g, '"'))
      .map((phrase: string) => phrase.replace(/<br>/g, "\n"));
  }
}
