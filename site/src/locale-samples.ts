/** Playground sample language packs — English / Urdu (RTL). */

export type SampleLang = "en" | "ur";

export const MOTION_HINTS: Record<string, string> = {
  natural: "Soft fade-in · ~210ms reveal. Balanced default.",
  quiet: "Subtle · shorter reveal, less displacement.",
  instant: "No piece animation · delivery still paced by rate.",
  fluid: "Longer reveal + light blur · adds delivery interval.",
  precise: "Snappy · tighter spring, short reveal.",
  editorial: "Measured pacing · light blur, medium reveal.",
  expressive: "Dramatic · blur, displacement, longer settle.",
};

const URDU_BY_CASE: Record<string, { sample: string; source?: string }> = {
  new: {
    sample:
      "گلیپٹائڈ متن کو پڑھنے کے لیے آرام دہ رفتار سے ظاہر کرتا ہے تاکہ جواب قدرتی لگے۔",
  },
  insert: {
    source: "ڈیزائن سسٹمز کو [[مستقل]] حرکت کی زبان کی ضرورت ہوتی ہے۔",
    sample: "قابلِ پیش گوئی",
  },
  replace: {
    source: "تیزی سے شپ کریں اور [[چیزیں توڑیں]]۔",
    sample: "احتیاط سے بہتر بنائیں",
  },
  rewrite: {
    source:
      "پہلا پیراگراف موجودہ مسودہ ہے۔\n\n[[دوسرا پیراگراف نظرثانی کے لیے نشان زد ہے۔]]\n\nتیسرا پیراگراف برقرار رہتا ہے۔",
    sample:
      "نظرثانی شدہ پیراگراف واضح ساخت اور پرسکون لہجے کے ساتھ آتا ہے۔",
  },
  continue: {
    source: "شروع یہیں سے ہوتا ہے اور ",
    sample: "جاری متن قدرتی طور پر آگے بڑھتا ہے۔",
  },
  structured: {
    sample: `## نتائج
اسٹریمنگ مواد میزبان رینڈرر کا کام ہے۔

## حوالہ جات
1. اسٹریم ڈاؤن — میزبان AST
2. گلیپٹائڈ — صرف متن کی حرکت
`,
  },
};

/** Remember last English edits while toggling languages */
const englishCache = new Map<string, { sample: string; source: string }>();

export function urduForCase(caseId: string): { sample: string; source?: string } {
  return URDU_BY_CASE[caseId] ?? URDU_BY_CASE.new;
}

export function cacheEnglish(
  caseId: string,
  sample: string,
  source: string,
): void {
  englishCache.set(caseId, { sample, source });
}

export function englishFromCache(
  caseId: string,
): { sample: string; source: string } | null {
  return englishCache.get(caseId) ?? null;
}
