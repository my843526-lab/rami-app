// RAMI - Firebase Connected App

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// App state
let currentUser = null;
let allPosts = [];
let activeFilter = "all";
let stopPostsListener = null;
let followedUsers = new Set();

// Elements
const authPanel = document.getElementById("authPanel");
const accountPanel = document.getElementById("accountPanel");
const authName = document.getElementById("authName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");

const welcomeUser = document.getElementById("welcomeUser");
const userEmail = document.getElementById("userEmail");

const postTitle = document.getElementById("postTitle");
const postCategory = document.getElementById("postCategory");
const postText = document.getElementById("postText");
const postMessage = document.getElementById("postMessage");

const feedList = document.getElementById("feedList");
const creatorList = document.getElementById("creatorList");
const profileName = document.getElementById("profileName");
const profileStats = document.getElementById("profileStats");
const memoryList = document.getElementById("memoryList");
const memoryMessage = document.getElementById("memoryMessage");

// Helpers
function showMessage(element, message) {
  if (element) element.textContent = message;
}

function safeText(value) {
  return String(value ?? "");
}

function requireLogin() {
  if (!currentUser) {
    alert("Please log in to Rami first.");
    return false;
  }
  return true;
}

function readableDate(timestamp) {
  if (!timestamp) return "Just now";

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp);

  return date.toLocaleString();
}

function normalizeComments(comments) {
  return Array.isArray(comments) ? comments : [];
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

// Sign up
document.getElementById("signupButton").addEventListener("click", async () => {
  const name = authName.value.trim();
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!name || !email || !password) {
    showMessage(authMessage, "Please fill in all fields.");
    return;
  }

  if (password.length < 6) {
    showMessage(authMessage, "Password must have at least 6 characters.");
    return;
  }

  try {
    showMessage(authMessage, "Creating your account...");

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

    showMessage(authMessage, "Welcome to Rami!");
  } catch (error) {
    showMessage(authMessage, error.message);
  }
});

// Log in
document.getElementById("loginButton").addEventListener("click", async () => {
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

// Log out
document.getElementById("logoutButton").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert(error.message);
  }
});

// Authentication state
onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    authPanel.hidden = true;
    accountPanel.hidden = false;

    welcomeUser.textContent =
      "Welcome, " + (user.displayName || "Rami user") + "!";

    userEmail.textContent = user.email || "";

    await loadMyProfile();
    await loadFollowedUsers();
    listenToPosts();
    await loadCreators();
    await loadMemories();
  } else {
    authPanel.hidden = false;
    accountPanel.hidden = true;

    allPosts = [];
    followedUsers.clear();

    if (stopPostsListener) {
      stopPostsListener();
      stopPostsListener = null;
    }

    profileName.textContent = "Log in to see your profile.";
    profileStats.textContent = "";
    creatorList.textContent = "Log in to discover creators.";
    memoryList.replaceChildren();

    renderPosts();
  }
});

// Load profile
async function loadMyProfile() {
  if (!currentUser) return;

  try {
    const userRef = doc(db, "users", currentUser.uid);
    const snapshot = await getDoc(userRef);

    const name = snapshot.exists()
      ? snapshot.data().name
      : currentUser.displayName || "Rami user";

    profileName.textContent = name;
  } catch (error) {
    profileName.textContent = currentUser.displayName || "Rami user";
  }
}

// Load followed users
async function loadFollowedUsers() {
  if (!currentUser) return;

  followedUsers.clear();

  try {
    const snapshot = await getDocs(collection(db, "follows"));

    snapshot.forEach((item) => {
      const data = item.data();

      if (data.followerId === currentUser.uid) {
        followedUsers.add(data.creatorId);
      }
    });
  } catch (error) {
    console.error("Follow loading error:", error);
  }
}

// Publish post
document.getElementById("publishButton").addEventListener("click", async () => {
  if (!requireLogin()) return;

  const title = postTitle.value.trim();
  const text = postText.value.trim();
  const category = postCategory.value;

  if (!text) {
    showMessage(postMessage, "Please write something first.");
    return;
  }

  try {
    showMessage(postMessage, "Publishing your post...");

    await addDoc(collection(db, "posts"), {
      title,
      text,
      description: text,
      category,
      userId: currentUser.uid,
      userName: currentUser.displayName || "Rami user",
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: serverTimestamp()
    });

    postTitle.value = "";
    postText.value = "";

    showMessage(postMessage, "Your post is now on Rami!");
  } catch (error) {
    showMessage(postMessage, error.message);
  }
});

