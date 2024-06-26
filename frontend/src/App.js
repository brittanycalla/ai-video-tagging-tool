import React from 'react';
import DragAndDropUpload from './components/DragAndDropUpload';

const App = () => {
  return (
    <div className='App'>
      <header className='h-[7vh] flex justify-start items-center w-full px-8 pt-4 md:mb-6 mx-auto max-w-5xl md:px-16'>
        <h1 className='font-extrabold tracking-wide'>Video Keyword Generator</h1>
      </header>
      <DragAndDropUpload/>
    </div>
  );
};

export default App;
