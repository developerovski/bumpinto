import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useToastStore } from "../../store/toastStore";
import ToastHost from "./ToastHost";

describe("ToastHost", () => {
  beforeEach(() => useToastStore.setState({ toasts: [] }));

  it("anahtarı çevirip basar; onay şeridinde kapatma düğmesi YOKTUR (artboard 5821-5825)", () => {
    render(<ToastHost />);
    // Depo mutasyonu simüle edilmiş bir olay (fireEvent) üzerinden gelmiyor — `VoiceDock.test.tsx`
    // ile aynı desen: React 18 act-ortamında senkron yansıma için `act()` sarmalı gerekir, yoksa
    // store günceller ama DOM bir sonraki React flush'ına kadar eskiyi gösterir.
    act(() => {
      useToastStore.getState().push("social.reported", { name: "Kerem" });
    });
    expect(screen.getByRole("status")).toHaveTextContent("Bildirildi · Kerem engellendi");
    expect(screen.queryByRole("button", { name: "Kapat" })).not.toBeInTheDocument();
  });

  it("hata tonunda kapatma düğmesi kalır ve kuyruğu boşaltır", () => {
    render(<ToastHost />);
    act(() => {
      useToastStore.getState().push("social.error", undefined, "flame");
    });
    expect(screen.getByRole("status")).toHaveTextContent("Gönderilemedi — tekrar dene.");
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
