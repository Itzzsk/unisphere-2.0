require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const path = require('path');
const { isToxic, isImageUnsafe, moderateText } = require('./moderation');
const BadWord = require('./models/moderation');
const app = express();
const PORT = process.env.PORT || 5000;

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

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// MongoDB connect
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// Enhanced Schemas with Poll Support
const postSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['text', 'poll'], 
    default: 'text' 
  },
  content: { 
    type: String, 
    trim: true,
    maxlength: 1000
  },
  question: { 
    type: String, 
    trim: true,
    maxlength: 500
  },
  options: [{
    text: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 200
    },
    votes: { 
      type: Number, 
      default: 0 
    },
    voters: [{ 
      type: String // User IDs who voted for this option
    }]
  }],
  allowMultiple: { 
    type: Boolean, 
    default: false 
  },
  totalVotes: { 
    type: Number, 
    default: 0 
  },
  imageUrl: { 
    type: String, 
    trim: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  comments: [{
    content: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 500
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  likes: { 
    type: Number, 
    default: 0 
  },
  likedBy: [{ 
    type: String // User IDs who liked this post
  }]
});


const bannerSchema = new mongoose.Schema({
  imageUrl: String,
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

// Moderation Middleware
async function moderateAllContent(req, res, next) {
  try {
    const { content, question, options } = req.body;
    
    // Moderate text content
    if (content) {
      const moderationResult = await moderateText(content, ['en', 'es', 'fr', 'hi', 'kn']);
      if (moderationResult.isBlocked) {
        return res.status(400).json({
          message: 'Content contains inappropriate material',
          details: moderationResult.reasons
        });
      }
    }
    
    // Moderate poll question
    if (question) {
      const moderationResult = await moderateText(question, ['en', 'es', 'fr', 'hi', 'kn']);
      if (moderationResult.isBlocked) {
        return res.status(400).json({
          message: 'Poll question contains inappropriate material',
          details: moderationResult.reasons
        });
      }
    }
    
    // Moderate poll options
    if (options && Array.isArray(options)) {
      for (const option of options) {
        if (option.text) {
          const moderationResult = await moderateText(option.text, ['en', 'es', 'fr', 'hi', 'kn']);
          if (moderationResult.isBlocked) {
            return res.status(400).json({
              message: `Poll option "${option.text}" contains inappropriate material`,
              details: moderationResult.reasons
            });
          }
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Moderation error:', error);
    res.status(500).json({ message: 'Content moderation failed' });
  }
}

// Routes


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
    // Check image safety
    const imageUnsafe = await isImageUnsafe(req.file.buffer, req.file.mimetype);
    if (imageUnsafe === true) {
      return res.status(400).json({ message: 'Background image contains inappropriate content' });
    }
    
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

// Upload post image with moderation
app.post('/api/upload/post', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
  
  try {
    // Check image for unsafe content BEFORE uploading to Cloudinary
    const imageUnsafe = await isImageUnsafe(req.file.buffer, req.file.mimetype);
    
    if (imageUnsafe === true) {
      return res.status(400).json({ message: 'Image contains inappropriate or unsafe content' });
    }
    
    if (imageUnsafe === null) {
      return res.status(400).json({ message: 'Unable to verify image safety - upload blocked' });
    }

    // Image is safe, proceed with Cloudinary upload
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

// Create posts (both text and poll) with comprehensive moderation
app.post('/api/posts', moderateAllContent, async (req, res) => {
  try {
    const { type, content, question, options, allowMultiple, imageUrl } = req.body;
    
    // Validate post type
    if (!['text', 'poll'].includes(type)) {
      return res.status(400).json({ message: 'Invalid post type' });
    }
    
    if (type === 'text') {
      // Text post validation
      if (!content && !imageUrl) {
        return res.status(400).json({ message: 'Text post requires content or image' });
      }
      
      const newPost = new Post({
        type: 'text',
        content,
        imageUrl
      });
      
      await newPost.save();
      res.status(201).json({ message: 'Post created successfully', post: newPost });
      
    } else if (type === 'poll') {
      // Poll validation
      if (!question) {
        return res.status(400).json({ message: 'Poll requires a question' });
      }
      
      if (!options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ message: 'Poll requires at least 2 options' });
      }
      
      if (options.length > 6) {
        return res.status(400).json({ message: 'Poll cannot have more than 6 options' });
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
      
      await newPost.save();
      res.status(201).json({ message: 'Poll created successfully', post: newPost });
    }
    
  } catch (error) {
    console.error("Post creation error:", error);
    res.status(500).json({ message: 'Error creating post' });
  }
});

// Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.error("Posts fetch error:", error);
    res.status(500).json({ message: "Server error fetching posts" });
  }
});

// Like a post
app.post('/api/posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { liked } = req.body;
    const userId = req.body.userId || req.ip; // Use IP as fallback for user identification
    
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    const hasLiked = post.likedBy.includes(userId);
    
    if (liked && !hasLiked) {
      post.likes += 1;
      post.likedBy.push(userId);
    } else if (!liked && hasLiked) {
      post.likes = Math.max(0, post.likes - 1);
      post.likedBy = post.likedBy.filter(id => id !== userId);
    }
    
    await post.save();
    res.json({ 
      likes: post.likes, 
      liked: post.likedBy.includes(userId) 
    });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ message: 'Failed to like post' });
  }
});

// Vote on poll
app.post('/api/posts/:postId/vote', async (req, res) => {
  try {
    const { postId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.body.userId || req.ip;
    
    const post = await Post.findById(postId);
    if (!post || post.type !== 'poll') {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    if (optionIndex < 0 || optionIndex >= post.options.length) {
      return res.status(400).json({ message: 'Invalid option' });
    }
    
    const option = post.options[optionIndex];
    const hasVoted = option.voters.includes(userId);
    
    if (!post.allowMultiple) {
      // Remove user's previous votes if single selection
      post.options.forEach(opt => {
        if (opt.voters.includes(userId)) {
          opt.votes = Math.max(0, opt.votes - 1);
          opt.voters = opt.voters.filter(id => id !== userId);
          post.totalVotes = Math.max(0, post.totalVotes - 1);
        }
      });
    }
    
    if (!hasVoted) {
      option.votes += 1;
      option.voters.push(userId);
      post.totalVotes += 1;
    }
    
    await post.save();
    res.json({ 
      message: 'Vote recorded successfully', 
      post 
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ message: 'Failed to record vote' });
  }
});

// Add comment to post with comprehensive moderation
app.post('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Comment cannot be empty' });

    // Moderate comment content
    const moderationResult = await moderateText(content, ['en', 'es', 'fr', 'hi', 'kn']);
    
    if (moderationResult.isBlocked) {
      let blockReason = '';
      
      if (moderationResult.reasons.databaseMatch) {
        blockReason = `Database flagged words: ${moderationResult.reasons.foundWords.join(', ')}`;
      }
      if (moderationResult.reasons.aiDetection) {
        blockReason += (blockReason ? ' AND ' : '') + 'AI detected inappropriate content';
      }
      
      return res.status(400).json({ 
        message: 'Comment contains inappropriate content',
        details: blockReason
      });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({ content });
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

// Fallback routes
app.get('/upload.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    features: ['text-posts', 'polls', 'comments', 'likes', 'image-uploads', 'moderation', 'clickable-banners']
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
  }
  
  res.status(500).json({ 
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => res.status(404).json({ message: "❌ Route Not Found" }));

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Features: Text Posts, Polls, Comments, Likes, Image Uploads`);
  console.log(`🔒 Moderation: Active for all content types`);
  console.log(`🎯 Banner System: Clickable banners with custom URLs`);
});
