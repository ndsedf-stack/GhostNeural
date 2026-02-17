/**
 * Page Scanners for GHOSTNEURAL V2
 * Supports Quick Filtering (Gatekeeper) and Deep Autopsy.
 */

/**
 * L'Éclaireur Express (Scan de 5 secondes)
 * But: Récupérer titre, secteur, et TTFB pour filtrage radical.
 */
export async function scanQuick(url: string) {
  const { chromium } = await import("playwright");
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const startTime = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
    const ttfb = Date.now() - startTime;

    const data = await page.evaluate(() => {
      return {
        title: document.title,
        h1: document.querySelector('h1')?.innerText || "",
        meta_desc: document.querySelector('meta[name="description"]')?.getAttribute('content') || "",
        status: 200
      };
    });

    return { ...data, ttfb };
  } catch (e) {
    console.error("[Scanner Quick] Error:", e);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * L'Autopsie Totale (Audit Ultra-Complet)
 * But: Extraction structurelle, visuelle et technique exhaustive.
 */
export async function scanFullSite(url: string) {
  const { chromium } = await import("playwright");
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 GhostNeuralBot/1.0'
    });
    const page = await context.newPage();

    // 1. Navigation & Basic Data
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // 2. Sitemap & Robots.txt Discovery
    const baseUrl = new URL(url).origin;
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    const robotsUrl = `${baseUrl}/robots.txt`;
    
    const [sitemapRes, robotsRes] = await Promise.all([
      fetch(sitemapUrl).then(r => r.status === 200 ? "Présent" : "Absent").catch(() => "Erreur"),
      fetch(robotsUrl).then(r => r.status === 200 ? "Présent" : "Absent").catch(() => "Erreur")
    ]);

    // 3. Deep Evaluate
    const analysis = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'))
        .map(a => a.href)
        .filter(l => { try { return l.startsWith(window.location.origin); } catch(e){return false;} });
      
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
    const desktopBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
    const desktopBase64 = desktopBuffer.toString('base64');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);
    const mobileBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
    const mobileBase64 = mobileBuffer.toString('base64');

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
  } catch (error) {
    console.error("[Scanner Full] Error:", error);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

// Keep original scanPage for backward compatibility if needed, 
// but we'll migrate the orchestrator soon.
export const scanPage = scanFullSite;
