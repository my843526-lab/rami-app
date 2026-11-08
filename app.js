import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB8nvVBQ2KJ-6bir7N_gI0zaOy9j7seuh",
  authDomain: "rami-3aeed.firebaseapp.com",
  projectId: "rami-3aeed",
  storageBucket: "rami-3aeed.firebasestorage.app",
  messagingSenderId: "232735067990",
  appId: "1:232735067990:web:4274124ed00e0301c1d0f7",
  measurementId: "G-TZFRLKCQB5"
};

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "dge5sq0w";
const CLOUDINARY_UPLOAD_PRESET = "rami_mobile";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let allPosts = [];
let activeFilter = "all";
let stopPostsListener = null;
let followedUsers = new Set();
let feedObserver = null;
let currentPage = "Home";
let soundEnabled = false;

const $ = id => document.getElementById(id);

const authPanel = $("authPanel");
const accountPanel = $("accountPanel");
const authName = $("authName");
const authEmail = $("authEmail");
const authPassword = $("authPassword");
const authMessage = $("authMessage");

const welcomeUser = $("welcomeUser");
const userEmail = $("userEmail");

const postTitle = $("postTitle");
const postCategory = $("postCategory");
const postText = $("postText");
const postMessage = $("postMessage");
const postMedia = $("postMedia");
const postVideoUrl = $("postVideoUrl");

const feedList = $("feedList");
const homeFeed = $("homeFeed");
const createPanel = $("createPanel");
const discoverPanel = $("discoverPanel");
const profilePanel = $("profilePanel");

const creatorList = $("creatorList");
const profileName = $("profileName");
const profileStats = $("profileStats");
const memoryList = $("memoryList");
const memoryMessage = $("memoryMessage");

const signupButton = $("signupButton");
const loginButton = $("loginButton");
const logoutButton = $("logoutButton");
const publishButton = $("publishButton");
const saveMemoryButton = $("saveMemoryButton");
const profileButton = $("profileButton");

// HTML safety
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showMessage(element, message) {
  if (element) element.textContent = message;
}

// Page navigation and visibility
function navigateTo(page) {
  const allowedPages = [
    "Home",
    "Discover",
    "Create",
    "Memories",
    "Profile"
  ];

  if (!allowedPages.includes(page)) page = "Home";

  if (!currentUser && page !== "Home") {
    alert("Please login first.");
    page = "Home";
  }

  currentPage = page;

  document.body.classList.remove(
    "page-home",
    "page-create",
    "page-discover",
    "page-profile"
  );

  document.body.classList.add(
    page === "Home" ? "page-home" :
    page === "Create" ? "page-create" :
    page === "Discover" ? "page-discover" :
    "page-profile"
  );

  if (homeFeed) homeFeed.hidden = page !== "Home";
  if (createPanel) createPanel.hidden = page !== "Create";
  if (discoverPanel) discoverPanel.hidden = page !== "Discover";
  if (profilePanel) profilePanel.hidden =
    page !== "Memories" && page !== "Profile";

  // Account details are shown on Profile only
  if (accountPanel) {
    accountPanel.hidden = page !== "Profile" || !currentUser;
  }

  // Pause feed videos when leaving Home
  if (page !== "Home") {
    pauseAllVideos();
  } else {
    setTimeout(() => playVisibleVideo(), 100);
  }

  // Update bottom navigation
  document.querySelectorAll(
    ".bottom-nav button[data-page]"
  ).forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page ||
      (page === "Memories" && button.dataset.page === "Memories")
    );
  });

  if (page === "Discover") loadCreators();
  if (page === "Memories") loadMemories();
  if (page === "Profile") {
    loadProfile();
    updateProfileStats();
  }

  if (page === "Home" && feedList) {
    feedList.scrollTop = 0;
  }
}

function pauseAllVideos() {
  document.querySelectorAll(".feed-list video").forEach(video => {
    video.pause();
  });
}

