/**
 * API route to serve tax configuration
 */

import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET(req) {
    // Read the tax configuration file
    const configPath = new URL("../../config/tax_brackets.json", import.meta.url);
    
    try {
      const configText = Deno.readTextFileSync(configPath);
      const config = JSON.parse(configText);
      
      // Get the requested year from query params, or use default
      const url = new URL(req.url);
      const requestedYear = url.searchParams.get("year") || config.defaultYear;
      
      // Get the tax data for the requested year
      const yearData = config.years[requestedYear];
      
      if (!yearData) {
        return new Response(
          JSON.stringify({ 
            error: `Tax year ${requestedYear} not found`,
            availableYears: Object.keys(config.years)
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
      // Return the tax config for the requested year
      const response = {
        country: config.country,
        taxYear: requestedYear,
        description: config.description,
        brackets: yearData.brackets,
        medicareLevy: yearData.medicareLevy,
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
        }
      );
    }
  },
};
