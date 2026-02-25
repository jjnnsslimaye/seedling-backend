/**
 * About Seedling Page
 */

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About Seedling</h1>
          <p className="text-xl text-gray-600">
            Where founders pitch, judges score, and winners get paid
          </p>
        </div>

        {/* Mission Section */}
        <div className="bg-white rounded-2xl shadow-card p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Seedling connects ambitious founders with experienced judges in competitive pitch competitions.
            We believe the best ideas deserve to be heard, evaluated fairly, and rewarded properly.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Our platform removes the barriers between great ideas and the recognition they deserve. Whether
            you're a founder looking to validate your concept or a judge helping shape the future, Seedling
            provides the infrastructure to make it happen.
          </p>
        </div>

        {/* How It Works Section */}
        <div className="bg-white rounded-2xl shadow-card p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-brand-600">1</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Founders Submit</h3>
                <p className="text-gray-700 leading-relaxed">
                  Browse active competitions, pay an entry fee, and submit your pitch video. Your entry
                  goes directly into the competition prize pool.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-brand-600">2</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Judges Score</h3>
                <p className="text-gray-700 leading-relaxed">
                  Expert judges review submissions against competition criteria, providing detailed scores
                  and feedback on each pitch.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-brand-600">3</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Winners Get Paid</h3>
                <p className="text-gray-700 leading-relaxed">
                  Top-scoring submissions win prize money from the pool, paid out instantly via Stripe.
                  Fast, secure, and transparent.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Why We Built This Section */}
        <div className="bg-white rounded-2xl shadow-card p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Why We Built This</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Traditional pitch competitions are time-consuming, expensive to organize, and often opaque in
            their judging process. We've seen too many great founders miss opportunities because of logistical
            barriers, and too many judges struggle with inefficient evaluation workflows.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Seedling was born from the belief that competition infrastructure shouldn't be the hard part.
            By handling payments, video hosting, judge assignments, and scoring automatically, we let
            organizers focus on what matters: bringing together great founders and insightful judges.
          </p>
          <p className="text-gray-700 leading-relaxed">
            We're building the platform we wish existed when we were organizing our own pitch events.
            Simple, transparent, and built for scale.
          </p>
        </div>
      </div>
    </div>
  );
}
