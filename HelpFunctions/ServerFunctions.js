var methods = {};

methods.FindServerWithPin = function(servers, pin) {
    for (let i = 0; i < servers.length; i++) {
        const server = servers[i];
        if (server.pin.toString() === pin.toString()) {
            return (i);
        }
    }
    return (-1);
}

methods.AddPlayerToServer = function(servers, index, player, socket) {
    connections = servers[index].connections;
    const Player = {
        socket: socket,
        name: player.name
    }
    connections.push(Player)
    servers[index].connections = connections;

    console.log("JOINED SERVER");
    console.log(servers);
    return servers;
}

methods.EmitToSpecialServer = function(servers, serverIndex, emit, toSend) {
    for (let i = 0; i < servers[serverIndex].connections.length; i++) {
        const connection = servers[serverIndex].connections[i];
        connection.socket.emit(emit.toString(), toSend);
    }
}

methods.FindPersonInfoWithSocket = function(servers, serverIndex, socket) {
    for (let i = 0; i < servers[serverIndex].connections.length; i++) {
        const element = servers[serverIndex].connections[i];
        console.log(element);
        if (element.socket === socket) {
            const toReturn = {
                name: servers[serverIndex].connections[i].name
            }
            return toReturn;
        }
    }
    return -1;
}

exports.data = methods;