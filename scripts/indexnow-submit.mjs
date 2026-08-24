// Usage: node scripts/indexnow-submit.mjs <url> [...<url>]

const host = 'www.tryediblee.com';
const key = '45999bc295c74d589e44c0950222e642';
const keyLocation = `https://${host}/${key}.txt`;
const defaultUrls = [
  `https://${host}/`,
  `https://${host}/pricing`,
  `https://${host}/how-it-works`,
  `https://${host}/faq`,
  `https://${host}/blog`,
  `https://${host}/blog/best-meal-planning-apps`,
  `https://${host}/blog/healthy-grocery-list`,
];

const urlList = process.argv.slice(2);
const urls = urlList.length > 0 ? urlList : defaultUrls;

for (const url of urls) {
  if (!url.startsWith(`https://${host}/`)) {
    throw new Error(`URL must use the https://${host}/ host: ${url}`);
  }
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ host, key, keyLocation, urlList: urls }),
});

const responseBody = await response.text();
console.log(`IndexNow response: ${response.status} ${response.statusText}`);
if (responseBody) console.log(responseBody);

if (!response.ok) process.exitCode = 1;