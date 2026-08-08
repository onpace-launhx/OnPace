import type { ReactNode } from "react";
import { normalizeLegacyRichText } from "@/lib/rich-text";

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

function isSafeHref(value: string) {
  if (value.startsWith("/")) return true;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:" || protocol === "mailto:";
  } catch {
    return false;
  }
}

function isBalancedLatex(value: string) {
  let depth = 0;
  for (const character of value) {
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function looksLikeMath(value: string) {
  return /\\|[=+*/^_{}]|^[a-zA-Zα-ωΑ-Ω][a-zA-Z0-9α-ωΑ-Ω^_{}]*$/.test(value);
}

const LATEX_SYMBOLS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", theta: "θ",
  lambda: "λ", mu: "μ", pi: "π", rho: "ρ", sigma: "σ", phi: "φ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Pi: "Π", Sigma: "Σ", Omega: "Ω",
  leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", approx: "≈", equiv: "≡",
  times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓", to: "→", rightarrow: "→",
  leftarrow: "←", infty: "∞", degree: "°", angle: "∠", sum: "∑", prod: "∏",
  int: "∫", partial: "∂", nabla: "∇", therefore: "∴", because: "∵",
  left: "", right: "", quad: " ", qquad: "  ",
  sin: "sin", cos: "cos", tan: "tan", cot: "cot", sec: "sec", csc: "csc",
  log: "log", ln: "ln", lim: "lim", min: "min", max: "max",
};

function parseLatex(value: string, keyPrefix: string): ReactNode[] {
  let cursor = 0;
  let nodeIndex = 0;

  const readGroup = () => {
    if (value[cursor] !== "{") return "";
    cursor += 1;
    const start = cursor;
    let depth = 1;
    while (cursor < value.length && depth > 0) {
      if (value[cursor] === "{") depth += 1;
      if (value[cursor] === "}") depth -= 1;
      cursor += 1;
    }
    return value.slice(start, depth === 0 ? cursor - 1 : cursor);
  };

  const nodes: ReactNode[] = [];
  let plain = "";
  const flushPlain = () => {
    if (!plain) return;
    nodes.push(plain);
    plain = "";
  };

  while (cursor < value.length) {
    const character = value[cursor];
    if (character === "\\") {
      flushPlain();
      cursor += 1;
      if (value[cursor] === "\\") {
        nodes.push(<br key={`${keyPrefix}-br-${nodeIndex++}`} />);
        cursor += 1;
        continue;
      }
      const commandStart = cursor;
      while (/[A-Za-z]/.test(value[cursor] || "")) cursor += 1;
      const command = value.slice(commandStart, cursor);
      const key = `${keyPrefix}-cmd-${nodeIndex++}`;

      if (command === "frac") {
        const numerator = readGroup();
        const denominator = readGroup();
        if (numerator || denominator) {
          nodes.push(
            <span key={key} className="markdown-math-fraction">
              <span>{parseLatex(numerator, `${key}-n`)}</span>
              <span>{parseLatex(denominator, `${key}-d`)}</span>
            </span>
          );
          continue;
        }
      }
      if (command === "sqrt") {
        const radicand = readGroup();
        nodes.push(<span key={key} className="markdown-math-root"><span>√</span><span>{parseLatex(radicand, `${key}-r`)}</span></span>);
        continue;
      }
      if (["text", "mathrm", "mathbf", "operatorname"].includes(command)) {
        const group = readGroup();
        nodes.push(<span key={key} className={command === "mathbf" ? "font-bold" : "markdown-math-text"}>{parseLatex(group, `${key}-t`)}</span>);
        continue;
      }
      const symbol = Object.prototype.hasOwnProperty.call(LATEX_SYMBOLS, command) ? LATEX_SYMBOLS[command] : command;
      nodes.push(<span key={key} className={/^(sin|cos|tan|cot|sec|csc|log|ln|lim|min|max)$/.test(command) ? "markdown-math-operator" : undefined}>{symbol}</span>);
      continue;
    }

    if (character === "^" || character === "_") {
      flushPlain();
      const Tag = character === "^" ? "sup" : "sub";
      cursor += 1;
      const group = value[cursor] === "{" ? readGroup() : value[cursor++] || "";
      nodes.push(<Tag key={`${keyPrefix}-${Tag}-${nodeIndex++}`}>{parseLatex(group, `${keyPrefix}-${Tag}`)}</Tag>);
      continue;
    }

    if (character === "{") {
      flushPlain();
      const group = readGroup();
      nodes.push(<span key={`${keyPrefix}-group-${nodeIndex++}`}>{parseLatex(group, `${keyPrefix}-g`)}</span>);
      continue;
    }

    if (character !== "}") plain += character;
    cursor += 1;
  }
  flushPlain();
  return nodes;
}

function MathExpression({ value, block = false }: { value: string; block?: boolean }) {
  if (!isBalancedLatex(value)) {
    return <code className="markdown-code-inline" title="Invalid LaTeX">{value}</code>;
  }
  return (
    <span role="math" className={block ? "markdown-math markdown-math-block" : "markdown-math"} title={value}>
      {parseLatex(value.trim(), block ? "display-math" : "inline-math")}
    </span>
  );
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const pattern = /(\x60[^\x60\n]*\x60)|(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*|__)(.+?)\5|(\*|_)(.+?)\7|(\+\+)(.+?)\9|(\$([^$\n]+)\$)|(\\\((.+?)\\\))|(\\\[(.+?)\\\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) tokens.push(text.slice(lastIndex, match.index));
    const key = `${keyPrefix}-${index++}`;
    if (match[1]) {
      tokens.push(<code key={key} className="markdown-code-inline">{match[1].slice(1, -1)}</code>);
    } else if (match[2]) {
      const href = match[4];
      tokens.push(isSafeHref(href)
        ? <a key={key} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="font-semibold text-brand underline underline-offset-2">{match[3]}</a>
        : match[3]);
    } else if (match[5]) {
      tokens.push(<strong key={key} className="font-extrabold">{match[6]}</strong>);
    } else if (match[7]) {
      tokens.push(<em key={key}>{match[8]}</em>);
    } else if (match[9]) {
      tokens.push(<u key={key}>{match[10]}</u>);
    } else if (match[11]) {
      const value = match[12];
      tokens.push(looksLikeMath(value) ? <MathExpression key={key} value={value} /> : match[11]);
    } else if (match[13]) {
      tokens.push(<MathExpression key={key} value={match[14]} />);
    } else if (match[15]) {
      tokens.push(<MathExpression key={key} value={match[16]} block />);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) tokens.push(text.slice(lastIndex));
  return tokens.length ? tokens : [text];
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;
  const blocks: ReactNode[] = [];
  const lines = normalizeLegacyRichText(content).replace(/\r\n?/g, "\n").split("\n");
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    const trimmed = line.trim();
    const key = `block-${lineIndex}`;
    if (!trimmed) { lineIndex += 1; continue; }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      lineIndex += 1;
      while (lineIndex < lines.length && !lines[lineIndex].trim().startsWith("```")) codeLines.push(lines[lineIndex++]);
      if (lineIndex < lines.length) lineIndex += 1;
      blocks.push(<pre key={key} className="markdown-code-block"><code data-language={language || undefined}>{codeLines.join("\n")}</code></pre>);
      continue;
    }

    if (trimmed === "$$" || trimmed === "\\[") {
      const closing = trimmed === "$$" ? "$$" : "\\]";
      const mathLines: string[] = [];
      lineIndex += 1;
      while (lineIndex < lines.length && lines[lineIndex].trim() !== closing) mathLines.push(lines[lineIndex++]);
      if (lineIndex < lines.length) lineIndex += 1;
      blocks.push(<MathExpression key={key} value={mathLines.join("\n").trim()} block />);
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      const Tag = (`h${level}`) as "h1" | "h2" | "h3";
      const headingClass = level === 1 ? "text-2xl font-extrabold text-surface-dark" : level === 2 ? "text-xl font-bold text-surface-dark" : "text-base font-bold text-surface-dark";
      blocks.push(<Tag key={key} className={headingClass}>{renderInline(heading[2], key)}</Tag>);
      lineIndex += 1;
      continue;
    }

    const unordered = /^[-*+]\s+(.+)$/.exec(trimmed);
    const ordered = /^\d+[.)]\s+(.+)$/.exec(trimmed);
    if (unordered || ordered) {
      const items: ReactNode[] = [];
      const isOrdered = Boolean(ordered);
      while (lineIndex < lines.length) {
        const candidate = lines[lineIndex].trim();
        const item = isOrdered ? /^\d+[.)]\s+(.+)$/.exec(candidate) : /^[-*+]\s+(.+)$/.exec(candidate);
        if (!item) break;
        const itemKey = `${key}-${lineIndex}`;
        items.push(<li key={itemKey}>{renderInline(item[1], itemKey)}</li>);
        lineIndex += 1;
      }
      const ListTag = isOrdered ? "ol" : "ul";
      blocks.push(<ListTag key={key} className={isOrdered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>{items}</ListTag>);
      continue;
    }

    blocks.push(<p key={key}>{renderInline(line, key)}</p>);
    lineIndex += 1;
  }
  return <div className={`markdown-content ${className}`}>{blocks}</div>;
}
