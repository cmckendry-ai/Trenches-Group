var PERSONAL_SIGNATURE = "-Connor";
function cleanNewlines(value) {
  return value.replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim();
}
__name(cleanNewlines, "cleanNewlines");
function stripTrailingSignoff(value) {
  let text2 = cleanNewlines(value);
  text2 = text2.replace(/\n{0,2}(?:[-—–]\s*)?Connor\.?\s*$/i, "").trim();
  text2 = text2.replace(/\n{1,2}(?:best(?: regards)?|regards|sincerely|cheers|thanks|thank you)[,!]?\s*(?:\n\s*(?:[-—–]\s*)?Connor\.?)?\s*$/i, "").trim();
  return text2;
}
__name(stripTrailingSignoff, "stripTrailingSignoff");
function truncateWithoutBreakingWord(value, maxLength) {
  if (value.length <= maxLength) return value;
  const slice = value.slice(0, Math.max(0, maxLength)).trimEnd();
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > Math.max(12, Math.floor(maxLength * 0.65)) ? slice.slice(0, lastSpace) : slice).trimEnd();
}
__name(truncateWithoutBreakingWord, "truncateWithoutBreakingWord");
function formatSmsCorrespondence(body, maxLength = 1600) {
  let text2 = stripTrailingSignoff(body);
  const suffix = `

${PERSONAL_SIGNATURE}`;
  const available = Math.max(0, maxLength - suffix.length);
  text2 = truncateWithoutBreakingWord(text2, available);
  return `${text2}${suffix}`;
}
__name(formatSmsCorrespondence, "formatSmsCorrespondence");

