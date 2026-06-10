import { useState, useEffect } from 'react';

// 좁은 화면(모바일/웹뷰) 여부. 기본 분기점 600px.
export function useIsMobile(breakpoint = 600): boolean {
  const get = () => typeof window !== 'undefined' && window.innerWidth <= breakpoint;
  const [isMobile, setIsMobile] = useState(get);

  useEffect(() => {
    const onResize = () => setIsMobile(get());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakpoint]);

  return isMobile;
}
