"use client";

import { ReactorProvider } from "@reactor-team/js-sdk";
import { useCallback, useRef } from "react";

import { EpisodeConfigPanel } from "@/components/episode-config-panel";
import { LabStage } from "@/components/lab-stage";
import { PlanPanel } from "@/components/plan-panel";
import { StartFramePanel } from "@/components/start-frame-panel";
import { useEpisodeDirector } from "@/hooks/use-episode-director";
import {
  ORBIS_MODEL_NAME,
  ORBIS_TRACKS,
  clearReactorJwt,
  requestReactorJwt,
} from "@/lib/orbis";

export function ManipulationLab() {
  const jwtPromise = useRef<Promise<string> | null>(null);
  const getJwt = useCallback(() => {
    jwtPromise.current ??= requestReactorJwt();
    return jwtPromise.current;
  }, []);
  const clearJwt = useCallback(() => {
    jwtPromise.current = null;
    clearReactorJwt();
  }, []);

  return (
    <ReactorProvider
      apiUrl="https://api.reactor.inc"
      modelName={ORBIS_MODEL_NAME}
      modelTracks={[...ORBIS_TRACKS]}
      connectOptions={{ autoConnect: false }}
      jwtToken={getJwt}
    >
      <LabBody clearJwt={clearJwt} />
    </ReactorProvider>
  );
}

function LabBody({ clearJwt }: { clearJwt: () => void }) {
  const director = useEpisodeDirector(clearJwt);

  return (
    <div className="lab">
      <div className="lab-controls">
        <EpisodeConfigPanel director={director} />
        <StartFramePanel director={director} />
        <PlanPanel director={director} />
      </div>
      <LabStage director={director} />
    </div>
  );
}
