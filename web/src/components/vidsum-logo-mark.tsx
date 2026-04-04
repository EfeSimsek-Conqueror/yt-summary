import Image from "next/image";

const SRC = "/vidsum-app-logo.png";

type Props = {
  size: number;
  className?: string;
  rounded?: "lg" | "xl" | "2xl";
};

const roundedClass: Record<NonNullable<Props["rounded"]>, string> = {
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

export function VidSumLogoMark({
  size,
  className = "",
  rounded = "lg",
}: Props) {
  return (
    <Image
      src={SRC}
      alt=""
      width={size}
      height={size}
      className={`${roundedClass[rounded]} object-cover ${className}`.trim()}
      aria-hidden
    />
  );
}
