import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

type Section = 'decisions' | 'next' | null;

const ROOT_DIR = process.cwd();
const CONTEXT_PATH = path.join(ROOT_DIR, 'CONTEXT.md');
const REPORTS_DIR = path.join(ROOT_DIR, 'docs', 'reports');

function safeExecGit(args: string[]): string | null {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function parseNullSeparated(output: string | null): string[] {
  if (!output) return [];
  return output
    .split('\0')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getChangedPaths(): string[] {
  const hasOriginMain =
    safeExecGit(['rev-parse', '--verify', 'origin/main']) != null;

  const base = hasOriginMain
    ? safeExecGit(['merge-base', 'HEAD', 'origin/main'])?.trim() ?? null
    : null;

  const committedDiff = base
    ? parseNullSeparated(
        safeExecGit([
          'diff',
          '--name-only',
          '--diff-filter=ACMR',
          '-z',
          `${base}...HEAD`,
        ])
      )
    : [];

  const stagedDiff = parseNullSeparated(
    safeExecGit(['diff', '--name-only', '--diff-filter=ACMR', '--cached', '-z'])
  );

  const workingTreeDiff = parseNullSeparated(
    safeExecGit(['diff', '--name-only', '--diff-filter=ACMR', '-z'])
  );

  const untracked = parseNullSeparated(
    safeExecGit(['ls-files', '--others', '--exclude-standard', '-z'])
  );

  return Array.from(
    new Set([...committedDiff, ...stagedDiff, ...workingTreeDiff, ...untracked])
  );
}

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  let section: Section = null;
  const issues: { line: number; text: string }[] = [];

  lines.forEach((line, index) => {
    const headingMatch = line.match(/^##\s+(.*)$/);
    if (headingMatch) {
      const heading = headingMatch[1].trim();
      if (heading === 'Decisions / Rationale') {
        section = 'decisions';
      } else if (heading === 'Next Steps') {
        section = 'next';
      } else {
        section = null;
      }
      return;
    }

    if (section && /^-\s*TODO:/.test(line)) {
      issues.push({ line: index + 1, text: line.trim() });
    }
  });

  return issues;
}

const files: string[] = [];
if (fs.existsSync(CONTEXT_PATH)) {
  files.push(CONTEXT_PATH);
}

const changedReportFiles = getChangedPaths()
  .filter((p) => p.startsWith('docs/reports/') && p.endsWith('.md'))
  .map((p) => path.join(ROOT_DIR, p))
  .filter((p) => fs.existsSync(p) && fs.statSync(p).isFile());

files.push(...changedReportFiles);

const failures: { file: string; line: number; text: string }[] = [];

for (const file of files) {
  const issues = scanFile(file);
  for (const issue of issues) {
    failures.push({ file, line: issue.line, text: issue.text });
  }
}

if (failures.length > 0) {
  console.error('Rationale check failed: replace TODO placeholders in Decisions / Rationale or Next Steps.');
  for (const failure of failures) {
    const relative = path.relative(ROOT_DIR, failure.file);
    console.error(`- ${relative}:${failure.line} ${failure.text}`);
  }
  process.exit(1);
}

console.log('Rationale check passed.');
