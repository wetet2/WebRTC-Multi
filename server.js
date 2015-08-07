var fs = require('fs');

var port = 10280;
var options = {
    key: fs.readFileSync('ssl/key.pem'),
    cert:fs.readFileSync('ssl/public.cert')
}

var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var app  = express();

var https = require('https').createServer(options, app);
var io = require('socket.io')(https);

app.set('views', path.join(__dirname, 'webrtc'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');


app.use(express.static(path.join(__dirname, 'webrtc')));
app.use(bodyParser.json());
app.use(function(req,res,next){
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.get('/',function(req, res){
    res.sendFile(__dirname + '/webrtc/rooms.html');
});

app.get('/main/:roomId/:user',function(req, res){
    console.log('/main/:roomId/:user');

    res.render('main.html',{roomId:req.params.roomId,user:req.params.user});

    // res.redirect('/main?roomId=123&user=hoyoon');
    // res.sendFile(__dirname + '/webrtc/main.html'+'?roomId='+req.param.roomId+'&user='+req.params.user);
    // res.sendFile(__dirname + '/webrtc/main.html');
});

app.get('/DetectRTC',function(req, res){
    res.sendFile(__dirname + '/webrtc/DetectRTC.html');
});

app.get('/service/getRoomList',function(req, res){
    var key, key2;
    var socketArr = {}, roomIds = [];
    for(key in io.sockets.connected){
        socketArr[key] = 1;
    }
    for(key in io.sockets.adapter.rooms){
        if(socketArr[key] == undefined){
            roomIds.push(key);
        }
    }
    var roomList = {};
    for(var i=0 ; i<roomIds.length ; i++){
        roomList[roomIds[i]] = rooms[roomIds[i]]
    }

    res.set('Content-Type','application/json');
    res.status(200).send(roomList);

});

https.listen(port, function(){
    console.log('Server listening on '+ port +' port');
});

var sockets = [];
var rooms = {};
io.on('connection', function(socket){

    var joinRoomId;
    var peerId = socket.id
    socket.emit('connection', { id:peerId });
    sockets[peerId] = socket;

    socket.on('room-make', function(msg){
        var roomUuid = uuid.v1();
        if(!rooms[roomUuid]){
            rooms[roomUuid] = msg;
            socket.emit('room-made',{roomId:roomUuid})
        }
    });

    socket.on('room-join', function(msg){
        joinRoomId = msg.id;
        socket.join(joinRoomId);
    });

    socket.on('new-user', function(msg){
        console.log('new-user : ' + msg.id);
        io.to(joinRoomId).emit('new-user',msg);
    });

    socket.on('disconnect', function(){
        console.log('disconnected : '+peerId);
        io.to(joinRoomId).emit('disconnect-user',{ by:peerId });
        socket.leave(joinRoomId);

        delete sockets[peerId];
    });

    socket.on('rtc', function(msg){

        var s = sockets[msg.to];
        if(s){
            s.emit('rtc',msg);
        }else{
            console.log('[ERROR] No Socket : ' + msg.to +' : '+ msg.type);
        }

    });



});
