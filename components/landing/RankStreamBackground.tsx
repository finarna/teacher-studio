import React, { useEffect, useState } from 'react';

const RankStreamBackground: React.FC = () => {
  const [dots, setDots] = useState<{ left: string; duration: string; delay: string; top: string }[]>([]);

  useEffect(() => {
    // Generate random dots on the client to avoid hydration mismatch
    const newDots = Array.from({ length: 40 }).map(() => ({
      left: `${Math.random() * 100}%`,
      duration: `${10 + Math.random() * 10}s`,
      delay: `${Math.random() * 20}s`,
      top: `${Math.random() * 100}%`,
    }));
    setDots(newDots);
  }, []);

  return (
    <div className="rank-stream-layer">
      {dots.map((dot, i) => (
        <div
          key={i}
          className="rank-dot"
          style={{
            left: dot.left,
            top: dot.top,
            animationDuration: dot.duration,
            animationDelay: dot.delay,
          }}
        />
      ))}
    </div>
  );
};

export default RankStreamBackground;
