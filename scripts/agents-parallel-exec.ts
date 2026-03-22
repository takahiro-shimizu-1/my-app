#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Octokit } from '@octokit/rest';

interface RepoInfo {
  owner: string;
  repo: string;
}

interface VerificationResult {
  command: string;
  success: boolean;
  output: string;
}

interface AutomationResult {
  issueNumber: number;
  branchName?: string;
  prNumber?: number;
  prUrl?: string;
  verification: VerificationResult[];
  summary: string;
}

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

  const token = await resolveGitHubToken();
  const repo = await resolveRepoInfo();
  const octokit = new Octokit({ auth: token });

  await ensureLogsDirectory();

  for (const issue of issueNumbers) {
    const issueNumber = parseInt(issue, 10);
    if (Number.isNaN(issueNumber) || issueNumber <= 0) {
      throw new Error(`Invalid issue number: ${issue}`);
    }

    try {
      const result = await runPipeline({
        octokit,
        repo,
        issueNumber,
        dryRun,
        token,
      });
      await writeResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await writeResult({
        issueNumber,
        verification: [],
        summary: message,
      });
      throw error;
    }
  }
}

async function runPipeline(input: {
  octokit: Octokit;
  repo: RepoInfo;
  issueNumber: number;
  dryRun: boolean;
  token: string;
}): Promise<AutomationResult> {
  const { octokit, repo, issueNumber, dryRun, token } = input;
  const issue = await octokit.issues.get({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issueNumber,
  });
  const defaultBranch = await resolveDefaultBranch(octokit, repo);
  const branchName = `agent/issue-${issueNumber}-${Date.now()}`;

  if (!dryRun) {
    await ensureCleanWorktree();
    await ensureClaudeAuth();
  }

  await syncIssueLabels(octokit, repo, issueNumber, {
    add: ['🤖 system:automation'],
    remove: ['❌ agent:failed', '🚨 escalated', '🤖agent-execute'],
  });

  await runStateCommand('assign-agent', ['--issue', String(issueNumber), '--agent', 'coordinator'], token);
  await runStateCommand(
    'transition',
    ['--issue', String(issueNumber), '--to', 'analyzing', '--reason', 'Local Claude Code runner started issue analysis.'],
    token,
  );
  await createIssueComment(
    octokit,
    repo,
    issueNumber,
    `## Autonomous execution started

This issue is now being processed on the local PC runner with Claude Code.

- Runner mode: self-hosted local PC
- Trigger issue: #${issueNumber}
- Branch target: \`${branchName}\`

The automation will update labels and open a draft PR if implementation succeeds.`,
  );

  if (dryRun) {
    return {
      issueNumber,
      branchName,
      verification: [],
      summary: 'Dry run completed. No code changes were made.',
    };
  }

  await runStateCommand('assign-agent', ['--issue', String(issueNumber), '--agent', 'codegen'], token);
  await runStateCommand(
    'transition',
    ['--issue', String(issueNumber), '--to', 'implementing', '--reason', 'Claude Code is implementing the issue on the local runner.'],
    token,
  );

  await runCommand('git', ['fetch', 'origin', defaultBranch]);
  await runCommand('git', ['checkout', '-b', branchName, `origin/${defaultBranch}`]);

  try {
    const claudeSummary = await runClaude(issue.data.number, issue.data.title, issue.data.body ?? '');
    const changedFiles = await getChangedFiles();

    if (changedFiles.length === 0) {
      throw new Error('Claude Code completed without producing any repository changes.');
    }

    const verification = await runVerificationSuite();
    const failedChecks = verification.filter((entry) => !entry.success);
    if (failedChecks.length > 0) {
      const failedList = failedChecks.map((entry) => `- \`${entry.command}\``).join('\n');
      throw new Error(`Verification failed:\n${failedList}`);
    }

    await configureAutomationGitIdentity();
    await runCommand('git', ['add', '-A']);
    await runCommand('git', ['commit', '-m', buildCommitMessage(issue.data.title, issueNumber)]);
    await runCommand('git', ['push', 'origin', `HEAD:${branchName}`]);

    const pr = await octokit.pulls.create({
      owner: repo.owner,
      repo: repo.repo,
      title: buildPrTitle(issue.data.title, issueNumber),
      head: branchName,
      base: defaultBranch,
      draft: true,
      body: buildPrBody(issue.data.title, issueNumber, claudeSummary, verification, changedFiles),
    });

    await syncIssueLabels(octokit, repo, issueNumber, {
      add: ['👀 needs-review'],
      remove: ['❌ agent:failed', '🚨 escalated'],
    });
    await octokit.issues.addLabels({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: pr.data.number,
      labels: ['👀 needs-review', '🤖 system:automation'],
    });

    await runStateCommand('assign-agent', ['--issue', String(issueNumber), '--agent', 'review'], token);
    await runStateCommand(
      'transition',
      ['--issue', String(issueNumber), '--to', 'reviewing', '--reason', `Draft PR #${pr.data.number} was created by the local runner.`],
      token,
    );

    await createIssueComment(
      octokit,
      repo,
      issueNumber,
      `## Autonomous execution complete

- Branch: \`${branchName}\`
- Pull Request: ${pr.data.html_url}
- Changed files: ${changedFiles.length}

### Verification
${verification.map((entry) => `- ${entry.success ? 'OK' : 'FAIL'} \`${entry.command}\``).join('\n')}

### Claude summary
${claudeSummary}`,
    );

    return {
      issueNumber,
      branchName,
      prNumber: pr.data.number,
      prUrl: pr.data.html_url,
      verification,
      summary: claudeSummary,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await syncIssueLabels(octokit, repo, issueNumber, {
      add: ['❌ agent:failed', '🚨 escalated'],
      remove: ['👀 needs-review'],
    });
    await runStateCommand(
      'transition',
      ['--issue', String(issueNumber), '--to', 'failed', '--reason', truncateForReason(message)],
      token,
    ).catch(() => undefined);
    await createIssueComment(
      octokit,
      repo,
      issueNumber,
      `## Autonomous execution failed

${message}

The issue has been escalated for manual review on the local runner.`,
    );
    throw error;
  }
}

async function runClaude(issueNumber: number, title: string, body: string) {
  const prompt = `You are operating inside the my-app repository.

Implement GitHub issue #${issueNumber}: ${title}

Issue body:
${body || '(no body provided)'}

Instructions:
- Follow the repository guidance in CLAUDE.md and README.md.
- Make the smallest correct change that resolves the issue.
- You may inspect files, edit files, and run verification commands as needed.
- Do not create git commits, git branches, or pull requests.
- Leave all code changes in the working tree for the caller to commit.
- If the issue is unclear, infer the safest minimal implementation and document it in your final summary.
- Finish by printing a short markdown section with headings "Summary" and "Checks".
`;

  const output = await captureCommand('claude', ['-p', '--dangerously-skip-permissions', prompt], {
    env: process.env,
  });
  return output.trim();
}

async function runVerificationSuite(): Promise<VerificationResult[]> {
  const checks = ['npm run typecheck', 'npm run lint', 'npm run build'];
  const results: VerificationResult[] = [];

  for (const command of checks) {
    const [bin, ...args] = shellWords(command);
    try {
      const output = await captureCommand(bin, args, { env: process.env });
      results.push({
        command,
        success: true,
        output,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        command,
        success: false,
        output: message,
      });
    }
  }

  return results;
}

async function runStateCommand(action: 'transition' | 'assign-agent', args: string[], token: string) {
  const scriptArgs = ['tsx', 'scripts/label-state-machine.ts', action, ...args];
  await runCommand(npxCommand(), scriptArgs, {
    env: {
      ...process.env,
      GITHUB_TOKEN: token,
      GH_TOKEN: token,
    },
  });
}

async function createIssueComment(octokit: Octokit, repo: RepoInfo, issueNumber: number, body: string) {
  await octokit.issues.createComment({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issueNumber,
    body,
  });
}

async function syncIssueLabels(
  octokit: Octokit,
  repo: RepoInfo,
  issueNumber: number,
  labels: { add?: string[]; remove?: string[] },
) {
  for (const name of labels.remove ?? []) {
    try {
      await octokit.issues.removeLabel({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: issueNumber,
        name,
      });
    } catch {
      // ignore missing labels
    }
  }

  if ((labels.add ?? []).length > 0) {
    await octokit.issues.addLabels({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: issueNumber,
      labels: labels.add ?? [],
    });
  }
}

async function resolveGitHubToken() {
  for (const key of ['GITHUB_TOKEN', 'GH_TOKEN']) {
    if (process.env[key]) {
      return process.env[key]!;
    }
  }

  const token = await captureCommand('gh', ['auth', 'token']);
  return token.trim();
}

async function resolveRepoInfo(): Promise<RepoInfo> {
  const envRepo = process.env.GITHUB_REPOSITORY;
  if (envRepo) {
    const [owner, repo] = envRepo.split('/');
    if (owner && repo) {
      return { owner, repo };
    }
  }

  const remote = (await captureCommand('git', ['remote', 'get-url', 'origin'])).trim();
  const match = remote.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (!match) {
    throw new Error(`Unable to determine GitHub repository from remote: ${remote}`);
  }

  return {
    owner: match[1],
    repo: match[2],
  };
}

async function resolveDefaultBranch(octokit: Octokit, repo: RepoInfo) {
  const response = await octokit.repos.get({
    owner: repo.owner,
    repo: repo.repo,
  });
  return response.data.default_branch;
}

async function ensureCleanWorktree() {
  const status = (await captureCommand('git', ['status', '--porcelain'])).trim();
  if (status.length > 0) {
    throw new Error('Working tree is dirty. Local automation runner requires a clean checkout.');
  }
}

async function ensureClaudeAuth() {
  const raw = await captureCommand('claude', ['auth', 'status']);
  const status = JSON.parse(raw) as { loggedIn?: boolean; email?: string };
  if (!status.loggedIn) {
    throw new Error('Claude Code is not logged in on this PC. Run `claude auth login` first.');
  }
}

async function configureAutomationGitIdentity() {
  await runCommand('git', ['config', '--local', 'user.name', 'github-actions[bot]']);
  await runCommand('git', ['config', '--local', 'user.email', 'github-actions[bot]@users.noreply.github.com']);
}

async function getChangedFiles() {
  const output = await captureCommand('git', ['status', '--short']);
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3).trim());
}

function buildCommitMessage(title: string, issueNumber: number) {
  const lower = `${title}`.toLowerCase();
  let type = 'chore';
  if (lower.includes('fix') || lower.includes('bug')) type = 'fix';
  else if (lower.includes('refactor')) type = 'refactor';
  else if (lower.includes('doc')) type = 'docs';
  else if (lower.includes('test')) type = 'test';
  else type = 'feat';

  return `${type}: autonomous implementation for issue #${issueNumber}`;
}

