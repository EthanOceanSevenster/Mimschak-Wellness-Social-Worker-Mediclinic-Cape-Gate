const { google } = require("googleapis");
const nodemailer = require("nodemailer");

const SITE_URL = "https://mimschakwellness.com";
const GMAIL_ADDRESS = "ethansevenster5@gmail.com";
const RECIPIENT_EMAIL = "phakamandamase@gmail.com";

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

  const rowStyle = (i) => `background: ${i % 2 === 0 ? '#ffffff' : '#f8f9fa'};`;
  const cellStyle = "padding: 9px 12px; border-bottom: 1px solid #E8F4FC; color: #333333;";

  const queriesRows = queries
    .map(
      (row, i) => `
      <tr style="${rowStyle(i)}">
        <td style="${cellStyle}">${row.keys[0]}</td>
        <td style="${cellStyle} text-align: center; color: #1F86C7; font-weight: bold;">${row.clicks}</td>
        <td style="${cellStyle} text-align: center;">${row.impressions}</td>
        <td style="${cellStyle} text-align: center;">${(row.ctr * 100).toFixed(1)}%</td>
        <td style="${cellStyle} text-align: center;">${row.position.toFixed(1)}</td>
      </tr>`
    )
    .join("");

  const pagesRows = pages
    .map((row, i) => {
      const pagePath = row.keys[0].replace(SITE_URL, "") || "/";
      return `
      <tr style="${rowStyle(i)}">
        <td style="${cellStyle}">${pagePath}</td>
        <td style="${cellStyle} text-align: center; color: #1F86C7; font-weight: bold;">${row.clicks}</td>
        <td style="${cellStyle} text-align: center;">${row.impressions}</td>
      </tr>`;
    })
    .join("");

  const countriesRows = countries
    .map(
      (row, i) => `
      <tr style="${rowStyle(i)}">
        <td style="${cellStyle}">${row.keys[0]}</td>
        <td style="${cellStyle} text-align: center; color: #1F86C7; font-weight: bold;">${row.clicks}</td>
        <td style="${cellStyle} text-align: center;">${row.impressions}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 0; color: #333333; background: #f8f9fa;">

  <!-- Header -->
  <div style="background: #333333; padding: 25px 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px;">MIMSCHAK WELLNESS</h1>
    <p style="color: #8BC34A; margin: 8px 0 0; font-size: 13px; letter-spacing: 2px;">WEEKLY SEARCH PERFORMANCE REPORT</p>
  </div>

  <!-- Date Bar -->
  <div style="background: #1F86C7; padding: 10px 30px; text-align: center;">
    <p style="color: #ffffff; font-size: 13px; margin: 0;">Report period: ${startDate} to ${endDate}</p>
  </div>

  <div style="padding: 30px; background: #ffffff;">

    <!-- Overview Cards -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
      <tr>
        <td width="25%" style="padding: 5px;">
          <div style="background: #E8F4FC; padding: 18px 10px; border-radius: 8px; text-align: center; border-top: 3px solid #1F86C7;">
            <div style="font-size: 28px; font-weight: bold; color: #1F86C7;">${overall.clicks}</div>
            <div style="font-size: 11px; color: #333333; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Clicks</div>
          </div>
        </td>
        <td width="25%" style="padding: 5px;">
          <div style="background: #f0f8e8; padding: 18px 10px; border-radius: 8px; text-align: center; border-top: 3px solid #8BC34A;">
            <div style="font-size: 28px; font-weight: bold; color: #8BC34A;">${overall.impressions}</div>
            <div style="font-size: 11px; color: #333333; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Impressions</div>
          </div>
        </td>
        <td width="25%" style="padding: 5px;">
          <div style="background: #E8F4FC; padding: 18px 10px; border-radius: 8px; text-align: center; border-top: 3px solid #1F86C7;">
            <div style="font-size: 28px; font-weight: bold; color: #1F86C7;">${(overall.ctr * 100).toFixed(1)}%</div>
            <div style="font-size: 11px; color: #333333; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Avg CTR</div>
          </div>
        </td>
        <td width="25%" style="padding: 5px;">
          <div style="background: #f0f8e8; padding: 18px 10px; border-radius: 8px; text-align: center; border-top: 3px solid #8BC34A;">
            <div style="font-size: 28px; font-weight: bold; color: #8BC34A;">${overall.position.toFixed(1)}</div>
            <div style="font-size: 11px; color: #333333; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Avg Position</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Top Search Queries -->
    <h2 style="color: #333333; font-size: 16px; margin: 30px 0 15px; padding-bottom: 8px; border-bottom: 2px solid #8BC34A;">
      <span style="color: #1F86C7;">&#9632;</span> Top Search Queries
    </h2>
    ${queries.length > 0 ? `
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="background: #333333;">
          <th style="padding: 10px 12px; text-align: left; color: #ffffff;">Query</th>
          <th style="padding: 10px 12px; text-align: center; color: #ffffff;">Clicks</th>
          <th style="padding: 10px 12px; text-align: center; color: #ffffff;">Impressions</th>
          <th style="padding: 10px 12px; text-align: center; color: #ffffff;">CTR</th>
          <th style="padding: 10px 12px; text-align: center; color: #ffffff;">Position</th>
        </tr>
      </thead>
      <tbody>${queriesRows}</tbody>
    </table>` : '<p style="color: #999; font-size: 13px;">No search query data available for this period.</p>'}

    <!-- Top Pages -->
    <h2 style="color: #333333; font-size: 16px; margin: 30px 0 15px; padding-bottom: 8px; border-bottom: 2px solid #8BC34A;">
      <span style="color: #1F86C7;">&#9632;</span> Top Pages
    </h2>
    ${pages.length > 0 ? `
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="background: #333333;">
          <th style="padding: 10px 12px; text-align: left; color: #ffffff;">Page</th>
          <th style="padding: 10px 12px; text-align: center; color: #ffffff;">Clicks</th>
          <th style="padding: 10px 12px; text-align: center; color: #ffffff;">Impressions</th>
        </tr>
      </thead>
      <tbody>${pagesRows}</tbody>
    </table>` : '<p style="color: #999; font-size: 13px;">No page data available for this period.</p>'}

    <!-- Top Countries -->
    <h2 style="color: #333333; font-size: 16px; margin: 30px 0 15px; padding-bottom: 8px; border-bottom: 2px solid #8BC34A;">
      <span style="color: #1F86C7;">&#9632;</span> Top Countries
    </h2>
    ${countries.length > 0 ? `
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="background: #333333;">
          <th style="padding: 10px 12px; text-align: left; color: #ffffff;">Country</th>
          <th style="padding: 10px 12px; text-align: center; color: #ffffff;">Clicks</th>
          <th style="padding: 10px 12px; text-align: center; color: #ffffff;">Impressions</th>
        </tr>
      </thead>
      <tbody>${countriesRows}</tbody>
    </table>` : '<p style="color: #999; font-size: 13px;">No country data available for this period.</p>'}

  </div>

  <!-- Footer -->
  <div style="background: #333333; padding: 20px 30px; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.7);">This report is automatically generated from Google Search Console data.</p>
    <p style="margin: 8px 0 0;">
      <a href="https://search.google.com/search-console?resource_id=${encodeURIComponent(SITE_URL)}" style="color: #8BC34A; font-size: 12px;">View full report in Search Console</a>
      <span style="color: rgba(255,255,255,0.3); margin: 0 10px;">|</span>
      <a href="${SITE_URL}" style="color: #8BC34A; font-size: 12px;">mimschakwellness.com</a>
    </p>
  </div>

</body>
</html>`;
}

