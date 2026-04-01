"use client";

import Image from "next/image";
import { useState, type ImgHTMLAttributes } from "react";

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
};

export function ImageWithFallback({ src, alt, className, style }: Props) {
  const [failed, setFailed] = useState(false);
  const remote =
    typeof src === "string" &&
    (src.startsWith("https://") || src.startsWith("http://"));

  if (failed || !remote) {
    return (
      <img
        src={failed ? ERROR_IMG_SRC : src}
        alt={alt ?? ""}
        className={className}
        style={style}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt ?? ""}
      width={800}
      height={800}
      className={className}
      style={style}
      sizes="(max-width: 768px) 90vw, 320px"
      onError={() => setFailed(true)}
    />
  );
}
