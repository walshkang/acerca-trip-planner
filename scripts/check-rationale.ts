import fs from 'fs';
import path from 'path';

type Section = 'decisions' | 'next' | null;

const ROOT_DIR = process.cwd();
const CONTEXT_PATH = path.join(ROOT_DIR, 'CONTEXT.md');
const REPORTS_DIR = path.join(ROOT_DIR, 'docs', 'reports');

function collectMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
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
files.push(...collectMarkdownFiles(REPORTS_DIR));

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
