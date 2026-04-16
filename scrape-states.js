/**
 * Netlify Function: /api/scrape-states
 * Scrapes OH, TX, CA, FL, NY state procurement portals
 */

const axios = require("axios");
const cheerio = require("cheerio");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
  "Accept": "text/html,*/*",
};

function parseDate(str = "") {
  if (!str) return "";
  try {
    const d = new Date(str.replace(/(\d+)\/(\d+)\/(\d+)/, "$3-$1-$2"));
    return isNaN(d) ? "" : d.toISOString().split("T")[0];
  } catch { return ""; }
}

function makeRow(fields) {
  return {
    id: `state-${fields.state.toLowerCase().replace(/\s/g,"-")}-${fields.rfpNum || Math.random().toString(36).slice(2,7)}`,
    posted: new Date().toISOString().split("T")[0],
    value: "See listing", valueNum: 0,
    tags: [fields.state, "State Portal"],
    contact: "",
    category: "",
    source: "State Portal",
    ...fields,
    description: fields.description || `${fields.title}${fields.agency ? ` — ${fields.agency}` : ""}. Visit the source link for full specifications.`,
  };
}

async function scrapeOhio() {
  const results = [];
  try {
    const res = await axios.get("https://procure.ohio.gov/proc/viewOpenOpportunities.do", { headers: HEADERS, timeout: 8000 });
    const $ = cheerio.load(res.data);
    $("table tbody tr").each((i, el) => {
      if (i > 30) return false;
      const cells = $(el).find("td");
      const title = cells.eq(1).text().trim();
      if (!title || title.length < 5) return;
      const href = $(el).find("a").attr("href") || "";
      results.push(makeRow({
        title, state: "Ohio",
        agency: cells.eq(2).text().trim(),
        rfpNum: cells.eq(0).text().trim(),
        deadline: parseDate(cells.eq(4).text().trim()),
        sourceUrl: "https://procure.ohio.gov",
        fullUrl: href.startsWith("http") ? href : `https://procure.ohio.gov${href}`,
      }));
    });
  } catch (e) { console.error("Ohio:", e.message); }
  return results;
}

async function scrapeTexas() {
  const results = [];
  try {
    const res = await axios.get(
      "https://esbd.hhs.texas.gov/bid_ads/search_results.cfm?cat=all&agencyid=all&view=all",
      { headers: HEADERS, timeout: 8000 }
    );
    const $ = cheerio.load(res.data);
    $("table tbody tr, .result-row").each((i, el) => {
      if (i > 30) return false;
      const row = $(el);
      const title = row.find("td:nth-child(2) a, .title a").text().trim();
      if (!title || title.length < 5) return;
      const href = row.find("a").first().attr("href") || "";
      results.push(makeRow({
        title, state: "Texas",
        agency: row.find("td:nth-child(3)").text().trim(),
        rfpNum: row.find("td:nth-child(1)").text().trim(),
        deadline: parseDate(row.find("td:nth-child(5)").text().trim()),
        sourceUrl: "https://esbd.hhs.texas.gov",
        fullUrl: href.startsWith("http") ? href : `https://esbd.hhs.texas.gov${href}`,
      }));
    });
  } catch (e) { console.error("Texas:", e.message); }
  return results;
}

async function scrapeCalif() {
  const results = [];
  try {
    const res = await axios.get("https://caleprocure.ca.gov/pages/Events-BS3/event-search.aspx", { headers: HEADERS, timeout: 8000 });
    const $ = cheerio.load(res.data);
    $("table tbody tr").each((i, el) => {
      if (i > 30) return false;
      const row = $(el);
      const title = row.find("a").first().text().trim() || row.find("td:nth-child(2)").text().trim();
      if (!title || title.length < 5) return;
      const href = row.find("a").first().attr("href") || "";
      results.push(makeRow({
        title, state: "California",
        agency: row.find("td:nth-child(3)").text().trim(),
        rfpNum: row.find("td:nth-child(1)").text().trim(),
        deadline: parseDate(row.find("td:nth-child(6)").text().trim()),
        sourceUrl: "https://caleprocure.ca.gov",
        fullUrl: href.startsWith("http") ? href : `https://caleprocure.ca.gov${href}`,
      }));
    });
  } catch (e) { console.error("California:", e.message); }
  return results;
}

async function scrapeFlorida() {
  const results = [];
  try {
    const res = await axios.get("https://vendor.myfloridamarketplace.com/search/bids", { headers: HEADERS, timeout: 8000 });
    const $ = cheerio.load(res.data);
    $("table tbody tr, .bid-item").each((i, el) => {
      if (i > 25) return false;
      const row = $(el);
      const title = row.find("a").first().text().trim() || row.find("td:nth-child(2)").text().trim();
      if (!title || title.length < 5) return;
      const href = row.find("a").first().attr("href") || "";
      results.push(makeRow({
        title, state: "Florida",
        agency: row.find("td:nth-child(3)").text().trim(),
        deadline: parseDate(row.find("td:nth-child(5)").text().trim()),
        sourceUrl: "https://vendor.myfloridamarketplace.com",
        fullUrl: href.startsWith("http") ? href : `https://vendor.myfloridamarketplace.com${href}`,
      }));
    });
  } catch (e) { console.error("Florida:", e.message); }
  return results;
}

async function scrapeNewYork() {
  const results = [];
  try {
    const res = await axios.get("https://www.ogs.ny.gov/procurement/priorContractNotices.asp", { headers: HEADERS, timeout: 8000 });
    const $ = cheerio.load(res.data);
    $("table tbody tr").each((i, el) => {
      if (i > 25) return false;
      const row = $(el);
      const title = row.find("a").first().text().trim() || row.find("td:nth-child(2)").text().trim();
      if (!title || title.length < 5) return;
      const href = row.find("a").first().attr("href") || "";
      results.push(makeRow({
        title, state: "New York",
        agency: row.find("td:nth-child(3)").text().trim(),
        deadline: parseDate(row.find("td:nth-child(5)").text().trim()),
        sourceUrl: "https://www.ogs.ny.gov",
        fullUrl: href.startsWith("http") ? href : `https://www.ogs.ny.gov${href}`,
      }));
    });
  } catch (e) { console.error("New York:", e.message); }
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

  try {
    const [oh, tx, ca, fl, ny] = await Promise.all([
      scrapeOhio(), scrapeTexas(), scrapeCalif(), scrapeFlorida(), scrapeNewYork()
    ]);
    const results = [...oh, ...tx, ...ca, ...fl, ...ny];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ source: "State Portals", count: results.length, results }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ source: "State Portals", count: 0, results: [], error: err.message }),
    };
  }
};
