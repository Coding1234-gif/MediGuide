/**
 * The limited set of symptoms MediGuide provides information for. Anything else
 * returns an explicit "not supported" result rather than a guess.
 */

export type SupportedSymptom = {
  id: string;
  label: string;
  /** Free-text synonyms used to recognise the symptom. */
  keywords: RegExp;
  topics: string[];
};

export const SUPPORTED_SYMPTOMS: SupportedSymptom[] = [
  { id: "runny_nose", label: "Runny or blocked nose", keywords: /runny|blocked nose|stuffy|congest|sneez/i, topics: ["common_cold"] },
  { id: "sore_throat", label: "Sore throat", keywords: /sore throat|throat (hurts|pain)|scratchy throat/i, topics: ["sore_throat", "common_cold"] },
  { id: "cough", label: "Cough", keywords: /cough/i, topics: ["cough", "respiratory"] },
  { id: "fever", label: "High temperature / fever", keywords: /fever|temperature|hot and shivery|chills/i, topics: ["fever", "flu"] },
  { id: "body_aches", label: "Aching body", keywords: /ach(e|ing) (body|all over)|body ache|muscle ache/i, topics: ["flu"] },
  { id: "tiredness", label: "Tiredness / exhaustion", keywords: /tired|exhaust|fatigue/i, topics: ["flu"] },
  { id: "headache", label: "Headache", keywords: /headache|head hurts|migraine/i, topics: ["headache"] },
  { id: "diarrhoea", label: "Diarrhoea", keywords: /diarrh?o?ea|loose stool|runny poo/i, topics: ["gastro"] },
  { id: "vomiting", label: "Vomiting / feeling sick", keywords: /vomit|being sick|throwing up|nause|feel(ing)? sick/i, topics: ["gastro"] },
];

export const DURATIONS = [
  { id: "lt_2_days", label: "Less than 2 days" },
  { id: "2_7_days", label: "2–7 days" },
  { id: "1_3_weeks", label: "1–3 weeks" },
  { id: "gt_3_weeks", label: "More than 3 weeks" },
] as const;
export type DurationId = (typeof DURATIONS)[number]["id"];

export function matchSymptoms(selectedIds: string[], freeText: string): SupportedSymptom[] {
  return SUPPORTED_SYMPTOMS.filter((s) => selectedIds.includes(s.id) || s.keywords.test(freeText));
}
