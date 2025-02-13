/* eslint-disable react-hooks/exhaustive-deps */
import {
  FaCamera,
  FaChevronRight,
  FaPaperPlane,
  FaPause,
} from "react-icons/fa";
import { questions } from "./const";
import { useAtom, useSetAtom } from "jotai";
import {
  currentQuestionAtom,
  submitAtom,
  recordingsAtom,
  isPlayingAtom,
  isRecordingAtom,
  streamAtom,
  videoRefAtom,
  mediaRecorderRefAtom,
  chunksRefAtom,
  textAtom,
  currentStepAtom,
  audioTypeAtom,
  interviewStep,
} from "./state/atom";

import { useEffect, useMemo } from "react";
import {
  useStartInterview,
  useFinishInterview,
  useUploadFile,
} from "./network";
import { Recording } from "./User";
import { useLogin } from "./network";
import Dictaphone from "./Dictaphone";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { useAudioListener } from "./useAudioListener";

export default function Controls() {
  const [currentQuestion, setCurrentQuestion] = useAtom(currentQuestionAtom);
  const [isRecording, setIsRecording] = useAtom(isRecordingAtom);
  const [recordings, setRecordings] = useAtom(recordingsAtom);
  const [stream] = useAtom(streamAtom);
  const [isSubmitted, setIsSubmitted] = useAtom(submitAtom);
  const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom); // New state for playing
  const setText = useSetAtom(textAtom);
  const [videoRef] = useAtom(videoRefAtom);
  const [mediaRecorderRef, setMediaRecorderRef] = useAtom(mediaRecorderRefAtom);
  const [chunksRef, setChunksRef] = useAtom(chunksRefAtom);
  const [audioType, setAudioType] = useAtom(audioTypeAtom);
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  const { listenToAudio, audioPlayerStatus } = useAudioListener();

  const { data: loginData } = useLogin();
  const { startInterview: startInterviewFn, data } = useStartInterview();
  const { finishInterview: finishInterviewFn } = useFinishInterview();

  const isInterviewStarted = !!data?.chat_id;
  const isFinishBriefing =
    currentStep === interviewStep.indexOf("panduan") && audio.ended;
  const isAnswering =
    currentStep === interviewStep.indexOf("transition-start") && audio.ended;

  const { transcript, listening } = useSpeechRecognition({
    language: "id",
    commands: [
      {
        command: "saya siap",
        callback: () => {
          setAudioType("transition-start");
          setIsRecording(false);
          listenToAudio("transition-start", () => {
            listenToAudio("question-1", () => {
              startRecording();
            });
          });
        },
      },
      {
        command: "mohon ulangi",
        callback: () => {
          listenToAudio("transition-start", () => {
            console.log("start listening");
            SpeechRecognition.startListening();
          });
        },
      },
      { command: "mohon lanjut", callback: () => {} },
    ],
  });

  const { uploadFile } = useUploadFile((percentComplete) => {
    setRecordings((prev) =>
      prev.map((r) =>
        r.questionId === questions[currentQuestion].id
          ? { ...r, uploadProgress: percentComplete }
          : r
      )
    );
  });

  const isLastQuestion = currentQuestion === questions.length - 1;

  const isLoggedIn = !!loginData?.data?.auth_token;

  const startInterview = async () => {
    if (!currentQuestion) {
      try {
        await startInterviewFn();

        listenToAudio("opening", () => {
          setAudioType("panduan");

          listenToAudio("panduan", () => {
            setIsRecording(true);
            console.log("start listening");
            SpeechRecognition.startListening();
          });
        });
      } catch (error) {
        return error;
      }
    }

    if (!stream) return;
  };

  const startRecording = () => {
    if (currentRecording) {
      setIsRecording(true);
      if (videoRef && stream) {
        videoRef.srcObject = stream;
        videoRef.muted = true; // Mute for camera preview
      }
    }

    const mediaRecorder = new MediaRecorder(stream);
    setMediaRecorderRef(mediaRecorder);
    setChunksRef([]);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      setRecordings((prev) => [
        {
          questionId: questions[currentQuestion].id,
          videoBlob: blob,
          url,
          uploadProgress: 0,
        },
        ...prev.filter((r) => r.questionId !== questions[currentQuestion].id),
      ]);

      setChunksRef([]);
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const currentRecording = useMemo(
    () =>
      recordings.find((r) => r.questionId === questions[currentQuestion].id),
    [recordings, currentQuestion]
  );

  const stopRecording = () => {
    if (mediaRecorderRef && isRecording) {
      mediaRecorderRef.stop();
      setIsRecording(false);
    }
  };

  const playRecording = (recording: Recording) => {
    if (isSubmitted && videoRef) {
      setIsPlaying(true); // Set playing state to true
      videoRef.src = recording.url;
      videoRef.muted = false; // Unmute for playback
      videoRef.play();
      videoRef.srcObject = null;
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

  const checkRecordingPlayed = () => {
    if (videoRef) {
      videoRef.onended = () => {
        setIsPlaying(false); // Set playing state to false when recording has finished playing
      };
    }
  };

  useEffect(() => {
    checkRecordingPlayed();
  }, [currentRecording]);

  const pauseRecording = () => {
    if (videoRef && isPlaying) {
      videoRef.pause();
      setIsPlaying(false); // Set playing state to false
    }
  };

  const switchToCamera = () => {
    if (videoRef && stream) {
      setIsPlaying(false);
      videoRef.srcObject = stream;
      videoRef.muted = true; // Mute for camera preview
    }
  };

  const handleSubmit = async () => {
    setIsSubmitted(true);

    await uploadFile({
      blob: currentRecording!.videoBlob,
      fileName: `question-${questions[currentQuestion].id}-response.webm`,
    });

    if (videoRef && currentRecording) {
      videoRef.srcObject = null;
      videoRef.src = currentRecording.url; // Set video to latest recording
      videoRef.play();
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    await finishInterviewFn();
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1 && currentRecording) {
      uploadFile({
        blob: currentRecording.videoBlob,
        fileName: `question-${questions[currentQuestion].id}-response.webm`,
      });

      setText(questions[currentQuestion].text);

      setCurrentQuestion((prev) => prev + 1);
      switchToCamera();
    }
  };

  // useEffect(() => {
  //   if (audio.played) {

  //     setIsAudioPlayed(true);
  //   }
  //   audio.play();
  // }, [lipsync]);

  return (
    <>
      <Dictaphone onReady={() => {}} onRepeat={() => {}} onNext={() => {}} />

      <div className="w-full">
        <div className="flex gap-4 justify-center">
          {!isRecording ? (
            <>
              {!isSubmitted && (
                <button
                  disabled={!stream?.active || !isLoggedIn}
                  onClick={startInterview}
                  className="disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-gradient-to-r from-primary-shade3 to-primary-shade1 text-white px-6 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  <FaCamera size={20} />
                  Start Interview
                </button>
              )}
              {currentRecording && (
                <div className="flex gap-2">
                  {isPlaying && (
                    <button
                      onClick={pauseRecording}
                      className="flex items-center gap-2 bg-white text-gray-neutral70 px-6 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
                    >
                      <FaPause size={20} />
                      Pause
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 bg-danger-default text-white px-6 py-3 rounded-full hover:bg-danger-tint1 hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              <FaPause size={20} />
              Stop Recording
            </button>
          )}
          {currentQuestion !== questions.length - 1 && (
            <button
              onClick={nextQuestion}
              disabled={
                isLastQuestion ||
                !currentRecording ||
                currentQuestion !== recordings.length - 1 // Disable if current question has no recording
              }
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-shade3 to-primary-shade1 text-white rounded-full shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              Next Question
              <FaChevronRight size={20} />
            </button>
          )}
          {isFinishBriefing && isInterviewStarted && (
            <button
              onClick={nextQuestion}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-shade3 to-primary-shade1 text-white rounded-full shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              Saya siap
              <FaChevronRight size={20} />
            </button>
          )}
        </div>
      </div>

      {currentQuestion === questions?.length - 1 && !isSubmitted && (
        <button
          onClick={handleSubmit}
          disabled={recordings.length !== questions.length}
          className="disabled:opacity-50 disabled:cursor-not-allowed m-auto flex items-center gap-2 bg-primary-default text-white px-6 py-3 rounded-full hover:bg-primary-tint1 hover:shadow-lg transition-all duration-300"
        >
          Submit
          <FaPaperPlane size={20} />
        </button>
      )}

      {isSubmitted && (
        <div className="text-center mt-4">
          <p className="text-lg font-medium text-gray-neutral100">
            Thank you for your submission!
          </p>
        </div>
      )}
    </>
  );
}
