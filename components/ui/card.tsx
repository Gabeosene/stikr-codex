import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { Platform, View, type ViewProps } from 'react-native';

function Card({ className, style, ...props }: ViewProps & React.RefAttributes<View>) {
  const nativeShadowClass = Platform.select({ web: '', default: 'shadow-sm shadow-black/5' });
  const webShadowStyle = Platform.OS === 'web' ? { boxShadow: '0px 8px 24px rgba(15, 23, 42, 0.08)' } : null;
  const resolvedStyle = webShadowStyle
    ? ([webShadowStyle, ...(style ? (Array.isArray(style) ? style : [style]) : [])] as ViewProps['style'])
    : style;

  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(
          'bg-card border-border flex flex-col gap-6 rounded-xl border py-6',
          nativeShadowClass,
          className
        )}
        style={resolvedStyle}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function CardHeader({ className, ...props }: ViewProps & React.RefAttributes<View>) {
  return <View className={cn('flex flex-col gap-1.5 px-6', className)} {...props} />;
}

function CardTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  return (
    <Text
      role="heading"
      aria-level={3}
      className={cn('font-semibold leading-none', className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  return <Text className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

function CardContent({ className, ...props }: ViewProps & React.RefAttributes<View>) {
  return <View className={cn('px-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: ViewProps & React.RefAttributes<View>) {
  return <View className={cn('flex flex-row items-center px-6', className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
