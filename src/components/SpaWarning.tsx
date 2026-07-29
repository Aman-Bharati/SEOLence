import { AlertTriangle, Info } from "lucide-react";

interface SpaWarningProps {
  note: string;
}

export function SpaWarning({ note }: SpaWarningProps) {
  return (
    <div className="bg-amber-500/8 border border-amber-500/25 rounded-2xl p-5 animate-fade-in-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 flex-shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-amber-300 mb-1">
            Client-side rendered page detected
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">{note}</p>
          <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-cyan-400" />
            <p className="leading-relaxed">
              The metadata in <code className="font-mono text-cyan-400">&lt;head&gt;</code> (title, OG tags, Twitter cards) was still captured and analyzed below. This is also what search engine crawlers see if the site isn't pre-rendered — which is itself an SEO concern.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
