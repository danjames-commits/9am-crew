#!/usr/bin/env bash
# Vercel's "ignored build step": exit 0 skips the build, exit 1 builds.
# Vercel sometimes delivers GitHub pushes late. A late, older commit on main
# must never replace a newer one that's already live, so on main we only build
# the commit that is currently the tip of the branch. Other branches always build.
if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then exit 1; fi
tip=$(git ls-remote "https://github.com/${VERCEL_GIT_REPO_OWNER:-danjames-commits}/${VERCEL_GIT_REPO_SLUG:-9am-crew}.git" refs/heads/main 2>/dev/null | cut -f1)
if [ -z "$tip" ]; then echo "Couldn't check the newest commit; building."; exit 1; fi
if [ "$VERCEL_GIT_COMMIT_SHA" = "$tip" ]; then exit 1; fi
echo "Skipping ${VERCEL_GIT_COMMIT_SHA:0:7}: main has moved on to ${tip:0:7}."
exit 0
