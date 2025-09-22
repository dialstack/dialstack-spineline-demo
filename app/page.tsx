import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="mx-auto flex flex-col max-w-screen-lg items-center">
      <div className="flex justify-center py-8">
        <p className="text-2xl font-bold">Spineline</p>
      </div>
      <div className="max-w-[700px]">
        <h1 className="mb-1 text-center text-6xl font-bold drop-shadow">
          Practice management that has your back.
        </h1>
        <p className="pt-4 text-center text-xl drop-shadow text-[24px]">
          Spineline runs your clinic, so you can treat your patients. Join
          hundreds of thriving practices today.
        </p>
      </div>
      <div>
        <a href="/login">
          <Button>Log in</Button>
        </a>
        <a href="/signup">
          <Button variant="secondary">Sign up</Button>
        </a>
      </div>

      <div className="fixed bottom-5 right-[50%] flex translate-x-2/4 bg-gradient-to-tr from-[#9160F1] to-[#11DFD4] py-3 shadow-xl rounded-lg px-6 w-[1000px]">
        <div className="flex flex-1 flex-col">
          <p className="text-sm text-white">
            This site is a demo for{' '}
            <a
              className="border-b border-white/60"
              href="https://dialstack.ai/">
              DialStack embedded telephony
            </a>
            . Spineline is not a real product.
          </p>
        </div>
        <div>
          <a
            className="flex items-center gap-1 text-sm font-medium text-white transition hover:opacity-80"
            href="https://github.com/dialstack/dialstack-spineline-demo"
            target="_blank"
          >
            View on GitHub <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
