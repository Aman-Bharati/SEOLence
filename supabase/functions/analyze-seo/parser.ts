import { DOMParser } from "https://esm.sh/linkedom@0.16.8?external=canvas";

export class DOMParserWrapper {
  static parse(html: string): any {
    try {
      return new DOMParser().parseFromString(html, "text/html");
    } catch (err) {
      console.error("[DOMParserWrapper] Failed to parse HTML using Linkedom:", err);
      throw err;
    }
  }
}
