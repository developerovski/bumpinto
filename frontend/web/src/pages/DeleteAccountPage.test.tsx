import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { deleteMe: vi.fn(), me: vi.fn(), logout: vi.fn() } }));
vi.mock("../components/molecules/GoogleSignIn", () => ({ default: () => <div>google-signin</div> }));
vi.mock("../components/molecules/AppleSignIn", () => ({ default: () => <div>apple-signin</div> }));

import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import DeleteAccountPage from "./DeleteAccountPage";

function at(signed: boolean) {
  useAuthStore.setState(signed
    ? { status: "signed", me: { id: "u1", email: "m@x.test", displayName: "Mehmet" } as never }
    : { status: "anon", me: null });
  return render(
    <MemoryRouter initialEntries={["/account/delete"]}>
      <Routes>
        <Route path="/account/delete" element={<DeleteAccountPage />} />
        <Route path="/account/deleted" element={<div>silindi-ekrani</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const type = (value: string) => fireEvent.change(screen.getByLabelText(/SİL yaz/), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: /kalıcı olarak sil/ }));

describe("DeleteAccountPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("anonim: listeler ve iki giriş yolu; onay alanı yok (önce kimlik)", () => {
    at(false);
    expect(screen.getByRole("heading", { level: 1, name: /emin misin/ })).toBeInTheDocument();
    expect(screen.getByText("Kurduğun buluşmalar ve davet linkleri")).toBeInTheDocument();
    expect(screen.getByText(/eski katılımcı/)).toBeInTheDocument();
    expect(screen.getByText("google-signin")).toBeInTheDocument();
    expect(screen.getByText("apple-signin")).toBeInTheDocument();
    expect(screen.queryByLabelText(/SİL yaz/)).not.toBeInTheDocument();
  });

  it("girişli: kim olduğu yazar; SİL yazılmadan buton kapalı", () => {
    at(true);
    expect(screen.getByText("m@x.test olarak giriş yaptın.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /kalıcı olarak sil/ })).toBeDisabled();
    type("sil");
    expect(screen.getByRole("button", { name: /kalıcı olarak sil/ })).toBeEnabled();
  });

  it("onaylanınca DELETE /api/me çağrılır ve silindi ekranına gidilir", async () => {
    vi.mocked(api.deleteMe).mockResolvedValue(undefined);
    at(true);
    type("SİL");
    submit();
    await waitFor(() => expect(api.deleteMe).toHaveBeenCalled());
    expect(await screen.findByText("silindi-ekrani")).toBeInTheDocument();
  });

  it("401 kimlik hatası, diğerleri silme hatası basar", async () => {
    vi.mocked(api.deleteMe).mockRejectedValue({ response: { status: 401 } });
    at(true);
    type("SİL");
    submit();
    expect(await screen.findByText(/Oturumun düşmüş/)).toBeInTheDocument();
    vi.mocked(api.deleteMe).mockRejectedValue(new Error("500"));
    submit();
    expect(await screen.findByText("Hesap silinemedi — tekrar dene.")).toBeInTheDocument();
  });
});
