import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import ParticipantRow from "../components/molecules/ParticipantRow";

/**
 * TEST BAŞINA TEK `render` (RNTL 14, 2026-09-08 sahada bulundu — K-M17'nin devamı).
 * Bir test içinde İKİNCİ bir `render` çağrılırsa `screen` SONRAKİ testler için bozulur:
 * sorgular boş ağaca bakar ve üretim kodu doğruyken "Unable to find…" verir. Aynı bileşenin
 * başka bir durumunu görmek gerekiyorsa AYRI test yazılır — `unmount()` bunu KURTARMIYOR.
 */

/* `hasLocation` sunucunun "bu kişi konumunu verdi mi" alanı; satırın konum/ulaşım kısmı ona
   bağlı (web `ParticipantRow` ile aynı kural). Alansız gelen katılımcı "Konum bekleniyor…"
   satırıdır — etiketi varmış gibi çizmek yanlış bilgi olurdu. */
const kerem = {
  id: "p3",
  displayName: "Kerem",
  hasLocation: true,
  locationLabel: "Helmond",
  travelMode: "CAR" as const,
  midpointMinutes: 30,
};

beforeEach(() => jest.clearAllMocks());

/* Satır rolüyle aranır: `Avatar` da adı `accessibilityLabel` olarak taşır, düz etiket
   araması iki eşleşme bulur. */
const rowFor = (name: string) => screen.getByRole("button", { name });

test("normal satır adı, konumu ve süreyi gösterir", async () => {
  await render(<ParticipantRow participant={kerem} slug="x7k2m" />);
  expect(screen.getByText("Kerem")).toBeTruthy();
  expect(screen.getByText("Helmond")).toBeTruthy();
  expect(screen.getByText("~30 dk")).toBeTruthy();
  expect(screen.getByText("Hazır")).toBeTruthy();
});

test("engellenen satır kimlik, konum ve DURUM göstermez", async () => {
  await render(<ParticipantRow participant={{ ...kerem, blocked: true }} slug="x7k2m" />);
  expect(screen.getByText("Engellenen kişi")).toBeTruthy();
  expect(screen.queryByText("Kerem")).toBeNull();
  expect(screen.queryByText(/Helmond/)).toBeNull();
  expect(screen.getByText("engellendi")).toBeTruthy();
  expect(screen.queryByText("Hazır")).toBeNull();
});

test("uzun basma bildir/engelle alt sayfasını açar", async () => {
  await render(<ParticipantRow participant={kerem} slug="x7k2m" />);
  const row = rowFor("Kerem");
  expect(row.props.accessibilityHint).toBe("Seçenekler için basılı tut");
  fireEvent(row, "longPress");
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/(sheets)/participant",
    params: { slug: "x7k2m", participantId: "p3", name: "Kerem", place: "Helmond" },
  });
});

test("kendi satırı alt sayfayı AÇMAZ", async () => {
  await render(<ParticipantRow participant={kerem} slug="x7k2m" self />);
  expect(screen.getByText("(sen)")).toBeTruthy();
  fireEvent(rowFor("Kerem"), "longPress");
  expect(router.push).not.toHaveBeenCalled();
});

test("engellenmiş satır alt sayfayı AÇMAZ", async () => {
  await render(<ParticipantRow participant={{ ...kerem, blocked: true }} slug="x7k2m" />);
  fireEvent(rowFor("Engellenen kişi"), "longPress");
  expect(router.push).not.toHaveBeenCalled();
});

/* Elle eklenen nokta bir KİŞİ değil: bildirilecek/engellenecek bir hesabı yok. */
test("elle eklenen nokta alt sayfayı AÇMAZ", async () => {
  await render(<ParticipantRow participant={{ ...kerem, manual: true }} slug="x7k2m" />);
  fireEvent(rowFor("Kerem"), "longPress");
  expect(router.push).not.toHaveBeenCalled();
});

test("konumu gelmemiş katılımcı bekliyor sayılır", async () => {
  await render(<ParticipantRow participant={{ id: "p9", displayName: "Ayşe" }} slug="x7k2m" />);
  expect(screen.getByText("Konum bekleniyor…")).toBeTruthy();
  expect(screen.getByText("Bekliyor")).toBeTruthy();
});

test("linki açmış ama konum vermemiş katılımcıda satır bunu söyler", async () => {
  await render(
    <ParticipantRow
      participant={{ id: "p9", displayName: "Ayşe", linkOpenedAt: "2026-09-08T10:00:00Z" }}
      slug="x7k2m"
    />,
  );
  expect(screen.getByText("Linki açtı · konum bekleniyor…")).toBeTruthy();
});

/* Artboard P7: çapalı oturumda merkez host'un seçtiği sabit noktadır — kimsenin konumu
   GEREKMEZ, dolayısıyla konumsuz katılımcı "bekleyen" değil HAZIR sayılır. */
