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

        // Event listener
        window.addEventListener('resize', checkIsMobile);

        return () => window.removeEventListener('resize', checkIsMobile);
    }, [breakpoint]);

    return isMobile;
};
