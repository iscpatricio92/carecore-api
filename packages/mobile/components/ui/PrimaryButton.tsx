import React from 'react';
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = React.memo(
  ({ title, onPress, style, disabled = false }) => {
    const handlePress = React.useCallback(() => {
      if (!disabled) {
        onPress();
      }
    }, [disabled, onPress]);

    return (
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={handlePress}
        disabled={disabled}
        testID="primary-button"
      >
        <Text style={styles.buttonText}>{title}</Text>
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#00796B',
    padding: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
