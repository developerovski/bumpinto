# Plan 4: Expo RN Host Uygulaması

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Host'un oturum kurduğu, davet paylaştığı, desteyi kaydırdığı ve kararı yönettiği Expo uygulaması — Claude Design'a sadık, atomic design + Zustand + axios mimarisiyle.

**Architecture:** `frontend/mobile` = Expo + expo-router. **Atomic design**: `src/components/atoms|molecules|organisms`; ekran dosyaları (`app/*`) yalnız kompozisyon + store bağlama. State: **Zustand** (`sessionStore`, `deckStore`). HTTP: `@bumpinto/shared`'daki **axios** client (Authorization + X-Participant-Token interceptor'ları). Canlı veri: 3 sn polling + STOMP.

**Tech Stack:** Expo SDK (güncel, 54+), expo-router, expo-auth-session (Google), expo-secure-store, expo-clipboard, expo-location, @expo-google-fonts (Bricolage Grotesque, Figtree, Caveat), react-native-gesture-handler, react-native-reanimated, **zustand 5**, @stomp/stompjs, axios (shared üzerinden).

**Ön koşul:** Plan 3 `done`. Google OAuth client id'leri kullanıcıda.

---

## UI Kaynağı: Claude Design (BAĞLAYICI)

Bu plandaki ekranların görsel kaynağı Claude Design'dır. Plandaki kod işlevsel
iskelettir — **nihai görünüm değildir**. Yürütücü ajan:

1. Her UI görevine başlarken ilgili artboard'u **güncel** halinden okur:
   `mcp__claude_design__read_file` → project_id `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`,
   path `Mobil Ekranlar v2.dc.html` (`offset`/`limit` ile; blokları
   `data-screen-label` özniteliğinden bul). Token referansı: project_id
   `b536b3aa-8945-4865-b7e5-e693f8d5a588`, path `Design System v2.dc.html`.
2. Yerleşim, boşluk, renk, tipo ve **mikro-kopya** dahil tasarıma sadık kal;
   çelişkide **tasarım kazanır**.
3. Tasarımda olmayan ekran/durum **icat edilmez** — INDEX'te `blocked` + kullanıcıya sor.
4. Görev kapanışında ekran-artboard karşılaştırması (browser aracı varsa
   `render_preview`; yoksa kullanıcıdan görsel onay).

Artboard ↔ ekran eşlemesi:

| Artboard | Ekran |
|---|---|
| 01 · Giriş | `app/index.tsx` |
| 02 · Oturumlar | `app/sessions/index.tsx` |
| 03 · Yeni oturum | `app/sessions/new.tsx` |
| 04 · Lobi | `app/sessions/[slug].tsx` (COLLECTING durumu) |
| 05 · Deste | `src/components/organisms/SwipeDeck.tsx` + `[slug].tsx` |
| 06 · Ortak nokta | `src/screens/ResultScreen.tsx` — açılış/kutlama katı |
| 07 · Runoff | `src/screens/RunoffScreen.tsx` |
| 08 · Karar | `src/screens/ResultScreen.tsx` — detay katı |
| 09 · Profil | `app/profile.tsx` |

### Tasarım denetimi bulguları (2026-09-01) — bu plan başlamadan KARAR gerekiyor

`ActivityType` 5→15 genişletmesi sonrası yapılan UI/UX denetimi. Kural 3 gereği ajan bunları
kendi başına çözmez: **tasarım kararı kullanıcınındır.**

| # | Ağırlık | Bulgu | Artboard | Karar |
|---|---|---|---|---|
| 1 | **ENGELLEYİCİ** | 15 chip tek satırdan ~5 satıra çıkıyor (`.chip` 46px + 8px gap → +216px); taşma deseni tasarımda yok. 390px'te kıl payı sığıyor, 375px'te veya Dynamic Type büyütülünce CTA katlanın altına iniyor. | 03 | Serbest sarma mı, kategori grubu mu (Yeme-içme / Hareket / Kültür / Gece), "+n" disclosure mu? |
| 2 | ÖNEMLİ | `.pho-tag` "foto · Places" rozeti, `photoUrl=null` gelen 10 tür için yanlış bilgi veriyor. | 05, 08 | **Karar gerekmez** — koşullu render (kod işi). |
| 3 | ÖNEMLİ | Yalnız 3 gradyan (`pA/pB/pC`) ve mekan→gradyan eşleme kuralı yok. Sinema/Müze/Oyun destesinde 12 kartın 12'si gradyan olur; `.pol-ph` kartın ~%64'ü. Monogram kartları ayırt ediyor, ama renk her 3 kartta bir tekrar ediyor. | 05, 06, 07 | Gradyan sayısı artsın mı, tür bazlı tint mi, fotoğrafsız türde `.pol-ph` kısalsın mı? |
| 4 | ÖNEMLİ | "Varsayılan etkinlik" satırının chevron'u bir seçim yüzeyine işaret ediyor; o sheet tasarımda yok. 15 değerle daha da gerekli. | 09 | 1 numaralı kararla **aynı deseni** paylaşmalı. |
| 5 | MİNÖR | 5. chip'in metni "Aktivite"; sözleşmede `ACTIVITY` artık bowling demek. | 03 | Tasarım metni "Bowling" olsun mu? |
| 6 | MİNÖR | Aktivite başına ikon/renk tasarımda hiç yok. 5 metin chip ayırt edilebiliyordu, 15 zor. DS "emoji ikon"u yasaklıyor → SVG set gerekir. | 03, DS | İkon seti yapılacak mı? |

**Bu denetimden BAĞIMSIZ, önceden var olan boşluk:** artboard 08'deki "Gruba paylaş" butonunun
ürettiği **viral paylaşım kartının tasarımı hiçbir dosyada yok**. `ActivityType` değişikliğiyle
ilgisi yoktur, ama bu plan o butonu uygulayacağı için karar gerekir.

**Sorun ÇIKMAYAN yerler** (denetimde doğrulandı, tekrar araştırma):

- Fotoğrafsız kart **tasarımda çözülmüş durumdur** — DS kuralı: *"Fotoğraf yoksa ambient gradyan
  + monogram — asla çizgili kutu."* Mockup'ların tamamı zaten bu varyantı gösteriyor, hiçbir
  ekranda `<img>` yok. Placeholder icat edilmez.
