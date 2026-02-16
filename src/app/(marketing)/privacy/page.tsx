import Link from "next/link";
import { Footer } from "@/components/layout/footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b-[3px] border-border bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="font-display text-2xl tracking-tight hover:text-primary transition-colors inline-block"
          >
            VOLUME
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Title */}
          <div className="border-l-[4px] border-primary pl-6 mb-12">
            <h1 className="font-display text-5xl md:text-6xl tracking-tight uppercase mb-3">
              Privacy Policy
            </h1>
            <p className="font-mono text-sm text-muted-foreground uppercase">
              Last Updated: January 23, 2025
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <div className="space-y-8">
              {/* Introduction */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  Introduction
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  Misty Step (&quot;we,&quot; &quot;us,&quot; or
                  &quot;our&quot;) operates Volume (&quot;the Service&quot;), a
                  workout tracking application. This Privacy Policy explains how
                  we collect, use, disclose, and safeguard your information when
                  you use our Service.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  By using Volume, you agree to the collection and use of
                  information in accordance with this policy. If you do not
                  agree with our policies and practices, do not use the Service.
                </p>
              </section>

              {/* Section 1 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  1. Information We Collect
                </h2>
                <h3 className="font-mono text-lg uppercase tracking-tight mb-3 mt-6">
                  1.1 Account Information
                </h3>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  When you create an account, we collect:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                  <li>Email address</li>
                  <li>Name (if provided)</li>
                  <li>Profile information (optional)</li>
                  <li>Authentication credentials (managed by Clerk)</li>
                </ul>

                <h3 className="font-mono text-lg uppercase tracking-tight mb-3 mt-6">
                  1.2 Workout Data
                </h3>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  When you use the Service, we collect:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                  <li>Exercise names and types</li>
                  <li>Set data (reps, weight, date/time)</li>
                  <li>Workout history and patterns</li>
                  <li>User preferences and settings</li>
                </ul>

                <h3 className="font-mono text-lg uppercase tracking-tight mb-3 mt-6">
                  1.3 Usage Information
                </h3>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  We automatically collect:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                  <li>Device information (type, OS, browser)</li>
                  <li>Usage patterns and interactions</li>
                  <li>Performance metrics (page load times, errors)</li>
                  <li>
                    Analytics data (via Vercel Analytics, aggregated and
                    anonymous)
                  </li>
                </ul>
              </section>

              {/* Section 2 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  2. How We Use Your Information
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  We use the collected information to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                  <li>Provide and maintain the Service</li>
                  <li>Sync your workout data across devices</li>
                  <li>
                    Generate AI-powered insights and analytics about your
                    training
                  </li>
                  <li>Send weekly recaps and notifications (if enabled)</li>
                  <li>Improve and optimize the Service</li>
                  <li>Detect and prevent technical issues and abuse</li>
                  <li>Communicate with you about updates and features</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  3. AI and Machine Learning
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  Volume uses AI (powered by OpenRouter and third-party model
                  providers) to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                  <li>Generate weekly workout summaries and insights</li>
                  <li>Identify training patterns and trends</li>
                  <li>Provide personalized recommendations</li>
                </ul>
                <p className="text-foreground/90 leading-relaxed mt-4">
                  Your workout data may be processed by OpenRouter and the
                  underlying model provider to generate these insights. We only
                  send the data needed to generate insights, and all data sent
                  to AI services is encrypted in transit.
                </p>
              </section>

              {/* Section 4 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  4. Third-Party Services
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  We use the following third-party services:
                </p>

                <div className="space-y-4">
                  <div className="bg-muted/30 border-l-[3px] border-primary p-4">
                    <h3 className="font-mono text-sm uppercase mb-2">
                      Clerk (Authentication)
                    </h3>
                    <p className="text-foreground/90 text-sm leading-relaxed">
                      Manages user authentication and account security. See{" "}
                      <a
                        href="https://clerk.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Clerk&apos;s Privacy Policy
                      </a>
                      .
                    </p>
                  </div>

                  <div className="bg-muted/30 border-l-[3px] border-primary p-4">
                    <h3 className="font-mono text-sm uppercase mb-2">
                      Convex (Database)
                    </h3>
                    <p className="text-foreground/90 text-sm leading-relaxed">
                      Stores and syncs your workout data in real-time. See{" "}
                      <a
                        href="https://www.convex.dev/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Convex&apos;s Privacy Policy
                      </a>
                      .
                    </p>
                  </div>

                  <div className="bg-muted/30 border-l-[3px] border-primary p-4">
                    <h3 className="font-mono text-sm uppercase mb-2">
                      Vercel (Hosting & Analytics)
                    </h3>
                    <p className="text-foreground/90 text-sm leading-relaxed">
                      Hosts the application and provides aggregated, anonymous
                      analytics. See{" "}
                      <a
                        href="https://vercel.com/legal/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Vercel&apos;s Privacy Policy
                      </a>
                      .
                    </p>
                  </div>

                  <div className="bg-muted/30 border-l-[3px] border-primary p-4">
                    <h3 className="font-mono text-sm uppercase mb-2">
                      Sentry (Error Tracking)
                    </h3>
                    <p className="text-foreground/90 text-sm leading-relaxed">
                      Monitors errors and performance issues. Personal data is
                      automatically redacted. See{" "}
                      <a
                        href="https://sentry.io/privacy/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Sentry&apos;s Privacy Policy
                      </a>
                      .
                    </p>
                  </div>

                  <div className="bg-muted/30 border-l-[3px] border-primary p-4">
                    <h3 className="font-mono text-sm uppercase mb-2">
                      OpenRouter (AI Gateway)
                    </h3>
                    <p className="text-foreground/90 text-sm leading-relaxed">
                      Routes AI requests to third-party model providers to
                      generate workout insights and summaries. See{" "}
                      <a
                        href="https://openrouter.ai/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        OpenRouter&apos;s Privacy Policy
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  5. Data Security
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  We implement security measures to protect your data:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                  <li>All data transmitted via HTTPS encryption</li>
                  <li>Secure authentication via Clerk</li>
                  <li>
                    Automatic PII (personally identifiable information)
                    redaction in error logs
                  </li>
                  <li>Regular security audits and updates</li>
                  <li>Access controls and user isolation</li>
                </ul>
                <p className="text-foreground/90 leading-relaxed mt-4">
                  However, no method of transmission over the internet is 100%
                  secure. While we strive to protect your data, we cannot
                  guarantee absolute security.
                </p>
              </section>

              {/* Section 6 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  6. Data Retention
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  We retain your information for as long as your account is
                  active or as needed to provide the Service. You can delete
                  your account at any time through the settings page.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  When you delete your account, we will delete your workout data
                  and personal information within 30 days, except where we are
                  required to retain it for legal or regulatory purposes.
                </p>
              </section>

              {/* Section 7 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  7. Your Privacy Rights
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                  <li>Access your personal data and workout information</li>
                  <li>Export your data in JSON format</li>
                  <li>Correct inaccurate information</li>
                  <li>Delete your account and associated data</li>
                  <li>Opt out of email communications</li>
                  <li>Withdraw consent for AI features</li>
                </ul>
                <p className="text-foreground/90 leading-relaxed mt-4">
                  To exercise these rights, contact us at{" "}
                  <a
                    href="mailto:hello@mistystep.io"
                    className="text-primary hover:underline"
                  >
                    hello@mistystep.io
                  </a>
                  .
                </p>
              </section>

              {/* Section 8 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  8. Children&apos;s Privacy
                </h2>
                <p className="text-foreground/90 leading-relaxed">
                  Our Service is not directed to children under 13. We do not
                  knowingly collect personal information from children under 13.
                  If you become aware that a child has provided us with personal
                  data, please contact us so we can delete it.
                </p>
              </section>

              {/* Section 9 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  9. International Users
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  Volume is hosted in the United States. If you access the
                  Service from outside the U.S., your data may be transferred
                  to, stored, and processed in the United States.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  By using the Service, you consent to the transfer of your
                  information to the United States and other countries where our
                  service providers operate.
                </p>
              </section>

              {/* Section 10 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  10. Changes to This Policy
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  We may update this Privacy Policy from time to time. We will
                  notify you of material changes by updating the &quot;Last
                  Updated&quot; date and, where appropriate, by email or in-app
                  notification.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  Your continued use of the Service after changes become
                  effective constitutes acceptance of the updated Privacy
                  Policy.
                </p>
              </section>

              {/* Section 11 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  11. Contact Us
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  If you have questions about this Privacy Policy or our privacy
                  practices, contact us:
                </p>
                <div className="bg-muted/30 border-l-[3px] border-primary p-4 font-mono text-sm">
                  <p className="text-foreground/90">
                    Email:{" "}
                    <a
                      href="mailto:hello@mistystep.io"
                      className="text-primary hover:underline"
                    >
                      hello@mistystep.io
                    </a>
                  </p>
                  <p className="text-foreground/90 mt-2">
                    Website:{" "}
                    <a
                      href="https://mistystep.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      mistystep.io
                    </a>
                  </p>
                </div>
              </section>

              {/* GDPR/CCPA Note */}
              <section className="border-l-[3px] border-primary pl-6 bg-muted/20 p-6">
                <h2 className="font-display text-xl uppercase tracking-tight mb-4">
                  Additional Rights for EU and California Users
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  If you are in the European Union or California, you may have
                  additional rights under GDPR or CCPA, including the right to
                  request deletion, portability, and restriction of processing.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  Contact us at{" "}
                  <a
                    href="mailto:hello@mistystep.io"
                    className="text-primary hover:underline"
                  >
                    hello@mistystep.io
                  </a>{" "}
                  to exercise these rights.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
