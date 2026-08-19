const { execFileSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');

function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
    ...opts
  }).trim();
}

function isRepo() {
  try {
    git(['rev-parse', '--is-inside-work-tree']);
    return true;
  } catch (err) {
    return false;
  }
}

function hasRemote() {
  try {
    const remotes = git(['remote']);
    return remotes.length > 0;
  } catch (err) {
    return false;
  }
}

function autoPush() {
  const enabled = process.env.GIT_AUTOPUSH !== 'false';
  if (!enabled) {
    console.log('[git] GIT_AUTOPUSH disabled; skipping GitHub push.');
    return { pushed: false, reason: 'disabled' };
  }
  if (!isRepo()) {
    console.warn('[git] Not inside a git repository; skipping push.');
    return { pushed: false, reason: 'not-a-repo' };
  }
  if (!hasRemote()) {
    console.warn('[git] No git remote configured; skipping push.');
    return { pushed: false, reason: 'no-remote' };
  }

  try {
    git(['add', '-A']);
    const status = git(['status', '--porcelain']);
    if (!status) {
      console.log('[git] Nothing to commit; news data unchanged.');
      return { pushed: true, committed: false };
    }

    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).split('\n')[0] || 'main';
    git(['commit', '-m', `chore: auto-update news data [${new Date().toISOString()}]`]);
    git(['push', 'origin', branch]);
    console.log(`[git] Committed and pushed news data to origin/${branch}.`);
    return { pushed: true, committed: true, branch };
  } catch (err) {
    console.error(`[git] Auto-push failed: ${err.message}`);
    return { pushed: false, reason: err.message };
  }
}

module.exports = { autoPush };
