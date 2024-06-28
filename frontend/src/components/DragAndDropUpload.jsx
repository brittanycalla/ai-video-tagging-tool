import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { saveAs } from "file-saver";
import LoadingSpinner from "./LoadingSpinner";
import FileProcessingInfo from "./FileProcessingInfo";
import uploadIcon from "../uploadIcon.svg";
import SavedFileInfo from "./SavedFileInfo";
import DeleteIcon from "./DeleteIcon";
const apiUrl = process.env.REACT_APP_API_URL;
const websocketUrl = process.env.REACT_APP_WEBSOCKET_URL;
const ITEMS_PER_LOAD = 2;

const DragAndDropUpload = () => {
  const [tags, setTags] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState(null);
  const [ws, setWs] = useState(null);
  const [error, setError] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState(() => {
    const savedFiles = localStorage.getItem("uploadedFiles");
    return savedFiles ? JSON.parse(savedFiles) : [];
  });
  const [itemsToShow, setItemsToShow] = useState(ITEMS_PER_LOAD);

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      setUploadProgress(0);
      setTags([]);
      setTranscript("");
      setFileInfo(null);

      if (rejectedFiles.length > 0) {
        const errorCode = rejectedFiles[0].errors[0].code;
        let errorMsg;
        if (errorCode === "file-too-large") {
          errorMsg =
            "The file is too large. Please upload a video file smaller than 50MB.";
        } else if (errorCode === "file-invalid-type") {
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
      });

      const formData = new FormData();
      formData.append("video", file);

      setIsUploading(true);
      setError(null);

      axios
        .post(`${apiUrl}/api/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then((response) => {
          const ws = new WebSocket(`${websocketUrl}`);
          setWs(ws);
          setUploadProgress(20);

          ws.onopen = () => {
            ws.send(
              JSON.stringify({
                action: "process",
                filePath: response.data.filePath,
              })
            );
          };

          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.progress) {
              setUploadProgress(data.progress);
            }
            if (data.transcript && data.tags) {
              setTranscript(data.transcript);
              setTags(data.tags);
              setIsUploading(false);

              const newFile = {
                name: file.name,
                tags: data.tags,
                transcript: data.transcript,
              };

              const updatedFiles = [newFile, ...uploadedFiles];
              setUploadedFiles(updatedFiles);
              localStorage.setItem(
                "uploadedFiles",
                JSON.stringify(updatedFiles)
              );
            }
            if (data.error) {
              console.error(data.error);
              setIsUploading(false);
            }
          };

          ws.onclose = () => {
            setWs(null);
          };
        })
        .catch((error) => {
          console.error("Error uploading the file:", error);
          setIsUploading(false);
        });
    },
    [ws, uploadedFiles]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    disabled: isUploading,
    accept: { "video/*": [] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const getHighlightedText = (text, tags) => {
    if (!tags.length) return <span>{text}</span>;

    const sortedTags = tags.sort((a, b) => b.text.length - a.text.length);
    let parts = [text];
    let uniqueId = 0;

    sortedTags.forEach((tag) => {
      const newParts = [];
      parts.forEach((part) => {
        if (typeof part === "string") {
          const regex = new RegExp(`(${tag.text})`, "gi");
          const splitParts = part.split(regex);
          splitParts.forEach((splitPart, index) => {
            if (regex.test(splitPart)) {
              newParts.push(
                <span
                  className="px-1 py-1 bg-indigo-50"
                  key={`${splitPart}-${uniqueId++}`}
                >
                  {splitPart}
                </span>
              );
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

  const formatTagsForCSV = (files) => {
    if (files.length === 0) return "";

    const categories = [
      ...new Set(files.flatMap((file) => file.tags.map((tag) => tag.category))),
    ];
    const header = ["Filename", ...categories].join(",");

    const rows = files.map((file) => {
      const row = [file.name];
      categories.forEach((category) => {
        const tagsInCategory = file.tags
          .filter((tag) => tag.category === category)
          .map((tag) => tag.text)
          .join("|");
        row.push(tagsInCategory);
      });
      return row.join(",");
    });

    return [header, ...rows].join("\n");
  };

  const downloadCSV = () => {
    const csvData = formatTagsForCSV(uploadedFiles);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "tags.csv");
  };

  const deleteFile = (index) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);
    localStorage.setItem("uploadedFiles", JSON.stringify(updatedFiles));
    if (updatedFiles.length < itemsToShow) {
      setItemsToShow(updatedFiles.length);
    }
  };

  const deleteAllFiles = () => {
    setUploadedFiles([]);
    localStorage.removeItem("uploadedFiles");
    setItemsToShow(ITEMS_PER_LOAD);
  };

  const deleteTag = (tagIndex) => {
    const updatedTags = tags.filter((_, index) => index !== tagIndex);
    setTags(updatedTags);

    // Update the corresponding uploaded file's tags
    const updatedFiles = uploadedFiles.map(file => {
      if (file.name === fileInfo.name) {
        return { ...file, tags: updatedTags };
      }
      return file;
    });
    setUploadedFiles(updatedFiles);
    localStorage.setItem('uploadedFiles', JSON.stringify(updatedFiles));
  };

  const loadMore = () => {
    setItemsToShow(itemsToShow + ITEMS_PER_LOAD);
  };

  const paginatedFiles = uploadedFiles.slice(0, itemsToShow);

  return (
    <div className='flex flex-col min-h-full px-4 md:px-6 md:flex-row'>
      <div className='flex flex-col items-center py-6 md:w-1/2 md:mx-auto'>
        <h2 className="self-start mb-1 font-semibold">Upload Your Video</h2>
        <p className="self-start mb-2 text-sm text-gray-600">
          Upload a video to generate metadata tags based on its transcript.
        </p>
        {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
        <div
          className={`flex flex-col items-center justify-center bg-gray-50 border-gray-400 border-2 rounded-md p-10 mb-6 w-full min-h-60 transition-colors duration-300 ${
            isDragActive
              ? "bg-indigo-100/50 border-indigo-400 border-solid"
              : "border-gray-400 border-dashed"
          } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
          {...getRootProps()}
        >
          <input {...getInputProps()} disabled={isUploading} />
          {isUploading ? (
            <LoadingSpinner />
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-12 p-2 mb-4 bg-indigo-500 rounded-md">
                <img
                  src={uploadIcon}
                  alt="A white upload icon - a white arrow pointing up"
                />
              </div>
              <p className={`font-bold text-center`}>
                {`${
                  isDragActive
                    ? "Drop to upload your file"
                    : "Drag a video file here to upload it"
                }`}
              </p>
              <p className="text-gray-600">Maximum file size 50MB</p>
              <button
                type="button"
                tabIndex="0" 
                aria-label="Choose your video file to upload"
                className={`font-semibold text-indigo-600 hover:cursor-pointer transition-transform transform ${
                  isDragActive ? "scale-0" : "scale-100"
                }`}
                onClick={open}
              >
                Or choose your file
              </button>
            </div>
          )}
        </div>
        {fileInfo && (
          <FileProcessingInfo
            fileInfo={fileInfo}
            uploadProgress={uploadProgress}
          />
        )}
        <div className="flex flex-col w-full">
          <div className="w-full h-px bg-gray-300"></div>
          <div className="flex flex-col mb-6 md:justify-between">
            <h3 className="mt-6 mb-1 font-semibold">Tags</h3>
            <ul className="flex flex-wrap">
              {tags.map((tag, index) => (
                <div
                  key={index}
                  className='flex flex-col px-2 py-1 mt-2 mr-2 rounded-md bg-indigo-50'
                >
                  <div className='flex justify-between'>
                    <span className='text-xs font-normal text-indigo-600 uppercase'>
                      {tag.category}
                    </span>
                    <button
                      onClick={() => deleteTag(index)}
                      className='ml-2'
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                  <li className='inline-block font-semibold'>{tag.text}</li>
                </div>
              ))}
            </ul>
          </div>
          <div className='w-full h-px bg-gray-300'></div>
          <h3 className='mt-6 mb-1 font-semibold'>Transcript</h3>
          <div className='mb-6 text-sm/7'>
            {getHighlightedText(transcript, tags)}
          </div>
        </div>
        <div className='w-full h-px bg-gray-300 md:hidden'></div>
      </div>
      <aside className='flex flex-col py-6 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-r md:border-gray-300 md:border-solid md:w-72 md:pr-6 md:order-first'>
        <div className='flex items-start justify-between'>
          <h3 className='mb-2 font-semibold'>Uploaded Videos</h3>
          <button
            onClick={downloadCSV}
            disabled={!uploadedFiles || uploadedFiles.length === 0}
            className='px-2 py-1 mb-2 text-xs font-semibold text-white bg-indigo-600 rounded-md'
          >
            Download CSV
          </button>
        </div>
        <ul>
          {paginatedFiles.map((file, index) => (
            <SavedFileInfo
              key={index}
              fileInfo={file}
              fileIndex={index}
              onDelete={deleteFile}
            />
          ))}
        </ul>
        {itemsToShow < uploadedFiles.length && (
          <button
            onClick={loadMore}
            className='px-4 py-2 mt-2 font-semibold text-indigo-500 border border-gray-300 border-solid rounded-md'
          >
            Load More
          </button>
        )}
        {uploadedFiles.length > 0 && (
          <button
            onClick={deleteAllFiles}
            className='mt-4 text-sm text-gray-600 hover:underline hover:text-red-500'
          >
            Delete All Videos
          </button>
        )}
      </aside>
    </div>
  );
};

export default DragAndDropUpload;
