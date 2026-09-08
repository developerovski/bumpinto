/* Kaynak: ui.css .field(gap:12) / .row / .muted / .a-dv — artboard Katıl 1280/390 */
import { Trans, useTranslation } from "react-i18next";
import { Avatar, Badge, Highlight } from "../atoms";
import ActivityBadges from "./ActivityBadges";

/** Artboard W1 · davet başlığı bloğu + onu formdan ayıran saç teli ayraç.
    Oturum adı/etkinlik/katılımcı sayısı sunucu önizlemesinden (preview) gelir. */
export default function JoinIntro(props: {
  hostName: string | null;
  sessionName: string | null;
  activities: string[];
  count: number;
  /** Artboard W4b (4133–4141 / 4189–4200): 409 hatası ekrana bir kart eklediğinde giriş bloğu
      sıkışır — alt başlık düşer, 390'da rozet satırı da düşer ve başlık 26px'e iner ki hata
      kartı katlanmadan görünür kalsın. ≥1024'te rozetler ve 46px başlık yerinde kalır. */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const trimmedName = props.sessionName?.trim() ?? "";
  const words = trimmedName ? trimmedName.split(/\s+/) : [];
  return (
    <>
      {/* Artboard 1264: giriş bloğunun öğeleri `.zone`nin doğrudan çocukları — aralık 18px,
          bölge aralığının AYNISI (12px'te başlık rozetlere yapışıyordu). */}
      <div className="flex flex-col gap-[1.125rem]">
        <div className="flex items-center gap-2.5">
          <Avatar name={props.hostName ?? "B"} ring />
          <span>
            {props.hostName ? (
              <Trans i18nKey="join.invitedBy" values={{ host: props.hostName }} components={[<strong key="0" />]} />
            ) : (
              t("join.invited")
            )}
          </span>
        </div>
        {/* 26px = artboard 4138; yalnız <1024'te — masaüstünde başlık ölçüsü değişmez. */}
        {trimmedName ? (
          <h1 className={props.compact ? "max-lg:text-[1.625rem]" : undefined}>
            <Highlight>{words[0]}</Highlight>
            {words.length > 1 ? ` ${words.slice(1).join(" ")}` : null}
          </h1>
        ) : (
          <h1 className={props.compact ? "max-lg:text-[1.625rem]" : undefined}>
            <Trans i18nKey="join.title" components={[<Highlight key="0" />]} />
          </h1>
        )}
        <div className={`flex flex-wrap items-center gap-2${props.compact ? " max-lg:hidden" : ""}`}>
          <ActivityBadges activities={props.activities} />
          <Badge>{t("join.joinedCount", { count: props.count })}</Badge>
        </div>
        {/* Artboard 1274/2937: `.bd m2` satır içi 17px — `Note`un 13px'i burada dipnot gibi okunuyordu. */}
        {!props.compact && <p className="text-[1.0625rem] leading-[1.5] text-ink2">{t("join.subtitle")}</p>}
      </div>
      {/* Ayraç ve altındaki form bloklarının tümü 58fr bölgesi içinde 460px'e kapanır (1275). */}
      <div className="h-px bg-line lg:max-w-[28.75rem]" />
    </>
  );
}
