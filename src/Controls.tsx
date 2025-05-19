/* eslint-disable react-hooks/exhaustive-deps */

import 'regenerator-runtime/runtime'
import { FaPause } from 'react-icons/fa'
import { questions } from './const'
import { useAtom } from 'jotai'
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
  currentStepAtom,
  audioTypeAtom,
  interviewStep
} from './state/atom'

import { useEffect, useMemo, useState } from 'react'
import { useStartInterview, useFinishInterview, useUploadFile } from './network'
import { useLogin } from './network'

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { useAudioListener } from './useAudioListener'

export default function Controls() {
  const [currentQuestion, setCurrentQuestion] = useAtom(currentQuestionAtom)
  const [isRecording, setIsRecording] = useAtom(isRecordingAtom)
  const [recordings, setRecordings] = useAtom(recordingsAtom)
  const [stream] = useAtom(streamAtom)
  const [isSubmitted, setIsSubmitted] = useAtom(submitAtom)
  const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom) // New state for playing

  const [isStarting, setIsStarting] = useState(false)

  const [videoRef] = useAtom(videoRefAtom)
  const [mediaRecorderRef, setMediaRecorderRef] = useAtom(mediaRecorderRefAtom)
  const [chunksRef, setChunksRef] = useAtom(chunksRefAtom)
  const [audioType, setAudioType] = useAtom(audioTypeAtom)
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom)
  const { listenToAudio, audioPlayerStatus } = useAudioListener()

  const { data: loginData } = useLogin()
  const { startInterview: startInterviewFn, data } = useStartInterview()
  const { finishInterview: finishInterviewFn } = useFinishInterview()

  const [repeatQuota, setRepeatQuota] = useState(1)

  const isInterviewStarted = !!data?.data?.chat_id
  const isFinishBriefing = currentStep == interviewStep.indexOf('panduan') && audioPlayerStatus == 'ended'
  const isAnswering = currentStep > interviewStep.indexOf('transition-start')
  const isInterviewEnded = currentStep == interviewStep.indexOf('closing')

  const currentRecording = useMemo(
    () => recordings.find((r) => r.questionId === questions[currentQuestion]?.id),
    [recordings, currentQuestion]
  )

  function repeat() {
    if (repeatQuota == 0) return

    SpeechRecognition.stopListening()
    listenToAudio(audioType, () => {
      setRepeatQuota(repeatQuota - 1)
      SpeechRecognition.startListening({
        language: 'id',
        continuous: true
      })
    })
  }

  function start() {
    if (isAnswering) return

    setCurrentStep(interviewStep.indexOf('transition-start'))

    setAudioType('transition-start')
    setIsRecording(false)
    listenToAudio('transition-start', () => {
      setCurrentStep(interviewStep.indexOf('question-1'))
      setAudioType('question-1')

      listenToAudio('question-1', () => {
        setCurrentQuestion(1)
        startRecording()
      })
    })
  }

  function nextQuestionTrigger() {
    if (!isAnswering) return

    const newQuestion = currentQuestion + 1

    stopRecording()
    SpeechRecognition.stopListening()
    setCurrentQuestion(newQuestion)

    if (currentStep == interviewStep.indexOf('question-5')) {
      SpeechRecognition.stopListening()
      setCurrentStep(interviewStep.indexOf('closing'))
      handleSubmit()

      listenToAudio('closing', () => {})
      return
    }

    if (currentStep == interviewStep.indexOf('question-4')) {
      setCurrentStep(interviewStep.indexOf('transition-final'))

      listenToAudio('transition-final', () => {
        setCurrentStep(interviewStep.indexOf('question-5'))
        listenToAudio('question-5', () => {
          setRepeatQuota(1)
          startRecording()
          SpeechRecognition.startListening({
            language: 'id',
            continuous: true
          })
        })
      })
      return
    }

    listenToAudio('transition', () => {
      SpeechRecognition.startListening({
        language: 'id',
        continuous: true
      })
      setCurrentStep(interviewStep.indexOf(`question-${newQuestion}`))

      listenToAudio(`question-${newQuestion}`, () => {
        setRepeatQuota(1)
        startRecording()
      })
    })
  }

  useSpeechRecognition({
    language: 'id',
    clearTranscriptOnListen: true,

    ...((audioPlayerStatus === 'ended' || audioPlayerStatus === 'paused') && {
      commands: [
        {
          isFuzzyMatch: true,
          command: /saya siap albi/,
          callback: start
        },
        {
          isFuzzyMatch: true,
          command: /tolong ulangi albi/,
          callback: repeat
        },
        {
          isFuzzyMatch: true,
          command: /sudah cukup albi/,
          callback: nextQuestionTrigger
        }
      ]
    })
  })

  const { uploadFile } = useUploadFile((percentComplete) => {
    setRecordings((prev) =>
      prev.map((r) => (r.questionId === questions[currentQuestion].id ? { ...r, uploadProgress: percentComplete } : r))
    )
  })

  const isLastQuestion = currentQuestion === questions.length

  const isLoggedIn = !!loginData?.data?.auth_token

  const startInterview = async () => {
    setIsStarting(true)
    try {
      await startInterviewFn()
      setIsStarting(false)
      listenToAudio('opening', () => {
        setAudioType('panduan')
        setCurrentStep(interviewStep.indexOf('panduan'))
        listenToAudio('panduan', () => {
          setIsRecording(true)
          SpeechRecognition.startListening({
            language: 'id',
            continuous: true
          })
        })
      })
    } catch (error) {
      return error
    }
  }

  const startRecording = () => {
    if (!stream) return

    if (currentRecording) {
      setIsRecording(true)
      if (videoRef && stream) {
        videoRef.srcObject = stream
        videoRef.muted = true // Mute for camera preview
      }
    }

    const mediaRecorder = new MediaRecorder(stream)
    setMediaRecorderRef(mediaRecorder)
    setChunksRef([])

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.push(event.data)
      }
    }

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)

      setRecordings((prev) => [
        ...prev.filter((r) => r.questionId !== questions[currentQuestion].id),
        {
          questionId: questions[currentQuestion].id,
          videoBlob: blob,
          url,
          uploadProgress: 0
        }
      ])

      await uploadFile({
        blob: blob,
        fileName: `question-${questions[currentQuestion].id}-response.webm`
      })

      setChunksRef([])
    }

    mediaRecorder.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    if (mediaRecorderRef && isRecording) {
      mediaRecorderRef.stop()
      setIsRecording(false)
    }
  }

  const checkRecordingPlayed = () => {
    if (videoRef) {
      videoRef.onended = () => {
        setIsPlaying(false) // Set playing state to false when recording has finished playing
      }
    }
  }

  useEffect(() => {
    checkRecordingPlayed()
  }, [currentRecording])

  const pauseRecording = () => {
    if (videoRef && isPlaying) {
      videoRef.pause()
      videoRef.src = null
      videoRef.srcObject = stream
      videoRef.play()
      setIsPlaying(false) // Set playing state to false
    }
  }

  const handleSubmit = async () => {
    setIsSubmitted(true)

    if (videoRef && currentRecording) {
      videoRef.srcObject = null
      videoRef.src = currentRecording.url // Set video to latest recording
      videoRef.play()
    }
  }

  return (
    <div className='flex flex-col gap-4 mx-auto '>
      <div className='w-full'>
        <div className='flex gap-4 justify-center'>
          {/* button init */}
          {!isInterviewStarted && (
            <button
              disabled={!stream?.active || !isLoggedIn || isStarting}
              onClick={startInterview}
              className='disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-[#bb1724] text-white px-6 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300'
            >
              Mulai Interview
            </button>
          )}

          {isInterviewStarted && isFinishBriefing && (
            <button
              onClick={start}
              className='flex items-center gap-2 px-6 py-3 bg-[#bb1724] text-white rounded-full shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300'
            >
              Saya siap
            </button>
          )}
          {/* end button init */}

          {/* button during answering */}
          {!!repeatQuota && isAnswering && audioPlayerStatus === 'ended' && !isInterviewEnded && (
            <button
              onClick={repeat}
              className='flex items-center gap-2 text-[#bb1724] bg-white px-6 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300'
            >
              Ulangi Pertanyaan
            </button>
          )}

          {isAnswering && !isInterviewEnded && audioPlayerStatus === 'ended' && (
            <button
              onClick={nextQuestionTrigger}
              className='flex items-center gap-2 px-6 py-3 bg-[#bb1724] text-white rounded-full shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300'
            >
              {isLastQuestion ? 'Selesai' : 'Pertanyaan Berikutnya'}
            </button>
          )}

          {/* end button during answering */}

          {/* button when end */}

          {isSubmitted && isPlaying && (
            <div className='flex gap-2'>
              <button
                onClick={pauseRecording}
                className='flex items-center gap-2 bg-white text-gray-neutral70 px-6 py-3 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300'
              >
                <FaPause size={20} />
                Pause
              </button>
            </div>
          )}
          {/* end button when end */}
        </div>
      </div>

      {isSubmitted && (
        <div className='text-center mt-4'>
          <p className='text-lg font-medium text-gray-neutral100 text-white'>
            Terimakasih telah menyelesaikan interview bersama kami
          </p>
        </div>
      )}
    </div>
  )
}
