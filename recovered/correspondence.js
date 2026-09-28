var PERSONAL_SIGNATURE = "-Connor";
function cleanNewlines(value) {
  return value.replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim();
}
__name(cleanNewlines, "cleanNewlines");
function stripTrailingSignoff(value) {
  let text = cleanNewlines(value);
  text = text.replace(/\n{0,2}(?:[-—–]\s*)?Connor\.?\s*$/i, "").trim();
  text = text.replace(/\n{1,2}(?:best(?: regards)?|regards|sincerely|cheers|thanks|thank you)[,!]?\s*(?:\n\s*(?:[-—–]\s*)?Connor\.?)?\s*$/i, "").trim();
  return text;
}
__name(stripTrailingSignoff, "stripTrailingSignoff");
function truncateWithoutBreakingWord(value, maxLength) {
  if (value.length <= maxLength) return value;
  const slice = value.slice(0, Math.max(0, maxLength)).trimEnd();
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > Math.max(12, Math.floor(maxLength * 0.65)) ? slice.slice(0, lastSpace) : slice).trimEnd();
}
__name(truncateWithoutBreakingWord, "truncateWithoutBreakingWord");
function firstNameFromOwnerName(ownerName) {
  const cleaned = (ownerName || "").trim().replace(/\s+/g, " ");
  if (!cleaned) return void 0;
  const first = cleaned.split(" ")[0]?.replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ'-]+|[^A-Za-zÀ-ÖØ-öø-ÿ'-]+$/g, "");
  return first || void 0;
}
__name(firstNameFromOwnerName, "firstNameFromOwnerName");
function formatEmailCorrespondence(body, firstName) {
  let text = stripTrailingSignoff(body);
  if (firstName) {
    text = text.replace(/^hey\s*(?:[—–-]|,)\s*/i, "").trimStart();
    if (text) text = text.charAt(0).toUpperCase() + text.slice(1);
    const escaped = firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const alreadyNamed = new RegExp(`^${escaped}\\s*,`, "i").test(text);
    if (!alreadyNamed) text = `${firstName},

${text}`;
  }
  return `${text.trim()}

${PERSONAL_SIGNATURE}`;
}
__name(formatEmailCorrespondence, "formatEmailCorrespondence");
function formatSmsCorrespondence(body, maxLength = 1600) {
  let text = stripTrailingSignoff(body);
  const suffix = `

${PERSONAL_SIGNATURE}`;
  const available = Math.max(0, maxLength - suffix.length);
  text = truncateWithoutBreakingWord(text, available);
  return `${text}${suffix}`;
}
__name(formatSmsCorrespondence, "formatSmsCorrespondence");

