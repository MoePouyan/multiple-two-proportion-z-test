/// <reference types="vite/client" />
/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */

// Umami analytics (cookieless). Loaded by the script tag in index.html.
interface Window {
  umami?: { track: (name: string, data?: Record<string, unknown>) => void };
}
