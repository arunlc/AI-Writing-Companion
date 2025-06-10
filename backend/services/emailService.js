// backend/services/emailService.js - NEW FILE
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Check for email configuration
      if (process.env.SENDGRID_API_KEY) {
        console.log('📧 Configuring email with SendGrid...');
        this.setupSendGrid();
      } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        console.log('📧 Configuring email with SMTP...');
        this.setupSMTP();
      } else {
        console.warn('⚠️ No email configuration found. Password reset emails will not be sent.');
        this.setupTestAccount();
      }
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
      this.isConfigured = false;
    }
  }

  setupSendGrid() {
    // For SendGrid, we'll use SMTP
    this.transporter = nodemailer.createTransporter({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
    
    this.isConfigured = true;
    console.log('✅ SendGrid email transporter configured');
  }

  setupSMTP() {
    const config = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    // Special configuration for Gmail
    if (process.env.SMTP_HOST.includes('gmail')) {
      config.service = 'gmail';
    }

    this.transporter = nodemailer.createTransporter(config);
    this.isConfigured = true;
    console.log('✅ SMTP email transporter configured');
  }

  async setupTestAccount() {
    try {
      // Create test account for development
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      this.isConfigured = true;
      console.log('🧪 Test email account configured for development');
      console.log('📧 Test email credentials:', {
        user: testAccount.user,
        pass: testAccount.pass,
        url: 'https://ethereal.email/'
      });
    } catch (error) {
      console.error('❌ Failed to create test email account:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.isConfigured) {
      throw new Error('Email service is not configured');
    }

    const fromEmail = process.env.FROM_EMAIL || 'noreply@ai-writing-companion.com';
    
    const mailOptions = {
      from: `"AI Writing Companion" <${fromEmail}>`,
      to,
      subject,
      html,
      text: text || this.stripHtml(html)
    };

    try {
      console.log(`📨 Sending email to ${to}: ${subject}`);
      
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully');
      
      // Log preview URL for test accounts
      if (nodemailer.getTestMessageUrl(info)) {
        console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info)
      };
    } catch (error) {
      console.error('❌ Email send failed:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // Helper to strip HTML tags for text version
  stripHtml(html) {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Verify email configuration
  async verifyConnection() {
    if (!this.isConfigured) {
      return { 
        success: false, 
        message: 'Email service is not configured' 
      };
    }

    try {
      await this.transporter.verify();
      return { 
        success: true, 
        message: 'Email service is ready' 
      };
    } catch (error) {
      console.error('❌ Email verification failed:', error);
      return { 
        success: false, 
        message: `Email verification failed: ${error.message}` 
      };
    }
  }

  // Send test email
  async sendTestEmail(to) {
    return this.sendEmail({
      to,
      subject: 'AI Writing Companion - Test Email',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Test Email</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Email Service Working!</h2>
            
            <p>This is a test email to verify that the AI Writing Companion email service is working correctly.</p>
            
            <p>If you received this email, the configuration is successful.</p>
            
            <div style="margin: 30px 0; padding: 20px; background: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
              <p style="margin: 0; color: #155724;">
                <strong>✅ Email Service Status:</strong> Active
              </p>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">© 2025 AI Writing Companion. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
AI Writing Companion - Test Email

Email Service Working!

This is a test email to verify that the AI Writing Companion email service is working correctly.

If you received this email, the configuration is successful.

✅ Email Service Status: Active

© 2025 AI Writing Companion
      `
    });
  }

  // Health check
  async healthCheck() {
    const verification = await this.verifyConnection();
    return {
      service: 'Email Service',
      configured: this.isConfigured,
      ...verification
    };
  }
}

// Export singleton instance
const emailService = new EmailService();

// Export the main functions
const sendEmail = (options) => emailService.sendEmail(options);
const verifyConnection = () => emailService.verifyConnection();
const sendTestEmail = (to) => emailService.sendTestEmail(to);
const healthCheck = () => emailService.healthCheck();

module.exports = {
  EmailService,
  emailService,
  sendEmail,
  verifyConnection,
  sendTestEmail,
  healthCheck
};
