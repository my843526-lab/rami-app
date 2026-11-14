
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
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

// ========================================
// RAMI PROFESSIONAL EDITION 🇵🇰
// ========================================

const firebaseConfig = {
  apiKey: "AIzaSyB8nvVBQ2KJ-6bir7N_gI0zaOy9j7seuhg",
  authDomain: "rami-3aeed.firebaseapp.com",
  projectId: "rami-3aeed",
  storageBucket: "rami-3aeed.firebasestorage.app",
  messagingSenderId: "232735067990",
  appId: "1:232735067990:web:4274124ed00e0301c1d0f7",
  measurementId: "G-TZFRLKCQB5"
};

const CLOUDINARY_CLOUD_NAME = "dge5sq0w";
const CLOUDINARY_UPLOAD_PRESET = "rami_mobile";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ========================================
// APP STATE
// ========================================

let currentUser = null;
let currentProfile = {};
let allPosts = [];
let followedUsers = new Set();
let activeFilter = "all";
let currentPage = "Home";
let profileTab = "Posts";
let soundEnabled = false;
let stopPostsListener = null;
let feedObserver = null;
let authReady = false;
let isPublishing = false;

const $ = id => document.getElementById(id);

// ========================================
// SAFE HELPERS
// ========================================

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function message(element, text) {
  if (element) element.textContent = text;
}

function requireLogin() {
  if (currentUser) return true;
  alert("Please login to continue on Rami.");
  return false;
}

function displayName(user = currentUser) {
  return user?.displayName ||
    currentProfile.name ||
    currentProfile.username ||
    "Rami Creator";
}

function getPostMedia(post) {
  return post.mediaUrl || post.videoUrl || "";
}

function getPostType(post) {
  return post.mediaType ||
    (post.videoUrl ? "video" : "");
}

// ========================================
// ADDITIONAL PROFESSIONAL DESIGN
// ========================================

function installRamiStyles() {
  if ($("ramiExtraStyles")) return;

  const style = document.createElement("style");
  style.id = "ramiExtraStyles";

  style.textContent = `
    .rami-extra-btn {
      background:linear-gradient(120deg,#a56bff,#ff4d9d);
      color:white;border:0;border-radius:22px;
      padding:10px 17px;font-weight:bold;
      margin:6px 4px;cursor:pointer;
    }

    .rami-search {
      width:100%;padding:13px;margin:12px 0;
      border:1px solid #49495e;border-radius:12px;
      background:#101018;color:white;
    }

    .rami-profile-cover {
      height:105px;border-radius:15px;
      background:linear-gradient(120deg,#5925a5,#ed3c91);
      margin-bottom:-42px;
    }

    .rami-avatar {
      width:85px;height:85px;border-radius:50%;
      object-fit:cover;background:#29293b;
      border:4px solid #191923;
      display:block;margin-left:15px;
    }

    .rami-profile-tabs {
      display:flex;gap:8px;overflow-x:auto;
      margin:18px 0;padding-bottom:8px;
    }

    .rami-profile-tabs button {
      flex:1;min-width:75px;padding:10px 5px;
      border-radius:10px;background:#29293b;
      color:white;font-size:12px;
    }

    .rami-profile-tabs button.active {
      background:linear-gradient(120deg,#a56bff,#ff4d9d);
    }

    .rami-profile-grid {
      display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;margin-top:12px;
    }

    .rami-profile-post {
      background:#252535;border-radius:12px;
      overflow:hidden;min-width:0;
    }

    .rami-profile-post img,
    .rami-profile-post video {
      width:100%;height:180px;object-fit:cover;
      display:block;background:#101018;
    }

    .rami-profile-post p {
      padding:9px;font-size:12px;overflow-wrap:anywhere;
    }

    .rami-creator-card {
      display:flex;align-items:center;gap:12px;
      padding:13px;background:#252535;
      border-radius:13px;
    }

    .rami-creator-card img {
      width:48px;height:48px;object-fit:cover;
      border-radius:50%;background:#444;
    }

    .rami-creator-card .creator-info {flex:1;min-width:0}
    .rami-creator-card p {color:#aaaabd;font-size:12px;margin-top:4px}

    .rami-status {
      padding:10px;border-radius:10px;
      background:#242438;margin:10px 0;
      color:#ddd;font-size:13px;
    }

    .rami-profile-bio {
      color:#aaaabd;margin:10px 0;
      font-size:13px;overflow-wrap:anywhere;
    }

    .rami-action {
      border-radius:18px;background:#29293b;
      color:white;padding:8px 12px;margin:4px;
    }

    .rami-post video {touch-action:pan-y}
    .rami-post .post-info {max-width:calc(100% - 100px)}

    @media(max-width:360px) {
      .post-actions {right:4px;gap:13px}
      .post-actions button {min-width:40px;font-size:21px}
      .post-info {left:10px;right:62px}
    }
  `;

  document.head.appendChild(style);
}

