import { atom } from "jotai";
import { Recording } from "../User";

export const submitAtom = atom<boolean>(false);
export const currentQuestionAtom = atom<number>(0);
export const recordingsAtom = atom<Recording[]>([]);
export const isPlayingAtom = atom<boolean>(false);
export const isRecordingAtom = atom<boolean>(false);
export const streamAtom = atom<MediaStream | null>(null);
export const videoRefAtom = atom<HTMLVideoElement | null>(null);
export const mediaRecorderRefAtom = atom<MediaRecorder | null>(null);
export const chunksRefAtom = atom<Blob[]>([]);
export const textAtom = atom<string>("");
export const currentStepAtom = atom<number>(0);
export const audioPlayerStatusAtom = atom<"playing" | "paused" | "ended">(
  "paused"
);

export const interviewStep = [
  "opening",
  "panduan",
  "transition-start",
  "question-1",
  "transition",
  "question-2",
  "transition",
  "question-3",
  "transition",
  "question-4",
  "transition",
  "question-5",
  "transition-final",
  "closing",
] as const;

export const audioTypeAtom = atom<
  | "opening"
  | "panduan"
  | "transition-start"
  | "question-1"
  | "transition"
  | "question-2"
  | "transition"
  | "question-3"
  | "transition"
  | "question-4"
  | "transition"
  | "question-5"
  | "transition-final"
  | "closing"
>("opening");
