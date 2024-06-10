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

    // var inputAlbum = document.getElementById("albumName").value;
    const data = await response.json();

    // const album = data?.track?.album?.title || song;
    // const duration = data.track.duration / 1000;
    // const image = data.track.album.image[3]["#text"];
    // const releasetime = data.track.album.release_date;
    // const producers = data.track.artist.name;

    // addSongInfo(album, releasetime, producers, duration, image)

    // console.log(album, duration);
    var query = artist.split(' ').join('+') + "+" + song.split(' ').join('+');

    // const lyricsResponse = await fetch(`https://lrclib.net/api/get?artist_name=${artist}&track_name=${song}&album_name=${album}&duration=${duration}`);
    const lyricsResponse = await fetch(`https://lrclib.net/api/search?q=${query}`);
    // console.log(`https://lrclib.net/api/search?q=${query}`);

    const json = await lyricsResponse.json();

    let finalLyrics = [];
    let length = json[0].syncedLyrics.split('\n');
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
          // console.log(lyricsAndTime);

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
// window.addEventListener("keyup", function (event) {
//   nameAndArtist = document.getElementById('songAndArtist').value.split(", ");
//   if (event.keyCode === 13) {
//     if (nameAndArtist[0] && nameAndArtist[1]) {
//       searchSong(nameAndArtist[0], nameAndArtist[1])
//     } else {
//       window.alert("Add both name and artist.");
//     }
//   }
// })

document.getElementById('songAndArtist').addEventListener("keyup", function(event) {
  nameAndArtist = document.getElementById('songAndArtist').value.split(", ");
  if (event.keyCode === 13) {
    if (nameAndArtist[0] && nameAndArtist[1]) {
      searchVideo(nameAndArtist[0], nameAndArtist[1])
    } else {
      window.alert("Add both name and artist.");
    }
  }
})
// document.querySelectorAll("#songName, #artistName").forEach(input => {
//   input.addEventListener("keyup", function(event) {
//     if (event.keyCode === 13) {
//       if (document.getElementById("artistName").value && document.getElementById("songName").value) {
//         searchVideo();
//       } else {
//         window.alert("Add both name and artist.");
//       }
//     }
//   });
// });

