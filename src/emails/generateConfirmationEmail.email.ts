export async function generateConfirmationEmail(
  name: string,
  verificationToken: string
): Promise<string> {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;
  
  const HtmlEmail = `
  <html>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #f5f5f5; color: #333333;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); margin-top: 40px;">
              <!-- LOGO -->
              <tr style="background-color: #000000;">
                <td align="center" style="padding: 30px;">
                  <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">yeyodev</h2>
                  <p style="margin: 5px 0 0 0; color: #cccccc; font-size: 14px;">yeyo.dev</p>
                </td>
              </tr>

              <!-- HEADER -->
              <tr>
                <td align="center" style="padding: 30px 40px 20px 40px;">
                  <h1 style="margin: 0; font-size: 28px; color: #333333;">Verify your account</h1>
                </td>
              </tr>

              <!-- CONTENT -->
              <tr>
                <td style="padding: 0 40px 40px 40px;">
                  <p style="font-size: 16px; color: #333333; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
                  <p style="font-size: 16px; color: #333333; line-height: 1.6;">
                    Welcome to yeyodev! To complete your registration and activate your account, we need you to verify your email address.
                  </p>
                  <p style="font-size: 16px; color: #333333; line-height: 1.6;">
                    Simply click the button below to verify your account:
                  </p>
                  
                  <!-- VERIFICATION BUTTON -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="display: inline-block; background-color: #333333; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Verify Account</a>
                  </div>
                  
                  <p style="font-size: 14px; color: #666666; line-height: 1.5;">
                    If the button doesn't work, you can also copy and paste this link into your browser:
                  </p>
                  <p style="font-size: 14px; color: #666666; word-break: break-all; background-color: #f8f8f8; padding: 10px; border-radius: 4px;">
                    ${verificationUrl}
                  </p>
                  
                  <p style="font-size: 16px; color: #333333; line-height: 1.6;">
                    Once your account is verified, you'll be able to access all platform features.
                  </p>
                  
                  <p style="font-size: 14px; color: #666666; margin-top: 30px; line-height: 1.5;">
                    <strong>Note:</strong> This verification link will expire in 24 hours for security reasons.
                  </p>
                  
                  <p style="font-size: 16px; color: #666666; font-style: italic; margin-top: 20px;">
                    Thanks for joining us!
                  </p>
                  <p style="font-size: 16px; color: #666666; font-style: italic;">— yeyodev team</p>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr style="background-color: #f8f8f8;">
                <td align="center" style="padding: 30px; color: #666666;">
                  <p style="margin: 0; font-size: 14px;">Questions? Contact us at <a href="mailto:contact@yeyo.dev" style="color: #333333; text-decoration: none;">contact@yeyo.dev</a></p>
                  <p style="margin: 20px 0 10px 0; font-size: 14px;">Visit us at <a href="https://yeyo.dev" style="color: #333333; text-decoration: none;">yeyo.dev</a></p>
                  <p style="margin-top: 20px; font-size: 12px; color: #999999;">© ${new Date().getFullYear()} yeyodev. All rights reserved.</p>
                  <p style="margin-top: 10px; font-size: 12px; color: #999999;">If you didn't request this verification, you can safely ignore this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
  
  return HtmlEmail;
}