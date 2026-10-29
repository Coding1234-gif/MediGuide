/**
 * Deterministic urgent-symptom escalation. Runs BEFORE and independently of any
 * language model. Rules are deliberately broad (over-escalation is the safer failure).
 * Rules must be reviewed by the team before changes; see docs/medical-safety.md.
 */

export type RedFlagRule = {
  id: string;
  label: string;
  /** Matched against free text (case-insensitive). */
  patterns: RegExp[];
  level: "emergency" | "urgent";
  message: string;
};

export const RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: "breathing",
    label: "Severe difficulty breathing",
    patterns: [/can'?t breathe|cannot breathe|struggling to breathe|difficulty breathing|short(ness)? of breath|gasping|choking/i],
    level: "emergency",
    message: "Severe difficulty breathing can be a medical emergency.",
  },
  {
    id: "chest_pain",
    label: "Chest pain or pressure",
    patterns: [/chest (pain|pressure|tightness)|pain in (my|the) chest|crushing/i],
    level: "emergency",
    message: "Chest pain can be a sign of a serious problem such as a heart attack.",
  },
  {
    id: "stroke",
    label: "Signs of a stroke",
    patterns: [/face (droop|drooping|fallen)|slurred speech|can'?t (lift|raise) (my|both) arms?|sudden (weakness|numbness) (on|in) one side/i],
    level: "emergency",
    message: "Face drooping, arm weakness or speech problems can be signs of a stroke.",
  },
  {
    id: "consciousness",
    label: "Fainting, seizure or confusion",
    patterns: [/unconscious|passed out|fainted|seizure|\bfit(ting)?\b|convulsion|suddenly confused|confusion|unresponsive/i],
    level: "emergency",
    message: "Loss of consciousness, seizures or sudden confusion need urgent assessment.",
  },
  {
    id: "bleeding",
    label: "Severe bleeding",
    patterns: [/(heavy|severe|won'?t stop|uncontrolled) bleeding|coughing (up )?blood|vomiting blood|blood in (my )?vomit/i],
    level: "emergency",
    message: "Severe or unexplained bleeding needs urgent care.",
  },
  {
    id: "meningitis",
    label: "Rash that doesn't fade, stiff neck",
    patterns: [/rash (that )?(doesn'?t|does not|won'?t) fade|stiff neck|neck stiffness|glass test/i],
    level: "emergency",
    message: "A rash that doesn't fade under pressure or a stiff neck with fever can be signs of a serious infection.",
  },
  {
    id: "anaphylaxis",
    label: "Severe allergic reaction",
    patterns: [/swollen (lips|tongue|throat|face)|throat (closing|swelling)|anaphyla/i],
    level: "emergency",
    message: "Swelling of the lips, tongue or throat can be a severe allergic reaction.",
  },
  {
    id: "self_harm",
    label: "Thoughts of self-harm",
    patterns: [/suicid|kill myself|end my life|self[- ]?harm|hurt myself/i],
    level: "emergency",
    message: "If you're thinking about harming yourself, please get help right now. You are not alone.",
  },
  {
    id: "dehydration",
    label: "Signs of severe dehydration",
    patterns: [/not (peed|urinated|passed urine)|no urine|can'?t keep (any )?(fluids|water) down/i],
    level: "urgent",
    message: "Being unable to keep fluids down or not passing urine can lead to dehydration.",
  },
  {
    id: "severe_headache",
    label: "Sudden severe headache",
    patterns: [/worst headache|thunderclap|sudden (and )?severe headache/i],
    level: "urgent",
    message: "A sudden, very severe headache should be assessed urgently.",
  },
];

/** Structured yes/no red-flag questions shown in the wizard (ids map to rules above). */
export const RED_FLAG_QUESTIONS: Array<{ id: string; question: string }> = [
  { id: "breathing", question: "Are you having severe difficulty breathing?" },
  { id: "chest_pain", question: "Do you have chest pain, pressure or tightness?" },
  { id: "consciousness", question: "Have you fainted, had a seizure, or become suddenly confused?" },
  { id: "meningitis", question: "Do you have a rash that doesn't fade when pressed, or a stiff neck?" },
  { id: "dehydration", question: "Are you unable to keep any fluids down, or not passing urine?" },
];

export type SafetyAssessment = {
  level: "emergency" | "urgent" | "none";
  triggered: Array<Pick<RedFlagRule, "id" | "label" | "message" | "level">>;
};

export function assessRedFlags(freeText: string, answeredYes: string[]): SafetyAssessment {
  const triggered = RED_FLAG_RULES.filter(
    (r) => answeredYes.includes(r.id) || r.patterns.some((p) => p.test(freeText)),
  ).map(({ id, label, message, level }) => ({ id, label, message, level }));
  const level = triggered.some((t) => t.level === "emergency") ? "emergency" : triggered.length ? "urgent" : "none";
  return { level, triggered };
}
