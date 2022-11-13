"use strict";

var connection = new signalR.HubConnectionBuilder().withUrl("/WebRTCHub").build();

// u urls treba staviti link servera
const configuration = {
    'iceServers': [{
        'urls': 'stun:stun.l.google.com:19302'
    }]
};
const peerConn = new RTCPeerConnection(configuration);

const roomNameTxt = document.getElementById('roomNameTxt');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomTable = document.getElementById('roomTable');
const connectionStatusMessage = document.getElementById('connectionStatusMessage');
const fileInput = document.getElementById('fileInput');
const sendFileBtn = document.getElementById('sendFileBtn');
const fileTable = document.getElementById('fileTable');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let myRoomId;
let localStream;
let remoteStream;
let fileReader;
let isInitiator = false;
let hasRoomJoined = false;

fileInput.disabled = true;
sendFileBtn.disabled = true;

$(roomTable).DataTable({
    columns: [
        { data: 'RoomId', "width": "30%" },
        { data: 'Name', "width": "50%" },
        { data: 'Button', "width": "15%" }
    ],
    "lengthChange": false,
    "searching": false,
    "language": {
        "emptyTable": "Nema dostupnih soba!"
    }
});

grabWebCamVideo();

connection.start().then(function () {
    connection.on('created', function (roomId) {
        console.log('Soba napravljena', roomId);
        roomNameTxt.disabled = true;
        createRoomBtn.disabled = true;
        hasRoomJoined = true;
        connectionStatusMessage.innerText = 'Ušli ste u sobu ' + roomId + '. Čekamo ostale...';
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

    connection.on('ready', function () {
        console.log('ready debbug');
        roomNameTxt.disabled = true;
        createRoomBtn.disabled = true;
        hasRoomJoined = true;
        connectionStatusMessage.innerText = 'Connecting...';
        createPeerConnection(isInitiator, configuration);
    });

    connection.on('message', function (message) {
        console.log('Klijent primio poruku:', message);
        signalingMessageCallback(message);
    });

    connection.on('bye', function () {
        console.log(`Peer leaving room.`);
        connectionStatusMessage.innerText = `OStali su izašli iz sobe ${myRoomId}.`;
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

function grabWebCamVideo() {
    console.log('getUserMedia (video) ...');
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    })
        .then(gotStream)
        .catch(function (e) {
            alert('getUserMedia() error: ' + e.name);
        });
}

function gotStream(stream) {
    console.log('getUserMedia video stream URL:', stream);
    localStream = stream;
    peerConn.addStream(localStream);
    localVideo.srcObject = stream;
}

var dataChannel;

function signalingMessageCallback(message) {
    if (message.type === 'offer') {
        console.log('Got offer. Sending answer to peer.');
        peerConn.setRemoteDescription(new RTCSessionDescription(message), function () { },
            logError);
        peerConn.createAnswer(onLocalSessionCreated, logError);

    } else if (message.type === 'answer') {
        console.log('Got answer.');
        peerConn.setRemoteDescription(new RTCSessionDescription(message), function () { },
            logError);

    } else if (message.type === 'candidate') {
        peerConn.addIceCandidate(new RTCIceCandidate({
            candidate: message.candidate,
            sdpMLineIndex: message.label,
            sdpMid: message.id
        }));

    }
}

function createPeerConnection(isInitiator, config) {
    console.log('Creating Peer connection as initiator?', isInitiator, 'config:',
        config);

    peerConn.onicecandidate = function (event) {
        console.log('icecandidate event:', event);
        if (event.candidate) {

        } else {
            console.log('End of candidates.');
            sendMessage(peerConn.localDescription);
        }
    };

    peerConn.ontrack = function (event) {
        console.log('icecandidate ontrack event:', event);
        remoteVideo.srcObject = event.streams[0];
    };

    if (isInitiator) {
        console.log('Creating Data Channel');
        dataChannel = peerConn.createDataChannel('sendDataChannel');
        onDataChannelCreated(dataChannel);

        console.log('Creating an offer');
        peerConn.createOffer(onLocalSessionCreated, logError);
    } else {
        peerConn.ondatachannel = function (event) {
            console.log('ondatachannel:', event.channel);
            dataChannel = event.channel;
            onDataChannelCreated(dataChannel);
        };
    }
}

function onLocalSessionCreated(desc) {
    console.log('local session created:', desc);
    peerConn.setLocalDescription(desc, function () {
        // Trickle ICE
        //console.log('sending local desc:', peerConn.localDescription);
        //sendMessage(peerConn.localDescription);
    }, logError);
}


function onDataChannelCreated(channel) {
    channel.onopen = function () {
        console.log('Channel opened!!!');
        connectionStatusMessage.innerText = 'Channel opened!!';
        fileInput.disabled = false;
    };

    // TODO: možeš li ti ovo pogledati? onclose

    channel.onmessage = onReceiveMessageCallback();
}

function logError(err) {
    if (!err) return;
    if (typeof err === 'string') {
        console.warn(err);
    } else {
        console.warn(err.toString(), err);
    }
}