import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ThemeAwareLogo } from "@/components/theme-aware-logo";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="w-full flex justify-center border-b border-b-foreground/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="w-full max-w-7xl flex justify-between items-center p-4 px-6">
          <div className="flex gap-3 items-center">
            <Link href="/">
              <ThemeAwareLogo
                width={180}
                height={180}
                className="rounded-lg"
              />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-8">
          <div className="flex justify-center mb-8">
            <ThemeAwareLogo
              width={400}
              height={400}
              className="rounded-2xl"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white leading-tight">
            Transform Your
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500"> Paper Assets</span>
            <br />
            Into Digital Pages
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-4xl mx-auto leading-relaxed">
            CrownPages helps businesses convert traditional paper marketing materials into shareable,
            trackable digital pages with powerful analytics and easy distribution.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Link href="/auth/sign-up" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold px-8 py-4 rounded-xl hover:shadow-lg transition-all duration-300 text-lg">
              Get Started Free
            </Link>
            <button className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold px-8 py-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 text-lg">
              View Demo
            </button>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="w-full bg-white dark:bg-slate-900 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-16">
            Why Choose CrownPages?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Mobile-First Creation</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Create stunning pages directly from your mobile device with our intuitive editor.
                No desktop required.
              </p>
            </div>
            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Powerful Analytics</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Track views, engagement, and user interactions with detailed analytics
                to optimize your content performance.
              </p>
            </div>
            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">🔗</span>
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Easy Sharing</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Share with anyone via simple links. Recipients don&apos;t need the app
                to view your beautiful pages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-16">
            Everything You Need
          </h2>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-sm">✓</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Multiple Page Categories
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300">
                    Create Family pages, Partnership pages, or custom categories tailored to your business needs.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-sm">✓</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Digital Wallet
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300">
                    Collect and organize favorite pages from others in customizable folders within your digital wallet.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-sm">✓</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Template Library
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300">
                    Choose from professionally designed templates or build pages from scratch with our flexible editor.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-sm">✓</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Rich Media Support
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300">
                    Upload images, documents, and customize colors to match your brand perfectly.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">👑</div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Ready to Get Started?
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Join businesses already using CrownPages to digitize their marketing materials.
              </p>
              <Link href="/auth/sign-up" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300">
                Start Creating Pages
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Use Case Example */}
      <section className="w-full bg-slate-50 dark:bg-slate-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-8">
            Perfect for Every Business
          </h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">🦷</span>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                  Dental Practice Example
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  &ldquo;As a dental practice, we created a page to share with patients containing our medical forms,
                  office information, and contact details. Now patients can easily access everything they need
                  before their appointment, and we can track which forms are being downloaded most.&rdquo;
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-2xl mb-2">📋</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Medical Forms</p>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-2xl mb-2">📍</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Office Location</p>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-2xl mb-2">📊</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Track Engagement</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <ThemeAwareLogo
                width={120}
                height={120}
                className="rounded-lg"
              />
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
              <Link href="/privacy-policy" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms-of-service" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/contact" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Contact
              </Link>
            </div>
          </div>
          <div className="text-center mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              © 2024 CrownPages. Transforming paper assets into digital experiences.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
