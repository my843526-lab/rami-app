// Rami - Firebase Connected App

const categoryButtons = document.querySelectorAll(".categories button");
const navButtons = document.querySelectorAll("nav button");
const feed = document.querySelector(".feed");
const sectionTitle = document.querySelector(".section-title");
const mediaPicker = document.getElementById("mediaPicker");

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

let db = null;
let firebaseModules = null;

// Connect to Firebase
const firebaseReady = (async () => {
  try {
    const appModule = await import(
      "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js"
    );

    const firestoreModule = await import(
      "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js"
    );

    const app = appModule.initializeApp(firebaseConfig);
    db = firestoreModule.getFirestore(app);
    firebaseModules = firestoreModule;

    console.log("Rami Firebase connected!");
  } catch (error) {
    console.error("Firebase connection error:", error);
  }
})();

// Safe text for HTML
function safeText(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// Create a stable Firestore document ID
function makePostId(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "rami-post";
}

// Save or load post data
async function getPostData(postId, title, description) {
  await firebaseReady;

  if (!db) {
    return { likes: 0, comments: [] };
  }

  const { doc, getDoc, setDoc } = firebaseModules;
  const postRef = doc(db, "posts", postId);

  try {
    const snapshot = await getDoc(postRef);

    if (!snapshot.exists()) {
      await setDoc(postRef, {
        title,
        description,
        likes: 0,
        comments: [],
        createdAt: new Date().toISOString()
      });

      return { likes: 0, comments: [] };
    }

    return snapshot.data();
  } catch (error) {
    console.error("Could not load post:", error);
    return { likes: 0, comments: [] };
  }
}

// Render a Rami post
async function renderPost(title, description) {
  const postId = makePostId(title);

  feed.innerHTML = `
    <div class="video-placeholder">▶️</div>
    <h3>${safeText(title)}</h3>
    <p>${safeText(description)}</p>
    <div class="post-actions">
      <button type="button" class="like-btn">
        ❤️ Like <span>0</span>
      </button>
      <button type="button" class="comment-btn">💬 Comment</button>
      <button type="button" class="share-btn">🔗 Share</button>
    </div>
    <div class="comments-list"></div>
  `;

  const likeButton = feed.querySelector(".like-btn");
  const likeCount = likeButton.querySelector("span");
  const commentButton = feed.querySelector(".comment-btn");
  const shareButton = feed.querySelector(".share-btn");
  const commentsList = feed.querySelector(".comments-list");

  let liked = false;
  let postData = await getPostData(postId, title, description);

  // Don't update an old page if user has navigated elsewhere
  if (!feed.querySelector(".like-btn")) return;

  let count = Number(postData.likes) || 0;
  likeCount.textContent = count;

  function showComments(comments) {
    commentsList.innerHTML = "";

    (comments || []).forEach(comment => {
      const item = document.createElement("p");
      item.textContent = "💬 " + comment;
      commentsList.appendChild(item);
    });
  }

  showComments(postData.comments);

  // Like button
  likeButton.addEventListener("click", async () => {
    liked = !liked;
    likeButton.firstChild.textContent = liked ? "❤️ Liked " : "🤍 Like ";

    await firebaseReady;

    if (!db) {
      count = Math.max(0, count + (liked ? 1 : -1));
      likeCount.textContent = count;
      return;
    }

    try {
      const { doc, runTransaction } = firebaseModules;
      const postRef = doc(db, "posts", postId);

      count = await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(postRef);
        const currentLikes = snapshot.exists()
          ? Number(snapshot.data().likes) || 0
          : 0;

        const newLikes = Math.max(
          0,
          currentLikes + (liked ? 1 : -1)
        );

        transaction.update(postRef, { likes: newLikes });
        return newLikes;
      });

      likeCount.textContent = count;
    } catch (error) {
      console.error("Like save error:", error);
      alert("Like save nahi ho saka. Firestore rules check karein.");
    }
  });

  // Comment button
  commentButton.addEventListener("click", async () => {
    const comment = prompt("Rami par apna comment likhein:");

    if (!comment || !comment.trim()) return;

    const cleanComment = comment.trim();

    await firebaseReady;

    if (!db) {
      const item = document.createElement("p");
      item.textContent = "💬 " + cleanComment;
      commentsList.appendChild(item);
      return;
    }

    try {
      const { doc, updateDoc, arrayUnion } = firebaseModules;
      const postRef = doc(db, "posts", postId);

      await updateDoc(postRef, {
        comments: arrayUnion(cleanComment)
      });

      const item = document.createElement("p");
      item.textContent = "💬 " + cleanComment;
      commentsList.appendChild(item);
    } catch (error) {
      console.error("Comment save error:", error);
      alert("Comment save nahi ho saka. Firestore rules check karein.");
    }
  });

  // Share button
  shareButton.addEventListener("click", async () => {
    const shareText = "Check out Rami - Your world, your memories!";

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Rami",
          text: shareText,
          url: window.location.href
        });
      } catch (error) {
        // Share window closed
      }
    } else {
      alert(shareText + "\n" + window.location.href);
    }
  });
}