- Ekran içi sonuç kartları (06, 08) fotoğrafa bağımlı değil; monogramla çalışıyor.
- Uzun etiketler taşmıyor ("Doğa yürüyüşü" en uzunu, 04 ve 02'de sığıyor) — ama bu iki öğede
  `text-overflow` tanımsız; uygulama sırasında tek satır + ellipsis kuralı eklenir.

## Frontend mimari kuralları (BAĞLAYICI — kullanıcı talimatı 2026-09-01)

- **Atomic design:** ekran dosyalarında ham `Pressable/TextInput`/kopya stil YASAK —
  her görsel parça `atoms/molecules/organisms` altından reusable bileşendir.
- **State: Zustand** (`sessionStore`, `deckStore`). Bileşenler prop alır; store'a
  yalnız ekranlar/organizmalar bağlanır.
- **HTTP: axios** — yalnız `@bumpinto/shared` client'ı (`src/lib/api.ts` bağlar).
  Bileşen içinden doğrudan axios/fetch YASAK.

## Güvenlik modeli (BAĞLAYICI — kullanıcı talimatı 2026-09-01)

- Google id_token cihazda SAKLANMAZ — yalnız `/api/auth/google` takasında kullanılır.
- Backend'in döndürdüğü access token **Expo SecureStore**'da tutulur ve her istekte
  `Authorization: Bearer` header'ıyla gider (shared axios interceptor'ı).
- Katılımcı token'ı (host'un kendi swipe'ları için) bellekte + istekte header'la.
- **Profiller:** local (varsayılan env), preprod ve prod — EAS build profillerinin
  `env` bloklarından gelir (Task 7).

## Bu plana özel kurallar

- **INDEX güncelle**; **git yazma YOK**; komutlar `rtk` ile; aksi yazmadıkça
  `frontend/mobile/` dizininden.
- Token değerleri `src/theme.ts`'te; kaynağı Design System v2 — çelişkide o kazanır.

---

### Task 1: Expo iskeleti + tema

**Files:**
- Create: `frontend/mobile/` (create-expo-app)
- Modify: `frontend/mobile/package.json`
- Create: `frontend/mobile/src/theme.ts`
- Modify: `frontend/mobile/app/_layout.tsx`

- [ ] **Step 1: Oluştur** (repo kökünden)

```bash
cd frontend && rtk pnpm create expo-app@latest mobile --template default && cd ..
rtk pnpm install
```

- [ ] **Step 2: Bağımlılıklar** — `package.json` içinde `"name": "@bumpinto/mobile"` yap; sonra
(frontend/mobile içinden):

```bash
rtk pnpm exec npx expo install expo-auth-session expo-crypto expo-secure-store \
  expo-clipboard expo-location react-native-gesture-handler react-native-reanimated
rtk pnpm add @bumpinto/shared@workspace:* zustand @stomp/stompjs \
  @expo-google-fonts/bricolage-grotesque @expo-google-fonts/figtree @expo-google-fonts/caveat
```

- [ ] **Step 3: theme.ts** (Design System v2 ile birebir)

```typescript
export const colors = {
  paper: "#FFFBF6",
  card: "#FFFFFF",
  ink: "#27203B",
  ink2: "#6E6584",
  ink3: "#A79DB8",
  flame: "#FD3E6B",
  flameDeep: "#DE2456",
  flameWash: "#FFE9EF",
  sun: "#FFC93C",
  grass: "#0B7A44",
  grassWash: "#DFF5E9",
  violet: "#6234D8",
  amber: "#A96A0B",
  amberWash: "#FFF1D6",
  line: "#F1E8DE",
  line2: "#E4D9CD",
  lineIn: "#91869C",
} as const;

export const fonts = {
  head: "BricolageGrotesque_800ExtraBold",
  headBold: "BricolageGrotesque_700Bold",
  body: "Figtree_400Regular",
  bodyMedium: "Figtree_600SemiBold",
  hand: "Caveat_600SemiBold",
} as const;

export const radius = { card: 22, input: 16, pill: 999 } as const;
```

- [ ] **Step 4: app/_layout.tsx** (font + gesture root)

```tsx
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import { Caveat_600SemiBold } from "@expo-google-fonts/caveat";
import { Figtree_400Regular, Figtree_600SemiBold, useFonts } from "@expo-google-fonts/figtree";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colors } from "../src/theme";

export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_600SemiBold,
    Caveat_600SemiBold,
  });
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} />
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 5: Doğrula** — `rtk pnpm exec npx expo start` → açılır, font hatası yok.

- [ ] **Step 6: INDEX güncelle + Commit (kullanıcı)** — `feat(mobile): expo iskeleti + tema`

---

### Task 2: Atom bileşenleri (her biri kendi dosyasında)

**Files:**
- Create: `frontend/mobile/src/components/atoms/AppText.tsx`
- Create: `frontend/mobile/src/components/atoms/Button.tsx`
- Create: `frontend/mobile/src/components/atoms/Chip.tsx`
- Create: `frontend/mobile/src/components/atoms/Badge.tsx`
- Create: `frontend/mobile/src/components/atoms/Card.tsx`
- Create: `frontend/mobile/src/components/atoms/Sticker.tsx`
- Create: `frontend/mobile/src/components/atoms/Avatar.tsx`
- Create: `frontend/mobile/src/components/atoms/Progress.tsx`
- Create: `frontend/mobile/src/components/atoms/Input.tsx`
- Create: `frontend/mobile/src/components/atoms/index.ts`

- [ ] **Step 1: AppText.tsx** (tipografi tek atomdan — ham `<Text>` ekranlarda yasak)

```tsx
import { StyleSheet, Text, type TextProps } from "react-native";
import { colors, fonts } from "../../theme";

type Variant = "display" | "h2" | "h3" | "body" | "muted" | "label" | "hand";

export default function AppText({ variant = "body", style, ...rest }:
  TextProps & { variant?: Variant }) {
  return <Text {...rest} style={[styles[variant], style]} />;
}

const styles = StyleSheet.create({
  display: { fontFamily: fonts.head, fontSize: 33, lineHeight: 37, color: colors.ink,
    letterSpacing: -0.5 },
  h2: { fontFamily: fonts.headBold, fontSize: 21, color: colors.ink },
  h3: { fontFamily: fonts.headBold, fontSize: 17, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 23, color: colors.ink },
  muted: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.ink2 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  hand: { fontFamily: fonts.hand, fontSize: 19, color: colors.ink2,
    transform: [{ rotate: "-1.5deg" }] },
});
```

- [ ] **Step 2: Button.tsx**

```tsx
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts, radius } from "../../theme";

type Kind = "flame" | "white" | "ghost" | "danger";

