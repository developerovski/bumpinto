import { act, render, screen } from "@testing-library/react-native";

import { AppText } from "../components/atoms";
import BottomSheet from "../components/organisms/BottomSheet";
import { tap } from "../testUtils/interact";

/**
 * Alt sayfanın İKİ hareketi AYRIDIR: yaprak aşağıdan yukarı KAYAR (translateY), karartma
 * yerinde AÇILIR (opacity). Tek parça gibi kaydırılırsa karartma da aşağıdan gelir ve
 * "perde" hissi kaybolur.
 *
 * TEST BAŞINA TEK `render` (K-M29).
 */
const CLOSE = "Vazgeç";

test("kapalıyken hiç çizilmez", async () => {
  await render(
    <BottomSheet visible={false} onClose={jest.fn()} closeLabel={CLOSE}>
      <AppText>içerik</AppText>
    </BottomSheet>,
  );
  expect(screen.queryByTestId("bottom-sheet", { includeHiddenElements: true })).toBeNull();
  expect(screen.queryByText("içerik")).toBeNull();
});

test("açıkken içeriği ve kapatma yüzeyini çizer", async () => {
  await render(
    <BottomSheet visible onClose={jest.fn()} closeLabel={CLOSE}>
      <AppText>içerik</AppText>
    </BottomSheet>,
  );
  expect(screen.getByText("içerik")).toBeTruthy();
  expect(screen.getByLabelText(CLOSE)).toBeTruthy();
});

/* Karartma OPAKLIKLA gelir, yaprak KAYARAK — ikisi aynı değeri sürse de farklı stil
   özelliğine bağlanmalı. Karartma da `translateY` alsaydı perde aşağıdan sürünürdü. */
test("karartma opaklıkla, yaprak translateY ile canlanır", async () => {
  await render(
    <BottomSheet visible onClose={jest.fn()} closeLabel={CLOSE}>
      <AppText>içerik</AppText>
    </BottomSheet>,
  );
  const sheet = flat(screen.getByTestId("bottom-sheet").props.style);
  expect(sheet.some((x) => Array.isArray(x?.transform))).toBe(true);
  // Yaprak taşınır ama SOLMAZ: opaklık ona ait değil.
  expect(sheet.some((x) => x?.opacity != null)).toBe(false);

  const scrim = screen.getByLabelText(CLOSE);
  // Karartma kutusu (Pressable'ın EBEVEYNİ) opaklığı taşır.
  expect(flat(scrim.parent?.props.style).some((x) => x?.opacity != null)).toBe(true);
});

test("karartmaya dokunmak kapatır", async () => {
  const onClose = jest.fn();
  await render(
    <BottomSheet visible onClose={onClose} closeLabel={CLOSE}>
      <AppText>içerik</AppText>
    </BottomSheet>,
  );
  await tap(CLOSE);
  expect(onClose).toHaveBeenCalled();
});

/* Kapanış animasyonu sürerken yaprak ağaçta KALMALI: `visible` false olur olmaz sökülürse
   aşağı kayması hiç görünmez, sayfa bir karede yok olur. */
test("kapanışta yaprak animasyon bitene kadar ağaçta kalır", async () => {
  const view = await render(
    <BottomSheet visible onClose={jest.fn()} closeLabel={CLOSE}>
      <AppText>içerik</AppText>
    </BottomSheet>,
  );
  await act(async () => {
    view.rerender(
      <BottomSheet visible={false} onClose={jest.fn()} closeLabel={CLOSE}>
        <AppText>içerik</AppText>
      </BottomSheet>,
    );
  });
  // Animasyon tamamlanınca sökülür; jest'te zamanlayıcı ilerlemediği için hâlâ oradadır.
  expect(screen.queryByText("içerik")).toBeTruthy();
});

/** RN `style` iç içe dizi olabilir; tek düzeye indirir. */
function flat(style: unknown): Record<string, unknown>[] {
  if (Array.isArray(style)) return style.flatMap(flat);
  return style && typeof style === "object" ? [style as Record<string, unknown>] : [];
}
