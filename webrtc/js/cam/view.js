
//public function
var addChatContent;
var addMedia;
var addFile;
var removeVideo;
var getSelectedFileName;

$(function(){

    var msgInput = $('#msgInput');
    var btnStream = $('#btnStream');
    var btnReconnect = $('#btnReconnect');
    var btnRefresh = $('#btnRefresh');
    var btnFileTranster = $('#btnFileTranster');
    var fileTransfer = $('#fileTransfer');


    var divChat = $('#divChat');
    var divVideo = $('#divVideo');
    var divAudio = $('#divAudio');
    var divFiles = $('#divFiles');

    var defatulVideoWidth = '320px';
    var defatulVideoHeight = '200px';

    btnFileTranster.hide();

    addChatContent = function(msg){
        divChat.append(msg+'<br>');
    }

    addMedia = function(stream, id){
        if(stream.id == 'default') return;
        var video = document.createElement('video');
        video.setAttribute('autoplay','');
        video.setAttribute('id',id);
        video.setAttribute('style','width:'+defatulVideoWidth+' ; height:'+defatulVideoHeight+'')
        video.onclick = function(){
            if(this.style.width == defatulVideoWidth){
                this.style.width = '1024px';
                this.style.height = '640px';
            }else{
                this.style.width = defatulVideoWidth;
                this.style.height = defatulVideoHeight;
            }
        }
        attachMediaStream(video, stream);
        divVideo[0].appendChild(video);
    }

    addFile = function(element){
        divFiles[0].appendChild(element);
    }

    removeVideo = function(id){
        var screenElement = $('#'+id+'_screen');
        screenElement.remove();
        var audioElement = $('#'+id+'_audio');
        audioElement.remove();
    }

    getSelectedFileName = function(){
        return fileTransfer[0].files[0].name;
    }

    msgInput.keydown(function(e){
        if(e.keyCode === 13){
            var msg = $(this).val();
            if(msg){
                addChatContent(msg);
                msgInput.val('');
                for(var peer in peers){
                    var chat = {type:'chat',data:msg};
                    peers[peer].sendDataChannel.send(JSON.stringify(chat));
                }
            }
        }
    });

    btnStream.on('click',function(){
        startStream();
    });

    btnReconnect.on('click',function(){
        if(socket)
            socket.disconnect();

        removeVideo('self_stream');
        for(var key in peers)
            removeVideo(key);

        for(var key in localStream)
            if(localStream[key]) localStream[key].stop();

        delete peers;
        peers = {};

        setTimeout(function(){
            if(socket) socket.connect();
            else initSocket();
        }, 1000);

    });

    btnRefresh.on('click',function(){
        location.reload();
    });

    fileTransfer.on('change', function(){
        btnFileTranster.show();
    });

    btnFileTranster.on('click', function(){
        var file = fileTransfer[0].files[0];
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = onReadAsDataURL;
        btnFileTranster.hide();
        setTimeout(function(){ btnFileTranster.show();}, 5000);
    });

})