function playVisibleVideo() {
  if (currentPage !== "Home" || !feedList) return;

  const videos = feedList.querySelectorAll("video");

  videos.forEach(video => {
    const rect = video.getBoundingClientRect();
    const visibleHeight = Math.min(rect.bottom, window.innerHeight) -
      Math.max(rect.top, 0);

    const visibleRatio = rect.height > 0
      ? visibleHeight / rect.height
      : 0;

    if (visibleRatio >= 0.65) {
      video.muted = !soundEnabled;
      video.play().catch(() => {});
    }
  });
}

// Cloudinary upload
async function uploadToCloudinary(file) {
  if (!file) return null;

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    throw new Error("Please select a photo or video.");
  }

  const maxSize = isImage
    ? 10 * 1024 * 1024
    : 50 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      isImage
        ? "Photo must be 10 MB or smaller."
        : "Video must be 50 MB or smaller."
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || "Media upload failed.");
  }

  return {
    url: result.secure_url,
    type: result.resource_type
  };
}

// Signup
signupButton?.addEventListener("click", async () => {
  const name = authName.value.trim();
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!name || !email || !password) {
    showMessage(authMessage, "Please enter your name, email and password.");
    return;
  }

  try {
    showMessage(authMessage, "Creating your Rami account...");

    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await updateProfile(result.user, { displayName: name });

    await setDoc(doc(db, "users", result.user.uid), {
      name,
      email,
      username: name,
      createdAt: serverTimestamp()
    });

    showMessage(authMessage, "Account created successfully!");
  } catch (error) {
    showMessage(authMessage, error.message);
  }
});

// Login
loginButton?.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    showMessage(authMessage, "Enter your email and password.");
    return;
  }

  try {
    showMessage(authMessage, "Logging in...");
    await signInWithEmailAndPassword(auth, email, password);
    showMessage(authMessage, "Login successful!");
  } catch (error) {
    showMessage(authMessage, error.message);
  }
});

// Logout
logoutButton?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert(error.message);
  }
});

// Authentication
onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (user) {
    if (authPanel) authPanel.hidden = true;
    if (accountPanel) accountPanel.hidden = true;

    const name = user.displayName || "Rami Creator";

    if (welcomeUser) welcomeUser.textContent = `Welcome, ${name}!`;
    if (userEmail) userEmail.textContent = user.email || "";
    if (profileName) profileName.textContent = name;

    await loadProfile();
    await loadFollowedUsers();

    listenToPosts();
    loadCreators();
    loadMemories();

    navigateTo("Home");
  } else {
    if (authPanel) authPanel.hidden = false;
    if (accountPanel) accountPanel.hidden = true;

    if (stopPostsListener) {
      stopPostsListener();
      stopPostsListener = null;
    }

    if (feedObserver) {
      feedObserver.disconnect();
      feedObserver = null;
    }

    allPosts = [];
    followedUsers.clear();
    renderPosts();
    navigateTo("Home");
  }
});

// Profile
async function loadProfile() {
  if (!currentUser) return;

  try {
    const snapshot = await getDoc(
      doc(db, "users", currentUser.uid)
    );

    if (snapshot.exists()) {
      const data = snapshot.data();

      if (profileName) {
        profileName.textContent =
          data.name || currentUser.displayName || "Rami Creator";
      }
    }
  } catch (error) {
    console.error("Profile error:", error);
  }
}

