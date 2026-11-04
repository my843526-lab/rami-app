
const categoryButtons = document.querySelectorAll(".categories button");
const navButtons = document.querySelectorAll("nav button");
const feed = document.querySelector(".feed");
const sectionTitle = document.querySelector(".section-title");
const mediaPicker = document.getElementById("mediaPicker");

function renderPost(title, description) {
  feed.innerHTML = `
    <div class="video-placeholder">▶️</div>
    <h3>${title}</h3>
    <p>${description}</p>
    <div class="post-actions">
      <button type="button" class="like-btn">❤️ Like <span>0</span></button>
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
  let count = 0;

  likeButton.addEventListener("click", () => {
    liked = !liked;
    count = liked ? 1 : 0;
    likeCount.textContent = count;
    likeButton.textContent = liked ? "❤️ Liked " : "🤍 Like ";
    likeButton.append(likeCount);
  });

  commentButton.addEventListener("click", () => {
    const comment = prompt("Rami par apna comment likhein:");
    if (!comment || !comment.trim()) return;

    const commentItem = document.createElement("p");
    commentItem.textContent = "💬 " + comment.trim();
    commentsList.appendChild(commentItem);
  });

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

function showPage(title, icon, text) {
  sectionTitle.textContent = title;
  renderPost(title, text);
  const placeholder = feed.querySelector(".video-placeholder");
  if (placeholder) placeholder.textContent = icon;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

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

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;

    if (page === "Home") {
      categoryButtons.forEach(item => item.classList.remove("active"));
      categoryButtons[0].classList.add("active");
      showPage("Your Rami Feed", "▶️",
        "Welcome back! Discover videos, knowledge and memories.");
    }

    if (page === "Discover") {
      showPage("Discover Rami", "🔎",
        "Explore new creators, trending videos and interesting topics.");
    }

    if (page === "Create") {
      mediaPicker.click();
    }

    if (page === "Memories") {
      showPage("Your Memories", "💖",
        "Your special photos and videos.");
    }

    if (page === "Profile") {
      showPage("Your Profile", "👤",
        "Your profile, posts and creator information.");
    }
  });
});

mediaPicker.addEventListener("change", () => {
  const file = mediaPicker.files[0];
  if (!file) return;

  const fileURL = URL.createObjectURL(file);
  sectionTitle.textContent = "Create on Rami";

  if (file.type.startsWith("image/")) {
    feed.innerHTML = `
      <h3>Photo selected</h3>
      <img src="${fileURL}" alt="Selected photo">
      <p>${file.name}</p>
      <p>This is a local preview. Posting online will be added later.</p>
    `;
  } else if (file.type.startsWith("video/")) {
    feed.innerHTML = `
      <h3>Video selected</h3>
      <video src="${fileURL}" controls></video>
      <p>${file.name}</p>
      <p>This is a local preview. Posting online will be added later.</p>
    `;
  }
});

// Show the first feed post when Rami opens
renderPost(
  "Welcome to Rami 🇵🇰",
  "Your world, your memories. Share, learn and grow together!"
);
