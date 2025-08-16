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
 'http://localhost:5000',
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

// Add to your server.js - Enhanced debugging for production
app.post('/api/posts/:postId/vote', async (req, res) => {
  const startTime = Date.now();
  console.log('🗳️ PRODUCTION Vote request:', {
    postId: req.params.postId,
    body: req.body,
    ip: getClientIP(req),
    environment: process.env.NODE_ENV,
    dbState: mongoose.connection.readyState,
    timestamp: new Date().toISOString()
  });
  
  try {
    const { postId } = req.params;
    const { optionIndex, optionIndexes, allowMultiple } = req.body;
    const ip = getClientIP(req);

    // Enhanced MongoDB connection check
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ Database not connected, state:', mongoose.connection.readyState);
      return res.status(500).json({ 
        message: 'Database connection error',
        dbState: mongoose.connection.readyState 
      });
    }

    // Validate postId format
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      console.log('❌ Invalid postId format:', postId);
      return res.status(400).json({ 
        message: 'Invalid post ID format',
        postId: postId 
      });
    }

    // Find the post with timeout
    console.log('🔍 Looking for post:', postId);
    const post = await Post.findById(postId).maxTimeMS(10000); // 10 second timeout
    
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
    
    // Enhanced save with retries and error handling
    let savedPost;
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        // Mark modified for nested objects
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
        
        // Wait before retry (exponential backoff)
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

