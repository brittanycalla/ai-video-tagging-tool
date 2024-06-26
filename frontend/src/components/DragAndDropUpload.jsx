import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { saveAs } from 'file-saver';
import LoadingSpinner from './LoadingSpinner';
import FileInfo from './FileInfo';
import uploadIcon from '../uploadIcon.svg';
const apiUrl = process.env.REACT_APP_API_URL;
const websocketUrl = process.env.REACT_APP_WEBSOCKET_URL;

const DragAndDropUpload = () => {
  const [tags, setTags] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState(null);
  const [ws, setWs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setUploadProgress(0);
    setTags([]);
    setTranscript('');
    setFileInfo(null);

    if (rejectedFiles.length > 0) {
      const errorCode = rejectedFiles[0].errors[0].code;
      let errorMsg;
      if (errorCode === 'file-too-large') {
        errorMsg = "The file is too large. Please upload a video file smaller than 50MB.";
      } else if (errorCode === 'file-invalid-type') {
        errorMsg = "Invalid file type. Please upload a valid video file.";
      } else {
        errorMsg = `Error: ${rejectedFiles[0].errors[0].message}`;
      }
      setError(errorMsg);
      return;
    }

    if (ws) {
      ws.close();
      setWs(null);
    }

    const file = acceptedFiles[0];
    setFileInfo({
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2),
    })

    const formData = new FormData();
    formData.append('video', file);

    setIsUploading(true);
    setError(null);

    axios.post(`${apiUrl}/api/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then(response => {
      const ws = new WebSocket(`${websocketUrl}`);
      setWs(ws);
      setUploadProgress(20);

      ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'process', filePath: response.data.filePath }));
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.progress) {
          setUploadProgress(data.progress);
        }
        if (data.transcript && data.tags) {
          setTranscript(data.transcript);
          setTags(data.tags);
          setIsUploading(false);
        }
        if (data.error) {
          console.error(data.error);
          setIsUploading(false);
        }
      }

      ws.onclose = () => {
        setWs(null);
      }
    })
    .catch(error => {
      console.error('Error uploading the file:', error);
      setIsUploading(false);
    })
  }, [ws]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ 
    onDrop,
    noClick: true, 
    noKeyboard: true,
    disabled: isUploading,
    accept: {'video/*': []},
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024
  });

  const getHighlightedText = (text, tags) => {
    if (!tags.length) return <span>{text}</span>;

    const sortedTags = tags.sort((a, b) => b.text.length - a.text.length);
    let parts = [text];
    let uniqueId = 0

    sortedTags.forEach(tag => {
      const newParts = [];
      parts.forEach(part => {
        if (typeof part === 'string') {
          const regex = new RegExp(`(${tag.text})`, 'gi');
          const splitParts = part.split(regex);
          splitParts.forEach((splitPart, index) => {
            if (regex.test(splitPart)) {
              newParts.push(<span className='px-1 py-1 bg-indigo-50' key={`${splitPart}-${uniqueId++}`}>{splitPart}</span>);
            } else {
              newParts.push(splitPart);
            }
          });
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });

    return parts;
  };

  const formatTagsForCSV = (tags, fileName) => {
    const tagMap = tags.reduce((acc, tag) => {
      if (!acc[tag.category]) {
        acc[tag.category] = [];
      }
      acc[tag.category].push(tag.text);
      return acc;
    }, {});

    const categories = Object.keys(tagMap);
    const csvRows = ['Filename,' + categories.join(',')];
    const row = [fileName];

    categories.forEach(category => {
      row.push(`"${tagMap[category].join('|')}"`);
    });

    csvRows.push(row.join(','));
    return csvRows.join('\n');
  };

  const downloadCSV = () => {
    const csvData = formatTagsForCSV(tags, fileInfo.name);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'tags.csv');
  };

  return (
    <div className='flex flex-col items-center max-w-screen-md px-10 py-6 mx-auto md:border-gray-200 md:border md:border-solid md:rounded-md'>
      <h2 className='self-start mb-1 text-xl font-bold'>Upload your Video</h2>
      <p className='self-start mb-6 text-sm font-semibold text-gray-600'>Upload a video to generate metadata keywords based on its transcript.</p>
      {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
      <div 
        className={`flex flex-col items-center justify-center bg-gray-50 border-gray-400 border-2 rounded-md p-10 mb-6 w-full min-h-60 transition-colors duration-300 ${isDragActive ? 'bg-indigo-100/50 border-indigo-400 border-solid' : 'border-gray-400 border-dashed'} ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`} 
        {...getRootProps()}
      >
        <input {...getInputProps()} disabled={isUploading} />
        {
          isUploading ? (
            <LoadingSpinner/>
          ) : (
            <div className='flex flex-col items-center'>
              <div className='w-12 p-2 mb-4 bg-indigo-500 rounded-md'>
                <img src={uploadIcon} alt="A white upload icon - a white arrow pointing up" />
              </div>
              <p className={`font-bold text-lg text-center`}>
                {`${isDragActive ? 'Drop to upload your file' : 'Drag a video file here to upload it'}`}
              </p>
              <p className='text-gray-600'>Maximum file size 50MB</p>
              <button type='button'className={`font-semibold text-indigo-600 hover:cursor-pointer transition-transform transform ${isDragActive ? 'scale-0' : 'scale-100'}`} onClick={open}>Or choose your file</button>
            </div>
          )
        }
      </div>
      {fileInfo && <FileInfo fileInfo={fileInfo} uploadProgress={uploadProgress} />}
      <div className='flex flex-col w-full'>
        <div className='w-full h-px bg-gray-200'></div>
        <div className='flex flex-col mb-6 md:flex-row md:justify-between'>
          <div className='flex flex-col'>
            <h3 className='mt-6 mb-1 text-sm font-bold uppercase'>Keywords:</h3>
            <ul className='flex flex-wrap mb-6'>
              {tags.map((tag, index) => (
                <div key={index} className='flex flex-col px-3 py-1 mt-2 mr-2 rounded-md bg-indigo-50'>
                  <span className='text-xs font-normal text-indigo-600 uppercase'>{tag.category}</span>
                  <li className='inline-block font-semibold'>{tag.text}</li>
                </div>
              ))}
            </ul>
          </div>
          <button onClick={downloadCSV} disabled={!fileInfo} className='px-4 py-2 text-white bg-indigo-600 rounded-md w-fit md:self-center'>Download CSV</button>
        </div>
        <div className='w-full h-px bg-gray-200'></div>
        <h3 className='mt-6 mb-1 text-sm font-bold uppercase'>Transcript:</h3>
        <div className='mb-6 text-sm/7'>{getHighlightedText(transcript, tags)}</div>
      </div>
    </div>
  );
};

export default DragAndDropUpload;
