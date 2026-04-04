"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AnalysisPayload, Video } from "@/lib/types";

export type AnalysisStatus = "queued" | "analyzing" | "ready" | "error";

export type PlaylistVideo = Video & {
  analysisStatus: AnalysisStatus;
  analysis?: AnalysisPayload;
};

type PlaylistContextValue = {
  queue: PlaylistVideo[];
  currentVideoId: string | null;
  setCurrentVideo: (id: string | null) => void;
  addToQueue: (videos: Video[]) => void;
  removeFromQueue: (videoId: string) => void;
  clearQueue: () => void;
  replaceQueue: (videos: Video[]) => void;
  updateItemStatus: (
    videoId: string,
    status: AnalysisStatus,
    analysis?: AnalysisPayload,
  ) => void;
};

const PlaylistContext = createContext<PlaylistContextValue | null>(null);

const LS_KEY = "vidsum-instant-queue";

function loadQueue(): PlaylistVideo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as PlaylistVideo[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: PlaylistVideo[]) {
  try {
    if (queue.length === 0) {
      localStorage.removeItem(LS_KEY);
    } else {
      const slim = queue.map(({ analysis, ...rest }) => ({
        ...rest,
        analysisStatus: analysis ? "ready" : rest.analysisStatus,
      }));
      localStorage.setItem(LS_KEY, JSON.stringify(slim));
    }
  } catch {
    /* quota exceeded — ignore */
  }
}

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<PlaylistVideo[]>([]);
  const [currentVideoId, setCurrentVideo] = useState<string | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (!initialised.current) {
      initialised.current = true;
      setQueue(loadQueue());
    }
  }, []);

  useEffect(() => {
    if (initialised.current) saveQueue(queue);
  }, [queue]);

  const addToQueue = useCallback((videos: Video[]) => {
    setQueue((prev) => {
      const existingIds = new Set(prev.map((v) => v.id));
      const newItems: PlaylistVideo[] = videos
        .filter((v) => !existingIds.has(v.id))
        .map((v) => ({ ...v, analysisStatus: "queued" as const }));
      return [...prev, ...newItems];
    });
  }, []);

  const removeFromQueue = useCallback((videoId: string) => {
    setQueue((prev) => prev.filter((v) => v.id !== videoId));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentVideo(null);
  }, []);

  const replaceQueue = useCallback((videos: Video[]) => {
    setQueue(
      videos.map((v) => ({ ...v, analysisStatus: "queued" as const })),
    );
  }, []);

  const updateItemStatus = useCallback(
    (videoId: string, status: AnalysisStatus, analysis?: AnalysisPayload) => {
      setQueue((prev) =>
        prev.map((v) =>
          v.id === videoId ? { ...v, analysisStatus: status, analysis } : v,
        ),
      );
    },
    [],
  );

  const value = useMemo(
    () => ({
      queue,
      currentVideoId,
      setCurrentVideo,
      addToQueue,
      removeFromQueue,
      clearQueue,
      replaceQueue,
      updateItemStatus,
    }),
    [
      queue,
      currentVideoId,
      addToQueue,
      removeFromQueue,
      clearQueue,
      replaceQueue,
      updateItemStatus,
    ],
  );

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error("usePlaylist must be used within PlaylistProvider");
  return ctx;
}

export function usePlaylistOptional() {
  return useContext(PlaylistContext);
}
