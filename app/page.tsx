"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarCheck, Phone, Quote, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import SpinelineIcon from "@/public/spineline_icon.webp";
import TestimonialImage from "@/public/testimonial.webp";
import TestimonialPortrait from "@/public/testimonial-portrait.webp";
import DashboardImage from "@/public/dashboard.webp";
import HeroImage from "@/public/landing-page.webp";

function Card({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex max-w-[400px] flex-1 flex-col items-center rounded-lg border bg-white p-6 transition duration-150 hover:scale-[1.02] hover:shadow-md">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-subdued">
        {icon}
      </div>
      <p className="pt-4 text-center text-lg font-bold text-primary">{title}</p>
      <p className="text-center text-subdued">{description}</p>
    </div>
  );
}

function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === "authenticated" && session?.user) {
    return (
      <Link href="/home">
        <Button size="lg" className="items-center gap-x-1">
          Go to dashboard
          <ArrowRight />
        </Button>
      </Link>
    );
  }

  return (
    <>
      <Link href="/login">
        <Button
          variant="secondary"
          className="bg-white"
          size="lg"
          data-testid="login-button"
        >
          Log in
        </Button>
      </Link>
      <Link href="/signup">
        <Button size="lg" className="flex items-center gap-x-1">
          Get started
          <ArrowRight />
        </Button>
      </Link>
    </>
  );
}

export default function LandingPage() {
  return (
    <div>
      {/* Hero Section */}
      <div className="relative">
        <div className="mx-auto flex max-w-screen-lg flex-col items-center px-4 pb-16 sm:pb-[140px]">
          <div className="flex w-full flex-row items-center justify-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white p-1 shadow-lg">
              <Image
                src={SpinelineIcon}
                alt="Spineline logo"
                height={80}
                width={80}
                sizes="80px"
                priority
                className="h-full w-full"
              />
            </div>
            <p className="text-2xl font-bold text-white drop-shadow-lg">
              Spineline
            </p>
          </div>

          <div className="max-w-[700px] py-8 sm:py-16">
            <h1 className="mb-1 text-center text-4xl font-bold leading-tight text-white drop-shadow sm:text-6xl">
              Practice management that has your back.
            </h1>
            <p className="pt-4 text-center text-xl text-white drop-shadow sm:text-[24px]">
              Spineline runs your clinic, so you can treat your patients. Join
              hundreds of thriving practices today.
            </p>
          </div>
          <div className="flex h-[52px] flex-row gap-x-4">
            <AuthButtons />
          </div>
        </div>
        <div className="absolute top-0 z-[-1] h-full w-full overflow-hidden bg-gradient-to-t from-black/60 to-black/30" />
        <Image
          src={HeroImage}
          alt="Healthcare wellness background"
          placeholder="blur"
          quality={80}
          sizes="100vw"
          className="absolute top-0 z-[-2] h-full w-full overflow-hidden object-cover"
          priority
        />
      </div>

      {/* Features Section */}
      <div className="relative bg-[url('/pattern.png')] bg-[length:200px]">
        <div className="mx-auto max-w-screen-lg px-4">
          <div className="flex flex-col items-center py-12 sm:py-20">
            <h3 className="text-lg font-bold text-accent">FEATURES</h3>
            <p className="mb-12 text-center text-3xl font-bold text-primary">
              Everything you need to run your chiropractic practice.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
              <Card
                icon={<Phone color="var(--accent)" />}
                title="Embedded Voice"
                description="Handle patient calls directly in your dashboard. Click-to-call, voicemail, and full call history."
              />
              <Card
                icon={<CalendarCheck color="var(--accent)" />}
                title="Smart Scheduling"
                description="Manage appointments, set recurring visits, send reminders, and optimize your treatment calendar."
              />
              <Card
                icon={<Users color="var(--accent)" />}
                title="Patient Records"
                description="Comprehensive patient profiles, treatment history, notes, and progress tracking all in one place."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Testimonial Section */}
      <div className="relative bg-accent-subdued">
        <div className="mx-auto max-w-screen-lg px-4">
          <div className="flex flex-col items-center gap-10 py-8 sm:gap-12 sm:py-12 md:flex-row">
            <Image
              src={TestimonialImage}
              alt="Chiropractic wellness"
              placeholder="blur"
              quality={100}
              sizes="100vw"
              className="w-full min-w-[280px] max-w-[450px] overflow-hidden rounded-xl object-cover shadow-lg md:min-w-[350px]"
            />
            <div className="flex flex-col gap-y-6">
              <p className="relative text-2xl font-bold text-primary sm:text-3xl">
                &ldquo;Spineline has transformed how we manage our practice! The
                embedded phone system means we never miss a patient call, and
                scheduling is seamless.&rdquo;
                <Quote
                  fill="var(--accent)"
                  strokeWidth={0}
                  size="120"
                  className="absolute right-4 top-[-50px] opacity-20 sm:right-[-20px]"
                />
              </p>
              <div className="flex flex-row items-center gap-x-5 self-end">
                <Image
                  src={TestimonialPortrait}
                  alt="Dr. Anya s."
                  placeholder="blur"
                  quality={80}
                  className="h-12 w-12 overflow-hidden rounded-full object-cover shadow-lg"
                />
                <div>
                  <p className="text-xl font-bold text-accent">Dr. Anya S.</p>
                  <p className="text-md text-subdued">Align Wellness Center</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative items-center bg-accent bg-[url('/pattern-white.png')] bg-[length:200px]">
        <div className="mx-auto max-w-screen-lg px-4">
          <div className="flex flex-col items-center gap-12 pb-40 pt-12 text-white sm:flex-row sm:pb-32 sm:pt-20">
            <div>
              <h2 className="mb-2 text-left text-4xl font-bold">
                Get started today.
              </h2>
              <p className="mb-6 text-left text-xl sm:text-2xl">
                Join thousands of chiropractors using Spineline to streamline
                their practice. Simple setup, powerful features.
              </p>
              <Link href="/signup">
                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-1.5 text-primary"
                >
                  Get started
                  <ArrowRight size={22} />
                </Button>
              </Link>
            </div>
            <div className="w-full overflow-hidden rounded-lg shadow-xl">
              <Image
                src={DashboardImage}
                alt="Spineline dashboard"
                sizes="50vw"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="fixed bottom-0 right-[50%] flex w-full translate-x-2/4 flex-col gap-3 bg-gradient-to-tr from-[#6B2CFF] to-[#FF1593] px-2 py-3 shadow-xl sm:bottom-5 sm:w-[calc(100%-24px)] sm:flex-row sm:rounded-lg sm:px-6 lg:w-[1000px]">
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/dialstack-logo.svg"
            alt="DialStack"
            className="hidden h-6 sm:block"
          />
          <p className="text-sm text-white">
            This site is a demo for{" "}
            <a
              className="border-b border-white/60 text-white transition hover:border-white/90"
              href="https://dialstack.ai/"
              target="_blank"
            >
              DialStack embedded telephony
            </a>
            . Spineline is not a real product.
          </p>
        </div>
        <div className="flex justify-end">
          <a
            className="flex items-center gap-1 text-sm font-medium text-white transition hover:opacity-80 sm:text-base"
            href="https://github.com/dialstack/dialstack-spineline-demo"
            target="_blank"
          >
            View on GitHub
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
