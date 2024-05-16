var player;
var lyricsAndTime = [];
// Load the IFrame Player API code asynchronously.
var tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
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

function durationToSeconds(durationString) {
  // Extracting minutes and seconds from the duration string
  const matches = durationString.match(/PT(\d+M)?(\d+S)?/);

  // Extract minutes and seconds from the matched groups
  const minutes = matches[1] ? parseInt(matches[1]) : 0;
  const seconds = matches[2] ? parseInt(matches[2]) : 0;

  // Convert minutes and seconds to seconds
  const totalSeconds = minutes * 60 + seconds;

  return totalSeconds;
}

async function getLyricsWithOtherApi(artist, song, vid) {
  try {
    const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&artist=${artist}&track=${song}&api_key=780fc814c061d96542082dd3809b80ea&format=json`);

    //get video length
    const info = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${vid}&part=contentDetails&key=AIzaSyCiV4zJelu3prqx-7jF81wj23-fOYyzjmw`)
    const vidInfo = await info.json()
    const youtubeLength = durationToSeconds(vidInfo.items[0].contentDetails.duration);

    const data = await response.json();
    const album = data?.track?.album?.title || song;
    const duration = youtubeLength;
    // const duration = data.track.duration / 1000;
    console.log(album, duration);

    const lyricsResponse = await fetch(`https://lrclib.net/api/get?artist_name=${artist}&track_name=${song}&album_name=${album}&duration=${duration}`);
    const json = await lyricsResponse.json();

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

    // Increase repeated times by one second
    finalLyrics.sort((a, b) => a.time - b.time);
    for (let i = 1; i < finalLyrics.length; i++) {
      if (finalLyrics[i].time === finalLyrics[i - 1].time) {
        finalLyrics[i].time += 1;
      }
    }
    return finalLyrics;
  } catch (error) {
    console.error('Error fetching album info:', error);
    var sArtist = document.getElementById("artistName").value;
    var sSong = document.getElementById("songName").value;
    //fetch lyrics
    lyricsAndTime = [];
    document.getElementById('lyrics-container').innerText = "";
    let lastSecond = 0;
    fetch(`https://ganisproxyserver.onrender.com/api-lyrics/${sArtist}%20${sSong}`)
      .then(response => response.json())
      .then(data => {
        if (!data.hasOwnProperty("Response")) {
          lyricsAndTime = data.map((entry) => {
            const adjustedTime = entry.seconds !== lastSecond ? entry.seconds : lastSecond + 1;
            lastSecond = adjustedTime;
            return {
              time: adjustedTime,
              text: entry.lyrics,
            };
          });
          console.log(lyricsAndTime);

          //create lyric container
          const lyricsContainer = document.getElementById("lyrics-container");
          for (lyric in lyricsAndTime) {
            const newDiv = document.createElement("div");
            newDiv.setAttribute("id", lyricsAndTime[lyric].time)
            newDiv.setAttribute("class", "individualLyric");
            newDiv.style.margin = "5px 0px 5px";
            const newContent = document.createTextNode(lyricsAndTime[lyric].text);
            newDiv.appendChild(newContent);

            newDiv.addEventListener("click", function(event) {
              skipToTime(event.target.id);
            });
            const currentDiv = document.getElementById("div1");
            lyricsContainer.appendChild(newDiv);
          }
        } else {
          const lyricsContainer = document.getElementById("lyrics-container");
          const newDiv = document.createElement("div");
          newDiv.setAttribute("id", "NotFound")
          newDiv.setAttribute("class", "individualLyric");
          newDiv.style.margin = "5px 0px 5px";
          newDiv.style.color = "#ebebeb"
          const newContent = document.createTextNode("Lyrics not found. Click here for further information.");
          newDiv.addEventListener("click", function(event) {
            alert("Make sure both name and artist are spelled correctly. If so, the API might not have the lyrics for that song.")
          });
          newDiv.appendChild(newContent);
          lyricsContainer.appendChild(newDiv);
        }
      });
  }
}
// Detect enter key press
document.querySelectorAll("#songName, #artistName").forEach(input => {
  input.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) {
      if (document.getElementById("artistName").value && document.getElementById("songName").value) {
        searchVideo();
      } else {
        window.alert("Add both name and artist.");
      }
    }
  });
});

function searchVideo() {
  var sArtist = document.getElementById("artistName").value;
  var sSong = document.getElementById("songName").value;
  if (sArtist && sSong) {
    var searchInput = sArtist + " " + sSong + " 'topic'";
    console.log(searchInput);
    fetch("https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=" + encodeURIComponent(searchInput) + "&key=AIzaSyCiV4zJelu3prqx-7jF81wj23-fOYyzjmw")
      .then(response => response.json())
      .then(data => {
        if (data.items.length > 0) {
          var videoId = data.items[0].id.videoId;
          playVideo(videoId);
          // Fetch lyrics using the new API
          getLyricsWithOtherApi(sArtist, sSong, videoId).then(lyrics => {
            lyricsAndTime = lyrics || [];
            console.log(lyricsAndTime);

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
        } else {
          alert("No video found with the given search term.");
        }
      })
      .catch(error => console.error('Error:', error));

    // // Fetch lyrics using the new API
    // getLyricsWithOtherApi(sArtist, sSong, videoId).then(lyrics => {
    //   lyricsAndTime = lyrics || [];
    //   console.log(lyricsAndTime);

    //   // Create lyric container
    //   const lyricsContainer = document.getElementById("lyrics-container");
    //   lyricsContainer.innerHTML = "";  // Clear previous lyrics
    //   lyricsAndTime.forEach(lyric => {
    //     const newDiv = document.createElement("div");
    //     newDiv.setAttribute("id", lyric.time);
    //     newDiv.setAttribute("class", "individualLyric");
    //     newDiv.style.margin = "5px 0px 5px";
    //     const newContent = document.createTextNode(lyric.text);
    //     newDiv.appendChild(newContent);

    //     newDiv.addEventListener("click", function(event) {
    //       skipToTime(event.target.id);
    //     });
    //     lyricsContainer.appendChild(newDiv);
    //   });
    // });
  } else {
    window.alert("Add both name and artist.");
  }
}

function scrollToLyric(lyric) {
  lyric.style.transition = "all 0.3s";
  lyric.style.color = "#ebebeb";
  lyric.style.fontWeight = "bold";
  lyric.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetStyle(lyric) {
  lyric.style.transition = "all 0.3s";
  lyric.style.fontWeight = "bold";
  lyric.style.color = "#7d7d7d";
}

function playVideo(videoId) {
  player.loadVideoById(videoId);
  player.playVideo();
}

function skipToTime(time) {
  player.seekTo(time);
}
