/**
 * Terms of Service Page
 */

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-lg text-gray-600">
            Last updated: February 24, 2026
          </p>
        </div>

        {/* Terms Content */}
        <div className="bg-white rounded-2xl shadow-card p-8 space-y-8">

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              By accessing or using Seedling ("the Service"), you agree to be bound by these Terms of Service
              ("Terms"). If you disagree with any part of these terms, you may not access the Service.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Seedling is operated by Seedling ("Company", "we", "us", or "our"). These Terms govern your
              use of our website and platform for pitch competitions, video submissions, judging, and prize
              distribution.
            </p>
          </section>

          {/* Use of Service */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Use of Service</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>2.1 Eligibility.</strong> You must be at least 18 years old to use this Service. By
              using the Service, you represent and warrant that you are at least 18 years of age.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>2.2 Account Registration.</strong> You must provide accurate, complete, and current
              information during registration. You are responsible for safeguarding your account password
              and for any activities or actions under your account.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>2.3 Acceptable Use.</strong> You agree not to use the Service to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon intellectual property rights of others</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Impersonate any person or entity</li>
              <li>Manipulate or interfere with competition results or judging</li>
              <li>Use automated systems to access or scrape the Service</li>
            </ul>
          </section>

          {/* Payments and Fees */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Payments and Fees</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>3.1 Entry Fees.</strong> Competition entry fees are non-refundable once submitted.
              Entry fees contribute to the competition prize pool, minus platform fees.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>3.2 Platform Fees.</strong> Seedling charges a platform fee (percentage-based) on
              each competition entry to maintain and operate the Service. This fee is disclosed at the time
              of entry.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>3.3 Prize Payouts.</strong> Winners receive prize payouts via Stripe. You must connect
              a valid Stripe account to receive winnings. Processing times depend on Stripe and your financial
              institution.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>3.4 Payment Processing.</strong> All payments are processed through Stripe. You agree
              to Stripe's Terms of Service and Privacy Policy. We are not responsible for Stripe processing
              errors or delays.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>3.5 Taxes.</strong> You are responsible for all applicable taxes related to entry fees
              paid or prizes received through the Service.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Intellectual Property</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>4.1 Your Content.</strong> You retain ownership of all content you submit, including
              pitch videos and materials. By submitting content, you grant Seedling a non-exclusive, worldwide,
              royalty-free license to host, store, display, and process your content for purposes of operating
              the Service.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>4.2 Public Submissions.</strong> If you mark a submission as "public," you grant other
              users the right to view that submission. You may change visibility settings at any time.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>4.3 Platform Content.</strong> The Service, including its design, features, text,
              graphics, and software, is owned by Seedling and protected by copyright, trademark, and other
              intellectual property laws.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>4.4 Prohibited Content.</strong> You may not submit content that infringes on third-party
              intellectual property rights, contains confidential information you're not authorized to share,
              or violates any laws.
            </p>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. User Accounts and Roles</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>5.1 Account Types.</strong> Seedling offers different account roles: Founder, Judge,
              and Admin. Each role has specific permissions and responsibilities.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>5.2 Judges.</strong> If you serve as a judge, you agree to evaluate submissions fairly,
              provide honest feedback, and maintain confidentiality of non-public submissions.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>5.3 Account Suspension.</strong> We reserve the right to suspend or terminate accounts
              that violate these Terms, engage in fraudulent activity, or otherwise misuse the Service.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>5.4 Data Retention.</strong> Upon account deletion, we retain certain data as required
              by law or for legitimate business purposes (financial records, dispute resolution).
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>6.1 Service Availability.</strong> The Service is provided "as is" without warranties
              of any kind. We do not guarantee uninterrupted, secure, or error-free operation.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>6.2 Competition Results.</strong> While we strive for fair judging processes, we are
              not responsible for judging decisions, score discrepancies, or disputes between users. Competition
              results are final once announced.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>6.3 Third-Party Services.</strong> We are not liable for issues arising from third-party
              services such as Stripe payment processing, AWS S3 video hosting, or user internet connectivity.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>6.4 Maximum Liability.</strong> To the maximum extent permitted by law, Seedling's total
              liability for any claims arising from or related to the Service shall not exceed the amount you
              paid to Seedling in the six months preceding the claim.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>6.5 Exclusions.</strong> Some jurisdictions do not allow certain liability exclusions.
              In such jurisdictions, our liability is limited to the greatest extent permitted by law.
            </p>
          </section>

          {/* Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Dispute Resolution</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>7.1 Informal Resolution.</strong> Before filing a claim, you agree to contact us at
              hello@tryseedling.live to attempt informal resolution of any disputes.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>7.2 Arbitration.</strong> Any disputes not resolved informally shall be resolved through
              binding arbitration in accordance with the American Arbitration Association's rules.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>7.3 Class Action Waiver.</strong> You agree to bring claims only in your individual
              capacity and not as part of any class or representative action.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the State of
              Delaware, United States, without regard to its conflict of law provisions.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Any legal action or proceeding arising under these Terms will be brought exclusively in the
              federal or state courts located in Delaware.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of material changes
              via email or through the Service. Continued use of the Service after changes constitutes acceptance
              of the modified Terms.
            </p>
            <p className="text-gray-700 leading-relaxed">
              It is your responsibility to review these Terms periodically for updates.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              <strong>Email:</strong>{' '}
              <a href="mailto:hello@tryseedling.live" className="text-brand-600 hover:text-brand-700">
                hello@tryseedling.live
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
