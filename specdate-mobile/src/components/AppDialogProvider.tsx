import React from 'react';
import { Alert as NativeAlert, Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type AppDialogButton = {
  text?: string;
  onPress?: (value?: string) => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type AppDialogConfig = {
  title?: string;
  message?: string;
  buttons?: AppDialogButton[];
  type?: 'info' | 'success' | 'error' | 'warning' | 'confirm' | 'prompt';
  placeholder?: string;
  defaultValue?: string;
  cancelable?: boolean;
  onDismiss?: () => void;
};

export type AppConfirmConfig = Omit<AppDialogConfig, 'buttons' | 'type' | 'onDismiss'> & {
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'confirm';
};

type DialogController = {
  show: (config: AppDialogConfig) => void;
};

let controller: DialogController | null = null;

export function appAlert(
  title?: string,
  message?: string,
  buttons?: AppDialogButton[],
  options?: { cancelable?: boolean; onDismiss?: () => void },
) {
  controller?.show({
    title,
    message,
    buttons,
    cancelable: options?.cancelable,
    onDismiss: options?.onDismiss,
    type: inferType(title, buttons),
  });
}

export function appPrompt(config: Omit<AppDialogConfig, 'type'>) {
  controller?.show({ ...config, type: 'prompt' });
}

export function appConfirm(config: AppConfirmConfig): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const dialogConfig: AppDialogConfig = {
      ...config,
      type: config.type ?? 'confirm',
      cancelable: config.cancelable ?? true,
      onDismiss: () => settle(false),
      buttons: [
        { text: config.cancelText ?? 'Cancel', style: 'cancel', onPress: () => settle(false) },
        { text: config.confirmText ?? 'OK', onPress: () => settle(true) },
      ],
    };

    if (controller) {
      controller.show(dialogConfig);
      return;
    }

    NativeAlert.alert(dialogConfig.title ?? '', dialogConfig.message, dialogConfig.buttons, {
      cancelable: dialogConfig.cancelable,
      onDismiss: dialogConfig.onDismiss,
    });
  });
}

export function useAppDialog() {
  return React.useMemo(
    () => ({
      alert: appAlert,
      prompt: appPrompt,
      confirmAsync: appConfirm,
      success: (title: string, message?: string, buttons?: AppDialogButton[]) =>
        controller?.show({ title, message, buttons, type: 'success' }),
      error: (title: string, message?: string, buttons?: AppDialogButton[]) =>
        controller?.show({ title, message, buttons, type: 'error' }),
      confirm: (config: Omit<AppDialogConfig, 'type'>) => controller?.show({ ...config, type: 'confirm' }),
    }),
    []
  );
}

function inferType(title?: string, buttons?: AppDialogButton[]): AppDialogConfig['type'] {
  if (buttons?.some((button) => button.style === 'destructive')) return 'warning';
  const text = String(title ?? '').toLowerCase();
  if (text.includes('success') || text.includes('created') || text.includes('applied') || text.includes('thanks')) return 'success';
  if (text.includes('error') || text.includes('failed') || text.includes('unavailable')) return 'error';
  if (text.includes('?') || text.includes('required') || text.includes('permission')) return 'warning';
  return 'info';
}

function getIcon(type: AppDialogConfig['type']) {
  switch (type) {
    case 'success':
      return { name: 'check-circle-outline', color: '#16A34A' };
    case 'error':
      return { name: 'alert-circle-outline', color: '#DC2626' };
    case 'warning':
    case 'confirm':
      return { name: 'alert-outline', color: '#D97706' };
    case 'prompt':
      return { name: 'form-textbox', color: '#7C3AED' };
    default:
      return { name: 'information-outline', color: '#2563EB' };
  }
}

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [config, setConfig] = React.useState<AppDialogConfig | null>(null);
  const [promptValue, setPromptValue] = React.useState('');
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.96)).current;
  const isPrompt = config?.type === 'prompt';

  React.useEffect(() => {
    const originalAlert = NativeAlert.alert;
    controller = {
      show: (next) => {
        setPromptValue(next.defaultValue ?? '');
        setConfig(next);
      },
    };
    (NativeAlert as any).alert = appAlert;
    return () => {
      (NativeAlert as any).alert = originalAlert;
      controller = null;
    };
  }, []);

  React.useEffect(() => {
    if (!config) return;
    opacity.setValue(0);
    scale.setValue(0.96);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 220, mass: 0.8, useNativeDriver: true }),
    ]).start();
  }, [config, opacity, scale]);

  const close = React.useCallback((button?: AppDialogButton) => {
    Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      const value = promptValue;
      const onDismiss = config?.onDismiss;
      setConfig(null);
      setPromptValue('');
      if (button) {
        button.onPress?.(value);
      } else {
        onDismiss?.();
      }
    });
  }, [config?.onDismiss, opacity, promptValue]);

  const buttons = config?.buttons?.length ? config.buttons : [{ text: 'OK' }];
  const icon = getIcon(config?.type);

  return (
    <>
      {children}
      <Modal transparent visible={Boolean(config)} animationType="none" onRequestClose={() => config?.cancelable !== false && close()}>
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => config?.cancelable !== false && close()} />
          <Animated.View
            style={[
              styles.card,
              {
                marginTop: Math.max(insets.top, 18),
                marginBottom: Math.max(insets.bottom, 18),
                backgroundColor: theme.colors.surface,
                transform: [{ scale }],
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: icon.color + '14' }]}>
              <MaterialCommunityIcons name={icon.name as any} size={30} color={icon.color} />
            </View>
            {config?.title ? (
              <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
                {config.title}
              </Text>
            ) : null}
            {config?.message ? (
              <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
                {config.message}
              </Text>
            ) : null}
            {isPrompt ? (
              <TextInput
                mode="outlined"
                value={promptValue}
                onChangeText={setPromptValue}
                placeholder={config?.placeholder}
                multiline
                numberOfLines={4}
                style={styles.promptInput}
              />
            ) : null}
            <View style={[styles.actions, buttons.length > 2 && styles.actionsStacked]}>
              {buttons.map((button, index) => {
                const isCancel = button.style === 'cancel';
                const isDestructive = button.style === 'destructive';
                return (
                  <Button
                    key={`${button.text ?? 'OK'}-${index}`}
                    mode={isCancel ? 'outlined' : 'contained'}
                    onPress={() => close(button)}
                    buttonColor={isDestructive ? theme.colors.error : undefined}
                    textColor={isDestructive ? theme.colors.onError : undefined}
                    style={styles.actionButton}
                  >
                    {button.text ?? 'OK'}
                  </Button>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.46)',
    paddingHorizontal: 18,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    fontWeight: '900',
  },
  message: {
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  promptInput: {
    alignSelf: 'stretch',
    marginTop: 14,
    minHeight: 96,
  },
  actions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
});
