const nodemailer = require("nodemailer");

const GMAIL_ADDRESS = "ethansevenster5@gmail.com";
const RECIPIENT_EMAIL = "ethansevenster5@gmail.com";

async function main() {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_ADDRESS,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  console.log("Sending test email...");

  await transporter.sendMail({
    from: `"Mimschak Wellness Reports" <${GMAIL_ADDRESS}>`,
    to: RECIPIENT_EMAIL,
    subject: "Mimschak Wellness - Test Report Email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1F86C7, #6FB6E6); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0;">Mimschak Wellness</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Test Email - Report System Working</p>
        </div>
        <p>This is a test email from the weekly report system. If you received this, the Gmail SMTP connection is working correctly.</p>
        <p style="color: #999; font-size: 13px;">The full weekly report with Search Console data will be sent automatically every Monday at 8am SAST.</p>
      </div>
    `,
  });

  console.log("Test email sent successfully to " + RECIPIENT_EMAIL);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
