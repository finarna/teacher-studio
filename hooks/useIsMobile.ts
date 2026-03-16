import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the window size is mobile
 * @param breakpoint The pixel width at which to switch to mobile (default: 768)
 * @returns boolean true if mobile
 */
export const useIsMobile = (breakpoint: number = 768) => {
    const [isMobile, setIsMobile] = useState<boolean>(false);

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        // Initial check
        checkIsMobile();

        // Debounced resize handler — batches rapid resize events to avoid
        // triggering expensive re-renders on every pixel change.
        let timer: ReturnType<typeof setTimeout>;
        const handleResize = () => {
            clearTimeout(timer);
            timer = setTimeout(checkIsMobile, 150);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, [breakpoint]);

    return isMobile;
};
