import { act, fireEvent, screen } from "@testing-library/react-native";

/**
 * Girdi olaylarını `act` içinde gönderen yardımcılar (M-5, 2026-09-08 sahada bulundu).
 *
 * NEDEN: `@testing-library/react-native` 14 + React 19 birleşiminde `fireEvent.changeText` /
 * `fireEvent(el, "valueChange", …)` çağrısı durum güncellemesini bir sonraki SENKRON iddiadan
 * önce BOŞALTMIYOR — ekran eski değeriyle kalıyor ve test, üretim kodu doğruyken kırılıyor
 * (ya da daha kötüsü: yanlış yönde yeşil kalıyor). Çıplak `TextInput` ile de yeniden üretildi,
 * yani atomlarımızla ilgisi yok.
 *
 * Ayrıca `Switch`: yerel `RCTSwitch` düğümünde yalnız `onChange` var, `onValueChange` React
 * bileşeninin içinde kalıyor. Bu yüzden platformun gönderdiği olayın AYNISI gönderilir —
 * `Switch._handleChange` gerçek yolundan geçer.
 *
 * Öğeler her çağrıda YENİDEN sorgulanır: yeniden çizimden sonra eski referans bayatlar.
 */
export async function toggleSwitch(label: string, value: boolean): Promise<void> {
  await act(async () => {
    screen.getByLabelText(label).props.onChange({ nativeEvent: { value } });
  });
}

export async function typeText(label: string, text: string): Promise<void> {
  await act(async () => {
    screen.getByLabelText(label).props.onChangeText(text);
  });
}

/**
 * Dokunma. `fireEvent.press` YAN ETKİ tetikleyen düğmelerde çalışır (router çağrısı gibi),
 * ama YEREL DURUM değiştiren düğmelerde yeni çizim bir sonraki iddiadan önce boşalmaz —
 * bu yardımcı `act` ile bekler.
 */
export async function tap(label: string): Promise<void> {
  await act(async () => {
    // `onPress` yerel `View` düğümünde YOK (Pressable dokunmayı responder olaylarıyla kurar),
    // bu yüzden RNTL'nin press'i kullanılır — yalnız `act` ile sarılır.
    fireEvent.press(screen.getByLabelText(label));
  });
}
