import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

type TaskStatus = 'completed' | 'in_progress' | string;

interface RoadmapTask {
  id: string;
  task: string;
  details?: string;
  status: TaskStatus;
}

interface RoadmapEpic {
  id: string;
  title: string;
  description?: string;
  tech_stack?: string[];
  tasks?: RoadmapTask[];
  features?: string[];
}

interface RoadmapPhase {
  name: string;
  goal?: string;
  estimated_timeline?: string;
  status?: string;
  progress_summary?: string;
  epics: RoadmapEpic[];
}

interface PRHistoryEntry {
  id: string;
  date: string;
  title: string;
  summary: string;
}

interface RoadmapData {
  project_name?: string;
  version?: string;
  last_updated?: string;
  development_principles?: string[];
  pr_history?: PRHistoryEntry[];
  roadmap: {
    phase_1?: RoadmapPhase;
    phase_2?: RoadmapPhase;
    phase_3?: RoadmapPhase;
    // Allow for future phases without breaking the script
    [key: string]: RoadmapPhase | undefined;
  };
}

type EpicStatus = 'done' | 'active' | 'pending';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const ROADMAP_PATH = path.join(ROOT_DIR, 'roadmap.json');
const CONTEXT_PATH = path.join(ROOT_DIR, 'CONTEXT.md');

function readRoadmap(): RoadmapData {
  const raw = fs.readFileSync(ROADMAP_PATH, 'utf8');
  return JSON.parse(raw) as RoadmapData;
}

function isCommitId(value: string): boolean {
  return /^[0-9a-f]{7,40}$/i.test(value);
}

function hasUncommittedChanges(): boolean {
  try {
    const output = execSync('git status --porcelain', {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    });
    return output.trim().length > 0;
  } catch {
    return true;
  }
}

