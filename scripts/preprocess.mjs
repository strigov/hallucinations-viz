import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { parse } from 'csv-parse/sync';

const raw = readFileSync('data/Charlotin-hallucination_cases.csv', 'utf-8');
const records = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });

// Normalize
const cases = records.map((r, i) => {
  const date = r['Date'] || '';
  const year = date ? date.split('-')[0] : '';
  const month = date ? date.split('-').slice(0,2).join('-') : '';

  // Parse hallucination items
  const hallItems = (r['Hallucination Items'] || '').split('||').filter(Boolean).map(s => {
    const t = s.trim();
    const colonIdx = t.indexOf(':');
    if (colonIdx > -1) {
      return { type: t.substring(0, colonIdx).trim(), detail: t.substring(colonIdx + 1).trim() };
    }
    return { type: 'Unknown', detail: t };
  });

  // Normalize AI tool
  let aiTool = (r['AI Tool'] || '').trim();
  if (!aiTool || aiTool.toLowerCase() === 'implied' || aiTool.toLowerCase() === 'impled' || aiTool.toLowerCase() === 'implied (by me)') aiTool = 'Implied/Unknown';
  if (aiTool.toLowerCase() === 'unidentified' || aiTool.toLowerCase() === 'unknown') aiTool = 'Implied/Unknown';

  // Normalize country
  let country = (r['State(s)'] || '').trim();

  // Normalize party
  let party = (r['Party(ies)'] || '').trim();
  if (party.includes(';')) party = party.split(';')[0].trim();

  // Normalize outcome
  let outcome = (r['Outcome'] || '').trim();
  const outLower = outcome.toLowerCase();
  let outcomeCategory = 'Other';
  if (outLower.includes('warning') || outLower.includes('admonish') || outLower.includes('caution') || outLower.includes('reprimand')) outcomeCategory = 'Warning/Admonishment';
  else if (outLower.includes('monetary') || outLower.includes('fine') || outLower.includes('costs') || (outLower.includes('sanction') && outLower.includes('money'))) outcomeCategory = 'Monetary Sanction';
  else if (outLower.includes('bar referral') || outLower.includes('referral') || outLower.includes('disciplin')) outcomeCategory = 'Bar Referral';
  else if (outLower.includes('show cause') || outLower.includes('osc')) outcomeCategory = 'Show Cause Order';
  else if (outLower.includes('struck') || outLower.includes('stricken') || outLower.includes('striking')) outcomeCategory = 'Filing Struck';
  else if (outLower.includes('dismiss')) outcomeCategory = 'Case Dismissed';
  else if (outLower.includes('ignore') || outLower.includes('disregard') || outLower.includes('reject')) outcomeCategory = 'Arguments Ignored';
  else if (outLower.includes('cle') || outLower.includes('education')) outcomeCategory = 'CLE Requirement';
  else if (!outcome) outcomeCategory = 'Pending/Unknown';

  // Parse monetary penalty
  let penaltyAmount = 0;
  const penalty = (r['Monetary Penalty'] || '').trim();
  if (penalty) {
    const nums = penalty.match(/[\d,]+/);
    if (nums) penaltyAmount = parseInt(nums[0].replace(/,/g, ''));
  }

  return {
    id: i,
    name: r['Case Name'] || '',
    court: r['Court'] || '',
    country,
    date,
    year,
    month,
    party,
    aiTool,
    hallItems,
    hallCount: hallItems.length,
    outcome,
    outcomeCategory,
    penaltyAmount,
    hasPenalty: penaltyAmount > 0,
    hasSanction: (r['Professional Sanction'] || '').trim().toLowerCase() === 'yes',
    source: r['Source'] || '',
    details: r['Details'] || '',
  };
});

// Aggregations
const byYear = {};
const byMonth = {};
const byCountry = {};
const byAiTool = {};
const byParty = {};
const byOutcome = {};
const byHallType = {};

cases.forEach(c => {
  byYear[c.year] = (byYear[c.year] || 0) + 1;
  if (c.month) byMonth[c.month] = (byMonth[c.month] || 0) + 1;
  byCountry[c.country] = (byCountry[c.country] || 0) + 1;

  // Bucket AI tools
  let toolBucket = c.aiTool;
  if (toolBucket.toLowerCase().includes('chatgpt') || toolBucket.toLowerCase().includes('gpt')) toolBucket = 'ChatGPT/GPT';
  else if (toolBucket.toLowerCase().includes('copilot') || toolBucket.toLowerCase().includes('co-pilot')) toolBucket = 'Microsoft Copilot';
  else if (toolBucket.toLowerCase().includes('claude')) toolBucket = 'Claude';
  else if (toolBucket.toLowerCase().includes('gemini') || toolBucket.toLowerCase().includes('bard') || toolBucket.toLowerCase().includes('google')) toolBucket = 'Google (Gemini/Bard)';
  else if (toolBucket.toLowerCase().includes('cocounsel') || toolBucket.toLowerCase().includes('westlaw')) toolBucket = 'Legal AI (CoCounsel/Westlaw)';
  else if (toolBucket.toLowerCase().includes('lexis')) toolBucket = 'Legal AI (LexisNexis)';
  else if (toolBucket === 'Implied/Unknown') toolBucket = 'Implied/Unknown';
  else toolBucket = 'Other';

  byAiTool[toolBucket] = (byAiTool[toolBucket] || 0) + 1;
  byParty[c.party] = (byParty[c.party] || 0) + 1;
  byOutcome[c.outcomeCategory] = (byOutcome[c.outcomeCategory] || 0) + 1;
  c.hallItems.forEach(h => {
    byHallType[h.type] = (byHallType[h.type] || 0) + 1;
  });
});

