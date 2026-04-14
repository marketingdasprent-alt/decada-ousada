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

  if (!mounted) return '/images/logo-decada-ousada.png';

  const isLight = resolvedTheme === 'light' || theme === 'light';
  const isMotoristaRoute = location.pathname === '/motorista' || location.pathname.startsWith('/motorista/');

  if (isMotoristaRoute) {
    return '/images/logo-rota-liquida.png.png';
  }

  return isLight 
    ? '/images/logo-decada-ousada.png' 
    : '/images/logo-decada-ousada-white.png';
};