export default function Button(props: {
  title: string;
  onPress: () => void;
  kind?: Kind;
  disabled?: boolean;
}) {
  const kind = props.kind ?? "flame";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [
        s.base,
        s[kind],
        props.disabled && { opacity: 0.45 },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <Text style={[s.text, kind === "flame" && { color: "#fff" },
        kind === "ghost" && { color: colors.flameDeep },
        kind === "danger" && { color: "#C0392B" }]}>
        {props.title}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radius.pill, alignItems: "center",
    justifyContent: "center", paddingHorizontal: 22, borderWidth: 1.5,
    borderColor: "transparent", width: "100%" },
  flame: { backgroundColor: colors.flameDeep, shadowColor: colors.flameDeep,
    shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  white: { backgroundColor: colors.card, borderColor: colors.line2 },
  ghost: { backgroundColor: "transparent" },
  danger: { backgroundColor: "transparent", borderColor: "#EFC9C2" },
  text: { fontFamily: fonts.headBold, fontSize: 16, color: colors.ink },
});
```

- [ ] **Step 3: Kalan atomlar** (`Chip`, `Badge`, `Card`, `Sticker`, `Avatar`, `Progress`, `Input`)

`Chip.tsx`:

```tsx
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts, radius } from "../../theme";

export default function Chip(props: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!props.on }}
      onPress={props.onPress}
      style={[s.chip, props.on && s.on]}
    >
      <Text style={[s.text, props.on && { color: colors.flameDeep }]}>{props.label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: { minHeight: 46, paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: 1.5,
    borderColor: colors.line2, backgroundColor: colors.card, alignItems: "center",
    justifyContent: "center" },
  on: { backgroundColor: colors.flameWash, borderColor: colors.flameDeep },
  text: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.ink2 },
});
```

`Badge.tsx`:

```tsx
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "../../theme";

type Tone = "flame" | "grass" | "amber" | "neutral";
const BG: Record<Tone, string> = { flame: colors.flameWash, grass: colors.grassWash,
  amber: colors.amberWash, neutral: "#F4EEE6" };
const FG: Record<Tone, string> = { flame: colors.flameDeep, grass: colors.grass,
  amber: colors.amber, neutral: colors.ink2 };

export default function Badge(props: { label: string; tone?: Tone }) {
  const tone = props.tone ?? "neutral";
  return (
    <View style={[s.badge, { backgroundColor: BG[tone] }]}>
      <Text style={[s.text, { color: FG[tone] }]}>{props.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { paddingHorizontal: 11, paddingVertical: 4.5, borderRadius: radius.pill,
    alignSelf: "flex-start" },
  text: { fontFamily: fonts.bodyMedium, fontSize: 12 },
});
```

`Card.tsx`:

```tsx
import { View, type ViewProps } from "react-native";
import { colors, radius } from "../../theme";

export default function Card({ style, ...rest }: ViewProps) {
  return (
    <View
      {...rest}
      style={[
        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
          borderRadius: radius.card, padding: 16, shadowColor: colors.ink,
          shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
          elevation: 2 },
        style,
      ]}
    />
  );
}
```

`Sticker.tsx`:

```tsx
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, fonts } from "../../theme";

export default function Sticker(props: { label: string; style?: ViewStyle }) {
  return (
    <View style={[s.wrap, props.style]}>
      <Text style={s.text}>{props.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 12,
    backgroundColor: colors.sun, borderWidth: 1.5, borderColor: colors.ink,
    transform: [{ rotate: "-2.5deg" }], alignSelf: "flex-start" },
  text: { fontFamily: fonts.head, fontSize: 12.5, color: colors.ink },
});
```

`Avatar.tsx`:

```tsx
import { Text, View } from "react-native";
import { fonts } from "../../theme";

const PALETTE = ["#D91E52", "#0B7A44", "#5A2FD0", "#E08900"];

export default function Avatar(props: { name: string; index?: number; size?: number }) {
  const size = props.size ?? 36;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2,
      backgroundColor: PALETTE[(props.index ?? 0) % PALETTE.length],
      alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontFamily: fonts.headBold, fontSize: size * 0.4 }}>
        {props.name[0]?.toUpperCase()}
      </Text>
    </View>
  );
}
```

`Progress.tsx`:

```tsx
import { View } from "react-native";
import { colors } from "../../theme";

export default function Progress(props: { value: number }) {
  return (
    <View style={{ height: 7, borderRadius: 4, backgroundColor: "#F0E9E0", overflow: "hidden" }}>
      <View style={{ height: "100%", borderRadius: 4, backgroundColor: colors.flame,
        width: `${Math.min(100, props.value * 100)}%` }} />
    </View>
  );
}
```

`Input.tsx`:

```tsx
import { TextInput, type TextInputProps } from "react-native";
import { colors, fonts, radius } from "../../theme";

export default function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.ink3}
      {...props}
      style={[
        { minHeight: 52, paddingHorizontal: 18, borderRadius: radius.input, borderWidth: 1.5,
          borderColor: colors.lineIn, backgroundColor: colors.card, fontFamily: fonts.body,
          fontSize: 16, color: colors.ink },
        props.style,
      ]}
    />
  );
}
```

`index.ts`:

```typescript
export { default as AppText } from "./AppText";
export { default as Avatar } from "./Avatar";
export { default as Badge } from "./Badge";
export { default as Button } from "./Button";
export { default as Card } from "./Card";
export { default as Chip } from "./Chip";
export { default as Input } from "./Input";
export { default as Progress } from "./Progress";
export { default as Sticker } from "./Sticker";
```

- [ ] **Step 4: Derleme** — `rtk pnpm exec npx tsc --noEmit` → hatasız.

- [ ] **Step 5: INDEX güncelle + Commit (kullanıcı)** — `feat(mobile): atom bilesenleri`

---

### Task 3: Google girişi + axios bağlama + Giriş ekranı (01)

**Files:**
- Create: `frontend/mobile/src/lib/tokenStore.ts`
- Create: `frontend/mobile/src/lib/auth.ts`
- Create: `frontend/mobile/src/lib/api.ts`
- Modify: `frontend/mobile/app/index.tsx`

- [ ] **Step 1: lib/tokenStore.ts + lib/auth.ts**

`lib/tokenStore.ts` (SecureStore — tek erişim noktası):

```typescript
import * as SecureStore from "expo-secure-store";

const KEY = "bumpinto.accessToken";

export function getAccessToken() {
  return SecureStore.getItemAsync(KEY);
}

export function setAccessToken(token: string) {
  return SecureStore.setItemAsync(KEY, token);
}

