import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useToastStore } from "../../store/toastStore";
import ToastHost from "./ToastHost";

describe("ToastHost", () => {
  beforeEach(() => useToastStore.setState({ toasts: [] }));

  it("anahtarı çevirip basar, kapatma düğmesi kuyruğu boşaltır", () => {
    render(<ToastHost />);
    // Depo mutasyonu simüle edilmiş bir olay (fireEvent) üzerinden gelmiyor — `VoiceDock.test.tsx`
    // ile aynı desen: React 18 act-ortamında senkron yansıma için `act()` sarmalı gerekir, yoksa
    // store günceller ama DOM bir sonraki React flush'ına kadar eskiyi gösterir.
    act(() => {
      useToastStore.getState().push("social.reported", { name: "Kerem" });
    });
    expect(screen.getByRole("status")).toHaveTextContent("Bildirildi · Kerem engellendi");
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
