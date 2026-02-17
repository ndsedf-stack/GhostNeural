/**
 * GhostNeural Guards
 * Responsible for legal compliance (RGPD) and quality control.
 */

const PERSONAL_DOMAINS = [
  'gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 
  'free.fr', 'orange.fr', 'wanadoo.fr', 'icloud.com'
];

export const guards = {
  /**
   * Legal Guard:
   * - Check if email is personal (B2B only in France for cold mailing without opt-in)
   */
  legal(email: string | null): { passed: boolean; reason?: string } {
    if (!email) return { passed: false, reason: 'no_email' };
    
    const domain = email.split('@')[1]?.toLowerCase();
    if (PERSONAL_DOMAINS.includes(domain)) {
      return { passed: false, reason: 'personal_email_detected' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { passed: false, reason: 'invalid_email_format' };
    }
    
    return { passed: true };
  },

  /**
   * Quality Guard:
   * - Check if audit score is high enough.
   * - Check if LLM confidence is sufficient.
   */
  quality(auditScore: number, emailConfidence: number): { passed: boolean; reason?: string } {
    if (auditScore < 20) {
      return { passed: false, reason: 'audit_score_too_low' };
    }
    
    if (emailConfidence < 0.6) {
      return { passed: false, reason: 'email_confidence_too_low' };
    }
    
    return { passed: true };
  },

  /**
   * Centralized Safety Guard (Async)
   * Combines provider filtering and database opt-out check.
   */
  async checkSafety(email: string | null, supabase: any): Promise<{ allowed: boolean; reason?: string }> {
    if (!email) return { allowed: true }; // Allow if email not yet known, will be checked again later if found
    
    // 1. Provider Filter
    const domain = email.split('@')[1]?.toLowerCase();
    if (PERSONAL_DOMAINS.includes(domain)) {
      return { allowed: false, reason: "Email personnel non-B2B" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { allowed: false, reason: "Format email invalide" };
    }

    // 2. DB Opt-out Check
    try {
      const { data: isOptedOut, error: dbError } = await supabase
        .from('opt_outs')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (dbError) throw dbError;

      if (isOptedOut) {
        return { allowed: false, reason: "Contact en liste noire (Opt-out)" };
      }
    } catch (e: any) {
      console.warn("⚠️ Database check failed (Safety guard bypassed):", e.message);
      // We don't block if DB is just down, but we log it
    }

    return { allowed: true };
  }
};
