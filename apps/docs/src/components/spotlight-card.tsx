"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SpotlightCard({
  children,
  className,
  contentClassName,
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const updatePosition = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsHovered(true);
    updatePosition(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updatePosition(e);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "bento-card spotlight-card group relative",
        isHovered && "is-hovered",
        className
      )}
      {...props}
    >
      {/* Illuminated glowing border following cursor */}
      <div className="spotlight-border" aria-hidden="true" />
      {/* Surface radial glow following cursor */}
      <div className="spotlight-overlay" aria-hidden="true" />
      {/* Card content */}
      <div
        className={cn(
          "spotlight-content relative z-10 w-full h-full",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
