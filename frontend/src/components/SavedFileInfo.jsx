import React from 'react';
import DeleteIcon from './DeleteIcon';


const SavedFileInfo = ({ fileInfo, fileIndex, onDelete }) => {
  return(
    <div className='w-full p-4 mb-4 border border-gray-300 border-solid rounded-md'>
      <div className='flex justify-between'>
        <li key={fileIndex} className='text-sm font-bold tracking-wide'>{fileInfo.name}</li>
        <button
          onClick={() => onDelete(fileIndex)}
        >
        <DeleteIcon />
        </button>
      </div>
      <ul className='flex flex-wrap'>
        {fileInfo.tags.map((tag, index) => (
          <div key={index} className='flex flex-col px-3 py-1 mt-2 mr-2 border border-gray-300 border-solid rounded-md'>
            <li className='inline-block text-sm'>{tag.text}</li>
          </div>
        ))}
      </ul>
    </div>
  )

}

export default SavedFileInfo;