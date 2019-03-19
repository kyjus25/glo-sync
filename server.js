const config = require('./be_config.json');

global.__basedir = __dirname;

// MYSQL STUFFS

var mysql = require('mysql');
var con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "",
	database: "glo-sync"
});

con.connect(function(err) {
	if (err) throw err;
	console.log("Connected to MYSQL!");
});

// END MYSQL STUFFS

var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
const path = require('path');
const url = require('url');
var request = require('request');

var expressApp = express();
expressApp.use(cors());
expressApp.use(bodyParser.json());
expressApp.use(bodyParser.urlencoded({ extended: false }));

expressApp.get('/services/callback', function (req, res) {
	console.log('CODE', req.query.code);
	console.log('STATE', req.query.state);
	if (req.query.hasOwnProperty('state') && req.query.state === config.STATE) {
		if (req.query.hasOwnProperty('code')) {
			const request_body = {
				'grant_type': 'authorization_code',
				'client_id': config.CLIENT_ID,
				'client_secret': config.CLIENT_SECRET,
				'code': req.query.code
			};

			request.post('https://api.gitkraken.com/oauth/access_token', {
				json: request_body
			}, (error, response, body) => {
				if (error) {
					console.error(error)
					return
				}
				console.log('TOKEN', response.body.access_token);
				res.cookie('auth_token', response.body.access_token).redirect('http://localhost/#/dashboard');
			});
		}
	}
	// res.sendFile( __basedir + '/thanks.html');
});

expressApp.get('/services/getUser', function (req, res) {
	request.get('https://gloapi.gitkraken.com/v1/glo/user?access_token=' + req.query.token + '&fields=created_date,email,name,username',
		(error, response, body) => {
			if (error) {
				console.error(error)
				return
			}
			res.send(body);
		});
});

expressApp.get('/services/getBoards', function (req, res) {
	request.get('https://gloapi.gitkraken.com/v1/glo/boards?access_token=' + req.query.token + '&fields=archived_columns,archived_date,columns,created_by,created_date,invited_members,labels,members,name',
		(error, response, body) => {
			if (error) {
				console.error(error)
				return
			}
			res.send(body);
		});
});

expressApp.post('/services/createBoard', function (req, res) {
  console.log('req', req);
  console.log('TOKEN', req.query.token);
	request.post('https://gloapi.gitkraken.com/v1/glo/boards?access_token=' + req.query.token, {
		json: req.body
	}, (error, response, body) => {
		res.send(body);
	});
});

expressApp.post('/services/createCard', function (req, res) {
	request.post('https://gloapi.gitkraken.com/v1/glo/boards/' + req.query.boardId + '/cards?access_token=' + req.query.token, {
		json: req.body
	}, (error, response, body) => {
		res.send(body);
	});
});

expressApp.post('/services/createColumn', function (req, res) {
	request.post('https://gloapi.gitkraken.com/v1/glo/boards/' + req.query.boardId + '/columns?access_token=' + req.query.token, {
		json: req.body
	}, (error, response, body) => {
		res.send(body);
	});
});

expressApp.post('/services/createComment', function (req, res) {
	request.post('https://gloapi.gitkraken.com/v1/glo/boards/' + req.query.boardId + '/cards/' + req.query.cardId + '/comments?access_token=' + req.query.token, {
		json: req.body
	}, (error, response, body) => {
		res.send(body);
	});
});

expressApp.get('/services/authenticate', function (req, res) {
	shell.openExternal('https://app.gitkraken.com/oauth/authorize?response_type=code&client_id='+ config.CLIENT_ID + '&scope=board:write board:read user:write user:read&state=' + config.STATE)
});

expressApp.get('/services/setToken', function (req, res) {
	console.log('id', req.query.glo_id);
	console.log('token', req.query.token);

	const sqlFind = "SELECT * FROM `users` WHERE `glo_user_id` = '" + req.query.glo_id + "'";
	con.query(sqlFind, function (err, result) {
		if (err) throw err;
		if (result.length === 0) {
			// create
			const sql = "INSERT INTO `users` (`glo_user_id`, `trello_auth_token`) values ('" + req.query.glo_id + "', '" + req.query.token + "')";
			con.query(sql, function (err, result) {
				if (err) throw err;
			});
		} else {
			// update
			const sql = "UPDATE `users` set `trello_auth_token` = '" + req.query.token + "' WHERE `glo_user_id` = '" + req.query.glo_id + "';";
			con.query(sql, function (err, result) {
				if (err) throw err;
			});
		}
	});

	res.send({status: 'accepted'});
	// res.send({token: expressApp.settings.token});
});

expressApp.get('/services/getSyncUser', function (req, res) {
	const sqlFind = "SELECT * FROM `users` WHERE `glo_user_id` = '" + req.query.glo_id + "'";
	con.query(sqlFind, function (err, result) {
		if (err) throw err;
		if (result.length === 0) {
			// doesn't exist
			res.send({status: '404'});
		} else {
			// exists
			res.send(result[0]);
		}
	});
});

expressApp.get('/services/getSyncBoards', function (req, res) {
	const sqlFind = "SELECT * FROM `sync` WHERE `glo_user_id` = '" + req.query.glo_id + "'";
	con.query(sqlFind, function (err, result) {
		if (err) throw err;
		if (result.length === 0) {
			// doesn't exist
			res.send({status: '404'});
		} else {
			// exists
			res.send(result);
		}
	});
});

expressApp.get('/services/addSyncBoard', function (req, res) {
	const sql =
	"INSERT INTO `sync` (`glo_user_id`, `sync_type`, `glo_board_id`, `trello_board_id`)" +
	"values ('" + req.query.glo_id + "', '" + req.query.sync_type + "', '" + req.query.glo_board_id + "', '" + req.query.trello_board_id + "')";
	con.query(sql, function (err, result) {
		if (err) throw err;
	});
});

expressApp.get('/services/getTrelloUser', function (req, res) {
	request.get('https://api.trello.com/1/members/me?key=' + config.TRELLO_CLIENT_KEY + '&token=' + req.query.token,
		(error, response, body) => {
			if (error) {
				console.error(error)
				return
			}
			res.send(body);
		});
});

expressApp.get('/services/getTrelloBoards', function (req, res) {
	request.get('https://api.trello.com/1/members/' + req.query.trello_id + '/boards?key=' + config.TRELLO_CLIENT_KEY + '&token=' + req.query.token,
		(error, response, body) => {
			if (error) {
				console.error(error)
				return
			}
			res.send(body);
		});
});

expressApp.get('/services/getTrelloBoardList', function (req, res) {
	request.get('https://api.trello.com/1/boards/' + req.query.board_id + '/lists?cards=all&card_fields=all&key=' + config.TRELLO_CLIENT_KEY + '&token=' + req.query.token,
		(error, response, body) => {
			if (error) {
				console.error(error)
				return
			}
			res.send(body);
		});
});

expressApp.get('/services/getTrelloCardActions', function (req, res) {
	request.get('https://api.trello.com/1/cards/' + req.query.card_id + '/actions?filter=all&key=' + config.TRELLO_CLIENT_KEY + '&token=' + req.query.token,
		(error, response, body) => {
			if (error) {
				console.error(error)
				return
			}
			res.send(body);
		});
});







var port = process.env.PORT || 80;
expressApp.listen(port, () => console.log('Glo Sync listening'));

expressApp.use( express.static(__dirname + '/dist' ) );
