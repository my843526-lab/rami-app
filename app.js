// Rami - Firebase Connected Social App
// Direct Gallery opening + image/video preview

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
  addDoc,
  getDocs,
  onSnapshot,
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

// Start Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// App state
let currentUser = null;
let allPosts = [];
let activeFilter = "all";
let stopPostsListener = null;
let selectedMediaUrl = null;

const el = id => document.getElementById(id);

// Safe text
function safeText(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// Show message
function showMessage(id, text) {
  const node = el(id);
  if (node) node.textContent = text;
}

// Require login
function requireLogin() {
  if (!currentUser) {
    alert("Please sign up or log in first.");
    return false;
  }
  return true;
}

// Readable date
function readableDate(value) {
  if (!value) return "";

  try {
    const date = value.toDate
      ? value.toDate()
      : new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

// Normalize comments
function normalizeComments(comments) {
  if (!Array.isArray(comments)) return [];

  return comments.map(comment => {
    if (typeof comment === "string") {
      return { text: comment };
    }
    return comment || { text: "" };
  });
}

// --------------------------------------------------
// GALLERY PICKER AND PREVIEW
// --------------------------------------------------

function setupGallery() {
  const createPanel = el("createPanel");
  const publishButton = el("publishButton");

  if (!createPanel || !publishButton) return;

  let mediaPicker = el("mediaPicker");
  let preview = el("mediaPreview");

  if (!mediaPicker) {
    mediaPicker = document.createElement("input");
    mediaPicker.type = "file";
    mediaPicker.id = "mediaPicker";
    mediaPicker.accept = "image/*,video/*";
    createPanel.insertBefore(mediaPicker, publishButton);
  }

  mediaPicker.accept = "image/*,video/*";

  if (!preview) {
    preview = document.createElement("div");
    preview.id = "mediaPreview";
    createPanel.insertBefore(preview, publishButton);
  }

  let galleryButton = document.querySelector(
    'label[for="mediaPicker"]'
  );

  if (!galleryButton) {
    galleryButton = document.createElement("button");
    galleryButton.type = "button";
    galleryButton.className = "action-button";
    galleryButton.textContent = "📷 Choose Photo or Video";
    createPanel.insertBefore(galleryButton, mediaPicker);
  }

  galleryButton.id = "chooseMediaButton";

  mediaPicker.style.position = "absolute";
  mediaPicker.style.width = "1px";
  mediaPicker.style.height = "1px";
  mediaPicker.style.opacity = "0.01";
  mediaPicker.style.overflow = "hidden";

  // Gallery button
  galleryButton.addEventListener("click", event => {
    event.preventDefault();
    mediaPicker.click();
  });

  // Selected media preview
  mediaPicker.addEventListener("change", () => {
    if (selectedMediaUrl) {
      URL.revokeObjectURL(selectedMediaUrl);
      selectedMediaUrl = null;
    }

    preview.innerHTML = "";

    const file = mediaPicker.files && mediaPicker.files[0];

    if (!file) return;

    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/")
    ) {
      showMessage("postMessage", "Please select an image or video.");
      mediaPicker.value = "";
      return;
    }

    selectedMediaUrl = URL.createObjectURL(file);

    const mediaElement = document.createElement(
      file.type.startsWith("video/") ? "video" : "img"
    );

    mediaElement.src = selectedMediaUrl;
    mediaElement.style.width = "100%";
    mediaElement.style.maxHeight = "350px";
    mediaElement.style.objectFit = "contain";
    mediaElement.style.borderRadius = "12px";
    mediaElement.style.background = "#111";

    if (file.type.startsWith("video/")) {
      mediaElement.controls = true;
      mediaElement.playsInline = true;
    }

    preview.appendChild(mediaElement);

    const fileName = document.createElement("p");
    fileName.textContent = "Selected: " + file.name;
    preview.appendChild(fileName);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "action-button secondary-button";
    removeButton.textContent = "Remove Selection";

    removeButton.addEventListener("click", () => {
      mediaPicker.value = "";
      preview.innerHTML = "";

      if (selectedMediaUrl) {
        URL.revokeObjectURL(selectedMediaUrl);
        selectedMediaUrl = null;
      }

      showMessage("postMessage", "Media selection removed.");
    });

    preview.appendChild(removeButton);

    showMessage(
      "postMessage",
      "Preview ready! Online media upload abhi setup nahi hua."
    );
  });
}

setupGallery();

// --------------------------------------------------
// SIGN UP
// --------------------------------------------------

el("signupButton").addEventListener("click", async () => {
  const name = el("authName").value.trim();
  const email = el("authEmail").value.trim();
  const password = el("authPassword").value;

  if (!name || !email || password.length < 6) {
    showMessage(
      "authMessage",
      "Name, email aur kam az kam 6-character password likhein."
    );
    return;
  }

  try {
    el("signupButton").disabled = true;
    showMessage("authMessage", "Account ban raha hai...");

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
      username: name.toLowerCase().replace(/\s+/g, "_"),
      createdAt: serverTimestamp()
    });

    showMessage("authMessage", "Account successfully created!");
  } catch (error) {
    showMessage("authMessage", error.message);
  } finally {
    el("signupButton").disabled = false;
  }
});

