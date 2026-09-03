import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FinishedCard from "./FinishedCard";

const people = [
  { id: "me", displayName: "Mehmet", host: true, hasLocation: true, deckDone: true, manual: false },
  { id: "a", displayName: "Ayşe", host: false, hasLocation: true, deckDone: true, manual: false },
  { id: "k", displayName: "Kerem", host: false, hasLocation: true, deckDone: false, manual: false },
];

const allDone = people.map((p) => ({ ...p, deckDone: true }));

const base = {
  likedCount: 4, sending: false, sent: false, host: true, selfId: "me",
  participants: people, shareUrl: "https://x/j/a", shareText: "gel",
  onSend: vi.fn(), onList: vi.fn(), onForce: vi.fn(),
};

describe("FinishedCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gönderilmeden önce başlık beğeni sayısını söyler, gönder butonu var", () => {
    render(<FinishedCard {...base} />);
    expect(screen.getByText("4 mekan beğendin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Beğenilerimi gönder" })).toBeInTheDocument();
  });

  it("gönderdikten sonra gönder butonu KAYBOLUR, 'Listeye dön, düzelt' kalır", () => {
    render(<FinishedCard {...base} sent />);
    expect(screen.queryByRole("button", { name: "Beğenilerimi gönder" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Listeye dön, düzelt" })).toBeInTheDocument();
  });

  it("gönderdikten sonra kişi satırları: bitiren story-ring, kaydıran rozetli", () => {
    render(<FinishedCard {...base} sent />);
    expect(screen.getByText("Kerem")).toBeInTheDocument();
    expect(screen.getByText("Kaydırıyor")).toBeInTheDocument();
  });

  it("gönderdikten sonra onay rozeti ve 'kaydırıyor' başlığı görünür", () => {
    render(<FinishedCard {...base} sent />);
    expect(screen.getByText("Beğenilerin gönderildi")).toBeInTheDocument();
    expect(screen.getByText("Şimdi bekliyoruz · Kerem kaydırıyor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bekleyenleri dürt" })).toBeInTheDocument();
  });

  it("herkes bitirince başlık 'diğerleri bekliyor' değil, 'herkes bitirdi' der", () => {
    render(<FinishedCard {...base} sent participants={allDone} />);
    expect(screen.getByText("Herkes bitirdi — sonuç birazdan açıklanır")).toBeInTheDocument();
  });

  it("host + ≥1 bitiren + ≥1 bitirmeyen → 'olmadan devam et'; sayaç yok", () => {
    render(<FinishedCard {...base} sent />);
    fireEvent.click(screen.getByRole("button", { name: "Kerem olmadan devam et" }));
    expect(base.onForce).toHaveBeenCalled();
  });

  it("host değilse 'olmadan devam et' yok, onForce hiç çağrılmaz", () => {
    render(<FinishedCard {...base} sent host={false} />);
    expect(screen.queryByRole("button", { name: /olmadan devam et/ })).not.toBeInTheDocument();
    expect(base.onForce).not.toHaveBeenCalled();
  });

  it("anyDone false (kimse bitirmedi, gönderilmedi) → 'olmadan devam et' yok", () => {
    const nobodyDone = people.map((p) => ({ ...p, deckDone: false }));
    render(<FinishedCard {...base} sent={false} participants={nobodyDone} />);
    expect(screen.queryByRole("button", { name: /olmadan devam et/ })).not.toBeInTheDocument();
  });

  it("0 beğeniyle uyarı ve birincil buton 'Listeye dön'", () => {
    render(<FinishedCard {...base} likedCount={0} />);
    expect(screen.getByText(/Kimse ortak beğenmezse sonuç boş kalır/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Listeye dön, düzelt" })).toBeInTheDocument();
  });
});
