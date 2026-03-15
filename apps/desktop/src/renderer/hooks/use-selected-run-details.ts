import type { RunId, RuntimeRunDetails, RuntimeSnapshot } from "@iamrobot/protocol";
import { startTransition, useEffect, useRef, useState } from "react";

interface SelectedRunDetailsState {
  readonly details: RuntimeRunDetails | null;
  readonly error: string | null;
  readonly loading: boolean;
}

export function useSelectedRunDetails(selectedRunId: RunId | null, snapshot: RuntimeSnapshot) {
  const [state, setState] = useState<SelectedRunDetailsState>({
    details: null,
    loading: false,
    error: null,
  });

  // Track the last run summary we loaded details for so we only re-fetch when
  // the run's observable state (status + stage) actually changes, not on every
  // snapshot push (e.g. from the heartbeat interval).
  const lastLoadedRunSummaryRef = useRef<{
    runId: RunId;
    status: string;
    stage: string;
  } | null>(null);

  useEffect(() => {
    if (!selectedRunId) {
      lastLoadedRunSummaryRef.current = null;
      setState({ details: null, loading: false, error: null });
      return;
    }

    const runId = selectedRunId;
    const runSummary = snapshot.runs.find((s) => s.run.runId === runId);

    // If the selected run changed entirely, clear cached state.
    if (lastLoadedRunSummaryRef.current?.runId !== runId) {
      lastLoadedRunSummaryRef.current = null;
      setState((current) => ({
        details: current.details?.run.runId === runId ? current.details : null,
        loading: true,
        error: null,
      }));
    } else if (runSummary) {
      // Re-fetch only when the run's status or stage changed — skip noisy
      // snapshot ticks (e.g. heartbeat interval) that carry identical state.
      const prev = lastLoadedRunSummaryRef.current;
      const statusUnchanged = prev?.status === runSummary.run.status;
      const stageUnchanged = prev?.stage === runSummary.run.stage;

      if (statusUnchanged && stageUnchanged) {
        return;
      }

      setState((current) => ({ ...current, loading: true, error: null }));
    } else {
      // Run is not in snapshot yet — still trigger load.
      setState((current) => ({
        details: current.details?.run.runId === runId ? current.details : null,
        loading: true,
        error: null,
      }));
    }

    let cancelled = false;

    async function loadDetails() {
      try {
        const details = await window.iamRobot.getRunDetails(runId);

        if (cancelled) {
          return;
        }

        if (runSummary) {
          lastLoadedRunSummaryRef.current = {
            runId,
            status: runSummary.run.status,
            stage: runSummary.run.stage,
          };
        }

        startTransition(() => {
          setState({
            details,
            loading: false,
            error: details ? null : `Unknown run: ${runId}`,
          });
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          details: null,
          loading: false,
          error: error instanceof Error ? error.message : "Unable to load run details.",
        });
      }
    }

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [selectedRunId, snapshot]);

  return state;
}
