"use strict";

var connection = new signalR.HubConnectionBuilder().withUrl("/WebRTCHub").build();

// u urls treba staviti link servera
const configuration = {
    'iceServers': [{
        'urls': ''
    }]
};
const peerConn = new RTCPeerConnection(configuration);


connection.start().then(function () {
    connection.on('created', function (roomId) {
        console.log('Soba napravljena', roomId);
        roomNameTxt.disabled = true;
        createRoomBtn.disabled = true;
        hasRoomJoined = true;
        connectionStatusMessage.innerText = 'Ušliste u sobu ' + roomId + '. Čekamo ostale...';
        myRoomId = roomId;
        isInitiator = true;
    });

    connection.on('joined', function (roomId) {
        console.log('ID se pridružio sobi: ', roomId);
        myRoomId = roomId;
        isInitiator = false;
    });

    connection.on('error', function (message) {
        alert(message);
    });
}).catch(function (err) {
    return console.error(err.toString());
});

$(createRoomBtn).click(function () {
    var name = roomNameTxt.value;
    connection.invoke("CreateRoom", name).catch(function (err) {
        return console.error(err.toString());
    });
});

$('#roomTable tbody').on('click', 'button', function () {
    if (hasRoomJoined) {
        alert('Već ste se pridružili ovoj sobi.');
    } else {
        var data = $(roomTable).DataTable().row($(this).parents('tr')).data();
        connection.invoke("Join", data.RoomId).catch(function (err) {
            return console.error(err.toString());
        });
    }
});

/*navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    })
    .then(gotStream)
    .catch(function (e) {
        alert('Greška prilikom učitavanja: ' + e.name);
    });*/ // vidi radi li tebi, RADI OK

// TODO Tim: istražiti free WebRTC servere i konfigurisati po tome

// TODO Vedad: Implementacija SignalR metoda na frontendu

// TODO Amar: Review implementiranih metoda, dodavanje dodatne "originalne" funkcijonalnosti