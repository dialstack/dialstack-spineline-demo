"use client";

import { useSession } from "next-auth/react";
import { LoaderCircle } from "lucide-react";

const LoadingView = () => {
  return (
    <div className="h-64 content-center">
      <LoaderCircle className="mx-auto animate-spin" size={30} />
    </div>
  );
};

export default function AuthenticatedAndOnboardedRoute({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: session } = useSession();

  const isLoading = !session || !session.user;

  if (isLoading) {
    return <LoadingView />;
  }

  return <>{children}</>;
}
