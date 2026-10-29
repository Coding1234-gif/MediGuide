import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { MedicalDisclaimer, Notice } from "@/components/shared/notice";
import { SymptomWizard } from "@/components/symptoms/symptom-wizard";
import { RED_FLAG_QUESTIONS } from "@/lib/medical/safety";
import { DURATIONS, SUPPORTED_SYMPTOMS } from "@/lib/medical/supported-scenarios";

export const metadata: Metadata = { title: "Symptom information" };

export default function SymptomsPage() {
  return (
    <>
      <PageHeader
        title="Symptom information"
        description="Answer a few questions to see trusted, sourced information about common symptoms — and when to get help."
      />
      <Notice tone="danger" title="In an emergency, don't wait" className="mx-auto mb-6 max-w-2xl">
        If you have severe difficulty breathing, chest pain, signs of a stroke, or you&apos;ve collapsed, call your local emergency number now.
      </Notice>
      <SymptomWizard
        symptoms={SUPPORTED_SYMPTOMS.map((s) => ({ id: s.id, label: s.label }))}
        durations={DURATIONS.map((d) => ({ id: d.id, label: d.label }))}
        redFlags={RED_FLAG_QUESTIONS}
      />
      <MedicalDisclaimer className="mx-auto mt-8 max-w-2xl" />
    </>
  );
}
