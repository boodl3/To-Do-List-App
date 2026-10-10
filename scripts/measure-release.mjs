// Measures the Constitution V release gates on the Windows release build (task T116):
//   cold start  = process launch → performance.mark('board-ready') in the webview
//   idle memory = working set of focusboard.exe + its WebView2 processes after 60 s idle
// Runs MEASURE_RUNS times (default 3) and gates on the median: one run swings by ~30 MB.
// Loads tests/fixtures/large-board-50x100.json as the saved board. Refuses to run if the app's
// data folder already exists, so it can never touch a real board.
//
//   node scripts/measure-release.mjs [path\to\focusboard.exe]
import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const exe = process.argv[2] ?? 'src-tauri/target/release/focusboard.exe';
const dataDir = join(process.env.APPDATA, 'app.focusboard.desktop');
const PORT = 9333;
const IDLE_MS = 60_000;
const RUNS = Number(process.env.MEASURE_RUNS ?? 3);

if (existsSync(dataDir)) {
  console.error(`Refusing to run: ${dataDir} exists and may hold a real board.`);
  process.exit(1);
}
const fixture = process.env.MEASURE_FIXTURE ?? 'large-board-50x100';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function processTreeMemory(rootPid) {
  const ps = `
    $all = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, WorkingSetSize, PrivatePageCount, CommandLine
    $ids = @(${rootPid}); $added = $true
    while ($added) { $added = $false
      foreach ($p in $all) { if ($ids -contains $p.ParentProcessId -and -not ($ids -contains $p.ProcessId)) { $ids += $p.ProcessId; $added = $true } } }
    $tree = $all | Where-Object { $ids -contains $_.ProcessId }
    # Task Manager's "Memory" column is the private working set.
    $priv = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Where-Object { $ids -contains $_.IDProcess }
    @{ processes = $tree.Count;
       privateWorkingSetMB = [math]::Round((($priv | Measure-Object WorkingSetPrivate -Sum).Sum) / 1MB);
       workingSetMB = [math]::Round((($tree | Measure-Object WorkingSetSize -Sum).Sum) / 1MB);
       commitMB = [math]::Round((($tree | Measure-Object PrivatePageCount -Sum).Sum) / 1MB);
       byProcess = @($tree | ForEach-Object { $t = $_; $pp = $priv | Where-Object { $_.IDProcess -eq $t.ProcessId };
         $kind = if ($t.CommandLine -like '*--type=*') { (($t.CommandLine -split '--type=')[1] -split ' ')[0] } else { 'main' };
         '{0}={1}MB' -f $kind, [math]::Round($pp.WorkingSetPrivate / 1MB) }) } | ConvertTo-Json -Compress`;
  return JSON.parse(execFileSync('powershell', ['-NoProfile', '-Command', ps]).toString());
}

async function measureOnce() {
  mkdirSync(dataDir);
  if (fixture !== 'none')
    copyFileSync(`tests/fixtures/${fixture}.json`, join(dataDir, 'focusboard.json'));
  const launchedAt = Date.now();
  const app = spawn(exe, [], {
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}`,
    },
    stdio: 'ignore',
  });
  try {
    let browser;
    for (let i = 0; i < 100 && !browser; i++) {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`).catch(() => undefined);
      if (!browser) await sleep(100);
    }
    if (!browser) throw new Error('could not reach the webview on the debugging port');
    // The webview may still be navigating to the app when we attach: retry until the mark exists.
    let page;
    let readyAt;
    for (let i = 0; i < 200 && readyAt === undefined; i++) {
      page = browser
        .contexts()
        .flatMap((c) => c.pages())
        .find((p) => !p.url().startsWith('about:'));
      readyAt = await page
        ?.evaluate(() => {
          const m = performance.getEntriesByName('board-ready')[0];
          return m ? performance.timeOrigin + m.startTime : undefined;
        })
        .catch(() => undefined);
      if (readyAt === undefined) await sleep(50);
    }
    if (readyAt === undefined || !page) throw new Error('board-ready mark never appeared');
    const sections = await page.locator('.react-flow__node').count();
    // Diagnostic: MEASURE_CSS="..." injects a stylesheet before the idle wait.
    if (process.env.MEASURE_CSS) await page.addStyleTag({ content: process.env.MEASURE_CSS });
    await sleep(IDLE_MS);
    const memory = processTreeMemory(app.pid);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const { metrics } = await cdp.send('Performance.getMetrics');
    const jsHeapMB = Math.round(metrics.find((m) => m.name === 'JSHeapUsedSize').value / 2 ** 20);
    await browser.close().catch(() => undefined);
    return {
      coldStartMs: Math.round(readyAt - launchedAt),
      sectionsRendered: sections,
      jsHeapMB,
      ...memory,
    };
  } finally {
    execFileSync('taskkill', ['/PID', String(app.pid), '/T', '/F'], { stdio: 'ignore' });
    await sleep(500);
    // Only ever the folder this script created; WebView2 may hold it briefly after exit.
    rmSync(dataDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
  }
}

const runs = [];
for (let i = 0; i < RUNS; i++) {
  runs.push(await measureOnce());
  console.error(`run ${i + 1}/${RUNS}: ${JSON.stringify(runs.at(-1))}`);
}
const median = (key) => runs.map((r) => r[key]).sort((a, b) => a - b)[Math.floor(RUNS / 2)];
const keys = [
  'coldStartMs',
  'sectionsRendered',
  'jsHeapMB',
  'privateWorkingSetMB',
  'workingSetMB',
  'commitMB',
];
console.log(
  JSON.stringify(
    { fixture, runs: RUNS, median: Object.fromEntries(keys.map((k) => [k, median(k)])) },
    null,
    2,
  ),
);
