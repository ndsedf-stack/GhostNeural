/**
 * Page Scanners for GHOSTNEURAL V2
 * Supports Quick Filtering (Gatekeeper) and Deep Autopsy.
 */

/**
 * L'Éclaireur Express (Scan de 5 secondes)
 * But: Récupérer titre, secteur, et TTFB pour filtrage radical.
 */
export async function scanQuick(url: string) {
  console.log(`[Scanner Quick] 🚀 Starting scan for: ${url}`);
  
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }

  // 1. PLAYWRIGHT ATTEMPT
  try {
    console.log(`[Scanner Quick] 🎭 Attempting Playwright...`);
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const startTime = Date.now();
    
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
      const ttfb = Date.now() - startTime;
      const data = await page.evaluate(() => ({
        title: document.title,
        h1: document.querySelector('h1')?.innerText || "",
        meta_desc: document.querySelector('meta[name="description"]')?.getAttribute('content') || "",
        status: 200,
        cta_count: document.querySelectorAll('button, a.btn, a.cta, a[role="button"]').length,
        cta_primary_present: true 
      }));
      await browser.close();
      console.log(`[Scanner Quick] 🎭 Playwright Success for ${url}`);
      return { ...data, ttfb };
    } catch (e: any) {
      console.warn(`[Scanner Quick] ⚠️ Playwright failed: ${e.message}. Switching to Cheerio...`);
      await browser.close();
    }
  } catch (e: any) {
    console.warn(`[Scanner Quick] ❌ Playwright launch error: ${e.message}`);
  }

  // 2. CHEERIO FALLBACK (Ultra-Robust)
  try {
    console.log(`[Scanner Quick] 🥣 Attempting Cheerio fallback for: ${url}`);
    const axios = (await import("axios")).default;
    const cheerio = await import("cheerio");
    const startTime = Date.now();
    const response = await axios.get(url, { 
      timeout: 5000, 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } 
    });
    const ttfb = Date.now() - startTime;
    const $ = cheerio.load(response.data);

    console.log(`[Scanner Quick] 🥣 Cheerio Success for ${url}`);
    return {
      title: $('title').text() || "",
      h1: $('h1').first().text() || "",
      meta_desc: $('meta[name="description"]').attr('content') || "",
      status: response.status,
      cta_count: $('a, button').length / 10, 
      cta_primary_present: true,
      ttfb,
      fallback: true
    };
  } catch (e: any) {
    console.error(`[Scanner Quick] 💀 TOTAL FAILURE for ${url}:`, e.message);
    throw new Error(`Scanner Quick Failed: ${e.message}`);
  }
}

/**
 * L'Autopsie Totale (Audit Ultra-Complet)
 * But: Extraction structurelle, visuelle et technique exhaustive.
 */
