require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// Simple IP detection function
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  let ip = forwarded || realIP || req.connection?.remoteAddress || req.ip || '127.0.0.1';
  
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  
  return ip || '127.0.0.1';
}

// CORS Configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:8080',
    'https://res.cloudinary.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', true);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Cloudinary config
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Multer config
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

connectDB();

// Schemas
const postSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['text', 'poll'], 
    default: 'text' 
  },
  content: String,
  question: String,
  options: [{
    text: String,
    votes: { type: Number, default: 0 },
    voters: [String] // Still track voters for analytics but don't restrict
  }],
  allowMultiple: { type: Boolean, default: false },
  totalVotes: { type: Number, default: 0 },
  imageUrl: String,
  comments: [{
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  likes: { type: Number, default: 0 },
  likedBy: [String]
}, { timestamps: true });

const bannerSchema = new mongoose.Schema({
  imageUrl: String,
  linkUrl: String,
  updatedAt: { type: Date, default: Date.now }
});

const backgroundSchema = new mongoose.Schema({
  imageUrl: String,
  updatedAt: { type: Date, default: Date.now }
});

// Models
const Post = mongoose.model('Post', postSchema);
const Banner = mongoose.model('Banner', bannerSchema);
const Background = mongoose.model('Background', backgroundSchema);

// Basic moderation
async function moderateText(text) {
  const badWords = ['spam', 'scam', 'fake'];
  const foundBadWords = badWords.filter(word => 
    text.toLowerCase().includes(word.toLowerCase())
  );
  return {
    isBlocked: foundBadWords.length > 0,
    foundWords: foundBadWords
  };
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Upload image
app.post('/api/upload/post', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
  
  try {
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'posts'
    });
    res.json({ imageUrl: result.secure_url });
  } catch (error) {
    res.status(500).json({ message: 'Image upload failed' });
  }
});

// Create post
app.post('/api/posts', async (req, res) => {
  try {
    const { type, content, question, options, allowMultiple, imageUrl } = req.body;
    
    if (type === 'text') {
      if (!content && !imageUrl) {
        return res.status(400).json({ message: 'Text post requires content or image' });
      }
      
      const newPost = new Post({
        type: 'text',
        content,
        imageUrl
      });
      
      const savedPost = await newPost.save();
      res.status(201).json({ message: 'Post created', post: savedPost });
      
    } else if (type === 'poll') {
      if (!question) {
        return res.status(400).json({ message: 'Poll requires a question' });
      }
      
      if (!options || options.length < 2) {
        return res.status(400).json({ message: 'Poll requires at least 2 options' });
      }
      
      const newPost = new Post({
        type: 'poll',
        question,
        options: options.map(option => ({
          text: option.text,
          votes: 0,
          voters: []
        })),
        allowMultiple: allowMultiple || false,
        totalVotes: 0
      });
      
      const savedPost = await newPost.save();
      res.status(201).json({ message: 'Poll created', post: savedPost });
    }
    
  } catch (error) {
    res.status(500).json({ message: 'Error creating post' });
  }
});

// Get posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    
    const postsWithPercentages = posts.map(post => {
      if (post.type === 'poll') {
        const totalVoteCount = post.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
        
        const optionsWithPercentages = post.options.map(option => {
          const percentage = totalVoteCount > 0 ? 
            Math.round(((option.votes || 0) / totalVoteCount) * 100) : 0;
          
          return {
            text: option.text,
            votes: option.votes || 0,
            voters: option.voters || [],
            percentage: percentage
          };
        });
        
        return {
          ...post.toObject(),
          options: optionsWithPercentages,
          totalVotes: totalVoteCount
        };
      }
      return post;
    });
    
    res.json(postsWithPercentages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts" });
  }
});

