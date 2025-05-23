var player;
var lyricsAndTime = [];
// Load the IFrame Player API code asynchronously.
var tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function convertSeconds(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  const paddedMins = String(mins).padStart(1, '0'); // Optional if you want hour-style padding
  const paddedSecs = String(secs).padStart(2, '0'); // Always 2 digits

  return `${paddedMins}:${paddedSecs}`;
}



function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "390",
    width: "640",
    // events: {
    //   'onReady': onPlayerReady
    // },
    playerVars: {
      'autoplay': 0,
      'controls': 1,
      'showinfo': 0,
      'rel': 0,
      'fs': 1,
      'modestbranding': 1,
      'playsinline': 1,
      'origin': 'https://04705279-71dd-4267-a46e-f39c7fa8182c-00-2o4csgi37lhnu.janeway.replit.dev'
    }
  });

  var iframeWindow = player.getIframe().contentWindow;

  var lastTimeUpdate = 0;


  window.addEventListener("message", function(event) {
    if (event.source === iframeWindow) {
      var data = JSON.parse(event.data);
      if (data.event === "infoDelivery" && data.info && data.info.currentTime) {
        var time = Math.floor(data.info.currentTime);

        document.getElementById("progressBar").value = time;

        document.getElementById("timeStamps").children[0].innerHTML = convertSeconds(time);



        if (time !== lastTimeUpdate) {
          lastTimeUpdate = time;

          const currentLyric = lyricsAndTime.find(lyric => lyric.time === time);
          const currentIndex = lyricsAndTime.findIndex(lyric => lyric.time === time);

          if (currentLyric) {
            scrollToLyric(document.getElementById(lyricsAndTime[currentIndex].time));

            lyricsAndTime.forEach((lyric, index) => {
              if (index !== currentIndex) {
                resetStyle(document.getElementById(lyric.time));
              }
            });
          }
        }
      }
    }
  });
}





document.getElementById("playPauseButton").addEventListener("click", function() {
  const button = this;
  const playerState = player.getPlayerState();
  document.getElementById("timeStamps").children[2].innerHTML = convertSeconds(player.getDuration());
  
  document.getElementById("progressBar").max = player.getDuration();

  if (playerState === YT.PlayerState.PLAYING) {
    player.pauseVideo();
    button.innerHTML = `<i class="fa-solid fa-play"></i>`;
  } else {
    player.playVideo();
    button.innerHTML = `<i class="fa-solid fa-pause"></i>`;
  }
});

document.addEventListener('keydown', function(event) {
  if (event.code === 'Space') {
    
    const button = document.getElementById("playPauseButton");
    const playerState = player.getPlayerState();
    document.getElementById("progressBar").max = player.getDuration();
    document.getElementById("timeStamps").children[2].innerHTML = convertSeconds(player.getDuration());

    if (playerState === YT.PlayerState.PLAYING) {
      player.pauseVideo();
      button.innerHTML = `<i class="fa-solid fa-play"></i>`;
    } else {
      player.playVideo();
      button.innerHTML = `<i class="fa-solid fa-pause"></i>`;
    }
    event.preventDefault(); // Prevent the default action (e.g., scrolling)
  }
});

document.getElementById("progressBar").addEventListener("input", function() {
  const time = this.value;
  player.seekTo(time);
})

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    song: params.get('song'),
    artist: params.get('artist'),
    album: params.get('album'),
    releaseDate: params.get('releaseDate'),
    duration: params.get('duration'),
    image: params.get('image'),
    writers: params.get('writers')
  };
}

// Fetch the song information from the URL
const songData = getQueryParams();

document.getElementById("albumCover").src = songData.image;

