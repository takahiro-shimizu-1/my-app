#!/usr/bin/env tsx

import { spawn } from 'child_process';

async function main() {
  const args = process.argv.slice(2);
  const issues = readListFlag(args, '--issues');
  const singleIssue = readFlag(args, '--issue');
  const dryRun = args.includes('--dry-run');
  const issueNumbers = issues.length > 0 ? issues : singleIssue ? [singleIssue] : [];

  if (issueNumbers.length === 0) {
    console.error('Usage: npm run agents:parallel:exec -- --issue <number> [--dry-run]');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY && !dryRun) {
    console.error('ANTHROPIC_API_KEY is required for autonomous execution. Use --dry-run to validate only.');
    process.exit(1);
  }

  for (const issue of issueNumbers) {
    const status = await runPipeline(issue, dryRun);
    if (status !== 0) {
      process.exit(status);
    }
  }
}

async function runPipeline(issueNumber: string, dryRun: boolean) {
  const commandArgs = ['miyabi', 'pipeline', '--preset', 'full-cycle', '--issue', issueNumber];
  if (dryRun) {
    commandArgs.push('--dry-run');
  }

  console.log(`Running Miyabi full-cycle pipeline for issue #${issueNumber}`);
  return new Promise<number>((resolve) => {
    const child = spawn('npx', commandArgs, {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => resolve(code ?? 1));
  });
}

function readFlag(args: string[], flag: string) {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1]) {
    return args[index + 1];
  }

  return '';
}

function readListFlag(args: string[], flag: string) {
  const value = readFlag(args, flag);
  return value ? value.split(',').map((entry) => entry.trim()).filter(Boolean) : [];
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