export function clearAccessToken() {
  return SecureStore.deleteItemAsync(KEY);
}
```

`lib/auth.ts` (Google id_token → backend access token takası):

```typescript
import * as Google from "expo-auth-session/providers/google";
import { useEffect, useState } from "react";
import { api } from "./api";
import { clearAccessToken, getAccessToken, setAccessToken } from "./tokenStore";

export function useGoogleAuth() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    void getAccessToken().then((token) => setSignedIn(!!token));
  }, []);

  useEffect(() => {
    const idToken = response?.type === "success" ? response.params.id_token : null;
    if (!idToken) return;
    // Google id_token yalnız takas için; cihazda saklanmaz
    void api.loginGoogle(idToken).then(async (login) => {
      await setAccessToken(login.accessToken!);
      setSignedIn(true);
    });
  }, [response]);

  async function signOut() {
    await clearAccessToken();
    setSignedIn(false);
  }

  return { signedIn, ready: !!request, signIn: () => promptAsync(), signOut };
}
```

Backend access token TTL'i dolunca 401 gelir → giriş ekranına dönülür, tek dokunuşla
yenilenir (sessiz yenileme v1.1 — belgeli taviz).

- [ ] **Step 2: lib/api.ts** (SecureStore'daki backend token'ı Bearer olarak)

```typescript
import { createBumpintoApi, createHttp } from "@bumpinto/shared";
import { getAccessToken } from "./tokenStore";

const participantTokens = new Map<string, string>();

export function rememberParticipantToken(slug: string, token: string) {
  participantTokens.set(slug, token);
}

