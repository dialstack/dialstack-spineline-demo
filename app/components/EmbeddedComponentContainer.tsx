"use client";

import { useEmbeddedComponentBorder } from "@/app/hooks/EmbeddedComponentBorderProvider";
import { ChevronRight } from "lucide-react";

// Maps component names to their documentation URLs
const ComponentURLs: { [key: string]: string } = {
  CallLogs: "https://docs.dialstack.ai/sdks/react/call-logs",
  CallHistory: "https://docs.dialstack.ai/sdks/react/call-history",
  Voicemails: "https://docs.dialstack.ai/sdks/react/voicemails",
};

const EmbeddedComponentContainer = ({
  children,
  className,
  componentName,
}: {
  children: React.ReactNode;
  className?: string;
  componentName: string;
}) => {
  const { enableBorder } = useEmbeddedComponentBorder();

  const renderComponentDetails = () => {
    if (!enableBorder) {
      return null;
    }

    if (!(componentName in ComponentURLs)) {
      return null;
    }

    return (
      <div className="absolute -top-9 right-0 z-40 flex max-w-full gap-2 pb-2 transition duration-150 group-hover:opacity-100 sm:opacity-0">
        <a
          className="flex max-w-full items-center gap-1 truncate rounded border bg-component px-1.5 py-0.5 font-mono font-bold text-white shadow-lg"
          href={ComponentURLs[componentName]}
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="truncate">{componentName}</div>
          <ChevronRight className="sm:hidden" size="16" />
        </a>
        <a
          className="hidden items-center gap-1 rounded border bg-screen-background px-1.5 py-0.5 font-mono font-bold text-foreground shadow-lg hover:opacity-90 sm:flex"
          href={ComponentURLs[componentName]}
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="truncate">View in Docs</div>
          <ChevronRight size="16" />
        </a>
      </div>
    );
  };

  return (
    <div
      className={`${
        enableBorder
          ? "m-[-4px] rounded-lg border-[3px] border-dashed border-component p-[8px]"
          : ""
      } group relative transition-border duration-200 ${className}`}
    >
      {renderComponentDetails()}
      {children}
    </div>
  );
};

export default EmbeddedComponentContainer;
