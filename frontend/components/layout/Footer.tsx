/**
 * Footer component
 */

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Links */}
          <div className="flex justify-center space-x-6 mb-4">
            <Link
              href="/about"
              className="text-gray-300 hover:text-white text-sm transition-colors duration-200"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-gray-300 hover:text-white text-sm transition-colors duration-200"
            >
              Contact
            </Link>
            <Link
              href="/terms"
              className="text-gray-300 hover:text-white text-sm transition-colors duration-200"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-gray-300 hover:text-white text-sm transition-colors duration-200"
            >
              Privacy
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-gray-400 text-sm">
            © 2026 Seedling. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