// --------------------------------------------------
// LOG IN
// --------------------------------------------------

el("loginButton").addEventListener("click", async () => {
  const email = el("authEmail").value.trim();
  const password = el("authPassword").value;

  if (!email || !password) {
    showMessage("authMessage", "Email aur password likhein.");
    return;
  }

  try {
    el("loginButton").disabled = true;
    showMessage("authMessage", "Logging in...");

    await signInWithEmailAndPassword(auth, email, password);

    showMessage("authMessage", "Login successful!");
  } catch (error) {
    showMessage("authMessage", error.message);
  } finally {
    el("loginButton").disabled = false;
  }
});

// --------------------------------------------------
// LOG OUT
// --------------------------------------------------

el("logoutButton").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert(error.message);
  }
});

// --------------------------------------------------
// AUTH STATE
// --------------------------------------------------

onAuthStateChanged(auth, async user => {
  currentUser = user;

  el("authPanel").hidden = !!user;
  el("accountPanel").hidden = !user;

  if (user) {
    el("userEmail").textContent = user.email || "";

    await loadMyProfile();
    listenToPosts();
    await loadCreators();
    await loadMemories();
  } else {
    el("welcomeUser").textContent = "Welcome!";
    el("userEmail").textContent = "";
    el("profileName").textContent = "Log in to see your profile.";
    el("profileStats").textContent = "";
    el("creatorList").textContent = "Log in to discover creators.";
    el("memoryList").innerHTML = "";

    allPosts = [];

    if (stopPostsListener) {
      stopPostsListener();
      stopPostsListener = null;
    }

    renderPosts();
  }
});

// --------------------------------------------------
// LOAD PROFILE
// --------------------------------------------------

async function loadMyProfile() {
  if (!currentUser) return;

  try {
    const profileRef = doc(db, "users", currentUser.uid);
    const snapshot = await getDoc(profileRef);

    let name = currentUser.displayName || "Rami User";

    if (snapshot.exists()) {
      name = snapshot.data().name || name;
    }

    el("welcomeUser").textContent = "Welcome, " + name + "!";
    el("profileName").textContent = name;
    el("profileStats").textContent = currentUser.email || "";
  } catch (error) {
    showMessage("profileName", error.message);
  }
}

// --------------------------------------------------
// CREATE TEXT POST
// --------------------------------------------------

