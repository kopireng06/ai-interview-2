/* eslint-disable @typescript-eslint/no-explicit-any */
import useSWR, { mutate } from 'swr'
import axios from 'axios'
import { enqueueSnackbar } from 'notistack'
import { questions } from '../const'
import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { currentQuestionAtom } from '../state/atom'

const axiosInstance = axios.create({
  baseURL: 'https://api-staging.rakamin.com/api/v1'
})

const formatBytes = (bytes: number, decimals: number) => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

const useFetchInterviewResult = (chat_id?: string) => {
  const { data: startInterviewData } = useStartInterview()
  const { data: finishInterviewData } = useFinishInterview()
  const { data: loginData } = useLogin()
  const [isAnalysing, setIsAnalysing] = useState(false)

  const fetchInterviewResult = async (): Promise<{
    data: {
      evaluations: Array<{
        criteria: string
        score: number
        analysis: string
      }>
      analysis_summary: string
      summary: string
      status: string
    }
  }> => {
    const response = await axiosInstance.get(`ai/interviews/${chat_id || startInterviewData?.data?.chat_id}/result`, {
      headers: {
        Authorization: `Bearer ${loginData?.data?.auth_token}`
      }
    })

    if (response?.data?.data?.status === 'processing') {
      setIsAnalysing(true)
      throw new Error('try')
    }

    setIsAnalysing(false)

    return response?.data
  }

  const { data, error, mutate } = useSWR(
    finishInterviewData?.data?.chat_id || chat_id
      ? [`ai/interviews/${startInterviewData?.data?.chat_id}/result`, chat_id]
      : null,
    fetchInterviewResult,
    {
      errorRetryInterval: 3000,
      errorRetryCount: 20,
      onError(error) {
        if (error.message === 'try') {
          enqueueSnackbar('Sedang menganalisa, harap tunggu', {
            variant: 'info'
          })
        }

        return true
      }
    }
  )

  return { data, error, isAnalysing, mutate }
}

const useUploadFile = (
  onUploadProgress?: (percentComplete: number, totalLoaded: string, totalFilesize: string) => void
) => {
  const { submitInterview } = useSubmitInterview()
  const currentQuestion = useAtomValue(currentQuestionAtom)
  const { finishInterview } = useFinishInterview()

  const { data } = useSWR('video_upload', {
    fallbackData: []
  })

  const uploadFile = async ({ fileName, blob }: { fileName: string; blob: Blob }) => {
    const file = new File([blob], fileName, { type: 'video/webm' })

    try {
      const response = await axiosInstance.get('/uploads/presign_no_auth', {
        params: {
          filename: fileName,
          directory: 'files',
          extension: 'webm'
        }
      })

      enqueueSnackbar('Mengirim video', {
        variant: 'info'
      })

      const { upload_url, download_url } = response?.data?.data || {}

      await axios({
        method: 'put',
        url: upload_url,
        data: file,
        headers: {
          'Content-Type': file.type,
          acl: 'public-read'
        },
        onUploadProgress: (progressEvent: any) => {
          let percentComplete = progressEvent.loaded / progressEvent.total
          // @ts-expect-error TS(2345): Argument of type 'number' is not assignable to par... Remove this comment to see the full error message
          percentComplete = parseInt(percentComplete * 100)

          const totalLoaded = formatBytes(progressEvent.loaded, 2)
          const totalFilesize = formatBytes(progressEvent.total, 2)

          onUploadProgress?.(percentComplete, totalLoaded, totalFilesize)
        }
      })

      enqueueSnackbar('Video sukses terupload', { variant: 'success' })

      await submitInterview([...data, download_url])
      mutate('video_upload', [...data, download_url])

      if (currentQuestion === questions.length - 1) {
        await finishInterview()
      }
    } catch (error) {
      enqueueSnackbar('Gagal mengirim video', { variant: 'error' })
      throw error
    }
  }

  return { uploadFile, data }
}

const useLogin = () => {
  const [isLoggingin, setIsLoggingin] = useState(false)
  const { data, error } = useSWR('login')

  const login = async () => {
    if (isLoggingin) return

    try {
      setIsLoggingin(true)
      const response = await axiosInstance.post('/auth/login', {
        email: 'student@rakamin.com',
        password: 'password'
      })
      enqueueSnackbar('System Ready', { variant: 'success' })
      mutate('login', response.data)
      setIsLoggingin(false)
      return response.data
    } catch (error) {
      setIsLoggingin(false)
      enqueueSnackbar('Error during login', { variant: 'error' })
      throw error
    }
  }

  return { data, error, login, isLoggingin }
}

const useStartInterview = () => {
  const { data: loginData } = useLogin()
  const { data, error } = useSWR('/ai/interviews/start')

  const startInterview = async () => {
    try {
      const response = await axiosInstance.post(
        '/ai/interviews/start',
        {
          interview_type: 'alfamart_interview'
        },
        {
          headers: {
            Authorization: `Bearer ${loginData.data.auth_token}`
          }
        }
      )
      enqueueSnackbar('Interview dimulai, semoga berhasil', {
        variant: 'info'
      })
      mutate('/ai/interviews/start', response.data) // Revalidate the interview data
      return response.data
    } catch (error) {
      enqueueSnackbar('Error starting interview', { variant: 'error' })
      throw error
    }
  }

  return { data, error, startInterview }
}

const useSubmitInterview = () => {
  const { data: loginData } = useLogin()
  const { data: startInterviewData } = useStartInterview()
  const { data: isSubmittedData } = useSWR('/ai/interviews/submit')
  const currentQuestion = useAtomValue(currentQuestionAtom)

  const submitInterview = async (videoUploadData: string[]) => {
    try {
      await axiosInstance.post(
        '/ai/interviews/submit',
        {
          chat_id: startInterviewData.data.chat_id,
          urls: [videoUploadData[videoUploadData.length - 1]],
          question: questions[currentQuestion].text
        },
        {
          headers: {
            Authorization: `Bearer ${loginData.data.auth_token}`
          }
        }
      )
      mutate('/ai/interviews/submit', true) // Revalidate the submission data
    } catch (error) {
      mutate('/ai/interviews/submit', false)

      enqueueSnackbar('Error submitting interview', { variant: 'error' })
      throw error
    }
  }

  return { submitInterview, isSubmittedData }
}

const useFinishInterview = () => {
  const { data: loginData } = useLogin()
  const { data, error } = useSWR('/ai/interviews/finish')
  const { data: startInterviewData } = useStartInterview()

  const finishInterview = async () => {
    try {
      const response = await axiosInstance.post(
        '/ai/interviews/finish',
        {
          chat_id: startInterviewData.data.chat_id,
          interview_type: 'alfamart_interview'
        },
        {
          headers: {
            Authorization: `Bearer ${loginData.data.auth_token}`
          }
        }
      )

      enqueueSnackbar('Interview selesai, terima kasih', {
        variant: 'success'
      })
      mutate('/ai/interviews/finish', response.data) // Revalidate the finish data
      return response.data
    } catch (error) {
      enqueueSnackbar('Error finishing interview', { variant: 'error' })
      throw error
    }
  }

  return { data, error, finishInterview }
}

export { useStartInterview, useSubmitInterview, useFinishInterview, useLogin, useUploadFile, useFetchInterviewResult }
