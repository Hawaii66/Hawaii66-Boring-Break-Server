let methods = {}

const ServerHelp = require("../HelpFunctions/ServerFunctions.js");
const HelperFunctions = require("../HelpFunctions/HelpFunctions.js");

methods.HasEnteredGameChoise = function(data, callback) {
    console.log(data);
    let serverIndex = ServerHelp.data.FindServerWithPin(servers, currentPin);
    const toSend = {
        socket,
        data
    }

    servers[serverIndex].game.readyPlayers.push(toSend);

    //Player must join the lobby
    const playerLobby = {
        name: ServerHelp.data.FindPersonInfoWithSocket(servers, serverIndex, socket),
        questions: data
    }
    const playerLeaderboard = {
        name: ServerHelp.data.FindPersonInfoWithSocket(servers, serverIndex, socket),
        score: 0
    }

    currentLobbyIndex = servers[serverIndex].game.lobby.length;
    servers[serverIndex].game.lobby.push(playerLobby);
    servers[serverIndex].game.leaderboard.push(playerLeaderboard);

    if (servers[serverIndex].game.readyPlayers.length === servers[serverIndex].connections.length) {
        if (servers[serverIndex].game.readyPlayers.length > 1) {
            //Everyone is ready
            console.log("Game can start");
            servers[serverIndex].game.state = 1;
            servers[serverIndex].game.currentPlayer = 0;
            console.log(servers[serverIndex].game.readyPlayers);
            //const questions = servers[serverIndex].game.lobby[servers[serverIndex].game.currentPlayer].questions;
            //console.log(questions);
            //ServerHelp.data.EmitToSpecialServer(servers, serverIndex, "Show1T2LQuestion", questions);
            HelperFunctions.data.SendOutQuestion(servers, serverIndex);
        } else {
            console.log("To few people in current server");
        }
    }
    //Player shall join a lobby for the game
    //callback(servers[serverIndex].game.lobby);
    ServerHelp.data.EmitToSpecialServer(servers, serverIndex, "UpdatePlayerLobby", servers[serverIndex].game.lobby)
}

exports.data = methods;