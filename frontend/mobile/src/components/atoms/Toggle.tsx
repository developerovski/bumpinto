import { Switch } from "react-native";

import { colors } from "../../theme";

/**
 * Açık rıza anahtarı. Yerel `Switch` bilerek kullanılır: ekran okuyucu, klavye ve
 * "azaltılmış hareket" davranışını platform verir — özel bir animasyon bunu kaybettirir.
 *
 * `accessibilityLabel` ZORUNLUDUR: rıza anahtarı etiketsizse ekran okuyucu "anahtar, açık"
 * der ve kullanıcı NEYE rıza verdiğini duymaz.
 */
export default function Toggle(p: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  return (
    <Switch
      value={p.value}
      onValueChange={p.onValueChange}
      disabled={p.disabled}
      accessibilityRole="switch"
      accessibilityLabel={p.accessibilityLabel}
      accessibilityState={{ checked: p.value, disabled: !!p.disabled }}
      trackColor={{ false: colors.track, true: colors.flame }}
      thumbColor={colors.card}
      ios_backgroundColor={colors.track}
    />
  );
}
