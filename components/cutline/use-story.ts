"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Story, Snapshot, Keys, Config } from "@/lib/cutline/types";
import { keyHeaders } from "./use-live-video";
export async function requestJson<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const r = await fetch(url, options);
  const data = (await r.json().catch(() => ({
    error: "The server returned an unreadable response.",
  }))) as T & { error?: string };
  if (!r.ok)
    throw new Error(data.error || "The request could not be completed.");
  return data as T;
}
export function useStory(keys: Keys) {
  const [config, setConfig] = useState<Config | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const storyRef = useRef<Story | null>(null);
  useEffect(() => {
    storyRef.current = snapshot?.story || null;
  }, [snapshot]);
  const accept = useCallback((story: Story, select = true) => {
    if (select) storyRef.current = story;
    setSnapshot((prev) => {
      if (!select && prev?.story.id !== story.id) return prev;
      if (prev?.story.id === story.id && prev.story.version > story.version)
        return prev;
      return {
        story,
        isOwner: true,
        viewers: prev?.viewers || 0,
        myVote:
          prev?.story.state.poll?.id === story.state.poll?.id
            ? prev?.myVote || null
            : null,
        votes:
          prev?.story.state.poll?.id === story.state.poll?.id
            ? prev?.votes || {}
            : {},
      };
    });
    setStories((prev) => [story, ...prev.filter((x) => x.id !== story.id)]);
  }, []);
  const fetchLibrary = useCallback(async () => {
    const config = await requestJson<Config>("/api/bootstrap");
    const { stories } = await requestJson<{ stories: Story[] }>("/api/stories");
    return { config, stories };
  }, []);
  const receiveLibrary = useCallback(
    (library: { config: Config; stories: Story[] }) => {
      setConfig(library.config);
      setStories(library.stories);
      const requested = new URL(window.location.href).searchParams.get("story");
      const selected =
        library.stories.find((x) => x.id === requested) || library.stories[0];
      if (selected) accept(selected);
      setLoading(false);
      setError(null);
    },
    [accept],
  );
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchLibrary().then(receiveLibrary, (e: Error) => {
      setError(e.message);
      setLoading(false);
    });
  }, [fetchLibrary, receiveLibrary]);
  useEffect(() => {
    let active = true;
    void fetchLibrary().then(
      (library) => {
        if (active) receiveLibrary(library);
      },
      (e: Error) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [fetchLibrary, receiveLibrary]);
  const id = snapshot?.story.id;
  useEffect(() => {
    if (!id) return;
    const source = new EventSource(`/api/stories/${id}/events`);
    source.onopen = () => setOnline(true);
    source.onmessage = (e) => {
      try {
        const next = JSON.parse(e.data) as Snapshot;
        setSnapshot((prev) =>
          prev?.story.id !== id || prev.story.version > next.story.version
            ? prev
            : next,
        );
      } catch {}
    };
    source.onerror = () => setOnline(false);
    source.addEventListener("unavailable", () => setOnline(false));
    return () => source.close();
  }, [id]);
  const create = useCallback(
    async (
      templateId: string,
      title?: string,
      opening?: string,
      memory?: string,
    ) => {
      const result = await requestJson<{ story: Story }>("/api/stories", {
        method: "POST",
        headers: keyHeaders(keys),
        body: JSON.stringify({ templateId, title, opening, memory }),
      });
      accept(result.story);
      window.history.replaceState({}, "", `/?story=${result.story.id}`);
      return result.story;
    },
    [accept, keys],
  );
  const select = useCallback(
    (story: Story) => {
      accept(story);
      window.history.replaceState({}, "", `/?story=${story.id}`);
    },
    [accept],
  );
  const act = useCallback(
    async (action: Record<string, unknown>, storyOverride?: Story) => {
      const story = storyOverride || storyRef.current;
      if (!story) throw new Error("Create a story first.");
      const result = await requestJson<{
        story: Story;
        winner?: string | null;
      }>(`/api/stories/${story.id}/action`, {
        method: "POST",
        headers: keyHeaders(keys),
        body: JSON.stringify({
          planning:
            keys.nebius || (config?.nebiusConfigured && keys.accessCode)
              ? "nebius"
              : "rehearsal",
          ...action,
          version: story.version,
        }),
      });
      accept(result.story, false);
      return result;
    },
    [keys, accept, config],
  );
  const vote = useCallback(async (choiceId: string) => {
    const story = storyRef.current;
    if (!story?.state.poll) throw new Error("Open audience voting first.");
    const result = await requestJson<Snapshot>(
      `/api/stories/${story.id}/vote`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: story.state.poll.id, choiceId }),
      },
    );
    setSnapshot(result);
  }, []);
  const remove = useCallback(async (id: string) => {
    await requestJson(`/api/stories/${id}`, { method: "DELETE" });
    setStories((prev) => prev.filter((x) => x.id !== id));
    if (storyRef.current?.id === id) {
      setSnapshot(null);
      window.history.replaceState({}, "", "/");
    }
  }, []);
  return {
    config,
    stories,
    snapshot,
    story: snapshot?.story || null,
    loading,
    error,
    setError,
    online,
    create,
    select,
    act,
    vote,
    remove,
    reload: load,
  };
}
