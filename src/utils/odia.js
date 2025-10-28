// Simple detector: does the string contain Odia script chars? (U+0B00–U+0B7F)
export function looksOdia(str = "") {
  return /[\u0B00-\u0B7F]/.test(str);
}
