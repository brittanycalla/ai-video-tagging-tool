import React from 'react';

const FileProcessingInfo = ({ fileInfo, uploadProgress }) => {
  return(
    <div className='w-full p-4 mb-6 border border-gray-300 border-solid rounded-md'>
      <div className='flex justify-between'>
        <span className='text-sm font-bold tracking-wide'>{fileInfo.name}</span>
        <span className='text-sm'>{fileInfo.size} MB</span>
      </div>
      <div className='w-full h-2 mt-2 bg-gray-300 rounded-full'>
        <div
          className='h-full transition-all duration-500 ease-out bg-indigo-500 rounded-full'
          style={{ width: `${uploadProgress}%` }}
        ></div>
      </div>
      <div className='flex justify-end mt-1 text-sm'>
        <span>{uploadProgress}%</span>
      </div>
    </div>
  )

}

export default FileProcessingInfo;