// Publish post
publishButton?.addEventListener("click", async () => {
  if (!currentUser) {
    showMessage(postMessage, "Please login first.");
    return;
  }

  const title = postTitle?.value.trim() || "";
  const text = postText?.value.trim() || "";
  const category = postCategory?.value || "Knowledge";
  const videoUrl = postVideoUrl?.value.trim() || "";
  const selectedFile = postMedia?.files?.[0];

  if (!title && !text && !videoUrl && !selectedFile) {
    showMessage(postMessage, "Write something before publishing.");
    return;
  }

  if (videoUrl && !/^https?:\/\//i.test(videoUrl)) {
    showMessage(postMessage, "Please enter a valid video URL.");
    return;
  }

  try {
    publishButton.disabled = true;

    let mediaUrl = videoUrl;
    let mediaType = videoUrl ? "video" : "";

    if (selectedFile) {
      showMessage(postMessage, "Uploading your photo/video...");

      const uploadedMedia = await uploadToCloudinary(selectedFile);

      mediaUrl = uploadedMedia.url;
      mediaType = uploadedMedia.type;
    }

    showMessage(postMessage, "Publishing your post...");

    await addDoc(collection(db, "posts"), {
      title,
      text,
      description: text,
      category,
      mediaUrl: mediaUrl || "",
      mediaType: mediaType || "",
      videoUrl: mediaType === "video" ? mediaUrl : "",
      userId: currentUser.uid,
      userName: currentUser.displayName || "Rami Creator",
      likes: 0,
      likedBy: [],
      favoriteBy: [],
      comments: [],
      createdAt: serverTimestamp()
    });

    if (postTitle) postTitle.value = "";
    if (postText) postText.value = "";
    if (postVideoUrl) postVideoUrl.value = "";
    if (postMedia) postMedia.value = "";

    showMessage(postMessage, "Your post is live on Rami! 🇵🇰");
    navigateTo("Home");

  } catch (error) {
    console.error("Publish error:", error);
    showMessage(postMessage, error.message);
  } finally {
    publishButton.disabled = false;
  }
});

// Listen to posts
function listenToPosts() {
  if (stopPostsListener) stopPostsListener();

  const postsQuery = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );

  stopPostsListener = onSnapshot(postsQuery, snapshot => {
    allPosts = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    renderPosts();
    updateProfileStats();

  }, error => {
    console.error("Posts error:", error);

    if (feedList) {
      feedList.innerHTML = `
        <div class="feed-message">
          Unable to load posts: ${escapeHTML(error.message)}
        </div>
      `;
    }
  });
}

