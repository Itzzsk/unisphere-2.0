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

// Enhanced IP detection function - MUST BE DEFINED BEFORE USE
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const cfIP = req.headers['cf-connecting-ip'];
  const clientIP = req.headers['x-client-ip'];
  
  let ip = forwarded || realIP || cfIP || clientIP || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.ip || 
           '127.0.0.1';
  
  // Handle comma-separated IPs (proxy chains)
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  
  // Remove IPv6 prefix if present
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  
  console.log('🌐 IP Detection:', {
    'x-forwarded-for': forwarded,
    'x-real-ip': realIP,
    'final IP': ip
  });
  
  return ip || '127.0.0.1';
}

// Environment validation
function validateEnvironment() {
  const requiredEnvVars = ['MONGODB_URI'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    console.log('📋 Current environment variables:');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? '[SET]' : '[NOT SET]');
    console.log('PORT:', process.env.PORT || 'not set');
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
  
  console.log('✅ Environment variables validated');
}

validateEnvironment();

// CORS Configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? [
    process.env.FRONTEND_URL,
    'https://your-domain.com'
  ] : [
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for accurate IP detection
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : true);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Cloudinary config
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured');
} else {
  console.log('⚠️ Cloudinary not configured - image uploads will fail');
}

// Multer configuration
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

// FIXED: MongoDB connection with compatible options
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/unisphere';
    
    console.log('🔗 Connecting to MongoDB...');
    console.log('📍 URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    
    await mongoose.connect(mongoURI, {
      // Compatible options for most Mongoose versions
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      heartbeatFrequencyMS: 10000,
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log('📍 Database:', mongoose.connection.db.databaseName);
    console.log('🌐 Host:', mongoose.connection.host);
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    } else {
      console.log('🔄 Retrying connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    }
  }
};

connectDB();

// Enhanced connection monitoring
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 Attempting to reconnect...');
    setTimeout(connectDB, 5000);
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Mongoose reconnected to MongoDB');
});

// Enhanced Post Schema
const postSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['text', 'poll'], 
    default: 'text',
    required: true
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
      default: 0,
      min: 0
    },
    voters: [{ 
      type: String,
      default: []
    }]
  }],
  allowMultiple: { 
    type: Boolean, 
    default: false 
  },
  totalVotes: { 
    type: Number, 
    default: 0,
    min: 0
  },
  voterIPs: [{ 
    type: String,
    default: []
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
    default: 0,
    min: 0
  },
  likedBy: [{ 
    type: String,
    default: []
  }]
}, {
  timestamps: true
});

// Banner and Background schemas
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

// Basic moderation function
async function moderateText(text, languages = ['en']) {
  const badWords = ['spam', 'scam', 'fake', 'abuse'];
  const foundBadWords = badWords.filter(word => 
    text.toLowerCase().includes(word.toLowerCase())
  );
  
  return {
    isBlocked: foundBadWords.length > 0,
    reasons: {
      databaseMatch: foundBadWords.length > 0,
      foundWords: foundBadWords,
      aiDetection: false
    }
  };
}

// Moderation Middleware
async function moderateAllContent(req, res, next) {
  try {
    const { content, question, options } = req.body;
    
    if (content) {
      const moderationResult = await moderateText(content);
      if (moderationResult.isBlocked) {
        return res.status(400).json({
          message: 'Content contains inappropriate material',
          details: moderationResult.reasons.foundWords
        });
      }
    }
    
    if (question) {
      const moderationResult = await moderateText(question);
      if (moderationResult.isBlocked) {
        return res.status(400).json({
          message: 'Poll question contains inappropriate material',
          details: moderationResult.reasons.foundWords
        });
      }
    }
    
    if (options && Array.isArray(options)) {
      for (const option of options) {
        if (option.text) {
          const moderationResult = await moderateText(option.text);
          if (moderationResult.isBlocked) {
            return res.status(400).json({
              message: `Poll option "${option.text}" contains inappropriate material`,
              details: moderationResult.reasons.foundWords
            });
          }
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Moderation error:', error);
    next(); // Continue even if moderation fails
  }
}

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${getClientIP(req)}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  res.json({ 
    status: 'OK',
    database: states[dbState] || 'unknown',
    timestamp: new Date().toISOString(),
    features: [
      'text-posts', 
      'polls', 
      'comments', 
      'likes', 
      'image-uploads', 
      'moderation',
      'one-vote-per-ip',
      'poll-percentages'
    ]
  });
});

// Debug endpoint for troubleshooting
app.get('/api/debug/db', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    const testPost = await Post.findOne().limit(1);
    
    res.json({
      database: {
        state: states[dbState] || 'unknown',
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        readyState: dbState
      },
      testQuery: !!testPost,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      database: 'connection failed'
    });
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
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto'
    });
    
    res.json({ imageUrl: result.secure_url });
  } catch (error) {
    console.error("Post image upload error:", error);
    res.status(500).json({ message: 'Image upload failed: ' + error.message });
  }
});

