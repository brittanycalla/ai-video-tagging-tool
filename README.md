# AI-Powered Video Tagging Tool

A web application that uses Azure AI services to automatically generate metadata tags from video transcripts, providing an easy and efficient way to add metadata to your video content.

<img src="https://drive.google.com/uc?export=view&id=1l0ZuC9C9ppsw-ztQn_RQ2HvQZcUoBOqI" alt="A screen recording demo of the video tagging tool.">

## How It's Made

### Tech Used

- **Frontend**: React, Tailwind CSS
- **Backend**: Express.js, Node.js
- **AI Services**: Azure Speech-to-Text, Azure Language Studio (Named Entity Recognition)
- **Other**: Axios for HTTP requests, WebSockets for real-time updates, file-saver for downloading CSV files

### How It Works

1. **Upload**: Drag and drop a video file or select it manually.
2. **Processing**: The backend uses Azure Speech-to-Text to transcribe the video and Azure Language Studio to generate tags from the transcript.
3. **Display**: The transcript is displayed with tags highlighted.
4. **Download**: Users can download the tags as a CSV file.

## Optimizations

- **Loading Indicators**: Added a loading spinner and progress bar to enhance user experience during the upload and processing phases.
- **Error Handling**: Implemented user-friendly error messages for large files and invalid file types.
- **WebSocket**: Utilized WebSockets for real-time processing updates, providing a smoother user experience.

## Lessons Learned

- **Azure Integration**: Gained deeper understanding and experience in integrating Azure AI services, specifically Speech-to-Text and Language Studio.
- **Real-Time Updates**: Learned the importance of providing real-time feedback to users and effectively implemented this using WebSockets.
- **User Experience**: Realized the value of clear, user-friendly interfaces and error messages to enhance usability.

## Roadmap

- **Enhanced Tagging**: Improve the accuracy and relevance of tags by fine-tuning the AI models or integrating additional data sources.
- **Metadata Schema and Tag Taxonomy Integration**: Integrate with existing metadata schemas and tag taxonomies to enhance consistency and interoperability.
- **Multi-Language Support**: Extend the tool to support multiple languages for transcription and tagging.
- **User Accounts**: Implement user accounts and storage to allow users to save and manage their video tags and transcripts.
- **Video Preview**: Add a feature to preview the video within the application.
- **Advanced Analytics**: Provide detailed analytics and insights based on the tags and transcripts.