// Render vertical video feed
function renderPosts() {
  if (!feedList) return;

  let posts = [...allPosts];

  if (activeFilter === "Following") {
    posts = posts.filter(post =>
      followedUsers.has(post.userId)
    );
  } else if (activeFilter !== "all") {
    posts = posts.filter(post =>
      post.category === activeFilter
    );
  }

  if (!posts.length) {
    const message = activeFilter === "Following"
      ? "Follow creators to see their videos here."
      : "Be the first to share your talent on Rami!";

    feedList.innerHTML = `
      <div class="rami-post empty-post">
        <div class="post-no-media">
          <div>
            <h2>Welcome to Rami 🇵🇰</h2>
            <p>${escapeHTML(message)}</p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  feedList.innerHTML = posts.map(post => {
    const likedBy = Array.isArray(post.likedBy)
      ? post.likedBy : [];

    const favoriteBy = Array.isArray(post.favoriteBy)
      ? post.favoriteBy : [];

    const comments = Array.isArray(post.comments)
      ? post.comments : [];

    const liked = currentUser &&
      likedBy.includes(currentUser.uid);

    const favorited = currentUser &&
      favoriteBy.includes(currentUser.uid);

    const isFollowing = followedUsers.has(post.userId);

    const mediaUrl = post.mediaUrl || post.videoUrl || "";
    const mediaType = post.mediaType ||
      (post.videoUrl ? "video" : "");

    let mediaHTML = "";

    if (mediaUrl && mediaType === "video") {
      mediaHTML = `
        <div class="post-media">
          <video
            src="${escapeHTML(mediaUrl)}"
            playsinline
            webkit-playsinline
            muted
            loop
            preload="metadata">
          </video>
        </div>
      `;
    } else if (mediaUrl && mediaType === "image") {
      mediaHTML = `
        <div class="post-media">
          <img
            src="${escapeHTML(mediaUrl)}"
            alt="Rami photo"
            loading="lazy">
        </div>
      `;
    } else {
      mediaHTML = `
        <div class="post-no-media">
          <div>
            <h2>${escapeHTML(post.title || "Rami")}</h2>
          </div>
        </div>
      `;
    }

    const description = post.text || post.description || "";

    return `
      <article class="rami-post" data-id="${escapeHTML(post.id)}">

        ${mediaHTML}

        <div class="post-shade"></div>

        <div class="post-info">
          <h3>@${escapeHTML(post.userName || "Rami Creator")}</h3>

          <p>${escapeHTML(post.title || description || "Welcome to Rami")}</p>

          ${post.title && description ? `
            <p>${escapeHTML(description)}</p>
          ` : ""}

          <span class="post-category">
            #${escapeHTML(post.category || "Rami")}
          </span>
        </div>

        <div class="post-actions">

          ${mediaType === "video" ? `
            <button class="sound-button" type="button"
              aria-label="Turn sound on or off">
              ${soundEnabled ? "🔊" : "🔇"}
              <small>${soundEnabled ? "Sound On" : "Sound Off"}</small>
            </button>
          ` : ""}

          <button class="follow-button ${isFollowing ? "following" : ""}"
            data-id="${escapeHTML(post.userId)}" type="button">
            👤
            <small>${isFollowing ? "Following" : "Follow"}</small>
          </button>

          <button class="like-button ${liked ? "liked" : ""}"
            data-id="${escapeHTML(post.id)}" type="button">
            ${liked ? "❤️" : "🤍"}
            <small>${Number(post.likes) || 0}</small>
          </button>

          <button class="comment-button"
            data-id="${escapeHTML(post.id)}" type="button">
            💬
            <small>${comments.length}</small>
          </button>

          <button class="favorite-button ${favorited ? "favorited" : ""}"
            data-id="${escapeHTML(post.id)}" type="button">
            ${favorited ? "⭐" : "☆"}
            <small>Save</small>
          </button>

          <button class="share-button"
            data-id="${escapeHTML(post.id)}" type="button">
            ↗
            <small>Share</small>
          </button>

        </div>

        <div class="comment-area">

          <div class="comments-list">
            ${comments.map(comment => `
              <p>
                <strong>${escapeHTML(comment.userName || "User")}:</strong>
                ${escapeHTML(comment.text || "")}
              </p>
            `).join("")}
          </div>

          <input class="comment-input"
            placeholder="Write a comment...">

          <button class="comment-send" type="button">Send</button>

        </div>

      </article>
    `;
  }).join("");

  setupVideoObserver();
}

// Video observer: play visible video and pause the others
function setupVideoObserver() {
  if (feedObserver) {
    feedObserver.disconnect();
    feedObserver = null;
  }

  if (!feedList || !("IntersectionObserver" in window)) {
    playVisibleVideo();
    return;
  }

  const videos = feedList.querySelectorAll("video");

  feedObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;

      if (
        currentPage === "Home" &&
        entry.isIntersecting &&
        entry.intersectionRatio >= 0.65
      ) {
        video.muted = !soundEnabled;

        video.play().catch(() => {
          // Browser may require a user tap before playback.
        });
      } else {
        video.pause();
      }
    });
  }, {
    root: feedList,
    threshold: [0, 0.65, 1]
  });

  videos.forEach(video => feedObserver.observe(video));
}

// Feed buttons and video controls
feedList?.addEventListener("click", event => {
  const button = event.target.closest("button");

  if (button) {
    const postId = button.dataset.id;

    if (button.classList.contains("sound-button")) {
      const article = button.closest(".rami-post");
      const video = article?.querySelector("video");

      if (!video) return;

      soundEnabled = !soundEnabled;

      // Keep other videos muted.
      feedList.querySelectorAll("video").forEach(item => {
        item.muted = true;
      });

      video.muted = !soundEnabled;

      button.innerHTML = soundEnabled
        ? "🔊<small>Sound On</small>"
        : "🔇<small>Sound Off</small>";

      if (video.paused) {
        video.play().catch(() => {});
      }

      return;
    }

    if (button.classList.contains("like-button")) {
      likePost(postId);
      return;
    }

    if (button.classList.contains("follow-button")) {
      followCreator(postId);
      return;
    }

    if (button.classList.contains("favorite-button")) {
      favoritePost(postId);
      return;
    }

    if (button.classList.contains("share-button")) {
      sharePost(postId);
      return;
    }

    if (button.classList.contains("comment-button")) {
      const article = button.closest(".rami-post");
      article?.querySelector(".comment-area")?.classList.toggle("open");
      return;
    }

    if (button.classList.contains("comment-send")) {
      const article = button.closest(".rami-post");
      const input = article?.querySelector(".comment-input");

      if (article && input) {
        addComment(article.dataset.id, input.value);
      }
      return;
    }
  }

  // Tap video to pause or play
  const video = event.target.closest("video");

  if (video) {
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }
});

// Like post
async function likePost(postId) {
  if (!currentUser) {
    alert("Please login to like posts.");
    return;
  }

  try {
    const postRef = doc(db, "posts", postId);

    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(postRef);

      if (!snapshot.exists()) return;

      const data = snapshot.data();
      const likedBy = Array.isArray(data.likedBy)
        ? data.likedBy : [];

      const alreadyLiked = likedBy.includes(currentUser.uid);

      const updatedLikes = alreadyLiked
        ? likedBy.filter(id => id !== currentUser.uid)
        : [...likedBy, currentUser.uid];

      transaction.update(postRef, {
        likedBy: updatedLikes,
        likes: updatedLikes.length
      });
    });

  } catch (error) {
    alert("Like error: " + error.message);
  }
}

// Favorite post
async function favoritePost(postId) {
  if (!currentUser) {
    alert("Please login to save posts.");
    return;
  }

  try {
    const postRef = doc(db, "posts", postId);

    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(postRef);

      if (!snapshot.exists()) return;

      const data = snapshot.data();
      const favoriteBy = Array.isArray(data.favoriteBy)
        ? data.favoriteBy : [];

      const saved = favoriteBy.includes(currentUser.uid);

      const updated = saved
        ? favoriteBy.filter(id => id !== currentUser.uid)
        : [...favoriteBy, currentUser.uid];

      transaction.update(postRef, {
        favoriteBy: updated
      });
    });

  } catch (error) {
    alert("Favorite error: " + error.message);
  }
}

// Add comment
async function addComment(postId, text) {
  if (!currentUser) {
    alert("Please login to comment.");
    return;
  }

  text = text.trim();

  if (!text) {
    alert("Write a comment first.");
    return;
  }

  try {
    const postRef = doc(db, "posts", postId);

    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(postRef);

      if (!snapshot.exists()) return;

      const data = snapshot.data();
      const comments = Array.isArray(data.comments)
        ? [...data.comments] : [];

      comments.push({
        userId: currentUser.uid,
        userName: currentUser.displayName || "Rami Creator",
        text,
        createdAt: new Date().toISOString()
      });

      transaction.update(postRef, { comments });
    });

  } catch (error) {
    alert("Comment error: " + error.message);
  }
}

// Followed users
async function loadFollowedUsers() {
  if (!currentUser) return;

  try {
    const snapshot = await getDocs(collection(db, "follows"));

    followedUsers.clear();

    snapshot.forEach(item => {
      const data = item.data();

      if (data.followerId === currentUser.uid) {
        followedUsers.add(data.followingId);
      }
    });

  } catch (error) {
    console.error("Follow loading error:", error);
  }
}

// Follow creator
async function followCreator(creatorId) {
  if (!currentUser) {
    alert("Please login to follow creators.");
    return;
  }

  if (!creatorId || creatorId === currentUser.uid) return;

  const followId = `${currentUser.uid}_${creatorId}`;
  const followRef = doc(db, "follows", followId);

  try {
    if (followedUsers.has(creatorId)) {
      alert("You are already following this creator.");
      return;
    }

    await setDoc(followRef, {
      followerId: currentUser.uid,
      followingId: creatorId,
      createdAt: serverTimestamp()
    });

    followedUsers.add(creatorId);

    renderPosts();
    loadCreators();
    updateProfileStats();

  } catch (error) {
    alert("Follow error: " + error.message);
  }
}

// Share post
async function sharePost(postId) {
  const link =
    `${location.origin}${location.pathname}#post-${postId}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Rami",
        text: "Check out this post on Rami!",
        url: link
      });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(link);
      alert("Post link copied!");
    } else {
      prompt("Copy this post link:", link);
    }
  } catch (error) {
    console.log("Share cancelled:", error);
  }
}

