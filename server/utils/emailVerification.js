const nodemailer = require('nodemailer');
const crypto = require('crypto');
const pool = require('../database/connection');

class EmailVerification {
  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Generate secure verification token
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Send verification email
  async sendVerificationEmail(email, firstName, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your RecovR Account</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛡️ RecovR - Verify Your Account</h1>
          </div>
          <div class="content">
            <h2>Welcome to RecovR, ${firstName}!</h2>
            <p>Thank you for joining our recovery community. To complete your account setup and ensure the security of your account, please verify your email address.</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 3px;">${verificationUrl}</p>
            
            <div class="warning">
              <strong>Important:</strong> This verification link will expire in 24 hours for security reasons. If you didn't create this account, please ignore this email.
            </div>
            
            <p>Once verified, you'll have full access to:</p>
            <ul>
              <li>✅ Recovery community and support groups</li>
              <li>✅ Progress tracking and milestone sharing</li>
              <li>✅ Content blocking and safety features</li>
              <li>✅ Crisis support and resources</li>
              <li>✅ Private messaging with community members</li>
            </ul>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p><strong>Stay strong on your recovery journey!</strong><br>
            The RecovR Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>RecovR - Supporting your recovery journey with technology and community.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Welcome to RecovR, ${firstName}!
      
      Thank you for joining our recovery community. To complete your account setup, please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
      This verification link will expire in 24 hours for security reasons.
      
      If you didn't create this account, please ignore this email.
      
      Stay strong on your recovery journey!
      The RecovR Team
    `;

    try {
      await this.transporter.sendMail({
        from: `"RecovR Support" <${process.env.SMTP_FROM || 'noreply@recovr.app'}>`,
        to: email,
        subject: 'Verify Your RecovR Account - Important',
        text: textContent,
        html: htmlContent
      });
      
      console.log(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  // Store verification token in database
  async storeVerificationToken(userId, token) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET token = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP`,
      [userId, token, expiresAt]
    );
  }

  // Verify email token
  async verifyEmailToken(token) {
    const result = await pool.query(
      `SELECT evt.user_id, evt.expires_at, u.email, u.first_name
       FROM email_verification_tokens evt
       JOIN users u ON evt.user_id = u.id
       WHERE evt.token = $1 AND evt.expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid or expired verification token' };
    }

    const { user_id, email, first_name } = result.rows[0];

    // Mark user as verified
    await pool.query(
      'UPDATE users SET is_verified = true, email_verified_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user_id]
    );

    // Delete the verification token
    await pool.query(
      'DELETE FROM email_verification_tokens WHERE user_id = $1',
      [user_id]
    );

    return { 
      success: true, 
      userId: user_id, 
      email, 
      firstName: first_name 
    };
  }

  // Resend verification email
  async resendVerificationEmail(userId) {
    // Check if user needs verification
    const userResult = await pool.query(
      'SELECT email, first_name, is_verified FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const { email, first_name, is_verified } = userResult.rows[0];

    if (is_verified) {
      throw new Error('Email is already verified');
    }

    // Check rate limiting
    const recentTokens = await pool.query(
      `SELECT created_at FROM email_verification_tokens 
       WHERE user_id = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '5 minutes'`,
      [userId]
    );

    if (recentTokens.rows.length > 0) {
      throw new Error('Please wait 5 minutes before requesting another verification email');
    }

    // Generate and send new verification email
    const verificationToken = this.generateVerificationToken();
    await this.storeVerificationToken(userId, verificationToken);
    await this.sendVerificationEmail(email, first_name, verificationToken);

    return true;
  }
}

module.exports = new EmailVerification();