export function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&pound;|&pound:|&pound/gi, "£")
    .replace(/&dollar;|&dollar/gi, "$")
    .replace(/&euro;|&euro/gi, "€");
}
