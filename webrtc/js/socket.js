var host = 'https://192.168.245.171:10280';
var roomid,user;
var socket;

$(function(){

    // user = getURLParameter('user');
    // roomId = getURLParameter('roomId');
    user = initUser;
    roomId = initRoomId;

    // var hash = location.hash.substring(1, location.hash.length);
    // console.log('roomid='+roomid);
    // console.log('user='+user);

    function initSocket(){

        socket = io.connect(host ,{reconnection:false});

        socket.on('connection', function(message){
            console.log('You are joined [roomId='+roomId+ '][uuid='+message.id+']');
            uuid = message.id;
            socket.emit('room-join', { id:roomId })
            setTimeout(function(){ socket.emit('new-user', {id:uuid}); }, 1000);
        });

        socket.on('new-user', function(message){
            if(message.id != uuid){
                console.log('new-user:'+message.id);
                makeOffer(message.id);
            }
        });

        socket.on('stream-start', function(message){
            if(message.id != uuid){
                console.log('stream-start:', message.id);
                // alert('stream-start');
                window.location.reload();
                // socket.emit('new-user', {id:uuid});
            }
        });

        socket.on('disconnect-user', function(message){
            console.log('disconnected : '+message.by);
            if(peers[message.by]){
                if(peers[message.by]['screen']){
                    delete peers[message.by]['screen'];
                }
                if(peers[message.by]['audio']){
                    delete peers[message.by]['audio'];
                }
                delete peers[message.by];
                removeVideo(message.by);
            }
        });

        socket.on('rtc', function(message){

            if(message.type == 'offer'){
                receiveOffer(message);
            }else if(message.type == 'ice'){
                receiveIce(message);
            }
            else if(message.type == 'answer'){
                receiveAnswer(message);
            }
        });
    }

    initSocket();
})
