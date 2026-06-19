require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── S3 Client ─────────────────────────────────────────────────────────────
// When running on EC2 with an IAM role attached, NO credentials are needed here.
// AWS SDK automatically picks up the role via the instance metadata service.
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.S3_BUCKET_NAME;

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store file in memory (not disk) before sending to S3
const upload = multer({ storage: multer.memoryStorage() });

// ─── Routes ─────────────────────────────────────────────────────────────────

// POST /upload — Upload a file to S3
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided.' });

  const key = `${Date.now()}-${req.file.originalname}`;

  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));
    res.json({ message: 'File uploaded successfully.', key });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed.' });
  }
});

// GET /files — List all files in S3 bucket
app.get('/files', async (req, res) => {
  try {
    const data = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET }));
    const files = (data.Contents || []).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));
    res.json(files);
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ error: 'Could not list files.' });
  }
});

// GET /download/:key — Generate a pre-signed download URL (valid 5 min)
app.get('/download/:key', async (req, res) => {
  try {
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: req.params.key }),
      { expiresIn: 300 }
    );
    res.json({ url });
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Could not generate download link.' });
  }
});

// DELETE /delete/:key — Remove a file from S3
app.delete('/delete/:key', async (req, res) => {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: req.params.key }));
    res.json({ message: 'File deleted.' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Delete failed.' });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`CloudDrive running on http://localhost:${PORT}`));
