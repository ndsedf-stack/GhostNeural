import { Resend } from 'resend';

const resendClient = new Resend(process.env.RESEND_API_KEY);

export const resend = {
  async sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123456789') {
      console.warn("RESEND_API_KEY is missing or placeholder. Mocking email send.");
      return { id: "mock_resend_id" };
    }

    try {
      const data = await resendClient.emails.send({
        from: 'GhostNeural <onboarding@resend.dev>', // Modifiable après validation du domaine
        to,
        subject,
        html,
      });
      return data;
    } catch (error) {
      console.error("Resend Error:", error);
      throw error;
    }
  }
};