// ========================================
// ADD PROFILE FEATURES TO EXISTING HTML
// ========================================

function prepareExtraInterface() {
  const panel = $("profilePanel");

  if (panel && !$("ramiProfileExtra")) {
    const extra = document.createElement("div");
    extra.id = "ramiProfileExtra";

    extra.innerHTML = `
      <div class="rami-profile-cover"></div>
      <img id="ramiAvatar" class="rami-avatar"
        alt="Profile picture">

      <p id="ramiBio" class="rami-profile-bio"></p>

      <button id="editProfileButton"
        class="rami-extra-btn">Edit Profile</button>

      <div class="rami-profile-tabs">
        <button data-profile-tab="Posts" class="active">Posts</button>
        <button data-profile-tab="Saved">Saved</button>
        <button data-profile-tab="Memories">Memories</button>
      </div>

      <div id="ramiProfileContent"></div>
    `;

    const stats = $("profileStats");
    if (stats) stats.after(extra);
    else panel.appendChild(extra);
  }

  if (creatorList && !$("creatorSearch")) {
    const search = document.createElement("input");
    search.id = "creatorSearch";
    search.className = "rami-search";
    search.placeholder = "Search creators on Rami...";
    creatorList.before(search);
  }
}

// ========================================
// PAGE NAVIGATION
// ========================================

function pauseAllVideos() {
  document.querySelectorAll("video").forEach(video => {
    video.pause();
  });
}

function navigateTo(page) {
  const allowed = [
    "Home", "Discover", "Create", "Memories", "Profile"
  ];

  if (!allowed.includes(page)) page = "Home";

  if (!currentUser && page !== "Home") {
    alert("Please login first.");
    page = "Home";
  }

  currentPage = page;

  document.body.classList.remove(
    "page-home", "page-create",
    "page-discover", "page-profile"
  );

  document.body.classList.add(
    page === "Home" ? "page-home" :
    page === "Create" ? "page-create" :
    page === "Discover" ? "page-discover" :
    "page-profile"
  );

  if ($("homeFeed")) $("homeFeed").hidden = page !== "Home";
  if ($("createPanel")) $("createPanel").hidden = page !== "Create";
  if ($("discoverPanel")) $("discoverPanel").hidden = page !== "Discover";

  if ($("profilePanel")) {
    $("profilePanel").hidden =
      page !== "Profile" && page !== "Memories";
  }

  if ($("accountPanel")) {
    $("accountPanel").hidden = page !== "Profile" || !currentUser;
  }

  document.querySelectorAll(".bottom-nav button[data-page]")
    .forEach(button => {
      button.classList.toggle(
        "active", button.dataset.page === page
      );
    });

  if (page !== "Home") pauseAllVideos();

  if (page === "Home") {
    setTimeout(playVisibleVideo, 150);
  }

  if (page === "Discover") loadCreators();
  if (page === "Profile") {
    loadProfile();
    updateProfileStats();
    renderProfileTab();
  }

  if (page === "Memories") {
    loadMemories();
    profileTab = "Memories";
    renderProfileTab();
  }

  if (page === "Home" && $("feedList")) {
    $("feedList").scrollTop = 0;
  }
}

// ========================================
// VIDEO PLAYER
// ========================================

