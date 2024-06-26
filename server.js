const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const speech = require('microsoft-cognitiveservices-speech-sdk');
const { TextAnalyticsClient, AzureKeyCredential } = require('@azure/ai-text-analytics');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');

dotenv.config();

const app = express();
app.use(cors());

const upload = multer({ dest: 'uploads/' });

ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);

const transcribeAudio = async (audioPath) => {
  const speechConfig = speech.SpeechConfig.fromSubscription(process.env.AZURE_SPEECH_KEY, process.env.AZURE_REGION);
  const audioConfig = speech.AudioConfig.fromWavFileInput(fs.readFileSync(audioPath));
  const recognizer = new speech.SpeechRecognizer(speechConfig, audioConfig);

  return new Promise((resolve, reject) => {
    recognizer.recognizeOnceAsync(result => {
      if (result.reason === speech.ResultReason.RecognizedSpeech) {
        resolve(result.text);
      } else {
        reject(result.errorDetails);
      }
    });
  });
};

const analyzeEntities = async (transcript, ws) => {
  const client = new TextAnalyticsClient(process.env.AZURE_TEXT_ENDPOINT, new AzureKeyCredential(process.env.AZURE_TEXT_KEY));
  const [result] = await client.recognizeEntities([transcript]);

  if (!result.entities.length) return [];

  ws.send(JSON.stringify({ progress: 100 })); // send completion progress

  return result.entities.map(entity => ({
    text: entity.text,
    category: entity.category,
    subCategory: entity.subCategory,
    confidenceScore: entity.confidenceScore
  }));
};

const publicDir = path.join(__dirname, 'frontend', 'build');
console.log(`Serving static files from ${publicDir}`);
app.use(express.static(publicDir));

// Add a route for the root URL
app.get('/', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  console.log(`Serving index.html from ${indexPath}`);
  res.sendFile(indexPath);
});


const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const { action, filePath } = JSON.parse(message);

    if (action === 'process') {
      const audioPath = path.join(__dirname, 'uploads', `${path.basename(filePath, path.extname(filePath))}.wav`);

      ffmpeg(filePath)
        .output(audioPath)
        .on('end', async () => {
          try {
            const transcript = await transcribeAudio(audioPath);
            ws.send(JSON.stringify({ progress: 50 })); // midway progress
            const entities = await analyzeEntities(transcript, ws);
            ws.send(JSON.stringify({ transcript, tags: entities }));
          } catch (error) {
            console.error('Error processing the video:', error);
            ws.send(JSON.stringify({ error: 'Error processing the video.' }));
          } finally {
            fs.unlinkSync(filePath);
            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
          }
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          ws.send(JSON.stringify({ error: 'Error processing the video.' }));
        })
        .run();
    }
  });
});

app.post('/api/upload', upload.single('video'), (req, res) => {
  res.json({ filePath: req.file.path });
});
