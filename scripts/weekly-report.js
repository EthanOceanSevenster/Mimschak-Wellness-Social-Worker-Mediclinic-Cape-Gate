const { google } = require("googleapis");
const nodemailer = require("nodemailer");

const SITE_URL = "https://mimschakwellness.com";
const GMAIL_ADDRESS = "ethansevenster5@gmail.com";
const RECIPIENT_EMAIL = "ethansevenster5@gmail.com";

async function getSearchConsoleData(auth) {
  const searchconsole = google.searchconsole({ version: "v1", auth });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);

  const formatDate = (d) => d.toISOString().split("T")[0];

  // Get overall performance
  const overallResponse = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: [],
    },
  });

  // Get top queries
  const queriesResponse = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ["query"],
      rowLimit: 10,
      orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
    },
  });

  // Get top pages
  const pagesResponse = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ["page"],
      rowLimit: 5,
      orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
    },
  });

  // Get top countries
  const countriesResponse = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ["country"],
      rowLimit: 5,
      orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
    },
  });

  const overall = overallResponse.data.rows?.[0] || {
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 0,
  };

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    overall,
    queries: queriesResponse.data.rows || [],
    pages: pagesResponse.data.rows || [],
    countries: countriesResponse.data.rows || [],
  };
}

function buildEmailHTML(data) {
  const { overall, queries, pages, countries, startDate, endDate } = data;

  const queriesRows = queries
    .map(
      (row) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${row.keys[0]}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">${row.clicks}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">${row.impressions}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">${(row.ctr * 100).toFixed(1)}%</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">${row.position.toFixed(1)}</td>
      </tr>`
    )
    .join("");

  const pagesRows = pages
    .map((row) => {
      const pagePath = row.keys[0].replace(SITE_URL, "") || "/";
      return `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${pagePath}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">${row.clicks}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">${row.impressions}</td>
      </tr>`;
    })
    .join("");

  const countriesRows = countries
    .map(
      (row) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${row.keys[0]}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">${row.clicks}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">${row.impressions}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; color: #333;">

  <div style="background: linear-gradient(135deg, #1F86C7, #6FB6E6); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Mimschak Wellness</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Weekly Search Performance Report</p>
  </div>

  <p style="color: #666; font-size: 14px; text-align: center;">Report period: <strong>${startDate}</strong> to <strong>${endDate}</strong></p>

  <!-- Overview Cards -->
  <div style="display: flex; gap: 15px; margin: 25px 0; flex-wrap: wrap;">
    <div style="flex: 1; min-width: 140px; background: #E8F4FC; padding: 20px; border-radius: 10px; text-align: center;">
      <div style="font-size: 32px; font-weight: bold; color: #1F86C7;">${overall.clicks}</div>
      <div style="font-size: 13px; color: #666; margin-top: 5px;">Total Clicks</div>
    </div>
    <div style="flex: 1; min-width: 140px; background: #F0F8E8; padding: 20px; border-radius: 10px; text-align: center;">
      <div style="font-size: 32px; font-weight: bold; color: #8BC34A;">${overall.impressions}</div>
      <div style="font-size: 13px; color: #666; margin-top: 5px;">Impressions</div>
    </div>
    <div style="flex: 1; min-width: 140px; background: #FFF8E1; padding: 20px; border-radius: 10px; text-align: center;">
      <div style="font-size: 32px; font-weight: bold; color: #FFA000;">${(overall.ctr * 100).toFixed(1)}%</div>
      <div style="font-size: 13px; color: #666; margin-top: 5px;">Avg CTR</div>
    </div>
    <div style="flex: 1; min-width: 140px; background: #F3E5F5; padding: 20px; border-radius: 10px; text-align: center;">
      <div style="font-size: 32px; font-weight: bold; color: #9C27B0;">${overall.position.toFixed(1)}</div>
      <div style="font-size: 13px; color: #666; margin-top: 5px;">Avg Position</div>
    </div>
  </div>

  <!-- Top Search Queries -->
  <h2 style="color: #1F86C7; font-size: 18px; margin-top: 35px; border-bottom: 2px solid #E8F4FC; padding-bottom: 10px;">Top Search Queries</h2>
  ${queries.length > 0 ? `
  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <thead>
      <tr style="background: #f8f9fa;">
        <th style="padding: 10px 12px; text-align: left;">Query</th>
        <th style="padding: 10px 12px; text-align: center;">Clicks</th>
        <th style="padding: 10px 12px; text-align: center;">Impressions</th>
        <th style="padding: 10px 12px; text-align: center;">CTR</th>
        <th style="padding: 10px 12px; text-align: center;">Position</th>
      </tr>
    </thead>
    <tbody>${queriesRows}</tbody>
  </table>` : '<p style="color: #999;">No search query data available for this period.</p>'}

  <!-- Top Pages -->
  <h2 style="color: #1F86C7; font-size: 18px; margin-top: 35px; border-bottom: 2px solid #E8F4FC; padding-bottom: 10px;">Top Pages</h2>
  ${pages.length > 0 ? `
  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <thead>
      <tr style="background: #f8f9fa;">
        <th style="padding: 10px 12px; text-align: left;">Page</th>
        <th style="padding: 10px 12px; text-align: center;">Clicks</th>
        <th style="padding: 10px 12px; text-align: center;">Impressions</th>
      </tr>
    </thead>
    <tbody>${pagesRows}</tbody>
  </table>` : '<p style="color: #999;">No page data available for this period.</p>'}

  <!-- Top Countries -->
  <h2 style="color: #1F86C7; font-size: 18px; margin-top: 35px; border-bottom: 2px solid #E8F4FC; padding-bottom: 10px;">Top Countries</h2>
  ${countries.length > 0 ? `
  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <thead>
      <tr style="background: #f8f9fa;">
        <th style="padding: 10px 12px; text-align: left;">Country</th>
        <th style="padding: 10px 12px; text-align: center;">Clicks</th>
        <th style="padding: 10px 12px; text-align: center;">Impressions</th>
      </tr>
    </thead>
    <tbody>${countriesRows}</tbody>
  </table>` : '<p style="color: #999;">No country data available for this period.</p>'}

  <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 10px; text-align: center; font-size: 13px; color: #999;">
    <p style="margin: 0;">This report is automatically generated from Google Search Console data.</p>
    <p style="margin: 5px 0 0;"><a href="https://search.google.com/search-console?resource_id=${encodeURIComponent(SITE_URL)}" style="color: #1F86C7;">View full report in Search Console</a></p>
  </div>

</body>
</html>`;
}

async function main() {
  // Authenticate with Google using service account
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });

  const authClient = await auth.getClient();

  console.log("Fetching Search Console data...");
  const data = await getSearchConsoleData(authClient);

  console.log(
    `Overview: ${data.overall.clicks} clicks, ${data.overall.impressions} impressions`
  );
  console.log(`Top queries: ${data.queries.length}`);
  console.log(`Top pages: ${data.pages.length}`);

  // Build email
  const html = buildEmailHTML(data);

  // Send email via Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_ADDRESS,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Mimschak Wellness Reports" <${GMAIL_ADDRESS}>`,
    to: RECIPIENT_EMAIL,
    subject: `Mimschak Wellness - Weekly Search Report (${data.startDate} to ${data.endDate})`,
    html,
  });

  console.log(`Report sent successfully to ${RECIPIENT_EMAIL}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