// Listen to posts
function listenToPosts() {
  if (stopPostsListener) stopPostsListener();

  const postsQuery = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );

  stopPostsListener = onSnapshot(
    postsQuery,
    (snapshot) => {
      allPosts = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      renderPosts();
    },
    (error) => {
      console.error("Feed error:", error);
      showMessage(postMessage, "Could not load feed: " + error.message);
    }
  );
}

// Render feed
function renderPosts() {
  feedList.replaceChildren();

  let posts = allPosts;

  if (activeFilter !== "all") {
    posts = posts.filter(
      (post) => post.category === activeFilter
    );
  }

  if (!posts.length) {
    const empty = makeElement(
      "div",
      "feed",
      currentUser
        ? "No posts here yet. Be the first to share something!"
        : "Welcome to Rami! Log in to explore the community."
    );

    feedList.appendChild(empty);
    return;
  }

  posts.forEach((post) => {
    const card = makeElement("article", "feed");

    const category = makeElement(
      "div",
      "feed-meta",
      safeText(post.category || "Community")
    );

    const title = makeElement(
      "h3",
      "",
      safeText(post.title || "Rami post")
    );

    const text = makeElement(
      "p",
      "",
      safeText(post.text || post.description)
    );

    const meta = makeElement(
      "div",
      "feed-meta",
      "By " + safeText(post.userName || "Rami user") +
      " • " + readableDate(post.createdAt)
    );

    card.append(category, title, text, meta);

    const actions = makeElement("div", "feed-actions");

    const likedBy = Array.isArray(post.likedBy)
      ? post.likedBy
      : [];

    const isLiked = currentUser &&
      likedBy.includes(currentUser.uid);

    const likeButton = makeElement(
      "button",
      "",
      (isLiked ? "❤️ " : "🤍 ") +
      "Like " + (post.likes || 0)
    );

    likeButton.addEventListener("click", () => {
      likePost(post.id);
    });

    const commentButton = makeElement(
      "button",
      "",
      "💬 Comment"
    );

    commentButton.addEventListener("click", () => {
      commentInput.focus();
    });

    const followButton = makeElement(
      "button",
      "follow-button",
      followedUsers.has(post.userId)
        ? "Following ✓"
        : "＋ Follow"
    );

    if (
      !currentUser ||
      post.userId === currentUser.uid ||
      followedUsers.has(post.userId)
    ) {
      followButton.disabled = true;
    }

    followButton.addEventListener("click", () => {
      followCreator(post.userId);
    });

    const shareButton = makeElement(
      "button",
      "",
      "↗ Share"
    );

    shareButton.addEventListener("click", async () => {
      const shareData = {
        title: "Rami",
        text: safeText(post.title || post.text),
        url: location.href
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(
            shareData.text + " - " + shareData.url
          );
          alert("Post link copied!");
        } else {
          alert("Sharing is not supported on this browser.");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          alert("Could not share this post.");
        }
      }
    });

    actions.append(
      likeButton,
      commentButton,
      followButton,
      shareButton
    );

    const commentArea = makeElement("div", "comment-area");

    const commentInput = makeElement("input");
    commentInput.type = "text";
    commentInput.placeholder = "Write a comment...";

    const sendComment = makeElement(
      "button",
      "action-button",
      "Send"
    );

    sendComment.addEventListener("click", async () => {
      const value = commentInput.value.trim();

      if (!value) return;

      if (!requireLogin()) return;

      sendComment.disabled = true;

      try {
        await addComment(post.id, value);
        commentInput.value = "";
      } catch (error) {
        alert(error.message);
      } finally {
        sendComment.disabled = false;
      }
    });

    commentInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        sendComment.click();
      }
    });

    commentArea.append(commentInput, sendComment);

    const commentList = makeElement("div", "comment-list");

    const comments = normalizeComments(post.comments);

    comments.slice(-5).forEach((comment) => {
      const line = makeElement(
        "p",
        "",
        safeText(comment.userName) + ": " +
        safeText(comment.text)
      );

      commentList.appendChild(line);
    });

    card.append(actions, commentArea, commentList);
    feedList.appendChild(card);
  });

  profileStats.textContent =
    "Your posts: " +
    allPosts.filter(
      (post) => currentUser && post.userId === currentUser.uid
    ).length;
}

