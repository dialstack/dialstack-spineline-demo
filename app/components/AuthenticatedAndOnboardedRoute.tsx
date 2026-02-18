'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

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
  const { status } = useSession();

  if (status === 'loading') {
    return <LoadingView />;
  }

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  return <>{children}</>;
}