function playVisibleVideo() {
  if (currentPage !== "Home" || !$("feedList")) return;

  $("feedList").querySelectorAll("video").forEach(video => {
    const rect = video.getBoundingClientRect();

    const visible = Math.min(rect.bottom, innerHeight) -
      Math.max(rect.top, 0);

    const ratio = rect.height > 0 ? visible / rect.height : 0;

    if (ratio >= 0.65) {
      video.muted = !soundEnabled;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
}

function setupVideoObserver() {
  if (feedObserver) feedObserver.disconnect();

  if (!$("feedList")) return;

  if (!("IntersectionObserver" in window)) {
    playVisibleVideo();
    return;
  }

  feedObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;

      if (
        currentPage === "Home" &&
        entry.isIntersecting &&
        entry.intersectionRatio >= 0.65
      ) {
        video.muted = !soundEnabled;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, {
    root: $("feedList"),
    threshold: [0, 0.65, 1]
  });

  $("feedList").querySelectorAll("video").forEach(video => {
    feedObserver.observe(video);
  });
}

// ========================================
// CLOUDINARY UPLOAD
// ========================================

async function uploadToCloudinary(file) {
  if (!file) return null;

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    throw new Error("Choose a photo or video.");
  }

  const limit = isImage ? 10 : 50;

  if (file.size > limit * 1024 * 1024) {
    throw new Error(`File must be ${limit} MB or smaller.`);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: "POST", body: formData }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || "Upload failed.");
  }

  return {
    url: result.secure_url,
    type: result.resource_type
  };
}

// ========================================
// SIGN UP
// ========================================

$("signupButton")?.addEventListener("click", async () => {
  const name = $("authName")?.value.trim() || "";
  const email = $("authEmail")?.value.trim() || "";
  const password = $("authPassword")?.value || "";

  if (!name || !email || !password) {
    message($("authMessage"), "Enter name, email and password.");
    return;
  }

  if (password.length < 6) {
    message($("authMessage"), "Password needs at least 6 characters.");
    return;
  }

  const button = $("signupButton");

  try {
    button.disabled = true;
    message($("authMessage"), "Creating your account...");

    const result = await createUserWithEmailAndPassword(
      auth, email, password
    );

    await updateProfile(result.user, { displayName: name });

    await setDoc(doc(db, "users", result.user.uid), {
      name,
      username: name,
      email,
      bio: "Welcome to my Rami profile!",
      photoURL: "",
      createdAt: serverTimestamp()
    }, { merge: true });

    message($("authMessage"), "Welcome to Rami! 🇵🇰");

  } catch (error) {
    message($("authMessage"), error.message);
  } finally {
    button.disabled = false;
  }
});

// ========================================
// LOGIN
// ========================================

$("loginButton")?.addEventListener("click", async () => {
  const email = $("authEmail")?.value.trim() || "";
  const password = $("authPassword")?.value || "";

  if (!email || !password) {
    message($("authMessage"), "Enter email and password.");
    return;
  }

  const button = $("loginButton");

  try {
    button.disabled = true;
    message($("authMessage"), "Logging in...");

    await signInWithEmailAndPassword(auth, email, password);

    message($("authMessage"), "Login successful!");

  } catch (error) {
    message($("authMessage"), error.message);
  } finally {
    button.disabled = false;
  }
});

// ========================================
// LOGOUT
// ========================================

$("logoutButton")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert(error.message);
  }
});

// ========================================
// AUTH STATE
// ========================================

onAuthStateChanged(auth, async user => {
  currentUser = user;
  authReady = false;

  if (!user) {
    if ($("authPanel")) $("authPanel").hidden = false;
    if ($("accountPanel")) $("accountPanel").hidden = true;

    if (stopPostsListener) stopPostsListener();
    if (feedObserver) feedObserver.disconnect();

    stopPostsListener = null;
    feedObserver = null;

    allPosts = [];
    followedUsers.clear();
    currentProfile = {};

    if ($("feedList")) $("feedList").innerHTML = "";

    navigateTo("Home");
    return;
  }

  if ($("authPanel")) $("authPanel").hidden = true;
  if ($("accountPanel")) $("accountPanel").hidden = true;

  if ($("welcomeUser")) {
    $("welcomeUser").textContent = `Welcome, ${displayName(user)}!`;
  }

  if ($("userEmail")) {
    $("userEmail").textContent = user.email || "";
  }

  try {
    await loadProfile();
    await loadFollowedUsers();

    listenToPosts();
    await loadCreators();
    await updateProfileStats();
    await loadMemories();

    authReady = true;
    navigateTo("Home");

  } catch (error) {
    console.error("Rami account error:", error);
    alert("Account loading error: " + error.message);
  }
});

