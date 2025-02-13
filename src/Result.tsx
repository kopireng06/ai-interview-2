import ReactMarkdown from "react-markdown";
import { useFetchInterviewResult } from "./network";
import { submitAtom } from "./state/atom";
import { useAtomValue } from "jotai";

export default function Result() {
  const isSubmitted = useAtomValue(submitAtom);
  const { data: interviewResult } = useFetchInterviewResult();

  if (!isSubmitted) {
    return;
  }

  return (
    <div className="rounded-2xl p-8 slide-in overflow-auto max-h-[500px] overflow-y-auto">
      <h2 className="text-white text-bold text-2xl font-bold text-gray-neutral100 mb-4">
        Interview Result
      </h2>
      {interviewResult ? (
        <>
          <div className="space-y-4">
            {interviewResult?.data?.evaluations.map((evaluation) => (
              <div key={evaluation.criteria}>
                <p className="font-bold text-white">
                  {evaluation.criteria} ({evaluation.score})
                </p>
                <p className="text-white">{evaluation.analysis}</p>
              </div>
            ))}
          </div>
          <h2 className="text-white mt-2 mb-1 text-bold text-2xl font-bold text-gray-neutral100">
            Summary
          </h2>

          <ReactMarkdown className="text-white">
            {`${interviewResult?.data?.analysis_summary}`}
          </ReactMarkdown>
        </>
      ) : (
        <div className="w-full">
          <p className="text-white">Analysing...</p>
          <div className="mt-2 shimmer w-full h-4 rounded-lg" />
          <div className="mt-2 shimmer w-full h-4 rounded-lg" />
          <div className="mt-2 shimmer w-full h-4 rounded-lg" />
        </div>
      )}
    </div>
  );
}
