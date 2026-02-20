'use client';

/**
 * Epic Landing Page - Home
 */

import Link from 'next/link';
import Image from 'next/image';
import Lottie from 'lottie-react';
import seedlingAnimation from '@/public/seedling-animation.json';

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-50">

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* LEFT COLUMN - Content */}
            <div>
              {/* Main Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-8">
                <span className="block text-slate-900">Where Startups</span>
                <span className="block">
                  <span className="text-slate-900">Compete to </span>
                  <span className="text-brand-600">
                    Grow
                  </span>
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg md:text-xl text-slate-600 max-w-2xl mb-8">
                Submit your idea. Get judged by experts. Win funds to launch your startup.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/competitions">
                  <button className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-colors duration-200 w-full sm:w-auto">
                    Browse Competitions →
                  </button>
                </Link>
                <button
                  onClick={() => {
                    const howItWorks = document.getElementById('how-it-works');
                    howItWorks?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-white border-2 border-brand-600 text-brand-700 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-brand-50 transition-colors duration-200"
                >
                  How It Works
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN - Lottie Seedling Animation */}
            <div className="flex items-center justify-center">
              <Lottie
                animationData={seedlingAnimation}
                loop={true}
                autoplay={true}
                style={{ width: '100%', maxWidth: '500px', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section heading */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Three simple steps to funding your startup
            </p>
          </div>

          {/* Steps - Horizontal cards with connecting arrows */}
          <div className="relative">
            <div className="grid md:grid-cols-3 gap-8 relative">

              {/* Step 1 */}
              <div className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-card hover:shadow-card-hover hover:scale-[1.01] transition-all duration-300 h-full border border-slate-100 border-l-4 border-l-brand-600">

                  {/* Content */}
                  <h3 className="text-xl font-bold text-slate-700 mb-3">
                    1. Submit Your Idea
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Create your pitch and supporting materials. Entry fees fund the prize pool for competitions in your domain.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-card hover:shadow-card-hover hover:scale-[1.01] transition-all duration-300 h-full border border-slate-100 border-l-4 border-l-brand-600">

                  <h3 className="text-xl font-bold text-slate-700 mb-3">
                    2. Expert Judging
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Industry veterans review, rate, and provide feedback on your startup ideas.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-card hover:shadow-card-hover hover:scale-[1.01] transition-all duration-300 h-full border border-slate-100 border-l-4 border-l-brand-600">

                  <h3 className="text-xl font-bold text-slate-700 mb-3">
                    3. Win & Launch
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Top rated startups receive portions of the prize pool to help founders launch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="bg-gradient-to-r from-brand-600 to-brand-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Launch Your Startup?
          </h2>
          <p className="text-xl text-brand-100 mb-8 max-w-2xl mx-auto">
            Join thousands of founders competing for funding
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-brand-700 hover:bg-brand-50 px-10 py-4 rounded-xl text-lg font-semibold transition-colors duration-200"
          >
            Get Started
          </Link>
        </div>
      </section>

    </div>
  );
}
