import React, { createContext, useContext } from "react";
import type { DialStackInstance } from "@dialstack/sdk";

type IDialstackContext = {
  dialstackInstance: DialStackInstance | null;
};

const DialstackContext = createContext<IDialstackContext>({
  dialstackInstance: null,
});

export const useDialstackContext = () => {
  const context = useContext(DialstackContext);
  return context;
};

export const EmbeddedComponentProvider = ({
  children,
  dialstackInstance,
}: {
  children: React.ReactNode;
  dialstackInstance: DialStackInstance | null;
}) => {
  return (
    <DialstackContext.Provider value={{ dialstackInstance }}>
      {children}
    </DialstackContext.Provider>
  );
};
