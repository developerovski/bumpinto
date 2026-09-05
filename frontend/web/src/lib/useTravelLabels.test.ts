import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTravelLabels } from "./useTravelLabels";

/* Sunucudaki `SessionView.anchored`i `TravelInfo`ya bağlayan TEK tel burada sınanır.
   Kapının kendisi (FairnessBadge) ayrıca test ediliyor; ama bu tel düşerse kapı hiç
   tetiklenmez ve alan opsiyonel olduğu için tsc de rozet testleri de sessiz kalırdı. */
describe("useTravelLabels çapa bayrağı", () => {
  it("çapalı görünümde anchored taşınır", () => {
    const { result } = renderHook(() => useTravelLabels({ anchored: true }));
    expect(result.current.anchored).toBe(true);
  });

  it("çapasız görünümde anchored false", () => {
    const { result } = renderHook(() => useTravelLabels({ participants: [] }));
    expect(result.current.anchored).toBe(false);
  });
});
