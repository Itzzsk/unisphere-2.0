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
  const textNode = themeToggle.childNodes[2];
  
  if (icon) {
    icon.className = isDark ? 'fa-solid fa-sun w-6 text-xl' : 'fa-solid fa-moon w-6 text-xl';
  }
  
  if (textNode && textNode.nodeType === Node.TEXT_NODE) {
    textNode.textContent = isDark ? ' Light Mode' : ' Dark Mode';
  }
}

// Enhanced Menu Functions
function toggleMenu() {
  const menu = document.getElementById("mobile-menu");
  const overlay = document.getElementById("overlay");
  const hamburger = document.querySelector(".hamburger-menu");
  
  if (!menu || !overlay) return;
  
  const isOpen = menu.classList.contains("translate-x-0");
  
  if (isOpen) {
    menu.classList.remove("translate-x-0");
    menu.classList.add("translate-x-full");
    overlay.classList.remove("opacity-100", "visible");
    overlay.classList.add("opacity-0", "invisible");
    hamburger?.classList.remove("hamburger-active");
    hamburger?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "auto";
    
    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach(item => {
      item.classList.remove("opacity-100", "translate-x-0");
      item.classList.add("opacity-0", "translate-x-8");
    });
  } else {
    menu.classList.remove("translate-x-full");
    menu.classList.add("translate-x-0");
    overlay.classList.remove("opacity-0", "invisible");
    overlay.classList.add("opacity-100", "visible");
    hamburger?.classList.add("hamburger-active");
    hamburger?.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    
    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach(item => {
      item.classList.remove("opacity-0", "translate-x-8");
      item.classList.add("opacity-100", "translate-x-0");
    });
  }
}

// Enhanced Post Type Management
function initPostTypeToggle() {
  const textToggle = document.getElementById('textPostToggle');
  const pollToggle = document.getElementById('pollPostToggle');
  
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
  
  textToggle.className = 'tab-button flex-1 px-6 py-3 rounded-lg font-semibold bg-blue-500 text-white shadow-md -translate-y-0.5';
  pollToggle.className = 'tab-button flex-1 px-6 py-3 rounded-lg font-semibold bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500';
  
  if (textSection && pollSection) {
    textSection.classList.remove('opacity-0', 'translate-y-2', 'pointer-events-none', 'absolute', 'top-0', 'left-0', 'right-0');
    textSection.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto', 'relative');
    
    pollSection.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto', 'relative');
    pollSection.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none', 'absolute', 'top-0', 'left-0', 'right-0');
  }
  
  textToggle.setAttribute('aria-selected', 'true');
  pollToggle.setAttribute('aria-selected', 'false');
}

