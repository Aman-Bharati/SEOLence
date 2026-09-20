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
  responseTimeMs: number | null;
  loadTimeMs: number | null;
  robotsTxtExists: boolean;
  robotsTxtContent: string | null;
  sitemapExists: boolean;
  sitemapUrl: string | null;
  hasJsonLd: boolean;
  hasMicrodata: boolean;
  hreflangTags: { lang: string; href: string }[];
  redirectChain: string[];
  securityHeaders: {
    hasCsp: boolean;
    hasHsts: boolean;
    hasXFrame: boolean;
    hasXContentType: boolean;
    cspHeader: string | null;
    hstsHeader: string | null;
    xFrameHeader: string | null;
    xContentTypeHeader: string | null;
  };
  accessibilityFlags: {
    hasLang: boolean;
    langValue: string | null;
    hasHeadingSequenceViolation: boolean;
    imagesMissingAltCount: number;
    totalImagesCount: number;
    missingFormLabelsCount?: number;
    emptyButtonsCount?: number;
    emptyLinksCount?: number;
    zoomDisabled?: boolean;
    iframeMissingTitle?: boolean;
    nonSemanticLandmarks?: boolean;
  };
  securityDetails?: {
    referrerPolicy: string | null;
    permissionsPolicy: string | null;
    hasSecurityTxt: boolean;
    hasMixedContent: boolean;
    mixedContentUrls: string[];
    hasDirectoryListing: boolean;
    sriScore: number;
    sriMissingUrls: string[];
    certificateValid: boolean | null;
    certificateError: string | null;
    cookies: {
      name: string;
      isHttpOnly: boolean;
      isSecure: boolean;
      sameSite: string | null;
    }[];
  };
  performanceDetails?: {
    lcp: number | null;
    cls: number | null;
    fcp: number | null;
    tbt: number | null;
    speedIndex: number | null;
  } | null;
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

export interface TechSeoCheck {
  id: string;
  name: string;
  passed: boolean;
  severity: "high" | "medium" | "low" | "none";
  issue: string;
  evidence: string;
  fix: string;
  reference: string;
}

export interface ImageAltFix {
  src: string;
  suggestedAlt: string;
  code: string;
  reactCode?: string;
  nextjsCode?: string;
  wordpressCode?: string;
  shopifyCode?: string;
}

export interface AiFixes {
  titles: { option: string; text: string; impact: string }[];
  descriptions: { option: string; text: string; impact: string }[];
  schemaJsonLd: string;
  canonicalCode: string;
  headingOutline: string;
  imageAltFixes: ImageAltFix[];
  internalLinkAnchors: { pageUrl: string; anchorText: string }[];
  contentSuggestions: string[];
  faqSchema: string;
  faqHtml: string;
  entities: string[];
  metaTagsCode: string;
  // Metadata attributes
  frameworkConfidence?: number;
  riskLevel?: "low" | "medium" | "high";
  breakingChangeRisk?: boolean;
  manualReviewRequired?: boolean;
  validationResult?: { valid: boolean; notes: string };
  // Platform specific fixes
  reactFixes?: {
    metaCode: string;
    canonicalCode: string;
  };
  nextjsFixes?: {
    metadataCode: string;
  };
  wordpressFixes?: {
    headerPhpSnippet: string;
  };
  shopifyFixes?: {
    themeLiquidSnippet: string;
  };
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
  techSeoChecks: Record<string, TechSeoCheck>;
  aiFixes: AiFixes;
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

export interface Project {
  id: string;
  user_id: string;
  domain: string;
  name: string;
  created_at: string;
}

export interface WebsiteAudit {
  id: string;
  project_id: string | null;
  user_id: string | null;
  url: string;
  overall_score: number;
  seo_score: number;
  accessibility_score: number;
  security_score: number;
  content_score: number;
  performance_score: number | null;
  audit_data: {
    parsed: ParsedPage;
    wordFrequency: Record<string, number>;
    topKeywords: KeywordEntry[];
    bigrams: PhraseEntry[];
    trigrams: PhraseEntry[];
    breakdown?: {
      category: string;
      check: string;
      score: number;
      maxScore: number;
      status: "passed" | "failed" | "warning";
      impact: string;
      measuredValue?: string;
      formula?: string;
      opportunity?: string;
      expectedImpact?: string;
    }[];
    securityHeaders: {
      hasCsp: boolean;
      hasHsts: boolean;
      hasXFrame: boolean;
      hasXContentType: boolean;
      cspHeader: string | null;
      hstsHeader: string | null;
      xFrameHeader: string | null;
      xContentTypeHeader: string | null;
    };
    accessibilityFlags: {
      hasLang: boolean;
      langValue: string | null;
      hasHeadingSequenceViolation: boolean;
      imagesMissingAltCount: number;
      totalImagesCount: number;
    };
  };
  insights: {
    strengths: InsightItem[];
    weaknesses: InsightItem[];
    recommendations: InsightItem[];
  };
  created_at: string;
}

export interface CompetitorScorecard {
  url: string;
  overallScore: number;
  seoScore: number;
  performanceScore: number | null;
  accessibilityScore: number;
  securityScore: number;
  contentScore: number;
  wordCount: number;
  responseTimeMs: number;
  loadTimeMs: number;
  hasCsp: boolean;
  hasSchema: boolean;
  hasRobots: boolean;
  hasSitemap: boolean;
  topKeywords?: KeywordEntry[];
  headings?: { level: number; text: string }[];
  title?: string | null;
  metaDescription?: string | null;
}

export interface UnifiedPageModel {
  url: string;
  finalUrl: string;
  metadata: {
    title: string | null;
    description: string | null;
    keywords: string | null;
    canonical: string | null;
    lang: string | null;
    charset: string | null;
    viewport: string | null;
  };
  metrics: {
    wordCount: number;
    paragraphsCount: number;
    imagesCount: number;
    imagesMissingAltCount: number;
    linksInternalCount: number;
    linksExternalCount: number;
    responseTimeMs: number | null;
    loadTimeMs: number | null;
  };
  scores: {
    overall: number;
    seo: number;
    performance: number | null;
    accessibility: number;
    security: number;
    content: number;
  };
  breakdown: {
    category: string;
    check: string;
    score: number;
    maxScore: number;
    status: "passed" | "failed" | "warning";
    impact: string;
    measuredValue?: string;
    formula?: string;
    opportunity?: string;
    expectedImpact?: string;
  }[];
  parsed: ParsedPage;
}

export interface HistoryDiffReport {
  scoreChange: {
    overall: number;
    seo: number;
    accessibility: number;
    security: number;
    content: number;
    performance: number;
  };
  regressions: {
    category: string;
    message: string;
    severity: "high" | "medium" | "low";
  }[];
  improvements: {
    category: string;
    message: string;
    severity: "high" | "medium" | "low";
  }[];
  metaChanges: {
    titleChanged: boolean;
    prevTitle: string | null;
    currTitle: string | null;
    descChanged: boolean;
    prevDesc: string | null;
    currDesc: string | null;
  };
}


