/**
 * SettingsIsland - App-wide settings, currently just the active country
 * (tax brackets + retirement-account rules). Changing it re-fetches
 * /api/tax-config for the new country (handled by MainIsland).
 */

import type { SimulationConfiguration } from "../types/financial.ts";
import type { CountryCode } from "../types/country_module.ts";
import { getCountryModule } from "../lib/tax_modules/index.ts";

interface SettingsIslandProps {
  config: SimulationConfiguration;
  onConfigChange: (config: SimulationConfiguration) => void;
}

const COUNTRY_OPTIONS: {
  code: CountryCode;
  description: string;
}[] = [
  {
    code: "AU",
    description:
      "Progressive tax brackets + Medicare levy. Superannuation is hard-locked until preservation age (60) - no early access.",
  },
  {
    code: "US",
    description:
      "Federal tax brackets (standard deduction applied first; state tax and FICA are not modeled). 401k / IRA can be withdrawn early, minus a 10% penalty, before age 59.5.",
  },
];

export default function SettingsIsland(
  { config, onConfigChange }: SettingsIslandProps,
) {
  const activeCountry: CountryCode = config.baseParameters.country ?? "AU";

  const selectCountry = (code: CountryCode) => {
    if (code === activeCountry) return;
    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        country: code,
      },
    });
  };

  return (
    <div class="card p-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <svg
          class="w-7 h-7 mr-3 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Settings
      </h2>

      <div class="mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-1">Country</h3>
        <p class="text-sm text-gray-600 mb-4">
          Sets which tax brackets and retirement-account rules the simulation
          uses. Changing this updates labels (e.g. "Superannuation" vs "401k
          / IRA") and re-runs the simulation with the new country's rules.
        </p>

        <div class="space-y-3">
          {COUNTRY_OPTIONS.map((option) => {
            const module = getCountryModule(option.code);
            const isActive = option.code === activeCountry;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => selectCountry(option.code)}
                class={`w-full text-left p-4 rounded-lg border transition-colors ${
                  isActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="font-semibold text-gray-900">
                    {module.label}
                  </span>
                  {isActive && (
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Active
                    </span>
                  )}
                </div>
                <p class="text-xs text-gray-500 mb-2">{option.description}</p>
                <p class="text-xs text-gray-600">
                  Retirement account: <strong>{module.retirementAccountLabel}</strong>{" "}
                  (accessible from age {module.retirementAccessRule.accessAge})
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