function switchToPollPost() {
  currentPostType = 'poll';
  const textToggle = document.getElementById('textPostToggle');
  const pollToggle = document.getElementById('pollPostToggle');
  const textSection = document.getElementById('textPostSection');
  const pollSection = document.getElementById('pollSection');
  
  pollToggle.className = 'tab-button flex-1 px-6 py-3 rounded-lg font-semibold bg-blue-500 text-white shadow-md -translate-y-0.5';
  textToggle.className = 'tab-button flex-1 px-6 py-3 rounded-lg font-semibold bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500';
  
  if (textSection && pollSection) {
    pollSection.classList.remove('opacity-0', 'translate-y-2', 'pointer-events-none', 'absolute', 'top-0', 'left-0', 'right-0');
    pollSection.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto', 'relative');
    
    textSection.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto', 'relative');
    textSection.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none', 'absolute', 'top-0', 'left-0', 'right-0');
  }
  
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
      optionDiv.className = 'poll-option-input flex items-center space-x-3';
      optionDiv.innerHTML = `
        <input type="text" class="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-blue-500 focus:-translate-y-0.5 focus:shadow-md transition-all duration-300" placeholder="Option ${optionCount + 1}" maxlength="100" />
        <button class="text-red-500 hover:text-red-600 p-2 remove-option transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-110">
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

// User ID Management
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
    submitButton.disabled = true;
    originalText.classList.add('hidden');
    spinner.classList.remove('hidden');
    
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });
    
    if (response.ok) {
      if (postData.type === 'text') {
        document.getElementById('postContent').value = '';
        selectedImage = null;
        document.getElementById('imagePreview').innerHTML = '';
      } else {
        document.getElementById('pollQuestion').value = '';
        document.querySelectorAll('#pollOptions input').forEach(input => input.value = '');
        document.getElementById('allowMultiple').checked = false;
      }
      
      document.getElementById("createPost").classList.add("hidden");
      document.getElementById("add").classList.add("hidden");
      document.body.style.overflow = "auto";
      
      fetchPosts();
      showAlert('Your post has been shared anonymously!', 'success');
    } else {
      const error = await response.json();
      showAlert(`Error creating post: ${error.message}`, 'error');
    }
  } catch (error) {
    console.error("Post submission error:", error);
    showAlert("Failed to submit post. Please check your connection.", 'error');
  } finally {
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
    
    addPostEventListeners();
    addReadMore('.caption-text');
    
  } catch (error) {
    console.error('Error fetching posts:', error);
    showErrorState();
  }
}

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

function addPostEventListeners() {
  document.querySelectorAll('.like-btn').forEach(function(button) {
    button.addEventListener('click', handleLike);
  });
  
  document.querySelectorAll('.poll-option').forEach(function(option) {
    option.addEventListener('click', handlePollVote);
  });
}

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
      ${post.content ? `<p class="text-gray-900 dark:text-white leading-relaxed mb-4 caption-text">${escapeHtml(post.content)}</p>` : ''}
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

// UPDATED: Compact Poll HTML with Proper Single/Multiple Logic
function createPollHTML(post) {
  const userVotes = JSON.parse(localStorage.getItem(`poll_${post._id}_votes`)) || [];
  const hasVoted = localStorage.getItem(`poll_${post._id}_voted`) === 'true';
  
  return `
    <div class="rounded-xl shadow-md mb-6 bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300 hover:shadow-lg max-w-md mx-auto">
      <div class="flex items-center mb-3 space-x-2">
        <div class="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <i class="fas fa-poll text-white text-xs"></i>
        </div>
        <div class="flex-1">
          <h1 class="font-poppins text-gray-900 dark:text-white font-medium text-sm">Anonymous Poll</h1>
          <span class="text-gray-500 dark:text-gray-400 text-xs">${getDetailedTimeAgo(post.createdAt)}</span>
        </div>
      </div>
      <h3 class="font-medium text-sm text-gray-900 dark:text-white mb-3 caption-text">${escapeHtml(post.question)}</h3>
      
      <!-- VOTING INSTRUCTIONS -->
      ${!hasVoted ? (post.allowMultiple ? `
        <div class="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p class="text-xs text-blue-700 dark:text-blue-300 font-medium">
            <i class="fas fa-hand-pointer mr-1"></i>
            Multiple Choice: Select exactly 2 options, then vote
          </p>
        </div>
      ` : `
        <div class="mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <p class="text-xs text-gray-600 dark:text-gray-400 font-medium">
            <i class="fas fa-mouse-pointer mr-1"></i>
            Single Choice: Click one option to vote immediately
          </p>
        </div>
      `) : `
        <div class="mb-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p class="text-xs text-green-700 dark:text-green-300 font-medium">
            <i class="fas fa-check-circle mr-1"></i>
            You voted! (${post.allowMultiple ? 'Multi' : 'Single'} choice - ${userVotes.length} selected)
          </p>
        </div>
      `}
      
      <!-- COMPACT OPTIONS -->
      <div class="space-y-2 mb-3" id="poll-${post._id}">
        ${post.options.map(function(option, index) {
          const percentage = option.percentage || 0;
          const isWinning = percentage > 0 && percentage === Math.max(...post.options.map(o => o.percentage || 0));
          const isSelected = userVotes.includes(index);
          const isDisabled = hasVoted;
          
          return `
            <div class="poll-option ${isDisabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'} p-2 border border-gray-200 dark:border-gray-600 rounded-lg ${!isDisabled ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : ''} transition-all duration-300 ${!isDisabled ? 'transform hover:-translate-y-0.5 hover:shadow-sm' : ''} ${isSelected ? (hasVoted ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900' : 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900') : ''}" 
                 data-post-id="${post._id}" 
                 data-option="${index}" 
                 data-allow-multiple="${post.allowMultiple}"
                 ${isDisabled ? 'style="pointer-events: none;"' : ''}>
              <div class="flex items-center justify-between mb-1">
                <span class="text-gray-900 dark:text-white font-medium flex items-center text-xs">
                  ${hasVoted && isSelected ? '<i class="fas fa-check-circle text-green-500 mr-1 text-xs" title="Your vote"></i>' : 
                    (post.allowMultiple ? 
                      (isSelected ? '<i class="fas fa-check-square text-blue-500 mr-1 text-xs" title="Selected"></i>' : 
                       '<i class="far fa-square text-gray-400 mr-1 text-xs" title="Click to select"></i>') :
                      (isSelected ? '<i class="fas fa-dot-circle text-blue-500 mr-1 text-xs" title="Your vote"></i>' : 
                       '<i class="far fa-circle text-gray-400 mr-1 text-xs" title="Click to vote"></i>')
                    )
                  }
                  ${isWinning && percentage > 0 ? '<i class="fas fa-crown text-yellow-500 mr-1 text-xs" title="Leading"></i>' : ''}
                  ${escapeHtml(option.text)}
                </span>
                <div class="text-right">
                  <span class="text-xs font-medium ${isWinning ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} option-votes">${option.votes}</span>
                </div>
              </div>
              <div class="mb-1">
                <div class="bg-gray-200 dark:bg-gray-600 rounded-full h-1 overflow-hidden">
                  <div class="poll-results h-1 rounded-full transition-all duration-1000 ease-out ${
                    isWinning ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-blue-500'
                  }" style="width: ${percentage}%"></div>
                </div>
              </div>
              <div class="flex justify-between items-center">
                <div class="text-xs font-bold ${isWinning ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}">${percentage}%</div>
                ${isWinning && percentage > 0 ? '<span class="text-xs text-yellow-600 dark:text-yellow-400 font-medium">🏆</span>' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      
      <!-- VOTE BUTTON FOR MULTIPLE CHOICE ONLY -->
      ${post.allowMultiple && !hasVoted ? `
        <div class="mb-3">
          <button id="voteButton-${post._id}" onclick="submitMultipleVote('${post._id}')" 
                  class="w-full bg-gray-400 cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium text-sm transition-colors"
                  disabled>
            <i class="fas fa-vote-yea mr-2"></i>Vote (Select exactly 2 options)
          </button>
        </div>
      ` : ''}
      
      <!-- COMPACT FOOTER -->
      <div class="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-blue-900/20 rounded-lg p-2 border border-gray-200 dark:border-blue-800">
        <div class="flex items-center justify-between">
          <span class="font-medium">Votes: <span class="total-votes text-blue-600 dark:text-blue-400">${post.totalVotes || 0}</span></span>
          <div class="flex items-center space-x-2">
            ${post.allowMultiple ? '<span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 py-0.5 rounded">Multi (2)</span>' : '<span class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1 py-0.5 rounded">Single</span>'}
            <span class="text-xs"><i class="fas fa-shield-alt mr-1"></i>1 vote/IP</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// FIXED: Enhanced Poll Voting - Single Vote for Single, Multi Vote for Multi
async function handlePollVote(event) {
  const option = event.currentTarget;
  const postId = option.dataset.postId;
  const optionIndex = parseInt(option.dataset.option);
  const allowMultiple = option.dataset.allowMultiple === 'true';
  
  if (option.classList.contains('voting')) return;
  
  // Check if already voted
  const hasVoted = localStorage.getItem(`poll_${postId}_voted`) === 'true';
  if (hasVoted) {
    showAlert('You have already voted in this poll!', 'warning');
    return;
  }
  
  option.classList.add('voting');
  
  try {
    if (allowMultiple) {
      // MULTIPLE CHOICE: Handle selection (exactly 2 required for final submission)
      const pollContainer = document.getElementById(`poll-${postId}`);
      const allOptions = pollContainer.querySelectorAll('.poll-option');
      let selectedOptions = [];
      
      // Get currently selected options from UI state
      allOptions.forEach((opt, idx) => {
        if (opt.classList.contains('ring-2') && opt.classList.contains('ring-blue-500')) {
          selectedOptions.push(idx);
        }
      });
      
      console.log('Multi-choice - Current selections before toggle:', selectedOptions);
      
      // Toggle current option
      const isCurrentlySelected = selectedOptions.includes(optionIndex);
      
      if (isCurrentlySelected) {
        // Deselect this option
        selectedOptions = selectedOptions.filter(idx => idx !== optionIndex);
        option.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900');
        
        // Update icon to unselected
        const icon = option.querySelector('.fa-check-square');
        if (icon) {
          icon.classList.remove('fa-check-square', 'text-blue-500');
          icon.classList.add('fa-square', 'text-gray-400');
          icon.title = 'Click to select';
        }
      } else {
        // Select this option (but check limit)
        if (selectedOptions.length >= 2) {
          showAlert('You can only select up to 2 options! Deselect one first.', 'warning');
          option.classList.remove('voting');
          return;
        }
        
        selectedOptions.push(optionIndex);
        option.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900');
        
        // Update icon to selected
        const icon = option.querySelector('.fa-square');
        if (icon) {
          icon.classList.remove('fa-square', 'text-gray-400');
          icon.classList.add('fa-check-square', 'text-blue-500');
          icon.title = 'Selected';
        }
      }
      
      console.log('Multi-choice - Selections after toggle:', selectedOptions);
      
      // Update vote button state
      const voteButton = document.getElementById(`voteButton-${postId}`);
      if (voteButton) {
        if (selectedOptions.length === 2) {
          voteButton.disabled = false;
          voteButton.innerHTML = '<i class="fas fa-vote-yea mr-2"></i>Vote Now (2 options selected)';
          voteButton.classList.remove('bg-gray-400', 'cursor-not-allowed');
          voteButton.classList.add('bg-blue-500', 'hover:bg-blue-600', 'cursor-pointer');
        } else {
          voteButton.disabled = true;
          voteButton.innerHTML = `<i class="fas fa-vote-yea mr-2"></i>Vote (Select ${2 - selectedOptions.length} more)`;
          voteButton.classList.remove('bg-blue-500', 'hover:bg-blue-600', 'cursor-pointer');
          voteButton.classList.add('bg-gray-400', 'cursor-not-allowed');
        }
      }
      
      option.classList.remove('voting');
      return; // Don't vote yet - wait for vote button click
      
    } else {
      // SINGLE CHOICE: Vote immediately
      console.log('Single-choice - Voting for option:', optionIndex);
      
      const response = await fetch(`/api/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          optionIndex: optionIndex,  // Send single index for single choice
          allowMultiple: false
        })
      });

      console.log('Single-choice - Vote response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Single vote request failed:', errorData);
        
        if (errorData.alreadyVoted) {
          showAlert('You have already voted in this poll!', 'warning');
          localStorage.setItem(`poll_${postId}_voted`, 'true');
          disablePoll(postId);
          return;
        }
        
        throw new Error(errorData.message || `Vote failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Single vote successful:', data);
      
      // Mark as voted and save selection
      localStorage.setItem(`poll_${postId}_voted`, 'true');
      localStorage.setItem(`poll_${postId}_votes`, JSON.stringify([optionIndex]));
      
      // Update UI and disable poll
      updatePollUIWithPercentages(postId, data.post);
      disablePoll(postId);
      
      showAlert('✅ Vote recorded successfully!', 'success');
    }
    
  } catch (error) {
    console.error('❌ Vote error details:', error);
    showAlert(`❌ Failed to vote: ${error.message}`, 'error');
  } finally {
    option.classList.remove('voting');
  }
}

// Submit Multiple Choice Vote (exactly 2 options)
async function submitMultipleVote(postId) {
  const voteButton = document.getElementById(`voteButton-${postId}`);
  if (!voteButton || voteButton.disabled) return;
  
  try {
    voteButton.disabled = true;
    voteButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
    
    // Get selected options
    const pollContainer = document.getElementById(`poll-${postId}`);
    const allOptions = pollContainer.querySelectorAll('.poll-option');
    let selectedOptions = [];
    
    allOptions.forEach((opt, idx) => {
      if (opt.classList.contains('ring-2') && opt.classList.contains('ring-blue-500')) {
        selectedOptions.push(idx);
      }
    });
    
    console.log('Multi-choice - Submitting vote for options:', selectedOptions);
    
    // Validate exactly 2 options
    if (selectedOptions.length !== 2) {
      showAlert('Please select exactly 2 options!', 'warning');
      voteButton.disabled = false;
      voteButton.innerHTML = '<i class="fas fa-vote-yea mr-2"></i>Vote (Select exactly 2 options)';
      return;
    }
    
    const response = await fetch(`/api/posts/${postId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        optionIndexes: selectedOptions,  // Send array for multiple choice
        allowMultiple: true
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      if (data.alreadyVoted) {
        showAlert('You have already voted in this poll!', 'warning');
        localStorage.setItem(`poll_${postId}_voted`, 'true');
      } else {
        throw new Error(data.message || 'Failed to vote');
      }
      return;
    }
    
    console.log('✅ Multiple vote successful:', data);
    
    // Mark as voted and save selections
    localStorage.setItem(`poll_${postId}_voted`, 'true');
    localStorage.setItem(`poll_${postId}_votes`, JSON.stringify(selectedOptions));
    
    // Update UI and disable poll
    updatePollUIWithPercentages(postId, data.post);
    disablePoll(postId);
    
    // Hide vote button
    voteButton.style.display = 'none';
    
    showAlert('✅ Vote recorded! You selected 2 options.', 'success');
    
    // Refresh to show final state
    setTimeout(() => fetchPosts(), 1000);
    
  } catch (error) {
    console.error('Multi-choice vote error:', error);
    showAlert(`❌ Failed to vote: ${error.message}`, 'error');
    
    // Reset button state
    voteButton.disabled = false;
    voteButton.innerHTML = '<i class="fas fa-vote-yea mr-2"></i>Vote Now (2 options selected)';
  }
}

