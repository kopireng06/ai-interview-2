import { useEffect, useState } from "react";
import { useFetchInterviewResult, useLogin } from "./network";
import ReactMarkdown from "react-markdown";
import { SnackbarProvider } from "notistack";

const CheckInterviewResult = () => {
  const { login, data: loginData } = useLogin();
  const isLoggedIn = !!loginData?.data?.auth_token;

  const [chatId, setChatId] = useState("");
  const [chatIdKeyword, setChatIdKeyword] = useState("");
  const { data: interviewResult, isAnalysing } =
    useFetchInterviewResult(chatId);

  const handleSubmit = () => {
    if (chatIdKeyword) {
      setChatId(chatIdKeyword);
    }
  };

  useEffect(() => {
    login();
  }, []);

  return (
    <div className="flex bg-gradient-to-br from-primary-tint4 via-white to-primary-tint3 h-screen overflow-auto">
      <SnackbarProvider preventDuplicate />
      <div className="rounded-2xl p-8 max-w-5xl m-auto">
        <button
          onClick={() => {
            window.location.href = "/";
          }}
          className="mb-10 z-10 bg-primary-shade1 text-white px-4 py-2 rounded-lg hover:bg-primary-shade2 transition duration-300"
        >
          Back Interview
        </button>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-shade3 to-primary-shade1 bg-clip-text text-transparent mb-6">
          Check Interview Result
        </h2>
        <div className="mb-4 flex gap-3 justify-center items-center">
          <input
            type="text"
            value={chatIdKeyword}
            onChange={(e) => setChatIdKeyword(e.target.value)}
            placeholder="Enter Chat ID"
            className="border border-gray-300 rounded-lg p-2 w-full"
          />
          <button
            disabled={!isLoggedIn}
            onClick={handleSubmit}
            className={`bg-primary-shade3 text-white px-4 py-2 rounded-lg transition duration-300 ${
              !isLoggedIn
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-primary-shade2"
            }`}
          >
            Submit
          </button>
        </div>
        {isAnalysing ? (
          <div className="w-full">
            <p>Analysing...</p>
            <div className="mt-2 shimmer w-full h-4 rounded-lg" />
            <div className="mt-2 shimmer w-full h-4 rounded-lg" />
            <div className="mt-2 shimmer w-full h-4 rounded-lg" />
          </div>
        ) : interviewResult ? (
          <>
            <div className="space-y-4">
              {interviewResult.data.evaluations.map((evaluation) => (
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
              {`${interviewResult.data.analysis_summary}`}
            </ReactMarkdown>
          </>
        ) : (
          <p>{chatId ? "No results available." : ""}</p>
        )}
      </div>
    </div>
  );
};

export default CheckInterviewResult;
