import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    dataLayer?: any[];
  }
}

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Ensure dataLayer exists
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      
      // Push page_view event
      window.dataLayer.push({
        event: 'page_view',
        page_title: document.title,
        page_location: window.location.href,
        page_path: location.pathname
      });
      
      if (import.meta.env.DEV) {
        console.info('[GTM] Page view tracked:', {
          page_title: document.title,
          page_location: window.location.href,
          page_path: location.pathname
        });
      }
    }
  }, [location]);
};