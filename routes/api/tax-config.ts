import { getCountryModule } from "../../lib/tax_modules/index.ts";
import type { CountryCode } from "../../types/country_module.ts";
import { Handlers } from "fresh/compat";

const CONFIG_FILES: Record<CountryCode, string> = {
  AU: "tax_brackets_au.json",
  US: "tax_brackets_us.json",
};

function isCountryCode(value: string): value is CountryCode {
  return value in CONFIG_FILES;
}

export const handler: Handlers = {
  GET(ctx) {
    const req = ctx.req;
    const url = new URL(req.url);
    const requestedCountry = url.searchParams.get("country")?.toUpperCase() ??
      "AU";
    const country: CountryCode = isCountryCode(requestedCountry)
      ? requestedCountry
      : "AU";

    const configPath = `${Deno.cwd()}/config/${CONFIG_FILES[country]}`;

    try {
      const configText = Deno.readTextFileSync(configPath);
      const config = JSON.parse(configText);

      // Get the requested year from query params, or use default
      const requestedYear = url.searchParams.get("year") || config.defaultYear;

      // Get the tax data for the requested year
      const yearData = config.years[requestedYear];

      if (!yearData) {
        return new Response(
          JSON.stringify({
            error: `Tax year ${requestedYear} not found for ${country}`,
            availableYears: Object.keys(config.years),
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const module = getCountryModule(country);

      // Return the tax config for the requested country/year
      const response = {
        country,
        countryLabel: config.country,
        taxYear: requestedYear,
        description: config.description,
        brackets: yearData.brackets,
        medicareLevy: yearData.medicareLevy,
        standardDeduction: yearData.standardDeduction,
        preservationAge: yearData.preservationAge ??
          yearData.retirementAccessAge ?? module.retirementAccessRule.accessAge,
        retirementAccountLabel: module.retirementAccountLabel,
        retirementAccountShortLabel: module.retirementAccountShortLabel,
        retirementAccessRule: module.retirementAccessRule,
        availableYears: Object.keys(config.years),
      };

      return new Response(JSON.stringify(response), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        },
      });
    } catch (error) {
      console.error("Failed to load tax config:", error);
      return new Response(
        JSON.stringify({ error: "Failed to load tax configuration" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