let syncedLyricsArray = []
async function getLyricsWithOtherApi(artist, song, vid) {
  try {

    var query = artist.split(' ').join('+') + "+" + song.split(' ').join('+');

    const lyricsResponse = await fetch(`https://lrclib.net/api/search?q=${query}`);
    let json = await lyricsResponse.json(); 

    // Loop through all the JSON objects and find the one with valid syncedLyrics
    let foundSyncedLyrics = false;
    for (let item of json) {
      if (item.syncedLyrics && item.syncedLyrics !== null) {
        json = item;  // Reassign json to the object with syncedLyrics
        foundSyncedLyrics = true;
        console.log(json);
        break;  // Exit the loop once we find valid syncedLyrics
      }
    }

    // Handle the case where there are no syncedLyrics
    if (!foundSyncedLyrics) {
      if (json[0] && json[0].plainLyrics) {
        plain = ["No"]

        plain = json[0].plainLyrics.split('\n');
        console.log(plain);
        console.log([{ time: 0, text: plain }])
        return [{ time: 0, text: plain }];
      } else {
        return [{ time: 0, text: ["No synced lyrics or plain lyrics found"] }];
      }
    }

    // Now the json contains the object with syncedLyrics, and the rest of the code can use it
    syncedLyricsArray = json.syncedLyrics.split('\n').map((line) => {
      return { 
        name: json.name,
        album: json.albumName,
        artist: json.artistName,
        syncedLyrics: line.trim()
      };
    });

    let finalLyrics = [];
    let length = json.syncedLyrics.split('\n');
    length.forEach(line => {
      const splittedLine = line.split(']');
      if (splittedLine.length == 2) {
        const trimmedLine = splittedLine[1].trim();
        const time = splittedLine[0].trim().replace("[", "");
        let parts = time.split(':');
        let minutes = parseInt(parts[0], 10);
        let seconds = parseInt(parts[1], 10);
        let totalSeconds = (minutes * 60) + seconds;
        finalLyrics.push({ time: totalSeconds, text: trimmedLine });
      }
    });

    finalLyrics.sort((a, b) => a.time - b.time);
    let seenTimestamps = new Set();

    for (let i = 0; i < finalLyrics.length; i++) {
      if (finalLyrics[i].text === "") {
        finalLyrics[i].text = "♬";
      }

      // Keep the original timestamp with its decimal precision
      let currentTime = finalLyrics[i].time;

      // Ensure that timestamps do not repeat by checking against the seenTimestamps set
      while (seenTimestamps.has(currentTime)) {
        currentTime += 1;  // Increment by 1 full second if the timestamp already exists
      }

      // Update the timestamp and mark it as seen
      finalLyrics[i].time = currentTime;
      seenTimestamps.add(currentTime);  // Add the new timestamp to the set
    }

    console.log(finalLyrics);
    return finalLyrics;
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return [{ time: 0, text: ["Lyrics not available", "Sorry"] }];
  }
}

window.addEventListener("load", (event) => {
  createWelcomeDiv();
  searchVideo(songData.artist, songData.song)
  document.body.style.backgroundImage = `url(${songData.image})`;
});

function createWelcomeDiv() {
  const lyricsContainer = document.getElementById("lyrics-container");
  const newDiv = document.createElement("div");
  newDiv.setAttribute("id", "welcome")
  newDiv.style.margin = "5px 0px 5px";
  newDiv.style.color = "#ebebeb"
  const newContent = document.createTextNode("Search a song to get started.");
  newDiv.appendChild(newContent);
  lyricsContainer.appendChild(newDiv);
}

function searchVideo(art, song) {
  var sArtist = art;
  var sSong = song;
  if (sArtist && sSong) {
    var searchInput = sArtist + " " + sSong + " 'topic'";

    fetch("https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=" + encodeURIComponent(searchInput) + "&key=AIzaSyCiV4zJelu3prqx-7jF81wj23-fOYyzjmw")
      .then(response => response.json())
      .then(data => {
        if (data.items.length > 0) {
          var videoId = data.items[0].id.videoId;
          playVideo(videoId);
          const button = document.getElementById("playPauseButton");
          const playerState = player.getPlayerState();
          document.getElementById("progressBar").max = player.getDuration();


          if (playerState === YT.PlayerState.PLAYING) {
            player.pauseVideo();
            button.innerHTML = `<i class="fa-solid fa-play"></i>`;
          } else {
            player.playVideo();
            button.innerHTML = `<i class="fa-solid fa-pause"></i>`;
          }
          // Fetch lyrics using the new API
          getLyricsWithOtherApi(sArtist, sSong, videoId).then(lyrics => {
            if (lyrics.length != 1) {
              if (document.getElementById("welcome") !== null) {
                document.getElementById("welcome").remove()
              }
              lyricsAndTime = lyrics || [];

              // Create lyric container
              const lyricsContainer = document.getElementById("lyrics-container");
              const playerContainer = document.getElementById("pagecontainer");

              lyricsContainer.innerHTML = "";  // Clear previous lyrics
              lyricsAndTime.forEach(lyric => {
                const newDiv = document.createElement("div");
                playerContainer.appendChild(lyricsContainer)

                newDiv.setAttribute("id", lyric.time);
                newDiv.setAttribute("class", "individualLyric");
                newDiv.style.margin = "35px 0px 35px";
                newDiv.style.cursor = "pointer";
                const newContent = document.createTextNode(lyric.text);
                newDiv.appendChild(newContent);

                newDiv.addEventListener("click", function(event) {
                  skipToTime(event.target.id);
                });
                lyricsContainer.appendChild(newDiv);
              });
              if (lyricsAndTime.length >= 0) {
                document.getElementById("lyrics-container").scrollTo({ top: 0, behavior: 'smooth' });
              }
              createLyricsOptions(syncedLyricsArray);
          } else {
              const lyricsContainer = document.getElementById("lyrics-container");
              lyricsContainer.innerHTML = "";  // Clear previous lyrics


              plain.forEach(lyric => {
                const newDiv = document.createElement("div");
                newDiv.setAttribute("class", "individualLyric");
                newDiv.style.margin = "5px 0px 5px";
                newDiv.style.color = "rgb(235, 235, 235)";
                const newContent = document.createTextNode(lyric);
                newDiv.appendChild(newContent);
                lyricsContainer.appendChild(newDiv);
              });
          }
          });
        } else {
          alert("No video found with the given search term.");
        }
      })
      .catch(error => console.error('Error:', error));

  } else {
    window.alert("Add both name and artist.");
  }
}

