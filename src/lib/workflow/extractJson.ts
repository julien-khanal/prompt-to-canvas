export function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start)
    throw new Error("no JSON object found in response");
  return repairJson(text.slice(start, end + 1));
}

export function repairJson(input: string): string {
  let s = input;
  s = s.replace(/[\u201C\u201D]/g, '"');
  s = s.replace(/[\u2018\u2019]/g, "'");
  s = s.replace(/,(\s*[}\]])/g, "$1");
  s = s.replace(/\u00A0/g, " ");
  return s;
}
