import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable, type ViewStyle } from 'react-native';

const buttonVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-2 rounded-md',
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
    })
  ),
  {
    variants: {
      variant: {
        default: cn('bg-primary active:bg-primary/90', Platform.select({ web: 'hover:bg-primary/90' })),
        destructive: cn('bg-destructive active:bg-destructive/90 dark:bg-destructive/60', Platform.select({
          web: 'hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        })),
        outline: cn(
          'border-border bg-background active:bg-accent dark:bg-input/30 dark:border-input dark:active:bg-input/50 border',
          Platform.select({
            web: 'hover:bg-accent dark:hover:bg-input/50',
          })
        ),
        secondary: cn(
          'bg-secondary active:bg-secondary/80',
          Platform.select({ web: 'hover:bg-secondary/80' })
        ),
        ghost: cn(
          'active:bg-accent dark:active:bg-accent/50',
          Platform.select({ web: 'hover:bg-accent dark:hover:bg-accent/50' })
        ),
        link: '',
      },
      size: {
        default: cn('h-10 px-4 py-2 sm:h-9', Platform.select({ web: 'has-[>svg]:px-3' })),
        sm: cn('h-9 gap-1.5 rounded-md px-3 sm:h-8', Platform.select({ web: 'has-[>svg]:px-2.5' })),
        lg: cn('h-11 rounded-md px-6 sm:h-10', Platform.select({ web: 'has-[>svg]:px-4' })),
        icon: 'h-10 w-10 sm:h-9 sm:w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva(
  cn(
    'text-foreground text-sm font-medium',
    Platform.select({ web: 'transition-colors' })
  ),
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-white',
        outline: cn(
          'group-active:text-accent-foreground',
          Platform.select({ web: 'group-hover:text-accent-foreground' })
        ),
        secondary: 'text-secondary-foreground',
        ghost: 'group-active:text-accent-foreground',
        link: cn(
          'text-primary group-active:underline',
          Platform.select({ web: 'underline-offset-4 hover:underline group-hover:underline' })
        ),
      },
      size: {
        default: '',
        sm: '',
        lg: '',
        icon: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

const WEB_SHADOW = '0px 1px 2px rgba(15, 23, 42, 0.12)';
const IOS_SHADOW: ViewStyle = {
  boxShadow: [
    {
      color: 'rgba(15, 23, 42, 0.12)',
      offset: { width: 0, height: 1 },
      blurRadius: 2,
      spreadRadius: 0,
    },
  ],
};
const VARIANTS_WITH_SHADOW = new Set(['default', 'destructive', 'outline', 'secondary']);

function Button({ className, variant, size, style, ...props }: ButtonProps) {
  const variantKey = variant ?? 'default';
  const shouldApplyShadow = VARIANTS_WITH_SHADOW.has(variantKey);

  let shadowStyle: ViewStyle | null = null;
  if (shouldApplyShadow) {
    if (Platform.OS === 'web') {
      shadowStyle = { boxShadow: WEB_SHADOW };
    } else if (Platform.OS === 'android') {
      shadowStyle = { elevation: 2 };
    } else {
      shadowStyle = IOS_SHADOW;
    }
  }

  let resolvedStyle: ButtonProps['style'];

  if (shadowStyle) {
    if (typeof style === 'function') {
      resolvedStyle = ((state) => {
        const resolved = style(state);

        if (!resolved) {
          return [shadowStyle as ViewStyle];
        }

        return Array.isArray(resolved)
          ? [shadowStyle as ViewStyle, ...resolved]
          : [shadowStyle as ViewStyle, resolved];
      }) as ButtonProps['style'];
    } else {
      const normalizedStyle = style ? (Array.isArray(style) ? style : [style]) : [];
      resolvedStyle = [shadowStyle, ...normalizedStyle];
    }
  } else {
    resolvedStyle = style;
  }

  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(props.disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
        role="button"
        style={resolvedStyle}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
