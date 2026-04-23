'use strict';

const nodemailer = require('nodemailer');

// ── Transporter ────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // STARTTLS — upgrades to TLS after connecting
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Test the SMTP connection on startup.
 * Logs success or failure — does NOT crash the server.
 */
async function verifyTransporter() {
  try {
    await transporter.verify();
    console.log('✅ Gmail SMTP connection verified');
  } catch (err) {
    console.error('❌ Gmail SMTP verification failed:', err.message);
    console.error('   Check GMAIL_USER and GMAIL_APP_PASSWORD in .env');
  }
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

/** Reusable email header HTML (Suraksha Health branding) */
function emailHeader() {
  return `
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <div style="display: inline-block; padding: 12px; background-color: #10b981; border-radius: 12px; margin-bottom: 16px;">
                <span style="font-size: 28px;">🏥</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">Suraksha Health</h1>
            </td>
          </tr>`;
}

/** Reusable email footer HTML */
function emailFooter() {
  return `
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #71717a; text-align: center;">
                This is an automated message from Suraksha Health.<br>
                Please do not reply to this email.
              </p>
              <p style="margin: 16px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                © ${new Date().getFullYear()} Suraksha Health — Your Health, Your Control.
              </p>
            </td>
          </tr>`;
}

/** Shared "from" address */
function fromAddress() {
  return `"${process.env.EMAIL_FROM_NAME || 'Suraksha Health'}" <${process.env.GMAIL_USER}>`;
}

// ── Password Reset Email ───────────────────────────────────────────────────────

/**
 * Send a password reset email to the user.
 *
 * @param {string} toEmail  - Recipient's email address
 * @param {string} resetLink - Full URL with token for password reset
 * @param {string} userName  - User's name for personalization
 * @returns {Promise<{ success: boolean, messageId: string }>}
 */
async function sendPasswordResetEmail(toEmail, resetLink, userName = 'there') {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          ${emailHeader()}
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">Reset Your Password</h2>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
                Hello ${userName},
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
                You requested a password reset for your Suraksha Health account. Click the button below to create a new password.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #71717a;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; font-size: 13px; line-height: 1.6; color: #10b981; word-break: break-all;">
                ${resetLink}
              </p>

              <!-- Security Note -->
              <div style="padding: 16px; background-color: #ecfdf5; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 16px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #065f46;">
                  <strong>⏱ This link expires in 1 hour</strong> for your security.
                </p>
              </div>
              
              <!-- Warning -->
              <div style="padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #92400e;">
                  <strong>Didn't request this?</strong><br>
                  If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </div>
            </td>
          </tr>
          
          ${emailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Hello ${userName},

You requested a password reset for your Suraksha Health account.

Click the link below to reset your password (expires in 1 hour):
${resetLink}

If you didn't request this password reset, you can safely ignore this email.

— Suraksha Health · Your Health, Your Control
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: fromAddress(),
      to: toEmail,
      subject: 'Reset your Suraksha Health password',
      html,
      text,
    });

    console.log(`Password reset email sent to ${toEmail} (messageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email service error:', err);
    throw err;
  }
}

// ── Email Verification Email ───────────────────────────────────────────────────

/**
 * Send an email verification link to a newly registered user.
 *
 * @param {string} toEmail          - Recipient's email address
 * @param {string} verificationLink - Full URL with token for email verification
 * @param {string} userName         - User's name for personalization
 * @returns {Promise<{ success: boolean, messageId: string }>}
 */
async function sendVerificationEmail(toEmail, verificationLink, userName = 'there') {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          ${emailHeader()}
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">Verify Your Email Address</h2>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
                Hello ${userName}, welcome to Suraksha Health! 🎉
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
                Please verify your email address to activate your account and start managing your medical records securely.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${verificationLink}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Verify My Email
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #71717a;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; font-size: 13px; line-height: 1.6; color: #10b981; word-break: break-all;">
                ${verificationLink}
              </p>

              <!-- Expiry Note -->
              <div style="padding: 16px; background-color: #ecfdf5; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 16px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #065f46;">
                  <strong>⏱ This link expires in 24 hours</strong> for your security.
                </p>
              </div>
              
              <!-- Warning -->
              <div style="padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #92400e;">
                  <strong>Didn't create this account?</strong><br>
                  If you didn't sign up for Suraksha Health, you can safely ignore this email. No account will be activated.
                </p>
              </div>
            </td>
          </tr>
          
          ${emailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Hello ${userName}, welcome to Suraksha Health!

Please verify your email address to activate your account.

Click the link below to verify (expires in 24 hours):
${verificationLink}

If you didn't create this account, you can safely ignore this email.

— Suraksha Health · Your Health, Your Control
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: fromAddress(),
      to: toEmail,
      subject: 'Verify your Suraksha Health email address',
      html,
      text,
    });

    console.log(`Verification email sent to ${toEmail} (messageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email service error:', err);
    throw err;
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  verifyTransporter,
};
