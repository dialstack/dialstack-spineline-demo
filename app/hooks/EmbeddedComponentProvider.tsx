import React, { createContext, useContext } from "react";

type IConnectJSContext = {
  connectInstance?: null;
};

const ConnectJSContext = createContext<IConnectJSContext>({});

export const useConnectJSContext = () => {
  const context = useContext(ConnectJSContext);
  return context;
};

export const EmbeddedComponentProvider = ({
  children,
  connectInstance,
}: {
  children: React.ReactNode;
  connectInstance?: null;
}) => {
  return (
    <ConnectJSContext.Provider value={{ connectInstance }}>
      {children}
    </ConnectJSContext.Provider>
  );
};
