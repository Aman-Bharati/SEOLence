import type { AnalysisResult } from "../types";
import { FileText, Type, BookOpen, Link2, Image as ImageIcon, Mic, Hash } from "lucide-react";

interface StatCardsProps {
  result: AnalysisResult;
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  delay: number;
}) {
  return (
    <div
      className="bg-ink-850/60 glass border border-ink-700 rounded-xl p-4 hover:border-cyan-400/20 transition-all duration-300 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-lg bg-ink-800 flex items-center justify-center text-cyan-400">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-display font-bold text-slate-100 tabular-nums">{value}</p>
      <p className="text-xs text-slate-400 font-medium mt-0.5">{label}</p>
      {sublabel && <p className="text-xs text-slate-600 mt-0.5">{sublabel}</p>}
    </div>
  );
}

export function StatCards({ result }: StatCardsProps) {
  const { parsed, contentQuality, readabilityLabel } = result;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <StatCard
        icon={<FileText className="w-4 h-4" />}
        label="Total Words"
        value={parsed.wordCount.toLocaleString()}
        sublabel={`${contentQuality.sentenceCount} sentences`}
        delay={0}
      />
      <StatCard
        icon={<Hash className="w-4 h-4" />}
        label="Unique Words"
        value={contentQuality.uniqueWords.toLocaleString()}
        sublabel={`${contentQuality.lexicalDiversity}% diversity`}
        delay={60}
      />
      <StatCard
        icon={<Type className="w-4 h-4" />}
        label="Headings"
        value={parsed.headings.length}
        sublabel={`${parsed.headings.filter((h) => h.level === 1).length} H1`}
        delay={120}
      />
      <StatCard
        icon={<ImageIcon className="w-4 h-4" />}
        label="Images"
        value={parsed.images.length}
        sublabel={`${parsed.images.filter((i) => i.hasAlt).length} with alt`}
        delay={180}
      />
      <StatCard
        icon={<Link2 className="w-4 h-4" />}
        label="Links"
        value={parsed.links.total}
        sublabel={`${parsed.links.internal} int / ${parsed.links.external} ext`}
        delay={240}
      />
      <StatCard
        icon={<Mic className="w-4 h-4" />}
        label="Readability"
        value={result.readabilityScore}
        sublabel={readabilityLabel}
        delay={300}
      />
      <StatCard
        icon={<BookOpen className="w-4 h-4" />}
        label="Avg Words/Sentence"
        value={contentQuality.avgWordsPerSentence}
        sublabel={`${contentQuality.longWords} long words`}
        delay={360}
      />
    </div>
  );
}
