/**
 * Netlify Function: /api/scrape-bidnet
 * Scrapes public BidNet Direct state portal listings
 */

const axios = require("axios");
const cheerio = require("cheerio");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
  "Accept": "text/html,application/json,*/*",
  "Accept-Language": "en-US,en;q=0.9",
};

const STATE_PORTALS = [
  { state: "Ohio", slug: "ohio" },
  { state: "Michigan", slug: "michigan" },
  { state: "Pennsylvania", slug: "pennsylvania" },
  { state: "New York", slug: "new-york" },
  { state: "Texas", slug: "texas" },
  { state: "Florida", slug: "florida" },
  { state: "Georgia", slug: "georgia" },
  { state: "Illinois", slug: "illinois" },
  { state: "Virginia", slug: "virginia" },
  { state: "North Carolina", slug: "north-carolina" },
];

function parseDate(str = "") {
  if (!str) return "";
  try {
    const d = new Date(str.replace(/(\d+)\/(\d+)\/(\d+)/, "$3-$1-$2"));
    return isNaN(d) ? "" : d.toISOString().split("T")[0];
  } catch { return ""; }
}

async function scrapePortal({ state, slug }) {
  const url = `https://www.bidnetdirect.com/${slug}`;
  const results = [];
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 8000 });
    const $ = cheerio.load(res.data);

    $(".bid-listing, .opportunity-row, tr.bid-row, .bids-table tbody tr, table tbody tr").each((i, el) => {
      if (i > 25) return false;
      const row = $(el);
      const title = row.find(".bid-title, .title, td:nth-child(2) a").text().trim()
        || row.find("a").first().text().trim();
      const agency = row.find(".agency, .organization, td:nth-child(3)").text().trim();
      const deadline = row.find(".deadline, .due-date, td:nth-child(5)").text().trim();
      const rfpNum = row.find(".bid-number, td:nth-child(1)").text().trim();
      const href = row.find("a").first().attr("href") || "";
      if (!title || title.length < 5) return;

      results.push({
        id: `bidnet-${slug}-${rfpNum || i}`,
        title, agency, state,
        source: "BidNet Direct",
        sourceUrl: url,
        fullUrl: href.startsWith("http") ? href : `https://www.bidnetdirect.com${href}`,
        rfpNum,
        posted: new Date().toISOString().split("T")[0],
        deadline: parseDate(deadline),
        value: "See listing", valueNum: 0,
        description: `${title}${agency ? ` — solicited by ${agency}` : ""}. Visit the source link for full specifications and submission requirements.`,
        tags: [state, "BidNet", "Local Government"].filter(Boolean),
        contact: "",
        category: "",
      });
    });
  } catch (err) {
    console.error(`BidNet ${state} error:`, err.message);
  }
  return results;
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Only scrape a few states per call to stay within the 10s timeout
  // The frontend will call this multiple times or accept partial results
  const params = event.queryStringParameters || {};
  const stateFilter = params.state;
  const portals = stateFilter
    ? STATE_PORTALS.filter(p => p.state === stateFilter)
    : STATE_PORTALS.slice(0, 4); // 4 states per call max

  try {
    const batches = await Promise.all(portals.map(scrapePortal));
    const results = batches.flat();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ source: "BidNet Direct", count: results.length, results }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ source: "BidNet Direct", count: 0, results: [], error: err.message }),
    };
  }
};
