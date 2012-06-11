var app = require('express').createServer()
  , mongoose = require('mongoose')
  , io = require('socket.io').listen(app);

var portNumber = 3000;

var Schema = mongoose.Schema;
var ChatSchema = new Schema({
	time: {type: Date},
	user: {type: String},
	message: {type: String, trim: true}
});
var ChatModel = mongoose.model('Chat', ChatSchema);

var Checkers = require('./checkers').Checkers;

mongoose.connect('mongodb://localhost/lvg');

var fetchRecentMessages = function(callback) {
	var chatModel = mongoose.model('Chat');
	chatModel
	  .find()
	  .sort('time', -1) // descending
	  .limit(5)
	  .run(callback);
};
var logMessage = function(data) {
	var chatModel = mongoose.model('Chat');
	new ChatModel({time: new Date(), user: data.user, message: data.message}).save();
};
app.listen(portNumber);

app.get('/board.css', function(req, res) {
	res.sendfile(__dirname + '/board.css');
});
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

var checkers = new Checkers(8, 8, [
	{x: 0, y: 0, player: 'white'},
	{x: 0, y: 2, player: 'white'},
	{x: 1, y: 1, player: 'white'},
	{x: 2, y: 0, player: 'white'},
	{x: 2, y: 2, player: 'white'},
	{x: 3, y: 1, player: 'white'},
	{x: 4, y: 0, player: 'white'},
	{x: 4, y: 2, player: 'white'},
	{x: 5, y: 1, player: 'white'},
	{x: 6, y: 0, player: 'white'},
	{x: 6, y: 2, player: 'white'},
	{x: 7, y: 1, player: 'white'}]);

var refreshBoard = function(socket, result) {
	socket.emit('update', {result: true, board: checkers.getPieces()});
};
io.sockets.on('connection', function (socket) {
	
	// chat protocol
	socket.emit('message', {
		user: 'server',
		message: 'MOTD: some bullshit' 
	});

	socket.broadcast.emit('message', {
		user: 'server',
		message: 'new user connected' 
	});

	socket.on('message', function(data) {
		console.log(data);
		socket.broadcast.emit('message', data);
		socket.emit('message', data);
		logMessage(data);
	});

	socket.on('disconnect', function() {
		socket.broadcast.emit('message', {
			user: 'server',
			message: 'someone quit! well fuck them' 
		});
		socket.broadcast.emit('user_disconnect', {user: socket.id});
	});

	socket.on('user_connect', function(data) {
		for(prop in data) { console.log(prop); }
		console.log('user conected: ' + data.user);
		socket.broadcast.emit('user_connect', {user:socket.id});
		refreshBoard(socket, true);
	});

	// checkers protocol
	socket.on('move', function(data) {
		console.log('move requested');
		var result = checkers.move(data.piece, data.position);
		refreshBoard(socket, result);
	});

	fetchRecentMessages(function(err,messages) {
		for(i=messages.length-1; i >=0; --i)
		{
			var message = messages[i];
			console.log(message);
			socket.emit('message', message);
		}
	});
});

console.log("Server Started at localhost:"+portNumber);

