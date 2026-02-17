/**
 * Lighthouse Runner for GHOSTNEURAL
 * Using dynamic import() to satisfy ESM requirements while avoiding bundling.
 */
export async function runLighthouse(url: string) {
  // Use dynamic import for ESM compatibility and to prevent bundling
  const { default: lighthouse } = await import("lighthouse");
  const chromeLauncher = await import("chrome-launcher");
  
  let chrome;
  try {
    chrome = await chromeLauncher.launch({ 
      chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"] 
    });
    
    const options = { 
      logLevel: "info", 
      output: "json", 
      port: chrome.port,
      onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices'],
    };
    
    // @ts-ignore
    const runnerResult = await lighthouse(url, options);
    
    if (!runnerResult) throw new Error("Lighthouse failed to run");

    const lhr = runnerResult.lhr;

    // Extract only essential data to avoid token explosion
    const essentialData = {
      performanceScore: lhr.categories.performance?.score ? lhr.categories.performance.score * 100 : null,
      seoScore: lhr.categories.seo?.score ? lhr.categories.seo.score * 100 : null,
      accessibilityScore: lhr.categories.accessibility?.score ? lhr.categories.accessibility.score * 100 : null,
      bestPracticesScore: lhr.categories['best-practices']?.score ? lhr.categories['best-practices'].score * 100 : null,
      lcp: lhr.audits["largest-contentful-paint"]?.displayValue ?? null,
      cls: lhr.audits["cumulative-layout-shift"]?.displayValue ?? null,
      ttfb: lhr.audits["server-response-time"]?.displayValue ?? null,
      fcp: lhr.audits["first-contentful-paint"]?.displayValue ?? null,
      speedIndex: lhr.audits["speed-index"]?.displayValue ?? null,
    };

    return {
      rawJson: JSON.stringify(essentialData),
      ...essentialData
    };
  } catch (error) {
    console.error("Lighthouse Runner Error:", error);
    throw error;
  } finally {
    if (chrome) await chrome.kill();
  }
}
