import { UnifiedFeatureModel } from "./featureExtraction.ts";

export interface RuleValidationResult {
  passed: boolean;
  score: number;
  maxScore: number;
  measuredValue: string;
  expectedValue: string;
  evidence: string;
  impact: string;
  opportunity: string;
}

export interface IRule {
  id: string;
  category: "seo" | "accessibility" | "security" | "performance" | "content";
  description: string;
  severity: "high" | "medium" | "low" | "none";
  weight: number;
  version: string;
  validate(features: UnifiedFeatureModel): RuleValidationResult;
}

// -------------------------------------------------------------
// 1. SEO Rule Pack
// -------------------------------------------------------------
export class TitlePresenceRule implements IRule {
  id = "SEO_TITLE_PRESENCE";
  category = "seo" as const;
  description = "Title Tag Presence";
  severity = "high" as const;
  weight = 8;
  version = "1.0.0";

  validate(features: UnifiedFeatureModel): RuleValidationResult {
    const title = features.metadata.title;
    const passed = title !== null && title.trim().length > 0;
    return {
      passed,
      score: passed ? this.weight : 0,
      maxScore: this.weight,
      measuredValue: title || "Not found",
      expectedValue: "A descriptive text title tag",
      evidence: title ? `Title: "${title}"` : "No title tag elements detected in head.",
      impact: passed 
        ? "Page title is configured correctly." 
        : "Title tag is missing. Google listings will display raw URLs, damaging click-through rates.",
      opportunity: "Create a descriptive title tag containing target keywords.",
    };
  }
}

export class TitleLengthRule implements IRule {
  id = "SEO_TITLE_LENGTH";
  category = "seo" as const;
  description = "Title Tag Length (30-60 chars)";
  severity = "medium" as const;
  weight = 7;
  version = "1.0.0";

  validate(features: UnifiedFeatureModel): RuleValidationResult {
    const title = features.metadata.title ?? "";
    const len = title.length;
    const passed = len >= 30 && len <= 60;
    return {
      passed,
      score: passed ? this.weight : 0,
      maxScore: this.weight,
      measuredValue: `${len} characters`,
      expectedValue: "Between 30 and 60 characters",
      evidence: `Title length is ${len} characters: "${title}"`,
      impact: passed 
        ? "Optimal search snippet length." 
        : "Title tag length is suboptimal, leading to search snippet truncation.",
      opportunity: "Adjust title length to be within the 30-60 characters threshold.",
    };
  }
}

export class MetaDescriptionPresenceRule implements IRule {
  id = "SEO_DESC_PRESENCE";
  category = "seo" as const;
  description = "Meta Description Presence";
  severity = "high" as const;
  weight = 8;
  version = "1.0.0";

  validate(features: UnifiedFeatureModel): RuleValidationResult {
    const desc = features.metadata.metaDescription;
    const passed = desc !== null && desc.trim().length > 0;
    return {
      passed,
      score: passed ? this.weight : 0,
      maxScore: this.weight,
      measuredValue: desc || "Not found",
      expectedValue: "Meta description content configured",
      evidence: desc ? `Description: "${desc}"` : "No meta description element detected.",
      impact: passed 
        ? "Meta description is defined." 
        : "Meta description tag is missing. Google will auto-generate snippet text from page body.",
      opportunity: "Add a meta description to summarize page content.",
    };
  }
}

export class MetaDescriptionLengthRule implements IRule {
  id = "SEO_DESC_LENGTH";
  category = "seo" as const;
  description = "Meta Description Length (70-160 chars)";
  severity = "medium" as const;
  weight = 7;
  version = "1.0.0";

  validate(features: UnifiedFeatureModel): RuleValidationResult {
    const desc = features.metadata.metaDescription ?? "";
    const len = desc.length;
    const passed = len >= 70 && len <= 160;
    return {
      passed,
      score: passed ? this.weight : 0,
      maxScore: this.weight,
      measuredValue: `${len} characters`,
      expectedValue: "Between 70 and 160 characters",
      evidence: `Description length is ${len} characters.`,
      impact: passed 
        ? "Optimal description length." 
        : "Meta description is sub-optimal length.",
      opportunity: "Rewrite meta description to fit within 70-160 characters.",
    };
  }
}

export class SingleH1Rule implements IRule {
  id = "SEO_SINGLE_H1";
  category = "seo" as const;
  description = "Single H1 Header";
  severity = "high" as const;
  weight = 8;
  version = "1.0.0";

  validate(features: UnifiedFeatureModel): RuleValidationResult {
    const h1Count = features.headings.list.filter(h => h.level === 1).length;
    const passed = h1Count === 1;
    return {
      passed,
      score: passed ? this.weight : h1Count > 1 ? 2 : 0,
      maxScore: this.weight,
      measuredValue: `${h1Count} tags`,
      expectedValue: "Exactly 1 H1 tag",
      evidence: `Found ${h1Count} H1 headings.`,
      impact: passed 
        ? "Optimal H1 layout structure." 
        : h1Count > 1 ? "Multiple H1 tags detected. Keep a single main title." : "Missing H1 title tag.",
      opportunity: "Ensure the page has exactly one H1 heading.",
    };
  }
}

// -------------------------------------------------------------
// 2. Accessibility Rule Pack
// -------------------------------------------------------------
export class LangPresenceRule implements IRule {
  id = "ACC_LANG_PRESENCE";
  category = "accessibility" as const;
  description = "HTML Lang Attribute Presence";
  severity = "high" as const;
  weight = 10;
  version = "1.0.0";

