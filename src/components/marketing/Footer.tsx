import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-surface-dark">OnPace</span>
            </Link>
            <p className="text-sm leading-6 text-gray-600 max-w-xs">
              The premium study productivity platform for high school students. Stop procrastinating and get your life back.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-surface-dark">Product</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="#features" className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link href="#pricing" className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      Pricing
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-surface-dark">Support</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-surface-dark">Company</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      Blog
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-surface-dark">Legal</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-gray-900/10 pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-gray-500">&copy; {new Date().getFullYear()} OnPace. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