// Helper function to disable poll after voting
function disablePoll(postId) {
  const pollContainer = document.getElementById(`poll-${postId}`);
  if (pollContainer) {
    pollContainer.querySelectorAll('.poll-option').forEach(opt => {
      opt.classList.remove('cursor-pointer');
      opt.classList.add('cursor-not-allowed', 'opacity-75');
      opt.style.pointerEvents = 'none';
    });
  }
}

// FIXED: Poll UI Update with Proper Percentage Display
function updatePollUIWithPercentages(postId, pollData) {
  const pollContainer = document.getElementById(`poll-${postId}`);
  if (!pollContainer) return;
  
  const options = pollContainer.querySelectorAll('.poll-option');
  const totalVotesSpan = pollContainer.parentElement.querySelector('.total-votes');
  const userVotes = JSON.parse(localStorage.getItem(`poll_${postId}_votes`)) || [];
  const hasVoted = localStorage.getItem(`poll_${postId}_voted`) === 'true';
  
  // Find the maximum percentage for highlighting winners
  const maxPercentage = Math.max(...pollData.options.map(opt => opt.percentage || 0));
  
  // Update each option with new vote data
  pollData.options.forEach((optionData, index) => {
    const optionElement = options[index];
    if (!optionElement) return;
    
    const votesSpan = optionElement.querySelector('.option-votes');
    const progressBar = optionElement.querySelector('.poll-results');
    const percentageContainer = optionElement.querySelector('.flex.justify-between.items-center:last-child');
    
    const percentage = optionData.percentage || 0;
    const isWinning = percentage > 0 && percentage === maxPercentage;
    const isUserVote = userVotes.includes(index);
    
    // Update vote count
    if (votesSpan) {
      votesSpan.textContent = optionData.votes;
      votesSpan.className = `text-xs font-medium option-votes ${isWinning ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`;
    }
    
    // Update progress bar with animation
    if (progressBar) {
      // Force a reflow to ensure smooth animation
      progressBar.style.width = '0%';
      progressBar.offsetHeight; // Trigger reflow
      
      setTimeout(() => {
        progressBar.style.width = `${percentage}%`;
      }, 50);
      
      progressBar.className = `poll-results h-1 rounded-full transition-all duration-1000 ease-out ${
        isWinning ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-blue-500'
      }`;
    }
    
    // Update option styling for voted state
    if (hasVoted && isUserVote) {
      optionElement.classList.remove('ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900');
      optionElement.classList.add('ring-2', 'ring-green-500', 'bg-green-50', 'dark:bg-green-900');
    }
    
    // Update percentage display with proper selector
    if (percentageContainer) {
      percentageContainer.innerHTML = `
        <div class="text-xs font-bold ${isWinning ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}">${percentage}%</div>
        ${isWinning && percentage > 0 ? '<span class="text-xs text-yellow-600 dark:text-yellow-400 font-medium">🏆</span>' : ''}
      `;
    }
    
    // Update option text with proper icons
    const optionText = optionElement.querySelector('span');
    if (optionText) {
      const originalText = optionData.text;
      let icons = '';
      
      if (hasVoted && isUserVote) {
        icons += '<i class="fas fa-check-circle text-green-500 mr-1 text-xs" title="Your vote"></i>';
      } else if (!hasVoted) {
        if (pollData.allowMultiple) {
          icons += isUserVote ? 
            '<i class="fas fa-check-square text-blue-500 mr-1 text-xs" title="Selected"></i>' :
            '<i class="far fa-square text-gray-400 mr-1 text-xs" title="Click to select"></i>';
        } else {
          icons += '<i class="far fa-circle text-gray-400 mr-1 text-xs" title="Click to vote"></i>';
        }
      }
      
      if (isWinning && percentage > 0) {
        icons += '<i class="fas fa-crown text-yellow-500 mr-1 text-xs" title="Leading option"></i>';
      }
      
      // Safely update the text content
      const textContent = optionText.textContent || '';
      const cleanText = textContent.replace(/^[^\w]*/, ''); // Remove leading icons/symbols
      optionText.innerHTML = `${icons}${escapeHtml(cleanText)}`;
    }
  });
  
  // Update total votes
  if (totalVotesSpan) {
    totalVotesSpan.textContent = pollData.totalVotes || 0;
  }
  
  console.log('✅ Poll UI updated with percentages:', pollData.options.map(opt => `${opt.text}: ${opt.percentage}%`));
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

// Time and utility functions
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
  if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  }
  
  const years = Math.floor(diffInSeconds / 31536000);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