// Discover creators
async function loadCreators() {
  if (!currentUser || !creatorList) return;

  try {
    const snapshot = await getDocs(collection(db, "users"));

    if (snapshot.empty) {
      creatorList.textContent = "No creators yet.";
      return;
    }

    creatorList.innerHTML = snapshot.docs.map(item => {
      const data = item.data();
      const creatorId = item.id;
      const name = data.name || data.username || "Rami Creator";

      return `
        <div>
          <strong>${escapeHTML(name)}</strong>
          <p>${creatorId === currentUser.uid ? "You" : "Rami Creator"}</p>

          ${creatorId !== currentUser.uid ? `
            <button class="creator-follow" data-id="${escapeHTML(creatorId)}">
              ${followedUsers.has(creatorId) ? "Following" : "Follow"}
            </button>
          ` : ""}
        </div>
      `;
    }).join("");

    creatorList.querySelectorAll(".creator-follow").forEach(button => {
      button.addEventListener("click", () => {
        followCreator(button.dataset.id);
      });
    });

  } catch (error) {
    console.error("Creator loading error:", error);
  }
}

// Save memory
saveMemoryButton?.addEventListener("click", async () => {
  if (!currentUser) {
    showMessage(memoryMessage, "Please login first.");
    return;
  }

  const memoryText = prompt("Write your memory:");

  if (!memoryText || !memoryText.trim()) return;

  try {
    await addDoc(collection(db, "memories"), {
      userId: currentUser.uid,
      text: memoryText.trim(),
      createdAt: serverTimestamp()
    });

    showMessage(memoryMessage, "Your memory has been saved ❤️");
    loadMemories();

  } catch (error) {
    showMessage(memoryMessage, error.message);
  }
});

