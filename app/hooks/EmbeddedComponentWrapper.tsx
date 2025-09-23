"use client";

import { EmbeddedComponentProvider } from "@/app/hooks/EmbeddedComponentProvider";

export const EmbeddedComponentWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <EmbeddedComponentProvider>{children}</EmbeddedComponentProvider>;
};