function readGitHistory(limit = 5): PRHistoryEntry[] {
  try {
    const raw = execSync(
      `git log -n ${limit} --date=short --pretty=format:%H%x1f%ad%x1f%s%x1f%b%x1e`,
      { cwd: ROOT_DIR, encoding: 'utf8' },
    ).trim();

    if (!raw) return [];

    return raw
      .split('\x1e')
      .map((record) => record.trim())
      .filter(Boolean)
      .map((record) => {
        const [hash, date, subject, body] = record.split('\x1f');
        const shortHash = hash.slice(0, 7);
        const normalizedBody = (body ?? '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .join(' ');
        const summary = normalizedBody || `Auto-generated from git log (${shortHash}).`;

        return {
          id: shortHash,
          date,
          title: subject?.trim() || `Commit ${shortHash}`,
          summary,
        };
      });
  } catch {
    return [];
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function computeEpicStatus(epic: RoadmapEpic): EpicStatus {
  if (!epic.tasks || epic.tasks.length === 0) {
    return 'pending';
  }

  const hasInProgress = epic.tasks.some((t) => t.status === 'in_progress');
  const allCompleted = epic.tasks.every((t) => t.status === 'completed');

  if (allCompleted) return 'done';
  if (hasInProgress) return 'active';
  return 'pending';
}

function findActivePhase(roadmap: RoadmapData['roadmap']): RoadmapPhase | undefined {
  const phaseKeys = Object.keys(roadmap).sort(); // phase_1, phase_2, ...

  const inProgressPhaseKey = phaseKeys.find((key) => roadmap[key]?.status === 'in_progress');
  if (inProgressPhaseKey) {
    return roadmap[inProgressPhaseKey];
  }

  // Fallback: phase_1 if present
  if (roadmap.phase_1) return roadmap.phase_1;

  // Fallback: first phase by key if nothing else
  const firstKey = phaseKeys[0];
  return firstKey ? roadmap[firstKey] : undefined;
}

function findActiveEpic(phase: RoadmapPhase | undefined): RoadmapEpic | undefined {
  if (!phase) return undefined;

  // First epic with at least one non-completed task
  const epicWithOpenTask = phase.epics.find(
    (epic) => epic.tasks && epic.tasks.some((t) => t.status !== 'completed'),
  );
  if (epicWithOpenTask) return epicWithOpenTask;

  // Fallback: first epic if any exist
  return phase.epics[0];
}

function findImmediateBlocker(epic: RoadmapEpic | undefined): RoadmapTask | undefined {
  if (!epic || !epic.tasks) return undefined;
  return epic.tasks.find((t) => t.status !== 'completed');
}

function buildActiveContextSection(roadmap: RoadmapData): string {
  const activePhase = findActivePhase(roadmap.roadmap);
  const activeEpic = findActiveEpic(activePhase);
  const blockerTask = findImmediateBlocker(activeEpic);

  const currentPhaseLabel = activePhase?.name ?? 'None (no active phase found)';

  let activeEpicLabel = 'None (no epics found in active phase)';
  if (activePhase && activePhase.epics.length > 0) {
    if (activeEpic) {
      activeEpicLabel = activeEpic.title;
    } else {
      activeEpicLabel = 'None (all epics completed in active phase)';
    }
  }

  const immediateBlockerLabel = blockerTask
    ? `Task ${blockerTask.id} – ${blockerTask.task}`
    : 'None (all tasks in active epic are completed)';

  const lines = [
    '## 🧠 Active Context',
    `- Current Phase: ${currentPhaseLabel}`,
    `- Active Epic: ${activeEpicLabel}`,
    `- Immediate Blocker: ${immediateBlockerLabel}`,
    '',
  ];

  return lines.join('\n');
}

function normalizePhaseNameForSection(name: string): string {
  // Mermaid section labels can contain spaces, but we normalize for clarity.
  return name.replace(/ /g, '_');
}

function normalizeEpicIdToTaskId(epicId: string): string {
  // P1-E1 -> p1e1
  return epicId.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function quoteMermaidLabel(label: string): string {
  const escaped = label.replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function buildGanttSection(roadmap: RoadmapData): string {
  const phases: RoadmapPhase[] = [];

  // Preserve phase ordering: phase_1, phase_2, phase_3, then any others by key
  const roadmapPhases = roadmap.roadmap;
  const orderedKeys = ['phase_1', 'phase_2', 'phase_3']
    .concat(Object.keys(roadmapPhases).filter((k) => !['phase_1', 'phase_2', 'phase_3'].includes(k)))
    .filter((k) => roadmapPhases[k]);

  for (const key of orderedKeys) {
    const phase = roadmapPhases[key];
    if (phase) phases.push(phase);
  }

  const lines: string[] = [];
  lines.push('## 🗺️ Roadmap Visualization', '');
  lines.push('```mermaid');
  lines.push('gantt');
  lines.push('  dateFormat YYYY-MM-DD');
  const projectTitle = roadmap.project_name ?? 'Project Roadmap';
  const quotedTitle = projectTitle.includes(' ') ? `"${projectTitle}"` : projectTitle;
  lines.push(`  title ${quotedTitle}`);

  let lastEpicTaskId: string | null = null;
  const dummyStartDate = '2026-01-01';

  for (const phase of phases) {
    const sectionLabel = normalizePhaseNameForSection(phase.name);
    lines.push(`  section ${sectionLabel}`);

    for (const epic of phase.epics) {
      const epicStatus = computeEpicStatus(epic);
      const taskId = normalizeEpicIdToTaskId(epic.id);
      const label = quoteMermaidLabel(`${epic.id} ${epic.title}`);
      const statusTokens: string[] = [];

      if (epicStatus === 'done') statusTokens.push('done');
      if (epicStatus === 'active') statusTokens.push('active');

      let timeRef: string;
      if (!lastEpicTaskId) {
        // First epic in the entire roadmap
        timeRef = dummyStartDate;
      } else {
        timeRef = `after ${lastEpicTaskId}`;
      }

      const taskTokens = [...statusTokens, taskId, timeRef, '7d'];
      lines.push(`  ${label} :${taskTokens.join(', ')}`);

      lastEpicTaskId = taskId;
    }
  }

  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

function buildConstitutionSection(roadmap: RoadmapData): string {
  const principles = roadmap.development_principles ?? [];
  const lines: string[] = ['## 📜 The Constitution'];

  for (const principle of principles) {
    lines.push(`- ${principle}`);
  }

  lines.push('');

  return lines.join('\n');
}

function buildImplementationMemorySection(roadmap: RoadmapData): string {
  const roadmapHistory = roadmap.pr_history ?? [];
  const includeUncommitted = hasUncommittedChanges();
  const gitHistory = readGitHistory(6);

  const uncommitted = includeUncommitted
    ? roadmapHistory.find((entry) => entry.id === 'uncommitted')
    : undefined;
  const committedRoadmap = roadmapHistory.filter((entry) => entry.id !== 'uncommitted');

  const curatedById = new Map<string, PRHistoryEntry>();
  for (const entry of committedRoadmap) {
    if (!isCommitId(entry.id)) continue;
    curatedById.set(entry.id.toLowerCase(), entry);
    if (entry.id.length > 7) {
      curatedById.set(entry.id.slice(0, 7).toLowerCase(), entry);
    }
  }

  const recentCommitted: PRHistoryEntry[] = [];
  const usedIds = new Set<string>();

  if (gitHistory.length > 0) {
    for (const gitEntry of gitHistory) {
      if (recentCommitted.length >= 3) break;
      const key = gitEntry.id.toLowerCase();
      const curated = curatedById.get(key);
      const chosen = curated ?? gitEntry;
      const chosenKey = chosen.id.toLowerCase();
      if (usedIds.has(chosenKey)) continue;
      recentCommitted.push(chosen);
      usedIds.add(chosenKey);
    }
  }

  if (recentCommitted.length < 3) {
    const fallback = [...committedRoadmap].sort((a, b) => b.date.localeCompare(a.date));
    for (const entry of fallback) {
      if (recentCommitted.length >= 3) break;
      const key = entry.id.toLowerCase();
      if (usedIds.has(key)) continue;
      recentCommitted.push(entry);
      usedIds.add(key);
    }
  }

  const selected = uncommitted
    ? [uncommitted, ...recentCommitted.slice(0, 2)]
    : recentCommitted;

  const finalOrdered: PRHistoryEntry[] = [];
  if (uncommitted) {
    finalOrdered.push(uncommitted);
  }
  finalOrdered.push(...selected.filter((entry) => entry.id !== 'uncommitted'));

  const lines: string[] = ['## 📝 Implementation Memory'];

  for (const entry of finalOrdered) {
    const isUncommitted = entry.id === 'uncommitted';
    const labelPrefix = isUncommitted ? '🚧 CURRENT SESSION – ' : '';
    lines.push(`- ${entry.date} – ${labelPrefix}${entry.title}`);
    lines.push(`    ${entry.summary}`);
  }

  lines.push('');

  return lines.join('\n');
}

function upsertSection(content: string, header: string, section: string): string {
  // Escape special regex characters but preserve emojis and unicode
  const escapedHeader = escapeRegExp(header);
  // Match from the header to the next ## header or end of file
  // [\s\S] matches any character including newlines
  // Lookahead (?=\n## |$) stops at next section header or end of string
  const headerPattern = `## ${escapedHeader}`;
  const pattern = new RegExp(`${headerPattern}[\\s\\S]*?(?=\\n## |$)`);

  const match = content.match(pattern);
  if (match) {
    // Replace the matched section with the new one
    // Ensure section ends properly
    const normalizedSection = section.endsWith('\n') ? section : section + '\n';
    return content.replace(pattern, normalizedSection);
  }

  // If no existing section, insert before any "## User Notes" section if present
  const userNotesIndex = content.indexOf('## User Notes');
  if (userNotesIndex !== -1) {
    const before = content.slice(0, userNotesIndex).replace(/\s*$/, '\n\n');
    const after = content.slice(userNotesIndex);
    return `${before}${section}\n\n${after}`;
  }

  // Otherwise, append to the end
  if (!content.trim()) {
    return `${section}\n`;
  }

  return content.replace(/\s*$/, '\n\n') + section + '\n';
}

function generateContext() {
  const roadmap = readRoadmap();

  const activeContextSection = buildActiveContextSection(roadmap);
  const ganttSection = buildGanttSection(roadmap);
  const constitutionSection = buildConstitutionSection(roadmap);
  const implementationMemorySection = buildImplementationMemorySection(roadmap);

  const sectionsByHeader: { header: string; section: string }[] = [
    { header: '🧠 Active Context', section: activeContextSection },
    { header: '🗺️ Roadmap Visualization', section: ganttSection },
    { header: '📜 The Constitution', section: constitutionSection },
    { header: '📝 Implementation Memory', section: implementationMemorySection },
  ];

  let content = '';
  if (fs.existsSync(CONTEXT_PATH)) {
    content = fs.readFileSync(CONTEXT_PATH, 'utf8');
  }

  for (const { header, section } of sectionsByHeader) {
    content = upsertSection(content, header, section);
  }

  fs.writeFileSync(CONTEXT_PATH, content, 'utf8');
}

try {
  generateContext();
  // eslint-disable-next-line no-console
  console.log('CONTEXT.md has been refreshed from roadmap.json');
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('Failed to generate CONTEXT.md from roadmap.json:', error);
  process.exitCode = 1;
}
