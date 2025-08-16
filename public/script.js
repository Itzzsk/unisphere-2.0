// Global Variables
let currentPostType = 'text';
let selectedImage = null;

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  }
  updateThemeUI();
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeUI();
}

function updateThemeUI() {
  const isDark = document.documentElement.classList.contains('dark');
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  
  const icon = themeToggle.querySelector('i');
  const text = themeToggle.querySelector('.theme-text');
  
  if (icon && text) {
    icon.className = isDark ? 'fa-solid fa-sun text-xl' : 'fa-solid fa-moon text-xl';
    text.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  }
}

// Enhanced Menu Functions
function toggleMenu() {
  const menu = document.getElementById("mobile-menu");
  const overlay = document.getElementById("overlay");
  const hamburger = document.querySelector(".hamburger-menu") || document.querySelector(".menu");
  
  if (!menu || !overlay) return;
  
  const isOpen = menu.classList.contains("show");
  
  if (isOpen) {
    // Close menu
    menu.classList.remove("show");
    overlay.classList.add("hidden");
    hamburger?.classList.remove("active");
    document.body.style.overflow = "auto";
  } else {
    // Open menu
    menu.classList.add("show");
    overlay.classList.remove("hidden");
    hamburger?.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

// Enhanced Post Type Management
function initPostTypeToggle() {
  const textToggle = document.getElementById('textPostToggle');
  const pollToggle = document.getElementById('pollPostToggle');
  const textSection = document.getElementById('textPostSection');
  const pollSection = document.getElementById('pollSection');
  
  if (!textToggle || !pollToggle) return;
  
  textToggle.addEventListener('click', function() {
    switchToTextPost();
  });
  
  pollToggle.addEventListener('click', function() {
    switchToPollPost();
  });
}

function switchToTextPost() {
  currentPostType = 'text';
  const textToggle = document.getElementById('textPostToggle');
  const pollToggle = document.getElementById('pollPostToggle');
  const textSection = document.getElementById('textPostSection');
  const pollSection = document.getElementById('pollSection');
  
  // Update button states
  textToggle.className = 'px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold transition-all';
  pollToggle.className = 'px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold transition-all';
  
  // Update sections
  textSection?.classList.remove('hidden');
  pollSection?.classList.add('hidden');
  
  // Update ARIA attributes
  textToggle.setAttribute('aria-selected', 'true');
  pollToggle.setAttribute('aria-selected', 'false');
}

function switchToPollPost() {
  currentPostType = 'poll';
  const textToggle = document.getElementById('textPostToggle');
  const pollToggle = document.getElementById('pollPostToggle');
  const textSection = document.getElementById('textPostSection');
  const pollSection = document.getElementById('pollSection');
  
  // Update button states
  pollToggle.className = 'px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold transition-all';
  textToggle.className = 'px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold transition-all';
  
  // Update sections
  pollSection?.classList.remove('hidden');
  textSection?.classList.add('hidden');
  
  // Update ARIA attributes
  pollToggle.setAttribute('aria-selected', 'true');
  textToggle.setAttribute('aria-selected', 'false');
}

// Poll Functions
function initPollFunctions() {
  const addOptionBtn = document.getElementById('addPollOption');
  const pollOptions = document.getElementById('pollOptions');
  
  if (!addOptionBtn || !pollOptions) return;
  
  addOptionBtn.addEventListener('click', function() {
    const optionCount = pollOptions.children.length;
    if (optionCount < 6) {
      const optionDiv = document.createElement('div');
      optionDiv.className = 'poll-option-input flex items-center space-x-2';
      optionDiv.innerHTML = `
        <input type="text" class="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors" placeholder="Option ${optionCount + 1}" maxlength="100" />
        <button class="text-red-500 hover:text-red-700 p-2 remove-option transition-colors">
          <i class="fas fa-trash"></i>
        </button>
      `;
      pollOptions.appendChild(optionDiv);
      
      optionDiv.querySelector('.remove-option').addEventListener('click', function() {
        optionDiv.remove();
        updateRemoveButtons();
      });
      
      updateRemoveButtons();
    }
  });
  
  function updateRemoveButtons() {
    const removeButtons = document.querySelectorAll('.remove-option');
    removeButtons.forEach(function(btn) {
      if (pollOptions.children.length <= 2) {
        btn.classList.add('hidden');
      } else {
        btn.classList.remove('hidden');
      }
    });
  }
}

// User ID Management for Voting
function getUserIdForVoting() {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('userId', userId);
  }
  return userId;
}

// Create Posts
function createTextPost() {
  const postContent = document.getElementById('postContent').value.trim();
  
  if (!postContent && !selectedImage) {
    showAlert("Post must contain text or image!", 'warning');
    return;
  }
  
  const postData = {
    type: 'text',
    content: postContent,
    imageUrl: selectedImage
  };
  
  submitPost(postData);
}

function createPollPost() {
  const question = document.getElementById('pollQuestion').value.trim();
  const optionInputs = document.querySelectorAll('#pollOptions input');
  const allowMultiple = document.getElementById('allowMultiple').checked;
  
  if (!question) {
    showAlert('Please enter a poll question', 'warning');
    return;
  }
  
  const options = [];
  optionInputs.forEach(function(input) {
    if (input.value.trim()) {
      options.push({
        text: input.value.trim()
      });
    }
  });
  
  if (options.length < 2) {
    showAlert('Please add at least 2 options', 'warning');
    return;
  }
  
  const pollData = {
    type: 'poll',
    question: question,
    options: options,
    allowMultiple: allowMultiple
  };
  
  submitPost(pollData);
}

async function submitPost(postData) {
  const submitButton = document.getElementById('submitPostButton');
  const originalText = submitButton.querySelector('.submit-text');
  const spinner = submitButton.querySelector('.submit-spinner');
  
  try {
    // Show loading state
    submitButton.disabled = true;
    originalText.classList.add('hidden');
    spinner.classList.remove('hidden');
    
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });
    
    if (response.ok) {
      // Reset forms
      if (postData.type === 'text') {
        document.getElementById('postContent').value = '';
        selectedImage = null;
        document.getElementById('imagePreview').innerHTML = '';
      } else {
        document.getElementById('pollQuestion').value = '';
        document.querySelectorAll('#pollOptions input').forEach(input => input.value = '');
        document.getElementById('allowMultiple').checked = false;
      }
      
      // Close modal
      document.getElementById("createPost").classList.add("hidden");
      document.getElementById("add").classList.add("hidden");
      document.body.style.overflow = "auto";
      
      // Refresh posts
      fetchPosts();
      
      // Show success message
      showAlert('Your post has been shared anonymously!', 'success');
    } else {
      const error = await response.json();
      showAlert(`Error creating post: ${error.message}`, 'error');
    }
  } catch (error) {
    console.error("Post submission error:", error);
    showAlert("Failed to submit post. Please check your connection.", 'error');
  } finally {
    // Reset loading state
    submitButton.disabled = false;
    originalText.classList.remove('hidden');
    spinner.classList.add('hidden');
  }
}

