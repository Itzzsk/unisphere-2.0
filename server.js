require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
app.use(cors({
  origin: [
    'http://localhost:5000', // Update with your frontend origin
    'https://res.cloudinary.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

// MongoDB connect
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// Schemas
const postSchema = new mongoose.Schema({
  content: String,
  imageUrl: String,
  createdAt: { type: Date, default: Date.now },
  comments: [{
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  likes: { type: Number, default: 0 }
});
const Post = mongoose.model('Post', postSchema);

const bannerSchema = new mongoose.Schema({
  imageUrl: String,
  updatedAt: { type: Date, default: Date.now }
});
const Banner = mongoose.model('Banner', bannerSchema);

const backgroundSchema = new mongoose.Schema({
  imageUrl: String,
  updatedAt: { type: Date, default: Date.now }
});
const Background = mongoose.model('Background', backgroundSchema);

// Routes

// Upload banner image
app.post('/api/upload/banner', upload.single('banner'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No banner image uploaded' });
  try {
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'banner',
      resource_type: 'image'
    });
    await Banner.findOneAndUpdate({}, {
      imageUrl: result.secure_url,
      updatedAt: new Date()
    }, { upsert: true, new: true });
    res.json({ message: 'Banner uploaded', imageUrl: result.secure_url });
  } catch (error) {
    console.error("Banner upload error:", error);
    res.status(500).json({ message: 'Banner upload failed' });
  }
});

// Get banner image
app.get('/api/banner', async (req, res) => {
  try {
    const banner = await Banner.findOne();
    res.json({ imageUrl: banner ? banner.imageUrl : null });
  } catch (error) {
    console.error("Banner fetch error:", error);
    res.status(500).json({ message: 'Failed to fetch banner' });
  }
});

// Upload background image
app.post('/api/upload/background', upload.single('background'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No background image uploaded' });
  try {
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'background',
      resource_type: 'image'
    });
    await Background.findOneAndUpdate({}, {
      imageUrl: result.secure_url,
      updatedAt: new Date()
    }, { upsert: true, new: true });
    res.json({ message: 'Background uploaded', imageUrl: result.secure_url });
  } catch (error) {
    console.error("Background upload error:", error);
    res.status(500).json({ message: 'Background upload failed' });
  }
});

// Get background image
app.get('/api/background', async (req, res) => {
  try {
    const background = await Background.findOne();
    res.json({ imageUrl: background ? background.imageUrl : null });
  } catch (error) {
    console.error("Background fetch error:", error);
    res.status(500).json({ message: 'Failed to fetch background' });
  }
});

// Upload post image
app.post('/api/upload/post', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
  try {
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'posts',
      resource_type: 'image'
    });
    res.json({ imageUrl: result.secure_url });
  } catch (error) {
    console.error("Post image upload error:", error);
    res.status(500).json({ message: 'Image upload failed' });
  }
});

// Create new post
app.post('/api/posts', async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    if (!content && !imageUrl) return res.status(400).json({ message: 'Post requires text or image' });
    const newPost = new Post({ content, imageUrl });
    await newPost.save();
    res.status(201).json({ message: 'Post created successfully' });
  } catch (error) {
    console.error("Post creation error:", error);
    res.status(500).json({ message: 'Error creating post' });
  }
});

// Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    if (posts.length === 0) return res.status(404).json({ message: "No posts found" });
    res.json(posts);
  } catch (error) {
    console.error("Posts fetch error:", error);
    res.status(500).json({ message: "Server error fetching posts" });
  }
});

// Like a post
app.post('/api/posts/:postId/like', express.json(), async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const liked = !!req.body.liked;
    post.likes += liked ? 1 : -1;
    if (post.likes < 0) post.likes = 0;
    await post.save();
    res.json({ likes: post.likes });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ message: 'Failed to like post' });
  }
});

// Add comment to post
app.post('/api/posts/:postId/comments', express.json(), async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Comment cannot be empty' });
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.comments.push({ content, createdAt: new Date() });
    await post.save();
    res.json({ message: 'Comment added successfully', comments: post.comments });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

// Get comments for a post
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post.comments);
  } catch (error) {
    console.error('Fetch comments error:', error);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

// Serve static frontend files (including index.html, upload.html, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Explicitly serve upload.html route if needed (optional)
app.get('/upload.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// Fallback for SPA or index.html
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// 404 handler for unknown routes
app.use((req, res) => res.status(404).json({ message: "❌ Route Not Found" }));

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
