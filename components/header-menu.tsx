import React from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useColorScheme } from 'nativewind';
import { Portal } from '@rn-primitives/portal';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

import {
  ChevronDownIcon,
  ChevronRightIcon,
  MoonStarIcon,
  SunIcon,
  UserRoundIcon,
} from 'lucide-react-native';

type MenuPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
} as const;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  menuContainer: {
    position: 'absolute',
    minWidth: 208,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

function HeaderMenu() {
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const [isOpen, setIsOpen] = React.useState(false);
  const [anchorPosition, setAnchorPosition] = React.useState<MenuPosition | null>(null);
  const anchorRef = React.useRef<View>(null);

  const closeMenu = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const openMenu = React.useCallback(() => {
    const node = anchorRef.current;
    if (!node) {
      setAnchorPosition(null);
      setIsOpen(true);
      return;
    }

    node.measureInWindow((x, y, width, height) => {
      setAnchorPosition({ x, y, width, height });
      setIsOpen(true);
    });
  }, []);

  const toggleMenu = React.useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      openMenu();
    }
  }, [isOpen, openMenu]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const subscription = Dimensions.addEventListener('change', closeMenu);

    return () => {
      if (subscription && 'remove' in subscription) {
        subscription.remove();
      }
    };
  }, [closeMenu, isOpen]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setIsOpen(false);
      };
    }, [])
  );

  const handleAccountPress = React.useCallback(() => {
    closeMenu();
    router.push('/account');
  }, [closeMenu, router]);

  const handleThemeToggle = React.useCallback(() => {
    toggleColorScheme();
    closeMenu();
  }, [closeMenu, toggleColorScheme]);

  const menuPositionStyle = React.useMemo(() => {
    if (!anchorPosition) {
      return {
        top: 64,
        right: 16,
      };
    }

    const windowWidth = Dimensions.get('window').width;
    const right = Math.max(12, windowWidth - (anchorPosition.x + anchorPosition.width));
    const top = Math.max(12, anchorPosition.y + anchorPosition.height + 8);

    return { top, right };
  }, [anchorPosition]);

  const themeLabel = colorScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <View ref={anchorRef} collapsable={false} style={{ position: 'relative' }}>
      <Button
        onPress={toggleMenu}
        variant="ghost"
        className="rounded-full px-3 py-2 web:mx-4"
        accessibilityLabel="Open account menu"
        accessibilityRole="button"
      >
        <Icon as={UserRoundIcon} className="size-5" />
        <Icon as={ChevronDownIcon} className="size-3 text-muted-foreground" />
      </Button>

      {isOpen && (
        <Portal name="header-menu">
          <Pressable style={styles.overlay} onPress={closeMenu} accessibilityRole="button" accessibilityLabel="Close menu" />
          <View
            style={[
              styles.menuContainer,
              menuPositionStyle,
              Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 12 },
                },
                android: { elevation: 12 },
                default: {
                  shadowColor: 'rgba(15, 23, 42, 0.15)',
                  shadowOpacity: 1,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 12 },
                },
              }),
            ]}
            className="border border-border bg-popover"
          >
            <View className="px-3 pb-2 pt-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Menu</Text>
            </View>

            <Pressable
              onPress={handleAccountPress}
              className="flex-row items-center justify-between px-3 py-2 active:bg-accent"
              accessibilityRole="button"
            >
              <View className="flex-row items-center gap-2">
                <Icon as={UserRoundIcon} className="size-4" />
                <Text className="text-sm font-medium">Account</Text>
              </View>
              <Icon as={ChevronRightIcon} className="size-4 text-muted-foreground" />
            </Pressable>

            <View className="h-px bg-border" />

            <Pressable
              onPress={handleThemeToggle}
              className="flex-row items-center justify-between px-3 py-2 active:bg-accent"
              accessibilityRole="button"
            >
              <View className="flex-row items-center gap-2">
                <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-4" />
                <Text className="text-sm font-medium">{themeLabel}</Text>
              </View>
            </Pressable>
          </View>
        </Portal>
      )}
    </View>
  );
}

export { HeaderMenu };