// Like post
async function likePost(postId) {
  if (!requireLogin()) return;

  try {
    const postRef = doc(db, "posts", postId);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(postRef);

      if (!snapshot.exists()) return;

      const data = snapshot.data();
      const likedBy = Array.isArray(data.likedBy)
        ? data.likedBy
        : [];

      const alreadyLiked = likedBy.includes(currentUser.uid);

      const updatedLikedBy = alreadyLiked
        ? likedBy.filter((id) => id !== currentUser.uid)
        : [...likedBy, currentUser.uid];

      transaction.update(postRef, {
        likedBy: updatedLikedBy,
        likes: updatedLikedBy.length
      });
    });
  } catch (error) {
    alert(error.message);
  }
}

// Add comment
async function addComment(postId, text) {
  const postRef = doc(db, "posts", postId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(postRef);

    if (!snapshot.exists()) {
      throw new Error("Post not found.");
    }

    const comments = normalizeComments(snapshot.data().comments);

    comments.push({
      userId: currentUser.uid,
      userName: currentUser.displayName || "Rami user",
      text,
      createdAt: new Date().toISOString()
    });

    transaction.update(postRef, {
      comments
    });
  });
}

// Follow creator
async function followCreator(creatorId) {
  if (!requireLogin()) return;

  if (creatorId === currentUser.uid) return;

  const followId = currentUser.uid + "_" + creatorId;

  try {
    await setDoc(
      doc(db, "follows", followId),
      {
        followerId: currentUser.uid,
        creatorId,
        createdAt: serverTimestamp()
      }
    );

    followedUsers.add(creatorId);
    renderPosts();
    await loadCreators();
  } catch (error) {
    alert(error.message);
  }
}

// Discover creators
async function loadCreators() {
  if (!currentUser) return;

  creatorList.textContent = "Loading creators...";

  try {
    const snapshot = await getDocs(collection(db, "users"));

    creatorList.replaceChildren();

    let count = 0;

    snapshot.forEach((item) => {
      if (item.id === currentUser.uid) return;

      const data = item.data();
      count++;

      const row = makeElement("div", "creator-item");

      const name = makeElement(
        "span",
        "",
        safeText(data.name || data.username || "Rami creator")
      );

      const button = makeElement(
        "button",
        "follow-button",
        followedUsers.has(item.id) ? "Following ✓" : "＋ Follow"
      );

      if (followedUsers.has(item.id)) {
        button.disabled = true;
      }

      button.addEventListener("click", () => {
        followCreator(item.id);
      });

      row.append(name, button);
      creatorList.appendChild(row);
    });

    if (!count) {
      creatorList.textContent = "No creators yet. Invite your friends!";
    }
  } catch (error) {
    creatorList.textContent = error.message;
  }
}

// Save memory
document.getElementById("saveMemoryButton").addEventListener(
  "click",
  async () => {
    if (!requireLogin()) return;

    const memory = prompt("Write your memory:");

    if (!memory || !memory.trim()) return;

    try {
      showMessage(memoryMessage, "Saving your memory...");

      await addDoc(collection(db, "memories"), {
        userId: currentUser.uid,
        text: memory.trim(),
        createdAt: serverTimestamp()
      });

      showMessage(memoryMessage, "Memory saved successfully!");
      await loadMemories();
    } catch (error) {
      showMessage(memoryMessage, error.message);
    }
  }
);

// Load memories
async function loadMemories() {
  if (!currentUser) return;

  memoryList.textContent = "Loading memories...";

  try {
    const snapshot = await getDocs(collection(db, "memories"));

    memoryList.replaceChildren();

    let count = 0;

    snapshot.forEach((item) => {
      const data = item.data();

      if (data.userId !== currentUser.uid) return;

      count++;

      const memory = makeElement(
        "div",
        "memory-item",
        safeText(data.text)
      );

      memoryList.appendChild(memory);
    });

    if (!count) {
      memoryList.textContent = "Your saved memories will appear here.";
    }
  } catch (error) {
    memoryList.textContent = error.message;
  }
}

// Category filters
document.querySelectorAll(".categories button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".categories button").forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    activeFilter = button.dataset.filter || "all";

    renderPosts();
  });
});

// Bottom navigation
document.querySelectorAll("nav button").forEach((button) => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;

    if (page === "Home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (page === "Discover") {
      document.getElementById("discoverPanel").scrollIntoView({
        behavior: "smooth"
      });
    }

    if (page === "Create") {
      document.getElementById("createPanel").scrollIntoView({
        behavior: "smooth"
      });
    }

    if (page === "Memories" || page === "Profile") {
      document.getElementById("profilePanel").scrollIntoView({
        behavior: "smooth"
      });
    }
  });
});

// Profile shortcut
document.getElementById("profileButton").addEventListener("click", () => {
  document.getElementById("profilePanel").scrollIntoView({
    behavior: "smooth"
  });
});

// Initial feed
renderPosts();