// Load memories
async function loadMemories() {
  if (!currentUser || !memoryList) return;

  try {
    const snapshot = await getDocs(collection(db, "memories"));

    const memories = snapshot.docs
      .map(item => ({
        id: item.id,
        ...item.data()
      }))
      .filter(item => item.userId === currentUser.uid)
      .sort((a, b) => {
        return (b.createdAt?.toMillis?.() || 0) -
               (a.createdAt?.toMillis?.() || 0);
      });

    if (!memories.length) {
      memoryList.innerHTML =
        "<p>Your saved memories will appear here.</p>";
      return;
    }

    memoryList.innerHTML = memories.map(memory => `
      <div>
        <p>${escapeHTML(memory.text)}</p>
        <small>Saved on Rami ❤️</small>
      </div>
    `).join("");

  } catch (error) {
    showMessage(memoryMessage, error.message);
  }
}

// Profile stats
function updateProfileStats() {
  if (!currentUser || !profileStats) return;

  const myPosts = allPosts.filter(
    post => post.userId === currentUser.uid
  );

  const likes = myPosts.reduce(
    (total, post) => total + (Number(post.likes) || 0),
    0
  );

  profileStats.textContent =
    `${myPosts.length} Posts · ${likes} Likes · ${followedUsers.size} Following`;
}

// Category filters
document.querySelectorAll(
  ".categories button[data-filter]"
).forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter || "all";

    document.querySelectorAll(
      ".categories button[data-filter]"
    ).forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    renderPosts();

    if (feedList) feedList.scrollTop = 0;
  });
});

// Bottom navigation
document.querySelectorAll(
  ".bottom-nav button[data-page]"
).forEach(button => {
  button.addEventListener("click", () => {
    navigateTo(button.dataset.page);
  });
});

// Search / Discover category button
document.querySelectorAll(
  ".categories button[data-page]"
).forEach(button => {
  button.addEventListener("click", () => {
    navigateTo(button.dataset.page);
  });
});

// Header Profile button
profileButton?.addEventListener("click", () => {
  navigateTo("Profile");
});

// Start on Home
navigateTo("Home");

console.log("Rami full-screen feed initialized 🇵🇰");
