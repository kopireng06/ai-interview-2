import { SnackbarProvider } from "notistack";
import AvatarScene from "./AvatarScenes";
import User from "./User";
import Result from "./Result";
import { useStartInterview } from "./network";
import Controls from "./Controls";
import Recordings from "./Recordings";
import { submitAtom, currentStepAtom, interviewStep } from "./state/atom";
import { useAtom } from "jotai";
import { useAudioListener } from "./useAudioListener";
import { FaArrowRight, FaLightbulb } from "react-icons/fa";

function App() {
  const { data } = useStartInterview();

  const [isSubmitted] = useAtom(submitAtom);
  const [currentStep] = useAtom(currentStepAtom);
  const { audioPlayerStatus } = useAudioListener();

  const isInterviewStarted = !!data?.data?.chat_id;
  const isInterviewEnded = currentStep == interviewStep.indexOf("closing");

  return (
    <>
      <div className="h-screen overflow-y-auto p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700">
        <SnackbarProvider
          preventDuplicate
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        />
        <div className="flex justify-between mb-10">
          <p className="mb-4 text-lg font-semibold text-white">
            Chat Id:{" "}
            <span className="font-bold text-primary-default">
              {data?.data?.chat_id}
            </span>
          </p>
          <button
            onClick={() => {
              window.location.href = "/check";
            }}
            className="flex gap-2 items-center text-sm z-10 bg-primary-shade1 text-white px-2 py-1 rounded-xl hover:bg-primary-shade2 transition duration-300"
          >
            Cek Hasil Interview Sebelumnya
            <FaArrowRight />
          </button>
        </div>

        <div className="flex justify-center gap-4">
          {(isInterviewEnded
            ? audioPlayerStatus !== "ended"
            : isInterviewStarted) && <AvatarScene />}
          <User />
        </div>
        <div className="flex">
          <Controls />
        </div>

        {isSubmitted && (
          <div className="mt-10 flex justify-center gap-4 mt-4 ">
            <Result />
            <Recordings />
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 p-4">
        <button className="hint relative flex items-center justify-center w-12 h-12 rounded-full bg-yellow-300 hover:bg-yellow-400 transition duration-300">
          <FaLightbulb className="text-white" />
        </button>
        <div className="menu p-4 text-left absolute !w-[500px] z-[20] left-20 bottom-4 w-64 p-2 bg-white rounded-lg shadow-md opacity-0 transition-opacity duration-300">
          <h3 className="text-lg font-semibold">Hint</h3>
          <ul className="text-gray-700 p-2 list-[circle] ">
            <li>Tekan button “Mulai Interview“ untuk memulai interview</li>
            <li>
              “sudah cukup raka” - untuk mengakhiri jawaban atau lanjut ke
              pertanyaan berikutnya
            </li>
            <li>“saya siap raka” - untuk memulai sesi tanya jawab interview</li>
            <li>“tolong ulangi raka” - untuk mengulang pertanyaan</li>
            <li>anda juga bisa menggunakan button dibawah video</li>
          </ul>
        </div>
      </div>
    </>
  );
}

export default App;