// ========================================
// LOAD PROFILE
// ========================================

async function loadProfile() {
  if (!currentUser) return;

  try {
    const snapshot = await getDoc(
      doc(db, "users", currentUser.uid)
    );

    currentProfile = snapshot.exists()
      ? snapshot.data()
      : {};

    const name = currentProfile.name ||
      currentProfile.username ||
      displayName();

    if ($("profileName")) $("profileName").textContent = name;

    if ($("welcomeUser")) {
      $("welcomeUser").textContent = `Welcome, ${name}!`;
    }

    if ($("profileBio")) {
      $("profileBio").textContent = currentProfile.bio || "";
    }

    if ($("ramiBio")) {
      $("ramiBio").textContent =
        currentProfile.bio || "Welcome to my Rami profile!";
    }

    const avatar = $("profileAvatar");
    const extraAvatar = $("ramiAvatar");

    if (avatar && currentProfile.photoURL) {
      avatar.src = currentProfile.photoURL;
    }

    if (extraAvatar) {
      extraAvatar.src = currentProfile.photoURL ||
        "https://placehold.co/100x100/29293b/ffffff?text=R";
    }

  } catch (error) {
    console.error("Profile loading error:", error);
  }
}

// ========================================
// EDIT PROFILE
// ========================================

$("profilePanel")?.addEventListener("click", async event => {
  if (!event.target.closest("#editProfileButton")) return;
  if (!requireLogin()) return;

  const name = prompt(
    "Enter your display name:",
    currentProfile.name || displayName()
  );

  if (name === null || !name.trim()) return;

  const bio = prompt(
    "Write your profile bio:",
    currentProfile.bio || ""
  );

  if (bio === null) return;

  try {
    const cleanName = name.trim().slice(0, 40);
    const cleanBio = bio.trim().slice(0, 160);

    await setDoc(doc(db, "users", currentUser.uid), {
      name: cleanName,
      username: currentProfile.username || cleanName,
      bio: cleanBio
    }, { merge: true });

    await updateProfile(currentUser, {
      displayName: cleanName
    });

    await loadProfile();

    alert("Your profile has been updated!");

  } catch (error) {
    alert("Profile error: " + error.message);
  }
});

// ========================================
// PUBLISH POST
// ========================================

$("publishButton")?.addEventListener("click", async () => {
  if (!requireLogin() || isPublishing) return;

  const title = $("postTitle")?.value.trim() || "";
  const text = $("postText")?.value.trim() || "";
  const category = $("postCategory")?.value || "Knowledge";
  const videoUrl = $("postVideoUrl")?.value.trim() || "";
  const file = $("postMedia")?.files?.[0];

  if (!title && !text && !videoUrl && !file) {
    message($("postMessage"), "Write something or select media.");
    return;
  }

  if (videoUrl && !/^https?:\/\//i.test(videoUrl)) {
    message($("postMessage"), "Enter a valid media URL.");
    return;
  }

  const button = $("publishButton");

  try {
    isPublishing = true;
    button.disabled = true;

    let mediaUrl = videoUrl;
    let mediaType = videoUrl ? "video" : "";

    if (file) {
      message($("postMessage"), "Uploading your media...");
      const uploaded = await uploadToCloudinary(file);

      mediaUrl = uploaded.url;
      mediaType = uploaded.type;
    }

    message($("postMessage"), "Publishing your post...");

    await addDoc(collection(db, "posts"), {
      title,
      text,
      description: text,
      category,
      mediaUrl: mediaUrl || "",
      mediaType: mediaType || "",
      videoUrl: mediaType === "video" ? mediaUrl : "",
      userId: currentUser.uid,
      userName: displayName(),
      likes: 0,
      likedBy: [],
      favoriteBy: [],
      comments: [],
      views: 0,
      createdAt: serverTimestamp()
    });

    $("postTitle").value = "";
    $("postText").value = "";
    $("postVideoUrl").value = "";
    $("postMedia").value = "";

    message($("postMessage"), "Your post is live on Rami! 🇵🇰");
    navigateTo("Home");

  } catch (error) {
    console.error(error);
    message($("postMessage"), error.message);
  } finally {
    isPublishing = false;
    button.disabled = false;
  }
});

