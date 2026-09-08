import type { MeResponse } from "@bumpinto/shared";
import { Lifebuoy, ShieldCheck, SignOut } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, Note, Overline, Page } from "../components/atoms";
import IdentityCard from "../components/molecules/IdentityCard";
import MobileCta, { DesktopOnly } from "../components/molecules/MobileCta";
import PageHeader from "../components/molecules/PageHeader";
import ProfileStats from "../components/molecules/ProfileStats";
import SettingRow from "../components/molecules/SettingRow";
import SettingsCard from "../components/molecules/SettingsCard";
import TwoZone from "../components/molecules/TwoZone";
import ProfilePrefs from "../components/organisms/ProfilePrefs";
import { useAuthStore } from "../store/authStore";

/* Artboard'daki `.srow.st` ikon karosu 17px cam yazar; AccountPage 18 kullanıyor — aynı
   bileşenin iki sayfada aynı görünmesi için o değeri izliyoruz (tek kaynak: SettingRow). */
const ICON = 18;

/** Artboard W9 · Profil — kimlik + istatistik | tercihler (konum/etkinlik düzenleme W-4). */
export default function ProfilePage() {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.me);
  const updatePrefs = useAuthStore((s) => s.updatePrefs);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  if (!me) return null;

  function onLogout() {
    void logout()
      .catch(() => undefined)
      .finally(() => navigate("/"));
  }

  const logoutButton = (size: "fit" | "md") => (
    <Button type="button" kind="danger" size={size} onClick={onLogout}>
      <SignOut size={18} aria-hidden />
      {t("profile.logout")}
    </Button>
  );

  return (
    <Page>
      <PageHeader title={t("profile.title")} size="reader" />
      {/* Artboard 1280 sol bölge boşluğu 18px (2673) — `.zone` varsayılanı 16px. */}
      <TwoZone
        leftGap="md"
        left={<>
          <IdentityCard me={me} onSaveName={(displayName) => updatePrefs({ displayName })} />
          <ProfileStats stats={me.stats} />
          {/* Saklama notu 390'da EN SONA (Hesap kartının ardına) düşer — artboard 2830. Sol
              bölgede kalırsa telefonda "Tercihler"in ÖNÜNDE görünür; bu yüzden burada yalnız
              masaüstü kopyası durur, mobil kopyası sağ bölgenin sonundadır. */}
          <DesktopOnly><Note card>{t("profile.retention")}</Note></DesktopOnly>
          <DesktopOnly>{logoutButton("fit")}</DesktopOnly>
        </>}
        right={<>
          <Overline>{t("profile.prefs")}</Overline>
          <ProfilePrefs
            me={me}
            onLanguage={(language) => updatePrefs({ language })}
            onLocation={(defaultLocation) => updatePrefs({ defaultLocation })}
            onActivity={(defaultActivity) => updatePrefs({ defaultActivity: defaultActivity as MeResponse["defaultActivity"] })}
            onTravelMode={(defaultTravelMode) => updatePrefs({ defaultTravelMode })}
          />
          {/* Artboard 2750 / 2830: her ikisi de `.mi` 12px. */}
          <Note small>{t("profile.langHint")}</Note>
          {/* Artboard 390 (2815-2828) "Hesap" bölümü — YALNIZ telefonda: masaüstünde /account
              avatar menüsünden açılır (AvatarMenu), telefonda o menü yok ve bu blok olmadan
              gizlilik/KVKK/atıflar/hesabı sil yüzeyine hiçbir yoldan ulaşılamıyordu. */}
          <div className="flex flex-col gap-2.5 lg:hidden">
            <Overline>{t("profile.account")}</Overline>
            <SettingsCard label={t("profile.account")}>
              <SettingRow
                icon={<ShieldCheck size={ICON} />}
                label={t("account.title")}
                hint={t("profile.accountHint")}
                to="/account"
              />
              <SettingRow icon={<Lifebuoy size={ICON} />} label={t("legal.support")} to="/support" />
            </SettingsCard>
            <Note small>{t("profile.retention")}</Note>
          </div>
        </>}
      />
      <MobileCta>{logoutButton("md")}</MobileCta>
    </Page>
  );
}
