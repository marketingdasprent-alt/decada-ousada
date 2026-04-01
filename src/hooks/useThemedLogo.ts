import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

export const useThemedLogo = () => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoSrc = mounted && (resolvedTheme === 'light' || theme === 'light')
    ? '/images/logo-decada-ousada-light.png'
    : '/images/logo-decada-ousada-white.png';

  return logoSrc;
};