// ========================================
// REAL-TIME POSTS
// ========================================

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
    renderProfileTab();

  }, error => {
    console.error("Posts error:", error);

    if ($("feedList")) {
      $("feedList").innerHTML =
        `<div class="feed-message">Unable to load posts: ${
          escapeHTML(error.message)
        }</div>`;
    }
  });
}

// ========================================
// RENDER PROFESSIONAL FEED
// ========================================

function renderPosts() {
  const feed = $("feedList");
  if (!feed) return;

  let posts = [...allPosts];

  if (activeFilter === "Following") {
    posts = posts.filter(post => followedUsers.has(post.userId));
  } else if (activeFilter !== "all") {
    posts = posts.filter(post => post.category === activeFilter);
  }

  if (!posts.length) {
    feed.innerHTML = `
      <div class="feed-message">
        <div>
          <h2>Welcome to Rami 🇵🇰</h2>
          <p>Follow creators and share your first video!</p>
        </div>
      </div>`;
    return;
  }

  feed.innerHTML = posts.map(post => {
    const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
    const savedBy = Array.isArray(post.favoriteBy) ? post.favoriteBy : [];
    const comments = Array.isArray(post.comments) ? post.comments : [];

    const liked = currentUser && likedBy.includes(currentUser.uid);
    const saved = currentUser && savedBy.includes(currentUser.uid);
    const following = followedUsers.has(post.userId);
    const ownPost = currentUser?.uid === post.userId;

    const media = getPostMedia(post);
    const type = getPostType(post);

    let mediaHTML = "";

    if (media && type === "video") {
      mediaHTML = `
        <div class="post-media">
          <video src="${escapeHTML(media)}"
            playsinline webkit-playsinline muted loop
            preload="metadata"></video>
        </div>`;
    } else if (media && type === "image") {
      mediaHTML = `
        <div class="post-media">
          <img src="${escapeHTML(media)}"
            alt="Rami post" loading="lazy">
        </div>`;
    } else {
      mediaHTML = `
        <div class="post-no-media">
          <div>
            <h2>${escapeHTML(post.title || "Rami")}</h2>
            <p>${escapeHTML(post.text || post.description || "")}</p>
          </div>
        </div>`;
    }

    const description = post.text || post.description || "";

    return `
      <article class="rami-post" data-id="${escapeHTML(post.id)}">
        ${mediaHTML}
        <div class="post-shade"></div>

        <div class="post-info">
          <h3>@${escapeHTML(post.userName || "Rami Creator")}</h3>
          <p>${escapeHTML(post.title || description || "Welcome to Rami")}</p>
          ${post.title && description
            ? `<p>${escapeHTML(description)}</p>` : ""}
          <span class="post-category">
            #${escapeHTML(post.category || "Rami")}
          </span>
        </div>

        <div class="post-actions">
          ${type === "video" ? `
            <button class="sound-button" type="button">
              ${soundEnabled ? "🔊" : "🔇"}
              <small>${soundEnabled ? "Sound On" : "Sound Off"}</small>
            </button>` : ""}

          ${!ownPost ? `
            <button class="follow-button ${following ? "following" : ""}"
              data-id="${escapeHTML(post.userId)}">
              👤<small>${following ? "Following" : "Follow"}</small>
            </button>` : ""}

          <button class="like-button ${liked ? "liked" : ""}"
            data-id="${escapeHTML(post.id)}">
            ${liked ? "❤️" : "🤍"}
            <small>${Number(post.likes) || 0}</small>
          </button>

          <button class="comment-button" data-id="${escapeHTML(post.id)}">
            💬<small>${comments.length}</small>
          </button>

          <button class="favorite-button ${saved ? "favorited" : ""}"
            data-id="${escapeHTML(post.id)}">
            ${saved ? "⭐" : "☆"}<small>Save</small>
          </button>

          <button class="share-button" data-id="${escapeHTML(post.id)}">
            ↗<small>Share</small>
          </button>
        </div>

        <div class="comment-area">
          <div class="comments-list">
            ${comments.slice(-15).map(comment => `
              <p>
                <strong>${escapeHTML(comment.userName || "User")}:</strong>
                ${escapeHTML(comment.text || "")}
              </p>
            `).join("")}
          </div>
          <input class="comment-input"
            maxlength="500" placeholder="Write a comment...">
          <button class="comment-send" type="button">Send</button>
        </div>
      </article>`;
  }).join("");

  setupVideoObserver();
}

