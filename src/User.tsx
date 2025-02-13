/* eslint-disable react-hooks/exhaustive-deps */
import {
  isPlayingAtom,
  streamAtom,
  submitAtom,
  videoRefAtom,
} from "./state/atom";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { useAudioAnalyzer } from "./useAudioAnalyzer";
import { useLogin } from "./network";
export interface Recording {
  questionId: number;
  videoBlob: Blob;
  url: string;
  uploadProgress: number;
}

export default function User() {
  const [isSubmitted] = useAtom(submitAtom);
  const [isPlaying] = useAtom(isPlayingAtom);
  const [videoRef, setVideoRef] = useAtom(videoRefAtom);
  const [stream, setStream] = useAtom(streamAtom);

  const videoRefLocal = useRef<HTMLVideoElement>(null);

  const { audioHandler } = useAudioAnalyzer();
  const { login } = useLogin();

  useEffect(() => {
    if (!videoRef) {
      setVideoRef(videoRefLocal?.current);
    }
  }, [videoRefLocal]);

  useEffect(() => {
    initializeCamera();
    login();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoRef]);

  const initializeCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      audioHandler(mediaStream);

      setStream(mediaStream);

      if (videoRef) {
        videoRef.srcObject = mediaStream;
        videoRef.muted = true; // Mute for camera preview
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert(
        "Unable to access camera and microphone. Please ensure you have granted the necessary permissions."
      );
    }
  };

  return (
    <div className="w-[40%] relative">
      <div className=" backdrop-blur-lg rounded-2xl transition-all duration-300">
        <div className={`relative mb-8 group`}>
          <div className="relative">
            <video
              ref={videoRefLocal}
              autoPlay
              playsInline
              muted
              className={`w-full h-[600px] bg-gray-900 rounded-2xl object-cover shadow-lg transition-transform duration-300`}
            />
            <div className="flex items-center gap-2 z-10 bg-white px-2 py-1 rounded-full text-sm font-bold absolute bottom-2 left-4">
              <p>You</p>
              <img
                id="talking-indicator"
                src="/active-speaker.gif"
                alt="HRD"
                className="w-5 h-5 hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
