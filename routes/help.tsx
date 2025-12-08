/**
 * Help page route - Explains how the Finance Simulation Tool works
 */

export default function Help() {
  return (
    <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header class="bg-white shadow-sm sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <svg class="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">
                  How It Works
                </h1>
                <p class="mt-1 text-xs sm:text-sm text-gray-600">
                  Understanding the Finance Simulation Tool
                </p>
              </div>
            </div>
            <a href="/" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
              ← Back to Tool
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="bg-white rounded-lg shadow-lg p-6 sm:p-8 space-y-8">
          
          {/* Overview */}
          <section>
            <h2 class="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
            <p class="text-gray-700 leading-relaxed">
              The Finance Simulation Tool helps you model your financial future by simulating income, expenses, 
              investments, and taxes over time. It's designed to help you plan for retirement, understand your 
              cash flow, and make informed financial decisions.
            </p>
          </section>

          {/* Key Concepts */}
          <section>
            <h2 class="text-2xl font-bold text-gray-900 mb-4">Key Concepts</h2>
            
            <div class="space-y-4">
              <div class="border-l-4 border-blue-500 pl-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Income Streams</h3>
                <p class="text-gray-700">
                  Define your sources of income including salary, investments, pensions, and social security. 
                  Each stream can have its own start date, end date, and growth rate.
                </p>
              </div>

              <div class="border-l-4 border-green-500 pl-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Expenses</h3>
                <p class="text-gray-700">
                  Track your spending with recurring expenses (monthly, yearly) and one-time expenses. 
                  Expenses can be set to grow with inflation or at custom rates.
                </p>
              </div>

              <div class="border-l-4 border-purple-500 pl-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Tax Calculation</h3>
                <p class="text-gray-700">
                  The tool calculates taxes using tiered tax brackets. You can configure federal and state 
                  tax rates, standard deductions, and tax-advantaged account contributions.
                </p>
              </div>

              <div class="border-l-4 border-orange-500 pl-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Net Worth Tracking</h3>
                <p class="text-gray-700">
                  Your net worth grows based on savings (income minus expenses and taxes) and investment returns. 
                  The simulation shows how your wealth evolves over time.
                </p>
              </div>
            </div>
          </section>

          {/* How to Use */}
          <section>
            <h2 class="text-2xl font-bold text-gray-900 mb-4">How to Use</h2>
            
            <div class="space-y-6">
              <div>
                <div class="flex items-center mb-2">
                  <span class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold mr-3">1</span>
                  <h3 class="text-lg font-semibold text-gray-900">Set Your Parameters</h3>
                </div>
                <p class="text-gray-700 ml-11">
                  Start by entering your current age, retirement age, and life expectancy. Set your initial 
                  net worth and expected investment return rate.
                </p>
              </div>

              <div>
                <div class="flex items-center mb-2">
                  <span class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold mr-3">2</span>
                  <h3 class="text-lg font-semibold text-gray-900">Add Income Sources</h3>
                </div>
                <p class="text-gray-700 ml-11">
                  Define all your income streams. For each one, specify the amount, frequency, start/end dates, 
                  and whether it grows over time. Common examples include salary, rental income, and retirement benefits.
                </p>
              </div>

              <div>
                <div class="flex items-center mb-2">
                  <span class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold mr-3">3</span>
                  <h3 class="text-lg font-semibold text-gray-900">Add Expenses</h3>
                </div>
                <p class="text-gray-700 ml-11">
                  Enter your regular expenses (housing, food, utilities) and any one-time expenses (car purchase, 
                  home renovation). You can set different expense levels for pre-retirement and post-retirement.
                </p>
              </div>

              <div>
                <div class="flex items-center mb-2">
                  <span class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold mr-3">4</span>
                  <h3 class="text-lg font-semibold text-gray-900">Configure Taxes</h3>
                </div>
                <p class="text-gray-700 ml-11">
                  Set up your tax brackets and deductions. The tool supports multiple tax tiers and can account 
                  for 401(k) contributions and other pre-tax deductions.
                </p>
              </div>

              <div>
                <div class="flex items-center mb-2">
                  <span class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold mr-3">5</span>
                  <h3 class="text-lg font-semibold text-gray-900">Run the Simulation</h3>
                </div>
                <p class="text-gray-700 ml-11">
                  Click "Run Simulation" to see your financial projection. The tool will calculate year-by-year 
                  results showing income, expenses, taxes, savings, and net worth.
                </p>
              </div>

              <div>
                <div class="flex items-center mb-2">
                  <span class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold mr-3">6</span>
                  <h3 class="text-lg font-semibold text-gray-900">Analyze Results</h3>
                </div>
                <p class="text-gray-700 ml-11">
                  Review the charts and tables to understand your financial trajectory. Look for years where 
                  you might run out of money or where you have excess savings. Adjust your inputs to explore 
                  different scenarios.
                </p>
              </div>
            </div>
          </section>

          {/* Features */}
          <section>
            <h2 class="text-2xl font-bold text-gray-900 mb-4">Key Features</h2>
            
            <div class="grid sm:grid-cols-2 gap-4">
              <div class="bg-blue-50 rounded-lg p-4">
                <h3 class="font-semibold text-gray-900 mb-2">📊 Visual Charts</h3>
                <p class="text-sm text-gray-700">
                  Interactive charts show your net worth and cash flow over time, making it easy to spot trends.
                </p>
              </div>

              <div class="bg-green-50 rounded-lg p-4">
                <h3 class="font-semibold text-gray-900 mb-2">💾 Save & Load</h3>
                <p class="text-sm text-gray-700">
                  Save your scenarios locally and load them later to compare different financial strategies.
                </p>
              </div>

              <div class="bg-purple-50 rounded-lg p-4">
                <h3 class="font-semibold text-gray-900 mb-2">🔄 Scenario Comparison</h3>
                <p class="text-sm text-gray-700">
                  Compare multiple scenarios side-by-side to see how different decisions impact your future.
                </p>
              </div>

              <div class="bg-orange-50 rounded-lg p-4">
                <h3 class="font-semibold text-gray-900 mb-2">📈 Growth Modeling</h3>
                <p class="text-sm text-gray-700">
                  Model inflation, salary increases, and investment returns to create realistic projections.
                </p>
              </div>

              <div class="bg-red-50 rounded-lg p-4">
                <h3 class="font-semibold text-gray-900 mb-2">💰 Tax Planning</h3>
                <p class="text-sm text-gray-700">
                  Understand your tax burden with detailed calculations including deductions and brackets.
                </p>
              </div>

              <div class="bg-indigo-50 rounded-lg p-4">
                <h3 class="font-semibold text-gray-900 mb-2">📱 Responsive Design</h3>
                <p class="text-sm text-gray-700">
                  Works on desktop, tablet, and mobile devices so you can plan anywhere.
                </p>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section>
            <h2 class="text-2xl font-bold text-gray-900 mb-4">Tips for Best Results</h2>
            
            <ul class="space-y-3">
              <li class="flex items-start">
                <span class="text-blue-600 mr-2">•</span>
                <span class="text-gray-700">
                  <strong>Be realistic:</strong> Use conservative estimates for investment returns (5-7% is typical) 
                  and don't forget about inflation (2-3% historically).
                </span>
              </li>
              <li class="flex items-start">
                <span class="text-blue-600 mr-2">•</span>
                <span class="text-gray-700">
                  <strong>Include everything:</strong> Don't forget irregular expenses like car replacements, 
                  home repairs, and medical costs.
                </span>
              </li>
              <li class="flex items-start">
                <span class="text-blue-600 mr-2">•</span>
                <span class="text-gray-700">
                  <strong>Plan for longevity:</strong> Consider living longer than you expect. Running out of 
                  money at 95 is better than at 85.
                </span>
              </li>
              <li class="flex items-start">
                <span class="text-blue-600 mr-2">•</span>
                <span class="text-gray-700">
                  <strong>Test scenarios:</strong> Create multiple scenarios (optimistic, realistic, pessimistic) 
                  to understand the range of possible outcomes.
                </span>
              </li>
              <li class="flex items-start">
                <span class="text-blue-600 mr-2">•</span>
                <span class="text-gray-700">
                  <strong>Update regularly:</strong> Revisit your simulation annually or when major life changes 
                  occur (job change, marriage, kids, etc.).
                </span>
              </li>
            </ul>
          </section>

          {/* Disclaimer */}
          <section class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-3">⚠️ Important Disclaimer</h2>
            <p class="text-gray-700 text-sm leading-relaxed">
              This tool is for educational and planning purposes only. It does not constitute financial advice. 
              The projections are based on assumptions and simplified models that may not reflect real-world 
              complexity. For personalized financial advice, please consult with a qualified financial advisor.
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer class="bg-white border-t border-gray-200 mt-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p class="text-center text-xs sm:text-sm text-gray-500">
            Finance Simulation Tool - Plan your financial future with confidence
          </p>
        </div>
      </footer>
    </div>
  );
}