// Monthly timeline sorted
const timeline = Object.entries(byMonth)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, count]) => {
    // cumulative
    return { month, count };
  });

let cumulative = 0;
timeline.forEach(t => {
  cumulative += t.count;
  t.cumulative = cumulative;
});

// Penalty analytics
const casesWithPenalty = cases.filter(c => c.penaltyAmount > 0);
const penaltyAmounts = casesWithPenalty.map(c => c.penaltyAmount).sort((a, b) => a - b);
const totalPenaltySum = penaltyAmounts.reduce((s, v) => s + v, 0);
const avgPenalty = penaltyAmounts.length ? Math.round(totalPenaltySum / penaltyAmounts.length) : 0;
const medianPenalty = penaltyAmounts.length
  ? penaltyAmounts.length % 2 === 0
    ? Math.round((penaltyAmounts[penaltyAmounts.length / 2 - 1] + penaltyAmounts[penaltyAmounts.length / 2]) / 2)
    : penaltyAmounts[Math.floor(penaltyAmounts.length / 2)]
  : 0;
const minPenalty = penaltyAmounts.length ? penaltyAmounts[0] : 0;
const maxPenalty = penaltyAmounts.length ? penaltyAmounts[penaltyAmounts.length - 1] : 0;

// Penalty distribution buckets
const penaltyBuckets = [
  { range: '<$500', min: 0, max: 500 },
  { range: '$500–$1K', min: 500, max: 1000 },
  { range: '$1K–$5K', min: 1000, max: 5000 },
  { range: '$5K–$10K', min: 5000, max: 10000 },
  { range: '$10K–$25K', min: 10000, max: 25000 },
  { range: '$25K–$50K', min: 25000, max: 50000 },
  { range: '$50K–$100K', min: 50000, max: 100000 },
  { range: '$100K+', min: 100000, max: Infinity },
];
const penaltyRanges = penaltyBuckets.map(b => ({
  range: b.range,
  count: casesWithPenalty.filter(c => c.penaltyAmount >= b.min && c.penaltyAmount < b.max).length,
})).filter(b => b.count > 0);

// Top 15 penalties
const topPenalties = [...casesWithPenalty]
  .sort((a, b) => b.penaltyAmount - a.penaltyAmount)
  .slice(0, 15)
  .map(c => ({ name: c.name, country: c.country, date: c.date, amount: c.penaltyAmount, party: c.party, outcomeCategory: c.outcomeCategory }));

// Penalty by year
const penaltyByYearMap = {};
casesWithPenalty.forEach(c => {
  penaltyByYearMap[c.year] = (penaltyByYearMap[c.year] || 0) + c.penaltyAmount;
});
const penaltyByYear = Object.entries(penaltyByYearMap).sort(([a],[b]) => a.localeCompare(b)).map(([year, total]) => ({ year, total }));

const data = {
  totalCases: cases.length,
  totalHallucinations: cases.reduce((s, c) => s + c.hallCount, 0),
  totalPenalties: cases.filter(c => c.hasPenalty).length,
  totalSanctions: cases.filter(c => c.hasSanction).length,
  totalPenaltySum,
  avgPenalty,
  medianPenalty,
  minPenalty,
  maxPenalty,
  penaltyRanges,
  topPenalties,
  penaltyByYear,
  byYear: Object.entries(byYear).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => ({ year: k, count: v })),
  timeline,
  byCountry: Object.entries(byCountry).sort((a,b) => b[1] - a[1]).map(([k,v]) => ({ country: k, count: v })),
  byAiTool: Object.entries(byAiTool).sort((a,b) => b[1] - a[1]).map(([k,v]) => ({ tool: k, count: v })),
  byParty: Object.entries(byParty).filter(([k]) => k).sort((a,b) => b[1] - a[1]).map(([k,v]) => ({ party: k, count: v })),
  byOutcome: Object.entries(byOutcome).sort((a,b) => b[1] - a[1]).map(([k,v]) => ({ outcome: k, count: v })),
  byHallType: Object.entries(byHallType).sort((a,b) => b[1] - a[1]).map(([k,v]) => ({ type: k, count: v })),
  // Top cases with largest hallucination count
  topCases: cases
    .sort((a,b) => b.hallCount - a.hallCount)
    .slice(0, 20)
    .map(c => ({ name: c.name, country: c.country, date: c.date, hallCount: c.hallCount, outcomeCategory: c.outcomeCategory, party: c.party })),
  // Recent cases
  recentCases: cases
    .filter(c => c.date)
    .sort((a,b) => b.date.localeCompare(a.date))
    .slice(0, 15)
    .map(c => ({ name: c.name, country: c.country, date: c.date, hallCount: c.hallCount, outcomeCategory: c.outcomeCategory, party: c.party, aiTool: c.aiTool })),
};

mkdirSync('src/lib', { recursive: true });
writeFileSync('src/lib/data.json', JSON.stringify(data, null, 2));
console.log('Done. Cases:', data.totalCases, 'Hallucinations:', data.totalHallucinations);
