export interface CachedCrawl {
  html: string;
  timestamp: number;
}

export interface AnalyzeRequest {
  url: string;
  siteWide?: boolean;
  jobId?: string;
}

export interface HeadingInfo {
  level: number;
  text: string;
}

export interface ImageInfo {
  src: string;
  alt: string;
  hasAlt: boolean;
}

export interface LinkInfo {
  internal: number;
  external: number;
  total: number;
}

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
  headings: HeadingInfo[];
  paragraphs: string[];
  images: ImageInfo[];
  links: LinkInfo;
  bodyText: string;
  visibleText: string;
  wordCount: number;
  rawHtmlLength: number;
  statusCode: number;
  contentType: string;
  error: string | null;
  isClientRendered: boolean;
  renderNote: string | null;
  responseTimeMs: number;
  loadTimeMs: number;
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
    missingFormLabelsCount: number;
    emptyButtonsCount: number;
    emptyLinksCount: number;
    zoomDisabled: boolean;
    iframeMissingTitle: boolean;
    nonSemanticLandmarks: boolean;
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