function openImageModal(imageUrl) {
  window.open(imageUrl, '_blank');
}

function showAlert(message, type = 'info') {
  const existingAlerts = document.querySelectorAll('.alert-message');
  existingAlerts.forEach(alert => alert.remove());
  
  const alert = document.createElement('div');
  alert.className = `alert-message fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg max-w-md animate-slide-up ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    type === 'warning' ? 'bg-yellow-500 text-black' :
    'bg-blue-500 text-white'
  }`;
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  alert.innerHTML = `
    <div class="flex items-center space-x-2">
      <i class="fas ${icons[type] || icons.info}"></i>
      <span class="font-medium">${message}</span>
    </div>
  `;
  
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

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

function addReadMore(containerSelector, maxLines = 2) {
  const elements = document.querySelectorAll(containerSelector);
  elements.forEach(el => {
    if (el.getAttribute('data-read-more-processed')) return;
    
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    const maxHeight = lineHeight * maxLines;
    
    if (el.scrollHeight > maxHeight) {
      const originalContent = el.innerHTML;
      const originalText = el.textContent;
      
      const approxCharsPerLine = Math.floor(el.offsetWidth / 8);
      const twoLinesChars = approxCharsPerLine * 2;
      
      let truncatedText = originalText.substring(0, twoLinesChars);
      
      const lastSpaceIndex = truncatedText.lastIndexOf(' ');
      if (lastSpaceIndex > twoLinesChars * 0.8) {
        truncatedText = truncatedText.substring(0, lastSpaceIndex);
      }
      
      const truncatedHTML = `${escapeHtml(truncatedText)}... <button class="read-more-btn text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer bg-transparent border-none p-0">Read More</button>`;
      
      el.innerHTML = truncatedHTML;
      el.setAttribute('data-read-more-processed', 'true');
      el.setAttribute('data-original-content', originalContent);
      el.setAttribute('data-expanded', 'false');
      
      const readMoreBtn = el.querySelector('.read-more-btn');
      if (readMoreBtn) {
        readMoreBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const isExpanded = el.getAttribute('data-expanded') === 'true';
          
          if (isExpanded) {
            el.innerHTML = truncatedHTML;
            el.setAttribute('data-expanded', 'false');
            
            const newReadMoreBtn = el.querySelector('.read-more-btn');
            if (newReadMoreBtn) {
              newReadMoreBtn.addEventListener('click', arguments.callee);
            }
          } else {
            const expandedHTML = `${originalContent} <button class="read-less-btn text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer bg-transparent border-none p-0">Read Less</button>`;
            el.innerHTML = expandedHTML;
            el.setAttribute('data-expanded', 'true');
            
            const readLessBtn = el.querySelector('.read-less-btn');
            if (readLessBtn) {
              readLessBtn.addEventListener('click', arguments.callee);
            }
          }
        });
      }
    }
  });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 UniSphere initialized with proper single/multi poll voting');
  
  initTheme();
  initPostTypeToggle();
  initPollFunctions();
  loadBackground();
  
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
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
      
      if (!file.type.startsWith('image/')) {
        showAlert('Please select an image file', 'warning');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
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
  
  document.addEventListener('click', function(e) {
    if (e.target.id === 'overlay') {
      toggleMenu();
    }
    
    if (e.target.id === 'aboutSection') {
      document.getElementById('aboutSection').classList.add('hidden');
      document.body.style.overflow = "auto";
    }
  });
  
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
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
      
      if (menu && menu.classList.contains('translate-x-0')) {
        toggleMenu();
      }
    }
  });
  
  fetchPosts();
  setInterval(fetchPosts, 30000);
  
  console.log('✅ UniSphere fully initialized with proper single/multiple choice voting');
});
// Replace the notification system in your script section with this:
// Universal Mobile Notification System
// Complete Fixed Notification System
class SimpleNotificationSystem {
  constructor() {
    this.isEnabled = false;
    this.appName = "UniSphere";
    this.swRegistration = null;
    this.applicationServerKey = null;
    this.deviceInfo = this.detectDevice();
    this.init();
  }

