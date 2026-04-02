import type { ReactNode } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { useTheme } from '@/context/ThemeContext';

/**
 * Syncs Ant Design theme with app light/dark (data-theme).
 */
export function AntConfigProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  );
}
