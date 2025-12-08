/**
 * API route to serve tax configuration
 */

import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET(_req) {
    // Read the tax configuration file
    const configPath = new URL("../../config/tax_brackets.json", import.meta.url);
    
    try {
      const configText = Deno.readTextFileSync(configPath);
      const config = JSON.parse(configText);
      
      return new Response(JSON.stringify(config), {
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