// Fetch and Display Posts
async function fetchPosts() {
  try {
    const response = await fetch('/api/posts');
    if (!response.ok) throw new Error('Failed to fetch posts');
    
    const posts = await response.json();
    const postsContainer = document.getElementById('postsContainer');
    if (!postsContainer) return;
    
    if (posts.length === 0) {
      showEmptyState();
      return;
    }
    
    postsContainer.innerHTML = posts.map(function(post) {
      if (post.type === 'poll') {
        return createPollHTML(post);
      } else {
        return createTextPostHTML(post);
      }
    }).join('');
    
    // Add event listeners after rendering
    addPostEventListeners();
    
  } catch (error) {
    console.error('Error fetching posts:', error);
    showErrorState();
  }
}

// Show empty state when no posts
function showEmptyState() {
  const postsContainer = document.getElementById('postsContainer');
  if (!postsContainer) return;
  
  postsContainer.innerHTML = `
    <div class="text-center py-12 animate-fade-in">
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg">
        <i class="fas fa-comments text-6xl text-gray-400 dark:text-gray-600 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">No posts yet</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">Be the first to share something with the community!</p>
        <button onclick="showTab('add')" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">
          Create First Post
        </button>
      </div>
    </div>
  `;
}

// Show error state when fetch fails
function showErrorState() {
  const postsContainer = document.getElementById('postsContainer');
  if (!postsContainer) return;
  
  postsContainer.innerHTML = `
    <div class="text-center py-12 animate-fade-in">
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg">
        <i class="fas fa-exclamation-triangle text-6xl text-red-500 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Unable to load posts</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">Please check your internet connection and try again.</p>
        <button onclick="fetchPosts()" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">
          Try Again
        </button>
      </div>
    </div>
  `;
}

