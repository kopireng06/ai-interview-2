import React, { useState, useRef, useEffect } from "react";
import {
  FaCamera,
  FaPause,
  FaPlay,
  FaSave,
  FaChevronLeft,
  FaChevronRight,
  FaSync,
} from "react-icons/fa";

interface Question {
  id: number;
  text: string;
}

interface Recording {
  questionId: number;
  videoBlob: Blob;
  url: string;
}

const questions: Question[] = [
  { id: 1, text: "Tell us about yourself and your background." },
  { id: 2, text: "What are your greatest professional achievements?" },
  { id: 3, text: "Where do you see yourself in 5 years?" },
  { id: 4, text: "Why are you interested in this position?" },
];

function App() {
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    initializeCamera();
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

  const startRecording = () => {
    if (currentRecording) {
      setIsRecording(true);
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute for camera preview
      }
    }

    if (!stream) return;

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

      setRecordings((prev) => {
        const filtered = prev.filter(
          (r) => r.questionId !== questions[currentQuestion].id
        );
        return [
          ...filtered,
          {
            questionId: questions[currentQuestion].id,
            videoBlob: blob,
            url,
          },
        ];
      });

      chunksRef.current = [];
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecording = (recording: Recording) => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = recording.url;
      videoRef.current.muted = false; // Unmute for playback
      videoRef.current.style.transform = "none";
      videoRef.current.play();
    }
  };

  const switchToCamera = () => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true; // Mute for camera preview
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      switchToCamera();
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
      switchToCamera();
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

  const currentRecording = recordings.find(
    (r) => r.questionId === questions[currentQuestion].id
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto p-8">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 mb-8 transition-all duration-300">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Video Interview
            </h1>
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                Question {currentQuestion + 1} of {questions.length}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-2xl font-medium text-gray-800 mb-2 transition-all duration-300 ease-in-out">
              {questions[currentQuestion].text}
            </p>
          </div>

          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl transform -rotate-1 scale-[1.01] opacity-30 group-hover:opacity-40 transition-all duration-300"></div>
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-[500px] bg-gray-900 rounded-2xl object-cover shadow-lg transition-transform duration-300"
              />

              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                <div className="flex gap-4">
                  {!isRecording ? (
                    <>
                      <button
                        onClick={startRecording}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
                      >
                        <FaCamera size={20} />
                        {currentRecording ? "Record Again" : "Start Recording"}
                      </button>
                      {currentRecording && (
                        <button
                          onClick={() => playRecording(currentRecording)}
                          className="flex items-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
                        >
                          <FaPlay size={20} />
                          Play Recording
                        </button>
                      )}
                      {currentRecording &&
                        videoRef.current?.srcObject === null && (
                          <button
                            onClick={switchToCamera}
                            className="flex items-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
                          >
                            <FaSync size={20} />
                            Switch to Camera
                          </button>
                        )}
                    </>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600 hover:shadow-lg hover:scale-105 transition-all duration-300"
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
              onClick={previousQuestion}
              disabled={currentQuestion === 0}
              className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-full shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              <FaChevronLeft size={20} />
              Previous
            </button>
            <button
              onClick={nextQuestion}
              disabled={currentQuestion === questions.length - 1}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              Next
              <FaChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
            Your Recordings
          </h2>
          <div className="space-y-4">
            {recordings.map((recording, index) => {
              const question = questions.find(
                (q) => q.id === recording.questionId
              );
              return (
                <div
                  key={recording.questionId}
                  className="flex items-center justify-between p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">
                      Question {question?.id}
                    </p>
                    <p className="text-gray-600">{question?.text}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        playRecording(recording);
                        setCurrentQuestion(index);
                      }}
                      className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors duration-300"
                    >
                      <FaPlay size={20} />
                      <span className="font-medium">Play</span>
                    </button>
                    <button
                      onClick={() => downloadRecording(recording.questionId)}
                      className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors duration-300"
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
                <p className="text-gray-500 text-lg">No recordings yet</p>
                <p className="text-gray-400">
                  Start recording your answers to see them here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
