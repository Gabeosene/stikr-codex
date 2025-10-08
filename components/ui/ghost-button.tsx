import React from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';

type GhostButtonProps = PressableProps & {
  children: React.ReactNode;
};

export function GhostButton({ children, style, ...props }: GhostButtonProps) {
  return (
    <Pressable
      style={(state) => [
        {
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: '#cfd8d3',
          backgroundColor: 'white',
          marginTop: 8,
          opacity: state.pressed ? 0.85 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <Text style={{ color: '#004226', fontWeight: '600', textAlign: 'center' }}>{children}</Text>
    </Pressable>
  );
}