// Add event listeners to posts
function addPostEventListeners() {
  // Like buttons
  document.querySelectorAll('.like-btn').forEach(function(button) {
    button.addEventListener('click', handleLike);
  });
  
  // Poll voting
  document.querySelectorAll('.poll-option').forEach(function(option) {
    option.addEventListener('click', handlePollVote);
  });
}

// Create Text Post HTML
function createTextPostHTML(post) {
  const userId = getUserIdForVoting();
  const isLiked = post.likedBy && post.likedBy.includes(userId);
  
  return `
    <div class="rounded-2xl shadow-lg mb-6 bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-300 hover:shadow-xl">
      <div class="flex items-center mb-4 space-x-2">
        <i class="fa-solid fa-user-astronaut text-blue-500 text-lg"></i>
        <h1 class="font-poppins text-gray-900 dark:text-white font-bold">UniSphere</h1>
        <span class="text-gray-500 dark:text-gray-400 text-sm">• ${getDetailedTimeAgo(post.createdAt)}</span>
      </div>
      ${post.content ? `<p class="text-gray-900 dark:text-white leading-relaxed mb-4">${escapeHtml(post.content)}</p>` : ''}
      ${post.imageUrl ? `
        <div class="relative overflow-hidden rounded-lg mb-4" style="padding-top: 56.25%">
          <img src="${post.imageUrl}" 
               class="absolute top-0 left-0 w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300" 
               onclick="openImageModal('${post.imageUrl}')"
               alt="Post image"/>
        </div>
      ` : ''}
      <div class="flex items-center gap-4 mt-4">
        <button class="like-btn flex items-center group transition-colors" data-post-id="${post._id}" data-liked="${isLiked}">
          <svg class="w-6 h-6 transition-colors duration-200 ${isLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}"
               fill="${isLiked ? 'currentColor' : 'none'}"
               stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span class="like-count ml-1 ${isLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}">${post.likes || 0}</span>
        </button>
        <button class="flex items-center text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors" 
                onclick="toggleCommentSection('${post._id}')">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z">
            </path>
          </svg>
          <span class="comment-count ml-1">${post.comments?.length || 0}</span>
        </button>
      </div>
      <div id="commentSection-${post._id}" class="hidden mt-4">
        <input 
          type="text" 
          id="commentInput-${post._id}" 
          placeholder="Write a comment..." 
          class="border border-gray-300 dark:border-gray-600 p-3 rounded-lg w-full mt-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          onkeypress="if(event.key === 'Enter') submitComment('${post._id}')"/>
        <button onclick="submitComment('${post._id}')" 
                class="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
          Submit
        </button>
        <div id="commentsContainer-${post._id}" class="mt-4 text-left space-y-2"></div>
      </div>
    </div>
  `;
}

