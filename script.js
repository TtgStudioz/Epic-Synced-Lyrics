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
      const resultsContainer = document.getElementById("resultsContainer")
      newDiv.setAttribute('class', 'song-result');
      resultsContainer.appendChild(newDiv)

      const newImage = document.createElement('img');
      if (song.album && song.album.images.length > 0) {
        newImage.src = song.album.images[0].url;
      } else {
        newImage.src = 'default-image-url'; // Provide a default image URL
      }
      newDiv.appendChild(newImage);

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

      let hoverTimeout;
      let transitionTime = 500; // Transition time in milliseconds (0.7s)

      newDiv.addEventListener("mouseover", function() {
        // Start a timeout to delay background change
        hoverTimeout = setTimeout(function() {
          document.body.style.backgroundImage = `url(${song.album.images[0].url})`;
        }, transitionTime);
      });

      newDiv.addEventListener("mouseout", function() {
        // If mouse leaves before the transition time, clear the timeout
        clearTimeout(hoverTimeout);
      });


      newDiv.addEventListener('click', async function(event) {
        // Fetch song information
        const songInfo = await getSongInfo(song.name, song.artists[0].name, accessToken);

        if (songInfo) {
          // Build the URL with query parameters
          const playerUrl = `player.html?song=${encodeURIComponent(song.name)}&artist=${encodeURIComponent(song.artists[0].name)}&album=${encodeURIComponent(songInfo.album)}&releaseDate=${encodeURIComponent(songInfo.releaseDate)}&duration=${encodeURIComponent(songInfo.duration)}&image=${encodeURIComponent(songInfo.image)}`;

          // Redirect to player.html
          window.location.href = playerUrl;
        } else {
          console.log('No song info found');
        }
      });

      resultsContainer.appendChild(newDiv);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

document.getElementById("searchInput").addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    const query = this.value.trim();
    if (query.length > 0) {
      main(query);
    } else {
      document.getElementById("resultsContainer").style.display = 'none';
      document.body.style.backgroundImage = '';
    }
  }
});

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
      image: (albumData.images && albumData.images.length > 0) ? albumData.images[0].url : '' // Provide a fallback if no image is available

    };
    return songInfo;
  } else {
    return null;
  }
}

document.getElementById("searchButton").addEventListener("click", function() {
  const query = document.getElementById("searchInput").value.trim();
  if (query.length > 0) {
    main(query);
  } else {
    document.getElementById("resultsContainer").style.display = 'none';
    document.body.style.backgroundImage = '';
  }
});