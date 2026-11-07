
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
  apiKey: "AIzaSyB8nvVBQ2KJ-6bir7N_gI0zaOy9j7seuhg",
  authDomain: "rami-3aeed.firebaseapp.com",
  projectId: "rami-3aeed",
  storageBucket: "rami-3aeed.firebasestorage.app",
  messagingSenderId: "232735067990",
  appId: "1:232735067990:web:4274124ed00e0301c1d0f7",
  measurementId: "G-TZFRLKCQB5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// App state
let currentUser = null;
let allPosts = [];
let activeFilter = "all";
let stopPostsListener = null;
let followedUsers = new Set();

// HTML elements
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

// Safe HTML text
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

// Sign up
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

    await updateProfile(result.user, {
      displayName: name
    });

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

// Authentication state
onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (user) {
    authPanel.hidden = true;
    accountPanel.hidden = false;

    const name = user.displayName || "Rami Creator";

    welcomeUser.textContent = `Welcome, ${name}!`;
    userEmail.textContent = user.email || "";
    profileName.textContent = name;

    await loadProfile();
    await loadFollowedUsers();
    listenToPosts();
    loadCreators();
    loadMemories();
  } else {
    authPanel.hidden = false;
    accountPanel.hidden = true;

    if (stopPostsListener) {
      stopPostsListener();
      stopPostsListener = null;
    }

    allPosts = [];
    followedUsers.clear();

    renderPosts();
  }
});

// Load profile
async function loadProfile() {
  if (!currentUser) return;

  try {
    const userDoc = await getDoc(
      doc(db, "users", currentUser.uid)
    );

    if (userDoc.exists()) {
      const data = userDoc.data();
      profileName.textContent =
        data.name || currentUser.displayName || "Rami Creator";
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

  const title = postTitle.value.trim();
  const text = postText.value.trim();
  const category = postCategory.value;
  const videoUrl = postVideoUrl?.value.trim() || "";
  const selectedFile = postMedia?.files?.[0];

  if (!title && !text && !videoUrl && !selectedFile) {
    showMessage(postMessage, "Write something before publishing.");
    return;
  }

  if (selectedFile && !videoUrl) {
    showMessage(
      postMessage,
      "Video/photo upload is not active yet. Firebase Storage requires a billing upgrade. You can publish text or use a direct video URL."
    );
    return;
  }

  if (videoUrl && !/^https?:\/\//i.test(videoUrl)) {
    showMessage(postMessage, "Please enter a valid video URL.");
    return;
  }

  try {
    publishButton.disabled = true;
    showMessage(postMessage, "Publishing your post...");

    await addDoc(collection(db, "posts"), {
      title,
      text,
      description: text,
      category,
      videoUrl,
      userId: currentUser.uid,
      userName: currentUser.displayName || "Rami Creator",
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: serverTimestamp()
    });

    postTitle.value = "";
    postText.value = "";
    postVideoUrl.value = "";
    postMedia.value = "";

    showMessage(postMessage, "Your post is live on Rami! 🇵🇰");
  } catch (error) {
    showMessage(postMessage, error.message);
  } finally {
    publishButton.disabled = false;
  }
});

// Listen for posts
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
    feedList.textContent = "Unable to load posts: " + error.message;
  });
}

// Render feed
function renderPosts() {
  if (!feedList) return;

  let posts = [...allPosts];

  if (activeFilter !== "all") {
    posts = posts.filter(post => post.category === activeFilter);
  }

  if (posts.length === 0) {
    feedList.innerHTML =
      "<p>No posts here yet. Be the first to share something!</p>";
    return;
  }

  feedList.innerHTML = posts.map(post => {
    const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
    const comments = Array.isArray(post.comments) ? post.comments : [];

    const liked = currentUser &&
      likedBy.includes(currentUser.uid);

    const isFollowing = followedUsers.has(post.userId);

    const video = post.videoUrl
      ? `<video controls playsinline preload="metadata" src="${escapeHTML(post.videoUrl)}"></video>`
      : "";

    const date = post.createdAt?.toDate
      ? post.createdAt.toDate().toLocaleString()
      : "Just now";

    return `
      <article class="rami-post" data-id="${escapeHTML(post.id)}">
        <h3>${escapeHTML(post.title || "Rami Post")}</h3>

        <p>
          By ${escapeHTML(post.userName || "Rami Creator")}
          · ${escapeHTML(date)}
        </p>

        ${video}

        <p>${escapeHTML(post.text || post.description || "")}</p>

        <p>Category: ${escapeHTML(post.category || "General")}</p>

        <div class="post-actions">
          <button class="like-button" data-id="${escapeHTML(post.id)}">
            ${liked ? "❤️" : "🤍"} Like ${Number(post.likes) || 0}
          </button>

          <button class="comment-button" data-id="${escapeHTML(post.id)}">
            💬 Comment
          </button>

          <button class="follow-button" data-id="${escapeHTML(post.userId)}">
            ${isFollowing ? "Following" : "Follow"}
          </button>

          <button class="share-button" data-id="${escapeHTML(post.id)}">
            ↗ Share
          </button>
        </div>

        <div class="comment-area">
          <input class="comment-input" placeholder="Write a comment...">
          <div class="comments-list">
            ${comments.map(comment => `
              <p><strong>${escapeHTML(comment.userName || "User")}:</strong>
              ${escapeHTML(comment.text || "")}</p>
            `).join("")}
          </div>
        </div>
      </article>
    `;
  }).join("");

  feedList.querySelectorAll(".like-button").forEach(button => {
    button.addEventListener("click", () => likePost(button.dataset.id));
  });

  feedList.querySelectorAll(".comment-button").forEach(button => {
    button.addEventListener("click", () => {
      const article = button.closest(".rami-post");
      const input = article.querySelector(".comment-input");
      addComment(button.dataset.id, input.value);
    });
  });

  feedList.querySelectorAll(".follow-button").forEach(button => {
    button.addEventListener("click", () => followCreator(button.dataset.id));
  });

  feedList.querySelectorAll(".share-button").forEach(button => {
    button.addEventListener("click", () => sharePost(button.dataset.id));
  });
}

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
      const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
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
        ? data.comments
        : [];

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

// Load followed creators
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
  } catch (error) {
    alert("Follow error: " + error.message);
  }
}

// Share post
async function sharePost(postId) {
  const link = `${location.origin}${location.pathname}#post-${postId}`;

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
      button.addEventListener("click", () => followCreator(button.dataset.id));
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
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => item.userId === currentUser.uid)
      .sort((a, b) => {
        const first = a.createdAt?.toMillis?.() || 0;
        const second = b.createdAt?.toMillis?.() || 0;
        return second - first;
      });

    if (memories.length === 0) {
      memoryList.innerHTML = "<p>Your saved memories will appear here.</p>";
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
document.querySelectorAll(".categories button[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter || "all";

    document.querySelectorAll(".categories button").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    renderPosts();
  });
});

// Navigation
function navigateTo(page) {
  const destinations = {
    Home: "homeFeed",
    Discover: "discoverPanel",
    Create: "createPanel",
    Memories: "profilePanel",
    Profile: "profilePanel"
  };

  const destination = $(destinations[page]);

  if (destination) {
    destination.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  if (page === "Memories") {
    memoryList?.scrollIntoView({ behavior: "smooth" });
  }
}

document.querySelectorAll(".bottom-nav button[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    navigateTo(button.dataset.page);
  });
});

document.querySelectorAll(".categories button[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    navigateTo(button.dataset.page);
  });
});

profileButton?.addEventListener("click", () => {
  navigateTo("Profile");
});

console.log("Rami app initialized successfully 🇵🇰");