// ========================================
// FEED INTERACTIONS
// ========================================

$("feedList")?.addEventListener("click", event => {
  const button = event.target.closest("button");

  if (button) {
    const id = button.dataset.id;

    if (button.classList.contains("sound-button")) {
      const article = button.closest(".rami-post");
      const video = article?.querySelector("video");

      if (!video) return;

      soundEnabled = !soundEnabled;

      $("feedList").querySelectorAll("video").forEach(item => {
        item.muted = !soundEnabled;
      });

      button.innerHTML = soundEnabled
        ? "🔊<small>Sound On</small>"
        : "🔇<small>Sound Off</small>";

      if (video.paused) video.play().catch(() => {});
      return;
    }

    if (button.classList.contains("like-button")) {
      likePost(id);
      return;
    }

    if (button.classList.contains("follow-button")) {
      toggleFollow(id);
      return;
    }

    if (button.classList.contains("favorite-button")) {
      favoritePost(id);
      return;
    }

    if (button.classList.contains("share-button")) {
      sharePost(id);
      return;
    }

    if (button.classList.contains("comment-button")) {
      button.closest(".rami-post")
        ?.querySelector(".comment-area")
        ?.classList.toggle("open");
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

  const video = event.target.closest("video");

  if (video) {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }
});

// ========================================
// LIKE / UNLIKE
// ========================================

async function likePost(postId) {
  if (!requireLogin()) return;

  try {
    const ref = doc(db, "posts", postId);

    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) return;

      const data = snapshot.data();
      const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];

      const updated = likedBy.includes(currentUser.uid)
        ? likedBy.filter(id => id !== currentUser.uid)
        : [...likedBy, currentUser.uid];

      transaction.update(ref, {
        likedBy: updated,
        likes: updated.length
      });
    });

  } catch (error) {
    alert("Like error: " + error.message);
  }
}

// ========================================
// SAVE / UNSAVE POSTS
// ========================================

async function favoritePost(postId) {
  if (!requireLogin()) return;

  try {
    const ref = doc(db, "posts", postId);

    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) return;

      const data = snapshot.data();
      const savedBy = Array.isArray(data.favoriteBy)
        ? data.favoriteBy : [];

      const updated = savedBy.includes(currentUser.uid)
        ? savedBy.filter(id => id !== currentUser.uid)
        : [...savedBy, currentUser.uid];

      transaction.update(ref, { favoriteBy: updated });
    });

  } catch (error) {
    alert("Save error: " + error.message);
  }
}

// ========================================
// COMMENTS
// ========================================

async function addComment(postId, text) {
  if (!requireLogin()) return;

  text = text.trim();

  if (!text) {
    alert("Write a comment first.");
    return;
  }

  try {
    const ref = doc(db, "posts", postId);

    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) return;

      const comments = Array.isArray(snapshot.data().comments)
        ? [...snapshot.data().comments] : [];

      comments.push({
        userId: currentUser.uid,
        userName: displayName(),
        text: text.slice(0, 500),
        createdAt: new Date().toISOString()
      });

      transaction.update(ref, { comments });
    });

  } catch (error) {
    alert("Comment error: " + error.message);
  }
}

// ========================================
// FOLLOW SYSTEM
// ========================================

async function loadFollowedUsers() {
  if (!currentUser) return;

  const snapshot = await getDocs(collection(db, "follows"));

  followedUsers.clear();

  snapshot.forEach(item => {
    const data = item.data();

    if (data.followerId === currentUser.uid) {
      followedUsers.add(data.followingId);
    }
  });
}

