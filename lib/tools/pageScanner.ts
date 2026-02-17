/**
 * Page Scanners for GHOSTNEURAL V2
 * Supports Quick Filtering (Gatekeeper) and Deep Autopsy.
 */

/**
 * L'Éclaireur Express (Scan de 5 secondes)
 * But: Récupérer titre, secteur, et TTFB pour filtrage radical.
 */
export async function scanQuick(url: string) {
  console.log(`[Scanner Quick] Scanning: ${url}`);
  
  // Build-time guard: Only block during the actual compilation phase
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[Scanner Guard] Skipping Playwright during build phase.');
    return null;
  }

  try {
    const { chromium } = await import("playwright");
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
    } catch (launchError: any) {
      console.error("[Scanner Quick] Browser launch error:", launchError.message);
      return null;
    }

    const page = await browser.newPage();
    const startTime = Date.now();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
    } catch (gotoError: any) {
      console.warn(`[Scanner Quick] Timeout for ${url}`);
      await browser.close();
      return null;
    }

    const ttfb = Date.now() - startTime;
    const data = await page.evaluate(() => {
      return {
        title: document.title,
        h1: document.querySelector('h1')?.innerText || "",
        meta_desc: document.querySelector('meta[name="description"]')?.getAttribute('content') || "",
        status: 200
      };
    });

    await browser.close();
    return { ...data, ttfb };
  } catch (e: any) {
    console.error("[Scanner Quick] Unexpected Error:", e.message);
    return null;
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
      const links = Array.from(document.querySelectorAll('a'))
        .map(a => a.href)
        .filter(l => { 
          try { 
            const urlObj = new URL(l);
            return urlObj.origin === window.location.origin; 
          } catch(e) { return false; } 
        });
      
      const allElements = Array.from(document.querySelectorAll('*')).slice(0, 400);
      const fonts = [...new Set(allElements.map(el => getComputedStyle(el).fontFamily))].slice(0, 5);
      const colors = [...new Set(allElements.map(el => getComputedStyle(el).color))].slice(0, 8);

      return {
        h1: document.querySelector('h1')?.innerText || "Manquant",
        meta_title: document.title,
        meta_description: document.querySelector('meta[name="description"]')?.getAttribute('content') || "Manquante",
        cta_count: document.querySelectorAll('button, a.btn, a.cta, a[role="button"]').length,
        inner_links: [...new Set(links)].slice(0, 20),
        design_tokens: { fonts, colors },
        html_sample: document.body.innerText.substring(0, 8000)
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
      sitemap_present: sitemapRes === "Présent",
      robots_present: robotsRes === "Présent",
      screenshot_desktop: `data:image/jpeg;base64,${desktopBase64}`,
      screenshot_mobile: `data:image/jpeg;base64,${mobileBase64}`,
      // Compatibility
      screenshot_url: desktopBase64,
      mobile_screenshot: mobileBase64
    };
  } catch (error: any) {
    console.error("[Scanner Full] Unexpected Error:", error.message);
    return null;
  }
}

// Keep original scanPage for backward compatibility if needed, 
// but we'll migrate the orchestrator soon.
export const scanPage = scanFullSite;