// Create Poll HTML
function createPollHTML(post) {
  const userId = getUserIdForVoting();
  
  return `
    <div class="rounded-2xl shadow-lg mb-6 bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-300 hover:shadow-xl">
      <div class="flex items-center mb-4 space-x-2">
        <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
          <i class="fas fa-poll text-white"></i>
        </div>
        <div class="flex-1">
          <h1 class="font-poppins text-gray-900 dark:text-white font-semibold">Anonymous Poll</h1>
          <span class="text-gray-500 dark:text-gray-400 text-sm">${getDetailedTimeAgo(post.createdAt)}</span>
        </div>
      </div>
      <h3 class="font-semibold text-lg text-gray-900 dark:text-white mb-4">${escapeHtml(post.question)}</h3>
      <div class="space-y-3 mb-4" id="poll-${post._id}">
        ${post.options.map(function(option, index) {
          const percentage = post.totalVotes > 0 ? Math.round((option.votes / post.totalVotes) * 100) : 0;
          const hasVoted = option.voters && option.voters.includes(userId);
          
          return `
            <div class="poll-option cursor-pointer p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${hasVoted ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900' : ''}" 
                 data-post-id="${post._id}" 
                 data-option="${index}" 
                 data-allow-multiple="${post.allowMultiple}">
              <div class="flex items-center justify-between mb-2">
                <span class="text-gray-900 dark:text-white font-medium">${escapeHtml(option.text)}</span>
                <span class="text-sm text-gray-500 dark:text-gray-400 option-votes">${option.votes} vote${option.votes !== 1 ? 's' : ''}</span>
              </div>
              <div class="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div class="bg-blue-500 h-2 rounded-full poll-results transition-all duration-1000" style="width: ${percentage}%"></div>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${percentage}%</div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        Total votes: <span class="total-votes font-semibold">${post.totalVotes}</span>
        ${post.allowMultiple ? ' • Multiple selections allowed' : ''}
      </div>
    </div>
  `;
}

// Fixed Poll Voting - Send votes to backend
async function handlePollVote(event) {
  const option = event.currentTarget;
  const postId = option.dataset.postId;
  const optionIndex = parseInt(option.dataset.option);
  
  // Prevent multiple rapid clicks
  if (option.classList.contains('voting')) return;
  option.classList.add('voting');
  
  try {
    const response = await fetch(`/api/posts/${postId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionIndex })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to vote');
    }

    const data = await response.json();
    
    // Update the specific poll with new data
    updatePollUI(postId, data.post);
    
    // Show success feedback
    showVoteSuccess(option);
    showAlert('Vote recorded successfully!', 'success');
    
  } catch (error) {
    console.error('Vote error:', error);
    showAlert(`Failed to vote: ${error.message}`, 'error');
  } finally {
    option.classList.remove('voting');
  }
}

// Update poll UI with new vote data
function updatePollUI(postId, pollData) {
  const pollContainer = document.getElementById(`poll-${postId}`);
  if (!pollContainer) return;
  
  const options = pollContainer.querySelectorAll('.poll-option');
  const totalVotesSpan = pollContainer.parentElement.querySelector('.total-votes');
  const userId = getUserIdForVoting();
  
  // Update vote counts and percentages
  pollData.options.forEach((optionData, index) => {
    const optionElement = options[index];
    if (!optionElement) return;
    
    const votesSpan = optionElement.querySelector('.option-votes');
    const progressBar = optionElement.querySelector('.poll-results');
    const percentageDiv = optionElement.querySelector('.text-xs');
    
    // Calculate percentage
    const percentage = pollData.totalVotes > 0 ? 
      Math.round((optionData.votes / pollData.totalVotes) * 100) : 0;
    
    // Update vote count
    votesSpan.textContent = `${optionData.votes} vote${optionData.votes !== 1 ? 's' : ''}`;
    
    // Update progress bar
    progressBar.style.width = `${percentage}%`;
    
    // Update percentage text
    percentageDiv.textContent = `${percentage}%`;
    
    // Highlight user's selection
    if (optionData.voters && optionData.voters.includes(userId)) {
      optionElement.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900');
    } else {
      optionElement.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900');
    }
  });
  
  // Update total votes
  if (totalVotesSpan) {
    totalVotesSpan.textContent = pollData.totalVotes;
  }
}

// Show visual feedback for successful vote
function showVoteSuccess(optionElement) {
  const originalClasses = optionElement.className;
  optionElement.classList.add('bg-green-100', 'dark:bg-green-900', 'border-green-500');
  
  setTimeout(() => {
    optionElement.className = originalClasses;
  }, 1000);
}

