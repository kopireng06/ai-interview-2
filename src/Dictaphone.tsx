import "regenerator-runtime/runtime";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

const Dictaphone = ({
  onReady,
  onRepeat,
  onNext,
}: {
  onReady: () => void;
  onRepeat: () => void;
  onNext: () => void;
}) => {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    browserSupportsContinuousListening,
  } = useSpeechRecognition({
    language: "id",
    commands: [
      { command: "saya siap", callback: onReady },
      { command: "mohon ulangi", callback: onRepeat },
      { command: "mohon lanjut", callback: onNext },
    ],
  });

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }

  if (!browserSupportsContinuousListening) {
    return <span>Browser doesn't support continuous listening.</span>;
  }

  if (!isMicrophoneAvailable) {
    return <span>Microphone is not available.</span>;
  }

  return (
    <div>
      <p>Microphone: {isMicrophoneAvailable ? "on" : "off"}</p>
      <p>Microphone: {listening ? "on" : "off"}</p>
      <button onClick={() => SpeechRecognition.startListening()}>Start</button>
      <button onClick={() => SpeechRecognition.stopListening()}>Stop</button>
      <button onClick={() => resetTranscript()}>Reset</button>
      <p>{transcript}</p>
    </div>
  );
};
export default Dictaphone;
