export interface ParsedPage {
  url: string;
  finalUrl: string;
  title: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  canonical: string | null;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  robots: string | null;
  viewport: string | null;
  charset: string | null;
  lang: string | null;
  headings: { level: number; text: string }[];
  paragraphs: string[];
  images: { src: string; alt: string; hasAlt: boolean }[];
  links: { internal: number; external: number; total: number };
  bodyText: string;
  visibleText: string;
  wordCount: number;
  rawHtmlLength: number;
  statusCode: number;
  contentType: string;
  error: string | null;
  isClientRendered: boolean;
  renderNote: string | null;
}

export interface KeywordEntry {
  word: string;
  count: number;
  density: number;
}

export interface PhraseEntry {
  phrase: string;
  count: number;
}

export interface InsightItem {
  type: "strength" | "weakness" | "recommendation";
  category: string;
  message: string;
  severity: "high" | "medium" | "low";
}

export interface AnalysisResult {
  parsed: ParsedPage;
  wordFrequency: Map<string, number>;
  topKeywords: KeywordEntry[];
  stopWordCount: number;
  bigrams: PhraseEntry[];
  trigrams: PhraseEntry[];
  readabilityScore: number;
  readabilityLabel: string;
  seoScore: number;
  keywordDensity: KeywordEntry[];
  overusedWords: KeywordEntry[];
  underusedKeywords: string[];
  recommendedKeywords: string[];
  insights: InsightItem[];
  contentQuality: {
    totalWords: number;
    uniqueWords: number;
    lexicalDiversity: number;
    avgWordsPerSentence: number;
    sentenceCount: number;
    longWords: number;
  };
  metaSuggestions: MetaSuggestions;
  actionPlan: ActionItem[];
  gradeCard: GradeCard;
  verificationChecks: VerificationCheck[];
  confidence: ConfidenceScore;
}

export interface MetaSuggestions {
  suggestedTitle: string;
  suggestedDescription: string;
  titleReason: string;
  descriptionReason: string;
}

export interface ActionItem {
  step: number;
  title: string;
  detail: string;
  impact: number;
  effort: "low" | "medium" | "high";
  category: string;
}

export interface GradeEntry {
  category: string;
  grade: string;
  score: number;
  maxScore: number;
  status: "good" | "warning" | "critical";
}

export interface GradeCard {
  overallGrade: string;
  entries: GradeEntry[];
}

export interface VerificationCheck {
  id: string;
  label: string;
  category: string;
  expected: string;
  actual: string;
  passed: boolean;
  weight: number;
  notes: string;
}

export interface ConfidenceScore {
  score: number;
  label: string;
  factors: { label: string; status: "good" | "warning" | "bad"; detail: string }[];
}

export interface SeoReport {
  id: string;
  url: string;
  domain: string;
  title: string | null;
  meta_description: string | null;
  word_count: number;
  unique_words: number;
  readability_score: number;
  seo_score: number;
  top_keywords: KeywordEntry[];
  bigrams: PhraseEntry[];
  trigrams: PhraseEntry[];
  headings: Record<string, string[]>;
  meta_tags: Record<string, unknown>;
  images: { src: string; alt: string; hasAlt: boolean }[];
  links: { internal: number; external: number; total: number };
  insights: {
    strengths: InsightItem[];
    weaknesses: InsightItem[];
    recommendations: InsightItem[];
  };
  raw_frequency: Record<string, number>;
  created_at: string;
}
