import { useState, useRef } from "react";
import type { WebsiteAudit } from "../types";
import { BarChart3 } from "lucide-react";

interface ScoreTrendChartProps {
  audits: WebsiteAudit[];
}

type MetricKey = "overall" | "seo" | "performance" | "security" | "accessibility" | "content";

interface MetricConfig {
  key: MetricKey;
  label: string;
  color: string;
  gradientStart: string;
  gradientStop: string;
}

const METRICS: MetricConfig[] = [
  { key: "overall", label: "Overall Score", color: "#06b6d4", gradientStart: "rgba(6,182,212,0.25)", gradientStop: "rgba(6,182,212,0)" },
  { key: "seo", label: "SEO Engine", color: "#f43f5e", gradientStart: "rgba(244,63,94,0.2)", gradientStop: "rgba(244,63,94,0)" },
  { key: "performance", label: "Performance", color: "#a855f7", gradientStart: "rgba(168,85,247,0.2)", gradientStop: "rgba(168,85,247,0)" },
  { key: "security", label: "Security", color: "#10b981", gradientStart: "rgba(16,185,129,0.2)", gradientStop: "rgba(16,185,129,0)" },
  { key: "accessibility", label: "Accessibility", color: "#6366f1", gradientStart: "rgba(99,102,241,0.2)", gradientStop: "rgba(99,102,241,0)" },
  { key: "content", label: "Content Index", color: "#f59e0b", gradientStart: "rgba(245,158,11,0.2)", gradientStop: "rgba(245,158,11,0)" },
];