async function toggleFollow(creatorId) {
  if (!requireLogin()) return;
  if (!creatorId || creatorId === currentUser.uid) return;

  const followId = `${currentUser.uid}_${creatorId}`;
  const ref = doc(db, "follows", followId);

  try {
    if (followedUsers.has(creatorId)) {
      await deleteDoc(ref);
      followedUsers.delete(creatorId);
    } else {
      await setDoc(ref, {
        followerId: currentUser.uid,
        followingId: creatorId,
        createdAt: serverTimestamp()
      });

      followedUsers.add(creatorId);
    }

    renderPosts();
    await loadCreators();
    await updateProfileStats();

  } catch (error) {
    alert("Follow error: " + error.message);
  }
}

// ========================================
// PROFILE STATISTICS
// ========================================

async function updateProfileStats() {
  if (!currentUser) return;

  try {
    const myPosts = allPosts.filter(
      post => post.userId === currentUser.uid
    );

    const likes = myPosts.reduce(
      (total, post) => total + (Number(post.likes) || 0),
      0
    );

    const snapshot = await getDocs(collection(db, "follows"));

    let followers = 0;
    let following = 0;

    snapshot.forEach(item => {
      const data = item.data();

      if (data.followingId === currentUser.uid) followers++;
      if (data.followerId === currentUser.uid) following++;
    });

    if ($("profileStats")) {
      $("profileStats").textContent =
        `${myPosts.length} Posts · ${followers} Followers · ${following} Following · ${likes} Likes`;
    }

    const counters = {
      followersCount: followers,
      followingCount: following,
      likesCount: likes,
      postsCount: myPosts.length
    };

    Object.entries(counters).forEach(([id, value]) => {
      if ($(id)) $(id).textContent = value;
    });

  } catch (error) {
    console.error("Stats error:", error);
  }
}

// ========================================
// CREATOR DISCOVERY + SEARCH
// ========================================

async function loadCreators() {
  if (!currentUser || !$("creatorList")) return;

  try {
    const snapshot = await getDocs(collection(db, "users"));

    if (snapshot.empty) {
      $("creatorList").textContent = "No creators yet.";
      return;
    }

    const search = $("creatorSearch")?.value
      .trim().toLowerCase() || "";

    const creators = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    })).filter(creator => {
      const name = (
        creator.name || creator.username || ""
      ).toLowerCase();

      return name.includes(search);
    });

    if (!creators.length) {
      $("creatorList").innerHTML =
        `<p class="rami-status">No creators found.</p>`;
      return;
    }

    $("creatorList").innerHTML = creators.map(creator => {
      const name = creator.name ||
        creator.username || "Rami Creator";

      const isMe = creator.id === currentUser.uid;
      const following = followedUsers.has(creator.id);

      return `
        <div class="rami-creator-card">
          <img src="${escapeHTML(
            creator.photoURL ||
            "https://placehold.co/100x100/29293b/ffffff?text=R"
          )}" alt="Creator">

          <div class="creator-info">
            <strong>${escapeHTML(name)}</strong>
            <p>${escapeHTML(creator.bio || "Rami Creator")}</p>
          </div>

          ${!isMe ? `
            <button class="creator-follow rami-extra-btn"
              data-id="${escapeHTML(creator.id)}">
              ${following ? "Following" : "Follow"}
            </button>` : "<small>You</small>"}
        </div>`;
    }).join("");

  } catch (error) {
    console.error("Creator error:", error);
    $("creatorList").textContent = error.message;
  }
}

$("creatorSearch")?.addEventListener("input", loadCreators);

$("creatorList")?.addEventListener("click", event => {
  const button = event.target.closest(".creator-follow");
  if (button) toggleFollow(button.dataset.id);
});

// ========================================
// PROFILE TABS: POSTS / SAVED / MEMORIES
// ========================================

