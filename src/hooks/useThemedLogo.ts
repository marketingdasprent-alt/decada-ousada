import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useLocation } from 'react-router-dom';

export const useThemedLogo = () => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return '/images/logo-rota-liquida.png.png';

  const isLight = resolvedTheme === 'light' || theme === 'light';

  return isLight 
    ? '/images/logo-rota-liquida.png.png' 
    : '/images/logo-rota-liquida.png.png';
};
