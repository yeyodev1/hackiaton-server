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

  public async sendAccountDeletionEmail(
    recipientName: string,
    recipientEmail: string
  ): Promise<void> {
    try {
      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Deleted - yeyodev</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background-color: #2c2c2c; padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 1px;">yeyodev</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #2c2c2c; margin: 0 0 20px 0; font-size: 24px; font-weight: 400;">Account Deleted Successfully</h2>
              
              <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">Hello ${recipientName},</p>
              
              <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                We're writing to confirm that your account has been successfully deleted from our platform. All your personal data and associated workspaces have been permanently removed from our systems.
              </p>
              
              <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                If you didn't request this deletion or believe this was done in error, please contact our support team immediately.
              </p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #6c757d; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #495057; margin: 0; font-size: 14px; line-height: 1.5;">
                  <strong>What was deleted:</strong><br>
                  • Your user account and profile<br>
                  • All associated workspaces<br>
                  • Personal data and preferences<br>
                  • Access tokens and sessions
                </p>
              </div>
              
              <p style="color: #666666; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                Thank you for using our platform. We're sorry to see you go!
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; margin: 0 0 10px 0; font-size: 14px;">Need help? Contact us:</p>
              <p style="color: #6c757d; margin: 0; font-size: 14px;">
                <a href="mailto:support@yeyo.dev" style="color: #495057; text-decoration: none;">support@yeyo.dev</a>
              </p>
              <p style="color: #6c757d; margin: 20px 0 0 0; font-size: 12px;">
                © 2024 yeyodev. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const { error } = await this.resend.emails.send({
        to: recipientEmail,
        from: "noreply@yeyo.dev",
        html: content,
        subject: "Account Deleted - yeyodev",
      });

      if (error) {
        throw new CustomError("Problem sending account deletion email from resend", 400, error);
      }
      
      console.log(`[Email Service] Account deletion email sent to ${recipientEmail}.`);

    } catch (error) {
      console.error(`[Email Service] Failed to send account deletion email to ${recipientEmail}:`, error);
      throw new CustomError("Problem sending account deletion email from resend", 400, error);
    }
  }
}
export default ResendEmail;