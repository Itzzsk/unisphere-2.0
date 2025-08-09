document.addEventListener("DOMContentLoaded", function () {
    const menuButton = document.getElementById("menuButton");
    const sidebar = document.getElementById("sidebar");
    const aboutButton = document.getElementById("aboutButton") || document.getElementById("openAbout");
    const aboutSection = document.getElementById("aboutSection");
    const aboutBackButton = document.getElementById("aboutBackButton") || document.getElementById("closeAbout");

    if (menuButton && sidebar) {
        menuButton.addEventListener("click", function (event) {
            event.stopPropagation();
            sidebar.classList.remove("hidden");
        });

        document.addEventListener("click", function (event) {
            if (!sidebar.contains(event.target) && !menuButton.contains(event.target)) {
                sidebar.classList.add("hidden");
            }
        });

        sidebar.addEventListener("click", function (event) {
            event.stopPropagation();
        });
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.add("hidden");
    }

    if (aboutButton && aboutSection) {
        aboutButton.addEventListener("click", function () {
            closeSidebar();
            aboutSection.classList.remove("hidden");
        });
    }
    if (aboutBackButton && aboutSection) {
        aboutBackButton.addEventListener("click", function () {
            aboutSection.classList.add("hidden");
        });
    }

    const adminLoginBtn = document.querySelector("button#openAdmin");
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener("click", closeSidebar);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const createPostBtn = document.getElementById('createPostButton');
    const createPostSection = document.getElementById('createPost');
    const createPostBackBtn = document.getElementById('createPostBackButton');
    const imageUploadBtn = document.getElementById('imageUploadButton');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    let selectedImage = null;

    if (createPostBtn && createPostSection) {
        createPostBtn.addEventListener('click', () => {
            createPostSection.classList.toggle('hidden');
        });
    }
    if (createPostBackBtn && createPostSection) {
        createPostBackBtn.addEventListener('click', () => {
            createPostSection.classList.add('hidden');
        });
    }
    if (imageUploadBtn && imageInput) {
        imageUploadBtn.addEventListener('click', () => {
            imageInput.click();
        });
    }
    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('image', file);
            try {
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
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Image upload failed:', error);
                alert('Image upload failed');
            }
        });
    }

    const submitPostButton = document.getElementById('submitPostButton');
    const postContentInput = document.getElementById('postContent');
    if (submitPostButton && postContentInput) {
        submitPostButton.addEventListener('click', async () => {
            const postContent = postContentInput.value.trim();
            if (!postContent && !selectedImage) {
                alert("Post must contain text or image!");
                return;
            }
            try {
                const response = await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: postContent,
                        imageUrl: selectedImage
                    })
                });
                if (response.ok) {
                    window.location.reload();
                } else {
                    alert("Error creating post");
                }
            } catch (error) {
                console.error("Post submission error:", error);
                alert("Failed to submit post");
            }
        });
    }
    fetchPosts();
});

