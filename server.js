require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
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

// Trust proxy for accurate IP detection
app.set('trust proxy', true);

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
      type: String // IP addresses who voted for this option
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
  voterIPs: [{ 
    type: String // All IP addresses that have voted in this poll
  }],
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

// Banner schema with linkUrl
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

// Utility function to get clean IP address
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const connectionIP = req.connection?.remoteAddress;
  const socketIP = req.socket?.remoteAddress;
  const reqIP = req.ip;
  
  let ip = forwarded || realIP || connectionIP || socketIP || reqIP || '127.0.0.1';
  
  // Handle comma-separated IPs (proxy chains)
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  
  // Remove IPv6 prefix
  ip = ip.replace(/^::ffff:/, '');
  
  return ip;
}

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

// Upload banner image with link URL
app.post('/api/upload/banner', upload.fields([
  { name: 'banner', maxCount: 1 },
  { name: 'link', maxCount: 1 }
]), async (req, res) => {
  console.log('📥 Files received:', req.files);
  console.log('📝 Body received:', req.body);
  
  const bannerFile = req.files && req.files['banner'] ? req.files['banner'][0] : null;
  const linkUrl = req.body.link;

  if (!bannerFile) return res.status(400).json({ message: 'No banner image uploaded' });
  if (!linkUrl) return res.status(400).json({ message: 'Banner link URL is required' });

  try {
    const b64 = Buffer.from(bannerFile.buffer).toString("base64");
    const dataUri = `data:${bannerFile.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'banner',
      resource_type: 'image'
    });

    const bannerDoc = await Banner.findOneAndUpdate({}, {
      imageUrl: result.secure_url,
      linkUrl: linkUrl.trim(),
      updatedAt: new Date()
    }, { upsert: true, new: true });

    console.log('✅ Banner saved to database:', bannerDoc);

    res.json({ 
      message: 'Banner uploaded successfully', 
      imageUrl: result.secure_url, 
      linkUrl: linkUrl.trim() 
    });
  } catch (error) {
    console.error("Banner upload error:", error);
    res.status(500).json({ message: 'Banner upload failed' });
  }
});

// Get banner with link URL
app.get('/api/banner', async (req, res) => {
  try {
    const banner = await Banner.findOne();
    console.log('📋 Banner from database:', banner);
    res.json({
      imageUrl: banner ? banner.imageUrl : null,
      linkUrl: banner ? banner.linkUrl : null
    });
  } catch (error) {
    console.error("Banner fetch error:", error);
    res.status(500).json({ message: 'Failed to fetch banner' });
  }
});

// Upload background image
app.post('/api/upload/background', upload.single('background'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No background image uploaded' });
  
  try {
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
    const imageUnsafe = await isImageUnsafe(req.file.buffer, req.file.mimetype);
    
    if (imageUnsafe === true) {
      return res.status(400).json({ message: 'Image contains inappropriate or unsafe content' });
    }
    
    if (imageUnsafe === null) {
      return res.status(400).json({ message: 'Unable to verify image safety - upload blocked' });
    }

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
    
    if (!['text', 'poll'].includes(type)) {
      return res.status(400).json({ message: 'Invalid post type' });
    }
    
    if (type === 'text') {
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
        totalVotes: 0,
        voterIPs: []
      });
      
      await newPost.save();
      res.status(201).json({ message: 'Poll created successfully', post: newPost });
    }
    
  } catch (error) {
    console.error("Post creation error:", error);
    res.status(500).json({ message: 'Error creating post' });
  }
});

// UPDATED: Get all posts with percentages
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    
    const postsWithPercentages = posts.map(post => {
      if (post.type === 'poll') {
        const totalVoteCount = post.options.reduce((sum, opt) => sum + opt.votes, 0);
        
        const optionsWithPercentages = post.options.map(option => {
          const percentage = totalVoteCount > 0 ? 
            Math.round((option.votes / totalVoteCount) * 100) : 0;
          
          return {
            text: option.text,
            votes: option.votes,
            voters: option.voters,
            percentage: percentage
          };
        });
        
        return {
          ...post.toObject(),
          options: optionsWithPercentages,
          totalVotes: post.voterIPs ? post.voterIPs.length : totalVoteCount
        };
      }
      return post;
    });
    
    res.json(postsWithPercentages);
  } catch (error) {
    console.error("Posts fetch error:", error);
    res.status(500).json({ message: "Server error fetching posts" });
  }
});

// Enhanced like endpoint
app.post('/api/posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { liked } = req.body;
    
    const ip = getClientIP(req);
    const userId = crypto.createHash('md5').update(ip + (req.get('User-Agent') || '')).digest('hex');
    
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

// UPDATED: Enhanced vote endpoint - 1 vote per IP with percentages
app.post('/api/posts/:postId/vote', async (req, res) => {
  try {
    const { postId } = req.params;
    const { optionIndex, optionIndexes, allowMultiple } = req.body;
    
    const ip = getClientIP(req);
    
    const post = await Post.findById(postId);
    if (!post || post.type !== 'poll') {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    // Check if this IP has already voted in this poll
    if (post.voterIPs && post.voterIPs.includes(ip)) {
      return res.status(400).json({ 
        message: 'You have already voted in this poll. Only one vote per person is allowed.',
        alreadyVoted: true
      });
    }
    
    // Process the vote
    if (allowMultiple && optionIndexes && Array.isArray(optionIndexes)) {
      // Multiple selection voting
      if (optionIndexes.length === 0) {
        return res.status(400).json({ message: 'Please select at least one option' });
      }
      
      optionIndexes.forEach(index => {
        if (index >= 0 && index < post.options.length) {
          post.options[index].votes += 1;
          post.options[index].voters.push(ip);
        }
      });
      
    } else {
      // Single selection voting
      if (optionIndex < 0 || optionIndex >= post.options.length) {
        return res.status(400).json({ message: 'Invalid option selected' });
      }
      
      post.options[optionIndex].votes += 1;
      post.options[optionIndex].voters.push(ip);
    }
    
    // Add IP to voterIPs array
    if (!post.voterIPs) {
      post.voterIPs = [];
    }
    post.voterIPs.push(ip);
    post.totalVotes = post.voterIPs.length;
    
    await post.save();
    
    // Calculate percentages
    const totalVoteCount = post.options.reduce((sum, opt) => sum + opt.votes, 0);
    const optionsWithPercentages = post.options.map(option => {
      const percentage = totalVoteCount > 0 ? 
        Math.round((option.votes / totalVoteCount) * 100) : 0;
      
      return {
        text: option.text,
        votes: option.votes,
        voters: option.voters,
        percentage: percentage
      };
    });
    
    // Find leading option(s)
    const maxPercentage = Math.max(...optionsWithPercentages.map(opt => opt.percentage));
    const leadingOptions = optionsWithPercentages.filter(opt => opt.percentage === maxPercentage);
    
    const responsePost = {
      ...post.toObject(),
      options: optionsWithPercentages
    };
    
    res.json({ 
      message: 'Vote recorded successfully!', 
      post: responsePost,
      leadingOptions: leadingOptions.map(opt => ({ text: opt.text, percentage: opt.percentage })),
      totalUniqueVoters: post.voterIPs.length
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
    features: [
      'text-posts', 
      'polls', 
      'comments', 
      'likes', 
      'image-uploads', 
      'moderation', 
      'clickable-banners',
      'one-vote-per-ip',
      'poll-percentages'
    ]
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
  console.log(`🗳️ Poll System: 1 vote per IP + Percentages`);
});
