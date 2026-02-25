'use client';

/**
 * Contact Page
 */

import { useState } from 'react';
import { Button, Input, Alert } from '@/components/ui';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No backend - just show success message
    setSubmitted(true);
    // Reset form after 3 seconds
    setTimeout(() => {
      setFormData({ name: '', email: '', subject: '', message: '' });
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Get in Touch</h1>
          <p className="text-xl text-gray-600">
            Have questions? We'd love to hear from you.
          </p>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl shadow-card p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Email</h3>
                <a
                  href="mailto:hello@tryseedling.live"
                  className="text-brand-600 hover:text-brand-700 font-medium"
                >
                  hello@tryseedling.live
                </a>
                <p className="text-sm text-gray-600 mt-1">
                  We typically respond within 24 hours
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Response Time</h3>
                <p className="text-gray-700">
                  Monday - Friday: 9am - 6pm EST
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Weekend inquiries will be answered on the next business day
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl shadow-card p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Us a Message</h2>

          {submitted && (
            <Alert variant="success" className="mb-6">
              Thank you for your message! We'll get back to you soon.
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <Input
                id="subject"
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="What's this about?"
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Tell us more..."
                required
                rows={6}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 resize-none"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full">
              Send Message
            </Button>
          </form>

          <p className="mt-6 text-sm text-gray-600 text-center">
            By submitting this form, you agree to our{' '}
            <a href="/privacy" className="text-brand-600 hover:text-brand-700 font-medium">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