test("çapalı oturumda konumsuz katılımcı HAZIR görünür", async () => {
  await render(
    <ParticipantRow participant={{ id: "p1", displayName: "Mehmet" }} slug="x7k2m" anchored self />,
  );
  expect(screen.getByText("Konum vermedin · gerekmiyor")).toBeTruthy();
  expect(screen.getByText("Hazır")).toBeTruthy();
  expect(screen.queryByText("Bekliyor")).toBeNull();
});

/* Çevrimdışı bir DURUM notudur, suçlama değil: ayrı rozet ya da "geç kaldı" damgası yok. */
test("çevrimdışı satır solar ve alt satıra tek kelime ekler", async () => {
  await render(<ParticipantRow participant={{ ...kerem, online: false }} slug="x7k2m" />);
  expect(screen.getByText("çevrimdışı")).toBeTruthy();
  expect(rowFor("Kerem").props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ opacity: 0.55 })]),
  );
});

test("elle eklenen nokta 'elle' rozeti ve kaldırma düğmesi taşır", async () => {
  const onRemove = jest.fn();
  await render(
    <ParticipantRow participant={{ ...kerem, manual: true }} slug="x7k2m" onRemove={onRemove} />,
  );
  expect(screen.getByText("elle")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Kerem konumunu kaldır"));
  expect(onRemove).toHaveBeenCalled();
});

/* Kendi satırında presence çizilmez: ekrana bakan kişiye "çevrimdışısın" demek anlamsız, ve
   mobilde canlı kanal M-6'da açıldığı için sunucu bu istemciyi hep çevrimdışı görüyor —
   kullanıcı kendi satırını soluk ve "offline" etiketli görüyordu (2026-09-08 emülatör). */
test("kendi satırı çevrimdışı GÖSTERİLMEZ, solmaz", async () => {
  await render(<ParticipantRow participant={{ ...kerem, online: false }} slug="x7k2m" self />);
  expect(screen.queryByText("çevrimdışı")).toBeNull();
  expect(rowFor("Kerem").props.style).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ opacity: 0.55 })]),
  );
});

/* --- M-9 presence 2.0 --------------------------------------------------------------- */

/* `lastSeenAt` GELİRSE "çevrimdışı" kelimesi saate döner. Alan yoksa satır eski hâlinde
   kalır — sunucudan gelmeyen bir damga uydurulmaz. */
test("çevrimdışı satırda lastSeenAt varsa saat yazılır", async () => {
  await render(
    <ParticipantRow
      participant={{ ...kerem, online: false, lastSeenAt: "2026-09-06T10:38:00Z" }}
      slug="x7k2m"
    />,
  );
  expect(screen.getByText(/Son görülen · /)).toBeTruthy();
  expect(screen.queryByText("çevrimdışı")).toBeNull();
});

test("lastSeenAt geçersizse yalnız 'çevrimdışı' kalır", async () => {
  await render(
    <ParticipantRow participant={{ ...kerem, online: false, lastSeenAt: "yok" }} slug="x7k2m" />,
  );
  expect(screen.getByText("çevrimdışı")).toBeTruthy();
  expect(screen.queryByText(/Son görülen/)).toBeNull();
});

/* Dürt düğmesi ÇAĞIRANIN kararı: `onNudge` verilmeyen satırda hiç çizilmez. */
test("onNudge verilmeyen satırda dürt düğmesi yok", async () => {
  await render(<ParticipantRow participant={{ id: "p9", displayName: "Ayşe" }} slug="x7k2m" />);
  expect(screen.queryByLabelText("Ayşe'i dürt")).toBeNull();
});

test("dürt düğmesi kimliği ve adı geri verir", async () => {
  const onNudge = jest.fn();
  await render(
    <ParticipantRow participant={{ id: "p9", displayName: "Ayşe" }} slug="x7k2m" onNudge={onNudge} />,
  );
  fireEvent.press(screen.getByLabelText("Ayşe'i dürt"));
  expect(onNudge).toHaveBeenCalledWith("p9", "Ayşe");
});

test("soğuma sürerken dürt düğmesi pasif", async () => {
  const onNudge = jest.fn();
  await render(
    <ParticipantRow
      participant={{ id: "p9", displayName: "Ayşe" }}
      slug="x7k2m"
      onNudge={onNudge}
      nudgeDisabled
    />,
  );
  expect(screen.getByLabelText("Ayşe'i dürt").props.accessibilityState).toEqual(
    expect.objectContaining({ disabled: true }),
  );
});

/* Elle eklenen noktanın hesabı YOK: dürtülecek bir cihaz da yok. Kendi satırı da elenir. */
test("elle eklenen nokta ve kendi satırı dürtülemez", async () => {
  await render(
    <ParticipantRow
      participant={{ ...kerem, manual: true }}
      slug="x7k2m"
      onNudge={jest.fn()}
    />,
  );
  expect(screen.queryByLabelText("Kerem'i dürt")).toBeNull();
});

test("kendi satırında dürt düğmesi çizilmez", async () => {
  await render(<ParticipantRow participant={kerem} slug="x7k2m" self onNudge={jest.fn()} />);
  expect(screen.queryByLabelText("Kerem'i dürt")).toBeNull();
});
