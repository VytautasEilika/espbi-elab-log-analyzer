import fs from 'fs';
import path from 'path';
import { 
  parseLogData, 
  groupEntriesByRequest, 
  calculateStats, 
  formatDuration,
  RequestGroup 
} from '../lib/log-parser';

import { 
  generateHtmlReport, 
  generateTextSummary 
} from '../lib/report-utils';

function printUsage() {
  console.log(`
Usage: npx tsx scripts/log-report.ts <logfile> [options]

Options:
  --json           Output report in JSON format
  --html           Output report in HTML format
  --errors-only    Only include requests with errors
  --out <file>     Write report to file instead of stdout
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const logFilePath = args[0];
  const isJson = args.includes('--json');
  const isHtml = args.includes('--html');
  const errorsOnly = args.includes('--errors-only');
  const outIndex = args.indexOf('--out');
  const outFile = outIndex !== -1 ? args[outIndex + 1] : null;

  if (!fs.existsSync(logFilePath)) {
    console.error(`Error: File not found: ${logFilePath}`);
    process.exit(1);
  }

  const logData = fs.readFileSync(logFilePath, 'utf-8');
  const entries = parseLogData(logData);
  let groups = groupEntriesByRequest(entries);
  const stats = calculateStats(entries);

  if (errorsOnly) {
    groups = groups.filter(g => g.hasErrors);
  }

  let output = '';

  if (isJson) {
    output = JSON.stringify({
      summary: stats,
      requests: groups
    }, null, 2);
  } else if (isHtml) {
    output = generateHtmlReport(logFilePath, stats, groups);
  } else {
    // Basic text report for stdout if no format specified
    output = generateTextSummary(logFilePath, stats, groups);
  }

  if (outFile) {
    fs.writeFileSync(outFile, output);
    console.log(`Report written to ${outFile}`);
  } else {
    console.log(output);
  }
}

main().catch(console.error);
