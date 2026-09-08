import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PERSON_GRADIENTS } from "../../lib/personColor";
import RangeBar from "./RangeBar";

const venue = (m: Record<string, number>) => ({
  id: "v1", name: "Café Berlage",
  travel: Object.entries(m).map(([participantId, minutes]) => ({ participantId, minutes })),
});
const travel = {
  labels: { s: "Sen", k: "Kerem", a: "Ayşe" },
  names: { s: "Mehmet", k: "Kerem", a: "Ayşe" },
  /* Kanonik dizin — `useTravelLabels` bunu `SessionView.participants` sırasından kurar. */
  colors: { s: 0, k: 1, a: 2 },
  selfId: "s",
};

describe("RangeBar", () => {
  it("aralığı, adalet satırını ve baş harfli noktaları basar", () => {
    render(<RangeBar venue={venue({ s: 30, k: 35, a: 25 })} travel={travel} />);
    expect(screen.getByText("25–35 dk")).toBeInTheDocument();
    expect(screen.getByText("Herkese ~aynı")).toBeInTheDocument();
    expect(screen.getByText(/fark 10 dk · en uzun yol Kerem/)).toBeInTheDocument();
    // Kendi noktan da GERÇEK adının baş harfini taşır ("Sen" → "S" üçüncü bir kişi gibi okunuyordu);
    // "sen" bilgisi koyu DIŞ HALKADAN ve ipucundan gelir — dolgu artık kimlik rengidir.
    expect(screen.getByTestId("range-dot-s")).toHaveTextContent("M");
    expect(screen.getByTestId("range-dot-s").className).toContain("ring-ink");
    expect(screen.getByTestId("range-dot-k").className).not.toContain("ring-ink");
    // Noktalar aria-hidden; dakikalar sr-only listede.
    expect(screen.getByText("Kerem ~35 dk")).toBeInTheDocument();
  });

  it("aykırı kişi varsa bant amber, o nokta işaretli — kenarlık YALNIZ amber", () => {
    render(<RangeBar venue={venue({ s: 20, k: 45, a: 25 })} travel={travel} />);
    expect(screen.getByTestId("range-span").className).toContain("bg-amber");
    const cls = screen.getByTestId("range-dot-k").className;
    expect(cls).toContain("border-amber");
    expect(cls).not.toContain("border-grass");
    expect(cls).not.toContain("border-flame-deep");
  });

  // A2/A5: pos() artboard ölçüsüyle (15%…85%) birebir — dolaylı metin/sınıf kontrolü YETMEZ.
  it("pos() noktaları ve bandı artboard ölçüsüne (15%/50%/85%) yerleştirir", () => {
    render(<RangeBar venue={venue({ s: 30, k: 35, a: 25 })} travel={travel} />);
    expect(screen.getByTestId("range-dot-a")).toHaveStyle({ left: "15%" });
    expect(screen.getByTestId("range-dot-k")).toHaveStyle({ left: "85%" });
    expect(screen.getByTestId("range-dot-s")).toHaveStyle({ left: "50%" });
    expect(screen.getByTestId("range-span")).toHaveStyle({ left: "15%", width: "70%" });
  });

  it("çapalı oturumda lead metni basılmaz ama aralık ve fark satırı kalır", () => {
    render(<RangeBar venue={venue({ s: 30, k: 35, a: 25 })} travel={{ ...travel, anchored: true }} />);
    expect(screen.getByText("25–35 dk")).toBeInTheDocument();
    expect(screen.queryByText("Herkese ~aynı")).not.toBeInTheDocument();
    expect(screen.getByText(/fark 10 dk · en uzun yol Kerem/)).toBeInTheDocument();
  });

  it("herkes eşit dakikadaysa bant çizilmez, değer tek sayı basılır", () => {
    render(<RangeBar venue={venue({ s: 30, k: 30 })} travel={travel} />);
    expect(screen.queryByTestId("range-span")).not.toBeInTheDocument();
    expect(screen.getByText("~30 dk")).toBeInTheDocument();
  });

  /** İki işaret AYRI ailelerde durur ve üst üste binebilir: aykırılık KENARLIK (amber), "sen"
      DIŞ HALKA (ink). Dolgu ikisine de ait değil — o kimlik rengidir. */
  it("kendi kişin AYNI ANDA aykırıysa amber kenarlık + koyu halka birlikte", () => {
    render(<RangeBar venue={venue({ s: 45, k: 20, a: 25 })} travel={travel} />);
    const dot = screen.getByTestId("range-dot-s");
    expect(dot.className).toContain("border-amber");
    expect(dot.className).toContain("ring-ink");
    // Kimlik dolgusu iki işaretten de bağımsız — kendi rengin yerinde kalır.
    expect(dot.style.background).toBe(PERSON_GRADIENTS[0]);
  });

  /* Kullanıcı kararı 2026-09-08: aynı baş harfli iki kişi (Ayşe / Ahmet) yalnız RENKLE ayrışır.
     Nokta dolgusu kanonik dizine bağlıdır, `entries` DAKİKA sırasına değil. */
  it("aynı baş harfli iki kişi farklı renk alır", () => {
    const two = {
      labels: { a1: "Ayşe", a2: "Ahmet" },
      names: { a1: "Ayşe", a2: "Ahmet" },
      colors: { a1: 1, a2: 2 },
      selfId: null,
    };
    render(<RangeBar venue={venue({ a1: 25, a2: 40 })} travel={two} />);
    const d1 = screen.getByTestId("range-dot-a1");
    const d2 = screen.getByTestId("range-dot-a2");
    expect(d1).toHaveTextContent("A");
    expect(d2).toHaveTextContent("A");
    expect(d1.style.background).toBe(PERSON_GRADIENTS[1]);
    expect(d2.style.background).toBe(PERSON_GRADIENTS[2]);
    expect(d1.style.background).not.toBe(d2.style.background);
  });

  it("tek kişide bant yok; yol verisi yoksa hiç çizilmez", () => {
    const { rerender, container } = render(<RangeBar venue={venue({ s: 30 })} travel={travel} />);
    expect(screen.getByText("~30 dk")).toBeInTheDocument();
    expect(screen.queryByTestId("range-span")).not.toBeInTheDocument();
    rerender(<RangeBar venue={{ id: "v1", name: "X" }} travel={travel} />);
    expect(container).toBeEmptyDOMElement();
  });

  /* Aynı dakikadaki kişiler `pos()`tan AYNI yüzdeyi alıyor ve noktalar birbirini tam örtüyordu:
     "herkes ~30 dk" satırında 2 kişilik grupta ekranda TEK nokta kalıyordu — ikinci kişi yok
     sayılmış oluyordu. Beraberlik yelpazelenmeli, ikisi de görünmeli. */
  it("eşit dakikadaki kişiler üst üste binmez, ayrı konumlarda basılır", () => {
    render(<RangeBar venue={venue({ s: 30, k: 30 })} travel={travel} />);
    const a = screen.getByTestId("range-dot-s");
    const b = screen.getByTestId("range-dot-k");
    expect(a.style.left).not.toBe(b.style.left);
    // İkisi de bandın içinde kalır (kırpılma yok).
    for (const el of [a, b]) {
      const left = Number.parseFloat(el.style.left);
      expect(left).toBeGreaterThanOrEqual(3);
      expect(left).toBeLessThanOrEqual(97);
    }
  });

  /* Baş harf tek başına "Y kim, M kim" sorusunu cevaplamıyor; nokta `aria-hidden` olduğu için
     işaretçi kullanıcısının hiçbir yolu yoktu. Yerel ipucu adı ve dakikayı söyler. */
  it("nokta üzerinde ad ve dakika ipucu taşır", () => {
    render(<RangeBar venue={venue({ s: 30, k: 35 })} travel={travel} />);
    expect(screen.getByTestId("range-dot-k")).toHaveAttribute("title", "Kerem · ~35 dk");
    expect(screen.getByTestId("range-dot-s")).toHaveAttribute("title", "Mehmet (sen) · ~30 dk");
  });
});
