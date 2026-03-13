'use client';

import { useCallback, useContext, useRef } from 'react';
import type { OnboardingCollectionOptions } from '@dialstack/sdk';
import { OnboardingPortal } from '@dialstack/sdk';
import { redirect } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { SettingsContext } from '@/app/contexts/settings/SettingsContext';

const isOnboardingEnabled = process.env.NEXT_PUBLIC_ENABLE_ONBOARDING === 'true';

// Set NEXT_PUBLIC_ONBOARDING_INITIAL_STEP=hardware in .env to jump to a step during dev.
const devInitialStep = process.env.NEXT_PUBLIC_ONBOARDING_INITIAL_STEP as
  | OnboardingCollectionOptions['initialStep']
  | undefined;

/** Escape HTML special characters to prevent XSS. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Build sidebar logo HTML from brand settings. */
function buildLogoHtml(companyName?: string, companyLogoUrl?: string): string {
  const safeName = escapeHtml(companyName || 'Spineline');

  if (companyLogoUrl) {
    const safeUrl = encodeURI(companyLogoUrl);
    return `<div style="display:flex;align-items:center;gap:8px">
      <img src="${safeUrl}" alt="" style="height:28px;width:auto" />
      <span style="font-size:20px;font-weight:700;color:#f0f0ff">${safeName}</span>
    </div>`;
  }

  // Default: use Spineline logo from public assets
  return `<div style="display:flex;align-items:center;gap:8px">
    <img src="/spineline_icon.webp" alt="" style="height:28px;width:auto" />
    <span style="font-size:20px;font-weight:700;color:#f0f0ff">${safeName}</span>
  </div>`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const settings = useContext(SettingsContext);

  if (!isOnboardingEnabled) {
    redirect('/home');
  }

  const baseName = settings.companyName || 'Spineline';
  const platformName = `${baseName} Voice`;
  const logoHtml = buildLogoHtml(platformName, settings.companyLogoUrl);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const handleExit = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return router.push('/home');
    // Remove entry animation classes first, then apply exit animation
    el.classList.remove('animate-in', 'fade-in');
    el.classList.add('animate-out', 'fade-out', 'duration-400');
    let navigated = false;
    const navigate = () => {
      if (navigated) return;
      navigated = true;
      el.style.display = 'none';
      router.push('/home');
    };
    el.addEventListener('animationend', navigate, { once: true });
    // Fallback if animation doesn't fire (e.g., prefers-reduced-motion)
    setTimeout(navigate, 500);
  }, [router]);

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-0 z-50 bg-background animate-in fade-in duration-500"
    >
      <OnboardingPortal
        platformName={platformName}
        logoHtml={logoHtml}
        onBack={handleExit}
        backLabel="Back to Spineline"
        onStepChange={(event) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('Onboarding step:', event.step);
          }
        }}
        collectionOptions={devInitialStep ? { initialStep: devInitialStep } : undefined}
        fullTermsOfServiceUrl="https://example.com/terms"
        privacyPolicyUrl="https://example.com/privacy"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