el("publishButton").addEventListener("click", async () => {
  if (!requireLogin()) return;

  const title = el("postTitle").value.trim();
  const text = el("postText").value.trim();
  const category = el("postCategory").value;
  const mediaPicker = el("mediaPicker");

  if (mediaPicker && mediaPicker.files.length > 0) {
    showMessage(
      "postMessage",
      "Photo/video preview ho rahi hai, lekin online upload abhi available nahi. Filhal media remove karke text post publish karein."
    );
    return;
  }

  if (!title || !text) {
    showMessage("postMessage", "Post ka title aur text likhein.");
    return;
  }

  try {
    el("publishButton").disabled = true;
    showMessage("postMessage", "Publishing...");

    await addDoc(collection(db, "posts"), {
      title,
      text,
      description: text,
      category,
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email || "Rami User",
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: serverTimestamp()
    });

    el("postTitle").value = "";
    el("postText").value = "";

    showMessage("postMessage", "Your post has been published!");
  } catch (error) {
    showMessage("postMessage", "Post save nahi ho saka: " + error.message);
  } finally {
    el("publishButton").disabled = false;
  }
});

// --------------------------------------------------
// LIVE POSTS
// --------------------------------------------------

function listenToPosts() {
  if (stopPostsListener) {
    stopPostsListener();
  }

  stopPostsListener = onSnapshot(
    collection(db, "posts"),
    snapshot => {
      allPosts = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

      allPosts.sort((a, b) => {
        const getTime = value => {
          if (!value) return 0;
          if (value.toDate) return value.toDate().getTime();

          const parsed = new Date(value).getTime();
          return Number.isNaN(parsed) ? 0 : parsed;
        };

        return getTime(b.createdAt) - getTime(a.createdAt);
      });

      renderPosts();
    },
    error => {
      el("feedList").textContent =
        "Posts load nahi ho sake: " + error.message;
    }
  );
}

// --------------------------------------------------
// RENDER POSTS
// --------------------------------------------------

function renderPosts() {
  const list = el("feedList");
  if (!list) return;

  const posts = activeFilter === "all"
    ? allPosts
    : allPosts.filter(post => post.category === activeFilter);

  if (!posts.length) {
    list.innerHTML = `
      <div class="feed">
        <div class="video-placeholder">🇵🇰</div>
        <h3>Rami par abhi koi post nahi.</h3>
        <p>Apni pehli post share karein!</p>
      </div>`;
    return;
  }

  list.innerHTML = posts.map(post => {
    const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
    const liked = currentUser && likedBy.includes(currentUser.uid);
    const comments = normalizeComments(post.comments);
    const author = post.userName || "Rami Creator";
    const postText = post.text || post.description || "";

    return `
      <article class="feed">
        <div class="feed-meta">
          ${safeText(author)}
          · ${safeText(post.category || "Post")}
          ${post.createdAt ? " · " + safeText(readableDate(post.createdAt)) : ""}
        </div>

        <h3>${safeText(post.title || "Rami Post")}</h3>
        <p>${safeText(postText)}</p>

        <div class="feed-actions">
          <button type="button" data-like="${safeText(post.id)}">
            ${liked ? "❤️ Liked" : "🤍 Like"}
            (${Number(post.likes) || 0})
          </button>

          <button type="button" data-follow="${safeText(post.userId || "")}"
            ${!post.userId || (currentUser && post.userId === currentUser.uid) ? "disabled" : ""}>
            ➕ Follow Creator
          </button>
        </div>

        <div class="comment-list">
          ${comments.map(comment => `
            <p>💬 ${safeText(comment.text || "")}</p>
          `).join("")}
        </div>

        <div class="comment-area">
          <input
            type="text"
            id="comment-${safeText(post.id)}"
            placeholder="Write a comment"
            maxlength="500"
          >
          <button type="button" data-comment="${safeText(post.id)}">
            Send
          </button>
        </div>
      </article>`;
  }).join("");
}

// --------------------------------------------------
// LIKE POSTS
// --------------------------------------------------

