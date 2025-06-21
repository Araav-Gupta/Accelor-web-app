import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

function GlareCard({ children, className }) {
  const ref = useRef(null);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Update glare position
    setGlarePosition({ x, y });

    // Calculate tilt based on mouse position (center is 0 tilt)
    const tiltX = (y - 50) / 5; // Max tilt of 10 degrees
    const tiltY = (50 - x) / 5; // Max tilt of 10 degrees
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    // Reset glare and tilt on mouse leave
    setGlarePosition({ x: 50, y: 50 });
    setTilt({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      className={cn(
        "relative", // Removed overflow-hidden to avoid clipping ShineBorder
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformPerspective: 1000,
      }}
      animate={{
        rotateX: tilt.x,
        rotateY: tilt.y,
      }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
    >
      {/* Card content */}
      {children}

      {/* Glare overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 50%)`,
          mixBlendMode: 'overlay',
        }}
      />
    </motion.div>
  );
}

export default GlareCard;