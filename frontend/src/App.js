import React from 'react';
import DragAndDropUpload from './components/DragAndDropUpload';

const App = () => {
  return (
    <div className='App'>
      <header className='border-b border-b-gray-300 border-b-solid h-[7vh] flex justify-start items-center w-full p-4'>
        <h1 className='font-extrabold tracking-wide'>Video Keyword Generator</h1>
      </header>
      <DragAndDropUpload/>
    </div>
  );
};

export default App;
