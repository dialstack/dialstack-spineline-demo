import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="py-16">
      <div className="mx-auto flex max-w-[450px] flex-col gap-6 p-3">
        <div className="mb-6 flex w-full justify-center">
          <Link href="/">
            <div className="flex items-center gap-4 text-3xl font-bold text-primary">
              Spineline
            </div>
          </Link>
        </div>
        <div className="no-scrollbar w-full rounded-xl p-5 rounded-lg border">
          {children}
        </div>
        <div className="mt-8 flex w-full flex-col items-center gap-2">
          <p className="text-center text-sm text-subdued">
            This site is a demo for{" "}
            <a
              className="border-b border-black/20 font-medium hover:hover-black/70"
              href="https://dialstack.ai/"
              target="_blank"
            >
              DialStack embedded telephony
            </a>
            . Spineline is not a real product.
          </p>
        </div>
      </div>
    </div>
  );
}
