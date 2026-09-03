import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback: ReactNode };
type State = { hasError: boolean };

/** Tembel (`React.lazy`) harita chunk'ı yüklenemezse (ağ hatası, ad-blocker vb.) hata tüm
    sayfayı çökertmez — çağıran ekranın kendi notunu (`fallback`) gösterir. Hata sınırları
    yalnız class bileşenle yazılabilir (React kısıtı); `fallback` çağıran yerde `t()` ile
    hazırlanır çünkü burada hook kullanılamaz. */
export default class LazyBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // Gerçek render hataları "harita yapılandırılmadı" notunun ardına sessizce gizlenmesin
  // (kod-review bulgusu) — konsola loglanır, kullanıcıya yine de nazik not gösterilir.
  componentDidCatch(error: unknown) {
    console.error("LazyBoundary", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
