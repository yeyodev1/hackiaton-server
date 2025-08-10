import "dotenv/config";

import CustomError from "../errors/customError.error";
import { Resend } from "resend";
import { generateConfirmationEmail } from "../emails/generateConfirmationEmail.email";

class ResendEmail {
  private resend: Resend;

  constructor() {
    const RESEND_KEY = process.env.RESEND_KEY;
    if (!RESEND_KEY) {
      throw new Error("Resend API key is missing");
    }
    this.resend = new Resend(RESEND_KEY);
  }

  public async sendVerificationEmail(
    recipientName: string,
    recipientEmail: string,
    verificationToken: string
  ): Promise<void> {
    try {
      const content = await generateConfirmationEmail(recipientName, verificationToken);

      const { error } = await this.resend.emails.send({
        to: recipientEmail,
        from: "noreply@yeyo.dev",
        html: content,
        subject: "Verify your account - yeyodev",
      });

      if (error) {
        throw new CustomError("Problem sending verification email from resend", 400, error);
      }
      
      console.log(`[Email Service] Verification email sent to ${recipientEmail}.`);

    } catch (error) {
      console.error(`[Email Service] Failed to send verification email to ${recipientEmail}:`, error);
      throw new CustomError("Problem sending verification email from resend", 400, error);
    }
  }
}
export default ResendEmail;