el("feedList").addEventListener("click", async event => {
  const button = event.target.closest("[data-like]");
  if (!button) return;

  if (!requireLogin()) return;

  const postId = button.dataset.like;

  try {
    button.disabled = true;

    await runTransaction(db, async transaction => {
      const postRef = doc(db, "posts", postId);
      const snapshot = await transaction.get(postRef);

      if (!snapshot.exists()) {
        throw new Error("Post not found.");
      }

      const data = snapshot.data();
      const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
      const alreadyLiked = likedBy.includes(currentUser.uid);

      const updatedLikedBy = alreadyLiked
        ? likedBy.filter(id => id !== currentUser.uid)
        : [...likedBy, currentUser.uid];

      transaction.update(postRef, {
        likedBy: updatedLikedBy,
        likes: updatedLikedBy.length
      });
    });
  } catch (error) {
    alert("Like save nahi ho saka: " + error.message);
  } finally {
    button.disabled = false;
  }
});

// --------------------------------------------------
// COMMENTS
// --------------------------------------------------

el("feedList").addEventListener("click", async event => {
  const button = event.target.closest("[data-comment]");
  if (!button) return;

  if (!requireLogin()) return;

  const postId = button.dataset.comment;
  const input = el("comment-" + postId);
  const text = input ? input.value.trim() : "";

  if (!text) return;

  try {
    button.disabled = true;

    const postRef = doc(db, "posts", postId);

    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(postRef);

      if (!snapshot.exists()) {
        throw new Error("Post not found.");
      }

      const data = snapshot.data();
      const oldComments = normalizeComments(data.comments);

      oldComments.push({
        text,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email || "Rami User",
        createdAt: new Date().toISOString()
      });

      transaction.update(postRef, {
        comments: oldComments
      });
    });

    if (input) input.value = "";
  } catch (error) {
    alert("Comment save nahi ho saka: " + error.message);
  } finally {
    button.disabled = false;
  }
});

// --------------------------------------------------
// FOLLOW CREATOR FROM FEED
// --------------------------------------------------

el("feedList").addEventListener("click", async event => {
  const button = event.target.closest("[data-follow]");
  if (!button) return;

  if (!requireLogin()) return;

  const creatorId = button.dataset.follow;

  if (!creatorId || creatorId === currentUser.uid) {
    alert("You cannot follow yourself.");
    return;
  }

  try {
    button.disabled = true;

    await setDoc(
      doc(db, "follows", currentUser.uid + "_" + creatorId),
      {
        followerId: currentUser.uid,
        followingId: creatorId,
        createdAt: serverTimestamp()
      }
    );

    button.textContent = "✓ Following";
  } catch (error) {
    alert("Follow nahi ho saka: " + error.message);
    button.disabled = false;
  }
});

// --------------------------------------------------
// DISCOVER CREATORS
// --------------------------------------------------

async function loadCreators() {
  if (!currentUser) return;

  try {
    const snapshot = await getDocs(collection(db, "users"));

    const creators = snapshot.docs.filter(
      item => item.id !== currentUser.uid
    );

    if (!creators.length) {
      el("creatorList").textContent = "Abhi koi doosra creator nahi mila.";
      return;
    }

    const followSnapshot = await getDocs(collection(db, "follows"));

    const followedIds = new Set(
      followSnapshot.docs
        .filter(item => item.data().followerId === currentUser.uid)
        .map(item => item.data().followingId)
    );

    el("creatorList").innerHTML = creators.map(item => {
      const creator = item.data();
      const alreadyFollowing = followedIds.has(item.id);

      return `
        <div class="creator-item">
          <span>${safeText(creator.name || "Rami Creator")}</span>
          <button
            class="follow-button"
            type="button"
            data-creator="${safeText(item.id)}"
            ${alreadyFollowing ? "disabled" : ""}
          >
            ${alreadyFollowing ? "Following" : "Follow"}
          </button>
        </div>`;
    }).join("");

  } catch (error) {
    el("creatorList").textContent =
      "Creators load nahi ho sake: " + error.message;
  }
}

