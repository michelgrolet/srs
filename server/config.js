import { execFileSync } from 'node:child_process';

function run(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10_000,
    }).trim();
  } catch {
    return '';
  }
}

export function loadGitHubConfig(env = process.env) {
  const token = env.SRS_GITHUB_TOKEN || env.GH_TOKEN || env.GITHUB_TOKEN || run('gh', ['auth', 'token']);
  if (!token) {
    throw new Error('SRS needs GitHub access. Run `gh auth login`, then restart your agent.');
  }

  let repository = env.SRS_GITHUB_REPOSITORY || '';
  if (!repository) {
    const owner = run('gh', ['api', 'user', '--jq', '.login']);
    if (owner) repository = `${owner}/srs`;
  }
  const match = repository.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!match) {
    throw new Error('Set SRS_GITHUB_REPOSITORY to `owner/repo`, or log in with `gh auth login`.');
  }

  return {
    owner: match[1],
    repo: match[2],
    branch: env.SRS_GITHUB_BRANCH || 'main',
    token,
  };
}
