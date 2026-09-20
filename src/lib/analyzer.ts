import type { AnalysisResult, KeywordEntry, ParsedPage } from "../types.ts";
import { generateAiFixes } from "./aiFixEngine.ts";
import { STOP_WORDS, FILLER_WORDS, tokenize, countSentences, generateNgrams, mapToSortedEntries } from "./shared/stopwords.ts";
import { calculateFleschReadingEase } from "./analysis/readability.ts";
import { calculateSeoScore, recommendKeywords, generateMetaSuggestions } from "./analysis/seoAnalyzer.ts";
import { generateInsights } from "./analysis/insights.ts";
import { generateActionPlan, calculateGradeCard } from "./analysis/actionPlan.ts";
import { generateVerificationChecks, calculateConfidence } from "./analysis/verification.ts";
import { runTechnicalSeoChecks } from "./analysis/technicalSeo.ts";

export { STOP_WORDS, runTechnicalSeoChecks };

export function analyzePage(parsed: ParsedPage): AnalysisResult {
  const words = tokenize(parsed.visibleText);
  const wordCount = words.length;

  // Word frequency
  const wordFrequency = new Map<string, number>();
  for (const word of words) {
    wordFrequency.set(word, (wordFrequency.get(word) ?? 0) + 1);
  }

  // Separate stop words from content words
  let stopWordCount = 0;
  const contentWordFrequency = new Map<string, number>();
  for (const [word, count] of wordFrequency) {
    if (STOP_WORDS.has(word) || FILLER_WORDS.has(word)) {
      stopWordCount += count;
    } else {
      contentWordFrequency.set(word, count);
    }
  }

  // Top keywords (content words only), sorted by count
  const topKeywords: KeywordEntry[] = Array.from(contentWordFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({
      word,
      count,
      density: wordCount > 0 ? Math.round((count / wordCount) * 1000) / 10 : 0,
    }));

  // Keyword density for all content words
  const keywordDensity: KeywordEntry[] = Array.from(contentWordFrequency.entries())
    .map(([word, count]) => ({
      word,
      count,
      density: wordCount > 0 ? Math.round((count / wordCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.density - a.density);

  // Overused words (density > 4% with count > 5)
  const overusedWords = keywordDensity.filter(
    (k) => k.density > 4 && k.count > 5,
  );

  // Underused: top keywords that appear only once or twice
  const underusedKeywords = Array.from(contentWordFrequency.entries())
    .filter(([, count]) => count <= 2 && count >= 1)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([word]) => word);

  // N-grams from full word list (includes stop words for phrase context)
  const bigramMap = generateNgrams(words, 2);
  const trigramMap = generateNgrams(words, 3);
  const bigrams = mapToSortedEntries(bigramMap, 20);
  const trigrams = mapToSortedEntries(trigramMap, 15);

  // Readability
  const sentenceCount = countSentences(parsed.visibleText);
  const { score: readabilityScore, label: readabilityLabel } = calculateFleschReadingEase(
    words,
    sentenceCount,
  );

  // Long words (3+ syllables approximated by length > 7)
  const longWords = words.filter((w) => w.length > 7).length;

  // Content quality metrics
  const uniqueWords = wordFrequency.size;
  const lexicalDiversity = wordCount > 0
    ? Math.round((uniqueWords / wordCount) * 1000) / 10
    : 0;
  const avgWordsPerSentence = sentenceCount > 0
    ? Math.round((wordCount / sentenceCount) * 10) / 10
    : 0;

  // Generate insights
  const insights = generateInsights(parsed, topKeywords, overusedWords, readabilityScore);

  // Calculate SEO score
  const seoScore = calculateSeoScore(parsed, topKeywords, insights);

  // Recommended keywords
  let domain = "";
  if (parsed.finalUrl) {
    try {
      domain = new URL(parsed.finalUrl).hostname.replace(/^www\./, "");
    } catch {
      domain = parsed.finalUrl;
    }
  }
  const recommendedKeywords = recommendKeywords(topKeywords, bigrams, trigrams, domain);

  const metaSuggestions = generateMetaSuggestions(parsed, topKeywords, bigrams);
  const actionPlan = generateActionPlan(parsed, insights, topKeywords, overusedWords);
  const gradeCard = calculateGradeCard(parsed, topKeywords, insights);
  const verificationChecks = generateVerificationChecks(parsed, readabilityScore);
  const confidence = calculateConfidence(parsed, verificationChecks);
  const techSeoChecks = runTechnicalSeoChecks(parsed);
  const aiFixes = generateAiFixes(parsed, { topKeywords, bigrams, trigrams });

  return {
    parsed,
    wordFrequency,
    topKeywords,
    stopWordCount,
    bigrams,
    trigrams,
    readabilityScore,
    readabilityLabel,
    seoScore,
    keywordDensity,
    overusedWords,
    underusedKeywords,
    recommendedKeywords,
    insights,
    contentQuality: {
      totalWords: wordCount,
      uniqueWords,
      lexicalDiversity,
      avgWordsPerSentence,
      sentenceCount,
      longWords,
    },
    metaSuggestions,
    actionPlan,
    gradeCard,
    verificationChecks,
    confidence,
    techSeoChecks,
    aiFixes,
  };
}
