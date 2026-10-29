import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// RTL only auto-cleans when test globals are enabled; do it explicitly.
afterEach(async () => {
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
});