export const api = createBumpintoApi(
  createHttp(process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8060", {
    getIdToken: () => getAccessToken(), // backend access token → Authorization: Bearer
    getParticipantToken: (slug) => participantTokens.get(slug),
  }, { client: "mobile" }),
);
```

- [ ] **Step 3: app/index.tsx** (artboard 01 — MCP'den güncel halini oku)

```tsx
import { router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { useGoogleAuth } from "../src/lib/auth";
import { colors } from "../src/theme";
import { AppText, Button } from "../src/components/atoms";

export default function SignIn() {
  const { signedIn, ready, signIn } = useGoogleAuth();

  useEffect(() => {
    if (signedIn) router.replace("/sessions");
  }, [signedIn]);

  return (
    <View style={{ flex: 1, padding: 28, justifyContent: "center", gap: 14,
      backgroundColor: colors.paper }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.flame,
        transform: [{ rotate: "45deg" }], marginBottom: 12 }} />
      <AppText variant="display" style={{ fontSize: 40, lineHeight: 44 }}>
        Ortada{"\n"}buluşalım.
      </AppText>
      <AppText>
        Sen Den Bosch'tasın, o Someren'de. Dert değil — adil orta noktayı ve oradaki en iyi
        mekânı birlikte bulun.
      </AppText>
      <AppText variant="hand">kavga yok, kaydırma var →</AppText>
      <View style={{ marginTop: 16 }}>
        <Button title="Google ile devam et" kind="white" onPress={() => void signIn()}
          disabled={!ready} />
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Doğrula** — giriş → `/sessions` yönlendirmesi (Task 4'te gelecek).

- [ ] **Step 5: INDEX güncelle + Commit (kullanıcı)** — `feat(mobile): google girisi + axios baglama`

---

### Task 4: sessionStore + Oturumlar (02) + Yeni oturum (03)

**Files:**
- Create: `frontend/mobile/src/store/sessionStore.ts`
- Create: `frontend/mobile/src/store/useSessionLive.ts`
- Create: `frontend/mobile/src/lib/localSessions.ts`
- Create: `frontend/mobile/src/components/molecules/SessionRow.tsx`
- Create: `frontend/mobile/app/sessions/index.tsx`
- Create: `frontend/mobile/app/sessions/new.tsx`

- [ ] **Step 1: store/sessionStore.ts** (web'dekiyle aynı sözleşme)

```typescript
import type { SessionView } from "@bumpinto/shared";
import { AxiosError } from "axios";
import { create } from "zustand";
import { api } from "../lib/api";

type SessionState = {
  slug: string;
  view: SessionView | null;
  unauthorized: boolean;
  bind: (slug: string) => void;
  refresh: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  slug: "",
  view: null,
  unauthorized: false,

  bind: (slug) => set({ slug, view: null, unauthorized: false }),

  refresh: async () => {
    const { slug } = get();
    if (!slug) return;
    try {
      set({ view: await api.getSession(slug), unauthorized: false });
    } catch (e) {
      if (e instanceof AxiosError && e.response?.status === 401) set({ unauthorized: true });
    }
  },
}));
```

- [ ] **Step 2: store/useSessionLive.ts**

```typescript
import { Client } from "@stomp/stompjs";
import { useEffect } from "react";
import { useSessionStore } from "./sessionStore";

const POLL_MS = 3000;

export function useSessionLive(slug: string | null) {
  const bind = useSessionStore((s) => s.bind);
  const refresh = useSessionStore((s) => s.refresh);

  useEffect(() => {
    if (!slug) return;
    bind(slug);
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);

    const base = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8060";
    const client = new Client({
      brokerURL: base.replace(/^http/, "ws") + "/ws",
      reconnectDelay: 5000,
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      onConnect: () => client.subscribe(`/topic/session/${slug}`, () => void refresh()),
    });
    client.activate();
    return () => {
      clearInterval(timer);
      void client.deactivate();
    };
  }, [slug, bind, refresh]);
}
```

- [ ] **Step 3: lib/localSessions.ts** (cihaz-yerel oturum listesi — belgeli MVP tavizi)

```typescript
import * as SecureStore from "expo-secure-store";

const KEY = "bumpinto.sessions";

export type StoredSession = { slug: string; name: string; createdAt: string };

export async function listSessions(): Promise<StoredSession[]> {
  return JSON.parse((await SecureStore.getItemAsync(KEY)) ?? "[]");
}

export async function rememberSession(entry: StoredSession) {
  const list = await listSessions();
  await SecureStore.setItemAsync(KEY, JSON.stringify([entry, ...list].slice(0, 20)));
}
```

- [ ] **Step 4: molecules/SessionRow.tsx + app/sessions/index.tsx** (artboard 02)

`SessionRow.tsx`:

```tsx
import { Pressable } from "react-native";
import { AppText, Badge, Card } from "../atoms";
import type { StoredSession } from "../../lib/localSessions";

export default function SessionRow(props: { session: StoredSession; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} accessibilityRole="button">
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <AppText variant="h3" style={{ flex: 1 }}>
          {props.session.name}
        </AppText>
        <Badge label={new Date(props.session.createdAt).toLocaleDateString("tr")} />
      </Card>
    </Pressable>
  );
}
```

`app/sessions/index.tsx`:

```tsx
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { AppText, Avatar, Button, Card } from "../../src/components/atoms";
import SessionRow from "../../src/components/molecules/SessionRow";
import { listSessions, type StoredSession } from "../../src/lib/localSessions";
import { colors } from "../../src/theme";

export default function Sessions() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  useFocusEffect(
    useCallback(() => {
      void listSessions().then(setSessions);
    }, []),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 18, paddingTop: 64, gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <AppText variant="display" style={{ flex: 1 }}>
          Nereye{"\n"}gidiyoruz?
        </AppText>
        <Pressable accessibilityRole="button" onPress={() => router.push("/profile")}>
          <Avatar name="M" size={40} />
        </Pressable>
      </View>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.slug}
        contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
        ListEmptyComponent={
          <Card>
            <AppText>Henüz buluşma kurmadın. İlkini kur, linki gruba at.</AppText>
          </Card>
        }
        renderItem={({ item }) => (
          <SessionRow session={item} onPress={() => router.push(`/sessions/${item.slug}`)} />
        )}
      />
      <Button title="Yeni buluşma kur" onPress={() => router.push("/sessions/new")} />
    </View>
  );
}
```

- [ ] **Step 5: app/sessions/new.tsx** (artboard 03)

```tsx
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { api, rememberParticipantToken } from "../../src/lib/api";
import { rememberSession } from "../../src/lib/localSessions";
import { colors } from "../../src/theme";
import { AppText, Button, Card, Chip, Input } from "../../src/components/atoms";

// 15 tür — sığmaz, chip'ler SARMALI (flexWrap) ya da yatay kaydırmalı olmalı.
// Sıra bilinçli: ilk beş günlük buluşma, gerisi "aklında olmayanı keşfet" (2026-09-01 kararı).
const ACTIVITIES = [
  ["COFFEE", "Kahve"],
  ["FOOD", "Yemek"],
  ["BAR", "Bar"],
  ["WALK", "Yürüyüş"],
  ["ACTIVITY", "Bowling"],
  ["SWIM", "Yüzme"],
  ["HIKE", "Doğa yürüyüşü"],
  ["FITNESS", "Spor salonu"],
  ["CINEMA", "Sinema"],
  ["MUSEUM", "Müze"],
  ["ART", "Sanat"],
  ["NIGHTLIFE", "Gece hayatı"],
  ["THEME_PARK", "Lunapark"],
  ["ADVENTURE", "Macera"],
  ["GAMES", "Oyun"],
] as const;

export default function NewSession() {
  const [activity, setActivity] = useState<(typeof ACTIVITIES)[number][0]>("COFFEE");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function locate() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError("Konum izni gerekli — ayarlardan açabilirsin.");
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  }

  async function create() {
    if (!coords) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.createSession({
        activityType: activity,
        name: name || undefined,
        lat: coords.lat,
        lng: coords.lng,
        displayName: displayName.trim(),
      });
      rememberParticipantToken(created.slug!, created.participantToken!);
      await rememberSession({ slug: created.slug!, name: name || "Buluşma",
        createdAt: new Date().toISOString() });
      router.replace(`/sessions/${created.slug}`);
    } catch {
      setError("Kurulamadı — girişin süresi dolmuş olabilir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: 18, paddingTop: 64, gap: 18 }}>
      <AppText variant="display">Yeni buluşma</AppText>
      <View style={{ gap: 8 }}>
        <AppText variant="label">Ne yapıyorsunuz?</AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ACTIVITIES.map(([key, label]) => (
            <Chip key={key} label={label} on={activity === key} onPress={() => setActivity(key)} />
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <AppText variant="label">Buluşmaya isim ver · istersen</AppText>
        <Input value={name} onChangeText={setName} placeholder="Cuma kahvesi" />
      </View>
      <View style={{ gap: 8 }}>
        <AppText variant="label">Adın</AppText>
        <Input value={displayName} onChangeText={setDisplayName}
          placeholder="Arkadaşların sana ne der?" />
      </View>
      <View style={{ gap: 8 }}>
        <AppText variant="label">Sen neredesin?</AppText>
        {coords ? (
          <Card style={{ backgroundColor: colors.grassWash, borderColor: "#BFE5CF" }}>
            <AppText variant="label" style={{ color: colors.grass }}>Konum alındı</AppText>
          </Card>
        ) : (
          <Button title="Mevcut konumumu kullan" kind="white" onPress={() => void locate()} />
        )}
      </View>
      {error && <AppText style={{ color: "#C0392B" }}>{error}</AppText>}
      <Button title="Buluşmayı kur" onPress={() => void create()}
        disabled={busy || !coords || !displayName.trim()} />
    </ScrollView>
  );
}
```

- [ ] **Step 6: Doğrula + INDEX + Commit (kullanıcı)** — `feat(mobile): zustand + oturum akislari`

---

### Task 5: Lobi (04) — InviteCard + ParticipantRow

**Files:**
- Create: `frontend/mobile/src/components/molecules/InviteCard.tsx`
- Create: `frontend/mobile/src/components/molecules/ParticipantRow.tsx`
- Create: `frontend/mobile/app/sessions/[slug].tsx`

- [ ] **Step 1: molecules/InviteCard.tsx**

```tsx
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Share, View } from "react-native";
import { colors } from "../../theme";
import { AppText, Button, Card, Sticker } from "../atoms";

export default function InviteCard({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card style={{ backgroundColor: colors.flameWash, borderColor: "#F6C6D2" }}>
      <Sticker label="linki at gitsin" style={{ position: "absolute", right: 12, top: -12 }} />
      <AppText variant="label" style={{ color: colors.flameDeep, marginBottom: 8 }}>
        DAVET LİNKİ
      </AppText>
      <AppText style={{ marginBottom: 12 }}>{link}</AppText>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title={copied ? "Kopyalandı" : "Kopyala"} kind="white"
            onPress={async () => {
              await Clipboard.setStringAsync(link);
              setCopied(true);
            }} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Paylaş" onPress={() => void Share.share({ message: link })} />
        </View>
      </View>
    </Card>
  );
}
```

- [ ] **Step 2: molecules/ParticipantRow.tsx**

```tsx
import type { ParticipantDto } from "@bumpinto/shared";
import { View } from "react-native";
import { AppText, Avatar, Badge } from "../atoms";

export default function ParticipantRow(props: { participant: ParticipantDto; index: number }) {
  const p = props.participant;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 13 }}>
      <Avatar name={p.displayName ?? "?"} index={props.index} />
      <View style={{ flex: 1 }}>
        <AppText variant="h3">
          {p.displayName}
          {p.host ? " (sen)" : ""}
        </AppText>
        {!p.hasLocation && <AppText variant="muted">konum bekleniyor…</AppText>}
      </View>
      <Badge label={p.hasLocation ? "Hazır" : "Bekliyor"} tone={p.hasLocation ? "grass" : "amber"} />
    </View>
  );
}
```

- [ ] **Step 3: app/sessions/[slug].tsx** (artboard 04 + durum yönlendirici)

```tsx
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { api } from "../../src/lib/api";
import { colors } from "../../src/theme";
import { AppText, Button, Card, Progress } from "../../src/components/atoms";
import InviteCard from "../../src/components/molecules/InviteCard";
import ParticipantRow from "../../src/components/molecules/ParticipantRow";
import DeckScreen from "../../src/screens/DeckScreen";
import ResultScreen from "../../src/screens/ResultScreen";
import RunoffScreen from "../../src/screens/RunoffScreen";
import { useSessionStore } from "../../src/store/sessionStore";
import { useSessionLive } from "../../src/store/useSessionLive";

const JOIN_BASE = process.env.EXPO_PUBLIC_JOIN_URL ?? "https://bumpinto.app/j/";

export default function SessionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  useSessionLive(slug ?? null);
  const { view, refresh } = useSessionStore();
  const [busy, setBusy] = useState(false);

  if (!view) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: "center",
        alignItems: "center" }}>
        <AppText variant="muted">yükleniyor…</AppText>
      </View>
    );
  }
  if (view.status === "SWIPING")
    return <DeckScreen slug={slug!} view={view} onChanged={() => void refresh()} />;
  if (view.status === "RUNOFF")
    return <RunoffScreen slug={slug!} view={view} onChanged={() => void refresh()} />;
  if (view.status === "DECIDED") return <ResultScreen view={view} />;

  const participants = view.participants ?? [];
  const ready = participants.filter((p) => p.hasLocation).length;

  async function findVenues() {
    setBusy(true);
    try {
      await api.findVenues(slug!);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: 18, paddingTop: 64, gap: 14 }}>
      <AppText variant="display">{view.name ?? "Buluşma"}</AppText>
      <InviteCard link={JOIN_BASE + slug} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText variant="label">Kimler var</AppText>
        <AppText variant="muted">{ready} / {participants.length} hazır</AppText>
      </View>
      <Progress value={ready / Math.max(participants.length, 1)} />
      <Card style={{ padding: 4 }}>
        {participants.map((p, i) => (
          <ParticipantRow key={p.id} participant={p} index={i} />
        ))}
      </Card>
      <Button title={busy ? "Mekanlar aranıyor…" : "Mekanları bul"}
        onPress={() => void findVenues()} disabled={busy || ready < 2} />
      <AppText variant="muted" style={{ textAlign: "center" }}>
        Geç kalan sonradan katılıp kaydırabilir.
      </AppText>
    </ScrollView>
  );
}
```

- [ ] **Step 4: Doğrula + INDEX + Commit (kullanıcı)** — `feat(mobile): lobi`

---

### Task 6: Deste (05) + Ortak nokta/Karar (06+08) + Runoff (07) + Profil (09)

**Files:**
- Create: `frontend/mobile/src/store/deckStore.ts`
- Create: `frontend/mobile/src/components/molecules/VenuePolaroid.tsx`
- Create: `frontend/mobile/src/components/molecules/DeckActions.tsx`
- Create: `frontend/mobile/src/components/organisms/SwipeDeck.tsx`
- Create: `frontend/mobile/src/screens/DeckScreen.tsx`
- Create: `frontend/mobile/src/screens/RunoffScreen.tsx`
- Create: `frontend/mobile/src/screens/ResultScreen.tsx`
- Create: `frontend/mobile/app/profile.tsx`

- [ ] **Step 1: store/deckStore.ts** (web deckStore ile aynı sözleşme; listMode RN'de yok —
az sonuçta da deste, kart sayısı zaten az)

```typescript
import { create } from "zustand";
import { api } from "../lib/api";

type DeckState = {
  slug: string;
  index: number;
  liked: Record<string, boolean>;
  sending: boolean;
  start: (slug: string) => void;
  decide: (venueId: string, like: boolean) => Promise<void>;
  undo: (venueId: string) => Promise<void>;
  finish: () => Promise<void>;
};

export const useDeckStore = create<DeckState>((set, get) => ({
  slug: "",
  index: 0,
  liked: {},
  sending: false,

  start: (slug) => {
    if (get().slug === slug) return;
    set({ slug, index: 0, liked: {} });
  },

  decide: async (venueId, like) => {
    set((s) => ({ index: s.index + 1, liked: { ...s.liked, [venueId]: like } }));
    await api.swipe(get().slug, { venueId, liked: like });
  },

  undo: async (venueId) => {
    set((s) => {
      const liked = { ...s.liked };
      delete liked[venueId];
      return { index: Math.max(0, s.index - 1), liked };
    });
    await api.undoSwipe(get().slug, venueId);
  },

  finish: async () => {
    set({ sending: true });
    try {
      await api.deckDone(get().slug);
    } finally {
      set({ sending: false });
    }
  },
}));
```

- [ ] **Step 2: molecules/VenuePolaroid.tsx** (deste/runoff/sonuç ortak kartı)

```tsx
import type { VenueDto } from "@bumpinto/shared";
import { View } from "react-native";
import { fonts } from "../../theme";
import { AppText, Badge, Card } from "../atoms";

const FALLBACKS = ["#E8794F", "#2F9E71", "#7C4DFF"];

export default function VenuePolaroid(props: { venue: VenueDto; photoHeight?: number }) {
  const v = props.venue;
  const monogram = v.name?.split(" ").map((w) => w[0]).slice(0, 2).join("").toLowerCase();
  return (
    <Card style={{ padding: 10, borderRadius: 24 }}>
      <View style={{ height: props.photoHeight ?? 300, borderRadius: 16, overflow: "hidden",
        backgroundColor: FALLBACKS[(v.deckOrder ?? 0) % 3],
        alignItems: "center", justifyContent: "center" }}>
        <AppText style={{ fontFamily: fonts.head, fontSize: 40, color: "rgba(255,255,255,.5)",
          transform: [{ rotate: "-4deg" }] }}>
          {monogram}
        </AppText>
      </View>
      <View style={{ padding: 10, gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between",
          alignItems: "center" }}>
          <AppText variant="h2">{v.name}</AppText>
          {v.rating != null && <Badge label={`★ ${v.rating}`} tone="grass" />}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {Object.entries(v.travelMinutes ?? {}).map(([who, min]) => (
            <Badge key={who} label={`${who} ${min} dk`} />
          ))}
        </View>
      </View>
    </Card>
  );
}
```

Foto URL'i geldiğinde `expo-image` ile gösterim eklenir (`npx expo install expo-image`).

- [ ] **Step 3: molecules/DeckActions.tsx**

```tsx
import { Pressable, Text, View } from "react-native";
import { colors } from "../../theme";

function Round(props: { label: string; a11y: string; size: number; flame?: boolean;
  onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={props.a11y} onPress={props.onPress}
      style={({ pressed }) => ({
        width: props.size, height: props.size, borderRadius: props.size / 2,
        alignItems: "center", justifyContent: "center",
        backgroundColor: props.flame ? colors.flameDeep : colors.card,
        borderWidth: 1.5, borderColor: props.flame ? "transparent" : colors.line2,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}>
      <Text style={{ fontSize: props.size * 0.36, color: props.flame ? "#fff" : colors.ink }}>
        {props.label}
      </Text>
    </Pressable>
  );
}

export default function DeckActions(props: { onUndo: () => void; onPass: () => void;
  onLike: () => void }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 20 }}>
      <Round label="↺" a11y="Geri al" size={46} onPress={props.onUndo} />
      <Round label="✕" a11y="Geç" size={64} onPress={props.onPass} />
      <Round label="♥" a11y="Beğen" size={64} flame onPress={props.onLike} />
    </View>
  );
}
```

- [ ] **Step 4: organisms/SwipeDeck.tsx** (jest + reanimated — spec §4)

```tsx
import type { VenueDto } from "@bumpinto/shared";
import { Dimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue,
  withSpring } from "react-native-reanimated";
import { useDeckStore } from "../../store/deckStore";
import DeckActions from "../molecules/DeckActions";
import VenuePolaroid from "../molecules/VenuePolaroid";

const THRESHOLD = Dimensions.get("window").width * 0.25;

export default function SwipeDeck({ venues }: { venues: VenueDto[] }) {
  const { index, decide, undo } = useDeckStore();
  const tx = useSharedValue(0);
  const current = venues[index];
  const next = venues[index + 1];

  const commit = (like: boolean) => {
    if (!current) return;
    tx.value = 0;
    void decide(current.id!, like);
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > THRESHOLD) runOnJS(commit)(e.translationX > 0);
      else tx.value = withSpring(0);
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { rotate: `${-1.6 + tx.value / 24}deg` }],
  }));

  if (!current) return null;
  return (
    <>
      <View style={{ flex: 1, justifyContent: "center" }}>
        {next && (
          <View style={{ position: "absolute", left: 0, right: 0,
            transform: [{ rotate: "2.6deg" }, { scale: 0.97 }], opacity: 0.6 }}>
            <VenuePolaroid venue={next} />
          </View>
        )}
        <GestureDetector gesture={pan}>
          <Animated.View style={cardStyle}>
            <VenuePolaroid venue={current} />
          </Animated.View>
        </GestureDetector>
      </View>
      <DeckActions
        onUndo={() => venues[index - 1] && void undo(venues[index - 1].id!)}
        onPass={() => commit(false)}
        onLike={() => commit(true)}
      />
    </>
  );
}
```

- [ ] **Step 5: screens/DeckScreen.tsx** (artboard 05 — kompozisyon)

```tsx
import type { SessionView } from "@bumpinto/shared";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { colors } from "../theme";
import { AppText, Button, Progress } from "../components/atoms";
import SwipeDeck from "../components/organisms/SwipeDeck";
import { useDeckStore } from "../store/deckStore";

export default function DeckScreen(props: { slug: string; view: SessionView;
  onChanged: () => void }) {
  const venues = useMemo(
    () => [...(props.view.venues ?? [])].sort((a, b) => (a.deckOrder ?? 0) - (b.deckOrder ?? 0)),
    [props.view.venues],
  );
  const deck = useDeckStore();

  useEffect(() => {
    deck.start(props.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.slug]);

  const likedCount = Object.values(deck.liked).filter(Boolean).length;

  if (deck.index >= venues.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: "center",
        padding: 28, gap: 14 }}>
        <AppText variant="display" style={{ textAlign: "center" }}>Deste bitti!</AppText>
        <AppText style={{ textAlign: "center" }}>{likedCount} mekanı beğendin.</AppText>
        <Button title="Beğenilerimi gönder" disabled={deck.sending}
          onPress={() => void deck.finish().then(props.onChanged)} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 18, paddingTop: 64, gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText variant="label">{deck.index + 1} / {venues.length}</AppText>
        <AppText variant="muted">{props.view.name}</AppText>
      </View>
      <Progress value={deck.index / venues.length} />
      <SwipeDeck venues={venues} />
      <AppText variant="hand" style={{ textAlign: "center" }}>
        kaydır gitsin — butonlar da aynı işi yapar
      </AppText>
    </View>
  );
}
```

- [ ] **Step 6: screens/RunoffScreen.tsx** (artboard 07)

```tsx
import type { SessionView } from "@bumpinto/shared";
import { useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { api } from "../lib/api";
import { colors } from "../theme";
import { AppText, Button, Sticker } from "../components/atoms";
import VenuePolaroid from "../components/molecules/VenuePolaroid";

export default function RunoffScreen(props: { slug: string; view: SessionView;
  onChanged: () => void }) {
  const finalists = (props.view.venues ?? []).filter((v) =>
    props.view.runoffVenueIds?.includes(v.id!));
  const [choice, setChoice] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function lockIn() {
    if (!choice) return;
    await api.runoffVote(props.slug, { venueId: choice });
    setSent(true);
    props.onChanged();
  }

  async function force() {
    if (!choice) return;
    await api.forceDecision(props.slug, { venueId: choice });
    props.onChanged();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: 18, paddingTop: 64, gap: 14 }}>
      <Sticker label="Son düzlük" />
      <AppText variant="display">İkisi de güzel,{"\n"}biri kazanacak</AppText>
      <AppText variant="muted">
        Tek seçim hakkın var — kim neyi seçti, sonuçta belli olur.
      </AppText>
      {finalists.map((v) => (
        <Pressable key={v.id} onPress={() => !sent && setChoice(v.id!)}
          style={choice === v.id ? { borderRadius: 24, borderWidth: 2,
            borderColor: colors.flameDeep } : undefined}>
          <VenuePolaroid venue={v} photoHeight={120} />
        </Pressable>
      ))}
      {sent ? (
        <>
          <AppText variant="hand" style={{ textAlign: "center" }}>
            seçimin kilitli — beraberlik olursa aşağıdan sen bozarsın
          </AppText>
          {/* Mobil uygulama MVP'de yalnız host akışıdır (spec §2) — force host hakkı */}
          <Button title="Beraberliği boz (host)" kind="white" onPress={() => void force()}
            disabled={!choice} />
        </>
      ) : (
        <Button title="Seçimimi kilitle" onPress={() => void lockIn()} disabled={!choice} />
      )}
    </ScrollView>
  );
}
```

- [ ] **Step 7: screens/ResultScreen.tsx** (artboard 06 kutlama + 08 detay)

```tsx
import type { SessionView } from "@bumpinto/shared";
import { Linking, ScrollView, View } from "react-native";
import { colors } from "../theme";
import { AppText, Badge, Button, Sticker } from "../components/atoms";
import VenuePolaroid from "../components/molecules/VenuePolaroid";

export default function ResultScreen({ view }: { view: SessionView }) {
  const winner = (view.venues ?? []).find((v) => v.id === view.decidedVenueId);
  if (!winner) return null;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: 18, paddingTop: 64, gap: 14 }}>
      <Badge label="Ortak nokta!" tone="flame" />
      <AppText variant="display">{winner.name}</AppText>
      <View>
        <Sticker label="karar verildi!" style={{ position: "absolute", right: 8, top: -12,
          zIndex: 2 }} />
        <VenuePolaroid venue={winner} photoHeight={180} />
      </View>
      <Button title="Yol tarifi al"
        onPress={() => winner.mapsUrl && void Linking.openURL(winner.mapsUrl)} />
      <AppText variant="hand" style={{ textAlign: "center" }}>not: kutlamak serbest</AppText>
    </ScrollView>
  );
}
```

- [ ] **Step 8: app/profile.tsx** (artboard 09)

```tsx
import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { useGoogleAuth } from "../src/lib/auth";
import { colors } from "../src/theme";
import { AppText, Avatar, Button, Card } from "../src/components/atoms";

export default function Profile() {
  const { signOut } = useGoogleAuth();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: 18, paddingTop: 64, gap: 14 }}>
      <View style={{ alignItems: "center", gap: 10 }}>
        <View style={{ padding: 3.5, borderRadius: 48, backgroundColor: colors.flame }}>
          <View style={{ padding: 2, borderRadius: 46, backgroundColor: "#fff" }}>
            <Avatar name="M" size={80} />
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={{ flex: 1, alignItems: "center", transform: [{ rotate: "-1deg" }] }}>
          <AppText variant="display" style={{ fontSize: 28 }}>12</AppText>
          <AppText variant="muted">buluşma kuruldu</AppText>
        </Card>
        <Card style={{ flex: 1, alignItems: "center", transform: [{ rotate: "1deg" }] }}>
          <AppText variant="display" style={{ fontSize: 28 }}>31</AppText>
          <AppText variant="muted">dost görüldü</AppText>
        </Card>
      </View>
      <Card style={{ padding: 4 }}>
        {[["Varsayılan konum", "'s-Hertogenbosch"], ["Varsayılan etkinlik", "Kahve"],
          ["Dil", "Türkçe"]].map(([k, v]) => (
          <View key={k} style={{ padding: 13 }}>
            <AppText variant="h3">{k}</AppText>
            <AppText variant="muted">{v}</AppText>
          </View>
        ))}
      </Card>
      <Card>
        <AppText variant="muted">
          Buluşmalar 24 saatte kapanır, 30 günde silinir. Katılanlardan yalnızca ad + konum
          tutulur — o kadar.
        </AppText>
      </Card>
      <Button title="Çıkış yap" kind="danger"
        onPress={() => void signOut().then(() => router.replace("/"))} />
    </ScrollView>
  );
}
```

İstatistikler MVP'de yerel; tercih satırları v1.1'e kadar salt-okunur.

- [ ] **Step 9: Uçtan uca** — mobilde kur → web'den katıl → mekanları bul → iki tarafta
kaydır → Ortak nokta mobilde. INDEX + Commit (kullanıcı) — `feat(mobile): deste, runoff, sonuc, profil`

---

### Task 7: EAS build profilleri (preprod/prod)

**Files:**
- Create: `frontend/mobile/eas.json`
- Modify: `frontend/mobile/app.json`

- [ ] **Step 1: eas.json**

```json
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "preprod": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.preprod.bumpinto.app",
        "EXPO_PUBLIC_JOIN_URL": "https://preprod.bumpinto.app/j/"
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.bumpinto.app",
        "EXPO_PUBLIC_JOIN_URL": "https://bumpinto.app/j/"
      }
    }
  },
  "submit": { "production": {} }
}
```

- [ ] **Step 2: app.json** — `expo.ios.bundleIdentifier: "app.bumpinto.mobile"`,
`expo.android.package: "app.bumpinto.mobile"`, `expo.scheme: "bumpinto"`.

- [ ] **Step 3: Build** (kullanıcı hesabıyla; local geliştirme `expo start` + varsayılan env'dir) — Run:
`rtk pnpm exec npx eas-cli build --profile preprod --platform all`

- [ ] **Step 4: INDEX'te Plan 4'ü `done` yap + Commit (kullanıcı)** — `feat(mobile): eas yapilandirmasi`

---

## Plan sonu doğrulaması

- [ ] Spec eşlemesi: §2 host akışı; §4 etkileşim (jest + görünür butonlar + geri al,
  beğeni gizliliği); §10 tema.
- [ ] **Mimari denetimi:** `app/*` ve `screens/*` içinde ham `Pressable/TextInput/Text`
  yok (hepsi atomlardan); HTTP yalnız `api.*`; state yalnız zustand store'larında.
- [ ] Her ekran Claude Design artboard'uyla karşılaştırıldı (UI Kaynağı, madde 4).
- [ ] Belgeli tavizler: cihaz-yerel oturum listesi, id_token sessiz yenileme yok,
  foto expo-image iterasyonu, `↺ ✕ ♥` karakterleri geçici.
- [ ] Kullanıcıya bildir: Plan 5 başlayabilir.