function buildPrTitle(title: string, issueNumber: number) {
  return `${buildCommitMessage(title, issueNumber)} (${title})`;
}

function buildPrBody(
  title: string,
  issueNumber: number,
  claudeSummary: string,
  verification: VerificationResult[],
  changedFiles: string[],
) {
  return `## Autonomous local runner execution

**Issue**: #${issueNumber}
**Title**: ${title}
**Runner**: self-hosted local PC with Claude Code

### Verification
${verification.map((entry) => `- ${entry.success ? 'OK' : 'FAIL'} \`${entry.command}\``).join('\n')}

### Files changed
${changedFiles.map((file) => `- \`${file}\``).join('\n')}

### Claude summary
${claudeSummary}

Closes #${issueNumber}`;
}

function truncateForReason(message: string) {
  return message.replace(/\s+/g, ' ').slice(0, 180);
}

async function ensureLogsDirectory() {
  await mkdir(path.join(process.cwd(), '.ai', 'local-runs'), { recursive: true });
}

async function writeResult(result: AutomationResult) {
  const outputPath = path.join(process.cwd(), '.ai', 'local-runs', `issue-${result.issueNumber}.json`);
  await writeFile(outputPath, JSON.stringify(result, null, 2));
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

function shellWords(command: string) {
  return command.split(' ');
}

function npxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

async function runCommand(command: string, args: string[], options?: { env?: NodeJS.ProcessEnv }) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: options?.env ?? process.env,
      shell: false,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function captureCommand(command: string, args: string[], options?: { env?: NodeJS.ProcessEnv }) {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: options?.env ?? process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr.trim() || `${command} ${args.join(' ')} exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
