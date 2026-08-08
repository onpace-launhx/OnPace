"use client";

import { useEffect, useRef } from "react";
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  RemoveFormatting,
  Underline,
} from "lucide-react";
import { normalizeLegacyRichText } from "@/lib/rich-text";

type EditorLanguage = "en" | "tr" | "es" | "zh";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  maxPlainTextLength?: number;
  minHeightClass?: string;
  onImagePaste?: (file: File) => void | Promise<void>;
  ariaLabel?: string;
};

const COPY = {
  en: { paragraph: "Text", heading: "Heading", bold: "Bold", italic: "Italic", underline: "Underline", bullets: "Bullets", numbers: "Numbered list", link: "Add link", clear: "Clear formatting", linkPrompt: "Paste an https:// link" },
  tr: { paragraph: "Metin", heading: "Başlık", bold: "Kalın", italic: "Eğik", underline: "Altı çizili", bullets: "Madde işaretleri", numbers: "Numaralı liste", link: "Bağlantı ekle", clear: "Biçimi temizle", linkPrompt: "https:// ile başlayan bağlantıyı yapıştırın" },
  es: { paragraph: "Texto", heading: "Título", bold: "Negrita", italic: "Cursiva", underline: "Subrayado", bullets: "Viñetas", numbers: "Lista numerada", link: "Añadir enlace", clear: "Borrar formato", linkPrompt: "Pega un enlace https://" },
  zh: { paragraph: "正文", heading: "标题", bold: "粗体", italic: "斜体", underline: "下划线", bullets: "项目符号", numbers: "编号列表", link: "添加链接", clear: "清除格式", linkPrompt: "粘贴 https:// 链接" },
} as const;

function normalizeLanguage(language?: string): EditorLanguage {
  return ["en", "tr", "es", "zh"].includes(language || "") ? language as EditorLanguage : "en";
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function inlineMarkdownToHtml(value: string) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\+\+(.+?)\+\+/g, "<u>$1</u>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
}

function markdownToEditorHtml(markdown: string) {
  if (!markdown.trim()) return "";
  const lines = normalizeLegacyRichText(markdown).replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;
  const closeList = () => { if (listType) html.push(`</${listType}>`); listType = null; };
  for (const line of lines) {
    const heading = /^#{1,3}\s+(.+)$/.exec(line.trim());
    const bullet = /^[-*+]\s+(.+)$/.exec(line.trim());
    const numbered = /^\d+[.)]\s+(.+)$/.exec(line.trim());
    if (bullet || numbered) {
      const nextType = bullet ? "ul" : "ol";
      if (listType !== nextType) { closeList(); html.push(`<${nextType}>`); listType = nextType; }
      html.push(`<li>${inlineMarkdownToHtml((bullet || numbered)![1])}</li>`);
      continue;
    }
    closeList();
    if (heading) html.push(`<h2>${inlineMarkdownToHtml(heading[1])}</h2>`);
    else if (!line.trim()) html.push("<p><br></p>");
    else html.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
  }
  closeList();
  return html.join("");
}

function editorHtmlToMarkdown(html: string) {
  const documentNode = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = documentNode.body.firstElementChild;
  if (!root) return "";

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (!(node instanceof HTMLElement)) return "";
    const children = Array.from(node.childNodes).map(walk).join("");
    const tag = node.tagName.toLowerCase();
    if (tag === "br") return "\n";
    if (tag === "strong" || tag === "b") return `**${children}**`;
    if (tag === "em" || tag === "i") return `*${children}*`;
    if (tag === "u") return `++${children}++`;
    if (/^h[1-6]$/.test(tag)) return `## ${children.trim()}\n\n`;
    if (tag === "a") {
      const href = node.getAttribute("href") || "";
      return /^https?:\/\//i.test(href) ? `[${children}](${href})` : children;
    }
    if (tag === "ul" || tag === "ol") {
      return Array.from(node.children).map((child, index) => `${tag === "ul" ? "-" : `${index + 1}.`} ${Array.from(child.childNodes).map(walk).join("").trim()}`).join("\n") + "\n\n";
    }
    if (tag === "li") return children;
    if (tag === "p" || tag === "div") return `${children.trimEnd()}\n\n`;
    return children;
  };

  return Array.from(root.childNodes).map(walk).join("").replace(/\n{3,}/g, "\n\n").trim();
}

export function RichTextEditor({
  value,
  onChange,
  language,
  placeholder,
  maxPlainTextLength,
  minHeightClass = "min-h-52",
  onImagePaste,
  ariaLabel,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string | null>(null);
  const lastValidHtmlRef = useRef("");
  const lang = normalizeLanguage(language);
  const t = COPY[lang];

  useEffect(() => {
    if (!editorRef.current || value === lastValueRef.current) return;
    const html = markdownToEditorHtml(value);
    editorRef.current.innerHTML = html;
    lastValidHtmlRef.current = html;
    lastValueRef.current = value;
  }, [value]);

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const plainLength = (editor.innerText || "").replace(/\n+$/, "").length;
    if (maxPlainTextLength && plainLength > maxPlainTextLength) {
      editor.innerHTML = lastValidHtmlRef.current;
      return;
    }
    lastValidHtmlRef.current = editor.innerHTML;
    const markdown = editorHtmlToMarkdown(editor.innerHTML);
    lastValueRef.current = markdown;
    onChange(markdown);
  };

  const run = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const addLink = () => {
    const href = window.prompt(t.linkPrompt)?.trim();
    if (!href || !/^https:\/\//i.test(href)) return;
    run("createLink", href);
  };

  const buttonClass = "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold text-gray-600 transition hover:bg-white hover:text-brand hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20";

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/[0.06]">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50/80 p-2" role="toolbar" aria-label={ariaLabel || t.paragraph}>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("formatBlock", "p")} className={buttonClass} title={t.paragraph}><Pilcrow size={15} /><span className="hidden sm:inline">{t.paragraph}</span></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("formatBlock", "h2")} className={buttonClass} title={t.heading}><Heading2 size={16} /><span className="hidden sm:inline">{t.heading}</span></button>
        <span className="mx-1 h-6 w-px bg-gray-200" />
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("bold")} className={buttonClass} title={t.bold} aria-label={t.bold}><Bold size={16} /></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("italic")} className={buttonClass} title={t.italic} aria-label={t.italic}><Italic size={16} /></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("underline")} className={buttonClass} title={t.underline} aria-label={t.underline}><Underline size={16} /></button>
        <span className="mx-1 h-6 w-px bg-gray-200" />
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("insertUnorderedList")} className={buttonClass} title={t.bullets} aria-label={t.bullets}><List size={16} /></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("insertOrderedList")} className={buttonClass} title={t.numbers} aria-label={t.numbers}><ListOrdered size={16} /></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={addLink} className={buttonClass} title={t.link} aria-label={t.link}><Link2 size={16} /></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("removeFormat")} className={`${buttonClass} ml-auto`} title={t.clear} aria-label={t.clear}><RemoveFormatting size={16} /></button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onInput={emitChange}
        onPaste={(event) => {
          const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
          const imageFile = imageItem?.getAsFile();
          if (imageFile && onImagePaste) {
            event.preventDefault();
            void onImagePaste(imageFile);
            return;
          }
          event.preventDefault();
          document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
        }}
        className={`rich-text-editor ${minHeightClass} w-full overflow-y-auto px-4 py-4 text-sm leading-7 text-surface-dark outline-none sm:px-5`}
      />
    </div>
  );
}