function scrollToLyric(lyric) {
  const container = document.getElementById('lyrics-container');

  lyric.style.transition = "all 0.3s";
  lyric.style.color = "#ebebeb";
  lyric.style.fontWeight = "bold";

  const rect = lyric.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const scrollTop = container.scrollTop;
  const offsetTop = rect.top - containerRect.top + scrollTop - (container.clientHeight / 2) + (lyric.clientHeight / 2);

  container.scrollTo({
    top: offsetTop,
    behavior: 'smooth'
  });
}


function resetStyle(lyric) {
  lyric.style.transition = "all 0.3s";
  lyric.style.fontWeight = "bold";
  lyric.style.color = "#ffffff5e";
}

function playVideo(videoId) {
  player.loadVideoById(videoId);
  player.playVideo();
}

function skipToTime(time) {
  player.seekTo(time);
}

function createLyricsOptions(options) {
  const resultsContainer = document.getElementById('lyrics-optionsContent');
  resultsContainer.innerHTML = '';
  options.forEach(option => {
    const newDiv = document.createElement('div');
    newDiv.setAttribute('class', 'songSearch');

    const textContainer = document.createElement('div');
    textContainer.setAttribute('class', 'textContainer');

    const title = document.createElement('h2');
    title.innerHTML = option.name;

    const artist = document.createElement('p');
    artist.innerHTML = option.artist + " - " + option.album;

    textContainer.appendChild(title);
    textContainer.appendChild(artist);

    newDiv.appendChild(textContainer);

    newDiv.addEventListener('click', function(event) {
      lyricsoptionsPopup.classList.remove("show");

      let finalLyrics = [];
      let length = option.syncedLyrics.split('\n');
      length.forEach(line => {
        const splittedLine = line.split(']');
        if (splittedLine.length == 2) {
          const trimmedLine = splittedLine[1].trim();
          const time = splittedLine[0].trim().replace("[", "");
          let parts = time.split(':');
          let minutes = parseInt(parts[0], 10);
          let seconds = parseInt(parts[1], 10);
          let totalSeconds = (minutes * 60) + seconds;
          finalLyrics.push({ time: totalSeconds, text: trimmedLine });
        }
      });

      // Increase repeated times by one second
      finalLyrics.sort((a, b) => a.time - b.time);
      for (let i = 1; i < finalLyrics.length; i++) {
        if (finalLyrics[i].text === "") {
          finalLyrics[i].text = "♬";
        }
        if (finalLyrics[i].time === finalLyrics[i - 1].time) {
          finalLyrics[i].time += 1;
        }
      }

      // searchVideo(song.artists[0].name, song.name);
      lyricsAndTime = finalLyrics || [];

      // Create lyric container
      const lyricsContainer = document.getElementById("lyrics-container");
      lyricsContainer.innerHTML = "";  // Clear previous lyrics
      lyricsAndTime.forEach(lyric => {
        const newDiv = document.createElement("div");
        newDiv.setAttribute("id", lyric.time);
        newDiv.setAttribute("class", "individualLyric");
        newDiv.style.margin = "5px 0px 5px";
        const newContent = document.createTextNode(lyric.text);
        newDiv.appendChild(newContent);

        newDiv.addEventListener("click", function(event) {
          skipToTime(event.target.id);
        });
        lyricsContainer.appendChild(newDiv);
      });
    });

    resultsContainer.appendChild(newDiv);
  });
}