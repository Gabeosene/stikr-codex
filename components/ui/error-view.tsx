import React from 'react';
import { View, Text, type ViewProps } from 'react-native';

import { GhostButton } from '@/components/ui/ghost-button';

type ErrorViewProps = ViewProps & {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorView({ message, onRetry, retryLabel = 'Try again', style, ...props }: ErrorViewProps) {
  return (
    <View
      style={[{ padding: 12, borderWidth: 1, borderColor: '#ffd6d6', backgroundColor: '#fff5f5', borderRadius: 10 }, style]}
      {...props}
    >
      <Text style={{ color: '#b00020', marginBottom: onRetry ? 8 : 0 }}>{message}</Text>
      {onRetry ? <GhostButton onPress={onRetry}>{retryLabel}</GhostButton> : null}
    </View>
  );
}