window.addEventListener("load", (event) => {
  createWelcomeDiv();
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
  // if (document.getElementById("welcome") === null) {
  // createWelcomeDiv()
  // if (document.getElementById("welcome") !== null) {
  //   document.getElementById("welcome").innerHTML = "Searching...";
  // }
  // var sArtist = document.getElementById("artistName").value;
  // var sSong = document.getElementById("songName").value;
  var sArtist = art;
  var sSong = song;
  if (sArtist && sSong) {
    var searchInput = sArtist + " " + sSong + " 'topic'";
    // console.log(searchInput);
    console.log(encodeURIComponent(searchInput))

    fetch("https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=" + encodeURIComponent(searchInput) + "&key=AIzaSyCiV4zJelu3prqx-7jF81wj23-fOYyzjmw")
      .then(response => response.json())
      .then(data => {
        if (data.items.length > 0) {
          var videoId = data.items[0].id.videoId;
          createSongOptions(data.items);
          playVideo(videoId);
          // Fetch lyrics using the new API
          getLyricsWithOtherApi(sArtist, sSong, videoId).then(lyrics => {

            if (document.getElementById("welcome") !== null) {
              document.getElementById("welcome").remove()
            }
            lyricsAndTime = lyrics || [];

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
            if (lyricsAndTime.length >= 0) {
              document.getElementById("lyrics-container").scrollTo({ top: 0, behavior: 'smooth' });
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
  lyric.style.color = "#7d7d7d";
}

function playVideo(videoId) {
  player.loadVideoById(videoId);
  player.playVideo();
}

function skipToTime(time) {
  player.seekTo(time);
}

let myPopup = document.getElementById('myPopup');
document.getElementById('popup-button').onclick = function() {
  myPopup.classList.add("show");
}

document.getElementById('close-popup').onclick = function() {
  myPopup.classList.remove("show");
}

let optionsPopup = document.getElementById('options-popup');
document.getElementById('options-button').onclick = function() {
  optionsPopup.classList.add("show");
}
document.getElementById('close-popup-two').onclick = function() {
  optionsPopup.classList.remove("show");
}
// function search(artist, song) {
//   if (artist && song) {
//     window.open(`${window.location.href}player.html?artist=${encodeURIComponent(artist)}&song=${encodeURIComponent(song)}`, "_blank").focus()
//     // window.location.href = `player.html?artist=${encodeURIComponent(artist)}&song=${encodeURIComponent(song)}`;
//   } else {
//     window.alert("Add both name and artist.");
//   }
// }

async function getAccessToken(clientId, clientSecret) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error('Failed to get access token');
  }

  const data = await response.json();
  return data.access_token;
}

async function searchSong(accessToken, query, limit = 20, offset = 0) {
  const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to search songs');
  }

  const data = await response.json();
  return data.tracks;
}

const clientId = "3f555ce2cb504ee38ca63b180289b8e5";
const clientSecret = "b61b97c3382b4901a13ee452eda412cc";

async function main(query) {
  try {
    const accessToken = await getAccessToken(clientId, clientSecret);
    let offset = 0;
    const limit = 20;
    const maxResults = 50;
    let allSongs = [];

    while (allSongs.length < maxResults) {
      const result = await searchSong(accessToken, query, limit, offset);
      allSongs = allSongs.concat(result.items);
      if (allSongs.length >= maxResults || offset + limit >= result.total) {
        break;
      }
      offset += limit;
    }

    // Limit the results to maxResults
    allSongs = allSongs.slice(0, maxResults);

    if (!allSongs.length) {
      console.log('No songs found');
      return;
    }

    const resultsContainer = document.getElementById("resultsContainer");
    resultsContainer.innerHTML = ''; // Clear previous results
    resultsContainer.style.display = 'block'; // Show the results container

    allSongs.forEach(song => {
      const newDiv = document.createElement('div');
      newDiv.setAttribute('class', 'songSearch');

      const newImage = document.createElement('img');
      if (song.album && song.album.images.length > 0) {
        newImage.src = song.album.images[0].url;
      } else {
        newImage.src = 'default-image-url'; // Provide a default image URL
      }
      newImage.setAttribute('class', 'imageSearch');

      const textContainer = document.createElement('div');
      textContainer.setAttribute('class', 'textContainer');

      const title = document.createElement('h2');
      title.innerHTML = song.name;

      const artist = document.createElement('p');
      artist.innerHTML = song.artists[0].name;

      textContainer.appendChild(title);
      textContainer.appendChild(artist);

      newDiv.appendChild(newImage);
      newDiv.appendChild(textContainer);

      newDiv.addEventListener('click', async function(event) {
        document.getElementById("resultsContainer").style.display = 'none';
        const songInfo = await getSongInfo(song.name, song.artists[0].name, accessToken);
        const songWriters = await findSongWriters(song.name, song.artists[0].name);

        if (songInfo) {
          addSongInfo(songInfo.album, songInfo.releaseDate, songWriters, songInfo.duration, songInfo.image)
        }


        searchVideo(song.artists[0].name, song.name);
      });

      resultsContainer.appendChild(newDiv);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

document.getElementById("searchInput").addEventListener("input", function() {
  const query = this.value.trim();
  if (query) {
    main(query);
  } else {
    document.getElementById("resultsContainer").style.display = 'none';
  }
});
document.getElementById("searchInput").addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    document.getElementById("resultsContainer").style.display = 'none';
  }
});

document.getElementById('searchButton').onclick = function() {
  nameAndArtist = document.getElementById('songAndArtist').value.split(", ");
  if (nameAndArtist[0] && nameAndArtist[1]) {
    searchVideo(nameAndArtist[0], nameAndArtist[1])
  } else {
    window.alert("Add both name and artist.");
  }
}

function createSongOptions(options) {
  const resultsContainer = document.getElementById('optionsContent');
  resultsContainer.innerHTML = '';// Make sure this container exists in your HTML
  options.forEach(video => {
    const newDiv = document.createElement('div');
    newDiv.setAttribute('class', 'songSearch');

    const newImage = document.createElement('img');
    newImage.src = video.snippet.thumbnails.default.url; // Corrected property access
    newImage.setAttribute('class', 'thumbnail');

    const textContainer = document.createElement('div');
    textContainer.setAttribute('class', 'textContainer');

    const title = document.createElement('h2');
    title.innerHTML = video.snippet.title;

    const artist = document.createElement('p');
    artist.innerHTML = video.snippet.channelTitle;

    textContainer.appendChild(title);
    textContainer.appendChild(artist);

    newDiv.appendChild(newImage);
    newDiv.appendChild(textContainer);

    newDiv.addEventListener('click', function(event) {
      console.log("clicked");
      playVideo(video.id.videoId);
      // searchVideo(song.artists[0].name, song.name);
    });

    resultsContainer.appendChild(newDiv);
  });
}

var acc = document.getElementsByClassName("accordion");
var i;

for (i = 0; i < acc.length; i++) {
  acc[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var panel = this.nextElementSibling;
    if (panel.style.maxHeight) {
      panel.style.maxHeight = null;
    } else {
      panel.style.maxHeight = panel.scrollHeight + "px";
    }
  });
}


async function getSongInfo(songName, artistName, accessToken) {
  const query = encodeURIComponent(`${songName} ${artistName}`);
  const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`, {
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  });

  const data = await response.json();
  const track = data.tracks.items[0];
  if (track) {
    const albumId = track.album.id;
    const albumResponse = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: {
        'Authorization': 'Bearer ' + accessToken
      }
    });

    const albumData = await albumResponse.json();
    const songInfo = {
      album: albumData.name,
      releaseDate: albumData.release_date,
      producers: albumData.label, // Note: Producer info might not be available
      duration: track.duration_ms / 1000,
      image: albumData.images[0].url
    };
    return songInfo;
  } else {
    return null;
  }
}


async function fetchAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}
async function findSongWriters(songTitle, artist) {
  if (!songTitle || !artist) {
    return 'Please enter both a song title and an artist.';
  }

  const token = await fetchAccessToken();

  try {
    // Fetch the song details from the Spotify API
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(songTitle)}%20artist:${encodeURIComponent(artist)}&type=track&limit=1`, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    const data = await response.json();
    if (data.tracks && data.tracks.items.length > 0) {
      const track = data.tracks.items[0];
      const trackId = track.id;

      // Fetch the track details to get the songwriter information
      const trackResponse = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      const trackData = await trackResponse.json();
      const writers = trackData.artists.map(artist => artist.name).join(', ');

      return writers;
    } else {
      return 'Song not found.';
    }
  } catch (error) {
    console.error('Error fetching song data:', error);
    return 'An error occurred while fetching song data.';
  }
}
function addSongInfo(albumName, releaseDate, producers, length, image) {
  document.getElementById("infoAlbum").innerHTML = albumName;
  document.getElementById("infoRelease").innerHTML = releaseDate;
  document.getElementById("infoProducers").innerHTML = producers;
  document.getElementById("infoLength").innerHTML = `${length} seconds`;
  document.getElementById("infoImage").src = image;
}