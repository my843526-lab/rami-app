
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#101018">
  <meta name="description" content="Rami - Pakistan's creative community. Discover creators, share videos and save memories.">
  <title>Rami - Your World</title>
  <link rel="stylesheet" href="style.css">
</head>

<body>

  <!-- HEADER -->
  <header class="rami-header">
    <div class="brand">
      <h2>Rami ✦</h2>
      <p>Your world. Your people.</p>
    </div>
    <button id="profileButton" type="button">Profile</button>
  </header>

  <!-- LOGIN / SIGNUP -->
  <section id="authPanel" class="auth-panel">
    <h2>Welcome to Rami 🇵🇰</h2>
    <p>Join Pakistan's creative community</p>

    <input id="authName" type="text" placeholder="Your name" autocomplete="name">
    <input id="authEmail" type="email" placeholder="Email address" autocomplete="email">
    <input id="authPassword" type="password" placeholder="Password" autocomplete="current-password">

    <div class="auth-actions">
      <button id="signupButton" type="button">Sign Up</button>
      <button id="loginButton" type="button">Login</button>
    </div>

    <p id="authMessage" aria-live="polite"></p>
  </section>

  <!-- ACCOUNT -->
  <section id="accountPanel" class="account-panel" hidden>
    <span id="welcomeUser">Welcome!</span>
    <span id="userEmail"></span>
    <button id="logoutButton" type="button">Log Out</button>
  </section>

  <main>

    <!-- HOME -->
    <section class="feed-top">
      <div class="categories">
        <button type="button" data-filter="Knowledge">STEM</button>
        <button type="button" data-filter="Entertainment">Community</button>
        <button type="button" data-filter="Following">Following</button>
        <button type="button" data-filter="all" class="active">For You</button>
        <button type="button" data-page="Discover">Search</button>
      </div>
    </section>

    <section class="welcome">
      <h2>Welcome to Rami 🇵🇰</h2>
      <p>Learn, create, share your talent and grow together.</p>
    </section>

    <section id="homeFeed" class="home-feed">
      <div class="feed-heading">
        <h2>Discover your world</h2>
        <p>Videos, stories and inspiring people.</p>
      </div>

      <div id="feedList" class="feed-list"></div>
    </section>

    <!-- CREATE -->
    <section id="createPanel" class="create-panel" hidden>
      <h2>Create on Rami ✨</h2>
      <p>Share your talent with Pakistan.</p>

      <input id="postTitle" type="text" placeholder="Post title">

      <select id="postCategory">
        <option value="Knowledge">STEM / Knowledge</option>
        <option value="Entertainment">Community / Entertainment</option>
        <option value="Memories">Memories</option>
      </select>

      <textarea id="postText" placeholder="What would you like to share?"></textarea>

      <label for="postMedia">Choose a video or photo</label>
      <input id="postMedia" type="file" accept="video/*,image/*">

      <input id="postVideoUrl" type="url" placeholder="Video URL (optional)">

      <button id="publishButton" type="button">Publish Post</button>
      <p id="postMessage" aria-live="polite"></p>
    </section>

    <!-- DISCOVER -->
    <section id="discoverPanel" class="discover-panel" hidden>

      <div class="discover-header">
        <h2>Discover Rami 🌍</h2>
        <p>Find creators, explore videos and discover what's happening.</p>
      </div>

      <!-- CREATOR SEARCH -->
      <section class="discover-section" id="creatorSearchSection">
        <h3>Find Your Creators 🔎</h3>
        <p>Search people and discover talented creators.</p>

        <input
          id="creatorSearch"
          class="rami-search"
          type="search"
          placeholder="Search name, username or bio..."
          autocomplete="off"
          aria-label="Search Rami creators"
        >

        <div id="creatorSearchStatus" aria-live="polite"></div>

        <div class="discover-subheading">
          <h4>Creators on Rami</h4>
          <span>People to discover</span>
        </div>

        <div id="creatorList"></div>
      </section>

      <!-- TRENDING CONTENT -->
      <section class="discover-section" id="trendingSection">
        <h3>Trending on Rami 🔥</h3>
        <p>Popular content from the Rami community.</p>

        <div id="discoverTrendingPosts">
          <p class="rami-status">Trending posts will appear here.</p>
        </div>
      </section>

      <!-- POPULAR CREATORS -->
      <section class="discover-section" id="popularCreatorsSection">
        <h3>Popular Creators ⭐</h3>
        <p>Meet creators making an impact.</p>

        <div id="discoverPopularCreators">
          <p class="rami-status">Popular creators will appear here.</p>
        </div>
      </section>

      <!-- NEW CREATORS -->
      <section class="discover-section" id="newCreatorsSection">
        <h3>New on Rami ✨</h3>
        <p>Discover fresh talent and new faces.</p>

        <div id="discoverNewCreators">
          <p class="rami-status">New creators will appear here.</p>
        </div>
      </section>

      <!-- CATEGORIES -->
      <section class="discover-section" id="discoverCategoriesSection">
        <h3>Explore Categories 📚</h3>
        <p>Find content according to your interests.</p>

        <div id="discoverCategories" class="discover-category-grid">
          <div class="discover-category">📚<span>Education</span></div>
          <div class="discover-category">😂<span>Comedy</span></div>
          <div class="discover-category">🎬<span>Entertainment</span></div>
          <div class="discover-category">⚽<span>Sports</span></div>
          <div class="discover-category">💻<span>Technology</span></div>
          <div class="discover-category">🌙<span>Islamic Content</span></div>
          <div class="discover-category">🌍<span>Lifestyle</span></div>
          <div class="discover-category">🤝<span>Community</span></div>
        </div>
      </section>

      <!-- TRENDING HASHTAGS -->
      <section class="discover-section" id="trendingHashtagsSection">
        <h3>Trending Topics #️⃣</h3>
        <p>Explore what people are talking about.</p>

        <div id="discoverHashtags">
          <p class="rami-status">Trending topics will appear here.</p>
        </div>
      </section>

    </section>

    <!-- PROFILE -->
    <section id="profilePanel" class="profile-panel" hidden>
      <h2>Your Profile</h2>

      <h3 id="profileName">Rami Creator</h3>
      <p id="profileStats">Your journey starts here.</p>

      <h3>My Memories ❤️</h3>
      <button id="saveMemoryButton" type="button">Save a Memory</button>
      <p id="memoryMessage" aria-live="polite"></p>
      <div id="memoryList"></div>
    </section>

  </main>

  <!-- BOTTOM NAVIGATION -->
  <nav class="bottom-nav" aria-label="Main navigation">
    <button type="button" data-page="Home">
      ⌂<span>Home</span>
    </button>

    <button type="button" data-page="Discover">
      ♧<span>Discover</span>
    </button>

    <button type="button" data-page="Create">
      ＋<span>Create</span>
    </button>

    <button type="button" data-page="Memories">
      ♡<span>Memories</span>
    </button>

    <button type="button" data-page="Profile">
      ♙<span>Profile</span>
    </button>
  </nav>

  <script type="module" src="app.js"></script>

</body>
</html>