// Show page
function showPage(title, icon, text) {
  sectionTitle.textContent = title;
  renderPost(title, text);

  const placeholder = feed.querySelector(".video-placeholder");
  if (placeholder) placeholder.textContent = icon;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Categories
const categories = {
  "For You": {
    title: "Your Rami Feed",
    icon: "▶️",
    text: "Discover videos, stories and inspiring people on Rami."
  },
  "Knowledge": {
    title: "Learn Something New",
    icon: "📚",
    text: "Knowledge videos and useful tips will appear here."
  },
  "Entertainment": {
    title: "Enjoy & Have Fun",
    icon: "🎉",
    text: "Funny videos, creative clips and entertainment."
  },
  "Memories": {
    title: "Your Memories",
    icon: "💖",
    text: "Your photos, videos and favorite moments."
  },
  "Live": {
    title: "Rami Live",
    icon: "🔴",
    text: "Live streaming will be added in a future update."
  }
};

// Category buttons
categoryButtons.forEach(button => {
  button.addEventListener("click", () => {
    categoryButtons.forEach(item => item.classList.remove("active"));
    button.classList.add("active");

    const selected = categories[button.textContent.trim()];

    if (selected) {
      showPage(selected.title, selected.icon, selected.text);
    }
  });
});

// Navigation buttons
navButtons.forEach(button => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;

    if (page === "Home") {
      categoryButtons.forEach(item => item.classList.remove("active"));
      if (categoryButtons[0]) categoryButtons[0].classList.add("active");

      showPage(
        "Your Rami Feed",
        "▶️",
        "Welcome back! Discover videos, knowledge and memories."
      );
    }

    if (page === "Discover") {
      showPage(
        "Discover Rami",
        "🔎",
        "Explore new creators, trending videos and interesting topics."
      );
    }

    if (page === "Create" && mediaPicker) {
      mediaPicker.click();
    }

    if (page === "Memories") {
      showPage("Your Memories", "💖", "Your special photos and videos.");
    }

    if (page === "Profile") {
      showPage(
        "Your Profile",
        "👤",
        "Your profile, posts and creator information."
      );
    }
  });
});

// Photo/video preview
if (mediaPicker) {
  mediaPicker.addEventListener("change", () => {
    const file = mediaPicker.files[0];
    if (!file) return;

    const fileURL = URL.createObjectURL(file);
    sectionTitle.textContent = "Create on Rami";

    if (file.type.startsWith("image/")) {
      feed.innerHTML = `
        <h3>Photo selected</h3>
        <img src="${fileURL}" alt="Selected photo">
        <p>${safeText(file.name)}</p>
        <p>This is a local preview. Online upload will be added later.</p>
      `;
    } else if (file.type.startsWith("video/")) {
      feed.innerHTML = `
        <h3>Video selected</h3>
        <video src="${fileURL}" controls></video>
        <p>${safeText(file.name)}</p>
        <p>This is a local preview. Online upload will be added later.</p>
      `;
    }
  });
}

// First feed post
renderPost(
  "Welcome to Rami 🇵🇰",
  "Your world, your memories. Share, learn and grow together!"
);
