import {
  recordingsAtom,
  submitAtom,
  videoRefAtom,
  isPlayingAtom,
  streamAtom,
} from "./state/atom";
import { useAtom, useSetAtom } from "jotai";
import { FaPlay } from "react-icons/fa";
import { FaSave } from "react-icons/fa";
import { Recording } from "./User";

export default function Recordings() {
  const [recordings] = useAtom(recordingsAtom);
  const [isSubmitted] = useAtom(submitAtom);
  const [videoRef] = useAtom(videoRefAtom);
  const [stream] = useAtom(streamAtom);
  const setIsPlaying = useSetAtom(isPlayingAtom);

  const playRecording = (recording: Recording) => {
    if (isSubmitted && videoRef) {
      setIsPlaying(true); // Set playing state to true
      videoRef.src = recording.url;
      videoRef.muted = false; // Unmute for playback
      videoRef.play();
      videoRef.srcObject = null;
      videoRef.addEventListener("ended", () => {
        setIsPlaying(false);
        videoRef.src = null;
        videoRef.srcObject = stream;
        videoRef.muted = true;
        videoRef.play();
      });
      return;
    }

    if (videoRef) {
      videoRef.srcObject = null;
      videoRef.src = recording.url;
      videoRef.muted = false; // Unmute for playback
      videoRef.play();
      setIsPlaying(true); // Set playing state to true
    }
  };

  const downloadRecording = (questionId: number) => {
    const recording = recordings.find((r) => r.questionId === questionId);
    if (recording) {
      const a = document.createElement("a");
      a.href = recording.url;
      a.download = `question-${questionId}-response.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="rounded-2xl p-8  flex flex-col gap-4 justify-center items-center">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-shade3 to-primary-shade1 bg-clip-text text-white mb-6">
        Your Recordings
      </h2>
      <div className="space-y-4">
        {recordings.map((recording, index) => {
          return (
            <div
              key={recording.questionId}
              className="flex items-center justify-between p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex-1 flex items-center">
                <p className="text-gray-neutral50 text-lg mr-4">{index + 1}</p>
                <div className="flex items-center mt-4"></div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => playRecording(recording)}
                  className="flex items-center gap-2 text-primary-shade3 hover:text-primary-shade2 transition-colors duration-300"
                >
                  <FaPlay size={20} />
                  <span className="font-medium">Play</span>
                </button>
                <button
                  onClick={() => downloadRecording(recording.questionId)}
                  className="flex items-center gap-2 text-primary-shade3 hover:text-primary-shade2 transition-colors duration-300"
                >
                  <FaSave size={20} />
                  <span className="font-medium">Download</span>
                </button>
              </div>
            </div>
          );
        })}
        {recordings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-neutral50 text-lg text-white">
              No recordings yet
            </p>
            <p className="text-gray-neutral40 text-white">
              Start recording your answers to see them here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
