var RUNNER_START_COMMAND = `set -eu
RUNNER_DIR="$HOME/trenches/runner"
LOG_DIR="$HOME/trenches/logs"
PID_FILE="$RUNNER_DIR/runner.pid"
mkdir -p "$RUNNER_DIR" "$LOG_DIR"
if [ ! -f "$RUNNER_DIR/runner.py" ] || [ ! -f "$RUNNER_DIR/.env" ]; then
  echo "RUNNER_FILES_MISSING"
  exit 2
fi
if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "RUNNER_ALREADY_RUNNING:$PID"
    exit 0
  fi
  rm -f "$PID_FILE"
fi
set -a
. "$RUNNER_DIR/.env"
set +a
unset ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN
cd "$RUNNER_DIR"
nohup /usr/bin/python3 "$RUNNER_DIR/runner.py" >> "$LOG_DIR/prospector.stdout.log" 2>&1 < /dev/null &
PID=$!
echo "$PID" > "$PID_FILE"
sleep 1
if kill -0 "$PID" 2>/dev/null; then
  echo "RUNNER_STARTED:$PID"
  exit 0
fi
echo "RUNNER_FAILED_TO_STAY_RUNNING"
tail -40 "$LOG_DIR/prospector.stdout.log" 2>/dev/null || true
exit 1`;
async function orgoFetch(env, path, init) {
  const response = await fetch(`https://www.orgo.ai/api${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.ORGO_API_KEY}`,
      ...init.body ? { "content-type": "application/json" } : {}
    }
  });
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  return { response, body };
}
__name(orgoFetch, "orgoFetch");
async function startComputer(env) {
  const { response, body } = await orgoFetch(env, `/computers/${encodeURIComponent(env.ORGO_COMPUTER_ID)}/start`, { method: "POST" });
  if (!response.ok) {
    throw new HttpError(502, "ORGO_START_FAILED", `Orgo returned ${response.status} while starting the prospector VM.`, body);
  }
  return typeof body.status === "string" ? body.status : "starting";
}
__name(startComputer, "startComputer");
async function launchRunner(env) {
  const { response, body } = await orgoFetch(env, `/computers/${encodeURIComponent(env.ORGO_COMPUTER_ID)}/bash`, {
    method: "POST",
    body: JSON.stringify({ command: RUNNER_START_COMMAND })
  });
  if (!response.ok) {
    throw new HttpError(502, "ORGO_RUNNER_LAUNCH_FAILED", `Orgo returned ${response.status} while launching the Prospector runner.`, body);
  }
  if (body.success !== true) {
    throw new HttpError(502, "ORGO_RUNNER_LAUNCH_FAILED", "Orgo bash call did not report success.", body);
  }
  return typeof body.output === "string" ? body.output.trim().slice(0, 300) : "runner-launch-requested";
}
__name(launchRunner, "launchRunner");
async function wakeOrgoProspector(env) {
  if (!env.ORGO_API_KEY || !env.ORGO_COMPUTER_ID) return { attempted: false };
  const status = await startComputer(env);
  try {
    const runner = await launchRunner(env);
    return { attempted: true, status, runner };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { attempted: true, status: `${status}; runner-pending`, runner: message.slice(0, 240) };
  }
}
__name(wakeOrgoProspector, "wakeOrgoProspector");

