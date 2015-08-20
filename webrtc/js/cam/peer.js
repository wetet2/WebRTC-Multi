var peers = {};
var localStream = {};
var uuid;

// public function
var makeOffer;
var receiveOffer;
var receiveIce;
var receiveAnswer;
var getPeer;
var startStream;

var servers =
    {"iceServers":[
        {url:'stun:stun.l.google.com:19302'},
        {url:'stun:stun1.l.google.com:19302'},
        {url:'stun:stun2.l.google.com:19302'},
        {url:'stun:stun3.l.google.com:19302'},
        {url:'stun:stun4.l.google.com:19302'}
    ]};

var sdpConstraints = {
    'mandatory': {
        'OfferToReceiveAudio': true,
        'OfferToReceiveVideo': true
    }
};

$(function(){

    var localVideo = $('#localVideo')[0];
    var remoteVideo = $('#remoteVideo')[0];

    startStream = function(){

        ////////// Using Webcam  //////////
        navigator.getUserMedia({
            audio: true,
            video: {
                mandatory:{
                maxWidth: 200,
                maxHeight: 150,
                minAspectRatio: 1.33
                }
            }
        }, function(stream){
            stream.type = 'audio';
            gotStream(stream);
        }, function(e){
            var error = 'getScreenId() error: ' + e.name+': '+e.message
            console.error(error);
            alert(error);
        });

        ////////// Another usage for using Webcam //////////
        // navigator.mediaDevices.getUserMedia({
        //     audio: true,
        //     video: {
        //         mandatory:{
        //         maxWidth: 200,
        //         maxHeight: 150,
        //         minAspectRatio: 1.33
        //         }
        //     }
        //     // video: false
        //     // chromeMediaSource: 'screen'
        // })
        // .then(gotStream)
        // .catch(function(e) {
        //     var error = 'getScreenId() error: ' + e.name+': '+e.message
        //     console.error(error);
        //     alert(error);
        // });

    }

    function gotStream(stream){
        console.log('gotStream');
        localStream[stream.type] = stream;
        addMedia(stream, 'self_stream_' + stream.type);

        if(localStream['audio']){
            socket.emit('new-user', {id:uuid});
        }
    }

    makeOffer = function(toId){

        var peerAudio = getPeer(toId, localStream['audio'], 'audio');
        if(peerAudio){
            peerAudio.createOffer(
                function(desc){
                    console.log('createOffer : audio');
                    peerAudio.setLocalDescription(desc);
                    socket.emit('rtc', {type:'offer',peer:'audio', by:uuid, to:toId, sdp:desc} );
                },
                function(err){
                    console.log('[Error]createOffer : audio desc: ' + err.toString());
                },
                sdpConstraints
            );
        }else{
            console.error('Invalid peer');
        }

    }

    getPeer = function(id, stream, peerType){

        var peer;

        if(!peers[id]){

            peerAudio = peers[id] = new RTCPeerConnection(servers);
            peerAudio.type = 'audio';
            peerAudio.onicecandidate = function(e){
                if(e.candidate){
                    socket.emit('rtc',{type:'ice',peer:'audio', by:uuid, to:id, data:e.candidate});
                }
            };
            if(stream){
                peerAudio.addStream(stream);
            }
            peerAudio.onaddstream = function(e){
                e.stream.type = 'audio';
                addMedia(e.stream, id+'_audio');
            }

            var dataConstraint = null;
            var sendChannel = peerAudio.createDataChannel(id+'channel', dataConstraint);
            peerAudio.sendDataChannel = sendChannel;
            peerAudio.ondatachannel = function(e){
                e.channel.onmessage = onDataMessage;
            }
        }

        peer = peers[id];

        return peer;
    }

    receiveOffer = function(message){
        console.log('onMessage offer['+message.peer+'] by '+ message.by);
        var peer = getPeer(message.by, localStream[message.peer], message.peer);
        if(peer){
            var offer = new RTCSessionDescription(message.sdp);
            peer.setRemoteDescription(offer
                , function(pc){
                    console.log('peer setRemoteDescription complete : '+message.peer);
                    peer.createAnswer(
                        function(desc){
                            peer.setLocalDescription(desc);
                            socket.emit('rtc', {type:'answer',peer:message.peer,  by:uuid, to:message.by , sdp:desc});
                        }
                        , function(err){
                            console.log('[Error]createAnswer:'+message.peer+':'+ err.toString());
                        }
                        , sdpConstraints
                    );
                }
                , function(err){
                    console.log('[Error]setRemoteDescription: ' + err.toString());
                }
            );
        }else{
            console.error('Invalid user : '+message.by);
        }
    }

    receiveIce = function(message){
        if(message.data){

            var peer = getPeer(message.by, null, message.peer);
            if(peer){
                peer.addIceCandidate(new RTCIceCandidate(message.data)
                    ,function(){
                        // console.log('addIceCandidate success');
                    }
                    ,function(err){
                        console.log('addIceCandidate error:' + err)
                    }
                );
            }else {
                console.alert('Invalid user : ' + message.by);
            }
        }
    }

    receiveAnswer = function(message){
        console.log('onMessage answer.');
        var peer = getPeer(message.by, null, message.peer);
        if(peer){
            var answer = new RTCSessionDescription(message.sdp);
            peer.setRemoteDescription(answer
                , function(pc){
                    console.log('peer setRemoteDescription complete ['+message.peer+']');
                }
                , function(err){
                    console.log('[Error]Session desc['+message.peer+'] ' + err.toString());
                }
            );
        }else{
            console.alert('Invalid user : '+message.by);
        }
    }

    function onDataMessage(e){
        //text content
        var msg = JSON.parse(e.data);
        if(msg.type == 'chat'){
            addChatContent(msg.data);
        }else if(msg.type == 'file'){
            addFileArray(msg.data);
        }
    };


})
