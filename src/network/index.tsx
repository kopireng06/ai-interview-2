/* eslint-disable @typescript-eslint/no-explicit-any */
import useSWR, { mutate } from "swr";
import axios from "axios";
import { enqueueSnackbar } from "notistack";
import { questions } from "./const";
import { useState } from "react";

const axiosInstance = axios.create({
  baseURL: "https://api-staging.rakamin.com/api/v1",
});

const formatBytes = (bytes: number, decimals: number) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const useFetchInterviewResult = () => {
  const { data: startInterviewData } = useStartInterview();
  const { data: finishInterviewData } = useFinishInterview();
  const { data: loginData } = useLogin();

  const fetchInterviewResult = async (): Promise<{
    data: {
      evaluations: Array<{
        criteria: string;
        score: number;
        analysis: string;
      }>;
      summary: string;
      status: string;
    };
  }> => {
    const response = await axiosInstance.get(
      `ai/interviews/${startInterviewData?.data?.chat_id}/result`,
      {
        headers: {
          Authorization: `Bearer ${loginData.data.auth_token}`,
        },
      }
    );
    return response.data;
  };

  const { data, error } = useSWR(
    finishInterviewData?.data?.chat_id
      ? `ai/interviews/${startInterviewData?.data?.chat_id}/result`
      : null,
    fetchInterviewResult,
    {
      errorRetryInterval: 3000,
      errorRetryCount: 20,
      onError() {
        enqueueSnackbar(
          "Sepertinya belum selesai menganalisa, mencoba lagi dalam 3 detik, harap tunggu",
          {
            variant: "info",
          }
        );

        return true;
      },
    }
  );

  return { data, error };
};

const useUploadFile = (
  onUploadProgress?: (
    percentComplete: number,
    totalLoaded: string,
    totalFilesize: string
  ) => void
) => {
  const { submitInterview } = useSubmitInterview();

  const { data } = useSWR("video_upload", {
    fallbackData: [],
  });

  const uploadFile = async ({
    fileName,
    blob,
  }: {
    fileName: string;
    blob: Blob;
  }) => {
    const file = new File([blob], fileName, { type: "video/webm" });

    try {
      const response = await axiosInstance.get("/uploads/presign_no_auth", {
        params: {
          filename: fileName,
          directory: "files",
          extension: "webm",
        },
      });

      enqueueSnackbar("Mengumpulkan video ke HR", {
        variant: "info",
      });

      const { upload_url, download_url } = response?.data?.data || {};

      await axios({
        method: "put",
        url: upload_url,
        data: file,
        headers: {
          "Content-Type": file.type,
          acl: "public-read",
        },
        onUploadProgress: (progressEvent: any) => {
          let percentComplete = progressEvent.loaded / progressEvent.total;
          // @ts-expect-error TS(2345): Argument of type 'number' is not assignable to par... Remove this comment to see the full error message
          percentComplete = parseInt(percentComplete * 100);

          const totalLoaded = formatBytes(progressEvent.loaded, 2);
          const totalFilesize = formatBytes(progressEvent.total, 2);

          onUploadProgress?.(percentComplete, totalLoaded, totalFilesize);
        },
      });

      enqueueSnackbar("Video sudah dikirim ke HR", { variant: "success" });

      await submitInterview([download_url]);
      mutate("video_upload", [...data, download_url]);
    } catch (error) {
      enqueueSnackbar("Gagal mengumpulkan video ke HR", { variant: "error" });
      throw error;
    }
  };

  return { uploadFile, data };
};

const useLogin = () => {
  const [isLoggingin, setIsLoggingin] = useState(false);
  const { data, error } = useSWR("login");

  const login = async () => {
    if (isLoggingin) return;

    try {
      setIsLoggingin(true);
      const response = await axiosInstance.post("/auth/login", {
        email: "student@rakamin.com",
        password: "password",
      });
      enqueueSnackbar("Login successful", { variant: "success" });
      mutate("login", response.data);
      setIsLoggingin(false);
      return response.data;
    } catch (error) {
      setIsLoggingin(false);
      enqueueSnackbar("Error during login", { variant: "error" });
      throw error;
    }
  };

  return { data, error, login, isLoggingin };
};

const useStartInterview = () => {
  const { data: loginData } = useLogin();
  const { data, error } = useSWR("/ai/interviews/start");

  const startInterview = async () => {
    try {
      const response = await axiosInstance.post("/ai/interviews/start", null, {
        headers: {
          Authorization: `Bearer ${loginData.data.auth_token}`,
        },
      });
      enqueueSnackbar("Interview dimulai, semoga berhasil", {
        variant: "info",
      });
      mutate("/ai/interviews/start", response.data); // Revalidate the interview data
      return response.data;
    } catch (error) {
      enqueueSnackbar("Error starting interview", { variant: "error" });
      throw error;
    }
  };

  return { data, error, startInterview };
};

const useSubmitInterview = () => {
  const { data: loginData } = useLogin();
  const { data: startInterviewData } = useStartInterview();
  const { data: isSubmittedData } = useSWR("/ai/interviews/submit");

  const submitInterview = async (videoUploadData: string[]) => {
    try {
      await axiosInstance.post(
        "/ai/interviews/submit",
        {
          chat_id: startInterviewData.data.chat_id,
          urls: [videoUploadData[videoUploadData.length - 1]],
          questions: questions[videoUploadData.length - 1].text,
        },
        {
          headers: {
            Authorization: `Bearer ${loginData.data.auth_token}`,
          },
        }
      );
      enqueueSnackbar("Video sedang dianalisa oleh HR", { variant: "success" });
      mutate("/ai/interviews/submit", true); // Revalidate the submission data
    } catch (error) {
      mutate("/ai/interviews/submit", false);

      enqueueSnackbar("Error submitting interview", { variant: "error" });
      throw error;
    }
  };

  return { submitInterview, isSubmittedData };
};

const useFinishInterview = () => {
  const { data: loginData } = useLogin();
  const { data, error } = useSWR("/ai/interviews/finish");
  const { data: startInterviewData } = useStartInterview();

  const finishInterview = async () => {
    try {
      const response = await axiosInstance.post(
        "/ai/interviews/finish",
        {
          chat_id: startInterviewData.data.chat_id,
        },
        {
          headers: {
            Authorization: `Bearer ${loginData.data.auth_token}`,
          },
        }
      );

      enqueueSnackbar("Interview selesai, terima kasih", {
        variant: "success",
      });
      mutate("/ai/interviews/finish", response.data); // Revalidate the finish data
      return response.data;
    } catch (error) {
      enqueueSnackbar("Error finishing interview", { variant: "error" });
      throw error;
    }
  };

  return { data, error, finishInterview };
};

export {
  useStartInterview,
  useSubmitInterview,
  useFinishInterview,
  useLogin,
  useUploadFile,
  useFetchInterviewResult,
};
