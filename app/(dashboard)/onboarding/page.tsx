'use client';

import type { OnboardingCollectionOptions } from '@dialstack/sdk';
import { OnboardingPortal } from '@dialstack/sdk';
import { redirect } from 'next/navigation';
import { useRouter } from 'next/navigation';

const isOnboardingEnabled = process.env.NEXT_PUBLIC_ENABLE_ONBOARDING === 'true';

// Set NEXT_PUBLIC_ONBOARDING_INITIAL_STEP=hardware in .env to jump to a step during dev.
const devInitialStep = process.env.NEXT_PUBLIC_ONBOARDING_INITIAL_STEP as
  | OnboardingCollectionOptions['initialStep']
  | undefined;

export default function OnboardingPage() {
  const router = useRouter();

  if (!isOnboardingEnabled) {
    redirect('/home');
  }

  const handleExit = () => router.push('/home');

  return (
    <div className="fixed inset-0 z-50 bg-background animate-in fade-in duration-500">
      <OnboardingPortal
        onBack={handleExit}
        collectionOptions={devInitialStep ? { initialStep: devInitialStep } : undefined}
        fullTermsOfServiceUrl="https://example.com/terms"
        privacyPolicyUrl="https://example.com/privacy"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
