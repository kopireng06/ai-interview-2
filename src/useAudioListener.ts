import { useAtom } from "jotai";
import { audioPlayerStatusAtom } from "./state/atom";
import { useAudioAnalyzer } from "./useAudioAnalyzer";
export const useAudioListener = () => {
  const [audioPlayerStatus, setAudioPlayerStatus] = useAtom(
    audioPlayerStatusAtom
  );

  const { audioHandler } = useAudioAnalyzer();

  const listenToAudio = (audio: string, onEnded: () => void) => {
    const audioElement = new Audio(`/${audio}.mp3`);
    audioElement.play();
    audioHandler(audioElement, "talking-indicator-avatar", "element");

    audioElement.addEventListener("play", () => {
      setAudioPlayerStatus("playing");
    });

    audioElement.addEventListener("pause", () => {
      setAudioPlayerStatus("paused");
    });

    audioElement.addEventListener("ended", () => {
      setAudioPlayerStatus("ended");
      onEnded?.();
    });
  };

  return { listenToAudio, audioPlayerStatus };
};
