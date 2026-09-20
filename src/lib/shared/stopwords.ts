import { PhraseEntry } from "../../types.ts";

// Standard English stop words list
export const STOP_WORDS = new Set<string>([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
  "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
  "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
  "here", "here's", "here’s", "hers", "herself", "him", "himself", "his", "how",
  "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
  "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
  "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
  "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
  "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
  "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
  "they've", "this", "those", "through", "to", "too", "under", "until", "up",
  "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
  "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
  "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
  "yourself", "yourselves", "also", "just", "get", "got", "make", "made",
  "like", "well", "even", "still", "back", "way", "many", "much", "will",
  "one", "two", "three", "us", "now", "may", "might", "can", "could",
]);

// Common filler / irrelevant terms beyond grammatical stop words
export const FILLER_WORDS = new Set<string>([
  "etc", "ie", "eg", "via", "per", "say", "says", "said", "thing", "things",
  "stuff", "okay", "ok", "yeah", "yes", "nope", "umm", "hmm",
]);

export const NEGATIVE_SEO_HINTS = [
  "click here", "read more", "learn more", "more info", "check out",
  "find out", "discover", "lorem ipsum",
];

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u024f\u1e00-\u1eff]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

export function countSentences(text: string): number {
  const matches = text.match(/[.!?]+(?:\s|$)/g);
  return matches ? matches.length : 1;
}

export function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

export function generateNgrams(words: string[], n: number): Map<string, number> {
  const ngrams = new Map<string, number>();
  for (let i = 0; i <= words.length - n; i++) {
    const gram = words.slice(i, i + n).join(" ");
    const gramWords = gram.split(" ");
    const stopCount = gramWords.filter((w) => STOP_WORDS.has(w)).length;
    if (stopCount === gramWords.length) continue;
    ngrams.set(gram, (ngrams.get(gram) ?? 0) + 1);
  }
  return ngrams;
}

export function mapToSortedEntries(map: Map<string, number>, limit: number): PhraseEntry[] {
  return Array.from(map.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
}