// Create posts (both text and poll)
app.post('/api/posts', moderateAllContent, async (req, res) => {
  try {
    const { type, content, question, options, allowMultiple, imageUrl } = req.body;
    
    console.log('📝 Creating post:', { type, hasContent: !!content, hasQuestion: !!question, optionsCount: options?.length });
    
    if (!['text', 'poll'].includes(type)) {
      return res.status(400).json({ message: 'Invalid post type' });
    }
    
    let newPost;
    
    if (type === 'text') {
      if (!content && !imageUrl) {
        return res.status(400).json({ message: 'Text post requires content or image' });
      }
      
      newPost = new Post({
        type: 'text',
        content: content || '',
        imageUrl: imageUrl || null
      });
      
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
      
      newPost = new Post({
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
    }
    
    const savedPost = await newPost.save();
    console.log('✅ Post created successfully:', savedPost._id);
    
    res.status(201).json({ 
      message: `${type === 'poll' ? 'Poll' : 'Post'} created successfully`, 
      post: savedPost 
    });
    
  } catch (error) {
    console.error("Post creation error:", error);
    res.status(500).json({ 
      message: 'Error creating post: ' + error.message 
    });
  }
});

// Get all posts with percentages
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .lean();
    
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
          ...post,
          options: optionsWithPercentages,
          totalVotes: totalVoteCount
        };
      }
      return post;
    });
    
    res.json(postsWithPercentages);
  } catch (error) {
    console.error("Posts fetch error:", error);
    res.status(500).json({ message: "Server error fetching posts: " + error.message });
  }
});

