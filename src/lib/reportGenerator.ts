import type { AnalysisResult } from "../types";
import { STOP_WORDS } from "./analyzer";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(): string {
  return new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#fb923c";
  return "#f43f5e";
}

function insightIcon(type: string): string {
  switch (type) {
    case "strength": return "&#10004;";
    case "weakness": return "&#9888;";
    case "recommendation": return "&#128161;";
    default: return "&#8226;";
  }
}

export function generateReportHtml(result: AnalysisResult): string {
  const { parsed, contentQuality } = result;
  const domain = (() => {
    try { return new URL(parsed.finalUrl).hostname; } catch { return parsed.finalUrl; }
  })();

  // Build word frequency rows (all content words, sorted by count)
  const allWords = Array.from(result.wordFrequency.entries())
    .filter(([word]) => !STOP_WORDS.has(word))
    .sort((a, b) => b[1] - a[1]);

  const wordRows = allWords
    .map(([word, count], i) => {
      const density = parsed.wordCount > 0 ? ((count / parsed.wordCount) * 100).toFixed(2) : "0";
      return `<tr>
        <td>${i + 1}</td>
        <td class="mono">${escapeHtml(word)}</td>
        <td class="num">${count}</td>
        <td class="num">${density}%</td>
      </tr>`;
    })
    .join("");

  // Stop word frequency
  const stopWords = Array.from(result.wordFrequency.entries())
    .filter(([word]) => STOP_WORDS.has(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  const stopRows = stopWords
    .map(([word, count]) => `<tr><td class="mono">${escapeHtml(word)}</td><td class="num">${count}</td></tr>`)
    .join("");

  // Full paragraph content
  const paragraphHtml = (parsed.paragraphs.length > 0 ? parsed.paragraphs : [])
    .map((p, i) => `<p class="extracted-p"><span class="p-num">${i + 1}</span>${escapeHtml(p)}</p>`)
    .join("");

  // Headings
  const headingHtml = parsed.headings
    .map((h) => `<div class="heading-row h${h.level}">H${h.level} &mdash; ${escapeHtml(h.text)}</div>`)
    .join("");

  // Insights
  const strengths = result.insights.filter((i) => i.type === "strength");
  const weaknesses = result.insights.filter((i) => i.type === "weakness");
  const recommendations = result.insights.filter((i) => i.type === "recommendation");

  const insightList = (items: typeof result.insights) => items
    .map((item) => `<li class="insight ${item.type}">
      <span class="i-icon">${insightIcon(item.type)}</span>
      <div><strong>${escapeHtml(item.category)}</strong> <span class="sev ${item.severity}">${item.severity}</span><br>${escapeHtml(item.message)}</div>
    </li>`)
    .join("");

  // Images
  const imageHtml = parsed.images.length > 0
    ? parsed.images.map((img) => `<tr>
        <td class="mono break">${escapeHtml(img.src.split("/").pop() || img.src)}</td>
        <td>${img.hasAlt && img.alt ? escapeHtml(img.alt) : '<span class="missing">Missing</span>'}</td>
        <td>${img.hasAlt ? "Yes" : "No"}</td>
      </tr>`).join("")
    : '<tr><td colspan="3" class="empty">No images found</td></tr>';

  const seoColor = scoreColor(result.seoScore);
  const readColor = scoreColor(result.readabilityScore);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SEO Report — ${escapeHtml(domain)} — ${formatDate()}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f8fafc;
    color: #1e293b;
    line-height: 1.6;
    padding: 40px 20px;
  }
  .container { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .header {
    background: linear-gradient(135deg, #0a0e1a 0%, #131c31 100%);
    color: #f1f5f9;
    padding: 40px;
  }
  .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
  .header .url { font-family: monospace; color: #64748b; font-size: 14px; word-break: break-all; }
  .header .date { color: #94a3b8; font-size: 13px; margin-top: 12px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-bottom: 16px; }
  .badge.live { background: rgba(16,185,129,0.15); color: #34d399; }
  .badge.spa { background: rgba(245,158,11,0.15); color: #fbbf24; }
  .section { padding: 32px 40px; border-bottom: 1px solid #e2e8f0; }
  .section:last-child { border-bottom: none; }
  .section h2 { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: #0f172a; display: flex; align-items: center; gap: 8px; }
  .section h2 .num { background: #0ea5e9; color: #fff; font-size: 12px; padding: 2px 8px; border-radius: 12px; }
  .score-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .score-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
  .score-card .val { font-size: 36px; font-weight: 700; }
  .score-card .label { font-size: 12px; color: #64748b; margin-top: 4px; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
  .stat { background: #f8fafc; border-radius: 10px; padding: 14px; text-align: center; }
  .stat .v { font-size: 22px; font-weight: 700; color: #0f172a; }
  .stat .l { font-size: 11px; color: #64748b; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 10px 12px; background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
  tr:hover td { background: #f8fafc; }
  .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
  .num { text-align: right; font-family: monospace; }
  .break { word-break: break-all; }
  .missing { color: #f43f5e; font-style: italic; }
  .empty { text-align: center; color: #94a3b8; padding: 20px; }
  .extracted-p { padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; line-height: 1.7; }
  .p-num { display: inline-block; min-width: 28px; font-size: 11px; font-weight: 600; color: #0ea5e9; margin-right: 8px; }
  .heading-row { padding: 6px 0; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
  .heading-row.h1 { font-weight: 700; font-size: 16px; color: #0f172a; }
  .heading-row.h2 { font-weight: 600; color: #1e293b; padding-left: 16px; }
  .heading-row.h3 { color: #334155; padding-left: 32px; }
  .heading-row.h4, .heading-row.h5, .heading-row.h6 { color: #64748b; padding-left: 48px; }
  .insight-list { list-style: none; }
  .insight { display: flex; gap: 12px; padding: 12px; border-radius: 10px; margin-bottom: 8px; font-size: 13px; }
  .insight.strength { background: #ecfdf5; }
  .insight.weakness { background: #fef2f2; }
  .insight.recommendation { background: #eff6ff; }
  .i-icon { font-size: 16px; flex-shrink: 0; }
  .sev { font-size: 10px; padding: 1px 6px; border-radius: 8px; font-weight: 600; text-transform: uppercase; }
  .sev.high { background: #fee2e2; color: #dc2626; }
  .sev.medium { background: #fef3c7; color: #d97706; }
  .sev.low { background: #d1fae5; color: #059669; }
  .phrase-list { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .phrase-item { padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; display: flex; justify-content: space-between; }
  .phrase-item .c { font-family: monospace; color: #64748b; }
  .meta-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
  .meta-row .k { color: #64748b; }
  .meta-row .v { font-weight: 500; text-align: right; word-break: break-all; max-width: 60%; }
  .meta-row .ok { color: #059669; }
  .meta-row .warn { color: #d97706; }
  .meta-row .bad { color: #dc2626; }
  .meta-block { background: #f8fafc; border-radius: 10px; padding: 14px; margin-top: 8px; font-size: 13px; color: #475569; }
  .toc { background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 0; }
  .toc h3 { font-size: 13px; text-transform: uppercase; color: #64748b; margin-bottom: 12px; letter-spacing: 0.5px; }
  .toc a { display: block; padding: 4px 0; color: #0ea5e9; text-decoration: none; font-size: 14px; }
  .toc a:hover { text-decoration: underline; }
  .footer { padding: 24px 40px; background: #f8fafc; text-align: center; font-size: 12px; color: #94a3b8; }
  .warning-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #92400e; }
  .grade-box { display: inline-block; padding: 8px 16px; border-radius: 10px; font-size: 28px; font-weight: 700; }
  .grade-A, .grade-A\+ { background: #d1fae5; color: #059669; }
  .grade-B, .grade-B\+ { background: #cffafe; color: #0891b2; }
  .grade-C, .grade-C\+ { background: #fef3c7; color: #d97706; }
  .grade-D, .grade-D\+ { background: #fed7aa; color: #ea580c; }
  .grade-F { background: #fee2e2; color: #dc2626; }
  .grade-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
  .grade-item { background: #f8fafc; border-radius: 10px; padding: 14px; text-align: center; }
  .grade-item .g { font-size: 24px; font-weight: 700; }
  .grade-item .cat { font-size: 11px; color: #64748b; margin-top: 4px; }
  .grade-item .bar { height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 8px; overflow: hidden; }
  .grade-item .bar-fill { height: 100%; border-radius: 2px; }
  .serp-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; max-width: 600px; font-family: arial, sans-serif; }
  .serp-url { color: #475569; font-size: 13px; }
  .serp-title { color: #1a0dab; font-size: 18px; margin-top: 4px; }
  .serp-desc { color: #545454; font-size: 13px; margin-top: 4px; line-height: 1.5; }
  .code-block { background: #1e293b; color: #6ee7b7; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; margin-top: 8px; overflow-x: auto; }
  .action-item { display: flex; gap: 12px; padding: 14px; background: #f8fafc; border-radius: 10px; margin-bottom: 8px; }
  .action-num { width: 28px; height: 28px; border-radius: 8px; background: #0ea5e9; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
  .action-impact { color: #dc2626; font-weight: 600; font-size: 12px; }
  @media print {
    body { padding: 0; background: #fff; }
    .container { box-shadow: none; border-radius: 0; }
    .section { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <span class="badge live">SEO Analysis Report</span>
    ${parsed.isClientRendered ? '<span class="badge spa">Client-rendered SPA &mdash; limited content</span>' : ""}
    <h1>${escapeHtml(parsed.title || domain)}</h1>
    <div class="url">${escapeHtml(parsed.finalUrl)}</div>
    <div class="date">Generated on ${formatDate()} &middot; SEO Lens</div>
  </div>

  <div class="section">
    <div class="toc">
      <h3>Report Contents</h3>
      <a href="#scores">1. SEO Scores</a>
      <a href="#grades">2. SEO Grade Card</a>
      <a href="#serp">3. SERP Preview</a>
      <a href="#meta-gen">4. AI Meta Tag Generator</a>
      <a href="#content">5. Content Statistics</a>
      <a href="#meta">6. Meta Tags &amp; Technical Details</a>
      <a href="#words">7. Complete Word Frequency Report</a>
      <a href="#phrases">8. Key Phrases (Bigrams &amp; Trigrams)</a>
      <a href="#structure">9. Heading Structure</a>
      <a href="#images">10. Image Analysis</a>
      <a href="#text">11. Full Extracted Page Text &amp; Paragraphs</a>
      <a href="#action">12. Priority Action Plan</a>
      <a href="#verification">13. Verification Checklist &amp; Confidence</a>
      <a href="#insights">14. SEO Insights &amp; Recommendations</a>
      <a href="#keywords">15. Recommended Keywords</a>
    </div>
  </div>

  ${parsed.isClientRendered && parsed.renderNote ? `
  <div class="section">
    <div class="warning-box">
      <strong>Client-side rendered page detected.</strong> ${escapeHtml(parsed.renderNote)}
    </div>
  </div>` : ""}

  <div class="section" id="scores">
    <h2><span class="num">1</span> SEO Scores</h2>
    <div class="score-grid">
      <div class="score-card">
        <div class="val" style="color:${seoColor}">${result.seoScore}</div>
        <div class="label">SEO Score (0-100)</div>
      </div>
      <div class="score-card">
        <div class="val" style="color:${readColor}">${result.readabilityScore}</div>
        <div class="label">Readability (${escapeHtml(result.readabilityLabel || "N/A")})</div>
      </div>
      <div class="score-card">
        <div class="val" style="color:#0ea5e9">${contentQuality.lexicalDiversity}%</div>
        <div class="label">Lexical Diversity</div>
      </div>
    </div>
  </div>

  <div class="section" id="grades">
    <h2><span class="num">2</span> SEO Grade Card</h2>
    <div style="text-align:center;margin-bottom:20px;">
      <span class="grade-box grade-${result.gradeCard.overallGrade.charAt(0)}">${result.gradeCard.overallGrade}</span>
      <p style="color:#64748b;font-size:13px;margin-top:8px;">Overall Grade</p>
    </div>
    <div class="grade-grid">
      ${result.gradeCard.entries.map(e => {
        const pct = Math.round((e.score / e.maxScore) * 100);
        const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#f43f5e";
        return `<div class="grade-item">
          <div class="g" style="color:${color}">${e.grade}</div>
          <div class="cat">${escapeHtml(e.category)}</div>
          <div class="bar"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <div style="font-size:10px;color:#94a3b8;margin-top:4px;">${e.score}/${e.maxScore}</div>
        </div>`;
      }).join("")}
    </div>
  </div>

  <div class="section" id="serp">
    <h2><span class="num">3</span> SERP Preview</h2>
    <p style="color:#64748b;font-size:13px;margin-bottom:12px;">How your page appears in Google search results:</p>
    <div class="serp-box">
      <div class="serp-url">${escapeHtml(domain)}</div>
      <div class="serp-title">${escapeHtml(result.parsed.title || result.metaSuggestions.suggestedTitle)}</div>
      <div class="serp-desc">${escapeHtml(result.parsed.metaDescription || result.metaSuggestions.suggestedDescription || "No meta description — Google will auto-generate one.")}</div>
    </div>
    <p style="color:#64748b;font-size:12px;margin-top:8px;">Title: ${result.parsed.title?.length || 0} chars | Description: ${result.parsed.metaDescription?.length || 0} chars</p>
  </div>

  <div class="section" id="meta-gen">
    <h2><span class="num">4</span> AI Meta Tag Generator</h2>
    <p style="color:#64748b;font-size:13px;margin-bottom:16px;">Auto-generated optimized meta tags based on your page content. Copy these into your HTML.</p>
    <h3 style="font-size:14px;margin-bottom:8px;">Suggested Title (${result.metaSuggestions.suggestedTitle.length} chars)</h3>
    <p style="font-size:14px;color:#1e293b;margin-bottom:4px;">${escapeHtml(result.metaSuggestions.suggestedTitle)}</p>
    <div class="code-block">&lt;title&gt;${escapeHtml(result.metaSuggestions.suggestedTitle)}&lt;/title&gt;</div>
    <p style="color:#64748b;font-size:12px;margin-top:6px;">${escapeHtml(result.metaSuggestions.titleReason)}</p>
    <h3 style="font-size:14px;margin:16px 0 8px;">Suggested Description (${result.metaSuggestions.suggestedDescription.length} chars)</h3>
    <p style="font-size:14px;color:#1e293b;margin-bottom:4px;">${escapeHtml(result.metaSuggestions.suggestedDescription)}</p>
    <div class="code-block">&lt;meta name="description" content="${escapeHtml(result.metaSuggestions.suggestedDescription)}" /&gt;</div>
    <p style="color:#64748b;font-size:12px;margin-top:6px;">${escapeHtml(result.metaSuggestions.descriptionReason)}</p>
    <h3 style="font-size:14px;margin:16px 0 8px;">Open Graph Tags</h3>
    <div class="code-block">&lt;meta property="og:title" content="${escapeHtml(result.metaSuggestions.suggestedTitle)}" /&gt;<br>&lt;meta property="og:description" content="${escapeHtml(result.metaSuggestions.suggestedDescription)}" /&gt;<br>&lt;meta property="og:type" content="website" /&gt;</div>
  </div>

  <div class="section" id="content">
    <h2><span class="num">5</span> Content Statistics</h2>
    <div class="stat-grid">
      <div class="stat"><div class="v">${parsed.wordCount.toLocaleString()}</div><div class="l">Total Words</div></div>
      <div class="stat"><div class="v">${contentQuality.uniqueWords.toLocaleString()}</div><div class="l">Unique Words</div></div>
      <div class="stat"><div class="v">${contentQuality.sentenceCount}</div><div class="l">Sentences</div></div>
      <div class="stat"><div class="v">${contentQuality.avgWordsPerSentence}</div><div class="l">Avg Words/Sentence</div></div>
      <div class="stat"><div class="v">${parsed.headings.length}</div><div class="l">Headings</div></div>
      <div class="stat"><div class="v">${parsed.images.length}</div><div class="l">Images</div></div>
      <div class="stat"><div class="v">${parsed.links.total}</div><div class="l">Total Links</div></div>
      <div class="stat"><div class="v">${parsed.links.internal}</div><div class="l">Internal Links</div></div>
      <div class="stat"><div class="v">${parsed.links.external}</div><div class="l">External Links</div></div>
      <div class="stat"><div class="v">${result.stopWordCount.toLocaleString()}</div><div class="l">Stop Words</div></div>
    </div>
  </div>

  <div class="section" id="meta">
    <h2><span class="num">6</span> Meta Tags &amp; Technical Details</h2>
    <div class="meta-row"><span class="k">Title Tag (${parsed.title?.length ?? 0} chars)</span><span class="v ${parsed.title ? (parsed.title.length >= 30 && parsed.title.length <= 60 ? "ok" : "warn") : "bad"}">${parsed.title ? escapeHtml(parsed.title) : "Missing"}</span></div>
    <div class="meta-row"><span class="k">Meta Description (${parsed.metaDescription?.length ?? 0} chars)</span><span class="v ${parsed.metaDescription ? (parsed.metaDescription.length >= 70 && parsed.metaDescription.length <= 160 ? "ok" : "warn") : "bad"}">${parsed.metaDescription ? escapeHtml(parsed.metaDescription) : "Missing"}</span></div>
    <div class="meta-row"><span class="k">Canonical URL</span><span class="v ${parsed.canonical ? "ok" : "warn"}">${parsed.canonical ? escapeHtml(parsed.canonical) : "Missing"}</span></div>
    <div class="meta-row"><span class="k">Viewport</span><span class="v ${parsed.viewport ? "ok" : "bad"}">${parsed.viewport ? escapeHtml(parsed.viewport) : "Missing"}</span></div>
    <div class="meta-row"><span class="k">Language</span><span class="v">${parsed.lang ? escapeHtml(parsed.lang) : "Not set"}</span></div>
    <div class="meta-row"><span class="k">Robots</span><span class="v">${parsed.robots ? escapeHtml(parsed.robots) : "Not set"}</span></div>
    <div class="meta-row"><span class="k">Charset</span><span class="v">${parsed.charset ? escapeHtml(parsed.charset) : "Not set"}</span></div>
    <div class="meta-row"><span class="k">HTTP Status</span><span class="v ${parsed.statusCode >= 200 && parsed.statusCode < 300 ? "ok" : "warn"}">${parsed.statusCode}</span></div>
    <div class="meta-row"><span class="k">HTML Size</span><span class="v">${(parsed.rawHtmlLength / 1024).toFixed(1)} KB</span></div>
    ${Object.keys(parsed.ogTags).length > 0 ? `<div class="meta-row"><span class="k">Open Graph Tags</span><span class="v ok">${Object.keys(parsed.ogTags).length} tags</span></div><div class="meta-block">${Object.entries(parsed.ogTags).map(([k,v]) => `<strong>${escapeHtml(k)}</strong>: ${escapeHtml(v)}<br>`).join("")}</div>` : '<div class="meta-row"><span class="k">Open Graph Tags</span><span class="v bad">Missing</span></div>'}
    ${Object.keys(parsed.twitterTags).length > 0 ? `<div class="meta-row"><span class="k">Twitter Card Tags</span><span class="v ok">${Object.keys(parsed.twitterTags).length} tags</span></div><div class="meta-block">${Object.entries(parsed.twitterTags).map(([k,v]) => `<strong>${escapeHtml(k)}</strong>: ${escapeHtml(v)}<br>`).join("")}</div>` : '<div class="meta-row"><span class="k">Twitter Card Tags</span><span class="v bad">Missing</span></div>'}
  </div>

  <div class="section" id="words">
    <h2><span class="num">7</span> Complete Word Frequency Report</h2>
    <p style="margin-bottom:16px;color:#64748b;font-size:13px;">${allWords.length} unique content words (stop words filtered). Total words on page: ${parsed.wordCount.toLocaleString()}.</p>
    <table>
      <thead><tr><th>#</th><th>Word</th><th style="text-align:right">Count</th><th style="text-align:right">Density</th></tr></thead>
      <tbody>${wordRows || '<tr><td colspan="4" class="empty">No content words found</td></tr>'}</tbody>
    </table>
    ${stopRows ? `<h3 style="margin-top:24px;margin-bottom:12px;font-size:15px;color:#475569;">Top Stop Words &amp; Filler Terms</h3>
    <table>
      <thead><tr><th>Word</th><th style="text-align:right">Count</th></tr></thead>
      <tbody>${stopRows}</tbody>
    </table>` : ""}
  </div>

  <div class="section" id="phrases">
    <h2><span class="num">8</span> Key Phrases</h2>
    <div class="phrase-list">
      <div>
        <h3 style="margin-bottom:12px;font-size:15px;color:#475569;">Bigrams (2-word phrases)</h3>
        ${result.bigrams.length > 0 ? result.bigrams.slice(0,15).map(b => `<div class="phrase-item"><span class="mono">${escapeHtml(b.phrase)}</span><span class="c">${b.count}&times;</span></div>`).join("") : '<p class="empty">No recurring bigrams found</p>'}
      </div>
      <div>
        <h3 style="margin-bottom:12px;font-size:15px;color:#475569;">Trigrams (3-word phrases)</h3>
        ${result.trigrams.length > 0 ? result.trigrams.slice(0,15).map(t => `<div class="phrase-item"><span class="mono">${escapeHtml(t.phrase)}</span><span class="c">${t.count}&times;</span></div>`).join("") : '<p class="empty">No recurring trigrams found</p>'}
      </div>
    </div>
    ${result.overusedWords.length > 0 ? `<h3 style="margin-top:20px;margin-bottom:8px;font-size:15px;color:#dc2626;">Overused Words (density &gt;4%)</h3>
    <table><thead><tr><th>Word</th><th style="text-align:right">Count</th><th style="text-align:right">Density</th></tr></thead>
    <tbody>${result.overusedWords.map(w => `<tr><td class="mono">${escapeHtml(w.word)}</td><td class="num">${w.count}</td><td class="num" style="color:#dc2626">${w.density}%</td></tr>`).join("")}</tbody></table>` : '<p style="margin-top:16px;color:#059669;font-size:13px;">&#10004; No overused words detected</p>'}
  </div>

  <div class="section" id="structure">
    <h2><span class="num">9</span> Heading Structure (${parsed.headings.length} total)</h2>
    ${headingHtml || '<p class="empty">No headings found on this page</p>'}
  </div>

  <div class="section" id="images">
    <h2><span class="num">10</span> Image Analysis (${parsed.images.length} images)</h2>
    <table>
      <thead><tr><th>Filename</th><th>Alt Text</th><th>Has Alt</th></tr></thead>
      <tbody>${imageHtml}</tbody>
    </table>
  </div>

  <div class="section" id="text">
    <h2><span class="num">11</span> Full Extracted Page Text &amp; Paragraphs</h2>
    <p style="margin-bottom:16px;color:#64748b;font-size:13px;">This is the complete visible text content extracted from the page. ${parsed.paragraphs.length} paragraph blocks found. This is exactly what the analyzer processed.</p>
    ${parsed.isClientRendered ? `<div class="warning-box" style="margin-bottom:16px;">This is a client-rendered SPA. Only the noscript fallback text and head metadata are available without JavaScript execution.</div>` : ""}
    ${paragraphHtml || '<p class="empty">No paragraph content was extractable from the page HTML.</p>'}
    ${parsed.visibleText && parsed.paragraphs.length === 0 ? `<div class="meta-block" style="margin-top:16px;"><strong>Raw visible text:</strong><br>${escapeHtml(parsed.visibleText)}</div>` : ""}
  </div>

  <div class="section" id="verification">
    <h2><span class="num">12</span> Verification Checklist</h2>
    <p style="color:#64748b;font-size:13px;margin-bottom:16px;">Every check shows expected vs actual values. This is the raw data behind your SEO score.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="border-bottom:2px solid #e2e8f0;">
          <th style="text-align:left;padding:8px;">Check</th>
          <th style="text-align:left;padding:8px;">Expected</th>
          <th style="text-align:left;padding:8px;">Actual</th>
          <th style="text-align:center;padding:8px;">Result</th>
          <th style="text-align:right;padding:8px;">Weight</th>
        </tr>
      </thead>
      <tbody>
        ${result.verificationChecks.map(c => `<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px;">
            <strong>${escapeHtml(c.label)}</strong>
            <div style="font-size:11px;color:#94a3b8;">${escapeHtml(c.category)}</div>
            ${c.notes ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">${escapeHtml(c.notes)}</div>` : ""}
          </td>
          <td style="padding:8px;color:#64748b;">${escapeHtml(c.expected)}</td>
          <td style="padding:8px;color:${c.passed ? "#059669" : "#dc2626"};">${escapeHtml(c.actual)}</td>
          <td style="padding:8px;text-align:center;">${c.passed ? "&#10004; Pass" : "&#10008; Fail"}</td>
          <td style="padding:8px;text-align:right;font-family:monospace;">${c.weight} pts</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:8px;">
      <strong style="font-size:14px;">Analysis Confidence: ${result.confidence.label} (${result.confidence.score}%)</strong>
      <div style="margin-top:8px;">
        ${result.confidence.factors.map(f => `<div style="font-size:12px;margin-bottom:4px;">
          ${f.status === "good" ? "&#9989;" : f.status === "warning" ? "&#9888;" : "&#10060;"}
          <strong>${escapeHtml(f.label)}</strong> — ${escapeHtml(f.detail)}
        </div>`).join("")}
      </div>
    </div>
  </div>

  <div class="section" id="action">
    <h2><span class="num">13</span> Priority Action Plan</h2>
    <p style="color:#64748b;font-size:13px;margin-bottom:16px;">${result.actionPlan.length} steps to improve your SEO score. Follow in order — highest impact first.</p>
    ${result.actionPlan.map(item => `<div class="action-item">
      <div class="action-num">${item.step}</div>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
          <strong style="font-size:14px;">${escapeHtml(item.title)}</strong>
          <span class="action-impact">+${item.impact} pts</span>
        </div>
        <p style="font-size:13px;color:#475569;margin-top:4px;line-height:1.5;">${escapeHtml(item.detail)}</p>
        <span style="font-size:11px;color:#94a3b8;">Effort: ${item.effort} | Category: ${escapeHtml(item.category)}</span>
      </div>
    </div>`).join("")}
    <p style="margin-top:12px;color:#64748b;font-size:13px;">Total potential improvement: <strong style="color:#0ea5e9">+${result.actionPlan.reduce((s, i) => s + i.impact, 0)} points</strong></p>
  </div>

  <div class="section" id="insights">
    <h2><span class="num">14</span> SEO Insights &amp; Recommendations</h2>
    <h3 style="margin-bottom:10px;font-size:15px;color:#059669;">Strengths (${strengths.length})</h3>
    <ul class="insight-list">${insightList(strengths) || '<li class="empty">No strengths detected</li>'}</ul>
    <h3 style="margin:20px 0 10px;font-size:15px;color:#dc2626;">Weaknesses (${weaknesses.length})</h3>
    <ul class="insight-list">${insightList(weaknesses) || '<li class="empty" style="color:#059669">No critical weaknesses found</li>'}</ul>
    <h3 style="margin:20px 0 10px;font-size:15px;color:#0ea5e9;">Recommendations (${recommendations.length})</h3>
    <ul class="insight-list">${insightList(recommendations)}</ul>
  </div>

  <div class="section" id="keywords">
    <h2><span class="num">15</span> Recommended Keywords</h2>
    <p style="margin-bottom:12px;color:#64748b;font-size:13px;">Suggested target keywords based on content analysis and page niche.</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      ${result.recommendedKeywords.map(kw => `<span style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:500;">${escapeHtml(kw)}</span>`).join("") || '<p class="empty">No recommendations available</p>'}
    </div>
  </div>

  <div class="footer">
    Generated by SEO Lens &middot; ${escapeHtml(domain)} &middot; ${formatDate()}<br>
    This report contains the complete extracted text and word analysis as captured by the SEO analyzer.
  </div>
</div>
</body>
</html>`;
}

export function downloadReport(result: AnalysisResult): void {
  const html = generateReportHtml(result);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const domain = (() => {
    try { return new URL(result.parsed.finalUrl).hostname.replace(/^www\./, ""); } catch { return "site"; }
  })();
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `seo-report-${domain}-${dateStr}.html`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
