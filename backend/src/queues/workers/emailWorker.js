const sgMail = require('@sendgrid/mail');
const emailQueue = require('../emailQueue');
const sendgridConfig = require('../../config/sendgrid');
const logger = require('../../utils/logger');

// Set SendGrid API Key if configured
if (sendgridConfig.apiKey) {
  sgMail.setApiKey(sendgridConfig.apiKey);
}

// Custom templates compiler
function compileTemplate(templateName, variables = {}) {
  const brandColor = '#6366f1';
  const darkBg = '#0f172a';
  const cardBg = '#1e293b';
  const textMuted = '#94a3b8';
  const textColor = '#f8fafc';

  const baseHeader = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: ${darkBg}; color: ${textColor}; margin: 0; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background: ${cardBg}; border: 1px solid #334155; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
        .header { background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 30px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }
        .content { padding: 40px 30px; line-height: 1.6; }
        .footer { padding: 20px 30px; text-align: center; border-top: 1px solid #334155; font-size: 12px; color: ${textMuted}; }
        .button { display: inline-block; padding: 12px 24px; background-color: ${brandColor}; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; text-align: center; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .badge-success { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .badge-warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
        .badge-danger { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .highlight-box { background: rgba(99, 102, 241, 0.1); border-left: 4px solid ${brandColor}; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .otp-code { font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: 6px; text-align: center; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px dashed #475569; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #334155; }
        th { color: ${textMuted}; font-size: 12px; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>LeadFlow-AI</h1>
        </div>
        <div class="content">
  `;

  const baseFooter = `
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} LeadFlow-AI. All rights reserved.</p>
          <p>India's Premium WhatsApp-first CRM & Speed-to-Lead Outbound Voice Qualifier.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  let subject = '';
  let html = '';
  let text = '';

  switch (templateName) {
    case 'welcome': {
      const { name, companyName } = variables;
      subject = `Welcome to LeadFlow-AI, ${name}!`;
      text = `Hello ${name},\n\nThank you for choosing LeadFlow-AI! Your account for ${companyName} has been successfully created.\n\nStart qualifying your leads in 90 seconds.`;
      html = `
        ${baseHeader}
        <h2>Welcome to LeadFlow-AI!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Thank you for choosing LeadFlow-AI! Your workspace for <strong>${companyName}</strong> has been successfully set up and is ready for action.</p>
        <p>LeadFlow-AI is built to help you convert traffic into sales faster by qualifying leads within 90 seconds using our outbound AI Calling system and smart WhatsApp templates.</p>
        <div class="highlight-box">
          <strong>Next Steps:</strong>
          <ul>
            <li>Activate your WhatsApp Business API integrations</li>
            <li>Configure your Sarvam AI Outbound Call Scripts</li>
            <li>Embed the Lead Capture Widget on your website</li>
          </ul>
        </div>
        <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>
        ${baseFooter}
      `;
      break;
    }
    case 'invite': {
      const { email, role, inviteUrl } = variables;
      subject = `Invitation to join LeadFlow-AI team`;
      text = `You have been invited to join a team on LeadFlow-AI as a ${role}.\n\nAccept your invitation here: ${inviteUrl}`;
      html = `
        ${baseHeader}
        <h2>You're Invited!</h2>
        <p>Hello,</p>
        <p>You have been invited to join your team on <strong>LeadFlow-AI</strong> in the role of <strong>${role}</strong>.</p>
        <p>Accept this invitation and set up your password to start managing pipelines and talking to qualified leads.</p>
        <div style="text-align: center;">
          <a href="${inviteUrl}" class="button">Accept Invitation</a>
        </div>
        <p style="font-size: 12px; color: ${textMuted}; margin-top: 30px;">If the button above does not work, copy and paste this link in your browser:<br/>${inviteUrl}</p>
        ${baseFooter}
      `;
      break;
    }
    case 'password_reset': {
      const { email, otp } = variables;
      subject = `Reset your LeadFlow-AI Password`;
      text = `Your OTP for resetting your LeadFlow-AI password is: ${otp}. It will expire in 15 minutes.`;
      html = `
        ${baseHeader}
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. Use the following One-Time Password (OTP) to complete the reset process:</p>
        <div class="otp-code">${otp}</div>
        <p>This code is valid for <strong>15 minutes</strong>. If you did not make this request, you can safely ignore this email.</p>
        ${baseFooter}
      `;
      break;
    }
    case 'payment_receipt': {
      const { companyName, amount, planName, transactionId } = variables;
      subject = `Payment Receipt - LeadFlow-AI`;
      text = `Thank you for your payment of Rs. ${amount} for the ${planName} Plan on LeadFlow-AI. Transaction ID: ${transactionId}`;
      html = `
        ${baseHeader}
        <h2>Payment Receipt</h2>
        <p>Hello,</p>
        <p>Thank you for subscribing! Your payment has been successfully processed.</p>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Workspace</td>
              <td><strong>${companyName}</strong></td>
            </tr>
            <tr>
              <td>Plan Tier</td>
              <td><span class="badge badge-success">${planName}</span></td>
            </tr>
            <tr>
              <td>Amount Paid</td>
              <td><strong>INR ${amount}</strong></td>
            </tr>
            <tr>
              <td>Transaction ID</td>
              <td><code>${transactionId}</code></td>
            </tr>
            <tr>
              <td>Billing Period</td>
              <td>Monthly Recurring</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top: 30px;">If you have any questions regarding your invoice, please contact support.</p>
        ${baseFooter}
      `;
      break;
    }
    case 'call_summary': {
      const { leadName, leadPhone, status, score, summary } = variables;
      subject = `Call Summary: ${leadName} - [Score: ${score}/100]`;
      text = `Call Summary for ${leadName} (${leadPhone}). Status: ${status}, Score: ${score}/100. Key Points: ${summary}`;
      const badgeClass = score >= 75 ? 'badge-success' : (score >= 40 ? 'badge-warning' : 'badge-danger');
      html = `
        ${baseHeader}
        <h2>Voice Call Qualification Summary</h2>
        <p>Our speed-to-lead outbound AI agent just completed a call with a lead. Here are the highlights:</p>
        <table>
          <tbody>
            <tr>
              <td>Lead Name</td>
              <td><strong>${leadName}</strong></td>
            </tr>
            <tr>
              <td>Phone</td>
              <td>${leadPhone}</td>
            </tr>
            <tr>
              <td>Call Status</td>
              <td><span class="badge ${status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}">${status}</span></td>
            </tr>
            <tr>
              <td>AI Qualifier Score</td>
              <td><span class="badge ${badgeClass}">${score} / 100</span></td>
            </tr>
          </tbody>
        </table>
        <div class="highlight-box" style="margin-top: 30px;">
          <strong>AI Conversation Summary:</strong>
          <p style="margin: 10px 0 0 0; font-style: italic;">"${summary}"</p>
        </div>
        <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard/pipeline" class="button">View Lead in Pipeline</a>
        ${baseFooter}
      `;
      break;
    }
    case 'usage_warning': {
      const { companyName, limit, used } = variables;
      subject = `Usage Limit Alert - LeadFlow-AI`;
      text = `Your workspace ${companyName} has used ${used} out of ${limit} allocated AI Call credits. Please upgrade your subscription to avoid service disruption.`;
      const percentage = Math.round((used / limit) * 100);
      html = `
        ${baseHeader}
        <h2>Usage Alert: Credits Running Low</h2>
        <p>Hello,</p>
        <p>Your workspace <strong>${companyName}</strong> is approaching its outbound AI calling quota limit.</p>
        <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; border: 1px solid #334155; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
            <span>AI Calls Used:</span>
            <strong>${used} / ${limit} (${percentage}%)</strong>
          </div>
          <div style="height: 10px; width: 100%; background: #334155; border-radius: 5px; overflow: hidden;">
            <div style="height: 100%; width: ${Math.min(percentage, 100)}%; background: ${percentage >= 90 ? '#ef4444' : '#f59e0b'}; border-radius: 5px;"></div>
          </div>
        </div>
        <p>To ensure uninterrupted speed-to-lead calls for incoming traffic, please upgrade your subscription plan today.</p>
        <div style="text-align: center;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard/settings/billing" class="button">Upgrade Subscription</a>
        </div>
        ${baseFooter}
      `;
      break;
    }
    default:
      throw new Error(`Unsupported email template: ${templateName}`);
  }

  return { subject, html, text };
}

emailQueue.process(async (job) => {
  const { to, subject: directSubject, html: directHtml, text: directText, template, variables } = job.data;

  let finalSubject = directSubject;
  let finalHtml = directHtml;
  let finalText = directText;

  if (template) {
    try {
      const compiled = compileTemplate(template, variables);
      finalSubject = compiled.subject;
      finalHtml = compiled.html;
      finalText = compiled.text;
    } catch (templateErr) {
      logger.error(`Failed to compile template '${template}':`, templateErr.message);
      throw templateErr;
    }
  }

  logger.info(`Sending email to ${to} with subject: "${finalSubject}"`);

  try {
    if (!sendgridConfig.apiKey) {
      logger.warn('SendGrid API key not configured. Mocking email delivery in console.');
      logger.info(`--- MOCK EMAIL TO ${to} ---`);
      logger.info(`Subject: ${finalSubject}`);
      logger.info(`Content: ${finalText || finalHtml}`);
      logger.info(`--------------------------`);
      return;
    }

    const msg = {
      to,
      from: {
        email: sendgridConfig.fromEmail || 'no-reply@leadflowai.com',
        name: sendgridConfig.fromName || 'LeadFlow-AI',
      },
      subject: finalSubject,
      text: finalText || 'LeadFlow-AI Notification',
      html: finalHtml || `<p>${finalText}</p>`,
    };

    const response = await sgMail.send(msg);
    logger.info(`Email sent successfully via SendGrid. Status: ${response[0]?.statusCode}`);
  } catch (error) {
    logger.error(`Error in emailWorker sending email to ${to}:`, error.response?.body || error.message);
    throw error;
  }
});
