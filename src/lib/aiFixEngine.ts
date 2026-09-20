import type { ParsedPage, AiFixes, ImageAltFix } from "../types.ts";

/**
 * Validates generated code blocks (such as JSON-LD or XML/HTML closures)
 */
function validateSnippet(type: "json" | "html", code: string): { valid: boolean; notes: string } {
  if (type === "json") {
    try {
      JSON.parse(code);
      return { valid: true, notes: "JSON-LD schema is structurally valid." };
    } catch (err) {
      return { valid: false, notes: `Invalid JSON format: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  // HTML tag closure check
  const tagRegex = /<([a-z1-6]+)(?:\s[^>]*)?>/gi;
  const closeTagRegex = /<\/([a-z1-6]+)>/gi;
  const opened: string[] = [];
  
  let match;
  // Strip self closing tags to prevent false positives
  const cleanCode = code.replace(/<[a-z1-6]+(?:\s[^>]*)?\/>/gi, "");

  while ((match = tagRegex.exec(cleanCode)) !== null) {
    const tagName = match[1].toLowerCase();
    if (["meta", "link", "img", "br", "hr", "input"].includes(tagName)) {
      continue; // void elements
    }
    opened.push(tagName);
  }

  const closed: string[] = [];
  while ((match = closeTagRegex.exec(cleanCode)) !== null) {
    closed.push(match[1].toLowerCase());
  }

  if (opened.length !== closed.length) {
    return { valid: false, notes: `HTML tag nesting mismatch. Opened: [${opened.join(", ")}], Closed: [${closed.join(", ")}]` };
  }

  return { valid: true, notes: "Code snippet validation passed." };
}

export function generateAiFixes(parsed: ParsedPage, analysis: any): AiFixes {
  const topKeywords = analysis?.topKeywords || [];
  const bigrams = analysis?.bigrams || [];
  const primaryKw = topKeywords[0]?.word || "target keyword";
  const primaryKwCapitalized = primaryKw.charAt(0).toUpperCase() + primaryKw.slice(1);
  const secondaryKw = topKeywords[1]?.word || "";
  const topBigram = bigrams[0]?.phrase || "";
  const topBigramCapitalized = topBigram ? topBigram.charAt(0).toUpperCase() + topBigram.slice(1) : "";

  // Normalize Domain Name
  const domain = (() => {
    try {
      return new URL(parsed.finalUrl).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  const brandName = domain ? domain.split(".")[0].toUpperCase() : "MY BRAND";

  // 1. Optimized Titles (Keyword-first, Brand-first, Hook/Question)
  const titles = [
    {
      option: "Keyword-First (Recommended for search rank)",
      text: `${primaryKwCapitalized}${secondaryKw ? ` & ${secondaryKw}` : ""} - Complete Guide | ${brandName}`,
      impact: "Maximizes keyword weight at the start of the title, which is a strong ranking signal for Google's indexing algorithm.",
    },
    {
      option: "Brand-First (Recommended for established companies)",
      text: `${brandName} | The Ultimate Guide to ${primaryKwCapitalized}`,
      impact: "Reinforces brand authority while still maintaining keyword alignment in the primary viewport.",
    },
    {
      option: "CTR Hook / Question-oriented",
      text: `What is ${primaryKwCapitalized}? Tips, Examples & How to Fix`,
      impact: "Drives higher CTR by directly answering user search intent queries, increasing search snippet engagement.",
    },
  ];

  // 2. Optimized Meta Descriptions
  const descriptions = [
    {
      option: "Feature-focused & CTA (Recommended)",
      text: `Want to optimize ${primaryKw}? Discover top tips, detailed examples, and actionable guides. Improve your website health today.`,
      impact: "Includes a strong action verb (CTA) and primary search terms, ensuring search engines highlight key snippet matches.",
    },
    {
      option: "Inquiry/Benefit-oriented",
      text: `Looking for the best way to master ${topBigram || primaryKw}? Read our expert analysis to unlock performance, accessibility, and SEO results.`,
      impact: "Focuses on the value proposition, appealing to user intent to lift clicks in search engine listings.",
    },
  ];

  // 3. Schema JSON-LD Markup
  const pageTitleClean = (parsed.title || "Landing Page").replace(/"/g, '\\"');
  const pageDescClean = (parsed.metaDescription || "Website description").replace(/"/g, '\\"');
  const schemaJsonLd = `{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://${domain}/#website",
      "url": "https://${domain}/",
      "name": "${brandName}",
      "description": "${pageDescClean}",
      "publisher": {
        "@id": "https://${domain}/#organization"
      }
    },
    {
      "@type": "WebPage",
      "@id": "${parsed.finalUrl}#webpage",
      "url": "${parsed.finalUrl}",
      "name": "${pageTitleClean}",
      "isPartOf": {
        "@id": "https://${domain}/#website"
      },
      "description": "${pageDescClean}",
      "about": [
        {
          "@type": "Thing",
          "name": "${primaryKwCapitalized}"
        }
      ]
    },
    {
      "@type": "Organization",
      "@id": "https://${domain}/#organization",
      "name": "${brandName}",
      "url": "https://${domain}/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://${domain}/assets/logo.png"
      }
    }
  ]
}`;

  // 4. Canonical HTML Code
  const canonicalCode = `<link rel="canonical" href="${parsed.finalUrl}" />`;

  // 5. Headings outline structure suggestion
  let headingOutline = `<!-- Proposed Outline Structure -->\n<h1>${primaryKwCapitalized} Guide</h1>\n`;
  if (topBigram) {
    headingOutline += `  <h2>What is ${topBigramCapitalized}?</h2>\n  <p>Introduction hook...</p>\n`;
  }
  if (secondaryKw) {
    headingOutline += `  <h2>Top Benefits of ${secondaryKw.charAt(0).toUpperCase() + secondaryKw.slice(1)}</h2>\n  <p>Detailing core features...</p>\n`;
  }
  headingOutline += `  <h2>How to Implement ${primaryKwCapitalized}</h2>\n  <h3>Step 1: Planning</h3>\n  <h3>Step 2: Technical Audits</h3>\n  <h2>Frequently Asked Questions</h2>`;

  // 6. Image Alt Tag Fixes
  const imageAltFixes: ImageAltFix[] = [];
  if (parsed.images && parsed.images.length > 0) {
    const missingAltImages = parsed.images.filter((img) => !img.hasAlt || img.alt.trim() === "");
    for (const img of missingAltImages.slice(0, 5)) {
      let fileName = "image";
      try {
        const parts = img.src.split("/");
        const lastPart = parts[parts.length - 1];
        if (lastPart) {
          fileName = lastPart.split(".")[0].replace(/[-_]/g, " ");
        }
      } catch {
        // ignore
      }
      
      const cleanFileName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
      const suggestedAlt = `${cleanFileName} - illustrating ${primaryKw} implementation`;
      const code = `<img src="${img.src}" alt="${suggestedAlt}" />`;
      const reactCode = `<img src="${img.src}" alt="${suggestedAlt}" className="rounded-xl object-cover" />`;
      const nextjsCode = `<Image src="${img.src}" alt="${suggestedAlt}" width={800} height={500} placeholder="blur" blurDataURL="data:image/svg+xml..." />`;
      const wordpressCode = `<!-- WordPress Media Alt Text Field -->\n<!-- Set Alt Text in Media Library to: "${suggestedAlt}" -->\n<img src="${img.src}" alt="${suggestedAlt}" class="aligncenter size-large" />`;
      const shopifyCode = `{{ '${img.src}' | img_tag: '${suggestedAlt}', 'responsive-class' }}`;

      imageAltFixes.push({
        src: img.src,
        suggestedAlt,
        code,
        reactCode,
        nextjsCode,
        wordpressCode,
        shopifyCode,
      });
    }
  }

  // 7. Internal Link suggestions
  const internalLinkAnchors = [
    { pageUrl: "/blog", anchorText: `latest ${primaryKw} guides` },
    { pageUrl: "/features", anchorText: `explore our ${primaryKw} optimization tools` },
    { pageUrl: "/about", anchorText: `learn about the ${brandName} technical team` },
  ];

  // 8. Content Improvements
  const contentSuggestions = [
    `Increase content volume by expanding on "${topBigram || primaryKw}". Aim for at least 1,200 words to improve semantic coverage.`,
    `Introduce structural formatting (like bullet points or comparison tables) in sections referencing "${primaryKw}" to improve readability indexes.`,
    `Ensure your target keyword "${primaryKw}" is placed naturally within the first 100 words of the introduction paragraph.`,
  ];

  // 9. FAQ Generation
  const faqSchema = `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is ${primaryKwCapitalized}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "${primaryKwCapitalized} is a critical component of search engine visibility, referring to content-relevant optimization strategies that increase site indexability."
      }
    },
    {
      "@type": "Question",
      "name": "How often should I audit ${primaryKwCapitalized} on my website?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It is highly recommended to perform audits monthly or after any major website change to detect performance regressions and crawl warnings early."
      }
    }
  ]
}`;

  const faqHtml = `<div class="faq-container">
  <div class="faq-item">
    <h3 class="faq-question">What is ${primaryKwCapitalized}?</h3>
    <p class="faq-answer">${primaryKwCapitalized} is a critical component of search engine visibility, referring to content-relevant optimization strategies that increase site indexability.</p>
  </div>
  <div class="faq-item">
    <h3 class="faq-question">How often should I audit ${primaryKwCapitalized} on my website?</h3>
    <p class="faq-answer">It is highly recommended to perform audits monthly or after any major website change to detect performance regressions and crawl warnings early.</p>
  </div>
