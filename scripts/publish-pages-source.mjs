// Publish a source snapshot; preserve main and its screenshot history locally.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const git = (args, options = {}) => execFileSync('git', args, { encoding: 'utf8', ...options });
const remote = 'origin';
const branch = 'pages-source';
const localRef = 'refs/heads/codex/pages-source';
if (git(['status', '--porcelain']).trim()) throw new Error('Commit or resolve workspace changes before publishing.');
if (git(['symbolic-ref', '-q', 'HEAD']).trim() === localRef) throw new Error('Publish from the development branch.');
const source = git(['rev-parse', 'HEAD']).trim();
const upstream = git(['ls-remote', '--heads', remote, `refs/heads/${branch}`]).trim();
let parent;
if (upstream) {
  git(['fetch', remote, `refs/heads/${branch}`]);
  parent = git(['rev-parse', 'FETCH_HEAD']).trim();
}
const temp = mkdtempSync(join(tmpdir(), 'amadeus-pages-index-'));
try {
  const env = { ...process.env, GIT_INDEX_FILE: join(temp, 'index') };
  const entries = git(['ls-tree', '-r', '-z', source]).split('\0').filter(Boolean).filter(entry => {
    const path = entry.slice(entry.indexOf('\t') + 1);
    return !['docs/screenshots/', 'docs/old-screenshots-r1/', 'assets-candidates/'].some(prefix => path.startsWith(prefix));
  });
  const metadata = git(['hash-object', '-w', '--stdin'], { input: JSON.stringify({ sourceCommit: source, sourceBranch: git(['branch', '--show-current']).trim() }, null, 2) + '\n' }).trim();
  entries.push(`100644 blob ${metadata}\tdeployment-source.json`);
  git(['read-tree', '--empty'], { env });
  git(['update-index', '-z', '--index-info'], { env, input: entries.join('\0') + '\0' });
  const tree = git(['write-tree'], { env }).trim();
  const commit = git(['commit-tree', tree, ...(parent ? ['-p', parent] : [])], { input: `Deploy source ${source.slice(0, 12)}\n` }).trim();
  git(['update-ref', localRef, commit]);
  git(['push', remote, `${commit}:refs/heads/${branch}`], { stdio: 'inherit' });
  console.log(`Published ${source} as ${commit}. Follow the GitHub Pages workflow for deployment status.`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