function renderProfileTab() {
  const container = $("ramiProfileContent");
  if (!container || !currentUser) return;

  const myPosts = allPosts.filter(
    post => post.userId === currentUser.uid
  );

  let posts = myPosts;

  if (profileTab === "Saved") {
    posts = allPosts.filter(post =>
      Array.isArray(post.favoriteBy) &&
      post.favoriteBy.includes(currentUser.uid)
    );
  }

  if (profileTab === "Memories") {
    loadMemories();
    return;
  }

  if (!posts.length) {
    container.innerHTML =
      `<p class="rami-status">Your ${profileTab.toLowerCase()} will appear here.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="rami-profile-grid">
      ${posts.map(post => {
        const media = getPostMedia(post);
        const type = getPostType(post);

        let content = "";

        if (media && type === "video") {
          content = `<video src="${escapeHTML(media)}" controls playsinline></video>`;
        } else if (media && type === "image") {
          content = `<img src="${escapeHTML(media)}" alt="Post">`;
        } else {
          content = `<div class="rami-status">${escapeHTML(post.title || post.text || "Rami post")}</div>`;
        }

        return `
          <div class="rami-profile-post">
            ${content}
            <p>${escapeHTML(post.title || post.text || "Rami Post")}</p>
            <p>❤️ ${Number(post.likes) || 0}</p>
          </div>`;
      }).join("")}
    </div>`;
}

$("profilePanel")?.addEventListener("click", event => {
  const button = event.target.closest("[data-profile-tab]");
  if (!button) return;

  profileTab = button.dataset.profileTab;

  document.querySelectorAll("[data-profile-tab]")
    .forEach(tab => tab.classList.toggle(
      "active", tab.dataset.profileTab === profileTab
    ));

  renderProfileTab();
});

// ========================================
// SHARE POSTS
// ========================================

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
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(link);
      alert("Post link copied!");
    } else {
      prompt("Copy post link:", link);
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Share error:", error);
    }
  }
}

// ========================================
// MEMORIES
// ========================================

$("saveMemoryButton")?.addEventListener("click", async () => {
  if (!requireLogin()) return;

  const text = prompt("Write your memory:");

  if (!text || !text.trim()) return;

  try {
    await addDoc(collection(db, "memories"), {
      userId: currentUser.uid,
      text: text.trim().slice(0, 2000),
      createdAt: serverTimestamp()
    });

    message($("memoryMessage"), "Your memory is saved ❤️");

    await loadMemories();

  } catch (error) {
    message($("memoryMessage"), error.message);
  }
});

async function loadMemories() {
  if (!currentUser || !$("memoryList")) return;

  try {
    const snapshot = await getDocs(collection(db, "memories"));

    const memories = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => item.userId === currentUser.uid)
      .sort((a, b) =>
        (b.createdAt?.toMillis?.() || 0) -
        (a.createdAt?.toMillis?.() || 0)
      );

    if (!memories.length) {
      $("memoryList").innerHTML =
        "<p>Your saved memories will appear here.</p>";
      return;
    }

    $("memoryList").innerHTML = memories.map(memory => `
      <div>
        <p>${escapeHTML(memory.text)}</p>
        <small>Saved on Rami ❤️</small>
      </div>
    `).join("");

    if (profileTab === "Memories" && $("ramiProfileContent")) {
      $("ramiProfileContent").innerHTML = memories.map(memory => `
        <div class="rami-status">
          ${escapeHTML(memory.text)}
          <p><small>Saved on Rami ❤️</small></p>
        </div>
      `).join("");
    }

  } catch (error) {
    message($("memoryMessage"), error.message);
  }
}

// ========================================
// CATEGORY FILTERS
// ========================================

document.querySelectorAll(".categories button[data-filter]")
  .forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter || "all";

      document.querySelectorAll(".categories button[data-filter]")
        .forEach(item => item.classList.remove("active"));

      button.classList.add("active");

      renderPosts();

      if ($("feedList")) $("feedList").scrollTop = 0;
    });
  });

// ========================================
// NAVIGATION BUTTONS
// ========================================

document.querySelectorAll(".bottom-nav button[data-page]")
  .forEach(button => {
    button.addEventListener("click", () => {
      navigateTo(button.dataset.page);
    });
  });

document.querySelectorAll(".categories button[data-page]")
  .forEach(button => {
    button.addEventListener("click", () => {
      navigateTo(button.dataset.page);
    });
  });

$("profileButton")?.addEventListener("click", () => {
  navigateTo("Profile");
});

// ========================================
// START RAMI
// ========================================

installRamiStyles();
prepareExtraInterface();
navigateTo("Home");

console.log("RAMI Professional Edition initialized 🇵🇰");
