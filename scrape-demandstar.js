/**
 * Netlify Function: /api/scrape-demandstar
 * Fetches live solicitations from DemandStar's public API
 */

const axios = require("axios");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
  "Accept": "application/json",
  "Referer": "https://network.demandstar.com/solicitations/search",
  "Origin": "https://network.demandstar.com",
};

const CATEGORY_MAP = {
  "Construction": "Construction & Engineering",
  "Engineering": "Construction & Engineering",
  "Information Technology": "IT & Technology",
  "Technology": "IT & Technology",
  "Professional Services": "Professional Services",
  "Maintenance": "Facilities & Maintenance",
  "Janitorial": "Janitorial & Cleaning",
  "Transportation": "Transportation & Logistics",
  "Healthcare": "Healthcare & Medical",
  "Architecture": "Architecture & Design",
  "Environmental": "Environmental & Utilities",
  "Security": "Security & Safety",
  "Food": "Food & Catering",
  "Education": "Education & Training",
};

function mapCat(raw = "") {
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return raw || "Other / General";
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const results = [];

  try {
    const payload = {
      query: "",
      filters: { status: ["Active"] },
      sort: { field: "postedDate", direction: "desc" },
      pagination: { page: 1, pageSize: 50 },
    };

    const res = await axios.post(
      "https://network.demandstar.com/api/solicitations/search",
      payload,
      { headers: { ...HEADERS, "Content-Type": "application/json" }, timeout: 9000 }
    );

    const items = res.data?.results || res.data?.solicitations || res.data?.data || [];

    items.forEach(item => {
      const deadline = item.dueDate || item.responseDeadline || item.closingDate || "";
      const posted = item.postedDate || item.publishedDate || "";
      const valueNum = parseFloat(item.estimatedValue) || 0;

      results.push({
        id: `ds-${item.id || item.solicitationId}`,
        title: item.title || item.name || "",
        agency: item.agencyName || item.organization || "",
        state: item.state || item.agencyState || "",
        source: "DemandStar",
        sourceUrl: "https://network.demandstar.com/solicitations/search",
        fullUrl: item.url || `https://network.demandstar.com/solicitation/${item.id}`,
        rfpNum: item.solicitationNumber || String(item.id || ""),
        posted: posted ? new Date(posted).toISOString().split("T")[0] : "",
        deadline: deadline ? new Date(deadline).toISOString().split("T")[0] : "",
        value: valueNum ? `$${valueNum.toLocaleString()}` : "See listing",
        valueNum,
        description: (item.description || item.summary || item.synopsis || "").slice(0, 500),
        tags: [item.category, item.subCategory, item.state].filter(Boolean),
        contact: item.contactEmail || item.buyerEmail || "",
        category: mapCat(item.category || item.commodity || ""),
        naicsCode: item.naicsCode || "",
      });
    });
  } catch (err) {
    console.error("DemandStar error:", err.message);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ source: "DemandStar", count: results.length, results, error: results.length === 0 ? "No results or API unreachable" : undefined }),
  };
};
