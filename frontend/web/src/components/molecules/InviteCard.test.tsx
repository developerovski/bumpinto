import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import InviteCard from "./InviteCard";

/* Kopyalama geri bildirimi: tıklanan ögenin KENDİSİ onay vermeli (ikon-only düğmede etiket yok),
   ayrıca kod satırı da 2 sn "Kopyalandı" yazar — sayfanın başka yerinde onay aranmasın. */
describe("InviteCard — kopyala", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("kopyalama başarılıysa görünür 'Kopyalandı' ibaresi çıkar ve 2 sn sonra kod satırı döner", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<InviteCard slug="zz7qfc86" joinCode="3YGZS" sessionName="Cuma kahvesi" />);

    expect(screen.getByText("3YGZS")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kopyala" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/j/zz7qfc86")));
    // Görünür ibare + düğmenin kendi durumu (aria-label "Kopyalandı"ya döner).
    await screen.findByText("Kopyalandı");
    expect(screen.getByRole("button", { name: "Kopyalandı" })).toBeInTheDocument();
    expect(screen.queryByText("3YGZS")).not.toBeInTheDocument();

    vi.advanceTimersByTime(2000);
    await waitFor(() => expect(screen.getByText("3YGZS")).toBeInTheDocument());
  });

  it("pano yoksa ve execCommand da başarısızsa 'Kopyalandı' YAZILMAZ", async () => {
    // Güvensiz bağlam (LAN üzerinden http): `navigator.clipboard` yoktur, textarea yedeği de
    // başarısız olursa kullanıcıya kopyalanmış gibi gösterilmemeli.
    vi.stubGlobal("navigator", {});
    const exec = vi.fn().mockReturnValue(false);
    Object.defineProperty(document, "execCommand", { value: exec, configurable: true });
    render(<InviteCard slug="zz7qfc86" joinCode="3YGZS" />);

    fireEvent.click(screen.getByRole("button", { name: "Kopyala" }));
    await waitFor(() => expect(exec).toHaveBeenCalledWith("copy"));
    expect(screen.queryByText("Kopyalandı")).not.toBeInTheDocument();
    expect(screen.getByText("3YGZS")).toBeInTheDocument();
  });
});