  validate(features: UnifiedFeatureModel): RuleValidationResult {
    const lang = features.metadata.lang;
    const passed = lang !== null && lang.trim().length > 0;
    return {
      passed,
      score: passed ? this.weight : 0,
      maxScore: this.weight,
      measuredValue: lang || "Not found",
      expectedValue: "lang attribute on html tag (e.g. lang=\"en\")",
      evidence: lang ? `lang="${lang}"` : "No lang attribute on <html> element.",
      impact: passed 
        ? "HTML language attribute is configured." 
        : "Language attribute is missing. Screen readers fail to translate accents properly.",
      opportunity: "Add lang attribute to <html> tag.",
    };
  }
}

export class ImageAltsRule implements IRule {
  id = "ACC_IMAGE_ALTS";
  category = "accessibility" as const;
  description = "Image Alternative Text Attribute Presence";
  severity = "high" as const;
  weight = 15;
  version = "1.0.0";

  validate(features: UnifiedFeatureModel): RuleValidationResult {
    const missing = features.images.imagesMissingAltCount;
    const total = features.images.totalImagesCount;
    const passed = missing === 0;
    const score = total > 0 ? Math.round(((total - missing) / total) * this.weight) : this.weight;
    return {
      passed,
      score,
      maxScore: this.weight,
      measuredValue: `${missing} of ${total} images missing alt tags`,
      expectedValue: "All images must have alt descriptions",
      evidence: `Missing alt attributes on ${missing} out of ${total} image tags.`,
      impact: passed 
        ? "All images have configured alt elements." 
        : "Screen readers cannot describe visual imagery to visually impaired users.",
      opportunity: "Ensure all img elements define alt attributes containing descriptive contexts.",
    };
  }
}

export class FormLabelsRule implements IRule {
  id = "ACC_FORM_LABELS";
  category = "accessibility" as const;
  description = "Missing Form Labels";
  severity = "high" as const;
  weight = 15;
  version = "1.0.0";

  validate(features: UnifiedFeatureModel): RuleValidationResult {
    const missing = features.accessibility.missingFormLabelsCount;
    const passed = missing === 0;
    const score = Math.max(0, this.weight - (missing * 5));
    return {
      passed,
      score,
      maxScore: this.weight,
      measuredValue: `${missing} controls missing labels`,
      expectedValue: "All inputs must have linked labels",
      evidence: `Found ${missing} form controls missing labels or aria-label attributes.`,
      impact: passed 
        ? "All form inputs have labels." 
        : `Found ${missing} form input controls missing labels, blocking accessible screen reader paths.`,
      opportunity: "Add labels or aria-labels to all form elements.",
    };
  }
}

// -------------------------------------------------------------
// 3. Security Rule Pack
// -------------------------------------------------------------
export class HttpsRule implements IRule {
  id = "SEC_HTTPS";
  category = "security" as const;
  description = "HTTPS Protocol Enforcement";
  severity = "high" as const;
  weight = 20;
  version = "1.0.0";

  validate(features: UnifiedFeatureModel): RuleValidationResult {
    const isHttps = features.finalUrl.startsWith("https://");
    return {
      passed: isHttps,
      score: isHttps ? this.weight : 0,
      maxScore: this.weight,
      measuredValue: isHttps ? "HTTPS" : "HTTP",
      expectedValue: "HTTPS protocol",
      evidence: `Final protocol is ${isHttps ? "https://" : "http://"}.`,
      impact: isHttps 
        ? "Secure SSL connection is enabled." 
        : "Insecure connection. Sensitive data transmitted in plaintext can be intercepted.",
      opportunity: "Deploy SSL/TLS certificate and redirect HTTP to HTTPS.",
    };
  }
}

export class CspRule implements IRule {
  id = "SEC_CSP";
  category = "security" as const;
  description = "Content-Security-Policy Header Presence";
  severity = "high" as const;
  weight = 15;
  version = "1.0.0";

  validate(features: UnifiedFeatureModel): RuleValidationResult {
    const passed = features.security.hasCsp;
    return {
      passed,
      score: passed ? this.weight : 0,
      maxScore: this.weight,
      measuredValue: passed ? "Configured" : "Not configured",
      expectedValue: "CSP header defined",
      evidence: passed ? `CSP: "${features.security.cspHeader}"` : "No Content-Security-Policy header returned.",
      impact: passed 
        ? "CSP is configured correctly." 
        : "Without CSP, the application is highly vulnerable to Cross-Site Scripting (XSS) attacks.",
      opportunity: "Configure Content-Security-Policy header in server responses.",
    };
  }
}

// -------------------------------------------------------------
// Rule Engine Registry & Evaluation Coordinator
// -------------------------------------------------------------
export class RuleEngine {
  private rules: IRule[] = [];

  constructor() {
    // Register Default Rule Packs
    this.rules.push(new TitlePresenceRule());
    this.rules.push(new TitleLengthRule());
    this.rules.push(new MetaDescriptionPresenceRule());
    this.rules.push(new MetaDescriptionLengthRule());
    this.rules.push(new SingleH1Rule());
    
    this.rules.push(new LangPresenceRule());
    this.rules.push(new ImageAltsRule());
    this.rules.push(new FormLabelsRule());
    
    this.rules.push(new HttpsRule());
    this.rules.push(new CspRule());
  }

  evaluate(features: UnifiedFeatureModel): Record<string, RuleValidationResult> {
    const results: Record<string, RuleValidationResult> = {};
    for (const rule of this.rules) {
      results[rule.id] = rule.validate(features);
    }
    return results;
  }
}