export async function scanFullSite(url: string) {
  console.log(`[Scanner Full] Starting deep scan for: ${url}`);
  
  // Build-time guard
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[Scanner Guard] Skipping Playwright during build phase.');
    return null;
  }

  try {
    const { chromium } = await import("playwright");
    
    console.log(`[Scanner Full] Launching browser...`);
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
    } catch (launchError: any) {
      console.error("[Scanner Full] Browser launch error:", launchError.message);
      return null;
    }

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 GhostNeuralBot/1.0'
    });
    const page = await context.newPage();

    // 1. Navigation & Basic Data
    console.log(`[Scanner Full] Navigating to ${url} (waitUntil: load)...`);
    try {
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
    } catch (gotoError: any) {
      console.warn(`[Scanner Full] Navigation timeout or error for ${url}:`, gotoError.message);
      // On tente quand même de continuer si on a au moins le HTML de base
    }

    // 2. Sitemap & Robots.txt Discovery (en parallèle)
    console.log(`[Scanner Full] Checking sitemap & robots.txt...`);
    const baseUrl = new URL(url).origin;
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    const robotsUrl = `${baseUrl}/robots.txt`;
    
    const [sitemapRes, robotsRes] = await Promise.all([
      fetch(sitemapUrl).then(r => r.status === 200 ? "Présent" : "Absent").catch(() => "Erreur"),
      fetch(robotsUrl).then(r => r.status === 200 ? "Présent" : "Absent").catch(() => "Erreur")
    ]);

    // 3. Deep Evaluate
    console.log(`[Scanner Full] Extracting page analysis...`);
    const analysis = await page.evaluate(() => {
      // Helper for visibility
      const isVisible = (el: HTMLElement) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

      // Links Extraction
      const links = Array.from(document.querySelectorAll('a'))
        .map(a => a.href)
        .filter(l => { 
          try { 
            const urlObj = new URL(l);
            return urlObj.origin === window.location.origin; 
          } catch(e) { return false; } 
        });
      
      // CTA Detection
      const ctas = Array.from(document.querySelectorAll('button, a.btn, a.cta, a[role="button"], .button, .cta'))
        .filter(el => isVisible(el as HTMLElement))
        .map(el => (el as HTMLElement).innerText.trim())
        .filter(txt => txt.length > 2 && txt.length < 40);

      // Contact Detection (Regex)
      const bodyText = document.body.innerText;
      const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const phoneMatch = bodyText.match(/(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/); // FR focus
      
      // Form Detection
      const hasForm = document.querySelectorAll('form').length > 0 || bodyText.toLowerCase().includes('formulaire');

      // CMS Detection
      const generator = document.querySelector('meta[name="generator"]')?.getAttribute('content')?.toLowerCase() || "";
      let cms = "custom";
      if (generator.includes('wordpress') || document.querySelector('link[href*="wp-content"]')) cms = "WordPress";
      else if (generator.includes('shopify') || bodyText.includes('shopify')) cms = "Shopify";
      else if (generator.includes('wix')) cms = "Wix";
      else if (generator.includes('squarespace')) cms = "Squarespace";
      else if (generator.includes('webflow')) cms = "Webflow";
      else if (generator.includes('prestashop')) cms = "PrestaShop";

      // Credibility Signals
      const hasReviews = bodyText.toLowerCase().includes('avis') || bodyText.toLowerCase().includes('trustpilot') || !!document.querySelector('.stars, .rating');
      const hasLegal = bodyText.toLowerCase().includes('mentions légales') || bodyText.toLowerCase().includes('politique de confidentialité');

      const allElements = Array.from(document.querySelectorAll('*')).slice(0, 400);
      const fonts = [...new Set(allElements.map(el => getComputedStyle(el).fontFamily))].slice(0, 5);
      const colors = [...new Set(allElements.map(el => getComputedStyle(el).color))].slice(0, 8);

      return {
        h1: document.querySelector('h1')?.innerText || "Manquant",
        meta_title: document.title,
        meta_description: document.querySelector('meta[name="description"]')?.getAttribute('content') || "Manquante",
        cta_count: ctas.length,
        cta_principal: ctas[0] || null,
        inner_links: [...new Set(links)].slice(0, 20),
        design_tokens: { fonts, colors },
        email_visible: emailMatch ? emailMatch[0] : null,
        phone_visible: phoneMatch ? phoneMatch[0] : null,
        formulaire_present: hasForm,
        cms_detecte: cms,
        avis_clients: hasReviews,
        mentions_legales_presentes: hasLegal,
        html_sample: bodyText.substring(0, 8000)
      };
    });

    // 4. Screenshots
    console.log(`[Scanner Full] Capturing screenshots...`);
    const desktopBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
    const desktopBase64 = desktopBuffer.toString('base64');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);
    const mobileBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
    const mobileBase64 = mobileBuffer.toString('base64');

    console.log(`[Scanner Full] Scan complete for ${url}`);
    await browser.close();

    return {
      ...analysis,
      https: url.startsWith('https://'),
      sitemap_present: sitemapRes === "Présent",
      robots_present: robotsRes === "Présent",
      screenshot_desktop: `data:image/jpeg;base64,${desktopBase64}`,
      screenshot_mobile: `data:image/jpeg;base64,${mobileBase64}`,
      // Compatibility
      screenshot_url: desktopBase64,
      mobile_screenshot: mobileBase64
    };
  } catch (error: any) {
    console.error("[Scanner Full] Playwright failed, falling back to Cheerio:", error.message);
    
    // 2. CHEERIO FALLBACK FOR FULL SCAN (Degraded mode)
    try {
      const axios = (await import("axios")).default;
      const cheerio = await import("cheerio");
      const resp = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(resp.data);
      
      return {
        h1: $('h1').first().text() || "Inconnu (Fallback)",
        meta_title: $('title').text() || "",
        meta_description: $('meta[name="description"]').attr('content') || "",
        cta_count: $('a, button').length / 10,
        cta_principal: "Contact",
        inner_links: [],
        design_tokens: { fonts: [], colors: [] },
        email_visible: null,
        phone_visible: null,
        formulaire_present: resp.data.includes('<form'),
        cms_detecte: "Inconnu",
        avis_clients: false,
        mentions_legales_presentes: false,
        html_sample: resp.data.substring(0, 5000),
        https: url.startsWith('https://'),
        fallback_active: true
      };
    } catch (e2: any) {
      console.error("[Scanner Full] Total death for ${url}:", e2.message);
      return null;
    }
  }
}

// Keep original scanPage for backward compatibility if needed, 
// but we'll migrate the orchestrator soon.
export const scanPage = scanFullSite;
