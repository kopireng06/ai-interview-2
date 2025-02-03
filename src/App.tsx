import { useState, useRef, useEffect } from "react";
import {
  FaCamera,
  FaPause,
  FaPlay,
  FaSave,
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
  const [isTalking, setIsTalking] = useState<number>(0);

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

      audioHandler(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true; // Mute for camera preview
      }

      audioHandler(mediaStream);
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert(
        "Unable to access camera and microphone. Please ensure you have granted the necessary permissions."
      );
    }
  };

  const startRecording = () => {
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
        ...prev.filter((r) => r.questionId !== questions[currentQuestion].id),
        {
          questionId: questions[currentQuestion].id,
          videoBlob: blob,
          url,
        },
      ]);

      chunksRef.current = [];
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTalking(0); // Indicate that the user has stopped talking
    }
  };

  const playRecording = (recording: Recording) => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = recording.url;
      videoRef.current.muted = false; // Unmute for playback
      videoRef.current.play();
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1 && recordings.length > 0) {
      setCurrentQuestion((prev) => prev + 1);
      switchToCamera();
    }
  };

  const switchToCamera = () => {
    if (videoRef.current && stream) {
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

  const currentRecording = recordings.find(
    (r) => r.questionId === questions[currentQuestion].id
  );

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

      setIsTalking(average);
    };

    draw();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-tint4 via-white to-primary-tint3">
      <div className="max-w-5xl mx-auto p-8">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 mb-8 transition-all duration-300">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-shade3 to-primary-shade1 bg-clip-text text-transparent">
              Video Interview
            </h1>
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="px-3 py-1 bg-primary-tint1 text-white rounded-full">
                Question {currentQuestion + 1} of {questions.length}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-2xl font-medium text-gray-neutral90 mb-2 transition-all duration-300 ease-in-out">
              {questions[currentQuestion].text}
            </p>
          </div>

          <div className="relative mb-8 group">
            <div
              className={`rounded-2xl absolute inset-0 bg-gradient-to-r from-primary-shade3 to-primary-shade1 opacity-30 group-hover:opacity-80 transition-all duration-300`}
              style={{
                boxShadow: `0 0 0 ${
                  isTalking < 20 ? isTalking : 20
                }px rgba(15, 3, 242, 0.5)`,

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

              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                <div className="flex gap-4">
                  {!isRecording ? (
                    <>
                      <button
                        onClick={startRecording}
                        className="flex items-center gap-2 bg-gradient-to-r from-primary-shade3 to-primary-shade1 text-white px-6 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
                      >
                        <FaCamera size={20} />
                        {currentRecording ? "Record Again" : "Start Recording"}
                      </button>
                      {currentRecording && (
                        <button
                          onClick={() => playRecording(currentRecording)}
                          className="flex items-center gap-2 bg-white text-gray-neutral70 px-6 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300"
                        >
                          <FaPlay size={20} />
                          Play Recording
                        </button>
                      )}
                      {currentRecording &&
                        videoRef.current?.srcObject === null && (
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
              onClick={nextQuestion}
              disabled={
                currentQuestion === questions.length - 1 ||
                recordings.length === 0
              }
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-shade3 to-primary-shade1 text-white rounded-full shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              Next
              <FaChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8">
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
    </div>
  );
}

export default App;
