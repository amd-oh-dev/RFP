/**
 * Netlify Function: /api/scrape-sam
 * Fetches live RFPs from SAM.gov's free public API
 */

const axios = require("axios");

const BASE = "https://api.sam.gov/prod/opportunities/v2/search";

const NAICS_CATS = {
  "23": "Construction & Engineering",
  "54": "Professional Services",
  "51": "IT & Technology",
  "56": "Facilities & Maintenance",
  "48": "Transportation & Logistics",
  "62": "Healthcare & Medical",
  "61": "Education & Training",
  "72": "Food & Catering",
};

function naicsCat(code = "") {
  return NAICS_CATS[String(code).slice(0, 2)] || "Other / General";
}

function inferCategory(title = "", desc = "") {
  const text = (title + " " + desc).toLowerCase();
  const cats = [
    { cat: "Construction & Engineering", kw: ["construction","paving","roadway","bridge","concrete","masonry"] },
    { cat: "IT & Technology", kw: ["software","erp","saas","helpdesk","cyber","network","cloud","database"] },
    { cat: "HVAC & Mechanical", kw: ["hvac","mechanical","boiler","chiller","heating","cooling","plumbing"] },
    { cat: "Architecture & Design", kw: ["architect","design","ae service","leed","structural engineer"] },
    { cat: "Environmental & Utilities", kw: ["environmental","remediat","brownfield","wastewater","hazardous"] },
    { cat: "Security & Safety", kw: ["security","camera","surveillance","access control","fire alarm"] },
    { cat: "Janitorial & Cleaning", kw: ["janitor","cleaning","custodial","housekeeping"] },
    { cat: "Healthcare & Medical", kw: ["medical","healthcare","clinical","pharmacy","dental"] },
    { cat: "Transportation & Logistics", kw: ["transportation","transit","bus","fleet","vehicle","logistics"] },
    { cat: "Facilities & Maintenance", kw: ["facilities","maintenance","repair","grounds","landscaping"] },
  ];
  for (const { cat, kw } of cats) {
    if (kw.some(k => text.includes(k))) return cat;
  }
  return "Other / General";
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
    const today = new Date();
    const postedFrom = new Date(today - 30 * 86400000)
      .toISOString().split("T")[0].replace(/-/g, "/");
    const postedTo = today.toISOString().split("T")[0].replace(/-/g, "/");

    const params = {
      limit: 100,
      offset: 0,
      postedFrom,
      postedTo,
      ptype: "o,k,r,s",
      active: "Yes",
    };

    // Add API key if provided in env
    if (process.env.SAM_API_KEY) {
      params.api_key = process.env.SAM_API_KEY;
    }

    const res = await axios.get(BASE, { params, timeout: 9000 });
    const opps = res.data?.opportunitiesData || [];

    const results = opps.map(opp => {
      const deadline = opp.responseDeadLine
        ? new Date(opp.responseDeadLine).toISOString().split("T")[0]
        : opp.archiveDate
          ? new Date(opp.archiveDate).toISOString().split("T")[0]
          : "";

      const valueNum = parseFloat(opp.award?.amount || opp.baseAndAllOptionsValue) || 0;

      return {
        id: `sam-${opp.noticeId}`,
        title: opp.title || "",
        agency: opp.fullParentPathName || opp.organizationName || "",
        state: opp.placeOfPerformance?.state?.code || "Federal",
        source: "SAM.gov (Federal)",
        sourceUrl: "https://sam.gov/search/?index=opp&sort=-modifiedDate",
        fullUrl: `https://sam.gov/opp/${opp.noticeId}/view`,
        rfpNum: opp.solicitationNumber || opp.noticeId || "",
        posted: opp.postedDate ? new Date(opp.postedDate).toISOString().split("T")[0] : "",
        deadline,
        value: valueNum ? `$${valueNum.toLocaleString()}` : "See listing",
        valueNum,
        description: (opp.description || "").slice(0, 500),
        tags: [opp.naicsCode, opp.typeOfSetAsideDescription].filter(Boolean),
        contact: opp.pointOfContact?.[0]?.email || "",
        naicsCode: opp.naicsCode || "",
        setAside: opp.typeOfSetAsideDescription || "",
        category: naicsCat(opp.naicsCode) !== "Other / General"
          ? naicsCat(opp.naicsCode)
          : inferCategory(opp.title, opp.description),
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ source: "SAM.gov", count: results.length, results }),
    };
  } catch (err) {
    console.error("SAM.gov error:", err.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ source: "SAM.gov", count: 0, results: [], error: err.message }),
    };
  }
};
