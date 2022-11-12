"use strict";

var connection = new signalR.HubConnectionBuilder().withUrl("/WebRTCHub").build();

// u urls treba staviti link servera
const configuration = {
    'iceServers': [{
        'urls': ''
    }]
};
const peerConn = new RTCPeerConnection(configuration);

navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    })
    .then(gotStream)
    .catch(function (e) {
        alert('Greška prilikom učitavanja: ' + e.name);
    }); // vidi radi li tebi

// TODO Tim: istražiti free WebRTC servere i konfigurisati po tome

// TODO Vedad: Implementacija SignalR metoda na frontendu

// TODO Amar: Review implementiranih metoda, dodavanje dodatne "originalne" funkcijonalnosti