// FIXED: Vote endpoint - REMOVED IP RESTRICTION, EVERYONE CAN VOTE
app.post('/api/posts/:postId/vote', async (req, res) => {
  try {
    const { postId } = req.params;
    const { optionIndex, optionIndexes, allowMultiple } = req.body;
    const ip = getClientIP(req);

    console.log('🗳️ Vote received:', { postId, optionIndex, optionIndexes, allowMultiple, ip });

    const post = await Post.findById(postId);
    if (!post || post.type !== 'poll') {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // REMOVED: IP restriction check - everyone can vote multiple times now
    // No more checking if IP already voted

    // Initialize arrays
    post.options.forEach((option, index) => {
      if (!option.voters) post.options[index].voters = [];
      if (typeof option.votes !== 'number') post.options[index].votes = 0;
    });

    // Process vote
    if (allowMultiple) {
      if (!Array.isArray(optionIndexes) || optionIndexes.length !== 2) {
        return res.status(400).json({ message: 'Please select exactly 2 options' });
      }

      // Validate indexes
      for (const idx of optionIndexes) {
        if (idx < 0 || idx >= post.options.length) {
          return res.status(400).json({ message: 'Invalid option selected' });
        }
      }

      // Add votes to multiple options
      optionIndexes.forEach(idx => {
        post.options[idx].votes += 1;
        post.options[idx].voters.push(ip); // Track for analytics only
        console.log(`✅ Vote added to option ${idx}: "${post.options[idx].text}"`);
      });

    } else {
      // Single choice
      let selectedIndex = optionIndex !== undefined ? optionIndex : optionIndexes?.[0];
      
      if (selectedIndex < 0 || selectedIndex >= post.options.length) {
        return res.status(400).json({ message: 'Invalid option selected' });
      }

      post.options[selectedIndex].votes += 1;
      post.options[selectedIndex].voters.push(ip); // Track for analytics only
      console.log(`✅ Vote added to option ${selectedIndex}: "${post.options[selectedIndex].text}"`);
    }

    // Calculate totals
    const totalVoteCount = post.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
    post.totalVotes = totalVoteCount;

    // Save vote
    await post.save();

    console.log('✅ Vote saved successfully');

    // Calculate percentages for response
    const optionsWithPercentages = post.options.map(option => ({
      text: option.text,
      votes: option.votes || 0,
      voters: option.voters || [],
      percentage: totalVoteCount > 0 ? Math.round((option.votes / totalVoteCount) * 100) : 0
    }));

    const responsePost = {
      ...post.toObject(),
      options: optionsWithPercentages,
      totalVotes: totalVoteCount
    };

    res.json({
      message: 'Vote recorded successfully!',
      post: responsePost
    });

  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ message: 'Failed to record vote' });
  }
});

// Like post
app.post('/api/posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { liked } = req.body;
    
    const ip = getClientIP(req);
    const userId = crypto.createHash('md5').update(ip).digest('hex');
    
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    if (!post.likedBy) post.likedBy = [];
    
    const hasLiked = post.likedBy.includes(userId);
    
    if (liked && !hasLiked) {
      post.likes = (post.likes || 0) + 1;
      post.likedBy.push(userId);
    } else if (!liked && hasLiked) {
      post.likes = Math.max(0, (post.likes || 0) - 1);
      post.likedBy = post.likedBy.filter(id => id !== userId);
    }
    
    await post.save();
    
    res.json({ 
      likes: post.likes || 0, 
      liked: post.likedBy.includes(userId) 
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update like' });
  }
});

// Comments
app.post('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Comment cannot be empty' });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (!post.comments) post.comments = [];
    post.comments.push({ content: content.trim() });
    
    await post.save();
    res.json({ message: 'Comment added', comments: post.comments });
    
  } catch (error) {
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    res.json(post.comments || []);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

// Banner/Background
app.get('/api/banner', async (req, res) => {
  try {
    const banner = await Banner.findOne();
    res.json({
      imageUrl: banner ? banner.imageUrl : null,
      linkUrl: banner ? banner.linkUrl : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch banner' });
  }
});

app.get('/api/background', async (req, res) => {
  try {
    const background = await Background.findOne();
    res.json({ imageUrl: background ? background.imageUrl : null });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch background' });
  }
});

// Static routes
app.get('/upload.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handlers
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large' });
  }
  res.status(500).json({ message: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Features: Posts, Polls, Comments, Likes`);
  console.log(`🗳️ Poll System: UNLIMITED VOTING - Everyone can vote multiple times`);
});
