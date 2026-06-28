const DIFFICULTY_SELECTORS = [
  '[class*="text-difficulty-easy"]',
  '[class*="text-difficulty-medium"]',
  '[class*="text-difficulty-hard"]',
  '[class*="text-olive"]',
  '[class*="text-yellow"]',
  '[class*="text-pink"]',
];

const TITLE_SELECTORS = [
  "div.text-title-large a",
  '[data-e2e-locator="problem-title"]',
  "h1 a",
  '[class*="text-title-large"] a',
];

const LANGUAGE_SELECTORS = [
  '[data-e2e-locator="programming-language-selector"]',
  '[class*="language-selector"]',
  'button[class*="select-language"]',
  '[class*="programming-language"]',
];

export function extractProblemInfo() {
  const pathParts = window.location.pathname.split("/");
  const problemsIndex = pathParts.indexOf("problems");
  let titleSlug = "unknown";
  if (problemsIndex !== -1 && pathParts.length > problemsIndex + 1) {
    titleSlug = pathParts[problemsIndex + 1];
  }

  let difficulty = "Medium";
  for (const sel of DIFFICULTY_SELECTORS) {
    const el = document.querySelector(sel);
    if (el) {
      const text = el.textContent?.toLowerCase() ?? "";
      if (text.includes("easy")) difficulty = "Easy";
      else if (text.includes("hard")) difficulty = "Hard";
      else if (text.includes("medium")) difficulty = "Medium";
      break;
    }
  }

  let problemName = titleSlug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  for (const sel of TITLE_SELECTORS) {
    const el = document.querySelector(sel);
    if (el?.textContent) {
      problemName = el.textContent.replace(/^\d+\.\s*/, "").trim();
      break;
    }
  }

  let problemId = "0";
  const idMatch = window.location.pathname.match(/\/problems\/[^/]+\/\d+/);
  if (idMatch) {
    problemId = idMatch[0].split("/").pop() ?? "0";
  }
  const jsonLd = document.querySelector('script[type="application/ld+json"]');
  if (jsonLd?.textContent) {
    try {
      const data = JSON.parse(jsonLd.textContent);
      if (data?.["@id"]) {
        const match = data["@id"].match(/(\d+)/);
        if (match) problemId = match[1];
      }
    } catch {}
  }

  return {
    problemId,
    problemName,
    titleSlug,
    difficulty,
    url: `https://leetcode.com/problems/${titleSlug}/`,
  };
}

export function getLanguageFromEditor() {
  for (const sel of LANGUAGE_SELECTORS) {
    const el = document.querySelector(sel);
    if (el?.textContent) {
      return el.textContent.trim();
    }
  }
  return "Unknown";
}
