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

        // Fetch song information
        const songInfo = await getSongInfo(song.name, song.artists[0].name, accessToken);
        const songWriters = await findSongWriters(song.name, song.artists[0].name);

        if (songInfo) {
          // Build the URL with query parameters
          const playerUrl = `player.html?song=${encodeURIComponent(song.name)}&artist=${encodeURIComponent(song.artists[0].name)}&album=${encodeURIComponent(songInfo.album)}&releaseDate=${encodeURIComponent(songInfo.releaseDate)}&duration=${encodeURIComponent(songInfo.duration)}&image=${encodeURIComponent(songInfo.image)}&writers=${encodeURIComponent(songWriters)}`;

          // Redirect to player.html
          window.location.href = playerUrl;
        } else {
          console.log('No song info found');
        }
      });

      // newDiv.addEventListener('click', async function(event) {
      //   document.getElementById("resultsContainer").style.display = 'none';
      //   const songInfo = await getSongInfo(song.name, song.artists[0].name, accessToken);
      //   const songWriters = await findSongWriters(song.name, song.artists[0].name);


        //add the function here
        // if (songInfo) {
        //   addSongInfo(songInfo.album, songInfo.releaseDate, songWriters, songInfo.duration, songInfo.image)
        // }


        // searchVideo(song.artists[0].name, song.name);
      // });

      resultsContainer.appendChild(newDiv);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

document.getElementById("searchButton").addEventListener("click", async function() {
  inputQuery = document.getElementById("songAndArtist").value;
  if(inputQuery) {
    const accessToken = await getAccessToken(clientId, clientSecret);
    query = inputQuery.split("-")
    // Fetch song information
    const songInfo = await getSongInfo(query[0], query[1], accessToken);
    const songWriters = await findSongWriters(query[0], query[1]);

    if (songInfo) {
      // Build the URL with query parameters
      const playerUrl = `player.html?song=${encodeURIComponent(query[0])}&artist=${encodeURIComponent(query[1])}&album=${encodeURIComponent(songInfo.album)}&releaseDate=${encodeURIComponent(songInfo.releaseDate)}&duration=${encodeURIComponent(songInfo.duration)}&image=${encodeURIComponent(songInfo.image)}&writers=${encodeURIComponent(songWriters)}`;

      // Redirect to player.html
      window.location.href = playerUrl;
    } else {
      console.log('No song info found');
    }
  } 
})

document.getElementById("searchInput").addEventListener("input", function() {
  const query = this.value.trim();
  if (query.length > 0) {
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

// function addSongInfo(albumName, releaseDate, producers, length, image) {
//   document.getElementById("infoAlbum").innerHTML = albumName;
//   document.getElementById("infoRelease").innerHTML = releaseDate;
//   document.getElementById("infoProducers").innerHTML = producers;
//   document.getElementById("infoLength").innerHTML = `${length} seconds`;
//   document.getElementById("infoImage").src = image;
// }