import { randomInt } from "node:crypto";
import { request } from "undici";
import { parse } from "node-html-parser";
import {
  FindOneRandomPensadorPhraseRepository,
  FindOneRandomPensadorPhraseRepositoryResult,
} from "../../application/repositories";

export class PensadorPhraseRepository
  implements FindOneRandomPensadorPhraseRepository
{
  async findOneRandom(): Promise<FindOneRandomPensadorPhraseRepositoryResult | null> {
    const response = await request("https://www.pensador.com/recentes/");
    const data = await response.body.text();
    const $root = parse(data);

    const phrases = $root
      .querySelectorAll(".frase.fr")
      .map(($element) => $element.innerHTML)
      .map((phrase) => phrase.replace(/&quot;/g, '"'))
      .map((phrase) => phrase.replace(/<br>/g, '\n'));

    if (phrases.length === 0) return null;
    const i = randomInt(0, phrases.length);
    const phrase = phrases.at(i);
    if (!phrase) return null;
    return { phrase };
  }
}
