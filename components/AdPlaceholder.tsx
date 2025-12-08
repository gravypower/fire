/**
 * AdPlaceholder - Monetization component for displaying ads or premium features
 * Can be easily replaced with actual ad network integration
 */

interface AdPlaceholderProps {
  variant?: "premium" | "sponsor" | "banner";
  size?: "small" | "medium" | "large";
}

export default function AdPlaceholder({ 
  variant = "premium",
  size = "medium" 
}: AdPlaceholderProps) {
  
  if (variant === "premium") {
    return (
      <div class="card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300">
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            Premium Features
          </h3>
          <p class="text-sm text-gray-600 mb-4">
            Upgrade to unlock advanced financial planning tools and personalized insights
          </p>
          <button class="btn-primary text-sm px-6 py-2">
            Learn More
          </button>
          <p class="text-xs text-gray-500 mt-3">
            Ad Space Available
          </p>
        </div>
      </div>
    );
  }

  if (variant === "sponsor") {
    return (
      <div class="card p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-dashed border-green-300">
        <div class="text-center">
          <p class="text-xs text-gray-500 mb-2">SPONSORED</p>
          <div class="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 class="text-sm font-semibold text-gray-800 mb-1">
            Partner Offer
          </h4>
          <p class="text-xs text-gray-600 mb-3">
            Special financial services for our users
          </p>
          <button class="text-xs text-green-600 hover:text-green-700 font-medium">
            View Offer →
          </button>
        </div>
      </div>
    );
  }

  // Banner variant
  return (
    <div class="card p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-dashed border-purple-300">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
            <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800">Advertisement</p>
            <p class="text-xs text-gray-600">Banner ad space</p>
          </div>
        </div>
        <button class="text-xs text-purple-600 hover:text-purple-700 font-medium px-3 py-1 border border-purple-300 rounded">
          Learn More
        </button>
      </div>
    </div>
  );
}
