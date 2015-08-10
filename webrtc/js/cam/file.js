//public function
var addFileArray;
var onReadAsDataURL;

$(function(){

    var chunkLength = 64 * 1024;
    var arrayToStoreChunks = [];

    addFileArray = function(data){
        arrayToStoreChunks.push(data.message);
        if(data.last){
            saveToDisk(arrayToStoreChunks.join(''), data.name);
            arrayToStoreChunks = [];
        }
    }

    onReadAsDataURL = function(event, text){
        var data = {};
        if (event) text = event.target.result;
        if(text.length >chunkLength){
            data.message = text.slice(0, chunkLength);
        }else{
            data.message = text;
            data.last = true;
            data.name = getSelectedFileName();
        }

        for(var peer in peers){
            var msg = {type:'file', data:data};
            peers[peer].sendDataChannel.send(JSON.stringify(msg));
        }

        var remainingDataURL = text.slice(data.message.length);
        if(remainingDataURL.length){
            setTimeout(function(){
                onReadAsDataURL(null, remainingDataURL);
            }, 50);
        }

    }

    function saveToDisk(data, fileName){

        var blob = b64toBlob(data.split(',')[1]);
        var save = document.createElement('a');
        save.href = URL.createObjectURL(blob);
        save.download = fileName;
        save.target = '_blank';
        save.text = fileName;
        addFile(save);

        var br = document.createElement('br');
        addFile(br);

    }

    function b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;

        var byteCharacters = atob(b64Data);
        var byteArrays = [];

        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);

            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            var byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        var blob = new Blob(byteArrays, {type: contentType});
        return blob;
    }

})
