const ServerHelp = require("../HelpFunctions/ServerFunctions.js");

methods = {}

methods.randomIntFromInterval = function(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min);
}

methods.SendOutQuestion = function(servers, serverIndex) {
    const questions = servers[serverIndex].game.lobby[servers[serverIndex].game.currentPlayer].questions;
    console.log(questions);
    const toSend = {
        questions: questions,
        name: servers[serverIndex].game.lobby[servers[serverIndex].game.currentPlayer].name
    }
    ServerHelp.data.EmitToSpecialServer(servers, serverIndex, "Show1T2LQuestion", toSend);
}

methods.SendOutLeaderboard = function(servers, serverIndex, wasCorrect) {
    const leaderboard = servers[serverIndex].game.leaderboard;
    for (let i = 0; i < servers[serverIndex].connections.length; i++) {
        const name = servers[serverIndex].connections[i];
        console.log(name);
        for (let j = 0; j < servers[serverIndex].game.leaderboard.length; j++) {
            const leaderboardPos = servers[serverIndex].game.leaderboard[j];
            console.log(leaderboardPos);
            if (name.name.toString() === leaderboardPos.name.name.toString()) {
                console.log("TEST1");
                name.socket.emit("Show1T2LLeaderboard", leaderboard, j, wasCorrect);
            }
        }
    }
    //ServerHelp.data.EmitToSpecialServer(servers, serverIndex, "Show1T2LLeaderboard", leaderboard);
}

methods.SendOutWinners = function(servers, serverIndex, data) {
    ServerHelp.data.EmitToSpecialServer(servers, serverIndex, "2T1LWinners", data);
}

methods.QuestionIndexToType = function(questions, index) {
    if (index === 0) {
        return questions.t;
    }
    if (index === 1) {
        return questions.l1;
    }
    if (index === 2) {
        return questions.l2;
    }
}

exports.data = methods;