const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const cors = require("cors");
const PORT = process.env.PORT || 5000;

const ServerHelp = require("./HelpFunctions/ServerFunctions.js");
const HelperFunctions = require("./HelpFunctions/HelpFunctions.js");
const Game1T2LFunctions = require("./Games/1T2L.js");
const SpeedMath = require("./Games/SpeedMath.js");
const SpotifyGuess = require("./Games/SpotifyGuess.js");
const { Server } = require("http");

let servers = []
let userCount = 0;
let currentMaxIP = 100;

app.use(cors());

app.get("/", (req, res) => {
    const toSend = {
        msg: "Server Here"
    }
    res.json(toSend);
});

io.sockets.on("connection", (socket) => {
    console.log("Client connected");
    userCount += 1;

    let currentPin = -1;
    let currentLobbyIndex = 0;

    io.sockets.emit("userCount", { userCount: userCount });

    socket.on("disconnect", () => {
        userCount -= 1;
        io.sockets.emit("userCount", { userCount: userCount });
        console.log("A Client Disconnected");
    });

    socket.on("createServer", (data, callback) => {
        console.log("Creating Server");
        if (data === undefined) {
            toSend = {
                succes: false
            }
            callback(toSend);
            return;
        }

        data = HelperFunctions.data.randomIntFromInterval(1000, 9999).toString();
        currentPin = data;

        const game = {
            readyPlayers: [],
            lobby: [],
            leaderboard: [],
            state: 0,
            currentPlayer: -1,
            answers: [],
            isReadyForNext: [],
            GameSpeedMath: {
                difficulty: 1,
                questions: [],
                score: [], //socket,number,name,{question, correctAnswer, myAnswer}
                players: [], //socket,currentQuestion
                hasAnsweredAllQuestions: 0,
            },
            GameSpotifyGuess: {
                songs: [], //name, uri relative rank
                hasAnsweredAllQuestions: 0,
                score: [],

            }
        }

        /* States:
        0 = have not started
        1 = Showing player
        2 = Leaderboard
        
        currentPlayer = index in lobby of the current player being shown.
         */

        const toPush = {
            pin: data,
            admin: socket,
            connections: [],
            game: game
        }
        servers.push(toPush);
        console.log("Curret Servers:");
        console.log(servers);
        toSend = {
            succes: true,
            pin: data
        }
        callback(toSend);
    });

    socket.on("joinServer", (data, callback) => {
        let indexOfServer = ServerHelp.data.FindServerWithPin(servers, data.pin);
        if (indexOfServer === -1) { return; }

        servers = ServerHelp.data.AddPlayerToServer(servers, indexOfServer, data, socket);
        toSend = [];
        for (let i = 0; i < servers[indexOfServer].connections.length; i++) {
            const element = servers[indexOfServer].connections[i];
            toSend.push(element.name);
        }
        console.log(toSend);
        //io.sockets.emit("RegeneratePlayerNames", toSend);

        currentPin = data.pin;
        console.log(servers);
        console.log(servers[indexOfServer]);

        ServerHelp.data.EmitToSpecialServer(servers, indexOfServer, "RegeneratePlayerNames", toSend);
        for (let i = 0; i < servers[indexOfServer].connections.length; i++) {
            const connection = servers[indexOfServer].connections[i];
            if (connection.socket === servers[indexOfServer].admin) {
                connection.socket.emit("ShowGames", true);
            }
        }
        console.log("TEST");
        callback(true);
        return;
    });

    socket.on("showGame", (data, callback) => {
        const pin = currentPin;
        let serverIndex = ServerHelp.data.FindServerWithPin(servers, pin);
        ServerHelp.data.EmitToSpecialServer(servers, serverIndex, "ShowGame", data.gameIndex);
    });

    socket.on("IsAdmin", (callback) => {
        const pin = currentPin;
        let serverIndex = ServerHelp.data.FindServerWithPin(servers, pin);
        //console.log(servers);
        if (servers[serverIndex].admin == socket) {
            //console.log("IS ADMIN");
            console.log("ISADMIN");
            callback(true);
            return
        }
        callback(false)
    })

    /* 2T1L */
    socket.on("HasEntered2T1LChoise", (data, callback) => {
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

    });

    socket.on("2T1LSubmitAnswer", (data, callback) => {
        console.log(data);
        const toPush = {
            currentLobbyIndex,
            data
        };
        let serverIndex = ServerHelp.data.FindServerWithPin(servers, currentPin);
        servers[serverIndex].game.answers.push(toPush);

        //Save correct to leaderboard
        let previousScore = servers[serverIndex].game.leaderboard[currentLobbyIndex].score;

        console.log(servers[serverIndex].game.answers);
        console.log(servers[serverIndex].game.lobby);
        let correctPlayerQuestions = servers[serverIndex].game.lobby[servers[serverIndex].game.currentPlayer].questions;
        let myAnswer = HelperFunctions.data.QuestionIndexToType(correctPlayerQuestions, data);
        console.log(myAnswer);

        let wasCorrect = false;

        if (myAnswer.toString() === correctPlayerQuestions.t.toString()) {
            console.log("CORRECT");
            previousScore += 1;
            wasCorrect = true;
        }

        const toLeaderboard = {
            name: servers[serverIndex].game.leaderboard[currentLobbyIndex].name,
            score: previousScore
        }
        servers[serverIndex].game.leaderboard[currentLobbyIndex] = toLeaderboard;
        console.log(servers[serverIndex].game.leaderboard);

        if (servers[serverIndex].game.answers.length === servers[serverIndex].game.lobby.length) {
            console.log("EVERY ONE HAS ANSWERED");
            servers[serverIndex].game.answers = [];
            servers[serverIndex].game.state = 2;
            servers[serverIndex].game.currentPlayer += 1;

            if (servers[serverIndex].game.currentPlayer === servers[serverIndex].game.lobby.length) {
                console.log("THE GAME IS OVER");
                let winners = FindWinners(servers, serverIndex);
                console.log(winners);
                const toSend = {
                    winners: winners,
                    correct: wasCorrect
                }
                HelperFunctions.data.SendOutWinners(servers, serverIndex, toSend);
                return;
            }
            console.log(wasCorrect);
            console.log("---------------------------------------mmmmmmmmmmmmmmmmmmmmmm");
            HelperFunctions.data.SendOutLeaderboard(servers, serverIndex, wasCorrect);
            //HelperFunctions.data.SendOutQuestion(servers, serverIndex);
        }
        callback(wasCorrect);
    });

    socket.on("1T2LNextQuestion", () => {
        console.log("Player want new question");
        let serverIndex = ServerHelp.data.FindServerWithPin(servers, currentPin);
        servers[serverIndex].game.isReadyForNext.push(true);
        if (servers[serverIndex].game.isReadyForNext.length === servers[serverIndex].game.lobby.length) {
            servers[serverIndex].game.isReadyForNext = [];
            console.log(servers[serverIndex].game.currentPlayer);
            if (servers[serverIndex].game.currentPlayer < servers[serverIndex].game.lobby.length) {
                console.log("Next set of questions");
                servers[serverIndex].game.state = 1;
                HelperFunctions.data.SendOutQuestion(servers, serverIndex);
            } else {
                console.log("THE GAME IS OVER");
                let winners = FindWinners(servers, serverIndex);
                HelperFunctions.data.SendOutWinners(servers, serverIndex, winners);
            }
        }
    });

    /* Speed Math */
    socket.on("GameSpeedMathStartGame", (difficulty) => {
        const pin = currentPin;
        let serverIndex = ServerHelp.data.FindServerWithPin(servers, pin);

        servers[serverIndex].game.GameSpeedMath.score = [];
        servers[serverIndex].game.GameSpeedMath.questionsAsked = 0;

        for (let i = 0; i < servers[serverIndex].connections.length; i++) {
            const connection = servers[serverIndex].connections[i];

            const toAdd = {
                socket: connection.socket,
                name: connection.name,
                score: 0,
                questionResults: []
            }
            servers[serverIndex].game.GameSpeedMath.score.push(toAdd);
        }

        SpeedMath.data.StartGame(servers, serverIndex, socket, difficulty);
        //StartGame(servers, serverIndex, difficulty);
    });

    socket.on("GameSpeedMathSubmitAnswer", (data) => {
        const pin = currentPin;
        let serverIndex = ServerHelp.data.FindServerWithPin(servers, pin);
        console.log(data);
        SpeedMath.data.SubmitAnswer(servers, serverIndex, socket, data);
    });

    /* Spotify Guess */
    socket.on("GameSpotifyGuessStartGame", (data) => {
        const pin = currentPin;
        let serverIndex = ServerHelp.data.FindServerWithPin(servers, pin);
        console.log(data);
        SpotifyGuess.data.SpotifyGuessStartGame(servers, serverIndex, socket, data);
    })
});

function FindWinners(servers, serverIndex) {
    let highest = [];
    let Insert = {
        name: "FirstElementInHighest, shall not pass",
        score: -1
    }
    highest.push(Insert);
    for (let i = 0; i < servers[serverIndex].game.leaderboard.length; i++) {
        const element = servers[serverIndex].game.leaderboard[i];
        if (element.score > highest[0].score) {
            highest = [];
            toInsert = {
                name: element.name.name,
                score: element.score,
            }
            highest.push(toInsert);
        } else {
            if (element.score === highest[0].score) {
                toInsert = {
                    name: element.name.name,
                    score: element.score,
                }
                highest.push(toInsert);
            }
        }

    }
    return highest;
}

http.listen(PORT, () => {
    console.log("Listening on http://localhost:" + PORT);
})