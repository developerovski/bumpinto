import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

import { colors, fonts, radius } from "../../theme";

/**
 * Tek metin girişi atomu — HAM `TextInput` YALNIZ BURADA kullanılır (depo kuralı).
 * `invalid` durumunda kenar `flameDeep`, çevresinde `flameWash` halka.
 */
export default function Input({
  invalid,
  containerStyle,
  style,
  ...rest
}: TextInputProps & { invalid?: boolean; containerStyle?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.ring, invalid ? { backgroundColor: colors.flameWash } : null, containerStyle]}>
      <TextInput
        {...rest}
        accessibilityState={{ disabled: rest.editable === false }}
        placeholderTextColor={colors.ink3}
        style={[s.field, invalid ? { borderColor: colors.flameDeep } : null, style]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  ring: { borderRadius: radius.input + 3, padding: 3 },
  field: {
    minHeight: 48,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.line2,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
});
