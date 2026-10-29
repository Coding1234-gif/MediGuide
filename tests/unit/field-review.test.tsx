// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FieldReview, type FieldDraft } from "@/components/verification/field-review";

function setup(draft: FieldDraft, extractedValue: string | null = "Three times a day") {
  const onChange = vi.fn();
  render(
    <FieldReview
      fieldKey="frequency"
      label="How often"
      required
      extracted={{ value: extractedValue, source_text: extractedValue ? "THREE times a day" : null, status: "extracted", page: 1 }}
      draft={draft}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe("FieldReview", () => {
  it("shows the source evidence for the field", () => {
    setup({ value: "Three times a day", state: null });
    expect(screen.getByText("THREE times a day")).toBeInTheDocument();
    expect(screen.getByText(/check this against your document/i)).toBeInTheDocument();
  });

  it("records an explicit confirmation", async () => {
    const onChange = setup({ value: "Three times a day", state: null });
    await userEvent.click(screen.getByLabelText("Matches my document"));
    expect(onChange).toHaveBeenCalledWith({ value: "Three times a day", state: "confirmed" });
  });

  it("marks an edited value as corrected", async () => {
    const onChange = setup({ value: "Three times a day", state: "confirmed" });
    await userEvent.type(screen.getByRole("textbox"), "!");
    expect(onChange).toHaveBeenLastCalledWith({ value: "Three times a day!", state: "corrected" });
  });

  it("can't be confirmed when there is no value", () => {
    setup({ value: "", state: "missing" }, null);
    expect(screen.getByLabelText("Matches my document")).toBeDisabled();
    expect(screen.getByText(/no supporting text/i)).toBeInTheDocument();
  });
});
