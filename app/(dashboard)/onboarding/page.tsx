'use client';

import Container from '@/app/components/Container';
import EmbeddedComponentContainer from '@/app/components/EmbeddedComponentContainer';
import { AccountOnboarding } from '@dialstack/sdk';
import { redirect } from 'next/navigation';
import { useRouter } from 'next/navigation';

const isOnboardingEnabled = process.env.NEXT_PUBLIC_ENABLE_ONBOARDING === 'true';

export default function OnboardingPage() {
  const router = useRouter();

  if (!isOnboardingEnabled) {
    redirect('/home');
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Account Setup</h1>

      <Container className="p-5">
        <EmbeddedComponentContainer componentName="AccountOnboarding">
          <AccountOnboarding
            onExit={() => router.push('/home')}
            onStepChange={(event) => {
              if (process.env.NODE_ENV === 'development') {
                console.log('Onboarding step:', event.step);
              }
            }}
            fullTermsOfServiceUrl="https://example.com/terms"
            privacyPolicyUrl="https://example.com/privacy"
          />
        </EmbeddedComponentContainer>
      </Container>
    </>
  );
}
