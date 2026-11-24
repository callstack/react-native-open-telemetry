// Release gates (Task 32), used by .github/workflows/release.yml:
//   node scripts/release-gate.js ci <sha>        the newest CI (ci.yml) run for the commit completed with success
//   node scripts/release-gate.js nightly <sha>   the newest `nightly` commit status (scheduled.yml) is success
//   node scripts/release-gate.js --self-test     the gates against canned API answers, no network
// Fails closed: exit 0 only when the commit is green; red, pending, missing, an unknown gate or an API error exit 1.
// Env: GITHUB_REPOSITORY (owner/name), GH_TOKEN or GITHUB_TOKEN.
const assert = require('assert');

const gates = {
  async ci(repo, sha, get) {
    const {workflow_runs: runs} = await get(`/repos/${repo}/actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=100`);
    if (!runs?.length) return `no CI run for ${sha}`;
    const newest = runs.reduce((a, b) => (Date.parse(b.created_at) > Date.parse(a.created_at) ? b : a));
    if (newest.status !== 'completed' || newest.conclusion !== 'success')
      return `CI run ${newest.id} for ${sha} is ${newest.status}/${newest.conclusion}`;
    return null;
  },
  async nightly(repo, sha, get) {
    const statuses = await get(`/repos/${repo}/commits/${sha}/statuses?per_page=100`);
    const newest = statuses.find(s => s.context === 'nightly'); // the API lists newest first
    if (!newest) return `no nightly status on ${sha}`;
    if (newest.state !== 'success') return `nightly status on ${sha} is ${newest.state}`;
    return null;
  },
};

/** Returns null when the gate passes, else why not. Never throws. */
async function check(gate, repo, sha, get) {
  try {
    if (!gates[gate]) return `unknown gate ${gate}`;
    if (!repo || !/^[0-9a-f]{40}$/.test(sha ?? '')) return `need GITHUB_REPOSITORY and a full commit SHA, got ${repo} ${sha}`;
    return await gates[gate](repo, sha, get);
  } catch (e) {
    return `${gate} gate errored: ${e.message}`;
  }
}

function githubGet(token) {
  return async path => {
    const res = await fetch('https://api.github.com' + path, {
      headers: {accept: 'application/vnd.github+json', ...(token && {authorization: `Bearer ${token}`})},
    });
    if (!res.ok) throw new Error(`GET ${path}: HTTP ${res.status}`);
    return res.json();
  };
}

async function selfTest() {
  const sha = 'a'.repeat(40);
  const run = (conclusion, created_at = '2026-01-01T00:00:00Z', status = 'completed') => ({id: 1, status, conclusion, created_at});
  const ci = runs => check('ci', 'o/r', sha, async () => ({workflow_runs: runs}));
  const nightly = statuses => check('nightly', 'o/r', sha, async () => statuses);
  assert.equal(await ci([run('success')]), null);
  assert.ok(await ci([run('failure')]), 'red CI must not pass');
  assert.ok(await ci([run('cancelled')]), 'cancelled CI must not pass');
  assert.ok(await ci([run(null, undefined, 'in_progress')]), 'pending CI must not pass');
  assert.ok(await ci([]), 'no CI run must not pass');
  assert.ok(await ci([run('success'), run('failure', '2026-01-02T00:00:00Z')]), 'a newer red run wins');
  assert.equal(await ci([run('failure'), run('success', '2026-01-02T00:00:00Z')]), null, 'a newer green re-run wins');
  assert.equal(await nightly([{context: 'nightly', state: 'success'}]), null);
  assert.ok(await nightly([{context: 'nightly', state: 'failure'}, {context: 'nightly', state: 'success'}]), 'newest nightly wins');
  assert.ok(await nightly([{context: 'ci', state: 'success'}]), 'no nightly status must not pass');
  const boom = async () => { throw new Error('HTTP 502'); };
  assert.ok(await check('ci', 'o/r', sha, boom), 'API error must not pass');
  assert.ok(await check('nightly', 'o/r', sha, boom), 'API error must not pass');
  assert.ok(await check('ci', 'o/r', 'main', boom), 'a ref is not a SHA');
  assert.ok(await check('latest', 'o/r', sha, boom), 'unknown gate must not pass');
  console.log('release-gate self-test: ok');
}

async function main([gate, sha]) {
  if (gate === '--self-test') return selfTest();
  const why = await check(gate, process.env.GITHUB_REPOSITORY, sha, githubGet(process.env.GH_TOKEN || process.env.GITHUB_TOKEN));
  if (why) {
    console.error(`release-gate: ${why}`);
    process.exit(1);
  }
  console.log(`release-gate: ${gate} green for ${sha}`);
}

main(process.argv.slice(2)).catch(e => {
  console.error(e);
  process.exit(1);
});
