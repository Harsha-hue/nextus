const nodemailer = require('nodemailer');

// Create transporter based on environment
let transporter;

if (process.env.NODE_ENV === 'production') {
    // Production: Use real SMTP (e.g., SendGrid, Mailgun, AWS SES)
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
} else {
    // Development: Use Ethereal for testing (emails don't actually send)
    // Or use Gmail with app password
    if (process.env.SMTP_HOST) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    } else {
        // Fallback: Console logging in development
        transporter = {
            sendMail: async (mailOptions) => {
                console.log('\n📧 ========== EMAIL DEBUG ==========');
                console.log(`To: ${mailOptions.to}`);
                console.log(`Subject: ${mailOptions.subject}`);
                console.log(`----- HTML Content -----`);
                console.log(mailOptions.html || mailOptions.text);
                console.log('====================================\n');
                return { messageId: 'dev-' + Date.now() };
            },
        };
    }
}

/**
 * Send verification code email
 * @param {string} to - Recipient email
 * @param {string} code - 6-digit verification code
 */
const sendVerificationCode = async (to, code) => {
    const mailOptions = {
        from: `"Nextus" <${process.env.SMTP_FROM || 'noreply@nextus.app'}>`,
        to,
        subject: 'Your Nextus verification code',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
                    .container { max-width: 480px; margin: 0 auto; padding: 40px 20px; }
                    .header { text-align: center; margin-bottom: 32px; }
                    .logo { width: 56px; height: 56px; background: linear-gradient(135deg, #6B46C1, #8B5CF6); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: bold; }
                    .title { color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 24px 0 8px; }
                    .subtitle { color: #666; font-size: 16px; margin: 0; }
                    .code-box { background: #f5f3ff; border: 2px solid #6B46C1; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0; }
                    .code { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #6B46C1; margin: 0; }
                    .code-label { color: #666; font-size: 14px; margin-top: 8px; }
                    .note { color: #888; font-size: 14px; text-align: center; }
                    .footer { margin-top: 48px; text-align: center; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">N</div>
                        <h1 class="title">Your verification code</h1>
                        <p class="subtitle">Enter this code to sign in to Nextus</p>
                    </div>
                    
                    <div class="code-box">
                        <p class="code">${code}</p>
                        <p class="code-label">Valid for 10 minutes</p>
                    </div>
                    
                    <p class="note">
                        If you didn't request this code, you can safely ignore this email.<br>
                        Someone may have typed your email address by mistake.
                    </p>
                    
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Nextus. All rights reserved.</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `Your Nextus verification code is: ${code}\n\nThis code is valid for 10 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error);
        throw error;
    }
};

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} resetLink - Password reset link
 */
const sendPasswordResetEmail = async (to, resetLink) => {
    const mailOptions = {
        from: `"Nextus" <${process.env.SMTP_FROM || 'noreply@nextus.app'}>`,
        to,
        subject: 'Reset your Nextus password',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
                    .container { max-width: 480px; margin: 0 auto; padding: 40px 20px; }
                    .header { text-align: center; margin-bottom: 32px; }
                    .logo { width: 56px; height: 56px; background: linear-gradient(135deg, #6B46C1, #8B5CF6); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: bold; }
                    .title { color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 24px 0 8px; }
                    .subtitle { color: #666; font-size: 16px; }
                    .button { display: inline-block; background: #6B46C1; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
                    .note { color: #888; font-size: 14px; }
                    .footer { margin-top: 48px; text-align: center; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">N</div>
                        <h1 class="title">Reset your password</h1>
                        <p class="subtitle">Click the button below to reset your password</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="${resetLink}" class="button">Reset Password</a>
                    </div>
                    
                    <p class="note">
                        This link is valid for 1 hour. If you didn't request a password reset, 
                        you can safely ignore this email.
                    </p>
                    
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Nextus. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `Reset your Nextus password by clicking this link: ${resetLink}\n\nThis link is valid for 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error);
        throw error;
    }
};

/**
 * Send workspace invitation email
 * @param {string} to - Recipient email
 * @param {Object} options - Invitation options
 */
const sendWorkspaceInvitation = async (to, { workspaceName, inviterName, inviteLink }) => {
    const mailOptions = {
        from: `"Nextus" <${process.env.SMTP_FROM || 'noreply@nextus.app'}>`,
        to,
        subject: `${inviterName} invited you to join ${workspaceName} on Nextus`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
                    .container { max-width: 480px; margin: 0 auto; padding: 40px 20px; }
                    .header { text-align: center; margin-bottom: 32px; }
                    .logo { width: 56px; height: 56px; background: linear-gradient(135deg, #6B46C1, #8B5CF6); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: bold; }
                    .title { color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 24px 0 8px; }
                    .subtitle { color: #666; font-size: 16px; }
                    .button { display: inline-block; background: #6B46C1; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
                    .footer { margin-top: 48px; text-align: center; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">N</div>
                        <h1 class="title">You're invited!</h1>
                        <p class="subtitle">${inviterName} wants you to join <strong>${workspaceName}</strong></p>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="${inviteLink}" class="button">Join Workspace</a>
                    </div>
                    
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Nextus. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `${inviterName} invited you to join ${workspaceName} on Nextus.\n\nJoin here: ${inviteLink}`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Invitation email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error);
        throw error;
    }
};

module.exports = {
    sendVerificationCode,
    sendPasswordResetEmail,
    sendWorkspaceInvitation,
};