// ENHANCED: Vote endpoint with comprehensive error handling and logging
app.post('/api/posts/:postId/vote', async (req, res) => {
  const startTime = Date.now();
  console.log('🗳️ Vote request started');
  
  try {
    const { postId } = req.params;
    const { optionIndex, optionIndexes, allowMultiple } = req.body;
    const ip = getClientIP(req);

    console.log('📝 Vote data:', { postId, optionIndex, optionIndexes, allowMultiple, ip });

    // Validate postId format
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      console.log('❌ Invalid postId format:', postId);
      return res.status(400).json({ 
        message: 'Invalid post ID format',
        postId: postId 
      });
    }

    // Database connection check
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ Database not connected, state:', mongoose.connection.readyState);
      return res.status(500).json({ 
        message: 'Database connection error',
        dbState: mongoose.connection.readyState 
      });
    }

    // Find the post
    console.log('🔍 Looking for post:', postId);
    const post = await Post.findById(postId).maxTimeMS(10000);
    
    if (!post) {
      console.log('❌ Post not found in database');
      return res.status(404).json({ message: 'Poll not found' });
    }

    console.log('✅ Post found:', {
      id: post._id,
      type: post.type,
      question: post.question?.substring(0, 50),
      optionsCount: post.options?.length,
      currentVotes: post.options.map(opt => opt.votes),
      voterIPs: post.voterIPs?.length || 0
    });

    if (post.type !== 'poll') {
      console.log('❌ Post is not a poll, type:', post.type);
      return res.status(400).json({ message: 'Post is not a poll' });
    }

    // Check if IP already voted
    if (post.voterIPs && post.voterIPs.includes(ip)) {
      console.log('❌ IP already voted:', ip);
      return res.status(400).json({ 
        message: 'You have already voted in this poll. Only one vote per person is allowed.',
        alreadyVoted: true
      });
    }

    // Initialize arrays safely
    if (!post.voterIPs) post.voterIPs = [];
    if (!post.options || !Array.isArray(post.options)) {
      console.log('❌ Invalid options array');
      return res.status(500).json({ message: 'Poll options are corrupted' });
    }
    
    // Ensure all options have required fields
    post.options.forEach((option, index) => {
      if (!option.voters || !Array.isArray(option.voters)) {
        post.options[index].voters = [];
      }
      if (typeof option.votes !== 'number' || isNaN(option.votes)) {
        post.options[index].votes = 0;
      }
    });

    console.log('📊 Processing vote...');

    // Process vote based on type
    if (allowMultiple) {
      // Multiple choice validation
      if (!Array.isArray(optionIndexes)) {
        return res.status(400).json({ message: 'Invalid request format for multiple choice' });
      }
      
      if (optionIndexes.length === 0) {
        return res.status(400).json({ message: 'Please select at least one option' });
      }

      if (optionIndexes.length !== 2) {
        return res.status(400).json({ message: 'Please select exactly 2 options for multiple choice polls' });
      }

      // Validate all indexes
      const invalidIndex = optionIndexes.find(idx => 
        typeof idx !== 'number' || idx < 0 || idx >= post.options.length
      );
      
      if (invalidIndex !== undefined) {
        return res.status(400).json({ 
          message: `Invalid option index: ${invalidIndex}`,
          validRange: `0-${post.options.length - 1}`
        });
      }

      // Check for duplicate selections
      const uniqueIndexes = [...new Set(optionIndexes)];
      if (uniqueIndexes.length !== optionIndexes.length) {
        return res.status(400).json({ message: 'Cannot select the same option multiple times' });
      }

      // Add votes
      optionIndexes.forEach(idx => {
        post.options[idx].votes += 1;
        post.options[idx].voters.push(ip);
        console.log(`✅ Added vote to option ${idx}: "${post.options[idx].text}" (now ${post.options[idx].votes} votes)`);
      });

    } else {
      // Single choice validation
      let selectedIndex;
      
      if (optionIndex !== undefined) {
        selectedIndex = optionIndex;
      } else if (Array.isArray(optionIndexes) && optionIndexes.length === 1) {
        selectedIndex = optionIndexes[0];
      } else {
        return res.status(400).json({ message: 'Invalid request format for single choice' });
      }
      
      if (typeof selectedIndex !== 'number' || selectedIndex < 0 || selectedIndex >= post.options.length) {
        return res.status(400).json({ 
          message: 'Invalid option selected',
          selectedIndex,
          validRange: `0-${post.options.length - 1}`
        });
      }

      post.options[selectedIndex].votes += 1;
      post.options[selectedIndex].voters.push(ip);
      console.log(`✅ Added vote to option ${selectedIndex}: "${post.options[selectedIndex].text}" (now ${post.options[selectedIndex].votes} votes)`);
    }

    // Add IP to voters list
    post.voterIPs.push(ip);
    
    // Calculate totals
    const totalVoteCount = post.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
    post.totalVotes = totalVoteCount;

    console.log('💾 Saving to database...', {
      totalVotes: totalVoteCount,
      uniqueVoters: post.voterIPs.length,
      optionVotes: post.options.map(opt => ({ text: opt.text, votes: opt.votes }))
    });
    
    // Enhanced save with retries
    let savedPost;
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        post.markModified('options');
        post.markModified('voterIPs');
        
        savedPost = await post.save({ 
          validateBeforeSave: true,
          timestamps: true 
        });
        
        console.log('✅ Post saved successfully on attempt', retryCount + 1);
        break;
      } catch (saveError) {
        retryCount++;
        console.warn(`⚠️ Save attempt ${retryCount} failed:`, {
          error: saveError.message,
          name: saveError.name,
          code: saveError.code
        });
        
        if (retryCount >= maxRetries) {
          console.error('❌ All save attempts failed:', saveError);
          throw new Error(`Database save failed after ${maxRetries} attempts: ${saveError.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
      }
    }

    // Calculate percentages for response
    const optionsWithPercentages = savedPost.options.map(option => ({
      text: option.text,
      votes: option.votes || 0,
      voters: option.voters || [],
      percentage: totalVoteCount > 0 ? Math.round((option.votes / totalVoteCount) * 100) : 0
    }));

    // Find leading options
    const maxPercentage = Math.max(...optionsWithPercentages.map(opt => opt.percentage));
    const leadingOptions = optionsWithPercentages.filter(opt => 
      opt.percentage === maxPercentage && opt.percentage > 0
    );

    const responsePost = {
      ...savedPost.toObject(),
      options: optionsWithPercentages,
      totalVotes: totalVoteCount
    };

    const processingTime = Date.now() - startTime;
    console.log(`✅ Vote processed successfully in ${processingTime}ms`);

    res.json({
      message: 'Vote recorded successfully!',
      post: responsePost,
      leadingOptions: leadingOptions.map(opt => ({ 
        text: opt.text, 
        percentage: opt.percentage 
      })),
      totalUniqueVoters: savedPost.voterIPs.length,
      totalVotes: totalVoteCount,
      processingTime: processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ CRITICAL VOTE ERROR:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      postId: req.params.postId,
      body: req.body,
      ip: getClientIP(req),
      processingTime: processingTime,
      dbState: mongoose.connection.readyState,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      message: 'Failed to record vote',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        postId: req.params.postId,
        body: req.body,
        processingTime: processingTime,
        dbState: mongoose.connection.readyState
      } : undefined
    });
  }
});

// Enhanced like endpoint
app.post('/api/posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { liked } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    
    const ip = getClientIP(req);
    const userId = crypto.createHash('md5').update(ip + (req.get('User-Agent') || '')).digest('hex');
    
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
    console.error('Like error:', error);
    res.status(500).json({ message: 'Failed to update like: ' + error.message });
  }
});

// Add comment to post
app.post('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment cannot be empty' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const moderationResult = await moderateText(content);
    if (moderationResult.isBlocked) {
      return res.status(400).json({ 
        message: 'Comment contains inappropriate content',
        details: moderationResult.reasons.foundWords
      });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (!post.comments) post.comments = [];
    
    post.comments.push({ 
      content: content.trim(),
      createdAt: new Date()
    });
    
    await post.save();
    
    res.json({ 
      message: 'Comment added successfully', 
      comments: post.comments 
    });
    
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Failed to add comment: ' + error.message });
  }
});

// Get comments for a post
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await Post.findById(req.params.postId).lean();
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    res.json(post.comments || []);
  } catch (error) {
    console.error('Fetch comments error:', error);
    res.status(500).json({ message: 'Failed to fetch comments: ' + error.message });
  }
});

// Banner endpoints
app.get('/api/banner', async (req, res) => {
  try {
    const banner = await Banner.findOne().lean();
    res.json({
      imageUrl: banner ? banner.imageUrl : null,
      linkUrl: banner ? banner.linkUrl : null
    });
  } catch (error) {
    console.error("Banner fetch error:", error);
    res.status(500).json({ message: 'Failed to fetch banner' });
  }
});

app.get('/api/background', async (req, res) => {
  try {
    const background = await Background.findOne().lean();
    res.json({ imageUrl: background ? background.imageUrl : null });
  } catch (error) {
    console.error("Background fetch error:", error);
    res.status(500).json({ message: 'Failed to fetch background' });
  }
});

// Fallback routes
app.get('/upload.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: getClientIP(req)
  });
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large (max 5MB)' });
    }
    return res.status(400).json({ message: 'File upload error: ' + error.message });
  }
  
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.path} not found` });
});

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  try {
    await mongoose.connection.close();
    console.log('📦 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  try {
    await mongoose.connection.close();
    console.log('📦 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`📊 Features: Text Posts, Polls (2-option multiple choice), Comments, Likes`);
  console.log(`🔒 Moderation: Basic profanity filtering active`);
  console.log(`🗳️ Poll System: 1 vote per IP with real-time percentages`);
  
  // Log database status after server start
  setTimeout(() => {
    const dbState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log(`💾 Database status: ${states[dbState] || 'unknown'}`);
  }, 2000);
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
});