export function ScoreTrendChart({ audits }: ScoreTrendChartProps) {
  const [activeMetrics, setActiveMetrics] = useState<Record<MetricKey, boolean>>({
    overall: true,
    seo: false,
    performance: false,
    security: false,
    accessibility: false,
    content: false,
  });

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!audits || audits.length === 0) return null;

  // Chronological order (oldest to newest)
  const data = audits.slice().reverse();

  // Dimensions
  const viewWidth = 600;
  const viewHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = viewWidth - paddingLeft - paddingRight;
  const chartHeight = viewHeight - paddingTop - paddingBottom;

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getScoreValue = (audit: WebsiteAudit, key: MetricKey): number | null => {
    switch (key) {
      case "overall": return audit.overall_score;
      case "seo": return audit.seo_score;
      case "performance": return audit.performance_score;
      case "security": return audit.security_score;
      case "accessibility": return audit.accessibility_score;
      case "content": return audit.content_score;
      default: return 0;
    }
  };

  // Compute coordinates for a given metric key (preserving indexes)
  const getCoordinates = (key: MetricKey) => {
    return data.map((audit, idx) => {
      const score = getScoreValue(audit, key);
      const x = paddingLeft + (idx / Math.max(1, data.length - 1)) * chartWidth;
      const y = score !== null ? paddingTop + chartHeight - (score / 100) * chartHeight : 0;
      return { x, y, score };
    });
  };

  // Generate SVG path string (filtering out null points)
  const generatePath = (points: { x: number; y: number; score: number | null }[]) => {
    const validPoints = points.filter((p): p is { x: number; y: number; score: number } => p.score !== null);
    if (validPoints.length === 0) return "";
    if (validPoints.length === 1) {
      return `M ${validPoints[0].x} ${validPoints[0].y} L ${validPoints[0].x + 0.1} ${validPoints[0].y}`;
    }
    
    // Smooth Bezier Curve Path
    return validPoints.reduce((path, p, i, arr) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = arr[i - 1];
      const cpX1 = prev.x + (p.x - prev.x) / 3;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (2 * (p.x - prev.x)) / 3;
      const cpY2 = p.y;
      return `${path} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
    }, "");
  };

  // Generate closed area path for gradients
  const generateAreaPath = (points: { x: number; y: number; score: number | null }[]) => {
    const validPoints = points.filter((p): p is { x: number; y: number; score: number } => p.score !== null);
    const linePath = generatePath(points);
    if (!linePath || validPoints.length === 0) return "";
    return `${linePath} L ${validPoints[validPoints.length - 1].x} ${paddingTop + chartHeight} L ${validPoints[0].x} ${paddingTop + chartHeight} Z`;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    
    // Scale clientX back to SVG coordinates
    const scaleX = viewWidth / rect.width;
    const svgX = clientX * scaleX;

    // Find closest index
    let closestIdx = 0;
    let minDiff = Infinity;
    
    data.forEach((_, idx) => {
      const x = paddingLeft + (idx / Math.max(1, data.length - 1)) * chartWidth;
      const diff = Math.abs(x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setHoveredIdx(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  const hoveredAudit = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div ref={containerRef} className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 relative select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h3 className="font-display font-semibold text-slate-100">Interactive Score Trends</h3>
        </div>
        
        {/* Metric Legends / Visibility Toggles */}
        <div className="flex flex-wrap gap-2">
          {METRICS.map((metric) => {
            const isActive = activeMetrics[metric.key];
            return (
              <button
                key={metric.key}
                onClick={() => toggleMetric(metric.key)}
                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-ink-950 border-ink-700 text-slate-200"
                    : "bg-ink-950/20 border-ink-900/60 text-slate-500 hover:text-slate-400 hover:border-ink-800"
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: metric.color }}></span>
                <span>{metric.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          width="100%"
          height="100%"
          className="overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Defs for gradients */}
          <defs>
            {METRICS.map((metric) => (
              <linearGradient key={metric.key} id={`grad-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metric.color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={metric.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines (horizontal) */}
          {[0, 25, 50, 75, 100].map((level) => {
            const y = paddingTop + chartHeight - (level / 100) * chartHeight;
            return (
              <g key={level}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={viewWidth - paddingRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-500 text-[10px] font-mono font-medium"
                >
                  {level}%
                </text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {data.map((audit, idx) => {
            const x = paddingLeft + (idx / Math.max(1, data.length - 1)) * chartWidth;
            const dateStr = new Date(audit.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
            
            // Limit label density
            const shouldRenderLabel = data.length <= 8 || idx % Math.round(data.length / 5) === 0 || idx === data.length - 1;
            
            return (
              shouldRenderLabel && (
                <text
                  key={audit.id}
                  x={x}
                  y={viewHeight - 12}
                  textAnchor="middle"
                  className="fill-slate-500 text-[9px] font-mono"
                >
                  {dateStr}
                </text>
              )
            );
          })}

          {/* Render Area/Line Paths for active metrics */}
          {METRICS.map((metric) => {
            if (!activeMetrics[metric.key]) return null;
            const points = getCoordinates(metric.key);
            
            return (
              <g key={metric.key}>
                {/* Area Gradient fill */}
                <path
                  d={generateAreaPath(points)}
                  fill={`url(#grad-${metric.key})`}
                  className="transition-all duration-300"
                />
                {/* Stroke Line */}
                <path
                  d={generatePath(points)}
                  fill="none"
                  stroke={metric.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
                
                {/* Static Points (dots) if data length is small */}
                {data.length < 15 && points.map((p, i) => p.score !== null && (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="3.5"
                    fill="#0b0f19"
                    stroke={metric.color}
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            );
          })}

          {/* Hover Crosshair cursor & dots */}
          {hoveredIdx !== null && (
            <g>
              {/* Vertical line */}
              <line
                x1={paddingLeft + (hoveredIdx / Math.max(1, data.length - 1)) * chartWidth}
                y1={paddingTop}
                x2={paddingLeft + (hoveredIdx / Math.max(1, data.length - 1)) * chartWidth}
                y2={paddingTop + chartHeight}
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              
              {/* Pulsing indicator dots for each active metric */}
              {METRICS.map((metric) => {
                if (!activeMetrics[metric.key]) return null;
                const points = getCoordinates(metric.key);
                const pt = points[hoveredIdx];
                if (!pt || pt.score === null) return null;
                
                return (
                  <g key={metric.key}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="7"
                      fill={metric.color}
                      fillOpacity="0.2"
                      className="animate-ping"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4.5"
                      fill={metric.color}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {/* Floating Tooltip HTML Overlay */}
        {hoveredIdx !== null && hoveredAudit && (
          <div
            className="absolute bg-ink-950 border border-ink-700 rounded-xl p-3.5 shadow-2xl pointer-events-none z-20 text-[11px] space-y-2 min-w-[170px]"
            style={{
              left: `${Math.min(
                80, // percentage clamp
                Math.max(5, ((hoveredIdx / Math.max(1, data.length - 1)) * chartWidth + paddingLeft) / viewWidth * 100 - 15)
              )}%`,
              top: "-5px",
            }}
          >
            <p className="font-mono text-slate-500 font-medium">
              {new Date(hoveredAudit.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
            <div className="w-full h-[1px] bg-ink-800"></div>
            <div className="space-y-1.5">
              {METRICS.map((metric) => {
                const val = getScoreValue(hoveredAudit, metric.key);
                const isActive = activeMetrics[metric.key];
                return (
                  <div key={metric.key} className={`flex items-center justify-between gap-4 ${isActive ? "opacity-100" : "opacity-45"}`}>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: metric.color }}></span>
                      <span>{metric.label}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-100">{val}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
