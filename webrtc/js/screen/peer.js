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

        ////////// Screen Capturing //////////
        getScreenId(function (error, sourceId, screen_constraints) {
            navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
            navigator.getUserMedia(screen_constraints, function (stream) {

                stream.type = 'screen';
                gotStream(stream);

            }, function (e) {
                var error = 'getScreenId() error: ' + e.name+': '+e.message
                console.error(error);
                alert(error);
            });
        });

        ////////// Using Webcam without video //////////
        navigator.getUserMedia({
            audio: true,
            // video: {
            //     mandatory:{
            //     maxWidth: 200,
            //     maxHeight: 150,
            //     minAspectRatio: 1.33
            //     }
            // }
            video: false
        }, function(stream){
            stream.type = 'audio';
            gotStream(stream);
        }, function(e){
            var error = 'getUserMedia() error: ' + e.name+': '+e.message
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
        //     var error = 'getUserMedia() error: ' + e.name+': '+e.message
        //     console.error(error);
        //     alert(error);
        // });

    }

    function gotStream(stream){
        console.log('gotStream');
        localStream[stream.type] = stream;
        addMedia(stream, 'self_stream_' + stream.type);

        if(localStream['screen'] && localStream['audio']){
            // socket.emit('new-user', {id:uuid});
            socket.emit('stream-start', {id:uuid});
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

        var peerScreen = getPeer(toId, localStream['screen'], 'screen');
        if(peerScreen){
            peerScreen.createOffer(
                function(desc){
                    console.log('createOffer : screen');
                    peerScreen.setLocalDescription(desc);
                    socket.emit('rtc', {type:'offer',peer:'screen', by:uuid, to:toId, sdp:desc} );
                },
                function(err){
                    console.log('[Error]createOffer screen desc: ' + err.toString());
                },
                sdpConstraints
            );
        }else{
            console.error('Invalid peer');
        }


    }

    getPeer = function(id, stream, peerType){

        var peer;

        if(!peers[id]) peers[id] = {};

        if(peerType == 'screen' && !peers[id]['screen']){

            var peerScreen, peerAudio;
            peerScreen = peers[id]['screen'] = new RTCPeerConnection(servers);
            peerScreen.type = 'screen';
            peerScreen.onicecandidate = function(e){
                if(e.candidate){
                    socket.emit('rtc',{type:'ice',peer:'screen', by:uuid, to:id, data:e.candidate});
                }
            };
            if(stream){
                peerScreen.addStream(stream);
            }
            peerScreen.onaddstream = function(e){
                e.stream.type = 'screen';
                addMedia(e.stream, id +'_screen');
            };

            var dataConstraint = null;
            var sendChannel = peerScreen.createDataChannel(id+'channel', dataConstraint);
            peerScreen.sendDataChannel = sendChannel;
            peerScreen.ondatachannel = function(e){
                e.channel.onmessage = onDataMessage;
            }
        }

        if(peerType == 'audio' && !peers[id]['audio']){

            peerAudio = peers[id]['audio'] = new RTCPeerConnection(servers);
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
        }


        peer = peers[id][peerType];

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
            // console.log('onMessage ice candidate');

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
