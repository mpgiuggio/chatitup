var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io").listen(server);
var chalk = require("chalk");

var routes = require("./routes/route.js");
var users = {};
var port  =  process.env.PORT || 8080;

server.listen(port,function(req, res){
    console.log(chalk.green("Server live at http://localhost:" + port));
});

app.set("view engine", "ejs");

app.use(express.static(__dirname + "/public"));

app.get("/", routes.home);

io.sockets.on("connection", function(socket) {
	console.log(chalk.green("a new connection is established"));
	
	function update_screen_names() {
		io.sockets.emit("screen_names", Object.keys(users));
	}

	socket.on("new user", function(data, clbk) {
		if (data in users) {
			console.log(chalk.red("Screen-name already taken"));
			clbk(false);
		} else {
			console.log(chalk.green("Screen-name available!"));
			clbk(true);
			socket.screen_name = data;
			users[socket.screen_name] = socket;
			update_screen_names();
		}
	});

	socket.on("send message", function(data, clbk) {
		var message = data.trim();
		if (message.substr(0,1) === "@") {
			message = message.substr(1);
			var ind = message.indexOf(" ");

			if (ind !== -1) {
				var name = message.substr(0, ind);
				var msg = message.substr(ind + 1);
				if (name in users) {
					console.log(users);
					users[name].emit("whisper", {message: msg, user: socket.screen_name});
					socket.emit("private", {message: msg, user: name});
					console.log(chalk.yellow("Whispering in a room full of people"));
				} else {
					clbk("Sorry " + name + " is not currently online");
				}
			} else {
				clbk("Looks like you forgot your message!");
			}
		} else {
			console.log(chalk.green("Got message: " + data));
			io.sockets.emit("new message", {message: message, user: socket.screen_name});
		}
	});

	

	socket.on("disconnect", function(data) {
		if (!socket.screen_name) {
			return;
		}

		delete users[socket.screen_name];
		update_screen_names();

	});
})