import { buildIcs, type CalendarEvent } from "@bumpinto/shared";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/**
 * ICS'i önbelleğe yazar ve dosya URI'sini döner.
 *
 * `expo-calendar` KULLANILMAZ: takvim yazma izni istemek, kullanıcıdan tüm takvimine erişim
 * istemek demektir — bir tek etkinlik eklemek için orantısız (ve mağaza incelemesinde soru
 * işareti). Sistem paylaşım sayfası aynı sonucu izinsiz verir.
 */
export function writeIcsFile(event: CalendarEvent, slug: string): string {
  const file = new File(Paths.cache, `bumpinto-${slug}.ics`);
  file.write(buildIcs(event));
  return file.uri;
}

export type IcsResult = "shared" | "unavailable" | "failed";

/** Dosyayı sistem paylaşım sayfasına verir; kullanıcı "Takvim"i seçince etkinlik eklenir. */
export async function shareIcs(
  event: CalendarEvent,
  slug: string,
  dialogTitle: string,
): Promise<IcsResult> {
  if (!(await Sharing.isAvailableAsync())) return "unavailable";
  try {
    const uri = writeIcsFile(event, slug);
    await Sharing.shareAsync(uri, {
      mimeType: "text/calendar",
      UTI: "com.apple.ical.ics",
      dialogTitle,
    });
    return "shared";
  } catch {
    return "failed";
  }
}
