import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSessionStore } from "../store/sessionStore";
import VenuesPage from "./VenuesPage";

const venue = {
  id: "v1", name: "Koffie Keuten", lat: 51.5, lng: 5.5, rating: 4.5, deckOrder: 0,
  travel: [{ participantId: "h", minutes: 40 }, { participantId: "a", minutes: 45 }],
};
const base = {
  slug: "snu7zra8", name: "Cuma kahvesi", activityTypes: ["COFFEE"], status: "BROWSING",
  venues: [venue], midpoint: { lat: 51.5, lng: 5.5 }, radiusKm: 9,
};
const host = { id: "h", displayName: "Mehmet", host: true, hasLocation: true, manual: false, online: true, approxLocation: { lat: 51.7, lng: 5.3 } };
const guest = { id: "a", displayName: "Ayşe", host: false, hasLocation: true, manual: false, online: false, approxLocation: { lat: 51.39, lng: 5.71 } };

function show(view: unknown) {
  useSessionStore.setState({ slug: "snu7zra8", view: view as never });
  render(<VenuesPage view={view as never} />);
}

describe("VenuesPage — davet ve deste kapısı", () => {
  /** Artboard W3b: 1280 başlığında (`DesktopOnly`) VE 390 `.cta` bloğunda (`MobileCta`) —
      ikisi de DOM'da, görünürlüğü kırılma noktası seçer. Bu yüzden sayı da doğrulanır. */
  it("GROUP host: katılım hâlâ açık olduğu için davet linki burada (1280 başlık + 390 CTA)", () => {
    show({ ...base, sessionType: "GROUP", viewer: { participantId: "h", host: true }, participants: [host, guest] });
    expect(screen.getAllByRole("button", { name: /Davet linki/ })).toHaveLength(2);
  });

  /** SOLO'nun davet linki YOKTUR (sunucu 409 "solo session has no invite link"). */
  it("SOLO: davet linki gösterilmez", () => {
    show({ ...base, sessionType: "SOLO", viewer: { participantId: "h", host: true }, participants: [host] });
    expect(screen.queryByRole("button", { name: /Davet linki/ })).not.toBeInTheDocument();
  });

  it("davetli: davet linki de Karıştır da yok", () => {
    show({ ...base, sessionType: "GROUP", viewer: { participantId: "a", host: false }, participants: [host, guest] });
    expect(screen.queryByRole("button", { name: /Davet linki/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Karıştır ve kaydır" })).not.toBeInTheDocument();
  });

  it("odada iki kişi yoksa Karıştır kapalı ve sebebi yazılı", () => {
    show({ ...base, sessionType: "GROUP", viewer: { participantId: "h", host: true }, participants: [host, guest] });
    const shuffle = screen.getAllByRole("button", { name: "Karıştır ve kaydır" });
    expect(shuffle).toHaveLength(2);
    for (const b of shuffle) expect(b).toBeDisabled();
    expect(screen.getByText(/en az iki kişi olmalı/)).toBeInTheDocument();
  });

  it("iki kişi de odadaysa Karıştır açık", () => {
    show({ ...base, sessionType: "GROUP", viewer: { participantId: "h", host: true }, participants: [host, { ...guest, online: true }] });
    for (const b of screen.getAllByRole("button", { name: "Karıştır ve kaydır" })) expect(b).toBeEnabled();
  });
});

describe("VenuesPage — boş kalan ilgi alanı uyarısı", () => {
  /** Seçili ama boş kalan alan sessizce yutulmaz — ek çağrı yapılmadığı için açıkça söylenir. */
  it("mekân üretmemiş ilgi alanını bildirir", () => {
    show({
      ...base,
      activityTypes: ["COFFEE", "HIKE"],
      emptyActivityTypes: ["HIKE"],
      sessionType: "GROUP",
      viewer: { participantId: "h", host: true },
      participants: [host, guest],
    });
    expect(screen.getByText(/Doğa yürüyüşü için yakında yer bulunamadı/)).toBeInTheDocument();
  });

  /** Hepsi doluysa uyarı hiç çizilmez. */
  it("boş alan yoksa uyarı basmaz", () => {
    show({
      ...base,
      activityTypes: ["COFFEE"],
      emptyActivityTypes: [],
      sessionType: "GROUP",
      viewer: { participantId: "h", host: true },
      participants: [host, guest],
    });
    expect(screen.queryByText(/bulunamadı/)).not.toBeInTheDocument();
  });
});

describe("VenuesPage — davet linki panoya yazar", () => {
  it("tıklayınca paylaşım sayfası AÇILMAZ, link kopyalanır ve 'Kopyalandı' der", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn();
    const clipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    try {
      show({ ...base, sessionType: "GROUP", viewer: { participantId: "h", host: true }, participants: [host, guest] });
      fireEvent.click(screen.getAllByRole("button", { name: /Davet linki/ })[0]);

      expect(share).not.toHaveBeenCalled();
      expect(writeText).toHaveBeenCalledWith(`${location.origin}/j/snu7zra8`);
      expect(await screen.findByText("Kopyalandı")).toBeInTheDocument();
    } finally {
      Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
      Reflect.deleteProperty(navigator, "share");
    }
  });
});

describe("VenuesPage — artboard W3b/W3c başlık ve alt CTA", () => {
  /** Artboard 1422: orta noktanın ADI meta'nın parçası — "12 mekan · Eindhoven civarı · ≤ 9 km". */
  it("orta nokta etiketi varsa meta'da yer alır", () => {
    show({
      ...base,
      midpointLabel: "Eindhoven",
      sessionType: "GROUP",
      viewer: { participantId: "h", host: true },
      participants: [host, guest],
    });
    expect(screen.getByText("1 mekan · Eindhoven civarı · ≤ 9 km")).toBeInTheDocument();
  });

  it("etiket yoksa kısa biçime düşer (yer adı uydurulmaz)", () => {
    show({ ...base, sessionType: "GROUP", viewer: { participantId: "h", host: true }, participants: [host, guest] });
    expect(screen.getByText("1 mekan · orta noktadan ≤ 9 km")).toBeInTheDocument();
  });

  /** Artboard 3329-3332: 390 host `.cta` — tam genişlik düğme + ortalı kısa not. */
  it("host: 390 CTA bloğu kısa notu taşır", () => {
    show({ ...base, sessionType: "GROUP", viewer: { participantId: "h", host: true }, participants: [host, guest] });
    expect(
      screen.getByText("Herkes bu listeyi görüyor; karıştırınca deste herkese açılır."),
    ).toBeInTheDocument();
  });

  /** Artboard 1546: davetli çipi başlığın SAĞINDA değil, rozet satırında (oturum adını ezmesin). */
  it("davetli: bekleme çipi rozet satırında, CTA bloğu yok", () => {
    show({ ...base, sessionType: "GROUP", viewer: { participantId: "a", host: false }, participants: [host, guest] });
    expect(screen.getByText("host karıştırınca deste açılır")).toBeInTheDocument();
    expect(screen.queryByText(/karıştırınca deste herkese açılır/)).not.toBeInTheDocument();
  });

  /** Artboard 1626: SOLO'da "Bireysel · N konum" çipi aktivite rozetinin yanında. */
  it("SOLO: konum çipi rozet satırında", () => {
    show({ ...base, sessionType: "SOLO", viewer: { participantId: "h", host: true }, participants: [host] });
    expect(screen.getByText("Bireysel · 1 konum")).toBeInTheDocument();
  });
});
