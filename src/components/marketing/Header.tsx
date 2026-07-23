import Link from "next/link";
import Image from "next/image";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="OnPace" width={32} height={32} className="rounded-lg object-contain" />
          <span className="text-xl font-bold tracking-tight text-surface-dark">OnPace</span>
        </Link>
        <nav className="hidden md:flex gap-6">
          <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-brand transition-colors">
            Features
          </Link>
          <Link href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-brand transition-colors">
            How it works
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-gray-600 hover:text-brand transition-colors">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden text-sm font-medium text-gray-600 hover:text-brand transition-colors sm:block">
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-hover active:scale-95 transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
