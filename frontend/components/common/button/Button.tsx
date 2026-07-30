import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';

type Variant = 'green' | 'red' | 'white' | 'dashed';

type ButtonProps = {
  children: React.ReactNode;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const variantStyles: Record<Variant, { backgroundColor: string; borderColor?: string; borderStyle?: 'solid' | 'dashed'; textColor: string }> = {
  green: { backgroundColor: Colors.light.primary, textColor: '#fff' },
  red: { backgroundColor: Colors.light.danger, textColor: '#fff' },
  white: { backgroundColor: Colors.light.background, borderColor: Colors.light.border, borderStyle: 'solid', textColor: Colors.light.text },
  dashed: { backgroundColor: 'transparent', borderColor: Colors.light.border, borderStyle: 'dashed', textColor: Colors.light.text },
};

export function Button({ children, variant = 'green', disabled, loading, onPress, style }: ButtonProps) {
  const { backgroundColor, borderColor, borderStyle, textColor } = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isDisabled ? Colors.light.disabled : backgroundColor,
          borderColor,
          borderStyle,
          borderWidth: borderColor ? 1 : 0,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
