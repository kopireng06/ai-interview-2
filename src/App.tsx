/* eslint-disable react-hooks/exhaustive-deps */

import { SnackbarProvider } from "notistack";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  FaCamera,
  FaPause,
  FaPlay,
  FaSave,
  FaChevronRight,
  FaSync,
  FaPaperPlane,
} from "react-icons/fa";
import {
  useLogin,
  useStartInterview,
  useFinishInterview,
  useUploadFile,
  useFetchInterviewResult,
} from "./network";
import { questions } from "./const";

import ReactMarkdown from "react-markdown";

interface Recording {
  questionId: number;
  videoBlob: Blob;
  url: string;
  uploadProgress: number;
}

function App() {
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false); // New state for playing

  const isLastQuestion = currentQuestion === questions.length - 1;

  const { login, data: loginData } = useLogin();
  const { startInterview: startInterviewFn, data } = useStartInterview();
  const { finishInterview: finishInterviewFn } = useFinishInterview();

  const { data: interviewResult } = useFetchInterviewResult();

  const { uploadFile } = useUploadFile((percentComplete) => {
    setRecordings((prev) =>
      prev.map((r) =>
        r.questionId === questions[currentQuestion].id
          ? { ...r, uploadProgress: percentComplete }
          : r
      )
    );
  });

  const isLoggedIn = !!loginData?.data?.auth_token;

  useEffect(() => {
    initializeCamera();
    login();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const initializeCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      audioHandler(mediaStream);

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true; // Mute for camera preview
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert(
        "Unable to access camera and microphone. Please ensure you have granted the necessary permissions."
      );
    }
  };

  const startRecording = async () => {
    if (!currentQuestion) {
      try {
        await startInterviewFn();
      } catch (error) {
        return error;
      }
    }

    if (!stream) return;

    if (currentRecording) {
      setIsRecording(true);
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute for camera preview
      }
    }

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
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

      chunksRef.current = [];
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
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecording = (recording: Recording) => {
    if (isSubmitted && videoRef.current) {
      setIsPlaying(true); // Set playing state to true
      videoRef.current.src = recording.url;
      videoRef.current.muted = false; // Unmute for playback
      videoRef.current.play();
      videoRef.current.srcObject = null;
      return;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = recording.url;
      videoRef.current.muted = false; // Unmute for playback
      videoRef.current.play();
      setIsPlaying(true); // Set playing state to true
    }
  };

  const checkRecordingPlayed = () => {
    if (videoRef.current) {
      videoRef.current.onended = () => {
        setIsPlaying(false); // Set playing state to false when recording has finished playing
      };
    }
  };

  useEffect(() => {
    checkRecordingPlayed();
  }, [currentRecording]);

  const pauseRecording = () => {
    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false); // Set playing state to false
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1 && currentRecording) {
      uploadFile({
        blob: currentRecording.videoBlob,
        fileName: `question-${questions[currentQuestion].id}-response.webm`,
      });

      setCurrentQuestion((prev) => prev + 1);
      switchToCamera();
    }
  };

  const switchToCamera = () => {
    if (videoRef.current && stream) {
      setIsPlaying(false);
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true; // Mute for camera preview
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

  function audioHandler(source: MediaStream) {
    const audioContext = new (window.AudioContext || window.AudioContext)();
    const audioInput = audioContext.createMediaStreamSource(source);
    const analyser = audioContext.createAnalyser();
    audioInput.connect(analyser);
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Simple voice activity detection
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const average = sum / dataArray.length;

      document
        .getElementById("talking-indicator")
        ?.style.setProperty("box-shadow", `0 0 0 ${average}px #01959F`);
    };

    draw();
  }

  const handleSubmit = async () => {
    setIsSubmitted(true);

    await uploadFile({
      blob: currentRecording!.videoBlob,
      fileName: `question-${questions[currentQuestion].id}-response.webm`,
    });

    if (videoRef.current && currentRecording) {
      videoRef.current.srcObject = null;
      videoRef.current.src = currentRecording.url; // Set video to latest recording
      videoRef.current.play();
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    await finishInterviewFn();
  };

  return (
    <div className="flex bg-gradient-to-br from-primary-tint4 via-white to-primary-tint3">
      <SnackbarProvider
        preventDuplicate
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      />
      <div className="h-screen overflow-auto mx-auto relative">
        <div className="max-w-5xl mx-auto p-8">
          <p className="mb-4 text-lg font-semibold text-gray-neutral90">
            Chat Id:{" "}
            <span className="font-bold text-primary-default">
              {data?.data?.chat_id}
            </span>
          </p>

          <div className=" backdrop-blur-lg rounded-2xl transition-all duration-300">
            {!isSubmitted && (
              <>
                {" "}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <div className="px-3 py-1 bg-primary-tint1 text-white rounded-full">
                      Question {currentQuestion + 1} of {questions.length}
                    </div>
                  </div>
                </div>
                <div className="mb-8">
                  <p className="text-xl font-medium text-gray-neutral90 mb-2 transition-all duration-300 ease-in-out">
                    {questions[currentQuestion].text}
                  </p>
                </div>
              </>
            )}

            <div
              className={`relative mb-8 group ${
                (isSubmitted ? isPlaying : true) ? "block" : "hidden"
              }`}
            >
              <div
                id="talking-indicator"
                className={`rounded-2xl absolute inset-0 bg-gradient-to-r from-primary-shade3 to-primary-shade1 opacity-30 group-hover:opacity-50 transition-all duration-300`}
                style={{
                  transition: "box-shadow 0.1s linear",
                }}
              ></div>
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-[500px] bg-gray-900 rounded-2xl object-cover shadow-lg transition-transform duration-300`}
                />

                <div className="w-full absolute bottom-6 left-1/2 transform -translate-x-1/2">
                  <div className="flex gap-4 justify-center">
                    {!isRecording ? (
                      <>
                        {!isSubmitted && (
                          <button
                            disabled={!stream?.active || !isLoggedIn}
                            onClick={startRecording}
                            className="disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-gradient-to-r from-primary-shade3 to-primary-shade1 text-white px-6 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
                          >
                            <FaCamera size={20} />
                            {currentRecording
                              ? "Record Again"
                              : "Start Answer Question " +
                                (currentQuestion + 1)}
                          </button>
                        )}
                        {currentRecording && (
                          <div className="flex gap-2">
                            {isPlaying ? (
                              <button
                                onClick={pauseRecording}
                                className="flex items-center gap-2 bg-white text-gray-neutral70 px-6 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
                              >
                                <FaPause size={20} />
                                Pause
                              </button>
                            ) : (
                              <button
                                onClick={() => playRecording(currentRecording)}
                                className="flex items-center gap-2 bg-white text-gray-neutral70 px-6 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
                              >
                                <FaPlay size={20} />
                                Play Recording
                              </button>
                            )}
                          </div>
                        )}
                        {!isSubmitted &&
                          videoRef.current?.srcObject === null &&
                          stream?.active && (
                            <button
                              onClick={switchToCamera}
                              className="flex items-center gap-2 bg-white text-gray-neutral70 px-6 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
                            >
                              <FaSync size={20} />
                              Switch to Camera
                            </button>
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
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  window.location.href = "/check";
                }}
                className="z-10 bg-primary-shade1 text-white px-4 py-2 rounded-lg hover:bg-primary-shade2 transition duration-300"
              >
                Check Previous Interview Result
              </button>
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
          </div>
        </div>

        <div className="rounded-2xl p-8 max-w-5xl m-auto">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-shade3 to-primary-shade1 bg-clip-text text-transparent mb-6">
            Your Recordings
          </h2>
          <div className="space-y-4">
            {recordings.map((recording) => {
              const question = questions.find(
                (q) => q.id === recording.questionId
              );
              return (
                <div
                  key={recording.questionId}
                  className="flex items-center justify-between p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-neutral100 mb-1">
                      Question {question?.id}
                    </p>
                    <p className="text-gray-neutral70">{question?.text}</p>
                    <div className="flex items-center mt-4">
                      {recording.uploadProgress === 0 && (
                        <p className="text-gray-neutral50 text-sm text-center mx-auto">
                          {currentQuestion === questions.length - 1
                            ? "Submit to upload"
                            : "Go to the next question to upload"}
                        </p>
                      )}
                      {recording.uploadProgress > 0 && (
                        <div className="flex items-center w-full">
                          <p className="text-gray-neutral50 text-sm mr-2">
                            {recording.uploadProgress}%
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-shade3 h-2 rounded-full"
                              style={{
                                width: `${recording.uploadProgress}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
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
                <p className="text-gray-neutral50 text-lg">No recordings yet</p>
                <p className="text-gray-neutral40">
                  Start recording your answers to see them here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {isSubmitted && (
        <div className="rounded-2xl p-8 shadow-md w-1/3 slide-in h-screen overflow-auto">
          <h2 className="text-bold text-2xl font-bold text-gray-neutral100 mb-4">
            Interview Result
          </h2>
          {interviewResult ? (
            <>
              <div className="space-y-4">
                {interviewResult?.data?.evaluations.map((evaluation) => (
                  <div key={evaluation.criteria}>
                    <p className="font-bold text-gray-neutral70">
                      {evaluation.criteria} ({evaluation.score})
                    </p>
                    <p className="text-gray-neutral70">{evaluation.analysis}</p>
                  </div>
                ))}
              </div>
              <h2 className="mt-2 mb-1 text-bold text-2xl font-bold text-gray-neutral100">
                Summary
              </h2>

              <ReactMarkdown>
                {`${interviewResult?.data?.analysis_summary}`}
              </ReactMarkdown>
            </>
          ) : (
            <div className="w-full">
              <p>Analysing...</p>
              <div className="mt-2 shimmer w-full h-4 rounded-lg" />
              <div className="mt-2 shimmer w-full h-4 rounded-lg" />
              <div className="mt-2 shimmer w-full h-4 rounded-lg" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
