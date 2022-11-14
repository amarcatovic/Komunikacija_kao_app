"use strict";

var connection = new signalR.HubConnectionBuilder().withUrl("/WebRTCHub").build();

// Postavke
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
        "emptyTable": "No room available"
    }
});

// Postavke video/audio
grabWebCamVideo();

// Spajanje sa backendom
connection.start().then(function () {

    connection.on('updateRoom', function (data) {
        var obj = JSON.parse(data);
        $(roomTable).DataTable().clear().rows.add(obj).draw();
    });

    connection.on('created', function (roomId) {
        roomNameTxt.disabled = true;
        createRoomBtn.disabled = true;
        hasRoomJoined = true;
        connectionStatusMessage.innerText = 'Soba ' + roomId + ' je napravljena. Čekamo ostale...';
        myRoomId = roomId;
        isInitiator = true;
    });

    connection.on('joined', function (roomId) {
        myRoomId = roomId;
        isInitiator = false;
    });

    connection.on('error', function (message) {
        alert(message);
    });

    connection.on('ready', function () {
        roomNameTxt.disabled = true;
        createRoomBtn.disabled = true;
        hasRoomJoined = true;
        connectionStatusMessage.innerText = 'Spajanje...';
        createPeerConnection(isInitiator, configuration);
    });

    connection.on('message', function (message) {
        signalingMessageCallback(message);
    });

    connection.on('bye', function () {
        connectionStatusMessage.innerText = `Korisnik je napustio sobu ${myRoomId}.`;
    });

    window.addEventListener('unload', function () {
        if (hasRoomJoined) {
            connection.invoke("LeaveRoom", myRoomId).catch(function (err) {
                return console.error(err.toString());
            });
        }
    });

    connection.invoke("GetRoomInfo").catch(function (err) {
        return console.error(err.toString());
    });

}).catch(function (err) {
    return console.error(err.toString());
});

function sendMessage(message) {
    connection.invoke("SendMessage", myRoomId, message).catch(function (err) {
        return console.error(err.toString());
    });
}

// Upravljanje sobom
$(createRoomBtn).click(function () {
    var name = roomNameTxt.value;
    connection.invoke("CreateRoom", name).catch(function (err) {
        return console.error(err.toString());
    });
});

$('#roomTable tbody').on('click', 'button', function () {
    if (hasRoomJoined) {
        alert('Već se nalazite u sobi!');
    } else {
        var data = $(roomTable).DataTable().row($(this).parents('tr')).data();
        connection.invoke("Join", data.RoomId).catch(function (err) {
            return console.error(err.toString());
        });
    }
});

$(fileInput).change(function () {
    let file = fileInput.files[0];
    if (file) {
        sendFileBtn.disabled = false;
    } else {
        sendFileBtn.disabled = true;
    }
});

$(sendFileBtn).click(function () {
    sendFileBtn.disabled = true;
    sendFile();
});

// WebRTC postavke
function grabWebCamVideo() {
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
    localStream = stream;
    peerConn.addStream(localStream);
    localVideo.srcObject = stream;
}

var dataChannel;

function signalingMessageCallback(message) {
    if (message.type === 'offer') {
        peerConn.setRemoteDescription(new RTCSessionDescription(message), function () { },
            logError);
        peerConn.createAnswer(onLocalSessionCreated, logError);

    } else if (message.type === 'answer') {
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
    peerConn.onicecandidate = function (event) {
        console.log('icecandidate event:', event);
        if (!event.candidate) {
            sendMessage(peerConn.localDescription);
        }
    };

    peerConn.ontrack = function (event) {
        remoteVideo.srcObject = event.streams[0];
    };

    if (isInitiator) {
        dataChannel = peerConn.createDataChannel('sendDataChannel');
        onDataChannelCreated(dataChannel);
        peerConn.createOffer(onLocalSessionCreated, logError);
    } else {
        peerConn.ondatachannel = function (event) {
            dataChannel = event.channel;
            onDataChannelCreated(dataChannel);
        };
    }
}

function onLocalSessionCreated(desc) {
    peerConn.setLocalDescription(desc, function () { }, logError);
}

function onDataChannelCreated(channel) {
    channel.onopen = function () {
        connectionStatusMessage.innerText = 'Konekcija uspostavljena!';
        fileInput.disabled = false;
    };

    channel.onclose = function () {
        connectionStatusMessage.innerText = 'Konekcija zatvorena!';
    }

    channel.onmessage = onReceiveMessageCallback();
}

function onReceiveMessageCallback() {
    let count;
    let fileSize, fileName;
    let receiveBuffer = [];

    return function onmessage(event) {
        if (typeof event.data === 'string') {
            const fileMetaInfo = event.data.split(',');
            fileSize = parseInt(fileMetaInfo[0]);
            fileName = fileMetaInfo[1];
            count = 0;
            return;
        }

        receiveBuffer.push(event.data);
        count += event.data.byteLength;

        if (fileSize === count) {
            const received = new Blob(receiveBuffer);
            receiveBuffer = [];

            $(fileTable).children('tbody').append('<tr><td><a></a></td></tr>');
            const downloadAnchor = $(fileTable).find('a:last');
            downloadAnchor.attr('href', URL.createObjectURL(received));
            downloadAnchor.attr('download', fileName);
            downloadAnchor.text(`${fileName} (${fileSize} bytes)`);
        }
    };
}

function sendFile() {
    const file = fileInput.files[0];

    if (file.size === 0) {
        alert('Niste izabrali ništa.');
        return;
    }

    dataChannel.send(file.size + ',' + file.name);

    const chunkSize = 16384;
    fileReader = new FileReader();
    let offset = 0;
    fileReader.addEventListener('error', error => console.error('Datoteka se ne može učitati:', error));
    fileReader.addEventListener('abort', event => console.log('Obustavljeno:', event));
    fileReader.addEventListener('load', e => {
        dataChannel.send(e.target.result);
        offset += e.target.result.byteLength;
        if (offset < file.size) {
            readSlice(offset);
        } else {
            alert(`${file.name} je uspješno poslan.`);
            sendFileBtn.disabled = false;
        }
    });
    const readSlice = o => {
        console.log('readSlice ', o);
        const slice = file.slice(offset, o + chunkSize);
        fileReader.readAsArrayBuffer(slice);
    };
    readSlice(0);
}

// Helperi
function logError(err) {
    if (!err) return;
    if (typeof err === 'string') {
        console.warn(err);
    } else {
        console.warn(err.toString(), err);
    }
}