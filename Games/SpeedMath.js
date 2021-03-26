let methods = {}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}

function GenerateRandomMathQuestion(data) {
    mathOperation = "PLUS"

    let min = 1;
    let max = 10;

    if (data == "1") { //Easy
        min = 1;
        max = 10;
    }
    if (data == "2") { //Easy
        min = 1;
        max = 100;
    }
    if (data == "3") { //Easy
        min = 1;
        max = 1000;
    }

    random1 = getRandomInt(min, max)
    random2 = getRandomInt(min, max)

    answer = 0;

    if (mathOperation == "PLUS") {
        answer = random1 + random2;
    }

    const question = {
        problem: (random1 + " + " + random2),
        answer: answer
    }
    return question
}

function FindScoreIndexWithSocket(servers, serverIndex, socket) {
    for (let i = 0; i < servers[serverIndex].game.GameSpeedMath.score.length; i++) {
        const element = servers[serverIndex].game.GameSpeedMath.score[i];
        if (element.socket == socket) {
            return i;
        }
    }
    return -1
}

function FindPlayerWithSocket(servers, serverIndex, socket) {
    for (let i = 0; i < servers[serverIndex].game.GameSpeedMath.players.length; i++) {
        const player = servers[serverIndex].game.GameSpeedMath.players[i];
        if (player.socket === socket) {
            return player;
        }
    }
    return -1;
}

function SendOutResults(servers, serverIndex, socket) {
    let toSend = {
        results: [],
        winners: []
    }

    for (let i = 0; i < servers[serverIndex].game.GameSpeedMath.score.length; i++) {
        const element = servers[serverIndex].game.GameSpeedMath.score[i];
        console.log(element);
        if (socket === element.socket) {
            toSend.results = element.questionResults;
            console.log(toSend);
        }
    }

    let winners = [];

    for (let i = 0; i < servers[serverIndex].game.GameSpeedMath.score.length; i++) {
        const element = servers[serverIndex].game.GameSpeedMath.score[i];
        let toPush = {
            name: element.name,
            score: element.score,
            questionResults: element.questionResults
        }
        if (winners.length === 0) {
            winners.push(toPush);
        } else {
            if (winners[0].score < element.score) {
                winners = [];
                winners.push(toPush);
            } else if (winners[0].score === element.score) {
                winners.push(toPush);
            }
        }
    }

    toSend.winners = winners;
    console.log(toSend);
    for (let i = 0; i < servers[serverIndex].game.GameSpeedMath.score.length; i++) {
        const element = servers[serverIndex].game.GameSpeedMath.score[i];
        toSend.results = element.questionResults;
        console.log(toSend);
        console.log(element);
        element.socket.emit("GameSpeedMathWinners", toSend);
    }
}

methods.StartGame = function(servers, serverIndex, socket, data) {
    console.log(servers[serverIndex]);
    console.log(data);
    servers[serverIndex].game.GameSpeedMath.difficulty = data;


    //servers[serverIndex].game.GameSpeedMath.hasAnswered = 0;
    //servers[serverIndex].game.GameSpeedMath.questionsAsked += 1;

    for (let i = 0; i < 5; i++) {
        question = GenerateRandomMathQuestion(data);

        servers[serverIndex].game.GameSpeedMath.questions.push(question);
    }

    console.log(servers[serverIndex].game.GameSpeedMath.questions);

    data = {
        question: servers[serverIndex].game.GameSpeedMath.questions[0]
    }

    //Start the game
    for (let i = 0; i < servers[serverIndex].connections.length; i++) {
        const connection = servers[serverIndex].connections[i];

        //Generate players in game:
        const toPush = {
            socket: connection.socket,
            currentQuestion: 0,
        }
        servers[serverIndex].game.GameSpeedMath.players.push(toPush);

        connection.socket.emit("GameSpeedMathShowQuestion", data);
    }
}

