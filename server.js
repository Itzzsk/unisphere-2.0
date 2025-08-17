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

// 🔧 FIXED: Web Push configuration with auto-generated VAPID keys
let VAPID_KEYS;

// Use environment variables if available, otherwise generate new keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  VAPID_KEYS = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
  };
  console.log('📱 Using VAPID keys from environment variables');
} else {
  // Generate new keys if not in environment
  VAPID_KEYS = webpush.generateVAPIDKeys();
  console.log('🔑 Generated new VAPID keys:');
  console.log('📋 Add these to your .env file:');
  console.log(`VAPID_PUBLIC_KEY=${VAPID_KEYS.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${VAPID_KEYS.privateKey}`);
  console.log('');
}

// Set VAPID details with generated/loaded keys
webpush.setVapidDetails(
  'mailto:skandaumesh82@gmail.com',
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);

console.log('✅ VAPID keys configured successfully');

// Multer config - FIXED multiplication
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Fixed: Proper multiplication
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

// Web Push Subscription Schema
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

// API endpoint to get public VAPID key for frontend
app.get('/api/vapid-public-key', (req, res) => {
  res.json({
    publicKey: VAPID_KEYS.publicKey
  });
});

// 🚨 EMERGENCY RESET - Visit this URL to fix VAPID issues instantly
app.get('/api/emergency-reset', async (req, res) => {
  try {
    const result = await Subscription.deleteMany({});
    console.log('🧹 EMERGENCY RESET: Cleared all subscriptions');
    
    res.json({
      success: true,
      message: `Emergency reset complete: ${result.deletedCount} subscriptions cleared`,
      action: 'All users must re-subscribe with correct VAPID key',
      instructions: 'Clear browser data and visit main site to re-subscribe'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test subscription endpoint
app.post('/api/test-subscription', async (req, res) => {
  try {
    const { subscription } = req.body;
    
    // Try to send a test notification
    const testPayload = JSON.stringify({
      title: 'Connection Test',
      body: 'Testing subscription validity',
      tag: 'test-notification'
    });
    
    await webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    }, testPayload);
    
    res.json({ valid: true });
    
  } catch (error) {
    console.log('🧪 Test subscription failed:', error.statusCode, error.message);
    res.status(400).json({ 
      valid: false, 
      error: error.statusCode,
      message: error.message 
    });
  }
});

// Cleanup invalid subscriptions
app.post('/api/cleanup-subscriptions', async (req, res) => {
  try {
    console.log('🧹 Starting subscription cleanup...');
    
    const subscriptions = await Subscription.find({ isActive: true });
    let cleanedCount = 0;
    
    for (const sub of subscriptions) {
      try {
        // Test each subscription
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        }, JSON.stringify({
          title: 'Cleanup Test',
          body: 'Testing subscription'
        }));
        
      } catch (error) {
        // Mark invalid subscriptions as inactive
        await Subscription.findOneAndUpdate(
          { endpoint: sub.endpoint },
          { isActive: false }
        );
        cleanedCount++;
        console.log('🗑️ Cleaned invalid subscription:', error.statusCode);
      }
    }
    
    console.log(`✅ Cleanup completed: ${cleanedCount} invalid subscriptions removed`);
    
    res.json({
      success: true,
      cleaned: cleanedCount,
      remaining: subscriptions.length - cleanedCount
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
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

// Upload banner
app.post('/api/upload/banner', upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No banner uploaded' });
    
    const { link } = req.body;
    if (!link) return res.status(400).json({ message: 'Banner link required' });
    
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'banners'
    });
    
    // Update or create banner
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
    console.error('Banner upload error:', error);
    res.status(500).json({ message: 'Banner upload failed' });
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
            Math.round(((option.votes || 0) / totalVoteCount) * 100) : 0; // Fixed: Proper multiplication
          
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

    // Calculate percentages for response - FIXED multiplication
    const optionsWithPercentages = post.options.map(option => ({
      text: option.text,
      votes: option.votes || 0,
      voters: option.voters || [],
      percentage: totalVoteCount > 0 ? Math.round((option.votes / totalVoteCount) * 100) : 0 // Fixed: Proper multiplication
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

// ==================== WEB PUSH NOTIFICATION ENDPOINTS ====================

// Subscribe user to push notifications
app.post('/api/subscribe', async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;

    // Save subscription to database
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

    console.log('📱 New subscription saved:', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      userAgent: userAgent || 'Unknown'
    });

    res.json({ 
      success: true, 
      message: 'Subscription saved successfully' 
    });

  } catch (error) {
    if (error.code === 11000) {
      // Duplicate subscription - update existing
      try {
        await Subscription.findOneAndUpdate(
          { endpoint: req.body.subscription.endpoint },
          { 
            isActive: true,
            subscribedAt: new Date(),
            userAgent: req.body.userAgent || 'Unknown'
          }
        );
        res.json({ success: true, message: 'Subscription updated' });
      } catch (updateError) {
        console.error('Error updating subscription:', updateError);
        res.status(500).json({ error: 'Failed to update subscription' });
      }
    } else {
      console.error('Error saving subscription:', error);
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  }
});

// Enhanced send-to-all endpoint with detailed error handling
app.post('/api/send-to-all', async (req, res) => {
  try {
    const { title, message, requireInteraction, silent } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // Get all active subscriptions
    const subscriptions = await Subscription.find({ isActive: true });

    if (subscriptions.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No active subscriptions found',
        stats: { total: 0, sent: 0, failed: 0 }
      });
    }

    const notificationPayload = JSON.stringify({
      title: `UniSphere - ${title}`,
      body: message,
      icon: '/favicon.ico',
      badge: '/icon-192x192.png',
      tag: `unisphere-${Date.now()}`,
      requireInteraction: requireInteraction || false,
      silent: silent || false,
      vibrate: [200, 100, 200],
      data: {
        url: '/',
        timestamp: Date.now()
      }
    });

    let successCount = 0;
    let failureCount = 0;
    const failureDetails = []; // Collect detailed error info

    // Send to all subscriptions with detailed error handling
    const promises = subscriptions.map(async (sub) => {
      try {
        console.log('📤 Sending to endpoint:', sub.endpoint.substring(0, 50) + '...');
        
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        }, notificationPayload);
        
        successCount++;
        console.log('✅ Success for:', sub.endpoint.substring(0, 50) + '...');
        
      } catch (error) {
        failureCount++;
        
        // Enhanced: Log detailed error information
        console.error('❌ DETAILED ERROR for endpoint:', sub.endpoint.substring(0, 50) + '...');
        console.error('❌ Error Code:', error.statusCode);
        console.error('❌ Error Message:', error.message);
        console.error('❌ Error Body:', error.body);
        
        // Store detailed error info
        failureDetails.push({
          endpoint: sub.endpoint.substring(0, 50) + '...',
          statusCode: error.statusCode,
          message: error.message,
          body: error.body
        });

        // Handle specific error codes and auto-cleanup
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('🗑️ Marking subscription as inactive (410/404)');
          await Subscription.findOneAndUpdate(
            { endpoint: sub.endpoint },
            { isActive: false }
          );
        } else if (error.statusCode === 400) {
          console.log('⚠️ Bad request - possibly malformed subscription');
          await Subscription.findOneAndUpdate(
            { endpoint: sub.endpoint },
            { isActive: false }
          );
        } else if (error.statusCode === 401 || error.statusCode === 403) {
          console.log('🔐 Authentication error - VAPID issue - marking as inactive');
          await Subscription.findOneAndUpdate(
            { endpoint: sub.endpoint },
            { isActive: false }
          );
        }
      }
    });

    await Promise.all(promises);

    // Enhanced: Log detailed results
    console.log('📤 DETAILED Notification broadcast completed:', {
      title,
      totalSubscriptions: subscriptions.length,
      successful: successCount,
      failed: failureCount,
      failureDetails,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Notifications sent successfully',
      stats: {
        total: subscriptions.length,
        sent: successCount,
        failed: failureCount,
        errors: failureDetails
      }
    });

  } catch (error) {
    console.error('❌ FATAL Error sending notifications:', error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

// Get subscription stats (for admin panel)
app.get('/api/subscription-stats', async (req, res) => {
  try {
    const totalSubs = await Subscription.countDocuments({ isActive: true });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todaySubs = await Subscription.countDocuments({
      isActive: true,
      subscribedAt: { $gte: todayStart }
    });

    const recentSubs = await Subscription.find({ isActive: true })
      .sort({ subscribedAt: -1 })
      .limit(5)
      .select('subscribedAt userAgent');

    res.json({
      total: totalSubs,
      today: todaySubs,
      recent: recentSubs
    });
  } catch (error) {
    console.error('Error getting subscription stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Manual notification endpoint (legacy)
app.post('/api/send-notification', async (req, res) => {
  try {
    const { title, message, options } = req.body;
    
    // Log the notification request
    console.log('📱 Manual notification request:', {
      title,
      message,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      message: 'Notification request received',
      data: { title, message, options }
    });
    
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ error: 'Failed to process notification' });
  }
});

// Reset all subscriptions endpoint
app.post('/api/reset-all-subscriptions', async (req, res) => {
  try {
    const deletedCount = await Subscription.deleteMany({});
    
    console.log(`🧹 RESET: Deleted ${deletedCount.deletedCount} subscriptions`);
    console.log('🔄 All users will need to re-subscribe with the correct VAPID key');
    
    res.json({
      success: true,
      message: `Reset complete: ${deletedCount.deletedCount} subscriptions cleared`,
      action: 'Users will be prompted to re-subscribe on next visit'
    });
    
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ error: 'Failed to reset subscriptions' });
  }
});
// Add to your deployed server.js
app.get('/api/force-reset-production', async (req, res) => {
  try {
    const result = await Subscription.deleteMany({});
    console.log('🧹 PRODUCTION RESET: Cleared all subscriptions');
    
    res.json({
      success: true,
      message: `Production reset: ${result.deletedCount} subscriptions cleared`,
      action: 'All users must re-subscribe with new deployment keys',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Add deployment verification endpoint
app.get('/api/deployment-status', (req, res) => {
  res.json({
    status: 'deployed',
    timestamp: new Date().toISOString(),
    vapidKey: VAPID_KEYS.publicKey.substring(0, 20) + '...',
    environment: process.env.NODE_ENV || 'production',
    subscribers: null // Will be filled by next query
  });
});

// Enhanced subscription stats for deployment
app.get('/api/subscription-stats', async (req, res) => {
  try {
    const totalSubs = await Subscription.countDocuments({ isActive: true });
    const deploymentStart = new Date();
    deploymentStart.setHours(deploymentStart.getHours() - 1); // Last hour
    
    const newSubs = await Subscription.countDocuments({
      isActive: true,
      subscribedAt: { $gte: deploymentStart }
    });

    res.json({
      total: totalSubs,
      newSinceDeployment: newSubs,
      deploymentTime: deploymentStart.toISOString(),
      message: totalSubs === 0 ? 'All users need to re-subscribe after deployment' : 'Deployment successful'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});
// Add to your server.js RIGHT NOW
app.get('/api/nuclear-reset', async (req, res) => {
  try {
    const result = await Subscription.deleteMany({});
    console.log('💥 NUCLEAR RESET: All subscriptions deleted');
    
    res.json({
      success: true,
      message: `NUCLEAR RESET: ${result.deletedCount} subscriptions deleted`,
      action: 'All users must re-subscribe immediately',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Regular cleanup job for expired subscriptions
setInterval(async () => {
  try {
    const expiredCount = await Subscription.countDocuments({ 
      isActive: false, 
      subscribedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days old
    });
    
    if (expiredCount > 0) {
      await Subscription.deleteMany({ 
        isActive: false, 
        subscribedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      console.log(`🧹 Cleaned up ${expiredCount} expired subscriptions`);
    }
  } catch (error) {
    console.error('Cleanup job error:', error);
  }
}, 24 * 60 * 60 * 1000); // Run daily

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Features: Posts, Polls, Comments, Likes, Banner Upload`);
  console.log(`🗳️ Poll System: UNLIMITED VOTING - Everyone can vote multiple times`);
  console.log(`📱 Web Push: Send notifications to all subscribers`);
  console.log(`🔑 VAPID Public Key: ${VAPID_KEYS.publicKey.substring(0, 20)}...`);
  console.log(`🧹 Auto-cleanup: Expired subscriptions removed daily`);
  console.log(`🚨 Emergency Reset: Visit /api/emergency-reset to fix VAPID issues`);
});
