import { request } from "undici";
import { parse } from "node-html-parser";
import { FindAllPensadorPhrasesRepository } from "../../application/repositories";

export class PensadorPhraseRepository
  implements FindAllPensadorPhrasesRepository
{
  async findAll() {
    const response = await request("https://www.pensador.com/recentes/");
    const data = await response.body.text();
    const $root = parse(data);

    return $root
      .querySelectorAll(".frase.fr")
      .map(($element) => $element.innerHTML)
      .map((phrase) => phrase.replace(/&quot;/g, '"'))
      .map((phrase) => phrase.replace(/<br>/g, "\n"));
  }
}
