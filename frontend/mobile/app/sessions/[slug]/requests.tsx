import { useLocalSearchParams } from "expo-router";

import SeatRequestsScreen from "../../../src/screens/SeatRequestsScreen";

/** Host'un katılım istekleri (Keşfet POC P4). Hesap ister: `/sessions/…` anonim rotalarda DEĞİL —
    uçlar hesap kimliğiyle çalışır (ARCHITECTURE §8 istisnası). */
export default function SeatRequestsRoute() {
  const { slug = "" } = useLocalSearchParams<{ slug?: string }>();
  return <SeatRequestsScreen slug={slug} />;
}
