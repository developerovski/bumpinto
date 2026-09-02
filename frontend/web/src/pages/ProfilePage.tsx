import type { MeResponse } from "@bumpinto/shared";
import { SignOut } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, Note, Overline, Page } from "../components/atoms";
import IdentityCard from "../components/molecules/IdentityCard";
import MobileCta, { DesktopOnly } from "../components/molecules/MobileCta";
import PageHeader from "../components/molecules/PageHeader";
import ProfileStats from "../components/molecules/ProfileStats";
import TwoZone from "../components/molecules/TwoZone";
import ProfilePrefs from "../components/organisms/ProfilePrefs";
import { useAuthStore } from "../store/authStore";

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
      <PageHeader title={t("profile.title")} />
      <TwoZone
        left={<>
          <IdentityCard me={me} onSaveName={(displayName) => updatePrefs({ displayName })} />
          <ProfileStats stats={me.stats} />
          <Note card>{t("profile.retention")}</Note>
          <DesktopOnly>{logoutButton("fit")}</DesktopOnly>
        </>}
        right={<>
          <Overline>{t("profile.prefs")}</Overline>
          <ProfilePrefs
            me={me}
            onLanguage={(language) => updatePrefs({ language })}
            onLocation={(defaultLocation) => updatePrefs({ defaultLocation })}
            onActivity={(defaultActivity) => updatePrefs({ defaultActivity: defaultActivity as MeResponse["defaultActivity"] })}
          />
          <Note>{t("profile.langHint")}</Note>
        </>}
      />
      <MobileCta>{logoutButton("md")}</MobileCta>
    </Page>
  );
}