// Follow from Discover
el("creatorList").addEventListener("click", async event => {
  const button = event.target.closest("[data-creator]");
  if (!button || !requireLogin()) return;

  const creatorId = button.dataset.creator;

  try {
    button.disabled = true;

    await setDoc(
      doc(db, "follows", currentUser.uid + "_" + creatorId),
      {
        followerId: currentUser.uid,
        followingId: creatorId,
        createdAt: serverTimestamp()
      }
    );

    button.textContent = "Following";
  } catch (error) {
    alert("Follow nahi ho saka: " + error.message);
    button.disabled = false;
  }
});

// --------------------------------------------------
// SAVE MEMORY
// --------------------------------------------------

el("saveMemoryButton").addEventListener("click", async () => {
  if (!requireLogin()) return;

  const caption = prompt("Apni memory likhein:");
  if (!caption || !caption.trim()) return;

  try {
    el("saveMemoryButton").disabled = true;
    showMessage("memoryMessage", "Memory save ho rahi hai...");

    await addDoc(collection(db, "memories"), {
      userId: currentUser.uid,
      caption: caption.trim(),
      createdAt: serverTimestamp()
    });

    showMessage("memoryMessage", "Memory successfully saved!");
    await loadMemories();
  } catch (error) {
    showMessage("memoryMessage", "Memory save nahi ho saki: " + error.message);
  } finally {
    el("saveMemoryButton").disabled = false;
  }
});

// --------------------------------------------------
// LOAD MEMORIES
// --------------------------------------------------

async function loadMemories() {
  if (!currentUser) return;

  try {
    const snapshot = await getDocs(collection(db, "memories"));

    const memories = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => item.userId === currentUser.uid)
      .sort((a, b) => {
        const getTime = value => {
          if (!value) return 0;
          if (value.toDate) return value.toDate().getTime();

          const parsed = new Date(value).getTime();
          return Number.isNaN(parsed) ? 0 : parsed;
        };

        return getTime(b.createdAt) - getTime(a.createdAt);
      });

    el("memoryList").innerHTML = memories.length
      ? memories.map(memory => `
          <div class="memory-item">
            💖 ${safeText(memory.caption)}
            ${memory.createdAt ? `<div class="feed-meta">${safeText(readableDate(memory.createdAt))}</div>` : ""}
          </div>
        `).join("")
      : "Abhi koi memory save nahi ki.";

  } catch (error) {
    showMessage("memoryMessage", "Memories load nahi ho sakin: " + error.message);
  }
}

// --------------------------------------------------
// CATEGORY FILTER
// --------------------------------------------------

document.querySelectorAll(".categories button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".categories button")
      .forEach(item => item.classList.remove("active"));

    button.classList.add("active");

    activeFilter = button.dataset.filter || "all";
    renderPosts();
  });
});

// --------------------------------------------------
// BOTTOM NAVIGATION - DIRECT GALLERY OPEN
// --------------------------------------------------

document.querySelectorAll("nav button").forEach(button => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;

    if (page === "Home") {
      window.scrollTo({ top: 0, behavior: "smooth" });

    } else if (page === "Create") {
      const mediaPicker = el("mediaPicker");

      if (mediaPicker) {
        mediaPicker.click();
      } else {
        alert("Gallery is not ready. Please reload Rami.");
      }

    } else if (page === "Discover") {
      el("discoverPanel").scrollIntoView({ behavior: "smooth" });

    } else if (page === "Memories" || page === "Profile") {
      el("profilePanel").scrollIntoView({ behavior: "smooth" });
    }
  });
});

// Profile icon
el("profileButton").addEventListener("click", () => {
  el("profilePanel").scrollIntoView({ behavior: "smooth" });
});

// Initial feed display
renderPosts();
