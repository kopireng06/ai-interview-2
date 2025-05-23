import { SnackbarProvider } from 'notistack'
import AvatarScene from './AvatarScenes'
import User from './User'
import Result from './Result'
import { useStartInterview } from './network'
import Controls from './Controls'
import Recordings from './Recordings'
import { submitAtom, currentStepAtom, interviewStep } from './state/atom'
import { useAtom } from 'jotai'
import { useAudioListener } from './useAudioListener'
import { FaArrowRight, FaLightbulb } from 'react-icons/fa'
import CustomModal from './modal'
import { useState } from 'react'

function App() {
  const [isModalOpen, setIsModalOpen] = useState(true)
  const { data } = useStartInterview()

  const [isSubmitted] = useAtom(submitAtom)
  const [currentStep] = useAtom(currentStepAtom)
  const { audioPlayerStatus } = useAudioListener()

  const isInterviewStarted = !!data?.data?.chat_id
  const isInterviewEnded = currentStep === interviewStep.indexOf('closing')

  return (
    <>
      <div className='h-screen overflow-y-auto p-4 bg-white'>
        <SnackbarProvider preventDuplicate anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
        <div className='flex justify-between mb-10'>
          <p className='mb-4 text-lg font-semibold text-[#bb1724]'>
            Chat Id: <span className='font-bold text-[#bb1724]'>{data?.data?.chat_id}</span>
          </p>
          <button
            onClick={() => {
              window.location.href = '/check'
            }}
            className='flex gap-2 items-center text-sm z-10 bg-[#bb1724] text-white px-2 py-1 rounded-xl transition duration-300'
          >
            Cek Hasil Interview Sebelumnya
            <FaArrowRight />
          </button>
        </div>

        <div className='flex justify-center gap-4'>
          {(isInterviewEnded ? audioPlayerStatus !== 'ended' : isInterviewStarted) && <AvatarScene />}
          <User />
        </div>
        <div className='flex'>
          <Controls />
        </div>

        {isSubmitted && (
          <div className='mt-10 flex justify-center gap-4 mt-4 '>
            <Result />
            <Recordings />
          </div>
        )}
      </div>
      <div className='absolute bottom-0 left-0 p-4'>
        <button className='hint relative flex items-center justify-center w-12 h-12 rounded-full bg-[#bb1724] hover:bg-[#bb1724] transition duration-300'>
          <FaLightbulb className='text-white' />
        </button>
        <div className='menu p-4 text-left absolute !w-[500px] z-[20] left-20 bottom-4 w-64 p-2 bg-white rounded-lg shadow-md opacity-0 transition-opacity duration-300'>
          <h3 className='text-lg font-semibold'>Hint AI Interview</h3>
          <ul className='text-gray-700 p-2 list-[circle] '>
            {!isInterviewStarted ? (
              <>
                <li>Klik "Saya siap"</li>
                <li>Klik "Pertanyaan berikutnya"</li>
                <li>Klik "ulangi pertanyaan" --hanya bisa sekali</li>
                {/* <li>Klik "Mulai Interview" untuk memulai sesi interview.</li>
                <li>Ucapkan "Saya siap, Albi." untuk memulai sesi tanya jawab.</li>
                <li>
                  Jawab setiap pertanyaan dengan jelas. Jika ingin lanjut ke pertanyaan berikutnya, ucapkan "Sudah
                  cukup, Albi."
                </li>
                <li>
                  Jika perlu mengulang pertanyaan, ucapkan "Tolong ulangi, Albi." (Fitur ini hanya bisa digunakan sekali
                  per pertanyaan.)
                </li>
                <li>
                  Jika perintah suara tidak diproses, gunakan tombol di layar untuk mengulang sesi Q&A atau mengulang
                  pertanyaan.
                </li>
                <li>
                  Tips: Pastikan lingkungan Anda tenang dan mikrofon berfungsi dengan baik untuk pengalaman terbaik.
                </li>
                <li>Semoga sukses dalam interview ini! Jika sudah siap, silakan mulai.</li> */}
              </>
            ) : (
              <>
                <li>“Saya siap, Albi.” - Mulai sesi interview</li>
                <li>“Sudah cukup, Albi.” - Lanjut ke pertanyaan berikutnya</li>
                <li>“Tolong ulangi, Albi.” - Ulangi pertanyaan (hanya sekali)</li>
                <li>Jika tidak berfungsi, gunakan tombol yang ada di bawah layar</li>
              </>
            )}
          </ul>
        </div>
      </div>
      <CustomModal
        show={isModalOpen}
        handleClose={() => setIsModalOpen(false)}
        title='Selamat datang di AI Interview!  🎤✨'
      >
        <div>
          <h3>Cara Menggunakan AI Interview:</h3>
          <ul className='list-[circle] m-none p-none'>
            <li>Klik "Saya Siap" untuk memulai sesi tanya jawab.</li>
            <li>
              Jawab setiap pertanyaan dengan jelas. Jika ingin lanjut ke pertanyaan berikutnya, klik "Pertanyaan
              Berikutnya"
            </li>
            <li>
              Jika perlu mengulang pertanyaan, klik "Pertanyaan Berikutnya." (Fitur ini hanya bisa digunakan sekali per
              pertanyaan.)
            </li>
          </ul>
          <p className='mt-4'>
            ⚠️ Jika perintah suara tidak diproses, gunakan tombol di layar untuk mengulang sesi Q&A atau mengulang
            pertanyaan.
          </p>
          <p className='my-0'>
            <strong>⚡️ Tips:</strong> Pastikan lingkungan Anda tenang dan mikrofon berfungsi dengan baik untuk
            pengalaman terbaik.
          </p>
          <p className='my-0'>🚀 Semoga sukses dalam interview ini! Jika sudah siap, silakan mulai.</p>
        </div>
      </CustomModal>
    </>
  )
}

export default App