const GMAIL_APP_PASSWORD = "nouh hfbt avof fgqg";

const SERVICE_ACCOUNT_KEY = {
  type: "service_account",
  project_id: "pro-sylph-499415-r3",
  private_key_id: "3e6f3c733f1c68b179fae326c0f843b8ae4e018b",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCzpGQpoZSdqGjQ\n1GjVx0Nzu3KApvpMC3R1uyBVmz4TNmOkimqtRIcnJSNkc7Dn7xM9LtCq9AT1jEds\n+pFPC7tOT04e2oVT+COaz6eJHEUbKJ5xJUyj0v40YT0/B4tELm3kB8ijZ6vyLhCc\nkQkcHLWYnd36KCefuIyDrgpWqrYiehXWtDR1LYm344xLwy9Wv0CKtCezws13RpSP\nAUmdG4xMDCJSIrc31E/zPoJRZB89nItP+xL72cJPalIotWFYGziSvwrqStdqWoHw\n5jXaW9Fykll2SZ870XaseYLaAHh6UWuQ6oL6Oepz3VWkMUv11eoOMXnqPSUIDOyk\nCpUyDs9XAgMBAAECgf9DtzQKfV4ID/NyxJ6/9tz2QzJmTIsNH0RHHMKTgnFjzJzC\n6WpM5ggMOXOd6f5Fb1lRNtRxnIpCBR7ndYxQv5tbaYmJF9YqUN8a/CurA30JP8Z5\n4BWDq4UnOYBcwfs9OEM0Mbrv3aRzJeodGo7Uif3qCZgjM/+7tVVCTdiX0sHVPI5I\nBNuqETPQ4edBS2IfMrUg6DKI7rlpl7XrFguGr2HJ/Aj6Urqr3nGM+6Ee3Vbe9LPE\nRpQhyTw3k4tM4BPsNyUA18k8ueqHju9Zooo1lUL4iweb2vadTmojg9ekyLf3Xrvr\nW6VSQnJEwJtggULjQQonpml2qv3RUa+jUTMA/rkCgYEA20L8QeTlbw3TrAiZ6vY2\nMFQYCN1fhKQ4B+UpcHfVRLv63yERHEMzRX4yHPigEZ+G26os7LBaJcuZ/YTHo8fD\nD4Dy0bz96tB2AFWxotpLr3dr0Weo9ySQg/czxa4OIm2X+r6tS6fPbIDhXe68qm4G\nNZwD34qjWoKgYo3JwY6W38kCgYEA0b33PwKNbooAtCAmP0sYxREqgnkxhOy+oy8G\nXtEZbMV6hElSDQrrBAnNk38/hF71qGzT3ZYjHStxdiDTiQrsiqUQbgV5nangnwfJ\nbPJ4/1nYRVU7qCvC3E3/fRUP4fyScWE/sjQoyXsULGw0mIfFST9FTSOzHMw6IBY+\nmxOzBh8CgYEAx/etjIMvZDseA1XM2mc2QJlRWjRbOuNyXnD3fCUuEgPG5tyHeFkp\nV4WiOp3djnUJTylC05J6hOHNTVNdp9c15NvbmMFeals4Y1HEMhwYzqyBXnfFt7BX\nRKOdSfpV1bxR0VM5RTiEihZ4c2yaEG1LqHTja2pLVO6xS3C4wphCrVECgYEAxrQ5\n8K/yXa7QS9XJZl028jv5EfLPPycq1F5QorNmau4LzBfKbCDT1deTsxDyk+2CvjWb\n4mnCingF3evrfAGlZxRKJHF7birqar9tzJFKoF/1zHmbMw+CZERgr5esnGQ0OMXx\nGlrf6UF5Mzyv93FpLqOKfDI+FiJFTvDEDxbym/ECgYBseCZrk7qz91+e7Ut9LPv+\nOEGWOcA9d4mApDEEl1/DhYcNBbg5wsZydjx4kAEB2W95T+M+jXjI83I5CEb2thrt\nYxzqoS2vith1l5RDHWOoASRMKxuwhosZ6m3yrc8wh87jwy0JVRLYWfoUkFuuFcIp\n/p/tK3wu+YZPCYC38/1I6Q==\n-----END PRIVATE KEY-----\n",
  client_email: "mimschak@pro-sylph-499415-r3.iam.gserviceaccount.com",
  client_id: "114758780099048184208",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/mimschak%40pro-sylph-499415-r3.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

async function main() {
  // Authenticate with Google using service account
  const auth = new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_KEY,
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
      pass: GMAIL_APP_PASSWORD,
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