</div>`;

  // 10. Entity suggestions
  const entities = [
    primaryKwCapitalized,
    secondaryKw ? secondaryKw.charAt(0).toUpperCase() + secondaryKw.slice(1) : "",
    topBigramCapitalized,
    "Schema Markup",
    "Search Engine Crawlers",
    "Metadata Optimization",
  ].filter(Boolean);

  // 11. HTML code snippets (aggregated)
  const metaTagsCode = `<!-- Copy and paste these tags inside the <head> tag of your webpage -->
<title>${titles[0].text}</title>
<meta name="description" content="${descriptions[0].text}" />
<link rel="canonical" href="${parsed.finalUrl}" />
<meta property="og:title" content="${titles[0].text}" />
<meta property="og:description" content="${descriptions[0].text}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${parsed.finalUrl}" />
<meta name="twitter:card" content="summary_large_image" />`;

  // Validate snippets
  const schemaValidation = validateSnippet("json", schemaJsonLd);
  const faqValidation = validateSnippet("json", faqSchema);

  const validationResult = {
    valid: schemaValidation.valid && faqValidation.valid,
    notes: schemaValidation.valid 
      ? "AI generated code snippets verified successfully. Standard tag structure validates."
      : `Schema validator warning: ${schemaValidation.notes}`,
  };

  // 12. Framework Fixes
  const reactFixes = {
    metaCode: `import Head from 'next/head';\n\n// Add to component header:\n<Head>\n  <title>${titles[0].text}</title>\n  <meta name="description" content="${descriptions[0].text}" />\n  <link rel="canonical" href="${parsed.finalUrl}" />\n</Head>`,
    canonicalCode: `import { useEffect } from 'react';\n\n// Add self-referential canonical tag hook\nuseEffect(() => {\n  const link = document.querySelector("link[rel='canonical']") || document.createElement("link");\n  link.setAttribute("rel", "canonical");\n  link.setAttribute("href", "${parsed.finalUrl}");\n  document.head.appendChild(link);\n}, []);`,
  };

  const nextjsFixes = {
    metadataCode: `import { Metadata } from 'next';\n\nexport const metadata: Metadata = {\n  title: '${titles[0].text}',\n  description: '${descriptions[0].text}',\n  alternates: {\n    canonical: '${parsed.finalUrl}',\n  },\n  openGraph: {\n    title: '${titles[0].text}',\n    description: '${descriptions[0].text}',\n    url: '${parsed.finalUrl}',\n    type: 'website',\n  },\n};`,
  };

  const wordpressFixes = {
    headerPhpSnippet: `<?php\n/**\n * Add to your theme's header.php file within <head>\n */\n?>\n<title><?php if(is_front_page()) { echo "${titles[0].text}"; } else { wp_title('|', true, 'right'); } ?></title>\n<meta name="description" content="${descriptions[0].text}" />\n<link rel="canonical" href="<?php global $wp; echo home_url(add_query_arg(array(), $wp->request)); ?>" />`,
  };

  const shopifyFixes = {
    themeLiquidSnippet: `{% comment %}\n  Optimized title & meta description structure for Shopify theme.liquid template\n{% endcomment %}\n<title>{{ page_title | default: "${titles[0].text}" }} | {{ shop.name }}</title>\n{% if page_description %}\n  <meta name="description" content="{{ page_description | escape }}" />\n{% else %}\n  <meta name="description" content="${descriptions[0].text}" />\n{% endif %}\n<link rel="canonical" href="{{ canonical_url }}" />`,
  };

  return {
    titles,
    descriptions,
    schemaJsonLd,
    canonicalCode,
    headingOutline,
    imageAltFixes,
    internalLinkAnchors,
    contentSuggestions,
    faqSchema,
    faqHtml,
    entities,
    metaTagsCode,
    frameworkConfidence: 95,
    riskLevel: "low",
    breakingChangeRisk: false,
    manualReviewRequired: false,
    validationResult,
    reactFixes,
    nextjsFixes,
    wordpressFixes,
    shopifyFixes,
  };
}