methods.SendOutNextQuestion = function(servers, serverIndex, socket, correct) {
    for (let i = 0; i < servers[serverIndex].game.GameSpeedMath.players.length; i++) {
        const player = servers[serverIndex].game.GameSpeedMath.players[i];

        if (player.socket === socket) {

            const gamePlayer = FindPlayerWithSocket(servers, serverIndex, socket);

            if (gamePlayer === -1) { return }

            if (gamePlayer.currentQuestion === servers[serverIndex].game.GameSpeedMath.questions.length - 1) {
                // Player has answered every question
                servers[serverIndex].game.GameSpeedMath.hasAnsweredAllQuestions += 1;

                console.log("ONE PLAYER IS DONE");
                console.log(servers[serverIndex].game.GameSpeedMath.hasAnsweredAllQuestions);
                console.log(servers[serverIndex].connections.length);
                console.log(servers[serverIndex].game.GameSpeedMath.players.length);

                if (servers[serverIndex].game.GameSpeedMath.hasAnsweredAllQuestions === servers[serverIndex].connections.length) {
                    console.log("EVERY ONE IS DONE");
                    //Everyone has answered every question

                    SendOutResults(servers, serverIndex, socket);

                    return;
                }

                //Has answered every question

                scoreIndex = FindScoreIndexWithSocket(servers, serverIndex, socket);

                const data = {
                    score: servers[serverIndex].game.GameSpeedMath.score[scoreIndex].score,
                    results: servers[serverIndex].game.GameSpeedMath.score[scoreIndex].questionResults
                }

                socket.emit("GameSpeedMathHasAnswered", data);

                return;
            }

            gamePlayer.currentQuestion += 1;
            nextQuestionString = servers[serverIndex].game.GameSpeedMath.questions[gamePlayer.currentQuestion];

            const data = {
                problem: nextQuestionString.problem,
                answer: nextQuestionString.answer
            }

            console.log(data);

            player.socket.emit("GameSpeedMathNextQuestion", data);
            return;
        }
    }
}

methods.SubmitAnswer = function(servers, serverIndex, socket, data) {
    console.log(data);

    console.log(servers[serverIndex].game.GameSpeedMath);
    let correct = false;
    if (data.correctAnswer.toString() === data.answer) {
        correct = true;
    }

    scoreIndex = FindScoreIndexWithSocket(servers, serverIndex, socket);
    if (scoreIndex === -1) { return; }

    servers[serverIndex].game.GameSpeedMath.hasAnswered += 1;
    if (correct) {
        servers[serverIndex].game.GameSpeedMath.score[scoreIndex].score += 1;
    } else {
        servers[serverIndex].game.GameSpeedMath.score[scoreIndex].score -= 1;
    }

    const currentPlayer = FindPlayerWithSocket(servers, serverIndex, socket);
    if (currentPlayer === -1) { return; }


    const prevQuestion = servers[serverIndex].game.GameSpeedMath.questions[currentPlayer.currentQuestion];

    const toAdd = {
        question: prevQuestion,
        correctAnswer: data.correctAnswer.toString(),
        myAnswer: data.answer.toString()
    }

    servers[serverIndex].game.GameSpeedMath.score[scoreIndex].questionResults.push(toAdd);

    console.log("gHAKSGKDJGHKDSHGKJDHKGJHDSJKGHKDSHGSDJKG");

    this.SendOutNextQuestion(servers, serverIndex, socket, correct);


    /*if (servers[serverIndex].game.GameSpeedMath.hasAnswered === servers[serverIndex].connections.length) {
        //console.log("NEXT QUESTION");
        if (servers[serverIndex].game.GameSpeedMath.questionsAsked >= 5) {
            console.log("DONE");
            return;
        }
        //this.StartGame(servers, serverIndex, socket, servers[serverIndex].game.GameSpeedMath.difficulty);
        //return;
    } else {
        //data = {
        //    correct: correct,
        //    score: servers[serverIndex].game.GameSpeedMath.score[scoreIndex].score
        //}

        //socket.emit("GameSpeedMathHasAnswered", data)
    }

    this.StartGame(servers, serverIndex, socket, servers[serverIndex].game.GameSpeedMath.difficulty);

    console.log(servers[serverIndex].game.GameSpeedMath);*/
}

exports.data = methods;