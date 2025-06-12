// Ensure the DOM is fully loaded before running any script
document.addEventListener("DOMContentLoaded", () => {
  // --- 1. Element References ---
  // Centralized collection of all DOM elements used in the script.
  // This makes it easy to see what elements are being manipulated.

  // Top Bar Elements
  const searchInput = document.getElementById("searchInput");
  const userProfilePic = document.getElementById("userProfilePic");

  // Left Sidebar Navigation Elements
  const navHome = document.querySelector(
    ".sidebar-nav-main .nav-item-main[data-section='homeSection']"
  );
  const navSearch = document.querySelector(
    ".sidebar-nav-main .nav-item-main[data-section='exploreSection']"
  );
  const navLibrary = document.querySelector(
    ".sidebar-nav-main .nav-item-main[data-section='yourLibrarySection']"
  );
  const navPlayQueue = document.querySelector(
    ".sidebar-nav-main .nav-item-main[data-section='playQueueSection']"
  );
  const navSettings = document.querySelector(
    ".sidebar-nav-main .nav-item-main[data-section='settingsSection']"
  );
  const navItemsMain = document.querySelectorAll(
    ".sidebar-nav-main .nav-item-main"
  ); // All main nav items

  // Main Content Section Elements
  const contentSections = document.querySelectorAll(
    ".main-content-area .content-section"
  );

  // Audio Player Elements
  const audioPlayer = document.getElementById("audioPlayer");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const playPauseIcon = playPauseBtn.querySelector("i");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const repeatBtn = document.getElementById("repeatBtn");
  const progressBar = document.getElementById("progressBar");
  const currentTimeSpan = document.getElementById("currentTime");
  const durationSpan = document.getElementById("duration");
  const volumeSlider = document.getElementById("volumeSlider");
  const currentVolumeIcon = document.getElementById("currentVolumeIcon");
  let lastVolume = 1; // To store volume before mute

  // Song Info Elements
  const currentAlbumArt = document.getElementById("currentAlbumArt");
  const currentSongTitle = document.getElementById("currentSongTitle");
  const currentSongArtist = document.getElementById("currentSongArtist");
  const favoriteToggleBtn = document.getElementById("favoriteToggleBtn");
  const favoriteToggleIcon = favoriteToggleBtn.querySelector("i");

  // Visualizer Elements
  const visualizerCanvas = document.getElementById("visualizerCanvas");
  const visualizerPlaceholder = document.getElementById("visualizerPlaceholder");
  const visualizerToggleBtn = document.getElementById("visualizerToggleBtn");
  let audioContext = null;
  let analyser = null;
  let source = null;
  let canvasContext = null;
  let visualizerActive = false;
  let animationFrameId;

  // Equalizer Elements
  const eqSliders = document.querySelectorAll(".eq-slider");
  const resetEqBtn = document.getElementById("resetEqBtn");
  let gainNodes = []; // Array to hold BiquadFilterNode for each EQ band

  // Upload Elements (Play Queue Section)
  const fileInput = document.getElementById("fileInput");
  const customUploadBtn = document.getElementById("customUploadBtn");
  const playQueueList = document.querySelector(".play-queue-list");
  let playQueue = [];
  let currentSongIndex = -1;

  // Playback Speed Elements (Settings Section)
  const playbackSpeedSlider = document.getElementById("playbackSpeed");
  const playbackSpeedValue = document.getElementById("playbackSpeedValue");

  // Sleep Timer Elements (Settings Section)
  const sleepTimerSelect = document.getElementById("sleepTimerSelect");
  let sleepTimerTimeoutId = null;

  // Visualizer Display Element (Settings Section)
  const visualizerDisplaySelect = document.getElementById(
    "visualizerDisplaySelect"
  );

  // --- 2. Playback Control Functions ---

  /**
   * Toggles between play and pause states for the audio player.
   * Updates the play/pause icon accordingly.
   */
  function togglePlayPause() {
    if (audioPlayer.paused) {
      if (currentSongIndex === -1 && playQueue.length > 0) {
        // If nothing is loaded but queue exists, load the first song
        currentSongIndex = 0;
        loadSong(playQueue[currentSongIndex]);
      }
      if (audioPlayer.src) {
        audioPlayer.play();
        playPauseIcon.classList.remove("fa-play");
        playPauseIcon.classList.add("fa-pause");
        startVisualizer();
        displayMessage("Playing: " + currentSongTitle.textContent);
      } else {
        displayMessage("No song loaded. Add songs to the Play Queue.");
      }
    } else {
      audioPlayer.pause();
      playPauseIcon.classList.remove("fa-pause");
      playPauseIcon.classList.add("fa-play");
      stopVisualizer();
      displayMessage("Paused: " + currentSongTitle.textContent);
    }
  }

  /**
   * Plays the next song in the queue.
   * If at the end of the queue, handles repeat or stops.
   */
  function playNextSong() {
    if (playQueue.length === 0) return;

    let nextIndex = currentSongIndex + 1;

    if (repeatBtn.classList.contains("active")) {
      // If repeat is active, play current song again
      nextIndex = currentSongIndex;
    } else if (shuffleBtn.classList.contains("active")) {
      // If shuffle is active, pick a random song
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * playQueue.length);
      } while (newIndex === currentSongIndex && playQueue.length > 1); // Avoid playing same song again if queue > 1
      nextIndex = newIndex;
    } else {
      // Normal progression
      if (nextIndex >= playQueue.length) {
        nextIndex = 0; // Loop back to start if not repeating single
        audioPlayer.pause(); // Pause if reached end of queue and not looping all
        playPauseIcon.classList.remove("fa-pause");
        playPauseIcon.classList.add("fa-play");
        stopVisualizer();
        displayMessage("Queue finished.");
        currentSongIndex = -1; // Reset current song index
        updateSongInfo({ title: "Song Title", artist: "Artist Name" }); // Clear info
        currentAlbumArt.src = "./images/haim-album.png"; // Reset album art
        return;
      }
    }

    currentSongIndex = nextIndex;
    loadSong(playQueue[currentSongIndex]);
    audioPlayer.play();
    playPauseIcon.classList.remove("fa-play");
    playPauseIcon.classList.add("fa-pause");
    startVisualizer();
    displayMessage("Playing next: " + currentSongTitle.textContent);
  }

  /**
   * Plays the previous song in the queue.
   * If at the beginning, loops to the end.
   */
  function playPrevSong() {
    if (playQueue.length === 0) return;

    if (audioPlayer.currentTime > 3) {
      // If song is more than 3 seconds in, restart current song
      audioPlayer.currentTime = 0;
      displayMessage("Restarting current song.");
      return;
    }

    let prevIndex = currentSongIndex - 1;
    if (prevIndex < 0) {
      prevIndex = playQueue.length - 1; // Loop back to end
    }
    currentSongIndex = prevIndex;
    loadSong(playQueue[currentSongIndex]);
    audioPlayer.play();
    playPauseIcon.classList.remove("fa-play");
    playPauseIcon.classList.add("fa-pause");
    startVisualizer();
    displayMessage("Playing previous: " + currentSongTitle.textContent);
  }

  /**
   * Loads a song into the audio player and updates song information.
   * @param {object} song - The song object containing src, title, artist, and albumArt.
   */
  function loadSong(song) {
    audioPlayer.src = song.src;
    updateSongInfo(song);
    // Ensure visualizer is ready if context is running
    if (audioContext && audioContext.state === "running" && source) {
      source.disconnect(); // Disconnect old source
    }
    setupAudioContext(); // Re-setup context to connect new source
    if (visualizerActive) {
      startVisualizer(); // Restart visualizer for new song
    }
    displayMessage("Loaded: " + song.title);
  }

  /**
   * Updates the displayed song title, artist, and album art.
   * @param {object} song - The song object.
   */
  function updateSongInfo(song) {
    currentSongTitle.textContent = song.title;
    currentSongArtist.textContent = song.artist;
    currentAlbumArt.src = song.albumArt || "./images/haim-album.png"; // Fallback image
  }

  /**
   * Toggles shuffle mode on/off.
   * Updates button appearance.
   */
  function toggleShuffle() {
    shuffleBtn.classList.toggle("active");
    if (shuffleBtn.classList.contains("active")) {
      displayMessage("Shuffle ON");
    } else {
      displayMessage("Shuffle OFF");
    }
  }

  /**
   * Toggles repeat mode on/off.
   * Updates button appearance.
   */
  function toggleRepeat() {
    repeatBtn.classList.toggle("active");
    if (repeatBtn.classList.contains("active")) {
      displayMessage("Repeat ON");
    } else {
      displayMessage("Repeat OFF");
    }
  }

  /**
   * Updates the progress bar and current time display.
   */
  function updateProgressBar() {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressBar.value = progress;
    progressBar.style.setProperty("--progress", `${progress}%`);
    currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
  }

  /**
   * Handles user seeking by dragging the progress bar.
   */
  function seekAudio() {
    const seekTime = (progressBar.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
  }

  /**
   * Formats time from seconds to a human-readable MM:SS format.
   * @param {number} seconds - The time in seconds.
   * @returns {string} Formatted time string.
   */
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  }

  /**
   * Updates the volume icon based on the current volume level.
   */
  function updateVolumeIcon() {
    const volume = audioPlayer.volume;
    const icon = currentVolumeIcon.querySelector("i");
    icon.classList.remove(
      "fa-volume-mute",
      "fa-volume-down",
      "fa-volume-up"
    );
    if (volume === 0) {
      icon.classList.add("fa-volume-mute");
    } else if (volume < 0.5) {
      icon.classList.add("fa-volume-down");
    } else {
      icon.classList.add("fa-volume-up");
    }
  }

  /**
   * Toggles mute/unmute.
   */
  function toggleMute() {
    if (audioPlayer.volume === 0) {
      audioPlayer.volume = lastVolume; // Restore last volume
    } else {
      lastVolume = audioPlayer.volume; // Save current volume
      audioPlayer.volume = 0; // Mute
    }
    volumeSlider.value = audioPlayer.volume;
    updateVolumeIcon();
  }

  /**
   * Displays a message to the user (currently logs to console).
   * @param {string} message - The message to display.
   */
  function displayMessage(message) {
    console.log("[Timve Message]: " + message);
    // Future enhancement: Add a custom UI element for messages
  }

  // --- 3. UI Navigation Functions ---

  /**
   * Shows the specified content section and hides others.
   * Updates active state of navigation items.
   * @param {string} sectionId - The ID of the section to show (e.g., "homeSection").
   */
  function showMainContentSection(sectionId) {
    contentSections.forEach((section) => {
      section.classList.remove("active");
    });
    document.getElementById(sectionId).classList.add("active");

    navItemsMain.forEach((item) => {
      item.classList.remove("active");
      if (item.dataset.section === sectionId) {
        item.classList.add("active");
      }
    });

    // Special handling for Play Queue section to show file input
    if (sectionId === "playQueueSection") {
      if (fileInput) fileInput.style.display = "block";
      if (customUploadBtn) customUploadBtn.style.display = "inline-block";
    } else {
      if (fileInput) fileInput.style.display = "none";
      if (customUploadBtn) customUploadBtn.style.display = "none";
    }

    displayMessage("Navigated to: " + sectionId.replace("Section", ""));
  }

  // --- 4. Play Queue and Upload Functions ---

  /**
   * Handles file selection from the input.
   * @param {Event} event - The file input change event.
   */
  function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    displayMessage(`Processing ${files.length} file(s)...`);

    // Reset queue if new files are selected and not adding to existing
    // For now, let's just add to the end of the queue
    // playQueue = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("audio/")) {
        const url = URL.createObjectURL(file);
        const newSong = {
          src: url,
          title: file.name.split(".")[0], // Use filename as title
          artist: "Unknown Artist", // Placeholder
          albumArt: "./images/haim-album.png", // Default album art
        };
        playQueue.push(newSong);
        displayMessage(`Added to queue: ${newSong.title}`);
      } else {
        displayMessage(`Skipped non-audio file: ${file.name}`);
      }
    });
    updatePlayQueueUI();
    if (currentSongIndex === -1 && playQueue.length > 0) {
      currentSongIndex = 0; // Load the first song if queue was empty
      loadSong(playQueue[currentSongIndex]);
      togglePlayPause(); // Start playing
    }
  }

  /**
   * Updates the display of songs in the play queue UI.
   */
  function updatePlayQueueUI() {
    playQueueList.innerHTML = ""; // Clear existing list
    if (playQueue.length === 0) {
      playQueueList.innerHTML = "<p style='text-align: center; color: #888;'>Your queue is empty. Add some songs!</p>";
      return;
    }

    playQueue.forEach((song, index) => {
      const queueItem = document.createElement("div");
      queueItem.classList.add("queue-item");
      if (index === currentSongIndex) {
        queueItem.classList.add("active-song");
      }
      queueItem.innerHTML = `
        <img src="${song.albumArt || "./images/haim-album.png"}" alt="Album Art">
        <div class="song-details">
          <h4>${song.title}</h4>
          <p>${song.artist}</p>
        </div>
        <button class="remove-btn" data-index="${index}"><i class="fas fa-times-circle"></i></button>
      `;
      queueItem.addEventListener("click", (event) => {
        if (!event.target.closest(".remove-btn")) {
          // Play song if not clicking remove button
          currentSongIndex = index;
          loadSong(song);
          audioPlayer.play();
          playPauseIcon.classList.remove("fa-play");
          playPauseIcon.classList.add("fa-pause");
          startVisualizer();
          updatePlayQueueUI(); // Highlight active song
        }
      });
      playQueueList.appendChild(queueItem);
    });

    // Add event listeners to remove buttons
    document.querySelectorAll(".remove-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        const indexToRemove = parseInt(event.target.dataset.index);
        removeSongFromQueue(indexToRemove);
      });
    });
  }

  /**
   * Removes a song from the play queue by its index.
   * @param {number} index - The index of the song to remove.
   */
  function removeSongFromQueue(index) {
    if (index === currentSongIndex) {
      audioPlayer.pause();
      playPauseIcon.classList.remove("fa-pause");
      playPauseIcon.classList.add("fa-play");
      stopVisualizer();
      displayMessage("Removed currently playing song.");
      // Decide whether to play next or clear
      if (playQueue.length > 1) {
        if (index < playQueue.length - 1) {
          // If not last song, move currentSongIndex to stay with the next song
          currentSongIndex = index; // The song that was at index + 1 is now at index
        } else {
          currentSongIndex = 0; // If last song, go to beginning of new queue
        }
        playQueue.splice(index, 1);
        loadSong(playQueue[currentSongIndex]);
        togglePlayPause();
      } else {
        playQueue = []; // Clear queue if only one song was left
        currentSongIndex = -1;
        audioPlayer.src = ""; // Clear audio source
        updateSongInfo({ title: "Song Title", artist: "Artist Name" });
        currentAlbumArt.src = "./images/haim-album.png";
      }
    } else if (index < currentSongIndex) {
      playQueue.splice(index, 1);
      currentSongIndex--; // Adjust current song index if a song before it was removed
    } else {
      playQueue.splice(index, 1);
    }
    updatePlayQueueUI();
    displayMessage(`Song removed from queue.`);
  }

  // --- 5. Favorite Song Functionality ---

  /**
   * Toggles the favorite status of the current song.
   * (Placeholder: In a real app, this would interact with a backend or local storage)
   */
  function toggleFavoriteSong() {
    favoriteToggleIcon.classList.toggle("fa-regular"); // Outline heart
    favoriteToggleIcon.classList.toggle("fa-solid"); // Solid heart
    favoriteToggleIcon.classList.toggle("active");

    if (favoriteToggleIcon.classList.contains("active")) {
      displayMessage("Added to favorites!");
    } else {
      displayMessage("Removed from favorites.");
    }
  }

  /**
   * Updates the favorite button's state based on the current song.
   * (Placeholder: In a real app, this would check if the current song is favorited)
   */
  function updateFavoriteButton() {
    // For now, reset to not favorited when new song loads or app initializes
    favoriteToggleIcon.classList.remove("fa-solid", "active");
    favoriteToggleIcon.classList.add("fa-regular");
  }

  // --- 6. Playback Speed Control (Settings) ---

  /**
   * Handles changes to playback speed.
   */
  function handlePlaybackSpeedChange() {
    const speed = parseFloat(playbackSpeedSlider.value);
    audioPlayer.playbackRate = speed;
    playbackSpeedValue.textContent = `${speed}x`;
    displayMessage(`Playback speed set to ${speed}x`);
  }

  // --- 7. Sleep Timer (Settings) ---

  /**
   * Sets or clears the sleep timer.
   */
  function setSleepTimer() {
    if (sleepTimerTimeoutId) {
      clearTimeout(sleepTimerTimeoutId);
      sleepTimerTimeoutId = null;
    }
    const minutes = parseInt(sleepTimerSelect.value);
    if (minutes > 0) {
      sleepTimerTimeoutId = setTimeout(() => {
        audioPlayer.pause();
        playPauseIcon.classList.remove("fa-pause");
        playPauseIcon.classList.add("fa-play");
        stopVisualizer();
        displayMessage("Sleep timer ended. Playback paused.");
        sleepTimerSelect.value = "0"; // Reset selector
      }, minutes * 60 * 1000); // Convert minutes to milliseconds
      displayMessage(`Sleep timer set for ${minutes} minutes.`);
    } else {
      displayMessage("Sleep timer off.");
    }
  }

  // --- 8. Equalizer (Settings) ---

  /**
   * Initializes the AudioContext and BiquadFilterNodes for the equalizer.
   * Connects the audio source to the filter graph.
   */
  function setupAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256; // For visualizer

      // Create initial source node from audio player
      source = audioContext.createMediaElementSource(audioPlayer);

      // Define EQ bands (frequencies)
      const frequencies = [
        32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
      ];
      gainNodes = []; // Reset gainNodes for new setup

      // Create filter nodes and connect them in a chain
      let lastNode = source;
      frequencies.forEach((freq, index) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = freq;
        filter.Q.value = 1; // Quality factor
        filter.gain.value = 0; // Initial gain for each band
        gainNodes.push(filter);

        lastNode.connect(filter); // Connect previous node to current filter
        lastNode = filter; // Current filter becomes the previous node for the next iteration
      });

      lastNode.connect(analyser); // Connect the last filter to the analyser
      analyser.connect(audioContext.destination); // Connect analyser to speakers
    } else if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    // Ensure the source is connected to the first filter (or analyser if no filters)
    if (source && gainNodes.length > 0) {
      source.disconnect(); // Disconnect existing connection
      source.connect(gainNodes[0]); // Connect to the first filter
    } else if (source) {
      source.disconnect();
      source.connect(analyser); // If no EQ, connect directly to analyser
    }
  }

  /**
   * Resets all equalizer sliders to their default (0 gain) position.
   */
  function resetEqualizer() {
    eqSliders.forEach((slider) => {
      slider.value = 0; // Reset slider value
    });
    updateGainNodes(); // Apply changes
    displayMessage("Equalizer reset.");
  }

  /**
   * Updates the gain value for each BiquadFilterNode based on slider positions.
   */
  function updateGainNodes() {
    if (audioContext && audioContext.state === "running") {
      eqSliders.forEach((slider) => {
        const band = parseInt(slider.dataset.band);
        const value = parseFloat(slider.value);
        if (gainNodes[band]) {
          gainNodes[band].gain.value = value; // Apply gain (in dB)
        }
      });
    }
  }

  // --- 8. Initialization ---
  /**
   * Initializes the entire application when the DOM is loaded.
   * Sets up initial UI state and event listeners.
   */
  function initializeApp() {
    console.log("Timve App Initialized for Offline Use!");

    setupAudioContext(); // Set up audio context initially for potential visualizer/EQ
    setupEventListeners(); // Attach all event listeners

    // Set initial volume and update icon
    audioPlayer.volume = parseFloat(volumeSlider.value);
    updateVolumeIcon();

    // Show Home section by default and ensure right panel is visible
    showMainContentSection("homeSection");

    // Update play queue and favorite button states on load
    updatePlayQueueUI();
    updateFavoriteButton();

    // Ensure file input and custom upload button are hidden initially
    // They will be shown when navigating to the 'Play Queue' section
    if (fileInput) fileInput.style.display = "none";
    if (customUploadBtn) customUploadBtn.style.display = "none";
  }

  // --- Visualizer Setup ---

  /**
   * Sets up the visualizer canvas and context.
   */
  function setupVisualizer() {
    if (!canvasContext) {
      visualizerCanvas.width = visualizerContainer.clientWidth;
      visualizerCanvas.height = visualizerContainer.clientHeight;
      canvasContext = visualizerCanvas.getContext("2d");
    }
  }

  /**
   * Starts the visualizer animation.
   */
  function startVisualizer() {
    if (!analyser || !canvasContext || !visualizerActive) return;

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    visualizerCanvas.style.display = "block";
    visualizerPlaceholder.style.display = "none";
    drawVisualizer();
  }

  /**
   * Stops the visualizer animation.
   */
  function stopVisualizer() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    // Optionally clear canvas or hide it
    if (canvasContext) {
      canvasContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    }
    if (visualizerDisplaySelect.value === "hidden") {
      visualizerCanvas.style.display = "none";
      visualizerPlaceholder.style.display = "flex";
    }
  }

  /**
   * Draws the audio visualizer on the canvas.
   */
  function drawVisualizer() {
    if (!visualizerActive || audioPlayer.paused) {
      stopVisualizer();
      return;
    }

    animationFrameId = requestAnimationFrame(drawVisualizer);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    canvasContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

    const barWidth = visualizerCanvas.width / bufferLength * 2.5; // Adjust for better visualization
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i] / 255 * visualizerCanvas.height; // Normalize to canvas height

      // Gradient color from blue to pink based on height
      const gradient = canvasContext.createLinearGradient(0, visualizerCanvas.height, 0, 0);
      gradient.addColorStop(0, '#00bfff'); // Blue at bottom
      gradient.addColorStop(1, '#ff00ff'); // Pink at top
      canvasContext.fillStyle = gradient;

      canvasContext.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1; // Add 1px gap between bars
    }
  }

  /**
   * Toggles the visualizer display.
   */
  function toggleVisualizerDisplay() {
    const displayMode = visualizerDisplaySelect.value;
    if (displayMode === "full") {
      visualizerActive = true;
      setupVisualizer(); // Ensure canvas is set up
      if (!audioPlayer.paused) {
        startVisualizer();
      } else {
        visualizerCanvas.style.display = "block"; // Show canvas even if paused
        visualizerPlaceholder.style.display = "none";
      }
    } else {
      visualizerActive = false;
      stopVisualizer();
      visualizerCanvas.style.display = "none";
      visualizerPlaceholder.style.display = "flex"; // Show placeholder
    }
    displayMessage(`Visualizer set to ${displayMode}`);
  }

  /**
   * Handles canvas resize to make visualizer responsive.
   */
  function handleVisualizerResize() {
    if (visualizerCanvas) {
      visualizerCanvas.width = visualizerContainer.clientWidth;
      visualizerCanvas.height = visualizerContainer.clientHeight;
      if (visualizerActive && !audioPlayer.paused) {
        drawVisualizer(); // Redraw on resize
      }
    }
  }


  // --- 9. Event Listeners ---
  /**
   * Centralized function to attach all event listeners.
   */
  function setupEventListeners() {
    // Playback Controls
    playPauseBtn.addEventListener("click", togglePlayPause);
    prevBtn.addEventListener("click", playPrevSong);
    nextBtn.addEventListener("click", playNextSong);
    shuffleBtn.addEventListener("click", toggleShuffle);
    repeatBtn.addEventListener("click", toggleRepeat);

    audioPlayer.addEventListener("timeupdate", updateProgressBar);
    audioPlayer.addEventListener("loadedmetadata", () => {
      durationSpan.textContent = formatTime(audioPlayer.duration);
    });
    audioPlayer.addEventListener("ended", playNextSong); // Auto-play next song

    progressBar.addEventListener("input", seekAudio);

    volumeSlider.addEventListener("input", () => {
      audioPlayer.volume = parseFloat(volumeSlider.value);
      updateVolumeIcon();
    });
    currentVolumeIcon.addEventListener("click", toggleMute);

    // UI Navigation
    navHome.addEventListener("click", (e) => {
      e.preventDefault();
      showMainContentSection("homeSection");
    });
    navSearch.addEventListener("click", (e) => {
      e.preventDefault();
      showMainContentSection("exploreSection");
    });
    navLibrary.addEventListener("click", (e) => {
      e.preventDefault();
      showMainContentSection("yourLibrarySection");
    });
    navPlayQueue.addEventListener("click", (e) => {
      e.preventDefault();
      showMainContentSection("playQueueSection");
    });
    navSettings.addEventListener("click", (e) => {
      e.preventDefault();
      showMainContentSection("settingsSection");
    });

    // File Upload (Play Queue)
    fileInput.addEventListener("change", handleFileUpload);
    customUploadBtn.addEventListener("click", () => fileInput.click()); // Trigger hidden file input

    // Favorite Toggle
    favoriteToggleBtn.addEventListener("click", toggleFavoriteSong);

    // Playback Speed (Settings)
    playbackSpeedSlider.addEventListener("input", handlePlaybackSpeedChange);

    // Sleep Timer (Settings)
    sleepTimerSelect.addEventListener("change", setSleepTimer);

    // Equalizer (Settings)
    eqSliders.forEach((slider) => {
      slider.addEventListener("input", updateGainNodes);
    });
    resetEqBtn.addEventListener("click", resetEqualizer);

    // Visualizer (Settings and Global Toggle)
    visualizerToggleBtn.addEventListener("click", () => {
      visualizerActive = !visualizerActive; // Toggle active state
      if (visualizerActive) {
        if (audioPlayer.paused) {
          // If paused, just show canvas, don't start animation
          visualizerCanvas.style.display = "block";
          visualizerPlaceholder.style.display = "none";
        } else {
          startVisualizer();
        }
        visualizerToggleBtn.classList.add("active"); // Optional: Add active class to button
      } else {
        stopVisualizer();
        visualizerToggleBtn.classList.remove("active"); // Optional: Remove active class
      }
      displayMessage(`Visualizer ${visualizerActive ? 'ON' : 'OFF'}`);
    });

    visualizerDisplaySelect.addEventListener("change", toggleVisualizerDisplay);

    // Responsive visualizer
    window.addEventListener('resize', handleVisualizerResize);

    // Initial setup of visualizer display based on settings
    toggleVisualizerDisplay();
  }

  // Initialize the app when everything is ready
  initializeApp();
});