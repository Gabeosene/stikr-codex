import React from 'react';
import { View, type ViewProps } from 'react-native';

type CenterProps = ViewProps & {
  children: React.ReactNode;
};

export function Center({ children, style, ...props }: CenterProps) {
  return (
    <View
      style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, style]}
      {...props}
    >
      {children}
    </View>
  );
}