// Like functionality
async function handleLike(event) {
  const button = event.currentTarget;
  const postId = button.getAttribute("data-post-id");
  const liked = button.getAttribute("data-liked") === "true";
  const likeCountElement = button.querySelector(".like-count");
  const heartIcon = button.querySelector("svg");
  
  try {
    const response = await fetch(`/api/posts/${postId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liked: !liked })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update like");
    }
    
    const data = await response.json();
    
    // Update UI with server response
    likeCountElement.innerText = data.likes;
    button.setAttribute("data-liked", data.liked.toString());
    
    if (data.liked) {
      heartIcon.classList.add("text-red-500");
      heartIcon.classList.remove("text-gray-500", "dark:text-gray-400");
      likeCountElement.classList.add("text-red-500");
      likeCountElement.classList.remove("text-gray-500", "dark:text-gray-400");
      heartIcon.setAttribute("fill", "currentColor");
    } else {
      heartIcon.classList.remove("text-red-500");
      heartIcon.classList.add("text-gray-500", "dark:text-gray-400");
      likeCountElement.classList.remove("text-red-500");
      likeCountElement.classList.add("text-gray-500", "dark:text-gray-400");
      heartIcon.setAttribute("fill", "none");
    }
    
  } catch (error) {
    console.error("Like toggle error:", error);
    showAlert("Failed to update like", 'error');
  }
}

// Comments functionality
function toggleCommentSection(postId) {
  const section = document.getElementById(`commentSection-${postId}`);
  if (!section) return;
  
  section.classList.toggle('hidden');
  if (!section.classList.contains('hidden')) {
    fetchComments(postId);
    // Focus on comment input
    const commentInput = document.getElementById(`commentInput-${postId}`);
    if (commentInput) {
      setTimeout(() => commentInput.focus(), 100);
    }
  }
}

async function submitComment(postId) {
  const commentInput = document.getElementById(`commentInput-${postId}`);
  if (!commentInput) return;
  
  const comment = commentInput.value.trim();
  if (!comment) {
    showAlert('Comment cannot be empty!', 'warning');
    return;
  }
  
  try {
    const response = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add comment');
    }
    
    const result = await response.json();
    
    // Add comment to UI
    const commentsContainer = document.getElementById(`commentsContainer-${postId}`);
    if (commentsContainer) {
      const newCommentElement = document.createElement("div");
      newCommentElement.className = "p-3 bg-gray-50 dark:bg-gray-700 rounded-lg animate-fade-in";
      newCommentElement.innerHTML = `
        <div class="flex items-start space-x-2">
          <i class="fa-regular fa-comment text-blue-500 mt-1"></i>
          <div class="flex-1">
            <p class="text-gray-900 dark:text-white">${escapeHtml(comment)}</p>
            <span class="text-xs text-gray-500 dark:text-gray-400">just now</span>
          </div>
        </div>
      `;
      commentsContainer.prepend(newCommentElement);
    }
    
    // Update comment count
    const commentCountElement = document.querySelector(`[onclick="toggleCommentSection('${postId}')"] .comment-count`);
    if (commentCountElement) {
      const currentCount = parseInt(commentCountElement.textContent) || 0;
      commentCountElement.textContent = currentCount + 1;
    }
    
    commentInput.value = '';
    showAlert('Comment posted successfully!', 'success');
    
  } catch (error) {
    console.error('Error submitting comment:', error);
    showAlert(`Failed to add comment: ${error.message}`, 'error');
  }
}

async function fetchComments(postId) {
  try {
    const response = await fetch(`/api/posts/${postId}/comments`);
    if (!response.ok) throw new Error('Failed to fetch comments');
    
    const comments = await response.json();
    const commentsContainer = document.getElementById(`commentsContainer-${postId}`);
    if (!commentsContainer) return;
    
    commentsContainer.innerHTML = "";
    comments.forEach(function(comment) {
      const commentElement = document.createElement("div");
      commentElement.className = "p-3 bg-gray-50 dark:bg-gray-700 rounded-lg";
      commentElement.innerHTML = `
        <div class="flex items-start space-x-2">
          <i class="fa-regular fa-comment text-blue-500 mt-1"></i>
          <div class="flex-1">
            <p class="text-gray-900 dark:text-white">${escapeHtml(comment.content)}</p>
            <span class="text-xs text-gray-500 dark:text-gray-400">${getDetailedTimeAgo(comment.createdAt)}</span>
          </div>
        </div>
      `;
      commentsContainer.appendChild(commentElement);
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
  }
}

// Enhanced Time Display Functions
function getDetailedTimeAgo(dateString) {
  if (!dateString) return 'just now';
  
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 2592000) { // 30 days
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 31536000) { // 365 days
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  }
  
  const years = Math.floor(diffInSeconds / 31536000);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

function openImageModal(imageUrl) {
  window.open(imageUrl, '_blank');
}

// BOTTOM ALERT SYSTEM ONLY - No Top Notifications
function showAlert(message, type = 'info') {
  // Remove existing alerts
  const existingAlerts = document.querySelectorAll('.alert-message');
  existingAlerts.forEach(alert => alert.remove());
  
  const alert = document.createElement('div');
  alert.className = `alert-message fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg max-w-md animate-slide-up ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    type === 'warning' ? 'bg-yellow-500 text-black' :
    'bg-blue-500 text-white'
  }`;
  
  alert.innerHTML = `
    <div class="flex items-center space-x-2">
      <i class="fas ${
        type === 'success' ? 'fa-check-circle' :
        type === 'error' ? 'fa-times-circle' :
        type === 'warning' ? 'fa-exclamation-triangle' :
        'fa-info-circle'
      }"></i>
      <span class="font-medium">${message}</span>
    </div>
  `;
  
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.remove();
  }, 4000);
}

// Utility Functions
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Background and Banner Loading
async function loadBackground() {
  try {
    const bgResponse = await fetch(`/api/background?ts=${Date.now()}`);
    if (!bgResponse.ok) throw new Error("Failed to fetch background image.");
    
    const bgData = await bgResponse.json();
    if (bgData.imageUrl) {
      document.body.style.backgroundImage = `linear-gradient(135deg, rgba(249, 250, 251, 0.9), rgba(243, 244, 246, 0.9)), url(${bgData.imageUrl}?ts=${Date.now()})`;
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundPosition = 'center center';
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundAttachment = 'fixed';
    }
  } catch (error) {
    console.error("Error loading background image:", error.message);
  }
}

/**
 * Fetch banner data from /api/banner and toggle the UI.
 * Expected server payload: { imageUrl: string | null, linkUrl?: string }
 */
async function loadBanner() {
  try {
    const res = await fetch('/api/banner');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const { imageUrl, linkUrl } = await res.json();

    const bannerImage       = document.getElementById('bannerImage');
    const bannerPlaceholder = document.getElementById('bannerPlaceholder');
    const bannerLinkWrapper = document.getElementById('bannerLinkWrapper');

    if (imageUrl) {
      // preload image for smooth fade-in
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        bannerImage.src = imageUrl;
        bannerLinkWrapper.href = linkUrl || "#";

        bannerImage.classList.remove("hidden");
        requestAnimationFrame(() => {
          bannerImage.classList.remove("opacity-0");
        });

        bannerPlaceholder.style.display = "none";
      };
    } else {
      // no banner - show placeholder
      bannerImage.classList.add("hidden");
      bannerPlaceholder.style.display = "flex";
      bannerLinkWrapper.href = "#";
    }
  } catch (err) {
    console.error("Error loading banner:", err);
    document.getElementById("bannerImage").classList.add("hidden");
    document.getElementById("bannerPlaceholder").style.display = "flex";
  }
}

document.addEventListener("DOMContentLoaded", loadBanner);

// Tab Management
function showTab(tabId) {
  document.querySelectorAll(".tab-section").forEach(function(section) {
    section.classList.add("hidden");
  });
  document.getElementById(tabId)?.classList.remove("hidden");
  document.getElementById("createPost")?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function removeImage() {
  selectedImage = null;
  document.getElementById('imagePreview').innerHTML = '';
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 UniSphere initialized');
  
  // Initialize all components
  initTheme();
  initPostTypeToggle();
  initPollFunctions();
  loadBackground();
  loadBanner();
  
  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // About section handlers
  const openAbout = document.getElementById("openAbout");
  const closeAbout = document.getElementById("closeAbout");
  const aboutSection = document.getElementById("aboutSection");
  
  if (openAbout && aboutSection) {
    openAbout.addEventListener("click", function() {
      aboutSection.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    });
  }
  
  if (closeAbout && aboutSection) {
    closeAbout.addEventListener("click", function() {
      aboutSection.classList.add("hidden");
      document.body.style.overflow = "auto";
    });
  }
  
  // Create post functionality
  const createPostBackBtn = document.getElementById("createPostBackButton");
  const createPost = document.getElementById("createPost");
  const add = document.getElementById("add");
  
  if (createPostBackBtn) {
    createPostBackBtn.addEventListener("click", function() {
      createPost?.classList.add("hidden");
      add?.classList.add("hidden");
      document.body.style.overflow = "auto";
    });
  }
  
  // Image upload functionality
  const imageUploadBtn = document.getElementById('imageUploadButton');
  const imageInput = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');
  
  if (imageUploadBtn && imageInput) {
    imageUploadBtn.addEventListener('click', function() {
      imageInput.click();
    });
  }
  
  if (imageInput && imagePreview) {
    imageInput.addEventListener('change', async function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        showAlert('Please select an image file', 'warning');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showAlert('Image size must be less than 5MB', 'warning');
        return;
      }
      
      try {
        const formData = new FormData();
        formData.append('image', file);
        
        showAlert('Uploading image, please wait...', 'info');
        
        const response = await fetch('/api/upload/post', {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        if (response.ok) {
          selectedImage = result.imageUrl;
          imagePreview.innerHTML = `
            <div class="relative mt-2" style="padding-top: 56.25%">
              <img src="${result.imageUrl}" 
                   class="absolute top-0 left-0 w-full h-full object-cover rounded-lg"
                   alt="Preview"/>
              <button onclick="removeImage()" class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors">
                ×
              </button>
            </div>
          `;
          showAlert('Image uploaded successfully!', 'success');
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error('Image upload failed:', error);
        showAlert(`Image upload failed: ${error.message}`, 'error');
      }
    });
  }
  
  // Submit post functionality
  const submitPostButton = document.getElementById('submitPostButton');
  if (submitPostButton) {
    submitPostButton.addEventListener('click', function() {
      if (currentPostType === 'poll') {
        createPollPost();
      } else {
        createTextPost();
      }
    });
  }
  
  // Close modal handlers
  document.addEventListener('click', function(e) {
    if (e.target.id === 'overlay') {
      toggleMenu();
    }
    
    if (e.target.id === 'aboutSection') {
      document.getElementById('aboutSection').classList.add('hidden');
      document.body.style.overflow = "auto";
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      // Close any open modals
      const aboutSection = document.getElementById('aboutSection');
      const createPost = document.getElementById('createPost');
      const menu = document.getElementById('mobile-menu');
      
      if (aboutSection && !aboutSection.classList.contains('hidden')) {
        aboutSection.classList.add('hidden');
        document.body.style.overflow = "auto";
      }
      
      if (createPost && !createPost.classList.contains('hidden')) {
        createPost.classList.add('hidden');
        document.getElementById('add')?.classList.add('hidden');
        document.body.style.overflow = "auto";
      }
      
      if (menu && menu.classList.contains('show')) {
        toggleMenu();
      }
    }
  });
  
  // Initial posts load
  fetchPosts();
  
  // Auto-refresh posts every 30 seconds
  setInterval(fetchPosts, 30000);
  
  console.log('✅ UniSphere fully initialized with all features');
});
