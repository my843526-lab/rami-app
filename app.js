
const categoryButtons = document.querySelectorAll(".categories button");
const navButtons = document.querySelectorAll("nav button");
const feed = document.querySelector(".feed");
const sectionTitle = document.querySelector(".section-title");
const mediaPicker = document.getElementById("mediaPicker");

function showPage(title, icon, text) {
  sectionTitle.textContent = title;
  feed.innerHTML = `
    <div class="video-placeholder">${icon}</div>
    <h3>${title}</h3>
    <p>${text}</p>
  `;
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
    text: "Funny videos, creative clips and entertainment will appear here."
  },
  "Memories": {
    title: "Your Memories",
    icon: "💖",
    text: "A special place for your photos, videos and favorite moments."
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

    if (page === "Create") {
      mediaPicker.click();
    }

    if (page === "Memories") {
      showPage(
        "Your Memories",
        "💖",
        "Your special photos and videos can be selected here. Saving them to an account will be added later."
      );
    }

    if (page === "Profile") {
      showPage(
        "Your Profile",
        "👤",
        "Your profile, posts and creator information will appear here."
      );
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
