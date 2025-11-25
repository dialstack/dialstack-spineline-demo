"use client";

import { useEmbeddedComponentBorder } from "@/app/hooks/EmbeddedComponentBorderProvider";

const EmbeddedComponentContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { enableBorder } = useEmbeddedComponentBorder();

  return (
    <div
      className={`${
        enableBorder
          ? "m-[-4px] rounded-lg border-2 border-dashed border-component p-[8px]"
          : "p-[6px]"
      } group relative transition-border duration-200 ${className}`}
    >
      {children}
    </div>
  );
};

export default EmbeddedComponentContainer;
