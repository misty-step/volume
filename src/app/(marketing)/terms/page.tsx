import Link from "next/link";
import { Footer } from "@/components/layout/footer";

export default function TermsOfService() {
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
              Terms of Service
            </h1>
            <p className="font-mono text-sm text-muted-foreground uppercase">
              Last Updated: January 23, 2025
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <div className="space-y-8">
              {/* Section 1 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  1. Acceptance of Terms
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  By accessing and using Volume (&quot;the Service&quot;), you
                  accept and agree to be bound by these Terms of Service
                  (&quot;Terms&quot;). If you do not agree to these Terms, do
                  not use the Service.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  Volume is operated by Misty Step (&quot;we,&quot;
                  &quot;us,&quot; or &quot;our&quot;). These Terms apply to all
                  users of the Service.
                </p>
              </section>

              {/* Section 2 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  2. Description of Service
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  Volume is a workout tracking application that allows you to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                  <li>Log sets, reps, and weight for exercises</li>
                  <li>View workout history and analytics</li>
                  <li>Receive AI-powered insights about your training</li>
                  <li>Sync data across devices in real-time</li>
                </ul>
                <p className="text-foreground/90 leading-relaxed mt-4">
                  We reserve the right to modify, suspend, or discontinue any
                  part of the Service at any time without notice.
                </p>
              </section>

              {/* Section 3 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  3. User Accounts
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  To use the Service, you must:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                  <li>Be at least 13 years of age</li>
                  <li>
                    Provide accurate and complete registration information
                  </li>
                  <li>Maintain the security of your account credentials</li>
                  <li>
                    Accept responsibility for all activities under your account
                  </li>
                </ul>
                <p className="text-foreground/90 leading-relaxed mt-4">
                  You are responsible for maintaining the confidentiality of
                  your account and password. Notify us immediately of any
                  unauthorized use of your account.
                </p>
              </section>

              {/* Section 4 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  4. User Conduct
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  You agree not to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                  <li>
                    Use the Service for any illegal or unauthorized purpose
                  </li>
                  <li>Violate any laws in your jurisdiction</li>
                  <li>
                    Interfere with or disrupt the Service or servers/networks
                  </li>
                  <li>Attempt to gain unauthorized access to the Service</li>
                  <li>
                    Upload or transmit viruses, malware, or malicious code
                  </li>
                  <li>
                    Impersonate any person or entity or misrepresent your
                    affiliation
                  </li>
                  <li>Harvest or collect information about other users</li>
                </ul>
              </section>

              {/* Section 5 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  5. User Data and Privacy
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  Your use of the Service is also governed by our Privacy
                  Policy. Please review our{" "}
                  <Link
                    href="/privacy"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </Link>{" "}
                  to understand how we collect, use, and protect your data.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  You retain ownership of all workout data you create. By using
                  the Service, you grant us a license to use your data to
                  provide and improve the Service, including generating AI
                  insights.
                </p>
              </section>

              {/* Section 6 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  6. Intellectual Property
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  The Service and its original content, features, and
                  functionality are owned by Misty Step and are protected by
                  international copyright, trademark, patent, trade secret, and
                  other intellectual property laws.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  You may not copy, modify, distribute, sell, or lease any part
                  of the Service without our express written permission.
                </p>
              </section>

              {/* Section 7 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  7. Disclaimer of Warranties
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
                  AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS
                  OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
                  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
                  NON-INFRINGEMENT.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  We do not warrant that the Service will be uninterrupted,
                  secure, or error-free. We do not warrant the accuracy or
                  reliability of any information obtained through the Service.
                </p>
              </section>

              {/* Section 8 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  8. Limitation of Liability
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, MISTY STEP SHALL NOT
                  BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                  CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR
                  REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS
                  OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  Our total liability for any claims under these Terms shall not
                  exceed the amount you paid us in the 12 months prior to the
                  claim.
                </p>
              </section>

              {/* Section 9 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  9. Termination
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  We may terminate or suspend your account and access to the
                  Service immediately, without prior notice or liability, for
                  any reason, including breach of these Terms.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  Upon termination, your right to use the Service will
                  immediately cease. You may delete your account at any time
                  through the settings page.
                </p>
              </section>

              {/* Section 10 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  10. Changes to Terms
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  We reserve the right to modify these Terms at any time. We
                  will provide notice of material changes by updating the
                  &quot;Last Updated&quot; date and, where appropriate, by email
                  or in-app notification.
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  Your continued use of the Service after changes become
                  effective constitutes acceptance of the revised Terms.
                </p>
              </section>

              {/* Section 11 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  11. Governing Law
                </h2>
                <p className="text-foreground/90 leading-relaxed">
                  These Terms shall be governed by and construed in accordance
                  with the laws of the United States, without regard to its
                  conflict of law provisions. Any disputes shall be resolved in
                  the courts of competent jurisdiction.
                </p>
              </section>

              {/* Section 12 */}
              <section className="border-l-[3px] border-border pl-6">
                <h2 className="font-display text-2xl uppercase tracking-tight mb-4">
                  12. Contact Information
                </h2>
                <p className="text-foreground/90 leading-relaxed mb-4">
                  If you have any questions about these Terms, please contact
                  us:
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
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
