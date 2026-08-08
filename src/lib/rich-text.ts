const BASIC_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeBasicEntities(value: string) {
  return value.replace(/&(#\d+|#x[\da-f]+|amp|apos|gt|lt|nbsp|quot);/gi, (entity, code: string) => {
    if (code.startsWith("#")) {
      const isHex = code.toLowerCase().startsWith("#x");
      const point = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    return BASIC_ENTITIES[code.toLowerCase()] || entity;
  });
}

export function normalizeLegacyRichText(value: string) {
  return value
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*(strong|b)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, "**$2**")
    .replace(/<\s*(em|i)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, "*$2*")
    .replace(/<\s*u\s*>([\s\S]*?)<\s*\/\s*u\s*>/gi, "++$1++")
    .replace(/<\s*h[1-6]\s*>([\s\S]*?)<\s*\/\s*h[1-6]\s*>/gi, "## $1\n")
    .replace(/<\s*\/?\s*(p|div|ul|ol|li)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");
}

export function richTextToPlainText(value: string) {
  return decodeBasicEntities(normalizeLegacyRichText(value))
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-*+] |\d+[.)] )/gm, "")
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/^```[^\n]*|```$/g, ""))
    .replace(/(`|\*\*|__|\+\+|~~)/g, "")
    .replace(/([*_])([^*_\n]+)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
}
