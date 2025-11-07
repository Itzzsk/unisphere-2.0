require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const webpush = require('web-push');

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

// CORS Configuration - FIX: Add your Netlify domain
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://unisphere2.netlify.app',  // ← Your frontend
    'https://res.cloudinary.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
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

// Web Push configuration
let VAPID_KEYS;

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  VAPID_KEYS = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
  };
  console.log('✅ Using VAPID keys from environment variables');
} else {
  VAPID_KEYS = webpush.generateVAPIDKeys();
  console.log('🔑 Generated new VAPID keys:');
  console.log(`VAPID_PUBLIC_KEY=${VAPID_KEYS.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${VAPID_KEYS.privateKey}`);
}

webpush.setVapidDetails(
  'mailto:skandaumesh82@gmail.com',
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);

console.log('✅ VAPID keys configured successfully');

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
    voters: [String]
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

const subscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  userAgent: String,
  subscribedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

// Models
const Post = mongoose.model('Post', postSchema);
const Banner = mongoose.model('Banner', bannerSchema);
const Background = mongoose.model('Background', backgroundSchema);
const Subscription = mongoose.model('Subscription', subscriptionSchema);

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_KEYS.publicKey });
});

app.get('/api/deployment-status', (req, res) => {
  res.json({
    status: 'deployed',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Upload endpoints
app.post('/api/upload/post', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
  
  try {
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataUri, { folder: 'posts' });
    res.json({ imageUrl: result.secure_url });
  } catch (error) {
    res.status(500).json({ message: 'Image upload failed' });
  }
});

app.post('/api/upload/banner', upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No banner uploaded' });
    
    const { link } = req.body;
    if (!link) return res.status(400).json({ message: 'Banner link required' });
    
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataUri, { folder: 'banners' });
    
    await Banner.findOneAndUpdate(
      {},
      { 
        imageUrl: result.secure_url, 
        linkUrl: link,
        updatedAt: new Date()
      },
      { upsert: true }
    );
    
    res.json({ 
      message: 'Banner uploaded successfully',
      imageUrl: result.secure_url,
      linkUrl: link
    });
  } catch (error) {
    res.status(500).json({ message: 'Banner upload failed' });
  }
});

// Posts CRUD
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

// Vote endpoint
app.post('/api/posts/:postId/vote', async (req, res) => {
  try {
    const { postId } = req.params;
    const { optionIndex, optionIndexes, allowMultiple } = req.body;
    const ip = getClientIP(req);

    const post = await Post.findById(postId);
    if (!post || post.type !== 'poll') {
      return res.status(404).json({ message: 'Poll not found' });
    }

    post.options.forEach((option, index) => {
      if (!option.voters) post.options[index].voters = [];
      if (typeof option.votes !== 'number') post.options[index].votes = 0;
    });

    if (allowMultiple) {
      if (!Array.isArray(optionIndexes) || optionIndexes.length !== 2) {
        return res.status(400).json({ message: 'Please select exactly 2 options' });
      }

      for (const idx of optionIndexes) {
        if (idx < 0 || idx >= post.options.length) {
          return res.status(400).json({ message: 'Invalid option selected' });
        }
      }

      optionIndexes.forEach(idx => {
        post.options[idx].votes += 1;
        post.options[idx].voters.push(ip);
      });
    } else {
      let selectedIndex = optionIndex !== undefined ? optionIndex : optionIndexes?.[0];
      
      if (selectedIndex < 0 || selectedIndex >= post.options.length) {
        return res.status(400).json({ message: 'Invalid option selected' });
      }

      post.options[selectedIndex].votes += 1;
      post.options[selectedIndex].voters.push(ip);
    }

    const totalVoteCount = post.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
    post.totalVotes = totalVoteCount;

    await post.save();

    const optionsWithPercentages = post.options.map(option => ({
      text: option.text,
      votes: option.votes || 0,
      percentage: totalVoteCount > 0 ? Math.round((option.votes / totalVoteCount) * 100) : 0
    }));

    res.json({
      message: 'Vote recorded successfully!',
      post: { ...post.toObject(), options: optionsWithPercentages, totalVotes: totalVoteCount }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record vote' });
  }
});

// Like endpoint
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

// Web Push - Subscribe
app.post('/api/subscribe', async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;

    const newSubscription = new Subscription({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      userAgent: userAgent || 'Unknown',
      subscribedAt: new Date(),
      isActive: true
    });

    await newSubscription.save();
    console.log('📱 New subscription saved');

    res.json({ 
      success: true, 
      message: 'Subscription saved successfully' 
    });
  } catch (error) {
    if (error.code === 11000) {
      await Subscription.findOneAndUpdate(
        { endpoint: req.body.subscription.endpoint },
        { isActive: true, subscribedAt: new Date() }
      );
      res.json({ success: true, message: 'Subscription updated' });
    } else {
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  }
});

// Web Push - Send to all
app.post('/api/send-to-all', async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message required' });
    }

    const subscriptions = await Subscription.find({ isActive: true });

    if (subscriptions.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No active subscriptions',
        stats: { total: 0, sent: 0, failed: 0 }
      });
    }

    const notificationPayload = JSON.stringify({
      title: `UniSphere - ${title}`,
      body: message,
      icon: '/favicon.ico',
      tag: `unisphere-${Date.now()}`,
      data: { url: '/', timestamp: Date.now() }
    });

    let successCount = 0;
    let failureCount = 0;

    const promises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        }, notificationPayload);
        
        successCount++;
      } catch (error) {
        failureCount++;

        if (error.statusCode === 410 || error.statusCode === 404 || error.statusCode === 400) {
          await Subscription.findOneAndUpdate(
            { endpoint: sub.endpoint },
            { isActive: false }
          );
        }
      }
    });

    await Promise.all(promises);

    res.json({
      success: true,
      message: 'Notifications sent',
      stats: {
        total: subscriptions.length,
        sent: successCount,
        failed: failureCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

// Subscription stats
app.get('/api/subscription-stats', async (req, res) => {
  try {
    const totalSubs = await Subscription.countDocuments({ isActive: true });
    res.json({ total: totalSubs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Reset subscriptions
app.post('/api/reset-all-subscriptions', async (req, res) => {
  try {
    const result = await Subscription.deleteMany({});
    res.json({ success: true, message: `Reset: ${result.deletedCount} subscriptions cleared` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset' });
  }
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

// Cleanup job
setInterval(async () => {
  try {
    const expiredCount = await Subscription.deleteMany({ 
      isActive: false, 
      subscribedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
  } catch (error) {
    console.error('Cleanup job error:', error);
  }
}, 24 * 60 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Features: Posts, Polls, Comments, Likes, Banner Upload`);
  console.log(`🗳️ Poll System: UNLIMITED VOTING`);
  console.log(`📱 Web Push: Notifications enabled`);
  console.log(`✅ Frontend: https://unisphere2.netlify.app`);
});
