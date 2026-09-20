import { countSyllables } from "../shared/stopwords.ts";

export function calculateFleschReadingEase(
  words: string[],
  sentenceCount: number,
): { score: number; label: string } {
  if (words.length === 0 || sentenceCount === 0) {
    return { score: 0, label: "N/A" };
  }
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const wordsPerSentence = words.length / sentenceCount;
  const syllablesPerWord = totalSyllables / words.length;
  const score = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;

  let label = "Very Difficult";
  if (score >= 90) label = "Very Easy";
  else if (score >= 80) label = "Easy";
  else if (score >= 70) label = "Fairly Easy";
  else if (score >= 60) label = "Standard";
  else if (score >= 50) label = "Fairly Difficult";
  else if (score >= 30) label = "Difficult";

  return { score: Math.max(0, Math.min(100, Math.round(score * 10) / 10)), label };
}
