const axios = require("axios");

let methods = {}

const clientID = "31998cc37251418c8c18e855f6dae1f9";
const clientSecret = "8cb9c7f8aa50497db5303440aff54a92";

function NameToISOCode(countryName) {
    if (countryName === "Sweden") {
        return "SE"
    }
    if (countryName === "USA") {
        return "US"
    }
    return "";
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}


function GetXRandomNumbers(count, min, max) {
    let toReturn = []
    for (let i = 0; i < count; i++) {
        let stop = false;
        while (!stop) {
            const randomX = getRandomInt(min, max);
            let hasFound = false;
            for (let i = 0; i < toReturn.length; i++) {
                const element = toReturn[i];
                if (randomX === element) {
                    hasFound = true;
                }
            }
            if (hasFound === false) {
                toReturn.push(randomX);
                stop = true;
            }
        }
    }

    return toReturn;
}

function GenerateSelectedTracks(tracks, numbers) {
    toReturn = [];
    for (let i = 0; i < numbers.length; i++) {
        toReturn.push(tracks[numbers[i]]);
    }
    return toReturn;
}

methods.SpotifyGuessStartGame = function(servers, serverIndex, socket, data) {

    const ISOcode = NameToISOCode(data.country);
    if (ISOcode === "") {
        return;
    }

    let SpotifyToken = "";

    axios('https://accounts.spotify.com/api/token', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from((clientID + ':' + clientSecret), "ascii").toString("base64")
            },
            data: 'grant_type=client_credentials',
            method: 'POST'
        })
        .then(tokenRes => {
            SpotifyToken = tokenRes.data.access_token;

            axios("https://api.spotify.com/v1/playlists/37i9dQZEVXbMDoHDwVN2tF", {
                    method: "GET",
                    headers: { 'Authorization': 'Bearer ' + SpotifyToken }
                })
                .then(res => {
                    //console.log(res.data.tracks.items[0].track);
                    //console.log(res.data.tracks.items[0].track.name);
                    SpotifyStartNext(servers, serverIndex, SpotifyToken, res)
                })
        })
}

function SpotifyStartNext(servers, serverIndex, token, response) {
    const tracks = response.data.tracks.items;
    const randomNumbers = GetXRandomNumbers(5, 0, 50);
    let selectedTracks = GenerateSelectedTracks(tracks, randomNumbers);
    console.log(tracks);
    console.log(randomNumbers);
    console.log(selectedTracks);

    servers[serverIndex].game.GameSpotifyGuess.songs = selectedTracks;

    for (let i = 0; i < servers[serverIndex].connections.length; i++) {
        const element = servers[serverIndex].connections[i];
        element.socket.emit("GameSpotifyGuessResSongs", selectedTracks);
    }
}

exports.data = methods;