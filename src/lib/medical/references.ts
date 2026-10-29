/**
 * Curated health-reference dataset for the MVP.
 *
 * - URLs were checked to resolve on 2026-10-29; `reviewedOn` is the "page last reviewed" date shown on the source page.
 * - Summaries are short, original paraphrases written by the MediGuide team — NOT copies of NHS text.
 *   NHS website content is generally available under the Open Government Licence v3.0; confirm the
 *   licence terms before reproducing any source text verbatim.
 * - This is general information, not individual advice. There is no NHS symptom-checker API used here.
 */

export type HealthReference = {
  id: string;
  title: string;
  publisher: "NHS (nhs.uk)";
  url: string;
  reviewedOn: string | null;
  topics: string[];
  summary: string;
  selfCare: string[];
  seekAdviceIf: string[];
  prevention: string[];
};

export const HEALTH_REFERENCES: HealthReference[] = [
  {
    id: "nhs-common-cold",
    title: "Common cold",
    publisher: "NHS (nhs.uk)",
    url: "https://www.nhs.uk/conditions/common-cold/",
    reviewedOn: "2024-03-22",
    topics: ["common_cold", "respiratory"],
    summary:
      "Colds are mild viral infections of the nose and throat. Typical signs include a blocked or runny nose, sore throat, sneezing and cough. Most people start to feel better within about a week or two.",
    selfCare: ["Rest and keep warm", "Drink plenty of fluids", "Pharmacists can advise on over-the-counter options"],
    seekAdviceIf: [
      "Symptoms last longer than about 3 weeks or are getting worse",
      "You have a long-term condition or a weakened immune system and feel unwell",
      "You suddenly feel much worse",
    ],
    prevention: ["Wash hands often with soap and warm water", "Use tissues and bin them straight away", "Avoid sharing towels and household items"],
  },
  {
    id: "nhs-flu",
    title: "Flu",
    publisher: "NHS (nhs.uk)",
    url: "https://www.nhs.uk/conditions/flu/",
    reviewedOn: "2026-02-03",
    topics: ["flu", "respiratory", "fever"],
    summary:
      "Flu is a common infection that tends to come on quickly. It can cause a high temperature, aching body, tiredness, a dry cough and sore throat. Many people recover within about a week.",
    selfCare: ["Rest and sleep", "Keep warm", "Drink plenty of water to avoid dehydration"],
    seekAdviceIf: [
      "You're worried about your symptoms or they aren't improving after about a week",
      "You're 65 or over, pregnant, or have a long-term condition or weakened immune system",
    ],
    prevention: ["Annual flu vaccination is offered to eligible groups", "Wash hands regularly", "Catch coughs and sneezes in a tissue"],
  },
  {
    id: "nhs-fever-adults",
    title: "High temperature (fever) in adults",
    publisher: "NHS (nhs.uk)",
    url: "https://www.nhs.uk/symptoms/fever-in-adults/",
    reviewedOn: "2026-10-19",
    topics: ["fever"],
    summary:
      "A high temperature is usually a sign the body is fighting an infection. It often settles by itself within a few days.",
    selfCare: ["Rest", "Drink fluids to avoid dehydration"],
    seekAdviceIf: ["The temperature lasts several days or keeps coming back", "You feel very unwell or are worried", "You have other symptoms such as a rash or confusion"],
    prevention: [],
  },
  {
    id: "nhs-sore-throat",
    title: "Sore throat",
    publisher: "NHS (nhs.uk)",
    url: "https://www.nhs.uk/conditions/sore-throat/",
    reviewedOn: "2024-04-08",
    topics: ["sore_throat", "respiratory"],
    summary: "Sore throats are very common and are usually caused by viral infections such as colds. They often get better within about a week.",
    selfCare: ["Drink plenty of water", "Eat cool or soft foods", "Rest"],
    seekAdviceIf: ["It doesn't improve after about a week", "You often get sore throats", "You have a weakened immune system", "You have a very high temperature or feel hot and shivery"],
    prevention: ["Wash hands regularly", "Avoid sharing cups and cutlery"],
  },
  {
    id: "nhs-cough",
    title: "Cough",
    publisher: "NHS (nhs.uk)",
    url: "https://www.nhs.uk/symptoms/cough/",
    reviewedOn: "2023-12-08",
    topics: ["cough", "respiratory"],
    summary: "A cough is often caused by a viral infection like a cold or flu and usually clears up within a few weeks.",
    selfCare: ["Rest", "Drink plenty of fluids", "A pharmacist can advise on remedies"],
    seekAdviceIf: ["You've had a cough for more than 3 weeks", "Your cough is getting worse", "You're coughing up blood", "You have unexplained weight loss or chest pain"],
    prevention: ["Catch coughs in a tissue", "Wash hands regularly"],
  },
  {
    id: "nhs-rti",
    title: "Respiratory tract infections (RTIs)",
    publisher: "NHS (nhs.uk)",
    url: "https://www.nhs.uk/conditions/respiratory-tract-infection/",
    reviewedOn: "2024-12-23",
    topics: ["respiratory", "cough", "sore_throat"],
    summary: "RTIs affect the sinuses, throat, airways or lungs. Most are viral and get better without specific treatment.",
    selfCare: ["Rest", "Drink lots of water", "Avoid smoking"],
    seekAdviceIf: ["Symptoms are severe or last more than about 3 weeks", "You feel very unwell", "You have a long-term condition or weakened immune system"],
    prevention: ["Cover your mouth and nose when coughing or sneezing", "Wash hands often"],
  },
  {
    id: "nhs-diarrhoea-vomiting",
    title: "Diarrhoea and vomiting",
    publisher: "NHS (nhs.uk)",
    url: "https://www.nhs.uk/conditions/diarrhoea-and-vomiting/",
    reviewedOn: "2023-12-21",
    topics: ["gastro"],
    summary: "Diarrhoea and vomiting are common and are often caused by a stomach bug. They usually settle within a few days.",
    selfCare: ["Drink plenty of fluids, little and often", "Rest at home", "Eat when you feel able to"],
    seekAdviceIf: [
      "You have signs of dehydration, such as passing little urine",
      "Diarrhoea lasts more than about 7 days or vomiting more than about 2 days",
      "You have blood in your diarrhoea or vomit",
    ],
    prevention: ["Wash hands with soap and water after using the toilet and before eating", "Stay off work or school until 2 days after symptoms stop", "Don't prepare food for others while unwell"],
  },
  {
    id: "nhs-headaches",
    title: "Headaches",
    publisher: "NHS (nhs.uk)",
    url: "https://www.nhs.uk/conditions/headaches/",
    reviewedOn: "2024-04-17",
    topics: ["headache"],
    summary: "Most headaches are not serious and get better on their own. Common triggers include colds, stress, dehydration and tiredness.",
    selfCare: ["Drink plenty of water", "Rest", "Regular sleep and meals"],
    seekAdviceIf: ["Headaches keep coming back or get worse", "Painkillers don't help", "You have other symptoms like numbness or confusion"],
    prevention: [],
  },
  {
    id: "nhs-handwashing",
    title: "How to wash your hands",
    publisher: "NHS (nhs.uk)",
    url: "https://www.nhs.uk/live-well/healthy-body/best-way-to-wash-your-hands/",
    reviewedOn: "2023-01-27",
    topics: ["prevention"],
    summary: "Washing hands properly with soap and water is one of the most effective ways to reduce the spread of germs.",
    selfCare: [],
    seekAdviceIf: [],
    prevention: ["Wash for about 20 seconds, covering all parts of your hands", "Wash after using the toilet, before eating and after coughing or sneezing"],
  },
  {
    id: "nhs-when-to-call-999",
    title: "When to call 999",
    publisher: "NHS (nhs.uk)",
    url: "https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-call-999/",
    reviewedOn: "2023-02-03",
    topics: ["emergency"],
    summary: "Describes life-threatening emergencies where you should call emergency services immediately (999 in the UK).",
    selfCare: [],
    seekAdviceIf: [],
    prevention: [],
  },
];

export interface HealthReferenceProvider {
  search(topics: string[]): HealthReference[];
  get(id: string): HealthReference | undefined;
}

export const curatedReferenceProvider: HealthReferenceProvider = {
  search(topics) {
    const wanted = new Set(topics);
    return HEALTH_REFERENCES.filter((r) => r.topics.some((t) => wanted.has(t)));
  },
  get(id) {
    return HEALTH_REFERENCES.find((r) => r.id === id);
  },
};
