/**
 * Email Verification Service
 *
 * Handles sending email verification emails to users
 * Uses Infobip Email API for delivery
 */

import { infobipService } from './infobip.service';

export interface VerificationEmailData {
  email: string;
  name: string;
  verificationUrl: string;
}

/**
 * Generate HTML email template for email verification
 */
function generateVerificationEmailTemplate(data: VerificationEmailData): string {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmă Adresa de Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px; text-align: center;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Promo-Efect</h1>
              <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 14px;">Logistics & Shipping Solutions</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px; font-weight: 600;">Bună ziua, ${data.name}!</h2>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Mulțumim că v-ați înregistrat pe platforma Promo-Efect!
              </p>
              
              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                Pentru a finaliza înregistrarea și a activa contul dumneavoastră, vă rugăm să confirmați adresa de email apăsând pe butonul de mai jos:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${data.verificationUrl}" 
                       style="display: inline-block; padding: 16px 32px; background-color: #1e40af; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(30, 64, 175, 0.3);">
                      Confirmă Adresa de Email
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Sau copiați și lipiți următorul link în browser-ul dumneavoastră:
              </p>
              
              <p style="margin: 10px 0 0; color: #3b82f6; font-size: 14px; word-break: break-all;">
                <a href="${data.verificationUrl}" style="color: #3b82f6; text-decoration: none;">${data.verificationUrl}</a>
              </p>
              
              <p style="margin: 30px 0 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                <strong>Notă:</strong> Acest link este valabil timp de 24 de ore. Dacă nu ați solicitat acest email, vă rugăm să îl ignorați.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                <strong>Promo-Efect SRL</strong>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.6;">
                Chișinău, Moldova<br>
                Email: <a href="mailto:contact@promo-efect.md" style="color: #3b82f6; text-decoration: none;">contact@promo-efect.md</a>
              </p>
              <p style="margin: 20px 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
                © ${new Date().getFullYear()} Promo-Efect. Toate drepturile rezervate.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(data: VerificationEmailData): Promise<void> {
  const textContent = `
Bună ziua, ${data.name}!

Mulțumim că v-ați înregistrat pe platforma Promo-Efect!

Pentru a finaliza înregistrarea și a activa contul dumneavoastră, vă rugăm să confirmați adresa de email accesând următorul link:

${data.verificationUrl}

Acest link este valabil timp de 24 de ore.

Dacă nu ați solicitat acest email, vă rugăm să îl ignorați.

Cu respect,
Echipa Promo-Efect
  `.trim();

  const result = await infobipService.sendEmail({
    to: data.email,
    subject: 'Confirmă Adresa de Email - Promo-Efect',
    html: generateVerificationEmailTemplate(data),
    text: textContent,
  });

  if (!result.success) {
    console.error('[EmailVerification] Failed to send verification email:', result.error);
    throw new Error(`Failed to send verification email: ${result.error}`);
  }

  console.log(`[EmailVerification] Verification email sent successfully to ${data.email}`);
  if (result.messageId) {
    console.log(`[EmailVerification] Message ID: ${result.messageId}`);
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string
): Promise<void> {
  const htmlContent = `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px; text-align: center;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Promo-Efect</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px; font-weight: 600;">Bună ziua, ${name}!</h2>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Ați solicitat resetarea parolei pentru contul dumneavoastră Promo-Efect.
              </p>
              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                Apăsați pe butonul de mai jos pentru a crea o parolă nouă:
              </p>
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${resetUrl}"
                       style="display: inline-block; padding: 16px 32px; background-color: #1e40af; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Resetare Parolă
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                Acest link este valabil timp de 1 oră. Dacă nu ați solicitat resetarea parolei, vă rugăm să ignorați acest email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textContent = `
Bună ziua, ${name}!

Ați solicitat resetarea parolei pentru contul dumneavoastră Promo-Efect.

Accesați următorul link pentru a crea o parolă nouă:

${resetUrl}

Acest link este valabil timp de 1 oră.

Dacă nu ați solicitat resetarea parolei, vă rugăm să ignorați acest email.

Cu respect,
Echipa Promo-Efect
  `.trim();

  const result = await infobipService.sendEmail({
    to: email,
    subject: 'Resetare Parolă - Promo-Efect',
    html: htmlContent,
    text: textContent,
  });

  if (!result.success) {
    console.error('[EmailVerification] Failed to send password reset email:', result.error);
    throw new Error(`Failed to send password reset email: ${result.error}`);
  }

  console.log(`[EmailVerification] Password reset email sent successfully to ${email}`);
  if (result.messageId) {
    console.log(`[EmailVerification] Message ID: ${result.messageId}`);
  }
}