async function fetchPosts() {
    try {
        const response = await fetch('/api/posts');
        if (!response.ok) throw new Error('Failed to fetch posts');
        const posts = await response.json();
        const postsContainer = document.getElementById('postsContainer');
        if (!postsContainer) return;
        postsContainer.innerHTML = posts.map(post => `
            <div class="rounded-2xl shadow-lg mb-4 bg-[#121B1A] p-4">
            <div class="flex items-center mb-4 space-x-2">
            <i class="fa-solid fa-user-astronaut text-black text-lg"></i>
                    <h1 class="font-poppins font-bold text-black">UniSphere</h1>
                </div>
                ${post.content ? `<p class="text-black leading-relaxed mb-4">${post.content}</p>` : ''}
                ${post.imageUrl ? `
                    <div class="relative overflow-hidden rounded-lg" style="padding-top: 56.25%">
                        <img src="${post.imageUrl}" 
                             class="absolute top-0 left-0 w-full h-full object-cover cursor-pointer" 
                             onclick="window.open('${post.imageUrl}', '_blank')"
                             alt="Post image"/>
                    </div>
                ` : ''}
                <div class="flex items-center gap-2 mt-4">
                  <button class="like-btn flex items-center group" data-post-id="${post._id}" data-liked="${!!post.liked}">
                    <svg class="w-6 h-6 transition-colors duration-200 ${post.liked ? 'text-red-500' : 'text-black'}"
                         fill="${post.liked ? 'currentColor' : 'none'}"
                         stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span class="like-count ml-1 ${post.liked ? 'text-red-500' : 'text-black'}">${post.likes || 0}</span>
                  </button>
                  <button class="flex items-center text-black hover:text-blue-500 ml-2" 
                          onclick="toggleCommentSection('${post._id}')">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z">
                      </path>
                    </svg>
                    <span class="comment-count ml-1 text-black">${post.comments?.length || 0}</span>
                  </button>
                </div>
                <div id="commentSection-${post._id}" class="hidden">
                  <input 
                    type="text" 
                    id="commentInput-${post._id}" 
                    placeholder="Write a comment..." 
                    class="border p-2 rounded w-full mt-2 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#B3FF59]"/>
                  <button onclick="submitComment('${post._id}')" 
                          class="mt-2 bg-blue-500 text-black px-4 py-2 rounded">
                    Submit
                  </button>
                  <div id="commentsContainer-${post._id}" class="mt-2 text-left"></div>
                </div>
            </div>
        `).join('');
        document.querySelectorAll('.like-btn').forEach(button => {
            button.addEventListener('click', handleLike);
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        alert('Failed to load posts. Please try again later.');
    }
}

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
        if (!response.ok) throw new Error("Failed to update like");
        let currentLikes = parseInt(likeCountElement.innerText) || 0;
        const updatedLikes = liked && currentLikes > 0 ? currentLikes - 1 : currentLikes + 1;
        likeCountElement.innerText = updatedLikes;
        button.setAttribute("data-liked", (!liked).toString());
        heartIcon.classList.toggle("text-red-500", !liked);
        heartIcon.classList.toggle("text-white", liked);
        heartIcon.setAttribute("fill", !liked ? "currentColor" : "none");
    } catch (error) {
        console.error("Like toggle error:", error);
    }
}

function toggleCommentSection(postId) {
    const section = document.getElementById(`commentSection-${postId}`);
    if (!section) return;
    section.classList.toggle('hidden');
    if (!section.classList.contains('hidden')) {
        fetchComments(postId);
    }
}

async function submitComment(postId) {
    const commentInput = document.getElementById(`commentInput-${postId}`);
    if (!commentInput) return;
    const comment = commentInput.value.trim();
    if (!comment) {
        alert('Comment cannot be empty!');
        return;
    }
    try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: comment })  
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to add comment');
        const commentsContainer = document.getElementById(`commentsContainer-${postId}`);
        if (commentsContainer) {
            const newCommentElement = document.createElement("p");
            newCommentElement.classList.add("text-black", "mt-2");
            newCommentElement.innerHTML = `<i class="fa-regular fa-comment"></i> ${comment}`;
            commentsContainer.prepend(newCommentElement);
        }
        commentInput.value = '';
    } catch (error) {
        console.error('Error submitting comment:', error);
    }
}

async function fetchComments(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/comments`);
        if (!response.ok) throw new Error('Failed to fetch comments');
        let comments = await response.json();
        const commentsContainer = document.getElementById(`commentsContainer-${postId}`);
        if (!commentsContainer) return;
        commentsContainer.innerHTML = "";
        comments.reverse().forEach(comment => {
            const commentElement = document.createElement("p");
            commentElement.classList.add("text-black", "mt-2");
            commentElement.innerHTML = `<i class="fa-regular fa-comment"></i> ${comment.content}`;
            commentsContainer.appendChild(commentElement);
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
    }
}
document.addEventListener("DOMContentLoaded", async function () {
    try {
        const bgResponse = await fetch(`/api/background?ts=${Date.now()}`);
        if (!bgResponse.ok) throw new Error("Failed to fetch background image.");
        const bgData = await bgResponse.json();
        if (bgData.imageUrl) {
            // Use ?ts=... to bypass cache after new uploads
            document.body.style.backgroundImage = `url(${bgData.imageUrl}?ts=${Date.now()})`;
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundPosition = 'center center';
            document.body.style.backgroundSize = 'contain'; // 'fit' the image, no crop
        } else {
            document.body.style.backgroundImage = '';
        }
    } catch (error) {
        console.error("Error loading background image:", error.message);
    }
});
