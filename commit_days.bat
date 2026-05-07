@echo off
cd /d C:\Users\DELL\OneDrive\Documents\Marginal

echo === Day 2: Agent Leaderboard ===
git add frontend/components/dashboard/agent-leaderboard.tsx
git commit -m "feat(dashboard): wire agent leaderboard to live Memory Indexer data"

echo === Day 3: Efficiency Chart ===
git add frontend/components/dashboard/efficiency-chart.tsx
git commit -m "feat(dashboard): wire efficiency chart to real settlement data with hourly buckets"

echo === Day 4: Compute Distribution ===
git add frontend/components/dashboard/compute-distribution.tsx
git commit -m "feat(dashboard): wire compute distribution to real task difficulty data"

echo === Day 5: Task localStorage History ===
git add frontend/app/tasks/page.tsx
git commit -m "feat(tasks): persist submission history in localStorage"

echo === Day 6: Executor Bid Retry ===
git add agents/executor.py
git commit -m "feat(executor): smart bid retry with exponential bid escalation"

echo === Day 7: Verify Script ===
git add scripts/verify.ts
git commit -m "feat(scripts): on-chain contract verification and health check"

echo === All commits done ===
git log --oneline -8