  detectDevice() {
    const ua = navigator.userAgent;
    return {
      isAndroid: /Android/i.test(ua),
      isIOS: /iPad|iPhone|iPod/.test(ua),
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      browser: this.detectBrowser(ua),
      userAgent: ua
    };
  }

  detectBrowser(ua) {
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    if (/Edg/i.test(ua)) return 'Edge';
    return 'Unknown';
  }

  async init() {
    console.log('📱 UniSphere Notification System initializing...');

    // Check for deployment changes
    const lastDeployment = localStorage.getItem('unisphere_deployment');
    const currentDeployment = Date.now().toString();
    
    if (lastDeployment && lastDeployment !== currentDeployment) {
      console.log('🔄 Deployment change detected - clearing cache');
      await this.clearNotificationCache();
    }
    
    localStorage.setItem('unisphere_deployment', currentDeployment);

    // 🔧 CRITICAL: Always get fresh VAPID key from server
    try {
      const response = await fetch('/api/vapid-public-key', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch VAPID key: ${response.status}`);
      }
      
      const data = await response.json();
      this.applicationServerKey = data.publicKey;
      
      console.log('✅ VAPID public key loaded from server');
      console.log('🔑 Key preview:', this.applicationServerKey.substring(0, 20) + '...');
      
    } catch (error) {
      console.error('❌ Failed to load VAPID key:', error);
      this.showWarningMessage('⚠️ Could not connect to notification server. Please refresh the page.');
      return;
    }

    // Check if user has visited before
    const hasVisited = localStorage.getItem('unisphere_visited');
    
    if (!hasVisited) {
      // First visit - show welcome modal
      setTimeout(() => {
        this.showWelcomeModal();
      }, 3000);
      localStorage.setItem('unisphere_visited', 'true');
    } else {
      // Returning user - check notification status
      await this.handleReturningUser();
    }
  }

  // Clear notification cache for deployments
  async clearNotificationCache() {
    try {
      // Unregister old service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }
          await registration.unregister();
        }
      }
      
      // Clear notification-related localStorage
      localStorage.removeItem('unisphere_visited');
      
      console.log('🧹 Notification cache cleared for deployment');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async handleReturningUser() {
    if (Notification.permission === "granted") {
      console.log('🔍 Checking existing notification setup...');
      
      this.isEnabled = true;
      await this.registerServiceWorker();
      
      // 🔧 CRITICAL: Check if subscription needs updating
      const needsResubscription = await this.checkSubscriptionValidity();
      
      if (needsResubscription) {
        console.log('🔄 VAPID key changed - re-subscribing...');
        await this.resubscribeWithNewKey();
      } else {
        console.log('✅ Notifications working correctly');
      }
    } else if (Notification.permission === "default") {
      console.log('⏳ User can enable notifications');
    } else {
      console.log('❌ Notifications denied by user');
    }
  }

  async checkSubscriptionValidity() {
    if (!this.swRegistration) return true;

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        console.log('📋 No existing subscription found');
        return true; // Need to subscribe
      }

      // Test if current subscription works with server
      const testResponse = await fetch('/api/test-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });

      if (testResponse.ok) {
        console.log('✅ Existing subscription is valid');
        return false; // No need to resubscribe
      } else {
        console.log('⚠️ Subscription is invalid, needs update');
        return true; // Need to resubscribe
      }
      
    } catch (error) {
      console.error('Error checking subscription:', error);
      return true; // Assume needs resubscription on error
    }
  }

  async resubscribeWithNewKey() {
    try {
      // Unsubscribe old subscription
      const oldSubscription = await this.swRegistration.pushManager.getSubscription();
      if (oldSubscription) {
        await oldSubscription.unsubscribe();
        console.log('🗑️ Old subscription removed');
      }

      // Subscribe with new key
      await this.subscribeUser();
      
      this.showSuccessMessage('🔄 Notifications updated! You\'re all set with the latest settings.');
      
    } catch (error) {
      console.error('Error resubscribing:', error);
      this.showWarningMessage('⚠️ Failed to update notifications. Please refresh the page.');
    }
  }

  showWelcomeModal() {
    const modal = document.createElement('div');
    modal.id = 'welcomePermissionModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] backdrop-blur-sm p-4';
    
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-auto shadow-2xl border border-blue-200 dark:border-blue-800 animate-bounce-in">
        <div class="text-center">
          <div class="relative mb-4">
            <i class="fa-solid fa-user-astronaut text-6xl text-blue-500"></i>
          </div>
          
          <h2 class="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🚀 Welcome to UniSphere!
          </h2>
          
          <p class="text-gray-600 dark:text-gray-300 mb-6 text-sm">
            Stay connected with our anonymous community! Get notified about important updates, new features, and community milestones.
          </p>
          
          <div class="flex flex-col space-y-3">
            <button onclick="notifications.requestPermission()" class="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-600 transition-all">
              <i class="fas fa-bell mr-2"></i>
              Enable Notifications
            </button>
            <button onclick="notifications.closeWelcomeModal()" class="w-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-400 transition-colors">
              Maybe Later
            </button>
          </div>
          
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Device: ${this.deviceInfo.browser} | You can change this anytime
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        this.isEnabled = true;
        await this.registerServiceWorker();
        await this.subscribeUser();
        
        this.showSuccessMessage(`🎉 Notifications enabled for ${this.deviceInfo.browser}! You'll receive important updates.`);
      } else {
        this.showWarningMessage('ℹ️ Notifications disabled. You can enable them anytime in browser settings.');
      }
      
      this.closeWelcomeModal();
    } catch (error) {
      console.error('Error requesting permission:', error);
      this.showWarningMessage('⚠️ Error enabling notifications. Please try again.');
    }
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        // Force update service worker for deployments
        this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
          scope: '/'
        });
        
        // Force immediate update
        await this.swRegistration.update();
        
        console.log('🔧 Service Worker registered and updated');
        return this.swRegistration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
      }
    }
    return null;
  }

  async subscribeUser() {
    try {
      if (!this.swRegistration) {
        await this.registerServiceWorker();
      }

      if (!this.swRegistration) {
        throw new Error('Service worker not available');
      }

      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.applicationServerKey)
      });

      await this.sendSubscriptionToServer(subscription);
      console.log('📡 Successfully subscribed with current VAPID key');
      
    } catch (error) {
      console.error('Failed to subscribe:', error);
      throw error;
    }
  }

  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: this.deviceInfo.userAgent,
          deviceInfo: {
            browser: this.deviceInfo.browser,
            isMobile: this.deviceInfo.isMobile,
            isIOS: this.deviceInfo.isIOS,
            isAndroid: this.deviceInfo.isAndroid
          },
          timestamp: new Date().toISOString(),
          deployment: localStorage.getItem('unisphere_deployment')
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      console.log('💾 Subscription saved to server');
      
    } catch (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }
  }

  showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up';
    toast.innerHTML = `
      <div class="flex items-start space-x-3">
        <i class="fas fa-check-circle text-xl"></i>
        <div class="flex-1">
          <div class="font-bold text-sm">UniSphere</div>
          <div class="text-sm opacity-90">${message}</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  showWarningMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-orange-500 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up';
    toast.innerHTML = `
      <div class="flex items-start space-x-3">
        <i class="fas fa-info-circle text-xl"></i>
        <div class="flex-1">
          <div class="font-bold text-sm">UniSphere</div>
          <div class="text-sm opacity-90">${message}</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  closeWelcomeModal() {
    const modal = document.getElementById('welcomePermissionModal');
    if (modal) modal.remove();
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Test notification
  testNotification() {
    if (this.isEnabled && Notification.permission === 'granted') {
      new Notification(`${this.appName} - Test`, {
        body: `Mobile notification working on ${this.deviceInfo.browser}! 🚀`,
        icon: '/favicon.ico'
      });
    } else {
      alert('Please enable notifications first!');
    }
  }

  // Get status for debugging
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      permission: Notification.permission,
      hasVisited: !!localStorage.getItem('unisphere_visited'),
      swRegistered: !!this.swRegistration,
      deviceInfo: this.deviceInfo,
      vapidKeyLoaded: !!this.applicationServerKey,
      deployment: localStorage.getItem('unisphere_deployment')
    };
  }

  // Force refresh for deployment issues
  async forceRefresh() {
    console.log('🔄 Force refreshing notification system...');
    await this.clearNotificationCache();
    localStorage.removeItem('unisphere_deployment');
    window.location.reload();
  }
}

// Initialize
const notifications = new SimpleNotificationSystem();

// Global test function
function testUniSphereNotification() {
  notifications.testNotification();
}

// Global status function for debugging
function checkNotificationStatus() {
  console.log('📊 Notification Status:', notifications.getStatus());
}

// Global force refresh for deployment issues
function forceRefreshNotifications() {
  notifications.forceRefresh();
}

// Console helper
console.log('🚀 UniSphere Notification System Loaded - Production Ready');
console.log('📱 Use testUniSphereNotification() to test');
console.log('📊 Use checkNotificationStatus() to debug');
console.log('🔄 Use forceRefreshNotifications() if deployment issues occur');
