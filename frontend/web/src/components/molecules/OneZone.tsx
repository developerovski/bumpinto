/* Kaynak: artboard W10 Hata — .one tek bölge, ortalanmış */
export default function OneZone({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[34rem] flex-col items-center gap-3.5 text-center">
      {children}
    </div>
  );
}
