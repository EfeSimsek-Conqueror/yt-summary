"use client";

import { useEffect, useState } from "react";

export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setIsMobile(width < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isMobile,
    windowWidth,
    /** Center cover flow card — larger on desktop so the hero stays readable. */
    albumSize: isMobile ? 188 : 248,
  };
}
