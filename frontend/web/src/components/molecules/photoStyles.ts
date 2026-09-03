/* Fotoğrafsız kart gradyanları + monogram stili — VenueCard, VenueThumb ve PolaroidFan paylaşır.
   Ayrı .ts modülde: bileşen dosyasından değer export etmek React Fast Refresh sınırını bozar. */
// Artboard .pA/.pB/.pC/.pD — fotoğrafsız kartın üç katmanlı ambient gradyanı.
export const PHOTO_CLASSES = [
  "bg-[image:radial-gradient(130%_100%_at_18%_8%,#ffd9a8_0%,transparent_62%),radial-gradient(110%_85%_at_88%_90%,#ff9e6b_0%,transparent_58%),linear-gradient(165deg,#f9c08a_0%,#e8794f_100%)]",
  "bg-[image:radial-gradient(130%_100%_at_80%_6%,#b8f0d8_0%,transparent_60%),radial-gradient(110%_85%_at_12%_92%,#4fc79a_0%,transparent_55%),linear-gradient(165deg,#8fddbb_0%,#2f9e71_100%)]",
  "bg-[image:radial-gradient(130%_100%_at_22%_10%,#d9c8ff_0%,transparent_60%),radial-gradient(110%_85%_at_85%_88%,#a47cff_0%,transparent_55%),linear-gradient(165deg,#c1a8f5_0%,#7c4dff_100%)]",
  "bg-[image:radial-gradient(130%_100%_at_20%_10%,#fff0b8_0%,transparent_60%),radial-gradient(110%_85%_at_85%_90%,#ffc24a_0%,transparent_55%),linear-gradient(165deg,#ffe08a_0%,#f2a93b_100%)]",
];

// .pho-mono — punto dışındaki tüm değerler tüm varyantlarda ortak (PolaroidFan da kullanır).
export const PHOTO_MONO =
  "absolute left-1/2 top-[44%] transform-[translate(-50%,-50%)_rotate(-4deg)] " +
  "font-head font-extrabold text-[rgba(255,255,255,0.5)]";
