import { FaUserCircle } from 'react-icons/fa'
import { isRecordingAtom } from './state/atom'
import { useAtomValue } from 'jotai'

const AvatarScene = () => {
  const isRecording = useAtomValue(isRecordingAtom)
  return (
    <div className='relative !w-[40%] flex !h-[600px] rounded-2xl bg-[#bb1724]'>
      <FaUserCircle className='bg-white m-auto w-[100px] h-[100px] rounded-full' color='gray' />
      <div className='flex items-center gap-2 z-10 bg-white px-2 py-1 rounded-full text-sm font-bold absolute bottom-2 left-4'>
        <p>Albi - HRD AI</p>
        <img id='talking-indicator-avatar' src='/active-speaker.gif' alt='Albi - HRD' className='w-5 h-5 hidden' />
      </div>
      {isRecording && (
        <div className='flex items-center gap-2 z-10 bg-white px-2 py-1 rounded-full text-sm font-bold absolute bottom-2 right-4'>
          <p>Listening...</p>
        </div>
      )}
    </div>
  )
}

export default AvatarScene
