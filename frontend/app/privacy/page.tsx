/**
 * Privacy Policy Page
 */

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-lg text-gray-600">
            Last updated: February 24, 2026
          </p>
        </div>

        {/* Privacy Content */}
        <div className="bg-white rounded-2xl shadow-card p-8 space-y-8">

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Seedling ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our platform
              for pitch competitions ("the Service").
            </p>
            <p className="text-gray-700 leading-relaxed">
              By using the Service, you agree to the collection and use of information in accordance with
              this policy. If you do not agree with our policies and practices, please do not use the Service.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Personal Information</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              When you register for an account, we collect:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700 mb-4">
              <li>Name and username</li>
              <li>Email address</li>
              <li>Password (encrypted and hashed)</li>
              <li>Profile photo (optional)</li>
              <li>Account role (Founder, Judge, or Admin)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Payment Information</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Payment processing is handled by Stripe. We do not store your full credit card information.
              We collect:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700 mb-4">
              <li>Stripe customer ID and payment intent IDs</li>
              <li>Stripe Connect account information (for prize payouts)</li>
              <li>Transaction history and amounts</li>
              <li>Payment status and timestamps</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">2.3 Submission Content</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              When you submit to a competition, we collect:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700 mb-4">
              <li>Video files (uploaded to AWS S3)</li>
              <li>Pitch titles and descriptions</li>
              <li>Competition entries and timestamps</li>
              <li>Submission status and visibility preferences</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">2.4 Usage Data</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We automatically collect certain information when you use the Service:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700 mb-4">
              <li>IP address and browser type</li>
              <li>Device information and operating system</li>
              <li>Pages visited and actions taken</li>
              <li>Date and time of visits</li>
              <li>Referring URLs</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">2.5 Judging Data</h3>
            <p className="text-gray-700 leading-relaxed">
              If you serve as a judge, we collect your scores, feedback comments, and judging assignments.
            </p>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li>Provide, operate, and maintain the Service</li>
              <li>Process competition entries and payments</li>
              <li>Facilitate judging and score calculation</li>
              <li>Distribute prize payouts to winners</li>
              <li>Send email notifications about competitions and results</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Detect and prevent fraud, abuse, or security incidents</li>
              <li>Analyze usage patterns to improve the Service</li>
              <li>Comply with legal obligations and resolve disputes</li>
              <li>Send administrative information, updates, and service announcements</li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Third-Party Services</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Stripe</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use Stripe for payment processing and prize payouts. When you make a payment or connect
              a payout account, Stripe collects and processes your financial information according to their
              Privacy Policy. We do not have access to your full payment card details.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Learn more:{' '}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 font-medium"
              >
                Stripe Privacy Policy
              </a>
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Amazon Web Services (AWS S3)</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Video submissions are stored securely on AWS S3. Videos are accessed via time-limited presigned
              URLs that expire after a set period. AWS maintains industry-standard security and privacy practices.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Learn more:{' '}
              <a
                href="https://aws.amazon.com/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 font-medium"
              >
                AWS Privacy Notice
              </a>
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Analytics</h3>
            <p className="text-gray-700 leading-relaxed">
              We may use analytics services to understand how users interact with the Service. These services
              may collect information such as pages visited, time spent, and user actions.
            </p>
          </section>

          {/* Data Sharing and Disclosure */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">5.1 With Other Users</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700 mb-4">
              <li>Your username and profile photo are visible to other users</li>
              <li>Judges can view submissions they're assigned to review</li>
              <li>Public submissions are viewable by all authenticated users</li>
              <li>Competition results and leaderboards display usernames and scores</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">5.2 Service Providers</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We share information with third-party service providers who perform services on our behalf
              (payment processing, video hosting, email delivery). These providers are contractually obligated
              to protect your information.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">5.3 Legal Requirements</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We may disclose information if required by law, legal process, or governmental request, or to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700 mb-4">
              <li>Comply with legal obligations</li>
              <li>Protect our rights, property, or safety</li>
              <li>Investigate fraud or security issues</li>
              <li>Enforce our Terms of Service</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">5.4 Business Transfers</h3>
            <p className="text-gray-700 leading-relaxed">
              If Seedling is involved in a merger, acquisition, or sale of assets, your information may be
              transferred. We will notify you before your information is transferred and becomes subject to
              a different privacy policy.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We implement appropriate technical and organizational security measures to protect your information:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700 mb-4">
              <li>Passwords are hashed using industry-standard algorithms</li>
              <li>Data is encrypted in transit using HTTPS/TLS</li>
              <li>Database access is restricted and monitored</li>
              <li>Video files are stored with access controls</li>
              <li>Payment processing is handled by PCI-compliant providers</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              However, no method of transmission or storage is 100% secure. While we strive to protect your
              information, we cannot guarantee absolute security.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We retain your information for as long as necessary to provide the Service and fulfill the
              purposes described in this policy. Specifically:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700 mb-4">
              <li>Account information: Until you delete your account, plus 30 days</li>
              <li>Financial records: 7 years (required for tax and legal compliance)</li>
              <li>Video submissions: Until you delete them, or until the competition ends plus 1 year</li>
              <li>Usage logs: 90 days</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Even after deletion, some information may be retained in backup systems for disaster recovery
              purposes for up to 90 days.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Your Rights</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700 mb-4">
              <li><strong>Access:</strong> Request a copy of your personal information</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
              <li><strong>Restriction:</strong> Request that we limit processing of your information</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              To exercise these rights, contact us at hello@tryseedling.live. We will respond within 30 days.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Cookies and Tracking</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use cookies and similar tracking technologies to maintain user sessions and improve the Service:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700 mb-4">
              <li><strong>Authentication cookies:</strong> Keep you logged in</li>
              <li><strong>Preference cookies:</strong> Remember your settings</li>
              <li><strong>Analytics cookies:</strong> Understand how you use the Service</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              You can control cookies through your browser settings, but disabling cookies may limit
              functionality of the Service.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              The Service is not intended for users under 18 years of age. We do not knowingly collect
              personal information from children. If you become aware that a child has provided us with
              personal information, please contact us, and we will delete it.
            </p>
          </section>

          {/* International Users */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. International Users</h2>
            <p className="text-gray-700 leading-relaxed">
              The Service is operated in the United States. If you access the Service from outside the US,
              your information may be transferred to, stored, and processed in the US where data protection
              laws may differ from your jurisdiction. By using the Service, you consent to this transfer.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. We will notify you of material changes by:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700 mb-4">
              <li>Posting the new policy on this page</li>
              <li>Updating the "Last updated" date</li>
              <li>Sending an email notification (for significant changes)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Your continued use of the Service after changes become effective constitutes acceptance of
              the updated policy.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices,
              please contact us:
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Email:</strong>{' '}
              <a href="mailto:hello@tryseedling.live" className="text-brand-600 hover:text-brand-700 font-medium">
                hello@tryseedling.live
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
