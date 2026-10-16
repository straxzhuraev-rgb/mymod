//hint_test = null;

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function(callback, element){
              window.setTimeout(callback, 1000 / 60);
          };
})();

var animMode = false;
function switchAnimFrameMode() {
	animMode = !animMode;
	if (animMode) {
		window.requestAnimFrame = function(callback, element){
			window.setTimeout(callback, 1000 / 60);
        };
	} else {
		window.requestAnimFrame = (function(){
		  return  window.requestAnimationFrame       || 
				  window.webkitRequestAnimationFrame || 
				  window.mozRequestAnimationFrame    || 
				  window.oRequestAnimationFrame      || 
				  window.msRequestAnimationFrame     || 
				  function(callback, element){
					  window.setTimeout(callback, 1000 / 60);
				  };
		})();
	}
	// console.log(animMode ? 'timeout' : 'requestAnimationFrame');
}

var startTime = statsLastTime = Date.now();
var sendBytes = 0;
var receivedBytes = {};

function clearStatistics() {
	startTime = statsLastTime = Date.now();
	sendBytes = 0;
	receivedBytes = {
		block: 0,
		total: 0,
		cells: 0,
		cells_t: 0,
		ping: 0,
		ping_cnt: 1,
		ping_sum: 0,
		food: 0,
		stuff: 0,
		elixir: 0,
		mass: 0,
		aWeapons: 0,
		weapons: 0,
		explosions: 0,
		effects: 0,
		damage: 0,
		rating: 0,
		json: 0
	};
}

clearStatistics();

var ws_commands = {
	newGame: 0,
	replay: 1,
	target: 2,
	repeatableWeapons: 3,
	players: 4,
	stuff: 5,
	mass: 6,
	activatedWeapons: 7,
	weapons: 8,
	explosions: 9,
	weapons_lt: 10,
	playerMana: 11,
	playerEffects: 12,
	playerWeaponsLine: 13,
	playerWeaponUse: 14,
	chestDaily: 15,
	chest: 16,
	damage: 17,
	noElixir: 18,
	elixirPot: 19,
	roomInfo: 20,
	playersList: 21,
	playerInfo: 22,
	playerRemove: 23,
	ffaFinish: 24,
	playerLimits: 25,
	playerEaten: 26,
	playerBoosterCollect: 27,
	noSplit: 28,
	emotions: 29,
	playerBoosterUse: 30,
	playerAddMass: 31,
	roomChgState: 32,
	questProgress: 33,
	massLimit: 34,
	playerStdKeys: 35,
	sknHealth: 36,
	hallOfFame: 37,
	hofUsrList: 38,
	arenaFinish: 39,
	respawnState: 40,
	food_mass: 41,
	roomTimeout: 42,
	chat: 43,
	chatBubbleState: 44,
	arenaFinishTeam: 45,
	teamsHof: 46,
	inactiveSuicide: 47,
	arenaSuicide: 48,
	usePBooster: 49,
	initArtefact: 50,
	armor: 51,
	stateInvisible: 52,
	useArmor: 53,
	playerBuffs: 54,
	drop: 55,
	bossHof: 56,
	bossFinish: 57,
	playerEffectsClear: 58,
	nodeRefresh: 97,
	readyToPlay: 98,
	sessionDie: 99,
	log: 100
}

var stuff_types = {
	coin: 1,
	elixir: 2,
	std_key: 3,
	booster: 4,
	ruby: 5
}

var cell_status_types = {
	none: 0,
	dangerInJump: 1,
	danger: 2,
	canEat: 3,
	canEatInJump: 4
}

var weapon_action_types = {
	linear: 0,
	radial: 1,
	random: 2,
	static: 3
}

var damage_flags = {
	crit: 1,
	shield: 2,
	shield_all: 4,
	attack: 8,
	reflect: 16,
	live: 32,
}

var decor_types = {
	fountain: 0,
	broken_brick: 1
}

var room_modes = {
	ffa: 0,
	arena: 1,
	boss: 2
}

var room_states = {
	init: 0,
	run: 1,
	fin: 2
}

var team_colors = ['#ff0000', '#e34909', '#0050d5', '#329900'];
var team_hcolors = ['teamRed', 'teamRed', 'teamBlue', 'teamGreen'];
var team_hscolors = ['red', 'red', 'blue', 'green'];
var clan_text_color = '#76332D';

var game_suicide_inactive = false;

var gameTarget = {
	x: 0,
	y: 0,
	mouseX: 0,
	mouseY: 0,
	offsetX: 0,
	offsetY: 0,
	lastSend: 0,
	mouseInit: false,
	newCoord: false,
	lastClick: 0,
	clicksCount: 0,
	jTimer: null,

	setJoystickCoord: function(newX, newY) {
		if (this.jTimer != null) {
			clearTimeout(this.jTimer);
			this.jTimer = null;
		}
		if (newX == 0 && newY == 0) {
			/*setTimeout(function(){
				gameTarget.mouseX = game.viewportCenterX + newX;
				gameTarget.mouseY = game.viewportCenterY + newY;
				gameTarget.mouseInit = true;
				gameTarget.newCoord = true;
			}, 1000);*/
		} else {
			this.mouseX = game.viewportCenterX + newX;
			this.mouseY = game.viewportCenterY + newY;
			this.mouseInit = true;
			this.newCoord = true;
			if (game_suicide_inactive) {
				WND_suicide_inactive('close');
				cancelDie();
			}
		}
	},

	setMouseCoord: function(newX, newY) {
		//console.log(newX, newY);
		this.mouseX = newX - this.offsetX;
		this.mouseY = newY - this.offsetY;
		this.mouseInit = true;
		this.newCoord = true;
	},

	setTarget: function(newX, newY) {
		var now = Date.now();
		if (this.newCoord && (this.x != Math.round(newX) || this.y != Math.round(newY)) && now - this.lastSend >= 50) {
			this.lastSend = now;
			this.x = Math.round(newX);
			this.y = Math.round(newY);
			if (!game.questMode) {
				if (game.player != null){
					var data = new Int16Array(2);
					data[0] = this.x;
					data[1] = this.y;
					ws.sendB(data);
					this.newCoord = false;
				}
			} else {
				if (game.player != null){
					game.player.target = [this.x, this.y];
				}
			}
		}
	}
}

var game = {
	focused: true,
	viewAspect: 0,
	viewportCenterX: 0,
	viewportCenterY: 0,
	viewportWidth: 0,
	viewportHeight: 0,
	roomGraphicsId: 1,
	pre_roomGraphicsId: 1,
	roomWidth: 0,
	roomHeight: 0,
	pre_roomWidth: 0,
	pre_roomHeight: 0,
	suicidePause: 0,
	emotionTime: 2,
	chatBubbleTime: 3,
	massSlowDown: 9000,
	foodMass: [0, 0, 0],
	foodRadius: [0, 0, 0],
	massMass: 10,
	massRadius: 10,
	boosterRadius: 0,
	elixirRadius: 0,
	coinRadius: 0,
	rubyRadius: 0,
	std_keyRadius: 0,
	collision_cell_koef: 1.2,
	terrain: null,
	food : {},
	stuff : {},
	mass: {},
	players: {},
	playersInfo: {},
	hofInfo: {},
	player: null,
	playerRating: null,
	playerMana: 0,
	playerBufs: {
		food_mass: 0,
		food_mass_koef: 1
	},
	playerLimits: {
		coins: false,
		ruby: false,
		std_keys: false
	},
	aWeapons: {},
	rpWeapons: {},
	weapons: {},
	wall: {},
	eat: [],
	damage: [],
	effects: [],
	explodes: [],
	decor: {},
	pre_decor: {},
	preload_effects: {},
	preload_weapons: {},
	mouse: {},
	limitHints: {
		elixir: {
			count: 1,
			lastTime: 0
		},
		coins: {
			count: 1,
			lastTime: 0
		},
		ruby: {
			count: 1,
			lastTime: 0
		},
		std_keys: {
			count: 1,
			lastTime: 0
		},
		subscr: {
			count: 1,
			lastTime: 0
		}
	},
	eatedBy: 0,
	move_arrow: null,
	team_arrow: null,
	team_stroke: null,
	revenge_arrow: null,
	revenge_icon_sk: null,
	revenge_icon: null,
	chatBubble: null,
	armor_icon: null,
	eatInJump: null,
	aura_canEat: null,
	aura_danger: null,
	weapon_circle: null,
	damage_line: null,
	damage_ring: null,
	foodTree: null,
	state: 2,
	questMode: false,
	questWaiting: false,
	questAllowSplit: false,
	questArrowTimer: 0,
	loading: false,
	lastUpdate: Date.now(),
	lastDrawUpdate: Date.now(),
	initialized: false,
	fullScreen: false,
	fastChatMode: false,
	splitHintTimer: null,
	nodeRefresh: false,
	roomMgrTick: null,
	roomState: null,
	roomCondition: 0,
	roomInitMode: null,
	roomMode: null,
	stateTimer: 0,
	arenaWinKills: 50,
	arenaPlayersMax: 9,
	eatMaxMassKoef: 0.75,
	bossLutRng: [],
	bossLut: [],
	bossAngryPrc: 0,
	connecting: false,
	finished: true,
	fullRoom: false,
	updateStep: 0,
	updStep: 0,
	startTime: 0,
	gameHiSpeedMode: true,
	gameHiSpeedModeSet: false,
	testing: false,

	init: function() {
		this.connecting = true;
		this.finished = false;
		this.nodeRefresh = false;
		if (!this.initialized) {
			var hasOff = $("#gameBody").hasClass("off");
			$("#gameBody").removeClass("off");

			texturesLib.free();
			this.onResize();

			if (hasOff) {
				$("#gameBody").addClass("off");
			}
			
			this.initialized = true;
		}
		if (this.focused) {
			gameTarget.skipClick = false;
		}
	},

	start: function(data) {
		// console.log('start data', data);
		this.connecting = false;
		this.finished = false;
		animEvents('gameStart');
		countFPS.clear();
		this.startTime = 0;
		// this.gameHiSpeedMode = true;
		// this.gameHiSpeedModeSet = false;
		StatAnalytics.sendTimeEvent(StatAnalytics.GameLoading);
		this.questMode = false;
		
		this.roomMode = data.mode;
		this.roomManager("init", [data.stt, data.stm, data.cnd]);
		game.addQuestBar();
		game.initLeaderBoard();
		this.limitHints.elixir.count = 1;
		this.limitHints.coins.count = 1;
		this.limitHints.ruby.count = 1;
		this.limitHints.std_keys.count = 1;
		this.limitHints.subscr.count = 1;
		
		this.loading = $('#wnd_game_loader').length;
		if (!this.loading) confirmPlay();

		this.onResize();

		this.viewportWidth = data.vw;
		this.viewportHeight = data.vh;
		this.roomGraphicsId = data.g;
		this.pre_roomGraphicsId = data.pg;
		this.roomWidth = data.w;
		this.roomHeight = data.w;
		this.pre_roomWidth = data.pw;
		this.pre_roomHeight = data.pw;
		this.foodMass = data.fm;
		this.foodRadius = data.fr;
		this.massMass = data.mm;
		this.massRadius = data.mr;
		this.elixirRadius = data.er;
		this.boosterRadius = data.br;
		this.coinRadius = data.cr;
		this.rubyRadius = data.rr;
		this.std_keyRadius = data.tr;
		this.suicidePause = parseInt(data.sp);
		this.massSlowDown = parseInt(data.msl) * 0.82;
		this.playerBufs.food_mass = parseInt(data.af);
		this.playerBufs.food_mass_koef = parseInt(data.afk);
		this.emotionTime = parseInt(data.et);
		this.arenaWinKills = parseInt(data.mk);
		this.arenaPlayersMax = typeof data.mp != 'undefined' ? parseInt(data.mp) : 9;
		this.eatMaxMassKoef = parseFloat(data.ek);
		this.eatedBy = data.eb;
		this.bossLutRng = typeof data.brn != 'undefined' ? data.brn : [];
		this.bossLut = typeof data.bl != 'undefined' ? data.bl : [];
		this.bossAngryPrc = typeof data.ba != 'undefined' ? data.ba : 0;
		
		if (this.bossLutRng.length > 0) {
			for (var i = 0; i < this.bossLutRng.length - 1; i ++) {
				$('#bossHpBar div#bhp' +i).css('left', this.bossLutRng[i] +'%');
			}
		}
		if (this.bossLut.length > 0) {
			for (var i = 1; i < this.bossLut.length; i ++) {
				$('#bossHpBar div#step' +i).html('+'+ this.bossLut[i]);
			}
		}

		this.playerRating = {
			currentLeague: parseInt(prf_data['league']),
			currentDevision: parseInt(prf_data['lea_div']),
			beforeRating: parseInt(prf_data['rating']),
			currentRating: parseInt(prf_data['rating']),
			collectedRating: -1
		};
		$('#keyBar').remove();

		this.preload_graphics();

		for (var idx in data.pdecor) {
			var decor = data.pdecor[idx];
			this.pre_decor[idx] = newGlObject({x: decor.x, y: decor.y, size: decor.size, texture_pack: 'decor', texture: decor.type, createMesh: true});
			this.pre_decor[idx].type = decor.type;
			this.pre_decor[idx].cKoef = decor.cKoef;
		}

		this.decor = {};
		for (var idx in data.decor) {
			var decor = data.decor[idx];
			this.decor[idx] = newGlObject({x: decor.x, y: decor.y, size: decor.size, texture_pack: 'decor', texture: decor.type, createMesh: true});
			this.decor[idx].type = decor.type;
			this.decor[idx].cKoef = decor.cKoef;
		}

		this.createRoom();

		if (/* prf_data.league == 0 || */ ((this.roomMode == room_modes.arena || this.roomMode == room_modes.boss) && this.roomState != room_states.run)) {
			Boosters.hide();
		} else {
			Boosters.show();
		}

		// if (this.eatedBy != 0 && !game.loading) {
			// Hints.text('eatRevenge');
		// }

		camera.lastUpdate = Date.now();
		this.state = room_states.run;

		this.mainUpdate();
		this.main();
	},

	startQuest: function() {
		this.loading = true;
		animEvents('gameStart');
		countFPS.clear();
		StatAnalytics.sendTimeEvent(StatAnalytics.QuestLoading);
		
		this.roomMode = room_modes.ffa;
		this.roomState = room_states.run;
		
		this.questMode = true;
		this.onResize();

		this.viewportWidth = 1000;
		this.viewportHeight = 600;
		this.roomWidth = 2500;
		this.roomHeight = 1550;
		this.foodMass = [50, 10, 20];
		this.foodRadius = [50, 40, 50];
		this.elixirRadius = 150;

		this.foodTree = createQuadTree(100);

		this.terrain = newGlObject({x: -1500, y: -770, size: 20000, texture_pack: 'terrain', texture: 0, tiles: 1});
		createTiledSquareMesh(this.terrain);

		this.weapon_circle = newGlObject({texture_pack: 'aWeapons', texture: 0, createMesh: true});

		this.damage_line = newGlObject({texture_pack: 'damage_line', texture: 0, createMesh: true});
		this.damage_ring = newGlObject({texture_pack: 'damage_ring', texture: 0, createMesh: true});

		this.chatBubble = newGlObject({texture_pack: 'chat_bubble', texture: 0, createMesh: true});
		this.eatInJump = newGlObject({texture_pack: 'cell_status', texture: 4, createMesh: true});
		this.aura_canEat = newGlObject({texture_pack: 'cell_status', texture: 'free', createMesh: true});
		this.aura_danger = newGlObject({texture_pack: 'cell_status', texture: 'danger', createMesh: true});
		
		this.armor_icon = newGlObject({texture_pack: 'armor', texture: 0, createMesh: true});

		this.playersInfo['p0'] = {
			id: 0,
			prf: 0,
			nick: 'Guest',
			skin: my_skin,
			elixirMax: 10,
			wpl: [2],
			removeTime: 0,
			elixir: 0,
			mesh_nick: getTextLabel('Guest', 2),
			mesh_clan: null,
			mesh: newGlObject({skin: my_skin, createMesh: true})
		}
		var playerSize = prf_data['quest_step'] == questSteps.length ? 200 : 1000;
		this.players['p0'] = this.createPlayer();
		this.players['p0'].cells['c0'] = newGlSimpleObject({id: 'c0', size: massToRadius(playerSize)});
		this.players['p0'].cells['c0'].position = [2000, 800, 0];
		this.players['p0'].target = [0, 0, 0];
		this.players['p0'].cells['c0'].divideSpeed = 0;
		this.players['p0'].cells['c0'].speed = 600;
		this.players['p0'].cells['c0'].mass = playerSize;
		this.players['p0'].cells['c0'].angle = 0;
		this.players['p0'].cells['c0'].eat = {mass: 0, time: 0};
		this.players['p0'].cells['c0'].timeToCollapse = Date.now();
		this.players['p0'].mainCell = this.players['p0'].cells['c0'];
		this.player = this.players['p0'];

		camera.position[X] = this.players['p0'].cells['c0'].position[X];
		camera.position[Y] = this.players['p0'].cells['c0'].position[Y];
		camera.scale = 3;

		this.playerMana = 0;
		// Elixir.init(this.playerMana, this.playersInfo['p0'].elixirMax);
		WeaponBar.update([2]);

		$('#elixirBar').addClass('off');
		$('#myWeaponBar').addClass('off');
		$(".gameInfoBlock").addClass("off");
		Boosters.hide();

		this.state = room_states.run;

		this.mainUpdate();
		this.main();
	},

	onLoadingProgress: function() {
		if ($('#wnd_game_loader').length && game.loading) {
			var prc = Math.round(texturesLib.loaded / texturesLib.count * 100);
			$('#wnd_game_loader .progressText').html('<em>'+ prc +'</em>%');
			$('#wnd_game_loader .progress').css({'width': prc +'%'});

			if (texturesLib.loaded == texturesLib.count) {
				if (!this.questMode) {
					confirmPlay();
					StatAnalytics.send(StatAnalytics.GameLoading);
				} else {
					StatAnalytics.send(StatAnalytics.QuestLoading);
				}
				game.loading = false;
				this.startTime = Date.now();

				setTimeout(function(){
					WND_game_loader('close');
					stopSound('music', 'room');
					stopSound('music', 'room_ambient');
					playSound('music', 'gameplay', 0, 999);
					mobileButtons.showControllers(true);
					if (isMobileApp && (game.roomMode == room_modes.arena || game.roomMode == room_modes.boss) && this.roomState != room_states.run) {
						mobileButtons.showJump(false);
					}

					if (game.questMode) {
						game.players['p0'].cells['c0'].position = [700, 800, 0];
						game.players['p0'].target = [0, 0, 0];
						camera.position[X] = game.players['p0'].cells['c0'].position[X];
						camera.position[Y] = game.players['p0'].cells['c0'].position[Y];
						game.setQuestStep(questSteps.length - prf_data['quest_step']);
						StatAnalytics.sendTimeEvent(StatAnalytics.QuestDone);
						StatAnalytics.sendTimeEvent(StatAnalytics.QuestSkip);
						if (prf_data['quest_step'] == questSteps.length) {
							StatAnalytics.send(StatAnalytics.QuestStart);
						}
					} else {
						if (game.roomMode == room_modes.ffa) {
							//Hints.bubble('game1');
						}
						// Hints.bubble(game.roomMode == room_modes.arena || game.roomMode == room_modes.boss ? 'game0' : 'game1');
						StatAnalytics.sendTimeEvent(StatAnalytics.GameFinish);
						if (allowFullScreen && __hxda.indexOf('fscr') == -1) {
							setTimeout(function(){
								if (__hxda.indexOf('fscr') == -1 && !isMobileApp) {
									Hints.text('fullScreen');
									Arrows.runTemplate("fullScreen");
								}
							}, 8000);
						}
						/*hint_test = setInterval(function(){
							Hints.text('fullScreen');
							Arrows.runTemplate("fullScreen");							
						}, 10000);*/
						/*if (__hxda.indexOf('game3') == -1) {
							game.splitHintTimer = setTimeout(function(){
								if (game.state == room_states.run && game.player.mass > 1000) {
									Hints.bubble('game3');
								}
								game.splitHintTimer = null;
							}, 60000);
						}*/
					}
				}, 500);
			}
		}
	},

	addQuestBar: function() {
		Tasks.init();
		// if (this.roomMode == room_modes.ffa) {
			// for (var slot = 1; slot < 4; slot ++) {
				// if (quests_data['s'+ slot +'_state'] == 'active' && quests[parseInt(quests_data['s'+ slot +'_id'])].ingame && (quests[parseInt(quests_data['s'+ slot +'_id'])].location == 1 || quests[parseInt(quests_data['s'+ slot +'_id'])].location == 3)) {
					// Tasks.add({type: 'quest', id: quests_data['s'+ slot +'_id'], progress: parseInt(quests_data['s'+ slot +'_val']), data: quests[parseInt(quests_data['s'+ slot +'_id'])]});
				// }
			// }
		// }
		this.tasksInitialized = true;
	},

	initLeaderBoard: function() {
		if (this.roomMode == room_modes.ffa) {
			$("#leaderBoard").removeClass('off');
			$("#teamLeaderBoard").addClass('off');
		} else {
			$("#leaderBoard").addClass('off');
			$("#teamLeaderBoard").removeClass('off');
			if (this.roomMode == room_modes.boss) {
				$("#teamLeaderBoard").addClass('boss');
			} else {
				$("#teamLeaderBoard").removeClass('boss');
			}
		}
	},

	sendKeyCode: function(evt, keyCode, kbrd) {
		if (typeof evt != 'undefined' && evt != null) evt.stopPropagation();
		gameTarget.skipClick = false;

		kbrd = kbrd || false;
		if (!this.questMode) {
			// if (keyCode == 87 && WeaponBar.maxSlots == 1) {
				// Hints.text('weaponsLimit');
				// return;
			// }
			if (keyCode == 81 && typeof wpn_data[WeaponBar.ids[0]] != 'undefined' && wpn_data[WeaponBar.ids[0]][3] <= 0) {
				Hints.text('weaponBroken');
				return;
			}
			if (keyCode == 87 && typeof wpn_data[WeaponBar.ids[1]] != 'undefined' && wpn_data[WeaponBar.ids[1]][3] <= 0) {
				Hints.text('weaponBroken');
				return;
			}
			if (keyCode >= 49 && keyCode <= 53 && this.fastChatMode) {
				gameChatInput.send(Texts.fastChat[keyCode - 49]);
				//sendFastChat(Texts.fastChat[keyCode - 49]);
				return;
			}
			var data = new Int8Array(1);
			data[0] = keyCode + (keyCode == 81 || keyCode == 87 ? 000 : 0);
			ws.sendB(data);
		} else {
			if (keyCode == 81) {
				this.useQuestWeapon(kbrd);
			} else
			if (keyCode == 32) {
				this.splitQuestPlayer();
			}
		}
	},

	createRoom: function() {
		this.terrain = newGlObject({x: -8000, y: -8000, size: this.roomWidth + 16000, texture_pack: 'terrain', texture: this.roomGraphicsId, tiles: Math.round((this.roomWidth + 16000) / 1750), createMesh: true});

		var wall_height = 1380;
		this.wall.top = newGlObject({x: this.roomWidth / 2, y: this.roomHeight + 1390, width: this.roomWidth / 2, height: wall_height, texture_pack: 'wall', texture: this.roomGraphicsId+'_top', tiles: Math.round(this.roomWidth / 1750), createMesh: true});
		this.wall.bottom = newGlObject({x: this.roomWidth / 2, y: -1420, width: this.roomWidth / 2, height: wall_height, texture_pack: 'wall', texture: this.roomGraphicsId+'_bottom', tiles: Math.round(this.roomWidth / 1750), createMesh: true});
		this.wall.left = newGlObject({x: -1400, y: this.roomHeight / 2, width: wall_height, height: this.roomHeight / 2, texture_pack: 'wall', texture: this.roomGraphicsId+'_left', tiles: Math.round(this.roomWidth / 1750), createMesh: true});
		this.wall.right = newGlObject({x: this.roomWidth + 1420, y: this.roomHeight / 2, width: wall_height, height: this.roomHeight / 2, texture_pack: 'wall', texture: this.roomGraphicsId+'_right', tiles: Math.round(this.roomWidth / 1750), createMesh: true});
		this.wall.top_left = newGlObject({x: -800, y: this.roomHeight + 800, size: 2000, texture_pack: 'wall', texture: this.roomGraphicsId+'_top_left', createMesh: true, autoScale: true});
		this.wall.top_right = newGlObject({x: this.roomWidth + 800, y: this.roomHeight + 800, size: 2000, texture_pack: 'wall', texture: this.roomGraphicsId+'_top_right', createMesh: true, autoScale: true});
		this.wall.bottom_left = newGlObject({x: -800, y: -800, size: 2000, texture_pack: 'wall', texture: this.roomGraphicsId+'_bottom_left', createMesh: true, autoScale: true});
		this.wall.bottom_right = newGlObject({x: this.roomWidth + 800, y: -800, size: 2000, texture_pack: 'wall', texture: this.roomGraphicsId+'_bottom_right', createMesh: true, autoScale: true});

		this.weapon_circle = newGlObject({texture_pack: 'aWeapons', texture: 0, createMesh: true});

		this.damage_line = newGlObject({texture_pack: 'damage_line', texture: 0, createMesh: true});
		this.damage_ring = newGlObject({texture_pack: 'damage_ring', texture: 0, createMesh: true});

		this.chatBubble = newGlObject({texture_pack: 'chat_bubble', texture: 0, createMesh: true});
		this.eatInJump = newGlObject({texture_pack: 'cell_status', texture: 4, createMesh: true});
		this.aura_canEat = newGlObject({texture_pack: 'cell_status', texture: 'free', createMesh: true});
		this.aura_danger = newGlObject({texture_pack: 'cell_status', texture: 'danger', createMesh: true});

		this.armor_icon = newGlObject({texture_pack: 'armor', texture: 0, createMesh: true});

		this.foodTree = createQuadTree(100);
	},

	createFood: function(data) {
		var texture = data.group < 3 ? Math.round(Math.random() * (resources.food.count - 1)) : 0;
		var size = data.group < 3 ? this.foodRadius[data.group] : this.massRadius;
		var food = newGlObject({x: data.x, y: data.y, size: size * (this.gameHiSpeedMode ? 0.5 : 1), texture_pack: data.group < 3 ? 'food' : 'mass', texture: texture, createMesh: true});
		food.setNewSize(size);
		food.group = data.group;
		food.mass = data.group < 3 ? this.foodMass[data.group] : data.group;
		return food;
	},

	createStuff: function(data) {
		var texture = 1;
		var size = 0;
		switch (data.type) {
			case stuff_types.coin:
				texture = data.type;
				size = this.coinRadius;
				break;
			case stuff_types.ruby:
				texture = data.type;
				size = this.rubyRadius;
				break;
			case stuff_types.elixir:
				texture = data.type;
				size = this.elixirRadius;
				break;
			case stuff_types.std_key:
				texture = data.type;
				size = this.std_keyRadius;
				break;
			case stuff_types.booster:
				texture = data.type +'_'+ data.typeId;
				size = this.boosterRadius;
				break;
		}
		var stuff = newGlObject({x: data.x, y: data.y, size: size / 2, texture_pack: 'stuff', texture: texture, createMesh: true});
		stuff.stuffType = data.type;
		stuff.setNewSize(size);

		switch (data.type) {
			case stuff_types.coin:
				stuff.newAlpha = this.playerLimits.coins ? 0.6 : 1;
				break;
			case stuff_types.ruby:
				stuff.newAlpha = this.playerLimits.ruby ? 0.6 : 1;
				break;
			case stuff_types.elixir:
				stuff.newAlpha = 1;
				break;
			case stuff_types.std_key:
				stuff.newAlpha = this.playerLimits.std_keys ? 0.6 : 1;
				break;
			case stuff_types.booster:
				stuff.newAlpha = typeof this.player == 'undefined' ? 1 : (!this.playersInfo[this.player.id].bst ? 0.6 : 1);
				break;
		}
		stuff.alpha = stuff.newAlpha;

		return stuff;
	},

	createPlayer: function(idx) {
		var player = {
			id: idx,
			mass: 0,
			position: [0, 0, 0],
			target: [0, 0],
			mainCell: null,
			chatBubbleTime: 0,
			emotion_id: 0,
			emotion: null,
			emotionSoundTime: 0,
			foodSoundTime: 0,
			cellsCount: 0,
			stop: false,
			weapons: {},
			cells: {},
			sounds: {},
			lastUpdate: Date.now(),
			lastHideUpdate: Date.now()
		}

		return player;
	},

	createTeamStuff: function(id) {
		if (typeof this.playersInfo[id] != 'undefined' && this.team_arrow == null && this.playersInfo[id].team > 0) {
			this.team_arrow = newGlObject({texture_pack: 'arrows', texture: this.playersInfo[id].team, createMesh: true});
			this.team_stroke = newGlObject({texture_pack: 'strokes', texture: this.playersInfo[id].team, createMesh: true});
			var cnt = 0;
			for (var key in this.playersInfo) {
				cnt ++;
			}
			if (this.roomState == room_states.init) {
				if (this.roomMode == room_modes.arena) {
					showGameRules(this.playersInfo[id].team, this.arenaWinKills, cnt, this.arenaPlayersMax, true);
				} else {
					showBossGameRules(cnt, this.arenaPlayersMax);
				}
			}
			if (isMobileApp) {
				this.move_arrow = newGlObject({texture_pack: 'arrows', texture: 'white', createMesh: true});
			}
		}
		if (game.roomMode == room_modes.boss) {
			this.revenge_arrow = newGlObject({texture_pack: 'arrows', texture: 'rv2', createMesh: true});
			this.revenge_icon_sk = newGlObject({texture_pack: 'bosses', texture: time_to_boss[2], createMesh: true});
		}
	},

	createFfaStuff: function() {
		if (isMobileApp) {
			this.move_arrow = newGlObject({texture_pack: 'arrows', texture: 'white', createMesh: true});
		}
		this.revenge_arrow = newGlObject({texture_pack: 'arrows', texture: 'rv2', createMesh: true});
		this.revenge_icon = newGlObject({texture_pack: 'arrows', texture: 'x3', createMesh: true});
		this.revenge_icon_sk = newGlObject({texture_pack: 'arrows', texture: 'sk', createMesh: true});
	},

	createEmotion: function(id, owner_id) {
		if (!this.loading && this.players[owner_id].mainCell.onScreen() && Date.now() - this.players[owner_id].emotionSoundTime >= 2000) {
			playSound('sfx', 'emotion_'+ id + (id == 2 ? '_'+ Math.round(Math.random() * 2) : ''), calcSoundPan(this.players[owner_id].mainCell.drawPosition));
			this.players[owner_id].emotionSoundTime = Date.now();
		}
		var emotion = {
			id: id,
			mesh: newGlObject({texture_pack: 'emotions', texture: id, createMesh: true}),
			time: Date.now() + this.emotionTime * 1000
		}

		return emotion;
	},

	getWeaponById: function(id) {
		return typeof weapons_list[id] != 'undefined' ? weapons_list[id] : null;
	},

	createAWeapon: function(owner_id, id, liveTime, type) {
		if (!this.loading && typeof this.players[owner_id] != 'undefined' && this.players[owner_id].mainCell.onScreen()) {
			playSound('sfx', 'use_weapon', calcSoundPan(this.players[owner_id].mainCell.drawPosition));
		}
		var aWeapon = {
			id: id,
			mesh: newGlObject({texture_pack: type == 0 ? 'aWeapons' : 'boosters', texture: id, createMesh: true}),
			timer: newGlObject({texture_pack: 'timers', texture: 0, dieOnAnimationEnd: true, createMesh: true}),
			type: type,
			range: 0,
			action_range_type: 0,
			action_type: 0,
			action_holded: 0,
			dead: false
		}

		aWeapon.timer.animationSpeed = resources.timers.count / liveTime;
		aWeapon.timer.animationRepeat = false;
		if (type == 0) {
			var _w = this.getWeaponById(id);
			var lvl = this.playersInfo[owner_id].wpl[id] - 1;
			aWeapon.action_type = _w.action_type;
			aWeapon.action_range_type = _w.action_range_type;
			aWeapon.action_holded = _w.action_holded;
			aWeapon.range = _w.action_range;
		}

		if (type == 0 && _w.action_type == weapon_action_types.linear && !_w.action_holded) {
			this.rpWeapons[owner_id + '_rp'+ id] = this.createRpWeapon(owner_id, id, liveTime + _w.action_live_time * 1000);
		}

		return aWeapon;
	},

	createRpWeapon: function(owner_id, id, liveTime) {
		var rpWeapon = {
			id: id,
			ownerId: owner_id,
			mesh: newGlObject({texture_pack: 'rpWeapons', texture: id, createMesh: true}),
			lastVisible: Date.now() + liveTime
		}

		return rpWeapon;
	},

	createWeapon: function(data) {
		var _w = this.getWeaponById(data.w_id);
		var lvl = typeof this.playersInfo[data.owner].wpl[data.w_id] != 'undefined' ? this.playersInfo[data.owner].wpl[data.w_id] - 1 : 1;

		var range = _w.action_range;
		var speed = _w.action_speed;
		var size = _w.size != null ? _w.size : 100;
		
		if (size == 0) {
			var pl = this.players[data.owner];
			if (typeof pl != 'undefined') {
				if (_w.action_range_type == 1 && typeof this.players[data.owner] != 'undefined') {
					size = this.players[data.owner].mainCell.size * (1 + _w.action_range * 0.01);
				} else {
					size = (this.players[data.owner].mainCell.size + _w.action_range) * (data.w_id == 11 ? 0.5 : 1);
				}
			}
		}

		if (_w.action_holded && range != null){
			if (_w.action_range_type == 1) {
				size = range;
			} else {
				size = range;
			}
			size *= this.playersInfo[data.owner].buff_wd_koef;
		}

		if (_w.fire_sound != '' && data.target == 0) {
			playSound('sfx', _w.fire_sound);
		}

		if (typeof this.preload_weapons['weapons_'+ _w.graphics_id] != 'undefined') {
			var wpn_mesh = newGlObject({x: data.x, y: data.y, size: size, texturePreloaded: this.preload_weapons['weapons_'+ _w.graphics_id]});
		} else {
			var wpn_mesh = newGlObject({x: data.x, y: data.y, size: size, texture_pack: 'weapons', texture: _w.graphics_id, createMesh: true});
		}

		var weapon = {
			owner: data.owner,
			weapon: _w,
			level: lvl,
			lastCollision: 0,
			lastCollisionSound: 0,
			createTime: Date.now(),
			lastVisible: Date.now(),
			drawAct: false,
			radial: (_w.action_holded && _w.action_type == weapon_action_types.radial),
			drawOnGround: !_w.action_holded && speed == 0,
			mesh: wpn_mesh,
			mesh_acc: typeof resources.weapons['weapons_'+ _w.graphics_id +'_acc'] != 'undefined' ? newGlObject({x: data.x, y: data.y, size: size, texture_pack: 'weapons', texture: _w.graphics_id +'_acc', createMesh: true}) : null,
			mesh_act: typeof resources.weapons['weapons_'+ _w.graphics_id +'_act'] != 'undefined' ? newGlObject({x: data.x, y: data.y, size: size, texture_pack: 'weapons', texture: _w.graphics_id +'_act', createMesh: true}) : null
		}

		if (_w.fire_effect == 1) {
			weapon.mesh.sizeKoef = 0.2;
			weapon.mesh.newSizeKoef = 1;
		}

		return weapon;
	},

	createDamage: function(data) {
		var item = {
			player_id: data.id_p,
			cell_id: data.id_c,
			mesh: getTextLabel(parseInt(data.value) == 0 ? '' : data.value, 10),
			mesh_crit: (data.flag & damage_flags.crit) ? newGlObject({x: 0, y: 0, z: 0, size: 10, texture_pack: 'weapons_flag', texture: 1, createMesh: true}) : null,
			mesh_shield: (data.flag & damage_flags.shield) ? newGlObject({x: 0, y: 0, z: 0, size: 10, texture_pack: 'weapons_flag', texture: 2, createMesh: true}) : null,
			mesh_shield_all: (data.flag & damage_flags.shield_all) ? newGlObject({x: 0, y: 0, z: 0, size: 10, texture_pack: 'weapons_flag', texture: 6, createMesh: true}) : null,
			mesh_attack: (data.flag & damage_flags.attack) ? newGlObject({x: 0, y: 0, z: 0, size: 10, texture_pack: 'weapons_flag', texture: 3, createMesh: true}) : null,
			mesh_reflect: (data.flag & damage_flags.reflect) ? newGlObject({x: 0, y: 0, z: 0, size: 10, texture_pack: 'weapons_flag', texture: 4, createMesh: true}) : null,
			mesh_armor: (data.dmg_armor > 0) ? newGlObject({x: 0, y: 0, z: 0, size: 10, texture_pack: 'weapons_flag', texture: 7, createMesh: true}) : null,
			mesh_armor_eff: (data.dmg_armor > 0) ? newGlObject({x: 0, y: 0, z: 0, size: 10, texture_pack: 'weapons_flag', texture: 5, createMesh: true}) : null,
			createTime: Date.now()
		}
		item.mesh.size = 7;
		item.mesh.newSize = 10;
		if (item.mesh_crit != null) item.mesh_crit.newSize = 13;
		if (item.mesh_shield != null) item.mesh_shield.newSize = 13;
		if (item.mesh_shield_all != null) item.mesh_shield_all.newSize = 13;
		if (item.mesh_attack != null) item.mesh_attack.newSize = 13;
		if (item.mesh_reflect != null) item.mesh_reflect.newSize = 13;
		if (item.mesh_armor_eff != null && typeof this.players[item.player_id] != 'undefined' && typeof this.players[item.player_id].cells[item.cell_id] != 'undefined') {
			item.mesh_armor_eff.alpha = 0.5;
			item.mesh_armor_eff.newAlpha = 1;
			item.mesh_armor_eff.size = this.players[item.player_id].cells[item.cell_id].size * 0.6;
			item.mesh_armor_eff.newSize = this.players[item.player_id].cells[item.cell_id].size * 1.4;
		}
		this.damage.push(item);

		if (data.flag & damage_flags.live && typeof this.players[item.player_id] != 'undefined') {
			animEvents('saveLive', {x: this.players[item.player_id].cells[item.cell_id].drawPosition[X], y: this.players[item.player_id].cells[item.cell_id].drawPosition[Y], radius: this.players[item.player_id].cells[item.cell_id].drawSize[Y]});
		}
	},

	createEat: function(data) {
		if (typeof this.players[data.id_p].cells[data.id_c] == 'undefined') return;
		this.players[data.id_p].cells[data.id_c].eat.mass += data.value;
		if (/*this.eat.length < 10 || */this.players[data.id_p].cells[data.id_c].eat.mass > 200 || Date.now() - this.players[data.id_p].cells[data.id_c].eat.time >= 300) {
			var sizeX = this.players[data.id_p].cells[data.id_c].size * 0.6;
			var sizeY = sizeX * 0.5;
			var item = {
				player_id: data.id_p,
				cell_id: data.id_c,
				offset: [Math.random() * (sizeX * 2) - sizeX, Math.random() * (sizeY * 2) - sizeY],
				mesh: getTextLabel('+'+ Math.round(this.players[data.id_p].cells[data.id_c].eat.mass), 220),
				createTime: Date.now()
			}
			if (this.players[data.id_p].cells[data.id_c].eat.mass <= 100) {
				item.mesh.size = 1;
				item.mesh.newSize = 6;
				item.liveTime = 400;
			} else {
				item.mesh.size = 2;
				item.mesh.newSize = 8;
				item.liveTime = 800;
			}
			this.eat.push(item);
			this.players[data.id_p].cells[data.id_c].eat.mass = 0;
			this.players[data.id_p].cells[data.id_c].eat.time = Date.now();
		}
	},

	createEffect: function(data) {
		if (typeof this.preload_effects[data.texture_pack +'_'+ data.texture] != 'undefined') {
			var effect = newGlObject({id: data.id, x: data.x, y: data.y, size: data.size, owner: data.owner, holdOn: data.holdOn, dieOnAnimationEnd: data.dieOnAnimationEnd, liveTime: data.liveTime, texturePreloaded: this.preload_effects[data.texture_pack +'_'+ data.texture]});
		} else {
			var effect = newGlObject({id: data.id, x: data.x, y: data.y, size: data.size, owner: data.owner, holdOn: data.holdOn, texture_pack: data.texture_pack, texture: data.texture, dieOnAnimationEnd: data.dieOnAnimationEnd, liveTime: data.liveTime, createMesh: true});
		}
		effect.angle[Z] = data.angle;
		effect.size = data.size * effect.scale;
		effect.newSize = effect.size;
		var sound = resources[data.texture_pack][data.texture_pack +'_'+ data.texture].sound;
		if (typeof sound != 'undefined' && sound != '') {
			effect.sound = sound;
			effect.soundRepeat = resources[data.texture_pack][data.texture_pack +'_'+ data.texture].soundRepeat;
		} else
		if (typeof data.weapon != 'undefined' && data.weapon != null && data.weapon.collision_sound != '') {
			effect.sound = data.weapon.collision_sound;
			effect.soundRepeat = false;
		}
		this.effects.push(effect);
	},

	preload_graphics: function() {
		for (var item_name in resources.effects) {
			var item_data = resources.effects[item_name];
			if (typeof item_data.preload != 'undefined' && item_data.preload && typeof this.preload_effects[item_name] == 'undefined') {
				var item_id = item_name.split('_');
				item_id = item_id[item_id.length - 1];
				this.preload_effects[item_name] = newGlObject({size: 1, texture_pack: 'effects', texture: item_id, createMesh: true});
			}
		}
		for (var item_name in resources.weapons) {
			var item_data = resources.weapons[item_name];
			if (typeof item_data.preload != 'undefined' && item_data.preload && typeof this.preload_weapons[item_name] == 'undefined') {
				var item_id = item_name.split('_');
				item_id = item_id[item_id.length - 1];
				this.preload_weapons[item_name] = newGlObject({size: 1, texture_pack: 'weapons', texture: item_id, createMesh: true});
			}
		}
	},

	createExplode: function(data) {
		if (data.id > 0) {
			for (var i = 0; i < this.explodes.length; i++) {
				if (this.explodes[i].id == data.id) {
					return;
				}
			}
		}
		var explode = newGlObject({id: data.id, x: data.x, y: data.y, size: data.size, texture_pack: 'explodes', texture: data.texture, dieOnAnimationEnd: true, createMesh: true});
		var sound = resources['explodes']['explodes_'+ data.texture].sound;
		if (typeof sound != 'undefined' && sound != '') {
			explode.sound = sound;
			explode.soundRepeat = resources['explodes']['explodes_'+ data.texture].soundRepeat;
		}
		this.explodes.push(explode);
	},

	createRunes: function(setId, timeToInit, runeTime) {
		if (setId == 0 || timeToInit == 0 || runeTime == 0) return null;
		runeTime *= 1000;

		var runesCount = 6;
		var runeId = skins_sets[setId]['rune'];
		timeToInit *= 1000;
		var createTime = Date.now() + timeToInit - runeTime;
		var runeInterval = (runeTime - 1500) / (runesCount + 0);

		var runesData = {
			active: true,
			runes: [],
			runeTime: runeTime,
			runeInterval: runeInterval,
			createTime: createTime
		};
		var angle = -Math.PI / 3;
		var angle_sm = Math.PI / 9;
		for (var i = 0; i < runesCount; i ++) {
			var x = Math.cos(angle * i - angle - angle_sm) * 1.8;
			var y = Math.sin(angle * i - angle - angle_sm) * 1.8;
			var rune = newGlObject({x: 0, y: 0, size: 0.23, texture_pack: 'runes', texture: runeId +'_small', createMesh: true});
			rune.offset = [x, y];
			rune.angle[Z] = angle * i - angle - angle_sm + Math.PI / 2;
			rune.newAlphaSpeed = 3;
			runesData.runes.push(rune);

			var x = Math.cos(angle * i - angle) * 1.95;
			var y = Math.sin(angle * i - angle) * 1.95;
			var rune = newGlObject({id: 'rune', x: 0, y: 0, size: 0.3, texture_pack: 'runes', texture: runeId +'_'+ i, createMesh: true});
			rune.offset = [x, y];
			rune.newAlphaSpeed = 3;
			runesData.runes.push(rune);

			var x = Math.cos(angle * i - angle + angle_sm) * 1.8;
			var y = Math.sin(angle * i - angle + angle_sm) * 1.8;
			var rune = newGlObject({x: 0, y: 0, size: 0.23, texture_pack: 'runes', texture: runeId +'_small', createMesh: true});
			rune.offset = [x, y];
			rune.angle[Z] = angle * i - angle + angle_sm + Math.PI / 2;
			rune.newAlphaSpeed = 3;
			runesData.runes.push(rune);
		}

		return runesData;
	},

	updateFoodMass: function(data) {
		// console.log(data);
		var now = Date.now();
		var idx = '';
		var group = '';
		var idb = 1;
		while (idb < data.length) {
			if (data[idb] >= 60000) {
				group = data[idb] - 60000;
				idb ++;
			}
			var item = {
				group: group,
				x: data[idb],
				y: data[idb + 1],
				id: group < 3 ? 0 : data[idb + 2]
			}
			idb += (group < 3 ? 2 : 3);

			if (typeof item.id != 'undefined') {
				idx = (group < 3 ? "f"+ item.x +"_"+ item.y : "m"+ item.id);
				if (typeof this.food[idx] == 'undefined') {
					this.food[idx] = this.createFood(item);
					if (this.foodTree != null) {
						this.foodTree.add(item.x, item.y, idx);
						this.food[idx].drawId = group < 3 ? this.foodTree.getId() : item.id;
					}
				}
				this.food[idx].lastVisible = now + 2000;
				this.food[idx].dead = false;
			}
		}

		for (idx in this.food) {
			if (this.food[idx].lastVisible < now && !this.food[idx].dead) {
				this.foodTree.remove(this.food[idx].position[X], this.food[idx].position[Y], idx);
				this.food[idx].setNewSize(0);
				this.food[idx].dead = true;

				var pl_e = 0;
				var cl_e = -1;
				var min_dist = 5000;
				if (this.gameHiSpeedMode) {
					for (idx_ in this.players) {
						for (id_c_ in this.players[idx_].cells) {
							var totalSize = this.food[idx].size + this.players[idx_].cells[id_c_].size + this.players[idx_].cells[id_c_].foodEatDistance;
							var dist = distanceToTarget(this.food[idx], this.players[idx_].cells[id_c_]) - totalSize;
							if (dist < min_dist && dist < totalSize * this.collision_cell_koef) {
								min_dist = dist;
								pl_e = idx_;
								cl_e = id_c_;
							}
						}
					}
				}
				if (cl_e != -1 && min_dist < 100) {
					this.food[idx].target = this.players[pl_e].cells[cl_e].position;
					if (!this.loading && this.players[pl_e] == this.player) {
						if (Date.now() - this.players[pl_e].foodSoundTime >= 300) {
							playSound('sfx', this.food[idx].group < 3 ? 'food_eat' : 'mass_eat', calcSoundPan(this.food[idx].drawPosition));
							this.players[pl_e].foodSoundTime = Date.now();
						}
						if (this.players[pl_e] == game.player && this.players[pl_e].cells[cl_e].newSize > this.players[pl_e].cells[cl_e].sizeAnim.startSize) {
							this.createEat({id_p: pl_e, id_c: cl_e, value: this.food[idx].mass * this.playerBufs.food_mass_koef + this.playerBufs.food_mass});
						}
					}
				} else {
					this.food[idx].newSize = 0;
					this.food[idx].newAlpha = 0;
				}
			}
		}
	},

	updateMass: function(data) {
		// console.log(data);
		var now = Date.now();
		var idx = '';
		var count = Math.round((data.length - 1) / 7);
		for (var i = 0; i < count; i++) {
			idx = "m"+ data[i * 7 + 1];
			var item = {
				id: data[i * 7 + 1],
				group: data[i * 7 + 4],
				x: data[i * 7 + 2],
				y: data[i * 7 + 3],
				owner: data[i * 7 + 5],
				angle: data[i * 7 + 6] / 100 - 100,
				speed: data[i * 7 + 7],
			}

			if (typeof this.food[idx] == 'undefined') {
				this.food[idx] = this.createFood(item);
				this.food[idx].drawId = item.id;
				if (this.foodTree != null) {
					this.foodTree.add(item.x, item.y, idx);
				}
				this.food[idx].angleSpeed[Z] = 0;
				this.food[idx].angle[Z] = item.angle;
				this.food[idx].speed = item.speed;
				this.food[idx].slowDown = this.massSlowDown;
				this.food[idx].parentId = "c"+ item.owner;
				this.food[idx].lastVisible = now + 6000;
			}
		}
	},

	updateRoomState: function(data) {
		//console.log(data);
		this.roomManager("restate", [data.stt, data.stm, data.cnd]);
	},

	updateChest: function(data) {
	},

	updateChestDaily: function(data) {
		if (this.roomState != room_states.run) return;
	},

	updatePlayerQuest: function(data) {
		// console.log(data);
		var count = Math.round((data.length - 1) / 2)
		for (var i = 0; i < count; i ++) {
			Tasks.update(data[i * 2 + 1], data[i * 2 + 2]);
		}
	},
	
	updateHofUsrList: function(data) {
		//console.log('updateHofUsrList', data);
		var players = data.pl.split('||');
		//console.log(players);
		for (var i = 0; i < players.length; i++) {
			var items = players[i].split('|');
			this.hofInfo[''+ items[0]] = items[1];
		}
	},

	updateHallOfFame: function(data) {
		// console.log('updateHallOfFame', data);
		var players = data.pl.split('||');
		var out = '';
		this.hofInfo = [];
		for (var i = 0; i < players.length; i++) {
			var items = players[i].split('|');
			var p = (i + 1);
			if (p <= 10){
				this.hofInfo.push([items[0], p, items[1]]);
				out += '<li '+ (items[0] == my_id ? 'class="myPlace"' : '') +'>'+ (p > 3 ? '<em>'+ p +'</em>' : '<em class="ico"><img src="/img/icons/place'+ p +'.png" /></em>') +'<p class="nick">'+ game.getPlayerName(items[0]) +'</p><span class="killsQty'+ (this.roomMode == room_modes.ffa ? '' : '') +'">'+ parseInt(items[1]) +'</span></li>';
			}else{
				//this.hofInfo.push([this.player.id, items[0], items[1]]);
				out += '<li class="myPlace lastInTop"><em>'+ items[0] +'</em><p class="nick">'+ game.getPlayerName(my_id) +'</p><span class="killsQty'+ (this.roomMode == room_modes.ffa ? '' : '') +'">'+ parseInt(items[1]) +'</span></li>';
			}
		}
		if (out != '') $("#leaderBoard ul").html(out);
	},

	updateTeamHofProgress: function(data) {
		// console.log(data);
		var teams_data = [
			{id: data[1], kills: data[2], prc: Math.min(100, Math.round(data[2] / this.arenaWinKills * 100))},
			{id: data[3], kills: data[4], prc: Math.min(100, Math.round(data[4] / this.arenaWinKills * 100))},
			{id: data[5], kills: data[6], prc: Math.min(100, Math.round(data[6] / this.arenaWinKills * 100))}
		];
		var html = '<li class="killsWinCount">'+
				Texts.gameTill +' <strong>'+ this.arenaWinKills +'</strong><img src="/img/icons/kills-xs.png" />'+
			'</li>';
		for (var i = 0; i < teams_data.length; i ++) {
			var myTeam = this.player != null && typeof this.playersInfo[this.player.id] != 'undefined' && this.playersInfo[this.player.id].team == teams_data[i].id;
			html +=
			'<li class="place'+ (i + 1) +' '+ team_hscolors[teams_data[i].id] +' '+ (myTeam ? 'myPlace' : '') +'">'+
				'<div class="krownIco"></div>'+
				'<div class="progressBar"><div class="progress" style="width: '+ teams_data[i].prc +'%"></div></div>'+
				'<div class="teamName">'+ Texts.teamsNames[teams_data[i].id] +'</div>'+
				'<div class="killsQty">'+ teams_data[i].kills +'</div>'+
			'</li>';
		}
		$("#teamLeaderBoard").html(html);
	},

	updateBossHofProgress: function(data) {
		// console.log(data);
		var isNew = true;
		var html = '';
		if (!$('#teamLeaderBoard li#killsWinCount').length) {
			html += '<li id="killsWinCount" class="killsWinCount">'+
						'<div class="timerContainer">'+
							'<div class="miniTimer">'+
								'<span class="unit"><span class="minutes">0</span>'+ Texts.m +'</span> <span class="unit"><span class="seconds">0</span>'+ Texts.s +'</span>'+
							'</div>'+
						'</div>'+
					'</li>';
		} else {
			$("#teamLeaderBoard li").not('.killsWinCount').remove();
			isNew = false;
		}
		var count = Math.round((data.length - 1) / 2);
		for (var i = 0; i < count; i++) {
			html +=
			'<li class="place'+ (i + 1) +'">'+
				'<div class="krownIco"></div>'+
				'<div class="teamName">'+ this.getPlayerName('p'+ data[i * 2 + 1]) +'</div>'+
				'<div class="damageQty">'+ data[i * 2 + 2] +'%</div>'+
			'</li>';
		}
		$("#teamLeaderBoard").append(html);
		if (isNew) {
			$("#teamLeaderBoard div.miniTimer").countdown(this.stateTimer * 1000, function(event){});
		}
	},

	updatePlayerEaten: function(data) {
		// console.log(data);
		if (this.roomMode == room_modes.arena || game.roomMode == room_modes.boss) {
			if (this.player == this.players['p'+ data[1]] && this.player != null && this.player.mainCell != null) {
				var playerData = {
					x: this.player.mainCell.drawPosition[X],
					y: this.player.mainCell.drawPosition[Y],
					radius: this.player.mainCell.drawSize[Y]
				}
				playSound('sfx', 'kill_player');
				animEvents('playerEaten', playerData);
			}
			InfoBoard.add('<span class="nick '+ team_hcolors[this.getPlayerTeam('p'+ data[1])] +'">'+ this.getPlayerName('p'+ data[1]) +'</span><img src="/img/icons/kill.png" alt="" style="margin: 0 4px;" class="killIco" /><span class="nick '+ team_hcolors[this.getPlayerTeam('p'+ data[2])] +'">'+ this.getPlayerName('p'+ data[2]) +'</span>');
			if (typeof this.playersInfo['p'+ data[2]] != 'undefined' && this.playersInfo['p'+ data[2]].runesData != null) {
				this.playersInfo['p'+ data[2]].runesData.active = false;
			}
		} else
		if (this.roomMode == room_modes.ffa) {
			if (this.player != null && this.player.mainCell != null && this.player.id == 'p'+ data[1]) {
				var playerData = {
					x: this.player.mainCell.drawPosition[X],
					y: this.player.mainCell.drawPosition[Y],
					radius: this.player.mainCell.drawSize[Y],
					count: this.eatedBy == 'p'+ data[2] ? 3 : 1
				}
				if (typeof this.playersInfo['p'+ data[2]] != 'undefined') {
					this.playersInfo['p'+ data[2]].active = false;
				}
				playSound('sfx', 'kill_player');
				animEvents('playerEatenFFA', playerData);
			}
			if (this.player != null && this.player.id == 'p'+ data[1] && this.eatedBy == 'p'+ data[2]) {
				this.eatedBy = 0;
			}
		}
	},

	updateStuff: function(data) {
		// console.log(data);
		var now = Date.now();
		var idx = '';
		var count = Math.round((data.length - 1) / 3);
		for (var i = 0; i < count; i++) {
			var item = {
				type: Math.round((data[i * 3 + 1] - data[i * 3 + 1] % 1000) / 1000),
				typeId: data[i * 3 + 1] % 1000,
				x: data[i * 3 + 2],
				y: data[i * 3 + 3]
			}
			var prefix = 's';
			switch (item.type) {
				case stuff_types.coin:
					prefix = 'c';
					break;
				case stuff_types.ruby:
					prefix = 'r';
					break;
				case stuff_types.elixir:
					prefix = 'e';
					break;
				case stuff_types.std_key:
					prefix = 'k';
					break;
				case stuff_types.booster:
					prefix = 'b';
					break;
			}
			idx = prefix + item.x +"_"+ item.y;

			if (typeof this.stuff[idx] == 'undefined') {
				this.stuff[idx] = this.createStuff(item);
			} else
			if (typeof this.stuff[idx].moveTarget != 'undefined') {
				this.stuff[idx].moveTarget = null;
				delete this.stuff[idx].moveTarget;
				this.stuff[idx].setNewPosition([item.x, item.y, 0]);
			}
			this.stuff[idx].lastVisible = now;
			this.stuff[idx].dead = false;
		}
		for (idx in this.stuff) {
			if (this.stuff[idx].lastVisible < now && !this.stuff[idx].dead && typeof this.stuff[idx].moveTarget == 'undefined') {
				this.stuff[idx].setNewSize(0);
				this.stuff[idx].dead = true;

				var pl_e = 0;
				var cl_e = -1;
				var min_dist = 5000;
				for (idx_ in this.players) {
					for (id_c_ in this.players[idx_].cells) {
						var totalSize = this.stuff[idx].size + this.players[idx_].cells[id_c_].size + this.players[idx_].cells[id_c_].foodEatDistance;
						var dist = distanceToTarget(this.stuff[idx], this.players[idx_].cells[id_c_]) - totalSize;
						if (dist < min_dist && dist < totalSize * this.collision_cell_koef) {
							min_dist = dist;
							pl_e = idx_;
							cl_e = id_c_;
						}
					}
				}
				if (cl_e != -1 && min_dist < 100) {
					this.stuff[idx].target = this.players[pl_e].cells[cl_e].position;
					if (!this.loading && this.players[pl_e] == this.player) {
						switch (this.stuff[idx].stuffType) {
							case stuff_types.coin:
								if (!this.playerLimits.coins) {
									playSound('sfx', 'take_coin', calcSoundPan(this.stuff[idx].drawPosition));
									animEvents('coinCollect', {x: this.players[pl_e].cells[cl_e].drawPosition[X], y: this.players[pl_e].cells[cl_e].drawPosition[Y], radius: this.players[pl_e].cells[cl_e].drawSize[Y]});
								} else
								if (this.limitHints.coins.count > 0 && now - this.limitHints.coins.lastTime >= 5000) {
									Hints.text('coinsLimit');
									this.limitHints.coins.count --;
									this.limitHints.coins.lastTime = now;
								}
								break;
							case stuff_types.ruby:
								if (!this.playerLimits.ruby) {
									playSound('sfx', 'crystals_buy', calcSoundPan(this.stuff[idx].drawPosition));
									animEvents('rubyCollect', {x: this.players[pl_e].cells[cl_e].drawPosition[X], y: this.players[pl_e].cells[cl_e].drawPosition[Y], radius: this.players[pl_e].cells[cl_e].drawSize[Y]});
								} else
								if (this.limitHints.ruby.count > 0 && now - this.limitHints.ruby.lastTime >= 5000) {
									// Hints.text(subscriptions_data.indexOf('3') == -1 ? 'noSubscribtion' : 'rubyLimit');
									Hints.text('rubyLimit');
									this.limitHints.ruby.count --;
									this.limitHints.ruby.lastTime = now;
								}
								break;
							case stuff_types.std_key:
								if (!this.playerLimits.std_keys) {
									animEvents('keyCollect', {x: this.players[pl_e].cells[cl_e].drawPosition[X], y: this.players[pl_e].cells[cl_e].drawPosition[Y], radius: this.players[pl_e].cells[cl_e].drawSize[Y]});
									playSound('sfx', 'take_std_key', calcSoundPan(this.stuff[idx].drawPosition));
								} else
								if (this.limitHints.std_keys.count > 0 && now - this.limitHints.std_keys.lastTime >= 5000) {
									Hints.text('stdKeysLimit');
									this.limitHints.std_keys.count --;
									this.limitHints.std_keys.lastTime = now;
								}
								break;
						}
					}
				} else {
					this.stuff[idx].size = 0;
				}
			}
		}
	},

	updatePotExplosions: function(data) {
		// console.log(data);
		var idb = 0;
		while (idb < data.length - 1) {
			var idx = "w"+ data[idb + 1];
			var item = {
				x: data[idb + 2],
				y: data[idb + 3]
			}
			idb += 3;
			var id_e = 'e'+ item.x +"_"+ item.y;
			if (typeof this.stuff[id_e] == 'undefined' && typeof this.weapons[idx] != 'undefined') {
				this.stuff[id_e] = this.createStuff({x: this.weapons[idx].mesh.position[X], y: this.weapons[idx].mesh.position[Y], type: stuff_types.elixir});
				this.stuff[id_e].dead = false;
				this.stuff[id_e].moveTarget = [item.x, item.y, 0];
				this.stuff[id_e].moveDistance = distanceToTargetP(this.stuff[id_e].position, this.stuff[id_e].moveTarget);
				this.stuff[id_e].moveSin = 0;
				this.stuff[id_e].lastVisible = Date.now() + 500;

				if (typeof this.weapons[idx] != 'undefined' && typeof this.weapons[idx].mesh_act != 'undefined' && !this.weapons[idx].drawAct) {
					this.weapons[idx].mesh_act.frame = 0;
					this.weapons[idx].mesh_act.lastUpdate = Date.now();
					this.weapons[idx].drawAct = true;
					var _w = this.getWeaponById(14);
					if (_w.collision_sound != '') {
						playSound('sfx', _w.collision_sound);//, calcSoundPan(this.weapons[idx].mesh.drawPosition));
					}
				}
			}
		}
	},

	updateDrop: function(data) {
		// console.log(data);
		var idb = 0;
		while (idb < data.length - 1) {
			var idx = "p"+ data[idb + 1];
			var item = {
				type: data[idb + 2],
				x: data[idb + 3],
				y: data[idb + 4]
			}
			idb += 4;

			var prefix = 's';
			switch (item.type) {
				case stuff_types.coin:
					prefix = 'c';
					break;
				case stuff_types.ruby:
					prefix = 'r';
					break;
				case stuff_types.elixir:
					prefix = 'e';
					break;
				case stuff_types.std_key:
					prefix = 'k';
					break;
				case stuff_types.booster:
					prefix = 'b';
					break;
			}

			var id_e = prefix + item.x +"_"+ item.y;
			if (typeof this.stuff[id_e] == 'undefined' && typeof this.players[idx] != 'undefined' && typeof this.players[idx].mainCell != 'undefined') {
				this.stuff[id_e] = this.createStuff({x: this.players[idx].mainCell.position[X], y: this.players[idx].mainCell.position[Y], type: item.type});
				this.stuff[id_e].dead = false;
				this.stuff[id_e].moveTarget = [item.x, item.y, 0];
				this.stuff[id_e].moveDistance = distanceToTargetP(this.stuff[id_e].position, this.stuff[id_e].moveTarget);
				this.stuff[id_e].moveSin = 0;
				this.stuff[id_e].lastVisible = Date.now() + 500;

				//playSound('sfx', '??');
			}
		}
	},

	updatePlayers: function(data) {
		if (this.playersInfo == {}) {return;}
		// console.log(this.eatedBy, data);
		var now = Date.now();
		var idx = '';
		var myIdx = '';
		var cells_count = 0;
		var idb = 0;
		while (idb < data.length - 1) {
			if (idb == 0) {
				idx = "p"+ data[idb + 1];
				camera.setTargetPosition([data[idb + 2], data[idb + 3], data[idb + 4] * 0.01]);
				cells_count = data[idb + 5];
				idb += 5;
				myIdx = idx;
				// this.player = this.players[idx];
				//if (cells_count == 0 && typeof this.players[idx] != 'undefined' && this.players[idx].cellsCount > 0 && this.roomMode == room_modes.ffa) {
					// Tasks.pauseChests(true);
				//}
				if (this.player != null) {
					this.player.position[X] = data[idb + 2];
					this.player.position[Y] = data[idb + 3];
				}
			} else {
				idx = "p"+ data[idb + 1];
				cells_count = data[idb + 2];
				idb += 2;
			}
			
			if (typeof this.playersInfo[idx] != 'undefined') {
				if (!this.playersInfo[idx].active) {
					this.playersInfo[idx].active = true;
					this.updateTeamPlayersCount();
				}
				if (typeof this.players[idx] == 'undefined' || typeof this.players[idx].position == 'undefined') {
					this.players[idx] = this.createPlayer(idx);
					if (idx == myIdx) {
						this.player = this.players[idx];
					}
					if (this.player != null && this.player.id == idx) {
						if (this.roomMode == room_modes.arena || game.roomMode == room_modes.boss) {
							this.createTeamStuff(idx);
						} else {
							this.createFfaStuff();
						}
					}
				}
				var vasDead = this.players[idx].cellsCount == 0;
				this.players[idx].cellsCount = cells_count;

				var bSize = 0;
				var bCell = '';
				var bId = '';
				var playerMass = 0;
				var allowPlaySound = true;
				for (var j = 0; j < cells_count; j++) {
					var id_c = "c"+ data[idb + 1];
					var toX = data[idb + 2];
					var toY = data[idb + 3];
					var mass = data[idb + 4];
					idb += 4;
					var startX = -1;
					var startY = -1;
					if (data[idb + 1] == 65530) {
						startX = data[idb + 2];
						startY = data[idb + 3];
						idb += 3;
					}
					var size = massToRadius(mass);
					playerMass += mass;
					
					if (typeof this.players[idx].cells[id_c] == 'undefined') {
						this.players[idx].cells[id_c] = newGlSimpleObject({id: id_c, size: size});
						this.players[idx].cells[id_c].playerId = idx;
						this.players[idx].cells[id_c].eat = {mass: 0, time: 0};
						if (cells_count > 1) {
							if (allowPlaySound && !this.loading && this.players[idx] == this.player) {
								playSound('sfx', 'ball_dividing');
								allowPlaySound = false;
							}
						}
					}
					if (startX > -1 && startY > -1 && Math.abs(startX - toX) < size * 2 && Math.abs(startY - toY) < size * 2) {
						this.players[idx].cells[id_c].position = [startX, startY, 0];
						this.players[idx].cells[id_c].target = [toX, toY, 0];
					} else {
						if (vasDead) {
							this.players[idx].cells[id_c].position = [toX, toY, 0];
							// camera.position[X] = toX;
							// camera.position[Y] = toY;
							this.playersInfo[idx].mesh.alpha = this.players[idx] == this.player ? 0.2 : 0;
							this.playersInfo[idx].mesh.newAlpha = this.players[idx] == this.player ? 0.2 : 0;
							this.players[idx].lastHideUpdate = Date.now() + 500;
						}
						this.players[idx].cells[id_c].setNewPosition([toX, toY, 0]);
					}
					if (now - this.players[idx].cells[id_c].eatTime >= 1000) {
						this.players[idx].cells[id_c].eatTime = now;
						this.players[idx].cells[id_c].eatMass = 0;
						//this.players[idx].cells[id_c].massChanged = 0;
					}
					var addMass = mass - this.players[idx].cells[id_c].mass;
					this.players[idx].cells[id_c].eatMass += addMass >= 50 ? addMass : 0;

					this.players[idx].cells[id_c].mass = mass;
					this.players[idx].cells[id_c].setNewSize(size);
					this.players[idx].cells[id_c].lastVisible = now;
					this.players[idx].cells[id_c].dead = false;
					this.players[idx].cells[id_c].main = false;

					if (this.player != null && this.players[idx] != this.player && this.player.mainCell != null && (this.playersInfo[idx].team == 0 || this.playersInfo[idx].team != this.playersInfo[this.player.id].team)) {
						if (this.player.mainCell.mass * 0.5 > this.players[idx].cells[id_c].mass * this.eatMaxMassKoef) {
							this.players[idx].cells[id_c].status = cell_status_types.canEatInJump;
						} else
						if (this.player.mainCell.mass > this.players[idx].cells[id_c].mass * this.eatMaxMassKoef) {
							this.players[idx].cells[id_c].status = cell_status_types.canEat;
						} else
						if (this.player.mainCell.mass  * this.eatMaxMassKoef < this.players[idx].cells[id_c].mass * 0.5) {
							this.players[idx].cells[id_c].status = cell_status_types.dangerInJump;
						} else
						if (this.player.mainCell.mass * this.eatMaxMassKoef < this.players[idx].cells[id_c].mass) {
							this.players[idx].cells[id_c].status = cell_status_types.danger;
						} else {
							this.players[idx].cells[id_c].status = cell_status_types.none;
						}
					}

					if (Math.round(this.players[idx].cells[id_c].mass) > bSize || (this.players[idx].cells[id_c].mass == bSize && this.players[idx].cells[id_c].id > bId)) {
						bSize = Math.round(this.players[idx].cells[id_c].mass);
						bCell = id_c;
						bId = this.players[idx].cells[id_c].id;
					}
				}
				if (cells_count > 0 && typeof this.players[idx].cells[bCell] != 'undefined') {
					this.players[idx].cells[bCell].main = true;
					this.players[idx].mainCell = this.players[idx].cells[bCell];
				}

				this.players[idx].mass = playerMass;
				this.players[idx].lastVisible = now;
				this.players[idx].dead = false;
				this.playersInfo[idx].dead = false;
			}
		}

		for (idx in this.players) {
			if (this.players[idx].lastVisible < now) {
				this.players[idx].dead = true;
				this.playersInfo[idx].dead = true;
			}
			for (id_c in this.players[idx].cells) {
				if (this.players[idx].cells[id_c].lastVisible + 150 < now && !this.players[idx].cells[id_c].dead) {
					this.players[idx].cells[id_c].dead = true;
					this.players[idx].cells[id_c].setNewSize(0);

					var pl_e = 0;
					var cl_e = 0;
					var min_dist = 7000;
					if (this.players[idx].cells[id_c].onScreen()) {
						for (var idx_ in this.players) {
							for (var id_c_ in this.players[idx_].cells) {
								if (id_c != id_c_ && this.players[idx].cells[id_c].size < this.players[idx_].cells[id_c_].size && this.players[idx_].cells[id_c_].eatMass > 0){
									var totalSize = this.players[idx].cells[id_c].size + this.players[idx_].cells[id_c_].size;
									var dist = distanceToTarget(this.players[idx].cells[id_c], this.players[idx_].cells[id_c_]);
									if (dist < min_dist && dist < totalSize * this.collision_cell_koef * 1.5) {
										min_dist = dist;
										pl_e = idx_;
										cl_e = id_c_;
									}
								}
							}
						}
					}
					if (cl_e != 0) {
						this.players[idx].cells[id_c].setNewPosition(this.players[pl_e].cells[cl_e].position);
						if (!this.loading && this.players[idx] == this.player || this.players[pl_e] == this.player) {
							if (idx == pl_e) {
								playSound('sfx', 'ball_unite', calcSoundPan(this.players[idx].cells[id_c].drawPosition));
							} else {
								playSound('sfx', 'ball_eat', calcSoundPan(this.players[idx].cells[id_c].drawPosition));
								if (this.players[pl_e] == this.player) {
									var mass = Math.min(this.players[idx].cells[id_c].mass, this.players[pl_e].cells[cl_e].eatMass);
									this.players[pl_e].cells[cl_e].eatMass = 0;
									this.players[pl_e].cells[cl_e].eatTime = now;
									if (mass > 0) {
										this.createEat({id_p: pl_e, id_c: cl_e, value: mass});
									}
								}
							}
						}
					} else {
						this.players[idx].cells[id_c].size = 0;
					}
				}
			}
		}
	},

	updateEmotions: function(data) {
		// console.log(data);
		var idb = 0;
		while (idb < data.length - 1) {
			var idx = 'p'+ data[idb + 1];
			if (typeof this.players[idx] != 'undefined') {
				this.players[idx].emotion_id = data[idb + 2];
			}
			idb += 2;
		}
	},

	updatePlayerLimits: function(data) {
		//console.log(data);
		var newCoins = data[1] == 1;
		var newKeys = data[2] == 1;
		var newRuby = typeof data[3] != 'undefined' ? data[3] == 1 : false;
		// console.log(data, this.playerLimits.ruby, newRuby);
		if (!game.loading) {
			if (this.playerLimits.coins != newCoins) {
				Hints.text('coinsLimit');
				this.limitHints.coins.count --;
				this.limitHints.coins.lastTime = Date.now();
			}
			if (this.playerLimits.ruby != newRuby) {
				// Hints.text(subscriptions_data.indexOf('3') == -1 ? 'noSubscribtion' : 'rubyLimit');
				Hints.text('rubyLimit');
				this.limitHints.ruby.count --;
				this.limitHints.ruby.lastTime = Date.now();
			}
			if (this.playerLimits.std_keys != newKeys) {
				Hints.text('stdKeysLimit');
				this.limitHints.std_keys.count --;
				this.limitHints.std_keys.lastTime = Date.now();
			}
		}
		this.playerLimits.coins = newCoins;
		this.playerLimits.ruby = newRuby;
		this.playerLimits.std_keys = newKeys;

		for (var id_e in this.stuff) {
			if (!this.stuff[id_e].dead) {
				switch (this.stuff[id_e].type) {
					case stuff_types.coin:
						this.stuff[id_e].newAlpha = this.playerLimits.coins ? 0.6 : 1;
						break;
					case stuff_types.ruby:
						this.stuff[id_e].newAlpha = this.playerLimits.ruby ? 0.6 : 1;
						break;
					case stuff_types.std_key:
						this.stuff[id_e].newAlpha = this.playerLimits.std_keys ? 0.6 : 1;
						break;
				}
			}
		}
		
		if (typeof data[4] != 'undefined') {
			if (this.roomMode == room_modes.arena) {
				showGameRules(data[4], this.arenaWinKills, 0, this.arenaPlayersMax, false);
			} else {
				showBossGameRules(0, this.arenaPlayersMax);
			}
			setTimeout(function(){gameStartCounterChange('3');}, 2000);
			setTimeout(function(){gameStartCounterChange('2');}, 3000);
			setTimeout(function(){gameStartCounterChange('1');}, 4000);
			setTimeout(function(){gameStartCounterChange(Texts.start);}, 5000);
			setTimeout(function(){gameStartCounterChange('');}, 6000);
		}
	},

	updatePlayerBoosterCollect: function(data) {
		// console.log(data);
		if (this.player != null && this.player.mainCell != null) {
			animEvents('boosterCollect', {
				x: this.player.mainCell.drawPosition[X],
				y: this.player.mainCell.drawPosition[Y],
				radius: this.player.mainCell.drawSize[Y],
				boosterId: data[1]
			});
			playSound('sfx', 'take_booster');
		}
	},

	updatePlayerMana: function(data) {
		// console.log(data);
		this.playerMana = data[1];
		if (data.length > 2 && data[2] != 0) {
			Elixir.init(data[1], data[2]);
		} else {
			if (!this.loading && data[1] > Elixir.currentElixirCount) {
				playSound('sfx', 'take_elixir');
				//Hints.bubble('game4');
			}
			Elixir.changeTo(data[1]);
			// if (data.length > 2 && this.limitHints.elixir.count > 0) {
				// Hints.text('elixirLimit');
				// this.limitHints.elixir.count --;
			// }
		}
		WeaponBar.updateElixirStates(data[1]);
	},

	updatePlayerBuffs: function(data) {
		// console.log(data);
		this.playerBufs.food_mass = parseInt(data[1]);
		this.playerBufs.food_mass_koef = parseInt(data[2]);
	},

	updateUsePreBooster: function(data) {
		for (var i = 1; i < data.length; i++) {
			if (typeof bpd_ids[data[i]] != 'undefined') {
				bpd_ids[data[i]] --;
			}
		}
	},

	updateUseArmor: function(data) {
		if (my_skin[10] > 0) {
			arm_data[my_skin[10]][3] = parseInt(arm_data[my_skin[10]][3]) - 1;
		}
	},

	updatePlayerWeaponsLine: function(data) {
		// console.log(data);
		var wpn = [];
		var slotsCount = 0;
		var idb = 0;
		var wpn_used = true;
		while (idb < data.length - 1) {
			if (data[idb + 1] < 10000) {
				wpn.push(data[idb + 1]);
			} else {
				WeaponBar.maxSlots = data[idb + 1] - 10000;
				wpn_used = false;
			}
			idb ++;
		}
		if (WeaponBar.maxSlots == 2 && wpn.length == 2) {
			var a = wpn[0];
			wpn[0] = wpn[1];
			wpn[1] = a;
		}
		if (wpn_used) {
			this.updateWeaponHealth(data[2]);
		}
		WeaponBar.update(wpn);
	},

	updatePlayerWeaponUse: function(data) {
		// console.log(data);
		this.updateWeaponHealth(data[2]);
		WeaponBar.useWeapon(data[2], data[1]);
	},

	updateWeaponHealth: function(w_id) {
		if (weapons_list[w_id].type > 0 && weapons_list[w_id].type < 100) {
			wpn_data[w_id][3] = parseInt(wpn_data[w_id][3]) - 1;

			if (wpn_data[w_id][3] == 0) {
				Hints.text('weaponBroken');
			}
		}
	},
	
	updatePlayerBoosterUse: function(data) {
		switch(parseInt(data[3])){
			case 1: Hints.text('noCoins'); break;
			case 2: Hints.text('fullElixir'); break;
			case 3: Hints.text('oneCell'); break;
			case 4: 
				var boosterId = parseInt(data[2]);
				Hints.text('boosterBuy', [boosters_ingame[boosterId].coins, true]);
				var new_ruby = parseInt($("#myBars .ruby em").text()) - 5;
				DefMyBars.setRuby(new_ruby);
				break;
			case 0: 
				var boosterId = parseInt(data[2]);
				Hints.text('boosterBuy', [boosters_ingame[boosterId].coins, false]);
				break;
		}
	},

	updateAWeapons: function(data) {
		// console.log(data);
		var now = Date.now();
		var idx = '';
		var w_count = 0;
		var idb = 0;
		while (idb < data.length - 1) {
			idx = "p"+ data[idb + 1];
			w_count = data[idb + 2];
			idb += 2;
			for (var i = 0; i < w_count; i++) {
				var id = data[idb + i * 3 + 1];
				var liveTime = data[idb + i * 3 + 2];
				var type = data[idb + i * 3 + 3];
				var id_w = "aw"+ id;
				if (typeof this.aWeapons[idx +'_'+ id_w] == 'undefined' || typeof this.aWeapons[idx +'_'+ id_w].mesh.position == 'undefined' && typeof this.playersInfo[idx] != 'undefined') {
					this.aWeapons[idx +'_'+ id_w] = this.createAWeapon(idx, id, liveTime, type);
					this.aWeapons[idx +'_'+ id_w].owner = this.players[idx];
				}
			}
			idb += w_count * 3;
		}
	},

	updateRpWeapons: function(data) {
		//console.log(data);
		var now = Date.now();
		var idx = '';
		var w_count = 0;
		var idb = 0;
		while (idb < data.length - 1) {
			idx = "p"+ data[idb + 1];
			w_count = data[idb + 2];
			idb += 2;
			for (var i = 0; i < w_count; i++) {
				var id = data[idb + i * 3 + 1];
				var liveTime = data[idb + i * 3 + 2];
				var id_w = idx +'_rp'+ id;
				if (typeof this.rpWeapons[id_w] == 'undefined' || typeof this.rpWeapons[id_w].mesh.position == 'undefined' && typeof this.playersInfo[idx] != 'undefined') {
					this.rpWeapons[id_w] = this.createRpWeapon(idx, id, liveTime);
					this.rpWeapons[id_w].owner = this.players[idx];
				} else {
					this.rpWeapons[id_w].lastVisible = Date.now() + liveTime;
				}
			}
			idb += w_count * 2;
		}
	},

	updateWeapons: function(data) {
		//console.log(data);
		var now = Date.now();
		var idx = '';
		var w_count = 0;
		var idb = 0;
		while (idb < data.length - 1) {
			idx = "w"+ data[idb + 1];
			owner = "p"+ data[idb + 5];
			var item = {
				owner: owner,
				w_id: data[idb + 4],
				x: data[idb + 2] - 500,
				y: data[idb + 3] - 500,
				px: -1,
				py: -1,
				angle: 0,
				target: 0,
				liveTime: data[0] == ws_commands.weapons_lt ? data[idb + 6] : 200
			}
			if (data[idb + 6] == 0) {
				item.px = data[idb + 7] - 500;
				item.py = data[idb + 8] - 500;
				item.angle = (data[idb + 9] - 1000) / 100 - Math.PI / 2;
				item.target = data[idb + 10];
				idb += 5;
			}
			idb += (data[0] == ws_commands.weapons_lt ? 6 : 5);

			if (typeof this.weapons[idx] == 'undefined' || typeof this.weapons[idx].mesh == 'undefined') {
				if (typeof this.playersInfo[item.owner] != 'undefined' /*&& typeof this.players[item.owner] != 'undefined'*/) {
					this.weapons[idx] = this.createWeapon(item);
					var _w = this.weapons[idx].weapon;
					this.weapons[idx].owner = this.players[item.owner];
					if (item.px > -1) {
						this.weapons[idx].mesh.position[X] = item.px;
						this.weapons[idx].mesh.position[Y] = item.py;
						this.weapons[idx].mesh.setNewPosition([item.x, item.y, 0]);
					}
					if (_w.action_type == weapon_action_types.linear && !_w.action_holded && item.px > -1 && _w.id != 50 && _w.id != 51 && _w.id != 52) {
						this.weapons[idx].mesh.angle[Z] = item.angle;
						this.weapons[idx].mesh.moveSpeed = _w.action_speed;
					} else
					if (typeof this.weapons[idx].owner != 'undefined') {
						if (this.weapons[idx].mesh.angleSpeed[Z] == null) {
							this.weapons[idx].mesh.angle[Z] = -getWeaponAngle(this.weapons[idx].owner.mainCell, this.weapons[idx].mesh);
						}
						if (_w.action_use_for_owner || _w.action_type == weapon_action_types.radial && typeof this.players[item.owner] != 'undefined') {
							this.players[item.owner].weapons[idx] = idx;
						}
					}
					if (_w.move_sound != '') {
						this.weapons[idx].mesh.playerId = item.owner;
						this.weapons[idx].mesh.sound = _w.move_sound;
						this.weapons[idx].mesh.soundRepeat = _w.move_sound_repeat ? 2 : false;
					}
				}
			} else {
				if (item.px > -1) {
					this.weapons[idx].mesh.position[X] = item.px;
					this.weapons[idx].mesh.position[Y] = item.py;
				}
				var _w = this.weapons[idx].weapon;
				if (_w.action_type != weapon_action_types.linear || _w.action_holded || _w.id == 50 || _w.id == 51 || _w.id == 52) {
					this.weapons[idx].mesh.setNewPosition([item.x, item.y, 0]);
				}
			}
			if (typeof this.weapons[idx] != 'undefined') {
				this.weapons[idx].lastVisible = now + item.liveTime;
				this.weapons[idx].dead = false;
			}
		}
	},

	updateExplosions: function(data) {
		// console.log(data);
		var idb = 0;
		while (idb < data.length - 1) {
			var id = data[idb + 1];
			var item = {
				id: id,
				size: data[idb + 2],
				texture: data[idb + 3],
				x: data[idb + 4] - 500,
				y: data[idb + 5] - 500
			}
			idb += 5;
			this.createExplode(item);
		}
	},

	clearEffects: function(data) {
		// console.log('clearEffects', data);
		var idx = 'p'+data[1];
		for (var i = 0; i < this.effects.length; i++) {
			if (this.effects[i].id == null) continue;
			var eff_id = this.effects[i].id.split('_');
			var _player = this.players[idx];
			if (typeof _player != 'undefined') {
				for (var id_c in _player.cells) {
					if ('c'+ eff_id[0] == id_c) {
						this.effects[i].lastVisible = 0;
					}
				}
			}
		}
	},

	updateEffects: function(data) {
		// if (data[idb + 3] != 100) {
			// console.log('updateEffects', data);
		// }
		var now = Date.now();
		var w_count = 0;
		var idb = 0;
		while (idb < data.length - 1) {
			var id = data[idb + 1];
			var texture = data[idb + 2];
			var liveTime = Math.max(500, data[idb + 3]);
			var cell = null;

			for (var idx in this.players) {
				if (typeof this.players[idx].cells["c"+ id] != 'undefined') {
					cell = this.players[idx].cells["c"+ id];
					if (texture == 0) { // Hide
						if (this.playersInfo[idx].mesh.alpha == 1 && this.playersInfo[idx].mesh.newAlpha == 1) {
							// playSound('sfx', 'invisible_start', calcSoundPan(this.players[idx].mainCell.drawPosition));
						}
						this.playersInfo[idx].mesh.alpha = this.players[idx] == this.player ? 0.2 : 0;
						this.playersInfo[idx].mesh.newAlpha = this.players[idx] == this.player ? 0.2 : 0;
						this.playersInfo[idx].mesh.newAlphaSpeed = 2;
						this.playersInfo[idx].mesh.allowDistord = true;
						this.players[idx].lastHideUpdate = Date.now() + liveTime;
					} else
					if (texture == 100) { // Invisible
						this.playersInfo[idx].mesh.newAlpha = 0.2;
						this.playersInfo[idx].mesh.newAlphaSpeed = 7;
						this.playersInfo[idx].mesh.allowDistord = false;
						this.players[idx].lastHideUpdate = Date.now() + liveTime;
					}
					break;
				}
			}

			if (texture > 0 && texture != 100 && cell != null) {
				var found = false;
				for (var i = 0; i < this.effects.length; i++) {
					if (this.effects[i].id == id +"_"+ texture) {
						this.effects[i].lastVisible = Date.now() + liveTime;
						found = true;
						break;
					}
				}

				if (!found) {
					var item = {
						id: id +"_"+ texture,
						x: 0,
						y: 0,
						size: cell.size,
						texture_pack: 'effects',
						texture: texture,
						owner: cell,
						holdOn: null,
						dieOnAnimationEnd: false,
						liveTime: Date.now() + liveTime,
						angle: 0
					}
					this.createEffect(item);
				}
			}
			idb += 3;
		}
	},

	getPlayerName: function(id) {
		for (var idx in this.playersInfo) {
			if (this.playersInfo[idx].prf == id || 'p'+ this.playersInfo[idx].id == id) {
				return this.playersInfo[idx].nick;
			}
		}
		if (typeof this.hofInfo[''+ id] != "undefined") return this.hofInfo[''+ id];
		return '';
	},

	getPlayerClanData: function(id) {
		for (var idx in this.playersInfo) {
			if (this.playersInfo[idx].prf == id || 'p'+ this.playersInfo[idx].id == id) {
				return this.playersInfo[idx].clan;
			}
		}
		return {id: 0, name: '', ico: 0};
	},

	getPlayerTeam: function(id) {
		for (var idx in this.playersInfo) {
			if (this.playersInfo[idx].prf == id || 'p'+ this.playersInfo[idx].id == id) {
				return this.playersInfo[idx].team;
			}
		}
		return 0;
	},

	getPlayerPhs: function(id) {
		for (var idx in this.playersInfo) {
			if (this.playersInfo[idx].prf == id || 'p'+ this.playersInfo[idx].id == id) {
				return this.playersInfo[idx].phs;
			}
		}
		return '';
	},

	getPlayerPrfId: function(id) {
		for (var idx in this.playersInfo) {
			if (this.playersInfo[idx].prf == id || 'p'+ this.playersInfo[idx].id == id) {
				return this.playersInfo[idx].prf;
			}
		}
		return '';
	},

	getPlayerImage: function(idx, img) {
		if (typeof this.playersInfo[idx] == 'undefined') return;

		var canvas = document.createElement('canvas');
		canvas.width  = 420;
		canvas.height = 420;
		var ctx = canvas.getContext("2d");

		var cn = this.playersInfo[idx].mesh.texture[0].canvas;

		var w = cn.width / 2;
		var h = cn.height / 2;
		ctx.drawImage(cn, 210 - Math.round(w), 210 - Math.round(h));

		$(img).attr('src', canvas.toDataURL());
	},

	updateInitArtefact: function(data) {
		// console.log(data);
		var id_p = 'p'+ data[1];
		if (typeof this.playersInfo[id_p] != 'undefined') {
			if (this.playersInfo[id_p].runesData == null) {
				this.playersInfo[id_p].runesData = this.createRunes(data[2], parseInt(data[3]), parseInt(data[4]));
			} else {
				this.playersInfo[id_p].runesData.createTime = Date.now() + parseInt(data[3]) - parseInt(data[4]);
				this.playersInfo[id_p].runesData.active = true;
			}
		}
	},

	updateDamage: function(data) {
		//console.log(data);
		var idb = 0;
		while (idb < data.length - 1) {
			var item = {
				id_p: 'p'+ data[idb + 1],
				id_c: 'c'+ data[idb + 2],
				value: data[idb + 3] + data[idb + 5],
				flag: data[idb + 4],
				dmg_armor: data[idb + 5]
			}
			idb += 5;
			this.createDamage(item);
			
			//if (typeof this.playersInfo[item.id_p] != 'undefined') {
				//this.playersInfo[item.id_p].armor -= item.dmg_armor;
			//}
		}
	},

	updateArmor: function(data) {
		// console.log(data);
		var id_p = 'p'+ data[1];
		if (typeof this.playersInfo[id_p] != 'undefined') {
			this.playersInfo[id_p].armor = data[2];
			if (this.playersInfo[id_p].isBoss) {
				this.updateBossHpBar(id_p);
			}
		}
	},

	updateBossHpBar: function(id_p) {
		if (this.playersInfo[id_p].armor < 0) this.playersInfo[id_p].armor = 0;
		var prc = Math.round(this.playersInfo[id_p].armor / this.playersInfo[id_p].startArmor * 100);
		$('#bossHpBar div.progress').css({'width': prc +'%'});
		//$('#bossHpBar em.current').html(this.playersInfo[id_p].armor);
		$('#bossHpBar em.current').html(prc +'%');
		if (prc <= this.bossAngryPrc && !this.playersInfo[id_p].mesh.angry) {
			// Make boss Angry
			Hints.text('angryBoss');
			this.playersInfo[id_p].mesh.angry = true;
			var skin = this.playersInfo[id_p].skin.split(',');
			skin[0] += 'a';
			var angrySkin = createPlayerSkin(skin, null);
			this.playersInfo[id_p].mesh.texture = [angrySkin];
		}
	},

	updatePlayersList: function(data) {
		// console.log(data);
		// console.log('Players list', data.pl);
		var players = data.pl.split('||');
		// console.log(players);
		for (var i = 0; i < players.length; i++) {
			var items = players[i].split('|');
			var wpl = [];
			if (items[5] != '-') {
				var wl = items[5].split(',');
				for (var _w = 0; _w < wl.length; _w++) {
					var _wi = wl[_w].split(':');
					wpl[_wi[0]] = _wi[1];
				}
			}
			var level_data = items[6].split(':');
			var team = level_data.length > 2 ? parseInt(level_data[2]) : 0;
			var clan_data = items[11].split(':');
			if (typeof this.playersInfo['p'+ items[0]] == 'undefined') {
				var rune_data = items[9].split(':');
				var armor_data = items[12].split(':');
				var nick =  items[2];
				if (items[13] == 1) {
					nick = nick.split('&&')[my_lang == 'ru' ? 0 : (my_lang == 'lv' ? 2 : 1)];
				}
				this.playersInfo['p'+ items[0]] = {
					id: items[0],
					isBoss: items[13] == 1,
					active: false,
					dead: false,
					position: [0, 0],
					onScreen: false,
					armor: parseInt(armor_data[0]),
					startArmor: parseInt(armor_data[1]),
					prf: items[1],
					nick: nick,
					phs: items[3],
					clan: {
						id: clan_data[0],
						name: clan_data[1],
						ico: clan_data[2]
					},
					team: team,
					skin: items[4],
					buff_wd_koef: (items[7] != 0 ? 1 + items[7] * 0.01 : 1),
					wpl: wpl,
					bst: items[10] == 1,
					removeTime: 0,
					mesh_nick: getNickLabel(nick, parseInt(level_data[0]), level_data.length > 1 ? parseInt(level_data[1]) : 0, team_colors[team]),
					mesh_clan: parseInt(clan_data[0]) > 0 ? getClanLabel(clan_data[0], clan_data[1], clan_text_color) : null,
					arrow_nick: getNickLabel(nick, 0, 0, team_colors[team]),
					mesh: newGlObject({skin: items[4].split(','), createMesh: true}),
					runesData: this.createRunes(items[8], parseInt(rune_data[0]), parseInt(rune_data[1]))
				}
				if (items[13] == 1) {
					this.updateBossHpBar('p'+ items[0]);
					$('#bossHpBar').removeClass('off');
				}
			}
		}
		//this.updateTeamPlayersCount();
	},

	updatePlayerInfo: function(data) {
		// console.log(data);
		// console.log('Player data', data.pl);
		var items = data.pl.split('|');
		var wpl = [];
		if (items[5] != '-') {
			var wl = items[5].split(',');
			for (var _w = 0; _w < wl.length; _w++) {
				var _wi = wl[_w].split(':');
				wpl[_wi[0]] = _wi[1];
			}
		}
		var level_data = items[6].split(':');
		var team = level_data.length > 2 ? parseInt(level_data[2]) : 0;
		var clan_data = items[11].split(':');
		if (typeof this.playersInfo['p'+ items[0]] == 'undefined') {
			var rune_data = items[9].split(':');
			var armor_data = items[12].split(':');
			var nick =  items[2];
			if (items[13] == 1) {
				nick = nick.split('&&')[my_lang == 'ru' ? 0 : (my_lang == 'lv' ? 2 : 1)];
			}
			this.playersInfo['p'+ items[0]] = {
				id: items[0],
				isBoss: items[13] == 1,
				active: false,
				dead: false,
				position: [0, 0],
				onScreen: false,
				armor: parseInt(armor_data[0]),
				startArmor: parseInt(armor_data[1]),
				prf: items[1],
				nick: nick,
				phs: items[3],
				clan: {
					id: clan_data[0],
					name: clan_data[1],
					ico: clan_data[2]
				},
				team: team,
				skin: items[4],
				buff_wd_koef: (items[7] != 0 ? 1 + items[7] * 0.01 : 1),
				wpl: wpl,
				bst: items[10] == 1,
				removeTime: 0,
				mesh_nick: getNickLabel(nick, parseInt(level_data[0]), level_data.length > 1 ? parseInt(level_data[1]) : 0, team_colors[team]),
				mesh_clan: parseInt(clan_data[0]) > 0 ? getClanLabel(clan_data[0], clan_data[1], clan_text_color) : null,
				arrow_nick: getNickLabel(nick, 0, 0, team_colors[team]),
				mesh: newGlObject({skin: items[4].split(','), createMesh: true}),
				runesData: this.createRunes(items[8], parseInt(rune_data[0]), parseInt(rune_data[1]))
			}
			if (items[13] == 1) {
				this.updateBossHpBar('p'+ items[0]);
				$('#bossHpBar').removeClass('off');
			}
		}
		if (this.roomMode == room_modes.arena || game.roomMode == room_modes.boss) {
			this.updateTeamPlayersCount();
			InfoBoard.add('<span class="nick '+ team_hcolors[team] +'">'+ this.getPlayerName('p'+ items[0]) +'</span> '+ Texts.joinedToRoom);
		}
	},

	updateTeamPlayersCount: function() {
		var cnt = 0;
		for (var idx in this.playersInfo) {
			if (this.playersInfo[idx].active) {
				cnt ++;
			}
		}
		$('#gameRules em#count').html(cnt);
	},
	
	updatePlayerStdKeys: function(data) {
	},

	removePlayerInfo: function(data) {
		var idx = "p"+ data[1];
		if (typeof this.playersInfo[idx] != 'undefined') {
			if (this.roomMode == room_modes.arena || game.roomMode == room_modes.boss) {
				this.playersInfo[idx].active = false;
				this.updateTeamPlayersCount();
				InfoBoard.add('<span class="nick '+ team_hcolors[this.getPlayerTeam(idx)] +'">'+ this.getPlayerName(idx) +'</span> '+ Texts.leftRoom);
			} else {
				this.playersInfo[idx].removeTime = Date.now() + 10000;
			}
		}
		if (this.eatedBy == idx) {
			this.eatedBy = 0;
		}
	},

	updatePlayerSkinHealth: function(data) {
		//console.log('Health: ', data[1] / 10000);
		var health = data[1] / 10000;
		//var zone = health > 30 ? 'normal' : (health > 10 ? 'yellow' : 'red');
		/*if (health <= 30) {
			$('div.durabilityIndicator').removeClass('off');
			if (health <= 10) {
				$('div.durabilityIndicator').addClass('red');
			} else {
				$('div.durabilityIndicator').removeClass('red');
			}
		} else {
			$('div.durabilityIndicator').addClass('off');
		}*/
	},

	updateChatBubbleState: function(data) {
		//console.log(data);
		var idb = 0;
		while (idb < data.length - 1) {
			var idx = 'p'+ data[idb + 1];
			if (typeof this.players[idx] != 'undefined') {
				this.players[idx].chatBubbleTime = data[idb + 2] == 0 ? 0 : Date.now() + 3600000;
			}
			idb += 2;
		}
	},

	updateChat: function(data) {
		//console.log(data);
		for (var i = 0; i < data.m.length; i ++) {
			var playerId = 'p'+ data.m[i][0];
			if (this.players[playerId].mainCell.onScreen()) {
				this.players[playerId].chatBubbleTime = Date.now() + this.chatBubbleTime * 1000;
				var msg = data.m[i][1];
				if (this.playersInfo[playerId].isBoss) {
					msg = typeof Texts.bossMsg[msg] != 'undefined' ? Texts.bossMsg[msg] : '';
				}
				if (msg != '') {
					InfoBoard.add('<span class="nick">'+ this.getPlayerName(playerId) +'</span>: <span class="msg">'+ msg +'</span>', {type: 'chat', my: false});
				}
			}
		}
	},

	updateArenaSuicide: function(data) {
		//console.log(data);
		this.finished = true;
		var length = Math.round((data.length - 14) / 3);
		var arr = {
			newRating: data[1],
			rating: data[1] - data[2],
			oldLeague: data[3],
			newLeague: data[4],
			skinBroken: data[5] == 1 || (parseInt(my_skin[8]) > 0 && uts + Math.round((Date.now() - page_loaded_at) / 1000) >= skins_set_expire_at),
			wingsBroken: parseInt(my_skin[12]) > 0 && uts + Math.round((Date.now() - page_loaded_at) / 1000) >= wings_expire_at
		};
		//console.log(arr);
		prf_data['rating'] = parseInt(prf_data['rating']);
		prf_data['livetime'] = parseInt(prf_data['livetime']) + data[6];
		gameChatInput.hide();
		newLeagueData.newAch = true;

		gameStartCounterChange('');
		mobileButtons.showControllers(false);
		WND_arena_die('close');
		WND_suicide_inactive('close');
		WND_suicide_die('open', arr);
		ws.disconnect();
	},

	updateBossFinish: function(data) {
		console.log(data);
		this.finished = true;

		var length = Math.round((data.length - 12) / 6);
		var arr = {
			isLog: false,
			myId: this.player.id,
			collectedCoins: data[1],
			collectedRuby: data[2],
			collectedChests: data[3],
			collectedSkinsTotal: 0,
			collectedSkinsBoss: data[4],
			oldSkins: parseInt(my_chests[9]),
			newSkins: 0,
			oldCoins: parseInt(prf_data.coins),
			newCoins: parseInt(prf_data.coins) + data[1],
			oldRuby: parseInt(prf_data.ruby),
			newRuby: parseInt(prf_data.ruby) + data[2],
			bossTotalSkins: data[5],
			bossStartArmor: 0,
			bossArmor: 0,
			bossDamage: 100 - data[6],
			bossLutRng: this.bossLutRng,
			bossLut: this.bossLut,
			newArmor: 0,
			skinBroken: data[7] || (parseInt(my_skin[8]) > 0 && uts + Math.round((Date.now() - page_loaded_at) / 1000) >= skins_set_expire_at),
			wingsBroken: parseInt(my_skin[12]) > 0 && uts + Math.round((Date.now() - page_loaded_at) / 1000) >= wings_expire_at,

			liveTime: data[8],
			places: ['p'+data[9], 'p'+data[10], 'p'+data[11]],
			players: []
		};
				
		for (var i = 0; i < length; i ++) {
			var isMe = this.players['p'+ data[i * 6 + 12]] == this.player;
			var pl_id = 'p'+ data[i * 6 + 12];
			var playerData = {
				id: pl_id,
				isMe: isMe,
				prf_id: game.getPlayerPrfId(pl_id),
				name: game.getPlayerName(pl_id),
				damage: data[i * 6 + 13],
				hits: data[i * 6 + 14],
				skinsDamage: data[i * 6 + 15],
				skinsHits: data[i * 6 + 16],
				skinsFastKill: data[i * 6 + 17]
			};
			arr.players.push(playerData);
			if (isMe) {
				arr.collectedSkinsTotal = arr.collectedSkinsBoss + playerData.skinsDamage + playerData.skinsHits + playerData.skinsFastKill;
				arr.newSkins = arr.oldSkins + arr.collectedSkinsTotal;
			}
		}

		for (var id_p in this.playersInfo) {
			if (this.playersInfo[id_p].isBoss) {
				arr.bossStartArmor = this.playersInfo[id_p].startArmor;
				arr.bossArmor = this.playersInfo[id_p].armor;
			}
		}

		my_progress_data[0] += arr.collectedCoins;
		my_progress_data[1] += arr.collectedRuby;

		my_chests[9] = (parseInt(my_chests[9]) + arr.collectedSkinsTotal) - arr.collectedChests * 10;
		my_chests[11] = parseInt(my_chests[11]) + arr.collectedSkinsTotal;
		if (arr.collectedChests > 0) {
			my_chests[10] += arr.collectedChests;
		}

		prf_data['livetime'] = parseInt(prf_data['livetime']) + arr.liveTime;
		prf_data['play_c_boss'] ++;
		
		if (my_chests[11] >= 300 && typeof arm_data[''+time_to_boss[3]] == 'undefined') {
			arr.newArmor = time_to_boss[3];
		}

		mobileButtons.showControllers(false);
		WND_arena_die('close');
		gameChatInput.hide();
		gameStartCounterChange(Texts.finish, game.roomMode != room_modes.boss);
		playSound('sfx', 'start');
		countFPS.sendAnalytics();
		setTimeout(function(){
			gameStartCounterChange('');
			WND_arena_die('close');
			if (!$("#wnd_suicide_inactive").length) {
				WND_boss_fin('open', arr);
			}
			ws.disconnect();
		}, 4000);
	},

	updateArenaFinishTeam: function(data) {
		// console.log(data);
		this.finished = true;

		setChestsBarIcon();

		var length = Math.round((data.length - 19) / 3);
		var arr = {
			isLog: false,
			myId: this.player.id,
			myTeam: 1,
			oldRating: data[1],
			newRating: data[2],
			rating: data[2] - data[1],
			oldLeague: data[3],
			newLeague: data[4],
			oldChsKeys: data[5],
			newChsKeys: data[6],
			collectedChsKeys: data[6] - data[5],
			oldCoins: data[7],
			newCoins: data[7] + data[8],
			coins: data[8],
			skinBroken: data[9] || (parseInt(my_skin[8]) > 0 && uts + Math.round((Date.now() - page_loaded_at) / 1000) >= skins_set_expire_at),
			wingsBroken: parseInt(my_skin[12]) > 0 && uts + Math.round((Date.now() - page_loaded_at) / 1000) >= wings_expire_at,
			chsType: 2,
			collectedChests: data[11],
			team_places: [data[12], data[13], data[14]],
			team_kills: [data[15], data[16], data[17]],
			newRuby: 0,
			collectedRuby: 0,
			newKeys: 0,
			collectedKeys: 0,
			newAward: data[19],
			players: []
		};

		my_progress_data[0] += arr.coins;
		my_progress_data[1] += arr.collectedRuby;
		my_progress_data[2] += arr.collectedKeys;
		my_progress_data[3] += arr.collectedChsKeys;

		my_chests[0] = arr.newChsKeys - arr.collectedChests * 10;
		if (arr.collectedChests > 0) {
			my_chests[arr.oldLeague + 1] ++;
			$("#chestBlock img.chestIco").attr('src', '/img/chests/s/chest_X.png');
		}
		if (arr.newAward > 0) {
			awards_data += (awards_data.length ? ',' : '') + arr.newAward +':1';
		}
		if (parseInt(prf_data.wpn_slots) == 1 && arr.newRating >= 250) {
			prf_data.wpn_slots = 2;
			if (wpn_game.length > 0) {
				wpn_game.push(parseInt(wpn_game[0]) != 32 ? '32' : '17');
			} else {
				wpn_game.push('17');
				wpn_game.push('32');
			}
			newLeagueData.newSlot = true;
		}
		prf_data.league = arr.newLeague;
		prf_data.rating = arr.newRating;
		prf_data['livetime'] = parseInt(prf_data['livetime']) + data[10];
		prf_data['play_c'] ++;

		//if (prf_data['play_c'] >= 10) {
		if (prf_data['rating'] >= 100) {
			MainMenuBtns.enableClans();
		}

		for (var i = 0; i < length; i ++) {
			
			var isMe = this.players['p'+ data[i * 3 + 20]] == this.player;
			if (isMe) arr.myTeam = data[i * 3 + 22];
			var pl_id = 'p'+ data[i * 3 + 20];
			arr.players.push({
				id: pl_id,
				prf_id: game.getPlayerPrfId(pl_id),
				place: i + 1,
				isMe: isMe,
				eat: data[i * 3 + 21],
				team: data[i * 3 + 22],
				name: game.getPlayerName(pl_id),
				clan: game.getPlayerClanData(pl_id)
			});
		}

		var team = 0;
		for (var i = 0; i < 3; i ++) {
			if (arr.team_places[i] == 1) {
				team = i + 1;
			}
		}
//		console.log('team', team);

		newLeagueData.newAch = true;

		mobileButtons.showControllers(false);
		WND_arena_die('close');
		gameChatInput.hide();
		// gameStartCounterChange(Texts.finish);
		gameStartCounterChange(TextParser.parseDescription(Texts.teamWin, team), true);
		playSound('sfx', 'start');
		countFPS.sendAnalytics();
		setTimeout(function(){
			gameStartCounterChange('');
			WND_arena_die('close');
			if (!$("#wnd_suicide_inactive").length) {
				WND_arena_fin_team('open', arr);
			}
			ws.disconnect();
		}, 4000);
	},

	updateFfaFinish: function(data) {
		this.finished = true;

		oldChsKeys = parseInt($('#chestKeyBar em.current').html().trim());
		oldRating = parseInt($('#myLeagueBar em.current').html().trim());
		var arr = {
			oldCoins: data[2] - data[1],
			newCoins: data[2],
			limitsCoins: data[3],
			dayCoins: data[4],
			skinBroken: data[5] || (parseInt(my_skin[8]) > 0 && uts + Math.round((Date.now() - page_loaded_at) / 1000) >= skins_set_expire_at),
			wingsBroken: parseInt(my_skin[12]) > 0 && uts + Math.round((Date.now() - page_loaded_at) / 1000) >= wings_expire_at,
			eatedBy: data[6],
			oldChsKeys: oldChsKeys, //data[8],
			newChsKeys: oldChsKeys + data[9],
			currentChsKeys: data[8],
			collectedChsKeys: data[9],
			collectedChests: data[10],
			chsType: 2,
			oldLeague: data[11],
			newLeague: data[12],
			collectedRating: data[13],
			oldRating: oldRating,
			newRating: data[14],
			reconnected: data[15] == 1,
			newAward: typeof data[17] != 'undefined' ? data[17] : 0
		}
		// console.log(arr);

		my_progress_data[0] = arr.dayCoins;
		my_progress_data[3] = data[16];//arr.collectedChsKeys;

		my_chests[0] = arr.currentChsKeys;//arr.newChsKeys - arr.collectedChests * 10;
		if (arr.collectedChests > 0) {
			my_chests[arr.oldLeague + 1] += arr.collectedChests;
			$("#chestBlock img.chestIco").attr('src', '/img/chests/s/chest_X.png');
		}

		if (arr.newAward > 0) {
			awards_data += (awards_data.length ? ',' : '') + arr.newAward +':1';
		}

		prf_data['livetime_ffa'] = parseInt(prf_data['livetime_ffa']) + data[7];
		prf_data['play_c_ffa'] ++;

		prf_data['rating'] = arr.newRating;
		if (prf_data['rating'] >= 100) {
			MainMenuBtns.enableClans();
		}

		if (parseInt(prf_data.wpn_slots) == 1 && arr.newRating >= 250) {
			prf_data.wpn_slots = 2;
			if (wpn_game.length > 0) {
				wpn_game.push(parseInt(wpn_game[0]) != 32 ? '32' : '17');
			} else {
				wpn_game.push('17');
				wpn_game.push('32');
			}
			newLeagueData.newSlot = true;
		}

		newLeagueData.newAch = true;

		animEvents('gameEnd');
		if (this.splitHintTimer != null) {
			clearTimeout(this.splitHintTimer);
			this.splitHintTimer = null;
		}
		StatAnalytics.send(StatAnalytics.GameFinish);
		countFPS.sendAnalytics();
		WND_suicide('close');
		WND_suicide_inactive('close');
		gameChatInput.hide();
		mobileButtons.showControllers(false);
		setTimeout(function(){
			WND_die('open', arr);
		}, 2000);
	},

	updateRespawnState: function(data) {
		if (data[1] == 0) {
			mobileButtons.showControllers(true);
			// Tasks.pauseChests(false);
			WND_arena_die('close');
			if (isMobileApp) {
				closeAllPopups();
			}
		} else {
			// Tasks.pauseChests(true);
			setTimeout(function(){
				mobileButtons.showControllers(false);
				WND_suicide_inactive('close');
				WND_arena_die('open', [data[1], data[2]]);
			}, 1000);
		}
	},

	updatePlayerAddMass: function(data) {
		var mass = data[1];
		this.createEat({id_p: this.player.id, id_c: this.player.mainCell.id, value: mass});
	},

	setQuestStep: function(id) {
		this.questWaiting = false;
		var step = id + 1;
		$("#taskBar .currentStep").text(step);
		$("#taskBar").removeClass('taskComplete').attr('data-step',step);
		$("#taskBar .taskText .text").html(questSteps[id][0][0]);
		$("#taskBar .need").text(questSteps[id][0][1]);
		$("#taskBar .current").text(0);
		$("#taskBar .animation").css({'background-image': 'url(/img/popups/tutorial/task'+ step +'.gif)'});

		for (var id_f in this.food) {
			this.food[id_f].dead = true;
			this.food[id_f].size *= 0.5;
			this.food[id_f].setNewSize(0);
		}

		for (var id_f in this.stuff) {
			this.stuff[id_f].dead = true;
			this.stuff[id_f].size *= 0.5;
			this.stuff[id_f].setNewSize(0);
		}

		//TweenMax.from($("#taskBar"),0.7,{top: "-200px", ease:Back.easeOut});
		
		switch (id) {
			case 0:
				// Hints.bubble('qst01', true);
				$("#taskBar .progressBar").removeClass('off');
				$("#taskBar").addClass('off');
				if (isMobileApp) {
					mobileButtons.showWeapons(false);
					mobileButtons.showJump(false);
				}
				setTimeout(function(){
					Hints.text('questStepSet', id);
					$("#taskBar").removeClass('off');
					var arrows = [null, null, null];
					for (var i = 0; i < 30; i++) {
						var item = {
							group: 0,
							x: Math.round(Math.random() * game.roomHeight * 1.5),
							y: Math.round(Math.random() * game.roomHeight)
						}
						var cell = game.players['p0'].cells['c0'];
						if (item.x > cell.position[X] - cell.size * 2 && item.x < cell.position[X] + cell.size * 2 && item.y > cell.position[Y] - cell.size * 2 && item.y < cell.position[Y] + cell.size * 2) {
							item.x = cell.position[X] + cell.size * 2;
						}
						var id_f = 'f'+ i;
						game.food[id_f] = game.createFood(item);
						game.foodTree.add(item.x, item.y, id_f);
						game.food[id_f].lastVisible = Date.now();
						game.food[id_f].dead = false;
					}
				}, 100);
				break;
			case 1:
				// Hints.bubble('qst02', true);
				Hints.text('questStepSet', id);
				$("#taskBar .progressBar").addClass('off');
				if (isMobileApp) {
					mobileButtons.showWeapons(false);
					mobileButtons.showJump(false);
				}
				this.playersInfo['p1'] = {
					id: 0,
					prf: 0,
					nick: '',
					wpl: [2],
					removeTime: 0,
					mesh_nick: null,
					mesh_clan: null,
					mesh: newGlObject({skin: [1, 10, 30, 105, 146, 0, 0, 0, 0, 0, 0, 0, 0], createMesh: true}),
					smileId: 1,
					smileTime: Date.now() + 1000,
					smileRemove: 0
				}
				this.players['p1'] = this.createPlayer();
				this.players['p1'].cells['c0'] = newGlSimpleObject({id: 'c0', size: massToRadius(100)});
				this.players['p1'].cells['c0'].mass = this.players['p0'].cells['c0'].mass * 0.55;
				this.players['p1'].cells['c0'].setNewSize(massToRadius(this.players['p1'].cells['c0'].mass));
				this.players['p1'].cells['c0'].position = [this.players['p0'].cells['c0'].position[X] < this.roomWidth / 2 ? this.roomWidth - 1000 : 1000, 800, 0];
				this.players['p1'].cells['c0'].divideSpeed = 0;
				this.players['p1'].cells['c0'].speed = 0;
				this.players['p1'].cells['c0'].angle = 0;
				this.players['p1'].cells['c0'].eat = {mass: 0, time: 0};
				this.players['p1'].cells['c0'].timeToCollapse = Date.now();
				this.players['p1'].cells['c0'].dead = false;
				this.players['p1'].mainCell = this.players['p1'].cells['c0'];
				this.players['p1'].allowEat = false;

				setTimeout(function(){
					game.playersInfo['p1'].mesh.position = game.players['p1'].cells['c0'].position;
					game.playersInfo['p1'].mesh.scale = game.players['p1'].cells['c0'].size;
					game.playersInfo['p1'].mesh.draw();
					game.players['p1'].cells['c0'].drawPosition[X] = game.playersInfo['p1'].mesh.drawPosition[X];
					game.players['p1'].cells['c0'].drawPosition[Y] = game.playersInfo['p1'].mesh.drawPosition[Y];
					game.players['p1'].cells['c0'].drawSize[X] = game.playersInfo['p1'].mesh.drawSize[X];
					game.players['p1'].cells['c0'].drawSize[Y] = game.playersInfo['p1'].mesh.drawSize[Y];

					Arrows.runTemplate([{
						direction: 5,
						y: game.players['p1'].cells['c0'].drawPosition[Y] - game.players['p1'].cells['c0'].drawSize[Y],
						x: game.players['p1'].cells['c0'].drawPosition[X] - game.players['p1'].cells['c0'].drawSize[X],
						time: 2,
					}]);
					game.players['p1'].allowEat = true;
				}, 500);
				break;
			case 2:
				// Hints.bubble('qst03', true);
				//Hints.text('questStepSet', id);
				$("#taskBar .textProgress").addClass('off');
				this.playersInfo['p2'] = {
					id: 0,
					prf: 0,
					nick: '',
					wpl: [2],
					removeTime: 0,
					mesh_nick: null,
					mesh_clan: null,
					mesh: newGlObject({skin: [53, 5, 45, 172, 0, 0, 0, 0, 0, 0, 0, 0, 0], createMesh: true}),
					smileId: 3,
					smileTime: Date.now() + 1000,
					smileRemove: 0
				}
				this.players['p2'] = this.createPlayer();
				this.players['p2'].cells['c0'] = newGlSimpleObject({id: 'c0', size: massToRadius(100)});
				this.players['p2'].cells['c0'].mass = this.players['p0'].cells['c0'].mass;
				this.players['p2'].cells['c0'].setNewSize(massToRadius(this.players['p2'].cells['c0'].mass));
				this.players['p2'].cells['c0'].position = [this.players['p0'].cells['c0'].position[X] < this.roomWidth / 2 ? this.roomWidth - 1000 : 1000, 800, 0];
				this.players['p2'].cells['c0'].divideSpeed = 0;
				this.players['p2'].cells['c0'].speed = 0;
				this.players['p2'].cells['c0'].angle = 0;
				this.players['p2'].cells['c0'].eat = {mass: 0, time: 0};
				this.players['p2'].cells['c0'].timeToCollapse = Date.now();
				this.players['p2'].cells['c0'].dead = false;
				this.players['p2'].mainCell = this.players['p2'].cells['c0'];

				// for (var i = 0; i < 8; i++) {
					// this.addQuestElixir();
				// }
				this.playerMana = 5;
				Elixir.init(this.playerMana, this.playersInfo['p0'].elixirMax);

				if (!isMobileApp) {
					$('#elixirBar').removeClass('off');
					$('#myWeaponBar #slot1').removeClass('off');
					$('#myWeaponBar #jump').addClass('off');
					$('#myWeaponBar').removeClass('off');
				} else {
					mobileButtons.showWeapons(true);
					mobileButtons.showJump(false);
				}
				break;
			case 3:
				// Hints.bubble('qst04', true);
				//Hints.text('questStepSet', id);
				$("#taskBar .textProgress").addClass('off');
				if (typeof this.players['p2'] != 'undefined') {
					this.players['p2'].cells['c0'].dead = true;
					this.players['p2'].cells['c0'].size *= 0.5;
					this.players['p2'].cells['c0'].setNewSize(0);
				}
				this.players['p0'].cells['c0'].speed = 400;
				if (this.players['p0'].cells['c0'].mass < 2500) {
					this.players['p0'].cells['c0'].mass = 2500;
					this.players['p0'].cells['c0'].setNewSize(massToRadius(this.players['p0'].cells['c0'].mass));
				}
				if (!isMobileApp) {
					$('#elixirBar').addClass('off');
					$('#myWeaponBar ul').css({'background': 'none'});
					$('#myWeaponBar #slot1').addClass('off');
					$('#myWeaponBar #jump').css({'left': '0'});
					$('#myWeaponBar #jump').removeClass('off');
					$('#myWeaponBar').removeClass('off');
				} else {
					mobileButtons.showWeapons(false);
					mobileButtons.showJump(true);
				}
				this.playerMana = 0;

				this.questAllowSplit = true;
				break;
		}
		StatAnalytics.sendTimeEvent('Quest_'+ (id + 1) +'_done');
	},

	incQuestProgress: function(step) {
		var currentStep = parseInt($("#taskBar .currentStep").text());
		if (currentStep != step + 1) return;

		var val = parseInt($("#taskBar .current").text());
		var max = parseInt($("#taskBar .need").text());
		val++;
		if (!$("#taskBar .textProgress").hasClass('off')) {
			var prc =  Math.min(100, Math.round(val / max * 100));
			$("#taskBar .progress").css({'width': prc +'%'});
		}
		
		$("#taskBar .current").text(val);
		if (val >= max) {
			$("#taskBar").addClass('taskComplete');
			if (currentStep < questSteps.length && !this.questWaiting) {
				this.questWaiting = true;
				StatAnalytics.send('Quest_'+ (step + 1) +'_done');
				DO_quest_step(false);
				Hints.text('questStepDone');
				playSound('sfx', 'step_finished');
				if (currentStep == 3) {
					StatAnalytics.send(StatAnalytics.QuestElixir, {count: this.player.elixir})
				}
				setTimeout(function(){
					game.setQuestStep(currentStep++);
				}, 2000);
			} else
			if (currentStep >= questSteps.length && !this.questWaiting) {
				this.questWaiting = true;
				StatAnalytics.send('Quest_'+ (step + 1) +'_done');
				DO_quest_step(false);
				Hints.text('questStepDone');
				playSound('sfx', 'step_finished');
				// Hints.bubble('qst05', true);
				setTimeout(function(){
					$("#taskBar").addClass('off');
				}, 2000);
				setTimeout(function(){
					game.stop(false);
					WND_quest_done('open');
				}, 2000);
			}
		}
	},

	addQuestElixir: function() {
		if (game.state != room_states.run || !game.questMode) return;
		if (parseInt($("#taskBar .currentStep").text()) != 3) return;

		if (this.playerMana >= 5) {
			setTimeout(function(){
				game.addQuestElixir();
			}, 2500);
		} else {
			var item = {
				group: 0,
				x: Math.round(Math.random() * this.roomHeight * 1.5),
				y: Math.round(Math.random() * this.roomHeight),
				type: stuff_types.elixir
			}
			var cell = this.players['p0'].cells['c0'];
			if (item.x > cell.position[X] - cell.size * 2 && item.x < cell.position[X] + cell.size * 2 && item.y > cell.position[Y] - cell.size * 2 && item.y < cell.position[Y] + cell.size * 2) {
				item.x = cell.position[X] < this.roomWidth / 2 ? item.x + cell.size * 2 : item.x - cell.size * 2;
			}
			if (typeof elixirIndex == 'undefined') elixirIndex = 0;
			elixirIndex ++;
			var id_f = 'f'+ elixirIndex;
			this.stuff[id_f] = this.createStuff(item);
			this.stuff[id_f].lastVisible = Date.now();
			this.stuff[id_f].dead = false;
		}
	},

	movePlayer: function(player) {
		var player_slowDown = 2000;
		var now = Date.now();
		var passedTime = (now - player.lastUpdate) * 0.001;
		player.lastUpdate = now;

		var x = 0,
			y = 0;
		for (var cellId in player.cells) {
			var _cell = player.cells[cellId];
			var oldX = _cell.position[X];
			var oldY = _cell.position[Y];

			var target = {
				x: player.position[X] - _cell.position[X] + player.target[X],
				y: player.position[Y] - _cell.position[Y] + player.target[Y]
			}

			// Move cell
			if (_cell.divideSpeed == 0) {
				_cell.angle = Math.atan2(target.y, target.x);
			}

			var speed = _cell.speed + _cell.divideSpeed;
			var deltaX = speed * passedTime * Math.cos(_cell.angle);
			var deltaY = speed * passedTime * Math.sin(_cell.angle);

			if (_cell.divideSpeed == 0) {
				var dist = Math.sqrt(target.y * target.y + target.x * target.x);
				if (dist < (50 + _cell.size)) {
					deltaX *= dist / (50 + _cell.size);
					deltaY *= dist / (50 + _cell.size);
				}
			}

			_cell.position[X] += deltaX;
			_cell.position[Y] += deltaY;


			if (_cell.divideSpeed > 0) {
				_cell.divideSpeed -= player_slowDown * passedTime;
				if (_cell.divideSpeed < 0) {
					_cell.divideSpeed = 0;
				}
			}

			// Check cells collision
			for (var _cellId in player.cells) {
				if(_cellId != cellId) {
					var _cell2 = player.cells[_cellId];
					var distance = distanceToTarget(_cell, _cell2);
					var radiusTotal = _cell.size + _cell2.size;
					if(distance < radiusTotal && _cell2.divideSpeed <= 0) {
						if (_cell2.timeToCollapse > now) {
							var angle = _cell.divideSpeed == 0 ? Math.atan2(_cell2.position[Y] - oldY, _cell2.position[X] - oldX) : Math.atan2(_cell2.position[Y] - _cell.position[Y], _cell2.position[X] - _cell.position[X]);
							var mult = Math.sqrt(_cell2.mass / _cell.mass) / 2;
							var outward = (radiusTotal - distance) * mult;
							outward = Math.min(outward, 40);
							_cell.position[X] -= Math.cos(angle) * outward;
							_cell.position[Y] -= Math.sin(angle) * outward;
						} else
						if(_cell.mass >= _cell2.mass && distance - _cell.size < _cell2.size * 0.7) {
							_cell.mass += _cell2.mass;
							_cell.setNewSize(massToRadius(_cell.mass));

							player.cells[_cellId] = null;
							delete player.cells[_cellId];
							if (cellId != 'c0') {
								player.cells['c0'] = player.cells['c1'];
								player.cells['c1'] = null;
								delete player.cells['c1'];
							}
						}
					}
				}
			}

			var borderCalc = _cell.size / 3;
			if (_cell.position[X] > this.roomWidth - borderCalc) {
				_cell.position[X] = this.roomWidth - borderCalc;
			}
			if (_cell.position[Y] > this.roomHeight - borderCalc) {
				_cell.position[Y] = this.roomHeight - borderCalc;
			}
			if (_cell.position[X] < borderCalc) {
				_cell.position[X] = borderCalc;
			}
			if (_cell.position[Y] < borderCalc) {
				_cell.position[Y] = borderCalc;
			}
			x += _cell.position[X];
			y += _cell.position[Y];
		}
		var len = 0;
		for (var cellId in player.cells) len ++;
		player.position[X] = x / len;
		player.position[Y] = y / len;
	},

	splitQuestPlayer: function() {
		if (!this.questAllowSplit) {
			return;
		}
		var len = 0;
		for (var cellId in this.player.cells) len ++;
		if (len > 1) return;

		for (var id_c in this.player.cells) {
			var _cell = this.player.cells[id_c];
			_cell.mass = _cell.mass / 2;
			_cell.setNewSize(massToRadius(_cell.mass));

			var x = this.player.position[X] - _cell.position[X] + this.player.target[X];
			var y = this.player.position[Y] - _cell.position[Y] + this.player.target[Y];

			var angle = Math.atan2(y, x);
			this.players['p0'].cells['c1'] = newGlSimpleObject({id: 'c0', size: _cell.newSize});
			this.players['p0'].cells['c1'].position = [_cell.position[X], _cell.position[Y], 0];
			this.players['p0'].cells['c1'].divideSpeed = 2000;
			this.players['p0'].cells['c1'].speed = 600;
			this.players['p0'].cells['c1'].mass = _cell.mass;
			this.players['p0'].cells['c1'].angle = angle;
			this.players['p0'].cells['c1'].timeToCollapse = Date.now() + 7000;
			this.players['p0'].cells['c0'].timeToCollapse = Date.now() + 7000;
		}
		this.incQuestProgress(3);
	},

	useQuestWeapon: function(kbrd) {
		if (parseInt($("#taskBar .currentStep").html()) != 3) return;
		if (this.playerMana == 0) {
			Hints.text('noElixir');
			return;
		}

		this.playerMana --;
		Elixir.changeTo(this.playerMana);
		WeaponBar.useWeapon(2, 0);
		
		StatAnalytics.send(StatAnalytics.QuestStep3, kbrd ? 1 : 0);
		
		var idx = "w1";
		var owner = "p0";
		var item = {
			owner: owner,
			w_id: 2,
			x: 0,
			y: 0,
			liveTime: 1000
		}
		var _w = this.getWeaponById(item.w_id);
		this.weapons[idx] = this.createWeapon(item);
		this.weapons[idx].owner = this.players[owner];
		if (typeof this.weapons[idx].owner != 'undefined') {
			if (_w.action_use_for_owner || _w.action_type == weapon_action_types.radial) {
				this.players[owner].weapons[idx] = idx;
			}
		}
		this.weapons[idx].lastVisible = Date.now() + item.liveTime;
		this.weapons[idx].dead = false;
		if (this.weapons[idx].weapon.move_sound != '') {
			playSound('sfx', this.weapons[idx].weapon.move_sound);
		}
	},
	
	roomManager: function(cmd, args){
		switch (cmd){
			case "init":
				this.roomMgrTick = null;
				this.roomState = args[0];
				this.stateTimer = args[1];
				this.roomCondition = args[2];
				if (this.roomMode == room_modes.arena || game.roomMode == room_modes.boss) {
					$(".gameInfoBlock").removeClass("off");
					if (this.roomState == room_states.init) {
						$("#gameBody").addClass("waitingForPlayers");
						if (isMobileApp) {
							mobileButtons.showBoostersBtn(true);
							mobileButtons.showJump(false);
						} else {
							$('#buyBoostersButton').removeClass('off');
						}
					} else
					if (this.roomState == room_states.run) {
						$('#gameRules').addClass("off");
						if (isMobileApp) {
							mobileButtons.showBoostersBtn(false);
							mobileButtons.showControllers(true);
							mobileButtons.showJump(true);
						} else {
							$('#buyBoostersButton').addClass('off');
						}
						WND_pregame_boosters('close');
					}
					this.roomMgrTick = 0;
				}
				if (game.roomMode == room_modes.boss && this.stateTimer > 0) {
					$("#teamLeaderBoard div.miniTimer").countdown(this.stateTimer * 1000, function(event){});
				}
				break;
			case "restate":
				this.roomMgrTick = null;
				if (this.roomState != args[0]){
					this.roomState = args[0];
					if (this.roomState == room_states.run) {
						gameStartCounterChange(Texts.start);
						playSound('sfx', 'start');
						setTimeout(function(){gameStartCounterChange('');}, 2000);
						$(".gameInfoBlock").removeClass('lastSeconds');
						$("#gameBody").removeClass("waitingForPlayers");
						$('#gameRules').addClass("off");
						//if (prf_data.league > 0) {
							Boosters.show();
						//}
						if (isMobileApp) {
							mobileButtons.showBoostersBtn(false);
							mobileButtons.showControllers(true);
							mobileButtons.showJump(true);
						} else {
							$('#buyBoostersButton').addClass('off');
						}
						WND_pregame_boosters('close');
					}
				}
				this.stateTimer = args[1];
				this.roomCondition = args[2];
				if (this.roomMode == room_modes.arena || game.roomMode == room_modes.boss) this.roomMgrTick = 0;
				if (game.roomMode == room_modes.boss && this.stateTimer > 0 && this.roomState == room_states.run) {
					$("#teamLeaderBoard div.miniTimer").countdown(this.stateTimer * 1000, function(event){});
				}
				break;
			case "update":
				if (this.roomMgrTick != null){
					this.roomMgrTick += args;
					var _upd = 0;
					if (this.stateTimer >= 0) {
						this.stateTimer -= args;
						if (this.stateTimer <= 0) {
							this.stateTimer = 0;
							_upd = 1;
						}
					}else{
						_upd = 2;
					}
					if (_upd){
						this.roomMgrTick = null;
					}else if (this.roomMgrTick >= 1){
						this.roomMgrTick = 0;
						_upd = 3;
					}
					if (_upd > 0){
						if (this.roomState == room_states.init){
							if (this.stateTimer >= 0 && this.roomCondition > 0) {
								//$(".gameInfoBlock").html(Math.round(this.stateTimer));
								if (Math.round(this.stateTimer) <= 3) {
									playSound('sfx', 'countdown');
									gameStartCounterChange(Math.round(this.stateTimer));
								}
							}else{
								$(".gameInfoBlock").html('Ожидание игроков, игра скоро начнётся');
							}
						}else
						if (this.roomState == room_states.run){
							if (_upd != 2){
								if (!$(".gameInfoBlock div.timerContainer").length) {
									$(".gameInfoBlock").html('<div class="timer timerContainer" style="margin: 0 auto;"><span class="timerIco"><img src="/img/icons/timer.png" alt=""></span> <span id="text" class="'+ (this.stateTimer < 5 ? 'lastSeconds' : '') +'">'+ secToTime(Math.round(this.stateTimer)) +'</span></div>');
								}
								$(".gameInfoBlock #text").html(secToTime(Math.round(this.stateTimer)));
								if (this.stateTimer < 10) {
									playSound('sfx', 'countdown');
									$(".gameInfoBlock").addClass('lastSeconds');
								}
							}
						}else{
							$(".gameInfoBlock").addClass('off');
							$(".gameInfoBlock").removeClass('lastSeconds');
						}
						//console.log(this.roomState +':'+ _upd +':'+ this.stateTimer);
					}
				}
				break;	
		}
	},

	update: function() {
		this.updateStep ++;
		if (this.updateStep > 20) this.updateStep = 0;
		var now = Date.now();
		var passedRaw = (now - this.lastUpdate) * 0.001;
		var passedTime = Math.min(0.25, passedRaw);
		this.lastUpdate = now;
		
		if (passedRaw > 0) this.roomManager("update", passedRaw);

		camera.update();

		this.damage_line.update();
		this.damage_ring.update();
		//if (this.team_stroke != null) {
		//	this.team_stroke.update();
		//}

		if (this.questMode) {
			//if (!this.questAllowSplit && this.playerMana >= 1 && this.questArrowTimer <= now) {
				//Arrows.runTemplate("questStep3");
				//this.questArrowTimer = now + 5000;
			// }
			this.movePlayer(this.player);
			for (var id_p in this.players) {
				var player = this.players[id_p];
				if (player != this.player && typeof this.playersInfo[id_p].smileTime != 'undefined' && this.playersInfo[id_p].smileTime > 0 && this.playersInfo[id_p].smileTime <= now) {
					player.emotion_id = this.playersInfo[id_p].smileId;
					this.playersInfo[id_p].smileTime = 0;//now + 5000;
					this.playersInfo[id_p].smileRemove = now + 2000;
				} else
				if (player != this.player && typeof this.playersInfo[id_p].smileRemove != 'undefined' && this.playersInfo[id_p].smileRemove > 0 && this.playersInfo[id_p].smileRemove <= now) {
					player.emotion_id = 0;
				} // smileRemove
				for (var id_c in player.cells) {
					var _cell = player.cells[id_c];
					if (_cell.newSize == 0 && _cell.size < 20) {
						if (player == this.player) {
							_cell.size = 0;
							_cell.setNewSize(massToRadius(_cell.mass));
							_cell.target = null;
							_cell.position = [0, 800, 0];
						} else {
							this.players[id_p] = null;
							delete this.players[id_p];
						}
					}
				}
			}

			for (var id_p in this.players) {
				var player = this.players[id_p];
				if (player != this.player && typeof player.allowEat != 'undefined' && player.allowEat) {
					var cell = this.players[id_p].cells['c0'];
					if (cell.newSize > 0) {
						for (var id_c in this.player.cells) {
							var _cell = this.player.cells[id_c];
							var dx = cell.position[X] - _cell.position[X];
							var dy = cell.position[Y] - _cell.position[Y];
							var distance = Math.sqrt(dx * dx + dy * dy);
							if (distance < (cell.size + _cell.size) * 0.8) {
								if (cell.newSize < _cell.newSize * 0.9) {
									_cell.mass += cell.mass;
									_cell.setNewSize(massToRadius(_cell.mass));
									cell.setNewSize(0);
									cell.target = _cell.position;
									playSound('sfx', 'ball_eat');
									this.incQuestProgress(1);
									this.createEat({id_p: 'p0', id_c: 'c0', value: cell.mass});
								} else
								if (cell.newSize  * 0.9 > _cell.newSize) {
									_cell.setNewSize(0);
									_cell.target = cell.position;
								}
							}
						}
					}
				}
			}
			camera.target = null;
			camera.setTargetPosition([this.player.position[X], this.player.position[Y], 3]);
		}

		for (var id_p in this.players) {
			if (this.players[id_p].dead && Object.keys(this.players[id_p].cells).length == 0) {
				this.players[id_p] = null;
				delete this.players[id_p];
			} else {
				if (typeof this.playersInfo[id_p] == 'undefined' || typeof this.playersInfo[id_p].mesh == 'undefined') continue;

				if (this.players[id_p].lastHideUpdate >= now && !this.playersInfo[id_p].mesh.allowDistord) {
					if (this.playersInfo[id_p].mesh.alpha > 0.8) {
						this.playersInfo[id_p].mesh.newAlpha = 0.2;
					} else
					if (this.playersInfo[id_p].mesh.alpha < 0.3) {
						this.playersInfo[id_p].mesh.newAlpha = 1;
					}
				} else
				if (this.playersInfo[id_p].mesh.newAlpha < 1 && this.players[id_p].lastHideUpdate < now) {
					if (this.playersInfo[id_p].mesh.newAlpha < 1 && this.playersInfo[id_p].mesh.allowDistord) {
						playSound('sfx', 'invisible_finish', calcSoundPan(this.players[id_p].mainCell.drawPosition));
					}
					this.playersInfo[id_p].mesh.newAlpha = 1;
				}

				this.playersInfo[id_p].mesh.update();

				for (var id_c in this.players[id_p].cells) {
					if (this.players[id_p].cells[id_c].dead && this.players[id_p].cells[id_c].size < 1) {
						this.players[id_p].cells[id_c] = null;
						delete this.players[id_p].cells[id_c];
					}else{
						var cell = this.players[id_p].cells[id_c];
						cell.update();
						if (this.roomState == room_states.run){
							if (!this.questMode && this.updateStep == 5 || (this.questMode && this.players[id_p] == this.player)) {
								var food = this.foodTree.get(cell.position[X] - cell.size, cell.position[Y] - cell.size, cell.position[X] + cell.size, cell.position[Y] + cell.size);
								for (var i = 0; i < food.length; i++) {
									if (typeof this.food[food[i]] != 'undefined' && typeof this.food[food[i]].moveTarget == 'undefined' && this.food[food[i]].parentId != cell.id && canEatFood(cell, this.food[food[i]]) && !this.food[food[i]].dead) {
										this.foodTree.remove(this.food[food[i]].position[X], this.food[food[i]].position[Y], food[i]);
										this.food[food[i]].setNewSize(0);
										this.food[food[i]].size /= 2;
										this.food[food[i]].target = cell.position;
										this.food[food[i]].dead = true;
										if (!this.loading && this.players[id_p] == this.player){
											if (now - this.players[id_p].foodSoundTime >= 300) {
												playSound('sfx', this.food[food[i]].group < 3 ? 'food_eat' : 'mass_eat', calcSoundPan(this.food[food[i]].drawPosition));
												this.players[id_p].foodSoundTime = now;
											}
											if (this.questMode && this.food[food[i]].group < 3) {
												this.players[id_p].cells[id_c].mass += this.food[food[i]].mass;
												this.players[id_p].cells[id_c].setNewSize(massToRadius(this.players[id_p].cells[id_c].mass));
												this.incQuestProgress(0);
											}
											if ((this.food[food[i]].group > 2) || (this.players[id_p].cells[id_c].newSize > this.players[id_p].cells[id_c].sizeAnim.startSize)) {
												this.createEat({id_p: id_p, id_c: id_c, value: this.food[food[i]].mass * this.playerBufs.food_mass_koef + this.playerBufs.food_mass});
											}
										}
									}
								}
							}

							// if (this.updateStep == 15) {
								for (var id_e in this.stuff) {
									if (typeof this.stuff[id_e].moveTarget == 'undefined' && canEatFood(cell, this.stuff[id_e]) && !this.stuff[id_e].dead) {
										/*if (!this.questMode && !this.playersInfo[cell.playerId].bst && this.stuff[id_e].stuffType == stuff_types.booster) {
											if (this.limitHints.subscr.count > 0 && now - this.limitHints.subscr.lastTime >= 5000 && this.players[id_p] == this.player) {
												Hints.text('noSubscribtion');
												this.limitHints.subscr.count --;
												this.limitHints.subscr.lastTime = now;
											}
											continue;
										} else
										if (this.stuff[id_e].stuffType == stuff_types.ruby && this.playerLimits.ruby) {
											if (this.limitHints.ruby.count > 0 && now - this.limitHints.ruby.lastTime >= 5000) {
												Hints.text(subscriptions_data.indexOf('3') == -1 ? 'noSubscribtion' : 'rubyLimit');
												this.limitHints.ruby.count --;
												this.limitHints.ruby.lastTime = now;
											}
											continue;
										}*/
										this.stuff[id_e].setNewSize(0);
										this.stuff[id_e].size *= 0.4;
										this.stuff[id_e].target = cell.position;
										this.stuff[id_e].dead = true;
										if (!this.loading && this.players[id_p] == this.player) {
											switch (this.stuff[id_e].stuffType) {
												case stuff_types.coin:
													if (!this.playerLimits.coins) {
														playSound('sfx', 'take_coin', calcSoundPan(this.stuff[id_e].drawPosition));
														animEvents('coinCollect', {x: cell.drawPosition[X], y: cell.drawPosition[Y], radius: cell.drawSize[Y]});
													} else
													if (this.limitHints.coins.count > 0 && now - this.limitHints.coins.lastTime >= 5000) {
														Hints.text('coinsLimit');
														this.limitHints.coins.count --;
														this.limitHints.coins.lastTime = now;
													}
													break;
												case stuff_types.ruby:
													if (!this.playerLimits.ruby) {
														playSound('sfx', 'crystals_buy', calcSoundPan(this.stuff[id_e].drawPosition));
														animEvents('rubyCollect', {x: cell.drawPosition[X], y: cell.drawPosition[Y], radius: cell.drawSize[Y]});
													} else
													if (this.limitHints.ruby.count > 0 && now - this.limitHints.ruby.lastTime >= 5000) {
														//Hints.text(subscriptions_data.indexOf('3') == -1 ? 'noSubscribtion' : 'rubyLimit');
														Hints.text('rubyLimit');
														this.limitHints.ruby.count --;
														this.limitHints.ruby.lastTime = now;
													}
													break;
												case stuff_types.elixir:
													if (this.questMode && !this.loading && this.players[id_p] == this.player) {
														this.playerMana ++;
														this.player.elixir ++;
														if (this.playerMana > this.playersInfo['p0'].elixirMax) {
															this.playerMana = this.playersInfo['p0'].elixirMax;
														} else {
															Elixir.changeTo(this.playerMana);
															playSound('sfx', 'take_elixir', calcSoundPan(this.stuff[id_e].drawPosition));
														}
														WeaponBar.updateElixirStates(this.playerMana);
														// if (this.playerMana == 1) {
															// Arrows.runTemplate("questStep3");
															// this.questArrowTimer = now + 5000;
														// }
														setTimeout(function(){
															game.addQuestElixir();
														}, 5000);
													}
													break;
												case stuff_types.std_key:
													if (!this.playerLimits.std_keys) {
														animEvents('keyCollect', {x: cell.drawPosition[X], y: cell.drawPosition[Y], radius: cell.drawSize[Y]});
														playSound('sfx', 'take_std_key', calcSoundPan(this.stuff[id_e].drawPosition));
													} else
													if (this.limitHints.std_keys.count > 0 && now - this.limitHints.std_keys.lastTime >= 5000) {
														Hints.text('stdKeysLimit');
														this.limitHints.std_keys.count --;
														this.limitHints.std_keys.lastTime = now;
													}
													break;
											}
										}
									}
								}
							// }
						}
						cell.foodEatDistance = 0;
					}
				}
				if (this.players[id_p].emotion_id > 0 && this.players[id_p].emotion == null) {
					this.players[id_p].emotion = this.createEmotion(this.players[id_p].emotion_id, id_p);
				} else
				if (this.players[id_p].emotion_id > 0 && this.players[id_p].emotion != null && this.players[id_p].emotion_id != this.players[id_p].emotion.id) {
					this.players[id_p].emotion = null;
					this.players[id_p].emotion = this.createEmotion(this.players[id_p].emotion_id, id_p);
				} else
				if (this.players[id_p].emotion != null && (this.players[id_p].emotion_id == 0 || this.players[id_p].emotion.time < now)) {
					this.players[id_p].emotion_id = 0;
					this.players[id_p].emotion = null;
				}
				if (this.players[id_p].emotion != null) {
					this.players[id_p].emotion.mesh.update();
				}
			}
		}

		for (var id_w in this.aWeapons) {
			if (this.aWeapons[id_w].dead) {
				this.aWeapons[id_w].mesh.freeBuffers();
				this.aWeapons[id_w] = {};
				this.aWeapons[id_w] = null;
				delete this.aWeapons[id_w];
			} else {
				this.aWeapons[id_w].mesh.update();
				this.aWeapons[id_w].timer.update();
				this.aWeapons[id_w].dead = this.aWeapons[id_w].timer.dead;
			}
		}

		for (id_w in this.rpWeapons) {
			if (typeof this.rpWeapons[id_w].mesh != 'undefined' && this.rpWeapons[id_w].lastVisible < now){
				if (this.rpWeapons[id_w].mesh != null) {
					this.rpWeapons[id_w].mesh.freeBuffers();
					this.rpWeapons[id_w] = {};
					this.rpWeapons[id_w] = null;
				}
				delete this.rpWeapons[id_w];
			}
		}

		for (var id_w in this.weapons) {
			if (this.weapons[id_w].lastVisible < now) {
				if (!this.weapons[id_w].weapon.action_holded && this.weapons[id_w].weapon.collision_effect_id > 0) {
					var createEffect = true;

					var cell = null;
					var texture = this.weapons[id_w].weapon.collision_effect_id;
					// if (this.weapons[id_w].weapon.collision_effect_hold) {
						for (var id_p in this.players) {
							for (var id_c in this.players[id_p].cells) {
								var dist = distanceToTarget(this.weapons[id_w].mesh, this.players[id_p].cells[id_c]);
								if (dist < this.players[id_p].cells[id_c].size + this.weapons[id_w].mesh.size) {
									cell = this.players[id_p].cells[id_c];
									break;
								}
							}
						}
					// }

					var angle = this.weapons[id_w].mesh.angle[Z];
					if (cell == null) {
						if (this.weapons[id_w].weapon.miss_effect_id > 0) {
							texture = this.weapons[id_w].weapon.miss_effect_id;
						} else {
							createEffect = false;
						}
					} else
					if (!this.weapons[id_w].weapon.collision_effect_hold) {
						if (texture == 14 || texture == 15 || texture == 16) {
							angle += Math.PI / 2;
						}
						cell = null;
					}

					if (createEffect) {
						var data = {
							id: null,
							x: cell == null ? this.weapons[id_w].mesh.position[X] : this.weapons[id_w].mesh.position[X] - cell.position[X],
							y: cell == null ? this.weapons[id_w].mesh.position[Y] : this.weapons[id_w].mesh.position[Y] - cell.position[Y],
							size: this.weapons[id_w].mesh.size,
							texture_pack: 'weapons_col',
							texture: texture,
							owner: null,
							holdOn: cell,
							dieOnAnimationEnd: true,
							angle: angle,
							weapon: this.weapons[id_w].weapon
						}
						this.createEffect(data);
						// console.log(data);
					}
				}
				if (this.weapons[id_w].radial) {
					this.weapons[id_w].mesh.newSizeKoef = 0;
				} else {
					this.weapons[id_w].mesh.sizeKoef = 0;
					this.weapons[id_w].mesh.newSizeKoef = 0;
				}
			}

			// if (typeof this.weapons[id_w].owner != 'undefined') {
				// if (this.weapons[id_w].mesh.angleSpeed[Z] == null && now - this.weapons[id_w].createTime <= 300) {
					// this.weapons[id_w].mesh.angle[Z] = -getWeaponAngle(this.weapons[id_w].owner.mainCell, this.weapons[id_w].mesh);
				// }
			// }

			if (this.weapons[id_w].mesh.sizeKoef < 0.2 || this.weapons[id_w].mesh.dead) {
				if (typeof this.weapons[id_w].owner != 'undefined') {
					this.weapons[id_w].owner.weapons[id_w] = null;
					delete this.weapons[id_w].owner.weapons[id_w];
				}
				this.weapons[id_w].mesh.freeBuffers();
				if (this.weapons[id_w].mesh_acc != null) {
					this.weapons[id_w].mesh_acc.freeBuffers();
				}
				if (this.weapons[id_w].mesh_act != null) {
					this.weapons[id_w].mesh_act.freeBuffers();
				}
				this.weapons[id_w].mesh.destroy();
				this.weapons[id_w] = null;
				delete this.weapons[id_w];
			} else {
				this.weapons[id_w].mesh.update();
				if (this.weapons[id_w].mesh_acc != null) {
					this.weapons[id_w].mesh_acc.update();
				}
				if (this.weapons[id_w].mesh_act != null && this.weapons[id_w].drawAct) {
					if (Math.round(this.weapons[id_w].mesh_act.frame) < this.weapons[id_w].mesh_act.framesCount) {
						this.weapons[id_w].mesh_act.update();
					} else {
						this.weapons[id_w].drawAct = false;
					}
				}
				if (this.weapons[id_w].weapon.action_holded && typeof this.weapons[id_w].owner != 'undefined') {
					if (this.weapons[id_w].weapon.action_type != weapon_action_types.radial && !this.weapons[id_w].weapon.action_use_for_owner) {
						this.weapons[id_w].mesh.angle[Z] = -getWeaponAngle(this.weapons[id_w].owner.mainCell, this.weapons[id_w].mesh);
					}
				}
				if (this.questMode) {
					var range = this.weapons[id_w].weapon.action_range;
					for (var id_cl in this.weapons[id_w].owner.cells) {
						if (this.weapons[id_w].weapon.action_range_type == 1) {
							var wSize = this.weapons[id_w].owner.cells[id_cl].size * (1 + range * 0.01);
						} else {
							var wSize = this.weapons[id_w].owner.cells[id_cl].size + range;
						}
						for (var id_p in this.players) {
							if (this.players[id_p] != this.weapons[id_w].owner) {
								for (var id_c in this.player.cells) {
									if (distanceToTargetP(this.weapons[id_w].owner.cells[id_cl].position, this.players[id_p].cells[id_c].position) < wSize + this.players[id_p].cells[id_c].size) {
										var id = id_p + id_c;
										var texture = 2;

										var found = false;
										for (var i = 0; i < this.effects.length; i++) {
											if (this.effects[i].id == id +"_"+ texture) {
												this.effects[i].lastVisible = Date.now();
												found = true;
												break;
											}
										}

										if (!found) {
											var data = {
												id: id +"_"+ texture,
												x: 0,
												y: 0,
												size: this.players[id_p].cells[id_c].size,
												texture_pack: 'effects',
												texture: texture,
												owner: this.players[id_p].cells[id_c],
												holdOn: null,
												dieOnAnimationEnd: true,
												angle: 0
											}
											this.createEffect(data);
											for (var i = 0; i < 10; i++) {
												idx = "m"+ i;
												var item = {
													group: 10,
													x: this.players[id_p].cells[id_c].position[X],
													y: this.players[id_p].cells[id_c].position[Y],
													mass: 50
												}
												this.food[idx] = this.createFood(item);
												this.food[idx].speed = Math.random() * 400 + 1800;
												this.food[idx].slowDown = 2500;
												this.food[idx].angle[Z] = Math.random() * Math.PI - Math.PI;
												this.food[idx].lastVisible = now;
												this.food[idx].dead = false;
												this.players[id_p].cells[id_c].mass -= item.mass;
												this.players[id_p].cells[id_c].setNewSize(massToRadius(this.players[id_p].cells[id_c].mass));
											}
											this.incQuestProgress(2);
										}
									}
								}
							}
						}
					}
				}
				var _w = this.weapons[id_w].weapon;
				if (now - this.weapons[id_w].lastCollision >= (this.weapons[id_w].weapon.collision_effect_hold ? 500 : (this.weapons[id_w].weapon.id == 4 ? 200 : 500))) {
					if (this.weapons[id_w].weapon.action_holded && !this.weapons[id_w].weapon.action_use_for_owner) {
						if (this.weapons[id_w].weapon.collision_effect_id > 0) {
							// Linear
							if (this.weapons[id_w].weapon.action_type == weapon_action_types.linear) {
								var dst = [0.75, 0.95, 0.4];
								for (var id_p in this.players) {
									if (this.weapons[id_w].owner != this.players[id_p]) {
										var range = _w.action_range;
										for (var id_c in this.players[id_p].cells) {
											for (var i = 0; i < dst.length; i++) {
												if (_w.action_range_type == 1) {
													var dist = range;
												} else {
													var dist = range;
												}
												var _x = this.weapons[id_w].mesh.position[X] + dist * 2 * dst[i] * Math.sin(-this.weapons[id_w].mesh.angle[Z]);
												var _y = this.weapons[id_w].mesh.position[Y] + dist * 2 * dst[i] * Math.cos(-this.weapons[id_w].mesh.angle[Z]);
												if (distanceToTargetP([_x, _y], this.players[id_p].cells[id_c].position) <= this.players[id_p].cells[id_c].size) {
													var allowSound = false;
													if (now - this.weapons[id_w].lastCollisionSound >= 1000) {
														this.weapons[id_w].lastCollisionSound = now;
														allowSound = true;
													}
													var data = {
														id: null,
														x: _x,
														y: _y,
														size: 40,
														texture_pack: 'weapons_col',
														texture: this.weapons[id_w].weapon.collision_effect_id,
														owner: null,
														holdOn: null,
														dieOnAnimationEnd: true,
														angle: 0,
														weapon: allowSound ? this.weapons[id_w].weapon : null
													}
													this.createEffect(data);
													break;
												}
											}
										}
									}
								}
							} else
							// Radial
							if (this.weapons[id_w].weapon.action_type == weapon_action_types.radial) {
								var dst = [0.75, 0.95, 0.4, 1];
								var range = _w.action_range;
								for (var id_cl in this.weapons[id_w].owner.cells) {
									if (_w.action_range_type == 1) {
										var wSize = this.weapons[id_w].owner.cells[id_cl].size * (1 + range * 0.01);
									} else {
										var wSize = this.weapons[id_w].owner.cells[id_cl].size + range;
									}
									for (var id_p in this.players) {
										if (this.weapons[id_w].owner != this.players[id_p]) {
											for (var id_c in this.players[id_p].cells) {
												if (distanceToTargetP(this.weapons[id_w].owner.cells[id_cl].position, this.players[id_p].cells[id_c].position) < wSize + this.players[id_p].cells[id_c].size) {
													var angle = getAngle(this.players[id_p].cells[id_c], this.weapons[id_w].owner.cells[id_cl]);
													for (var i = 0; i < dst.length; i++) {
														var _x = this.weapons[id_w].owner.cells[id_cl].position[X] + Math.sin(angle) * wSize * dst[i];
														var _y = this.weapons[id_w].owner.cells[id_cl].position[Y] + Math.cos(-angle) * wSize * dst[i];
														if (distanceToTargetP([_x, _y], this.players[id_p].cells[id_c].position) <= this.players[id_p].cells[id_c].size) {
															break;
														}
													}
													var allowSound = false;
													if (now - this.weapons[id_w].lastCollisionSound >= 1000) {
														this.weapons[id_w].lastCollisionSound = now;
														allowSound = true;
													}
													var data = {
														id: null,
														x: this.weapons[id_w].weapon.collision_effect_hold ? _x - this.players[id_p].cells[id_c].position[X] : _x,
														y: this.weapons[id_w].weapon.collision_effect_hold ? _y - this.players[id_p].cells[id_c].position[Y] : _y,
														size: 40,
														texture_pack: 'weapons_col',
														texture: this.weapons[id_w].weapon.collision_effect_id,
														owner: null,
														holdOn: this.weapons[id_w].weapon.collision_effect_hold ? this.players[id_p].cells[id_c] : null,
														dieOnAnimationEnd: true,
														angle: this.weapons[id_w].weapon.collision_effect_hold ? -getWeaponAngle(this.weapons[id_w].owner.cells[id_cl], this.players[id_p].cells[id_c]) : 0,
														weapon: allowSound ? this.weapons[id_w].weapon : null
													}
													this.createEffect(data);
												}
											}
										}
									}
								}
							}
						}
					}
					this.weapons[id_w].lastCollision = now;
				}
				// Magnet
				// if (_w.id == 7) {
					// var range = _w.action_range;
					// for (var id_cl in this.weapons[id_w].owner.cells) {
						// if (_w.action_range_type == 1) {
							// var dist = range;
						// } else {
							// var dist = this.weapons[id_w].owner.cells[id_cl].size * 0.01 * range;
						// }
						// this.weapons[id_w].owner.cells[id_cl].foodEatDistance = dist;
					// }
				// }
			}
		}

		for (var i = this.effects.length - 1; i > -1; i--) {
			this.effects[i].update();
			if (this.effects[i].dead || (!this.effects[i].dieOnAnimationEnd && this.effects[i].lastVisible < now)) {
				if (this.effects[i].sound != '' && this.effects[i].soundRepeat == 2) {
					stopSound('sfx', this.effects[i].sound);
				}
				this.effects[i].freeBuffers();
				this.effects.splice(i, 1);
			}
		}

		for (var i = this.explodes.length - 1; i> -1; i--) {
			this.explodes[i].update();
			if (this.explodes[i].dead) {
				this.explodes[i].freeBuffers();
				this.explodes.splice(i, 1);
			}
		}

		if (this.updateStep == 0) {
			for (var id_p in this.playersInfo) {
				if (this.playersInfo[id_p].removeTime > 0 && this.playersInfo[id_p].removeTime <= now) {
					this.playersInfo[id_p].mesh.freeBuffers();
					if (this.playersInfo[id_p].mesh_nick != null) {
						freeTextLabel(this.playersInfo[id_p].mesh_nick);
					}
					if (this.playersInfo[id_p].mesh_clan != null) {
						freeTextLabel(this.playersInfo[id_p].mesh_clan);
					}
					this.playersInfo[id_p] = null;
					delete this.playersInfo[id_p];
				}
			}
		}

		// if (!this.gameHiSpeedMode && (this.updateStep == 5 || this.updateStep == 10 || this.updateStep == 15 || this.updateStep == 20)) {
		if (!this.gameHiSpeedMode && (this.updateStep % 2)) {
			for (var id_f in this.food) {
				if (this.food[id_f].dead && (this.food[id_f].size < 1 || this.food[id_f].alpha < 0.2)) {
					this.food[id_f].freeBuffers();
					this.food[id_f] = null;
					delete this.food[id_f];
				} else {
					var oldX = this.food[id_f].position[X];
					var oldY = this.food[id_f].position[Y];
					this.food[id_f].update();
					if (oldX != this.food[id_f].position[X] || oldY != this.food[id_f].position[Y]) {
						this.foodTree.update(oldX, oldY, this.food[id_f].position[X], this.food[id_f].position[Y], id_f);
					}
					if (this.food[id_f].speed == 0) {
						this.food[id_f].parentId = '';
					}
				}
			}
		}

		for (var i = this.damage.length - 1; i >= 0;  i--) {
			if (now - this.damage[i].createTime > 500) {
				if (this.damage[i].mesh_armor_eff != null) this.damage[i].mesh_armor_eff.newAlpha = 0;				
			}
			if (now - this.damage[i].createTime > 700) {
				this.damage[i].mesh.newAlpha = -3;
				if (this.damage[i].mesh_crit != null) this.damage[i].mesh_crit.newAlpha = -3;
				if (this.damage[i].mesh_shield != null) this.damage[i].mesh_shield.newAlpha = -3;
				if (this.damage[i].mesh_shield_all != null) this.damage[i].mesh_shield_all.newAlpha = -3;
				if (this.damage[i].mesh_attack != null) this.damage[i].mesh_attack.newAlpha = -3;
				if (this.damage[i].mesh_reflect != null) this.damage[i].mesh_reflect.newAlpha = -3;
				if (this.damage[i].mesh_armor != null) this.damage[i].mesh_armor.newAlpha = -3;
			}
			this.damage[i].mesh.update();
			if (this.damage[i].mesh_crit != null) this.damage[i].mesh_crit.update();
			if (this.damage[i].mesh_shield != null) this.damage[i].mesh_shield.update();
			if (this.damage[i].mesh_shield_all != null) this.damage[i].mesh_shield_all.update();
			if (this.damage[i].mesh_attack != null) this.damage[i].mesh_attack.update();
			if (this.damage[i].mesh_reflect != null) this.damage[i].mesh_reflect.update();
			if (this.damage[i].mesh_armor != null) this.damage[i].mesh_armor.update();
			if (this.damage[i].mesh_armor_eff != null) this.damage[i].mesh_armor_eff.update();
			if (this.damage[i].mesh.alpha < 0.1) {
				freeTextLabel(this.damage[i].mesh);
				if (this.damage[i].mesh_crit != null) this.damage[i].mesh_crit.freeBuffers();
				if (this.damage[i].mesh_shield != null) this.damage[i].mesh_shield.freeBuffers();
				if (this.damage[i].mesh_shield_all != null) this.damage[i].mesh_shield_all.freeBuffers();
				if (this.damage[i].mesh_attack != null) this.damage[i].mesh_attack.freeBuffers();
				if (this.damage[i].mesh_reflect != null) this.damage[i].mesh_reflect.freeBuffers();
				if (this.damage[i].mesh_armor != null) this.damage[i].mesh_armor.freeBuffers();
				if (this.damage[i].mesh_armor_eff != null) this.damage[i].mesh_armor_eff.freeBuffers();
				this.damage.splice(i, 1);
			}
		}

		for (var i = this.eat.length - 1; i >= 0;  i--) {
			if (now - this.eat[i].createTime > this.eat[i].liveTime) {
				this.eat[i].mesh.newAlpha = -2;
			}
			this.eat[i].mesh.update();
			if (this.eat[i].mesh.alpha < 0.1) {
				freeTextLabel(this.eat[i].mesh);
				this.eat.splice(i, 1);
			}
		}
	},

	draw: function() {
		var now = Date.now();
		var passedRaw = (now - this.lastDrawUpdate) * 0.001;
		var passedTime = Math.min(0.25, passedRaw);
		this.lastDrawUpdate = now;

		var idx;

		gl.clearRect(0, 0, gl.canvas.width, gl.canvas.height);
		this.terrain.draw();

		if (this.roomMode == room_modes.ffa || this.roomState != room_states.init) {
				
			if (!game.questMode) {
				this.wall.top.draw();
				this.wall.bottom.draw();
				this.wall.left.draw();
				this.wall.right.draw();
				this.wall.top_left.draw();
				this.wall.top_right.draw();
				this.wall.bottom_left.draw();
				this.wall.bottom_right.draw();
			}

			for (var idx in this.decor) {
				this.decor[idx].update();
				this.decor[idx].scale = this.decor[idx].size;
				this.decor[idx].draw();
			}
		} else {
			for (var idx in this.pre_decor) {
				this.pre_decor[idx].update();
				this.pre_decor[idx].scale = this.pre_decor[idx].size;
				this.pre_decor[idx].draw();
			}
		}

		if (this.gameHiSpeedMode || game.questMode) {
			for (var id_f in this.food) {
				if (this.food[id_f].dead && (this.food[id_f].size < 1 || this.food[id_f].alpha < 0.2)) {
					this.food[id_f].freeBuffers();
					this.food[id_f] = null;
					delete this.food[id_f];
				} else {
					var oldX = this.food[id_f].position[X];
					var oldY = this.food[id_f].position[Y];
					this.food[id_f].update();
					if (oldX != this.food[id_f].position[X] || oldY != this.food[id_f].position[Y]) {
						this.foodTree.update(oldX, oldY, this.food[id_f].position[X], this.food[id_f].position[Y], id_f);
					}
					if (this.food[id_f].speed == 0) {
						this.food[id_f].parentId = '';
					}
					if (typeof this.food[id_f].draw != 'undefined') {
						this.food[id_f].scale = this.food[id_f].size;
						this.food[id_f].draw();
					}
				}
			}
		} else {
			for (var id_f in this.food) {
				if (typeof this.food[id_f].draw != 'undefined') {
					this.food[id_f].scale = this.food[id_f].size;
					if (this.food[id_f].drawId & 1) {
						this.food[id_f].draw();
					}
				}
			}
		}

		for (var id_f in this.stuff) {
			if (this.stuff[id_f].dead && this.stuff[id_f].size < 1) {
				this.stuff[id_f].freeBuffers();
				this.stuff[id_f] = null;
				delete this.stuff[id_f];
			} else {
				this.stuff[id_f].update();
				if (typeof this.stuff[id_f].moveTarget != 'undefined') {
					var dist = distanceToTargetP(this.stuff[id_f].position, this.stuff[id_f].moveTarget);
					this.stuff[id_f].moveSin = Math.abs(dist - (this.stuff[id_f].moveDistance / 2)) / this.stuff[id_f].moveDistance;
					this.stuff[id_f].position[X] += (this.stuff[id_f].moveTarget[X] - this.stuff[id_f].position[X]) * passedTime * 2.5;
					this.stuff[id_f].position[Y] += (this.stuff[id_f].moveTarget[Y] - this.stuff[id_f].position[Y]) * passedTime * 2.5;
					if (dist < 15) {
						this.stuff[id_f].setNewPosition([this.stuff[id_f].moveTarget[X], this.stuff[id_f].moveTarget[Y], 0]);
						this.stuff[id_f].moveTarget = null;
						delete this.stuff[id_f].moveTarget;
					}
				}
				if (typeof this.stuff[id_f].draw != 'undefined') {
					if (typeof this.stuff[id_f].moveTarget != 'undefined') {
						var oldY = this.stuff[id_f].position[Y];
						this.stuff[id_f].position[Y] += Math.cos(this.stuff[id_f].moveSin * 3) * 400 - 30;						
					}
					this.stuff[id_f].scale = this.stuff[id_f].size;
					this.stuff[id_f].draw();
					if (typeof this.stuff[id_f].moveTarget != 'undefined') {
						this.stuff[id_f].position[Y] = oldY;
					}
				}
			}
		}

		for (idx in this.weapons) {
			if (typeof this.weapons[idx].mesh != 'undefined' &&
				!this.weapons[idx].weapon.action_use_for_owner &&
				this.weapons[idx].drawOnGround &&
				this.weapons[idx].weapon.action_type != weapon_action_types.radial) {
				if (this.weapons[idx].drawAct) {
					this.weapons[idx].mesh_act.scale = this.weapons[idx].mesh_act.size;
					this.weapons[idx].mesh_act.draw();
				} else {
					this.weapons[idx].mesh.scale = this.weapons[idx].mesh.size * this.weapons[idx].mesh.initScale;
					this.weapons[idx].mesh.draw();

					// if (is_dev) {
						// var _w = this.weapons[idx].weapon;
						// this.damage_ring.position[X] = this.weapons[idx].mesh.position[X] + Math.cos(this.weapons[idx].mesh.angle[Z] + Math.PI / 2) * (_w.action_range * 2 - _w.size);
						// this.damage_ring.position[Y] = this.weapons[idx].mesh.position[Y] + Math.sin(this.weapons[idx].mesh.angle[Z] + Math.PI / 2) * (_w.action_range * 2 - _w.size);
						// this.damage_ring.scale = _w.size;
						// this.damage_ring.alpha = 1;
						// this.damage_ring.draw();
					// }
				}
			}
		}

		for (idx in this.aWeapons) {
			if (typeof this.aWeapons[idx].owner != 'undefined' && typeof this.aWeapons[idx].owner.cells != 'undefined' && typeof this.aWeapons[idx].mesh != 'undefined') {
				for (id_c in this.aWeapons[idx].owner.cells) {
					var cell = this.aWeapons[idx].owner.cells[id_c];
					// if (cell.main && this.aWeapons[idx].action_type == weapon_action_types.linear && this.aWeapons[idx].type == 0 && !this.aWeapons[idx].action_holded) {
						// var id = this.aWeapons[idx].id;
						// this.damage_line.position[X] = cell.position[X] + Math.sin(-cell.direction) * cell.size * 0.2;
						// this.damage_line.position[Y] = cell.position[Y] + Math.cos(-cell.direction) * cell.size * 0.2;
						// this.damage_line.scale = cell.size * 2;
						// this.damage_line.angle[Z] = cell.direction;
						// this.damage_line.alpha = this.playersInfo[this.aWeapons[idx].owner.id].mesh.alpha * 0.8;
						// this.damage_line.draw();
					// } else
					if (this.aWeapons[idx].action_type == weapon_action_types.radial || (this.aWeapons[idx].id == 11 && cell.main)) {
						this.damage_ring.position[X] = cell.position[X];
						this.damage_ring.position[Y] = cell.position[Y];
						if (this.aWeapons[idx].range != null) {
							if (this.aWeapons[idx].action_range_type == 1) {
								this.damage_ring.scale = cell.size * (1 + this.aWeapons[idx].range * 0.01);
							} else {
								this.damage_ring.scale = cell.size + this.aWeapons[idx].range;
							}
							this.damage_ring.scale *= this.playersInfo[this.aWeapons[idx].owner.id].buff_wd_koef;

							if (this.aWeapons[idx].id == 11) {
								this.damage_ring.scale *= 0.8;
							}
						}
						this.damage_ring.alpha = this.playersInfo[this.aWeapons[idx].owner.id].mesh.alpha * 0.8;
						this.damage_ring.draw();
					}
				}
			}
		}

		for (idx in this.rpWeapons) {
			if (typeof this.rpWeapons[idx].mesh != 'undefined'){
				if (typeof this.players[this.rpWeapons[idx].ownerId] != 'undefined') {
					var cell = this.players[this.rpWeapons[idx].ownerId].mainCell;
					if (typeof cell != 'undefined' && cell != null) {
						this.damage_line.position[X] = cell.position[X] + Math.sin(-cell.direction) * cell.size * 0.2;
						this.damage_line.position[Y] = cell.position[Y] + Math.cos(-cell.direction) * cell.size * 0.2;
						this.damage_line.scale = cell.size * 2;
						this.damage_line.angle[Z] = cell.direction;
						this.damage_line.alpha = this.playersInfo[this.rpWeapons[idx].ownerId].mesh.alpha * 0.8;
						this.damage_line.draw();
					}
				}
			}
		}

		var orderMass = [];
		// Push players
		for (idx in this.players) {
			var player = this.players[idx];
			if (typeof player.cells != 'undefined') {
				for (id_c in player.cells) {
					if (typeof player.cells[id_c] != 'undefined') {
						orderMass.push({
							id: id_c,
							player: idx,
							cell: id_c,
							mass: player.cells[id_c].size,
							y: player.cells[id_c].position[Y]
						});
					}
				}
			}
		}

		orderMass.sort(function(obj1, obj2) {
			//return obj1.mass - obj2.mass;
			var r = Math.round(obj1.mass) - Math.round(obj2.mass);
			return r != 0 ? r : obj1.id > obj2.id;
		});

		for (var i = 0; i < orderMass.length; i++) {
			var item = orderMass[i];
			if (typeof this.playersInfo[item.player] == 'undefined' || typeof this.playersInfo[item.player].mesh == 'undefined') continue;
			var player = this.players[item.player];
			var cell = player.cells[item.cell];
			for (var id_w in player.weapons) {
				var _w = this.weapons[id_w];
				if (typeof _w != 'undefined' && _w.mesh.bringToBack) {
					if (_w.weapon.action_type == weapon_action_types.radial) {
						var range = _w.weapon.action_range;
						var size = 1;
						if (range != null) {
							if (_w.weapon.action_range_type == 1) {
								size = cell.size * (1 + range * 0.01);// * _w.mesh.initScale;
							} else {
								size = (cell.size + range);// * _w.mesh.initScale;
							}
						}
						this.damage_ring.position[X] = cell.position[X];
						this.damage_ring.position[Y] = cell.position[Y];
						this.damage_ring.scale = size * this.playersInfo[item.player].buff_wd_koef;
						this.damage_ring.alpha = this.playersInfo[item.player].mesh.alpha * 0.8;
						this.damage_ring.draw();
					}
				}
			}
		}

		for (var i = 0; i < orderMass.length; i++) {
			var item = orderMass[i];
			if (typeof this.playersInfo[item.player] == 'undefined' || typeof this.playersInfo[item.player].mesh == 'undefined') continue;
			var player = this.players[item.player];
			var cell = player.cells[item.cell];

			for (var id_w in player.weapons) {
				var _w = this.weapons[id_w];
				if (typeof _w != 'undefined' && _w.mesh.bringToBack) {
					_w.mesh.alpha = this.playersInfo[item.player].mesh.alpha;
					if (_w.weapon.action_use_for_owner) {
						if (_w.mesh.fixedSize != null) {
							if (!cell.main) continue;
							_w.mesh.size = _w.mesh.fixedSize * camera.scale;
							_w.mesh.position[X] = 0;
							_w.mesh.position[Y] = cell.size + _w.mesh.size;
						}
						_w.mesh.scale = _w.mesh.size;
						_w.mesh.holdOn = cell;
					} else
					if (_w.weapon.action_type == weapon_action_types.radial) {
						var range = _w.weapon.action_range;
						if (range != null) {
							if (_w.weapon.action_range_type == 1) {
								_w.mesh.size = cell.size * (1 + range * 0.01) * _w.mesh.initScale;
							} else {
								_w.mesh.size = (cell.size + range) * _w.mesh.initScale;
							}
						}
						_w.mesh.position[X] = 0;
						_w.mesh.position[Y] = 0;
						_w.mesh.scale = _w.mesh.size;
						_w.mesh.holdOn = cell;
					} else {
						_w.mesh.owner = cell;
					}
					if (_w.weapon.action_type != weapon_action_types.radial) {
						_w.mesh.angle[Z] = 0;
					}
					_w.mesh.draw();
				}
			}

			if (cell.status == cell_status_types.canEatInJump || cell.status == cell_status_types.canEat) {
				this.aura_canEat.alpha = this.playersInfo[item.player].mesh.alpha * (cell.status == cell_status_types.canEatInJump ? 0.8 : 0.2);
				this.aura_canEat.size = 12 * camera.scale * CAMERA_KOEF;
				this.aura_canEat.scale = cell.size * 1.4;
				this.aura_canEat.position[X] = cell.position[X];
				this.aura_canEat.position[Y] = cell.position[Y];
				this.aura_canEat.draw();
			} else
			if (cell.status == cell_status_types.dangerInJump || cell.status == cell_status_types.danger) {
				this.aura_danger.alpha = this.playersInfo[item.player].mesh.alpha * (cell.status == cell_status_types.dangerInJump ? 0.7 : 0.3);
				this.aura_danger.size = 12 * camera.scale * CAMERA_KOEF;
				this.aura_danger.scale = cell.size * 1.4;
				this.aura_danger.position[X] = cell.position[X];
				this.aura_danger.position[Y] = cell.position[Y];
				this.aura_danger.draw();
			}

			if (!this.questMode && game.roomMode == room_modes.arena) {
				if (typeof this.playersInfo[item.player] != 'undefined' && this.playersInfo[this.player.id] != 'undefined' && this.playersInfo[item.player].team == this.playersInfo[this.player.id].team) {
					if (this.team_stroke != null) {
						this.team_stroke.alpha = this.playersInfo[item.player].mesh.alpha;
						this.team_stroke.scale = cell.size * 1.4;
						this.team_stroke.position[X] = cell.position[X];
						this.team_stroke.position[Y] = cell.position[Y];
						this.team_stroke.draw();
					}
				}
			}

			cell.scale = cell.size;
			this.playersInfo[item.player].mesh.position = cell.position;
			this.playersInfo[item.player].mesh.scale = cell.size;
			this.playersInfo[item.player].mesh.draw();
			cell.onScreenArea = this.playersInfo[item.player].mesh.onScreenArea;
			cell.drawPosition[X] = this.playersInfo[item.player].mesh.drawPosition[X];
			cell.drawPosition[Y] = this.playersInfo[item.player].mesh.drawPosition[Y];
			cell.drawSize[X] = this.playersInfo[item.player].mesh.drawSize[X];
			cell.drawSize[Y] = this.playersInfo[item.player].mesh.drawSize[Y];

			if ((game.roomMode == room_modes.arena || game.roomMode == room_modes.boss) || this.eatedBy != 0){
				if (cell.onScreen()) {
					this.playersInfo[item.player].onScreen = true;
				} else {
					this.playersInfo[item.player].position[X] = cell.position[X];
					this.playersInfo[item.player].position[Y] = cell.position[Y];
				}
				//this.playersInfo[item.player].dead = false;
			}

			for (var _e = 0; _e < this.effects.length; _e++) {
				if (this.effects[_e].holdOn == cell || this.effects[_e].owner == cell) {
					this.effects[_e].alpha = Math.min(this.playersInfo[item.player].mesh.alpha, this.effects[_e].alpha);
					if (this.effects[_e].holdOn != null) {
						this.effects[_e].scale = this.effects[_e].size;
					}

					if (this.effects[_e].fixedSize != null) {
						this.effects[_e].size = this.effects[_e].fixedSize * camera.scale;
						this.effects[_e].position[X] = this.effects[_e].offset[X] + Math.sin(0.8) * (cell.size + this.effects[_e].size);
						this.effects[_e].position[Y] = this.effects[_e].offset[Y] + Math.cos(0.8) * (cell.size + this.effects[_e].size);
						this.effects[_e].scale = this.effects[_e].size;
						this.effects[_e].owner = null;
						this.effects[_e].holdOn = cell;
					}

					this.effects[_e].draw();
				}
			}

			if (player.chatBubbleTime >= now) {
				this.chatBubble.alpha = this.playersInfo[item.player].mesh.alpha;
				this.chatBubble.size = 24.32 * camera.scale * CAMERA_KOEF;
				this.chatBubble.scale = this.chatBubble.size;
				this.chatBubble.position[X] = cell.position[X] + this.chatBubble.offset[X] + Math.sin(1.2) * (cell.size + this.chatBubble.size);
				this.chatBubble.position[Y] = cell.position[Y] + this.chatBubble.offset[Y] + Math.cos(1.2) * (cell.size + this.chatBubble.size);
				this.chatBubble.draw();
			}

			if (player.emotion != null) {
				player.emotion.mesh.alpha = this.playersInfo[item.player].mesh.alpha;
				player.emotion.mesh.size = 24.32 * camera.scale * CAMERA_KOEF;
				player.emotion.mesh.scale = player.emotion.mesh.size;
				player.emotion.mesh.position[X] = cell.position[X] + player.emotion.mesh.offset[X] + Math.sin(0.8) * (cell.size + player.emotion.mesh.size);
				player.emotion.mesh.position[Y] = cell.position[Y] + player.emotion.mesh.offset[Y] + Math.cos(0.8) * (cell.size + player.emotion.mesh.size);
				player.emotion.mesh.draw();
			}

			for (var id_w in player.weapons) {
				var _w = this.weapons[id_w];
				if (typeof _w != 'undefined') {
					if (!_w.mesh.bringToBack) {
						_w.mesh.alpha = this.playersInfo[item.player].mesh.alpha;
						if (_w.weapon.action_use_for_owner) {
							if (_w.mesh.fixedSize != null) {
								if (!cell.main) continue;
								_w.mesh.size = _w.mesh.fixedSize * camera.scale;
								_w.mesh.position[X] = 0;
								_w.mesh.position[Y] = cell.size + _w.mesh.size;
							}
							_w.mesh.scale = _w.mesh.size;
							_w.mesh.holdOn = cell;
						} else
						if (_w.weapon.action_type == weapon_action_types.radial) {
							var range = _w.weapon.action_range;
							if (range != null) {
								if (_w.weapon.action_range_type == 1) {
									_w.mesh.size = cell.size * (1 + range * 0.01) * _w.mesh.initScale;
								} else {
									_w.mesh.size = (cell.size + range) * _w.mesh.initScale;
								}
							}
							_w.mesh.position[X] = 0;
							_w.mesh.position[Y] = 0;
							_w.mesh.scale = _w.mesh.size;
							_w.mesh.holdOn = cell;
						} else {
							_w.mesh.owner = cell;
						}
						_w.mesh.angle[Z] = 0;
						_w.mesh.draw();
					}
					if (_w.mesh_acc != null) {
						_w.mesh_acc.alpha = this.playersInfo[item.player].mesh.alpha;
						if (_w.mesh_acc.fixedSize != null) {
							_w.mesh_acc.size = _w.mesh_acc.fixedSize * camera.scale;
							_w.mesh_acc.position[X] = cell.size * _w.mesh_acc.offset[X];
							_w.mesh_acc.position[Y] = cell.size * _w.mesh_acc.offset[Y] + _w.mesh_acc.size;
						} else {
							_w.mesh_acc.size = cell.size * _w.mesh_acc.initScale;
							_w.mesh_acc.position[X] = cell.size * _w.mesh_acc.offset[X];
							_w.mesh_acc.position[Y] = cell.size * _w.mesh_acc.offset[Y] + _w.mesh_acc.size;
						}
						_w.mesh_acc.scale = _w.mesh_acc.size;
						_w.mesh_acc.holdOn = cell;
						_w.mesh_acc.angle[Z] = 0;
						_w.mesh_acc.draw();
					}
				}
			}

			if (this.playersInfo[item.player].runesData != null && this.playersInfo[item.player].runesData.active && cell.main && this.roomState == room_states.run) {
				for (var r = 0; r < this.playersInfo[item.player].runesData.runes.length; r ++) {
					var rune = this.playersInfo[item.player].runesData.runes[r];

					var createTime = this.playersInfo[item.player].runesData.createTime;
					var runeInterval = this.playersInfo[item.player].runesData.runeInterval;
					var runeTime = this.playersInfo[item.player].runesData.runeTime;
					var cnt = Math.floor((Date.now() - createTime) / runeTime);
					var rNr = Math.floor(r / 3);
					var newTime = createTime + cnt * runeTime;

					if (newTime + runeInterval * rNr > Date.now() - runeInterval) {
						rune.newAlpha = 0;
					} else {
						if (rune.newAlpha == 0) {
							rune.frame = 0;
							rune.newSize = rune.size;
							rune.size = 0;
						}

						rune.newAlpha = 1;
						if (rune.id == 'rune') {
							rune.alpha = 1;
						}
					}

					rune.update();
					if (rune.alpha > 0) {
						rune.alpha = rune.alpha * this.playersInfo[item.player].mesh.alpha;
						if (rune.alpha < 0) rune.alpha = 0;
						rune.scale = rune.size;
						rune.owner = cell;
						rune.draw();
					}
				}
			}

			if (!this.questMode && cell.main && !cell.dead) {
				if (this.playersInfo[item.player].mesh_nick != null) {
					this.playersInfo[item.player].mesh_nick.alpha = this.playersInfo[item.player].mesh.alpha;
					this.playersInfo[item.player].mesh_nick.position[X] = cell.position[X];
					this.playersInfo[item.player].mesh_nick.position[Y] = cell.position[Y] - cell.size - 12 * camera.scale * CAMERA_KOEF;
					this.playersInfo[item.player].mesh_nick.scale = 8 * camera.scale * CAMERA_KOEF;
					this.playersInfo[item.player].mesh_nick.draw();
				}
				if (this.playersInfo[item.player].mesh_clan != null) {
					this.playersInfo[item.player].mesh_clan.alpha = this.playersInfo[item.player].mesh.alpha;
					this.playersInfo[item.player].mesh_clan.position[X] = cell.position[X];
					this.playersInfo[item.player].mesh_clan.position[Y] = cell.position[Y] - cell.size - 28 * camera.scale * CAMERA_KOEF;
					this.playersInfo[item.player].mesh_clan.scale = 6.2 * camera.scale * CAMERA_KOEF;
					this.playersInfo[item.player].mesh_clan.draw();
				}
			}

			if (cell.status == cell_status_types.canEatInJump) {
				this.eatInJump.alpha = this.playersInfo[item.player].mesh.alpha;
				this.eatInJump.size = 12 * camera.scale * CAMERA_KOEF;
				this.eatInJump.scale = this.eatInJump.size;
				this.eatInJump.position[X] = cell.position[X] + this.eatInJump.offset[X] + Math.sin(-2.05) * (cell.size + this.eatInJump.size * 0.4);
				this.eatInJump.position[Y] = cell.position[Y] + this.eatInJump.offset[Y] + Math.cos(-2.05) * (cell.size + this.eatInJump.size * 0.4);
				this.eatInJump.draw();
			}

			if (this.eatedBy == item.player && this.revenge_icon != null && cell.main && !cell.dead) {
				this.revenge_icon.size = 20 * camera.scale * CAMERA_KOEF;
				this.revenge_icon.scale = this.revenge_icon.size;
				this.revenge_icon.position[X] = cell.position[X] + Math.sin(-1.05) * (cell.size + this.revenge_icon.size * 0.4);
				this.revenge_icon.position[Y] = cell.position[Y] + Math.cos(-1.05) * (cell.size + this.revenge_icon.size * 0.4);
				this.revenge_icon.alpha = this.playersInfo[item.player].mesh.alpha;
				this.revenge_icon.angle[Z] = 0;
				this.revenge_icon.draw();
			}

			if (cell.main && this.playersInfo[item.player].armor > 0 && !this.playersInfo[item.player].isBoss) {
				this.armor_icon.alpha = this.playersInfo[item.player].mesh.alpha;
				this.armor_icon.size = Math.max(isMobileApp ? 250 : 150, cell.size * 0.5);
				this.armor_icon.scale = this.armor_icon.size;
				this.armor_icon.position[X] = cell.position[X] + this.armor_icon.offset[X] + Math.sin(2) * (cell.size + this.armor_icon.size * 0.1);
				this.armor_icon.position[Y] = cell.position[Y] + this.armor_icon.offset[Y] + Math.cos(2) * (cell.size + this.armor_icon.size * 0.1);
				this.armor_icon.draw();
				drawCanvasText(gl, this.armor_icon.drawSize[Y] * 0.5, this.playersInfo[item.player].armor, this.armor_icon.drawPosition[X], this.armor_icon.drawPosition[Y] + this.armor_icon.drawSize[Y] * 0.6, 220, this.playersInfo[item.player].mesh.alpha);
			}

			if (cell.main && player == this.player && this.move_arrow != null) {
				var angle = Math.atan2(gameTarget.mouseY - cell.drawPosition[Y], gameTarget.mouseX - cell.drawPosition[X]) + Math.PI * 0.5;
				this.move_arrow.position[X] = cell.position[X] + Math.sin(angle) * cell.size * 1.5;
				this.move_arrow.position[Y] = cell.position[Y] + Math.cos(angle) * cell.size * 1.5;
				this.move_arrow.scale = 9 * camera.scale * CAMERA_KOEF
				this.move_arrow.alpha = 1;
				this.move_arrow.angle[Z] = -angle;
				this.move_arrow.draw();
			}
		}

		for (idx in this.aWeapons) {
			if (typeof this.aWeapons[idx].owner != 'undefined' && typeof this.aWeapons[idx].owner.cells != 'undefined' && typeof this.aWeapons[idx].mesh != 'undefined') {
				for (id_c in this.aWeapons[idx].owner.cells) {
					var cell = this.aWeapons[idx].owner.cells[id_c];
					if (cell.main && !cell.dead) {
						var alpha = typeof this.playersInfo[this.aWeapons[idx].owner.id] != 'undefined' ? this.playersInfo[this.aWeapons[idx].owner.id].mesh.alpha : 1;

						this.aWeapons[idx].mesh.alpha = alpha;
						this.aWeapons[idx].mesh.size = 25 * camera.scale * CAMERA_KOEF;
						this.aWeapons[idx].mesh.scale = this.aWeapons[idx].mesh.size;
						this.aWeapons[idx].mesh.position[X] = cell.position[X] + this.aWeapons[idx].mesh.offset[X] + Math.sin(0) * (cell.size + this.aWeapons[idx].mesh.size);
						this.aWeapons[idx].mesh.position[Y] = cell.position[Y] + this.aWeapons[idx].mesh.offset[Y] + Math.cos(0) * (cell.size + this.aWeapons[idx].mesh.size);

						this.weapon_circle.alpha = alpha;
						this.weapon_circle.scale = this.aWeapons[idx].mesh.scale * 1.3;
						this.weapon_circle.position[X] = this.aWeapons[idx].mesh.position[X];
						this.weapon_circle.position[Y] = this.aWeapons[idx].mesh.position[Y];

						this.aWeapons[idx].timer.alpha = alpha;
						this.aWeapons[idx].timer.scale = this.aWeapons[idx].mesh.size * 0.4;
						this.aWeapons[idx].timer.position[X] = this.aWeapons[idx].mesh.position[X] + this.aWeapons[idx].mesh.size;
						this.aWeapons[idx].timer.position[Y] = this.aWeapons[idx].mesh.position[Y] + this.aWeapons[idx].mesh.size;

						this.weapon_circle.draw();
						this.aWeapons[idx].mesh.draw();
						this.aWeapons[idx].timer.draw();

						if (this.aWeapons[idx].action_type != weapon_action_types.radial) {
							break;
						}
					}
				}
			}
		}

		for (idx in this.rpWeapons) {
			if (typeof this.rpWeapons[idx].mesh != 'undefined'){
				if (typeof this.players[this.rpWeapons[idx].ownerId] != 'undefined') {
					var cell = this.players[this.rpWeapons[idx].ownerId].mainCell;
					if (typeof cell != 'undefined' && cell != null && this.rpWeapons[idx].mesh != null) {
						this.rpWeapons[idx].mesh.position[X] = cell.position[X] + Math.sin(-cell.direction) * cell.size;
						this.rpWeapons[idx].mesh.position[Y] = cell.position[Y] + Math.cos(-cell.direction) * cell.size;
						this.rpWeapons[idx].mesh.scale = 670;
						this.rpWeapons[idx].mesh.angle[Z] = cell.direction;
						this.rpWeapons[idx].mesh.alpha = this.playersInfo[this.rpWeapons[idx].ownerId].mesh.alpha;
						this.rpWeapons[idx].mesh.draw();
					}
				}
			}
		}

		for (idx in this.weapons) {
			if (typeof this.weapons[idx].mesh != 'undefined' &&
				!this.weapons[idx].weapon.action_use_for_owner &&
				!this.weapons[idx].drawOnGround &&
				this.weapons[idx].weapon.action_type != weapon_action_types.radial) {
					if (this.weapons[idx].drawAct) {
						this.weapons[idx].mesh_act.scale = this.weapons[idx].mesh_act.size;
						this.weapons[idx].mesh_act.draw();
					} else {
						this.weapons[idx].mesh.scale = this.weapons[idx].mesh.size * this.weapons[idx].mesh.initScale;
						this.weapons[idx].mesh.draw();

						// if (is_dev) {
							// var _w = this.weapons[idx].weapon;
							// this.damage_ring.position[X] = this.weapons[idx].mesh.position[X] + Math.cos(this.weapons[idx].mesh.angle[Z] + Math.PI / 2) * (_w.action_range * 2.2 - _w.size);
							// this.damage_ring.position[Y] = this.weapons[idx].mesh.position[Y] + Math.sin(this.weapons[idx].mesh.angle[Z] + Math.PI / 2) * (_w.action_range * 2.2 - _w.size);
							// this.damage_ring.scale = _w.hit_size;
							// this.damage_ring.alpha = 1;
							// this.damage_ring.draw();
						// }
					}
			}
		}

		for (var i = 0; i < this.effects.length; i++) {
			if (this.effects[i].holdOn == null && this.effects[i].owner == null) {
				this.effects[i].scale = this.effects[i].size;
				this.effects[i].draw();
			}
		}

		for (var i = 0; i < this.explodes.length; i++) {
			this.explodes[i].scale = this.explodes[i].size;
			this.explodes[i].draw();
		}

		for (var i = 0; i < this.damage.length; i++) {
			var player = this.players[this.damage[i].player_id];
			if (typeof player != 'undefined') {
				var cell = player.cells[this.damage[i].cell_id];
				if (typeof cell != 'undefined' && cell.newSize > 1 && (this.playersInfo[player.id].mesh.alpha >= 0.8 || player == this.player)) {
					this.damage[i].mesh.position[X] = cell.position[X];
					this.damage[i].mesh.position[Y] = cell.position[Y] + cell.size - 20 +  60 * (1 - this.damage[i].mesh.alpha);
					this.damage[i].mesh.scale = this.damage[i].mesh.size * 1.3 * camera.scale * CAMERA_KOEF;
					this.damage[i].mesh.draw();
					var offsetX = this.damage[i].mesh.texture_info.size.w * camera.scale * 0.8;
					if (this.damage[i].mesh_crit != null) {
						this.damage[i].mesh_crit.position[X] = cell.position[X] - offsetX;
						this.damage[i].mesh_crit.position[Y] = cell.position[Y] + cell.size - 20 +  60 * (1 - this.damage[i].mesh.alpha);
						this.damage[i].mesh_crit.scale = this.damage[i].mesh_crit.size * camera.scale * CAMERA_KOEF;
						this.damage[i].mesh_crit.draw();
						offsetX += this.damage[i].mesh_crit.size * camera.scale * CAMERA_KOEF * 2;
					}
					if (this.damage[i].mesh_shield != null) {
						this.damage[i].mesh_shield.position[X] = cell.position[X] - offsetX;
						this.damage[i].mesh_shield.position[Y] = cell.position[Y] + cell.size - 20 +  60 * (1 - this.damage[i].mesh.alpha);
						this.damage[i].mesh_shield.scale = this.damage[i].mesh_shield.size * camera.scale * CAMERA_KOEF * 1.2;
						this.damage[i].mesh_shield.draw();
						offsetX += this.damage[i].mesh_shield.size * camera.scale * CAMERA_KOEF * 2 * 1.2;
					}
					if (this.damage[i].mesh_shield_all != null) {
						this.damage[i].mesh_shield_all.position[X] = cell.position[X] - offsetX;
						this.damage[i].mesh_shield_all.position[Y] = cell.position[Y] + cell.size - 20 +  60 * (1 - this.damage[i].mesh.alpha);
						this.damage[i].mesh_shield_all.scale = this.damage[i].mesh_shield_all.size * camera.scale * CAMERA_KOEF * 1.2;
						this.damage[i].mesh_shield_all.draw();
						offsetX += this.damage[i].mesh_shield_all.size * camera.scale * CAMERA_KOEF * 2 * 1.2;
					}
					if (this.damage[i].mesh_armor != null) {
						this.damage[i].mesh_armor.position[X] = cell.position[X] - offsetX;
						this.damage[i].mesh_armor.position[Y] = cell.position[Y] + cell.size - 20 +  60 * (1 - this.damage[i].mesh.alpha);
						this.damage[i].mesh_armor.scale = this.damage[i].mesh_armor.size * camera.scale * CAMERA_KOEF * 1.2;
						this.damage[i].mesh_armor.draw();
						offsetX += this.damage[i].mesh_armor.size * camera.scale * CAMERA_KOEF * 2 * 1.2;
					}
					if (this.damage[i].mesh_attack != null) {
						this.damage[i].mesh_attack.position[X] = cell.position[X] - offsetX;
						this.damage[i].mesh_attack.position[Y] = cell.position[Y] + cell.size - 20 +  60 * (1 - this.damage[i].mesh.alpha);
						this.damage[i].mesh_attack.scale = this.damage[i].mesh_attack.size * camera.scale * CAMERA_KOEF * 1.2;
						this.damage[i].mesh_attack.draw();
						offsetX += this.damage[i].mesh_attack.size * camera.scale * CAMERA_KOEF * 2 * 1.2;
					}
					if (this.damage[i].mesh_reflect != null) {
						this.damage[i].mesh_reflect.position[X] = cell.position[X] - offsetX;
						this.damage[i].mesh_reflect.position[Y] = cell.position[Y] + cell.size - 20 +  60 * (1 - this.damage[i].mesh.alpha);
						this.damage[i].mesh_reflect.scale = this.damage[i].mesh_reflect.size * camera.scale * CAMERA_KOEF * 1.2;
						this.damage[i].mesh_reflect.draw();
						offsetX += this.damage[i].mesh_reflect.size * camera.scale * CAMERA_KOEF * 2 * 1.2;
					}
					if (this.damage[i].mesh_armor_eff != null) {
						this.damage[i].mesh_armor_eff.position[X] = cell.position[X];
						this.damage[i].mesh_armor_eff.position[Y] = cell.position[Y];
						this.damage[i].mesh_armor_eff.scale = this.damage[i].mesh_armor_eff.size;
						this.damage[i].mesh_armor_eff.draw();
					}
				}
			}
		}

		for (var i = 0; i < this.eat.length; i++) {
			var player = this.players[this.eat[i].player_id];
			if (typeof player != 'undefined') {
				var cell = player.cells[this.eat[i].cell_id];
				if (typeof cell != 'undefined' && cell.newSize > 1) {
					this.eat[i].mesh.position[X] = cell.position[X] + this.eat[i].offset[X];
					this.eat[i].mesh.position[Y] = cell.position[Y] + cell.size - 20 +  60  + this.eat[i].offset[Y];//* (1 - this.eat[i].mesh.alpha) * 2;
					this.eat[i].mesh.scale = this.eat[i].mesh.size * 1.3 * camera.scale * CAMERA_KOEF;
					this.eat[i].mesh.draw();
				}
			}
		}

		if ((game.roomMode == room_modes.arena || game.roomMode == room_modes.boss || (game.roomMode == room_modes.ffa && this.eatedBy != 0))&& this.player != null && typeof this.playersInfo[this.player.id] != 'undefined'){
			for (var idx in this.playersInfo) {
				if (idx != this.player.id && ((this.playersInfo[idx].team > 0 && this.playersInfo[idx].team == this.playersInfo[this.player.id].team) || idx == this.eatedBy || this.playersInfo[idx].isBoss) &&
					this.playersInfo[idx].active && !this.playersInfo[idx].onScreen && !this.playersInfo[idx].dead) {
					if (this.playersInfo[idx].position[X] >= 0 && this.playersInfo[idx].position[X] <= this.roomWidth && this.playersInfo[idx].position[Y] >= 0 && this.playersInfo[idx].position[Y] <= this.roomHeight) {
						var angle = getAngle(this.playersInfo[idx], camera);
						var arr_x = camera.position[X] + Math.sin(angle) * 250 * camera.scale * CAMERA_KOEF;
						var arr_y = camera.position[Y] + Math.cos(angle) * 150 * camera.scale * CAMERA_KOEF;
						var arr_offset_x = 0;
						var arr_offset_y = 0;

						if (this.playersInfo[idx].arrow_nick != null) {
							this.playersInfo[idx].arrow_nick.alpha = 1;
							this.playersInfo[idx].arrow_nick.position[X] = arr_x;
							this.playersInfo[idx].arrow_nick.position[Y] = arr_y;
							this.playersInfo[idx].arrow_nick.scale = 7 * camera.scale * CAMERA_KOEF;
							if (game.roomMode != room_modes.boss) {
								this.playersInfo[idx].arrow_nick.draw();
							}
							arr_offset_x = this.playersInfo[idx].arrow_nick.texture_info.size.w * 1.6;
							arr_offset_y = this.playersInfo[idx].arrow_nick.texture_info.size.h * 1.6;
						}

						if (!this.questMode && game.roomMode == room_modes.arena) {
							if (this.team_arrow != null) {
								this.team_arrow.position[X] = arr_x + (Math.sin(angle) * (arr_offset_x + 100));
								this.team_arrow.position[Y] = arr_y + (Math.cos(angle) * (arr_offset_y + 100));
								this.team_arrow.scale = 9 * camera.scale * CAMERA_KOEF
								this.team_arrow.alpha = 1;
								this.team_arrow.angle[Z] = -angle;
								this.team_arrow.draw();
							}
						}

						if (this.revenge_arrow != null) {
							// var arr_x = camera.position[X] + Math.sin(angle) * 290 * camera.scale * CAMERA_KOEF;
							// var arr_y = camera.position[Y] + Math.cos(angle) * 185 * camera.scale * CAMERA_KOEF;

							if (game.roomMode != room_modes.boss || this.playersInfo[idx].isBoss) {
								this.revenge_arrow.position[X] = arr_x + (Math.sin(angle) * (arr_offset_x + 100));
								this.revenge_arrow.position[Y] = arr_y + (Math.cos(angle) * (arr_offset_y + 100));
								this.revenge_arrow.scale = 20 * camera.scale * CAMERA_KOEF;
								this.revenge_arrow.alpha = 1;
								this.revenge_arrow.angle[Z] = -angle;
								this.revenge_arrow.draw();

								if (this.revenge_icon_sk != null) {
									this.revenge_icon_sk.position[X] = arr_x + (Math.sin(angle) * (arr_offset_x + 100));
									this.revenge_icon_sk.position[Y] = arr_y + (Math.cos(angle) * (arr_offset_y + 100));
									this.revenge_icon_sk.scale = 20 * camera.scale * CAMERA_KOEF;
									this.revenge_icon_sk.alpha = 1;
									this.revenge_icon_sk.angle[Z] = 0;
									this.revenge_icon_sk.draw();
								}
							}
						}
					}
				}
				this.playersInfo[idx].onScreen = false;
			}
		}

		if (gameTarget.mouseInit){
			gameTarget.setTarget(Math.round((gameTarget.mouseX - this.viewportCenterX) * camera.scale * 1.1), Math.round((this.viewportCenterY - gameTarget.mouseY) * camera.scale * 1.1));
		}
	},

	destroy: function() {
		if (this.foodTree != null) {
			this.foodTree.clear();
		}

		if (this.terrain != null){
			this.terrain.freeBuffers();
			this.terrain = null;
		}
		if (this.wall != {}) {
			for (var w in this.wall) {
				this.wall[w].freeBuffers();
				delete(this.wall[w]);
			}
			this.wall = {};
		}

		if (this.move_arrow != null){
			this.move_arrow.freeBuffers();
			this.move_arrow = null;
		}
		if (this.team_arrow != null){
			this.team_arrow.freeBuffers();
			this.team_arrow = null;
		}
		if (this.team_stroke != null){
			this.team_stroke.freeBuffers();
			this.team_stroke = null;
		}

		if (this.revenge_arrow != null){
			this.revenge_arrow.freeBuffers();
			this.revenge_arrow = null;
		}
		if (this.revenge_icon != null){
			this.revenge_icon.freeBuffers();
			this.revenge_icon = null;
		}
		if (this.revenge_icon_sk != null){
			this.revenge_icon_sk.freeBuffers();
			this.revenge_icon_sk = null;
		}

		if (this.weapon_circle != null){
			this.weapon_circle.freeBuffers();
			this.weapon_circle = null;
		}
		if (this.damage_ring != null){
			this.damage_ring.freeBuffers();
			this.damage_ring = null;
		}
		if (this.chatBubble != null){
			this.chatBubble.freeBuffers();
			this.chatBubble = null;
		}
		if (this.eatInJump != null){
			this.eatInJump.freeBuffers();
			this.eatInJump = null;
		}
		if (this.aura_canEat != null){
			this.aura_canEat.freeBuffers();
			this.aura_canEat = null;
		}
		if (this.aura_danger != null){
			this.aura_danger.freeBuffers();
			this.aura_danger = null;
		}
		if (this.armor_icon != null){
			this.armor_icon.freeBuffers();
			this.armor_icon = null;
		}

		for (var idx in this.food) {
			this.food[idx].freeBuffers();
			this.food[idx] = null;
			delete this.food[idx];
		}
		this.food = {};

		for (var idx in this.decor) {
			this.decor[idx].freeBuffers();
			this.decor[idx] = null;
			delete this.decor[idx];
		}
		this.decor = {};

		for (var idx in this.pre_decor) {
			this.pre_decor[idx].freeBuffers();
			this.pre_decor[idx] = null;
			delete this.pre_decor[idx];
		}
		this.pre_decor = {};

		for (var idx in this.stuff) {
			this.stuff[idx].freeBuffers();
			this.stuff[idx] = null;
			delete this.stuff[idx];
		}
		this.stuff = {};

		for (var idx in this.aWeapons) {
			this.aWeapons[idx].mesh.freeBuffers();
			this.aWeapons[idx].timer.freeBuffers();
			this.aWeapons[idx] = null;
			delete this.aWeapons[idx];
		}

		for (var idx in this.weapons) {
			this.weapons[idx].mesh.destroy();
			if (this.weapons[idx].mesh_acc != null) {
				this.weapons[idx].mesh_acc.destroy();
			}
			if (this.weapons[idx].mesh_act != null) {
				this.weapons[idx].mesh_act.destroy();
			}
			this.weapons[idx] = null;
			delete this.weapons[idx];
		}

		for (var i = this.effects.length - 1; i> -1; i--) {
			this.effects[i].destroy();
			this.effects.splice(i, 1);
		}

		for (var i = this.explodes.length - 1; i> -1; i--) {
			this.explodes[i].freeBuffers();
			this.explodes.splice(i, 1);
		}

		for (var idx in this.players) {
			this.players[idx] = null;
			delete this.players[idx];
		}

		for (var id_p in this.playersInfo) {
			this.playersInfo[id_p].mesh.freeBuffers();
			if (this.playersInfo[id_p].mesh_nick != null) {
				freeTextLabel(this.playersInfo[id_p].mesh_nick);
			}
			if (this.playersInfo[id_p].mesh_clan != null) {
				freeTextLabel(this.playersInfo[id_p].mesh_clan);
			}
			if (this.playersInfo[id_p].arrow_nick != null) {
				freeTextLabel(this.playersInfo[id_p].arrow_nick);
			}
			this.playersInfo[id_p] = null;
			delete this.playersInfo[id_p];
		}
		
		for (var id_p in this.hofInfo) {
			this.hofInfo[id_p] = '';
			delete this.hofInfo[id_p];
		}

		for (var i = this.damage.length - 1; i >= 0; i--) {
			freeTextLabel(this.damage[i].mesh);
			if (this.damage[i].mesh_crit != null) this.damage[i].mesh_crit.freeBuffers();
			if (this.damage[i].mesh_shield != null) this.damage[i].mesh_shield.freeBuffers();
			if (this.damage[i].mesh_shield_all != null) this.damage[i].mesh_shield_all.freeBuffers();
			if (this.damage[i].mesh_attack != null) this.damage[i].mesh_attack.freeBuffers();
			if (this.damage[i].mesh_reflect != null) this.damage[i].mesh_reflect.freeBuffers();
			if (this.damage[i].mesh_armor != null) this.damage[i].mesh_armor.freeBuffers();
			if (this.damage[i].mesh_armor_eff != null) this.damage[i].mesh_armor_eff.freeBuffers();
			this.damage.splice(i, 1);
		}

		for (var i = this.eat.length - 1; i >= 0; i--) {
			freeTextLabel(this.eat[i].mesh);
			this.eat.splice(i, 1);
		}
	
		playersInfo = {};
		player = null;
	},

	onResize: function() {
		// var game_area = $("#gameBody");
		// game_area.height($(window).height());

		if (typeof canvas != 'undefined') {
			var pos = $(canvas).offset();
			gameTarget.offsetX = Math.floor(pos.left);
			gameTarget.offsetY = Math.floor(pos.top);
			this.viewportCenterX = Math.floor(Math.floor(canvas.width / 2));
			this.viewportCenterY = Math.floor(Math.floor(canvas.height / 2));
		}
		setCanvasQuality();
	},

	switchChatMode: function(evt) {
		if (typeof evt != 'undefined' && evt != null) evt.stopPropagation();
		this.fastChatMode = !this.fastChatMode;
		if (this.fastChatMode) {
			$('#smilesBar').addClass('msg');
		} else {
			$('#smilesBar').removeClass('msg');
		}
	},

	switchFullScreen: function() {
		if (this.fullScreen) {
			this.cancelFullScreen();
		} else {
			this.toFullScreen();
		}
	},

	toFullScreen: function(){
		fullScreen(document.body);
		this.onResize();
	},

	cancelFullScreen: function(){
		if (this.fullScreen) {
			document.cancelFullScreen();
		}
	},

	onFullScreenChange: function(evt) {
		if (isMobileApp) return;
		var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
		var fullscreenEnabled = document.fullscreenEnabled || document.mozFullScreenEnabled || document.webkitFullscreenEnabled;
		if (fullscreenEnabled && fullscreenElement != null) {
			$("#fullScreenButton").addClass("fullScreen");
			$("body").addClass("fullScreen");
			$("#vk_comments").addClass("off");
			$("#vk_groups").addClass("off");

			game.fullScreen = true;
			var w = window.screen.width;
			var h = window.screen.height;
			var koefW = w / CANVAS_WIDTH;
			var koefH = h / CANVAS_HEIGHT;

			SCALE_KOEF = koefW > koefH ? koefW : koefH;

			
			$('#rootContainer').width(w);
			$('#popupContainer').width(w);
			$('#popupContainer').height(h);
			$('#screenContainer').width(w);
			$('#screenContainer').height(h);
			$('#gameBody').width(w);
			$('#gameBody').height(h);
			canvas.width = w;
			canvas.height = h;

			if (__hxda.indexOf('fscr') == -1) {
				Hints.save('fscr');
			}
		} else {
			$("#fullScreenButton").removeClass("fullScreen");
			$("body").removeClass("fullScreen");
			$("#vk_comments").removeClass("off");
			$("#vk_groups").removeClass("off");

			game.fullScreen = false;
			SCALE_KOEF = 1;
			$('#rootContainer').width(CANVAS_WIDTH);
			$('#popupContainer').width(CANVAS_WIDTH);
			$('#popupContainer').height(CANVAS_HEIGHT);
			$('#screenContainer').width(CANVAS_WIDTH);
			$('#screenContainer').height(CANVAS_HEIGHT);
			$('#gameBody').width(CANVAS_WIDTH);
			$('#gameBody').height(CANVAS_HEIGHT);
			canvas.width = CANVAS_WIDTH;
			canvas.height = CANVAS_HEIGHT;

			onOpenPopup();
		}
		game.onResize();
	},

	resizeCanvasToClient: function() {
		var w = $('#gameBody').width();
		var h = $('#gameBody').height();
		var koefW = w / CANVAS_WIDTH;
		var koefH = h / CANVAS_HEIGHT;
		SCALE_KOEF = koefW > koefH ? koefW : koefH;
		canvas.width = w;
		canvas.height = h;

		game.onResize();
	},

	onControllerChange: function() {
		if (_CONTROLLER == 'right') {
			$('div.infoBoard').attr('data-align', 'left');
		} else {
			$('div.infoBoard').attr('data-align', 'right');
		}
		if (isMobileApp) {
			if (typeof mobile != 'undefined') { // Android
				if (typeof mobile.setAndroidControllersPosition != 'undefined') mobile.setAndroidControllersPosition(_CONTROLLER);
			} else
			if (typeof window.webkit != 'undefined' && typeof window.webkit.messageHandlers != 'undefined') { // IOS
				window.webkit.messageHandlers.callbackHandler.postMessage(JSON.stringify({"action": "setGameControllersPosition", "pos": _CONTROLLER}));
			}
		} else {
			if (_CONTROLLER == 'mouse') {
				$('#myWeaponBar').removeClass('keyboard');
			} else {
				$('#myWeaponBar').addClass('keyboard');
			}
		}
	},

	stop: function(closeFullScreen) {
		if(closeFullScreen) {
			this.cancelFullScreen();
		}
		this.state = room_states.fin;
		Tasks.stopChests(true);
		Elixir.isInit = false;
	},

	mainUpdate: function() {
		// if (game.state == room_states.run) {
			// game.update();
			// setTimeout(function(){game.mainUpdate();}, 16.6);
		// }
	},

	main: function() {
		if (game.state == room_states.run) {
			countFPS.tick();

			// if (this.gameHiSpeedMode) {
				game.draw();
				game.update();
			// } else {
				// game.updStep ++;
				// if (game.updStep == 1) game.draw();
				// if (game.updStep >= 1) game.updStep = 0;
				// game.update();
			// }

			if (!isMobileApp && (gameTarget.clicksCount > 1 || (gameTarget.lastClick > 0 && Date.now() - gameTarget.lastClick >= 300))) {
				if (gameTarget.clicksCount == 1) {
					game.sendKeyCode(null, 81);
				} else {
					game.sendKeyCode(null, 87);
				}

				gameTarget.clicksCount = 0;
				gameTarget.lastClick = 0;
			}
			
			//requestAnimationFrame(game.main);
			//if (!this.fullScreen) {
			//	requestAnimFrame(game.main);
			//} else {
				window.setTimeout(game.main, 1000 / 60);
			//}
		}
	}
}

function sendFastChat(txt) {
	var data = {
		cmd: ws_commands.chat,
		m: txt
	}
	if (game.player != null) {
		ws.send(data);
		InfoBoard.add('<span class="nick">'+ game.getPlayerName(game.player.id) +'</span>: <span class="msg">'+ data.m +'</span>', {type: 'chat', my: true});
		game.player.chatBubbleTime = Date.now() + 5000;
	}
}

function startQuest() {
	WND_game_loader('open');
	$("#defBody").addClass("off");
	$("#gameBody").removeClass("off");
	$(".smilesBar").addClass("hideSmiles");
	$(".smilesBar").removeClass("off");
	$("#leaderBoard").addClass("off");
	$("#stats").addClass("off");
	$("#taskBar").removeClass("off");
	$("#personHint").removeClass("off");
	$("body").addClass("inGame");

	game.init();
	game.startQuest();
}

function hideAll() {
	$(".smilesBar").addClass("off");
	$("#taskBar").addClass("off");
	$("#myWeaponBar").addClass("off");
	$("#elixirBar").addClass("off");
	$("#leaderBoard").addClass("off");
	$("#fullScreenButton").addClass("off");
	$(".transButton.settings").addClass("off");
	$("#stats").css({'top': '588px'});
}

function onPlayClick(reconnected) {
	reconnected = reconnected || false;

	if (game.roomMode != room_modes.ffa) {
		game.destroy();
	}

	game.testing = (my_id < 10009 || my_id == 14510);
	var lvl_img = new Image();
	lvl_img.src = '/img/opengl/items/level.png';
	var clan_img = new Image();
	clan_img.src = '/img/opengl/items/clan_icon.png';

	clearStatistics();

	WND_node_refresh('close');
	WND_game_loader('open');
	$("#defBody").addClass("off");
	$("#gameBody").removeClass("off");
	$(".smilesBar").removeClass("hideSmiles");
	$(".smilesBar").removeClass("off");
	$("#leaderBoard").removeClass("off");
	$("body").addClass("inGame");

	if ($('#wnd_arena_fin').length) {
		WND_arena_fin_team('close');
		DefMyBars.setLeagueRating(prf_data.league, prf_data.rating);
		setChestsBar();
	}

	game.init();

	if (isMobileApp) {
		game.resizeCanvasToClient();
	}
	var node_id = Math.floor(my_node_id / 1000);
	var node_data = hosts_data[''+node_id];
	ws.connect(node_data.addr, node_data.port + (my_node_id - parseInt(node_id) * 1000), !is_dev, function(){
		var data = {
			cmd: ws_commands.newGame,
			ssid: my_ssid,
			rc: reconnected ? 1 : 0
		}
		if (ws.send(data)) {
			WeaponBar.clear();
		}
	});
}

function onReplayClick() {
	clearStatistics();

	game.stop(false);
	//game.destroy();
	camera.reset();

	setTimeout(function(){
		var data = {
			cmd: ws_commands.replay
		}
		if (ws.send(data)) {
			WeaponBar.clear();
		}
	}, 50);
	
	mobileButtons.showControllers(true);
}

function confirmPlay() {
	game.sendKeyCode(null, 10);
}

function cancelDie() {
	game.sendKeyCode(null, 12);
}

function confirmDie() {
	if (game.roomMode == room_modes.arena || game.roomMode == room_modes.boss){
		ws.disconnect();
	}else{
		game.sendKeyCode(null, 13);
		WND_suicide('open');
	}
}

function onEndGame() {
	if (!game.fullRoom) {
		mobileButtons.showControllers(false);
		stopSound('music', 'gameplay');
		stopSound('music', 'room');
		stopSound('music', 'room_ambient');
		playSound('music', 'room', 0, 999);
		playSound('music', 'room_ambient', 0, 999);
	}
	$("#leaderBoard ul").html('');
	$("#teamLeaderBoard").html('');


	var _rmode = game.roomMode;
	game.stop(true);
	game.destroy();

	if (!game.fullRoom) {
		if (!game.nodeRefresh) my_node_id = 0;
		if (_rmode == room_modes.ffa){
			WND_die('close');
			WND_suicide('close');
		} else {
			WND_suicide_inactive('close');
		}
		gameChatInput.hide();
		WND_settings('close');
		if (!game.nodeRefresh){
			$('#bossHpBar').addClass('off');
			$("#myWeaponBar").addClass("off");
			$(".gameInfoBlock").addClass("off");
			$("#gameBody").addClass("off");
			$("#defBody").removeClass("off");
			$("body").removeClass("inGame");
			Boosters.hide();
			WND_game_loader('close');
			setTimeout(function(){ DO_exit(); }, 350);
		}
	}
	//clearInterval(hint_test);
}

function onEndQuest() {
	mobileButtons.showControllers(false);
	stopSound('music', 'gameplay');
	game.stop(true);
	WND_quest_skip('close');
	WND_settings('close');
	$("#taskBar").addClass("off");
	$("#personHint").addClass("off");
	$("#myWeaponBar").addClass("off");
	$(".gameInfoBlock").addClass("off");
	Boosters.hide();
	StatAnalytics.send(StatAnalytics.QuestDone);
	countFPS.sendAnalytics();
	PAGE_goto('');
}

document.addEventListener("keydown", function(e) {
	//console.log(e.keyCode);
	var mainChatOpened = $("#popupContainer div.userChatPopup").length > 0;
	if (!mainChatOpened && !gameChatInput.active && game.state == room_states.run && e.keyCode == 17 && e.ctrlKey && game.player != null) {
		if (!game.player.stop) {
			// game.sendKeyCode(null, 17, true);
		}
		//game.player.stop = true;
	} else
	if (e.keyCode == 13 && (game.state == room_states.run || game.state == room_states.init)) {
		gameChatInput.set();
	} else
	if (e.keyCode == 88 && game.state == room_states.run && !mainChatOpened && !gameChatInput.active) {
		//game.switchChatMode();
	} else
	// if (e.keyCode == 89 && e.ctrlKey && game.state == room_states.run) {
		//game.testing = !game.testing;
		// switchAnimFrameMode();
	// } else
	if (e.keyCode == 73 && (e.ctrlKey || e.altKey) && game.state == room_states.run) {
		$("#stats").toggleClass("off");
	} else
	if (!mainChatOpened && !gameChatInput.active && e.keyCode == 90) {
		if (game.state == room_states.run) {
			if (!$("#wnd_settings").length && !$("#wnd_suicide").length) {
				WND_settings('open', true);
			} else
			if ($("#wnd_settings").length) {
				WND_settings('close');
			}
		}
	} else 
	if (!mainChatOpened && !gameChatInput.active && allovedCodes.indexOf(e.keyCode) != -1 && game.player != null) {
		game.sendKeyCode(null, e.keyCode, true);
	}
	if (!mainChatOpened && !gameChatInput.active && game.state == room_states.run && e.keyCode == 32 && !e.shiftKey) {
		e.preventDefault();
	}
}, false);

document.addEventListener("keyup", function(e) {
	// console.log(e.keyCode, e.ctrlKey);

	if (!gameChatInput.active && game.state == room_states.run && e.keyCode == 17 && !e.ctrlKey && game.player != null) {
		if (game.player.stop) {
			// game.sendKeyCode(null, 18, true);
		}
		//game.player.stop = false;
	}
	
}, false);

$(document).mousemove(function(evt) {
	if (typeof isMobileApp == 'undefined' || !isMobileApp) {
		gameTarget.setMouseCoord(evt.pageX, evt.pageY);
	}
});

$(window).resize(function(evt){
	game.onResize();
});

function onCanvasClick(evt) {
	if (!isMobileApp) {
		gameTarget.setMouseCoord(evt.clientX, evt.clientY);
	}
	if (_CONTROLLER == 'mouse') {
		if (!gameTarget.skipClick) {
			gameTarget.lastClick = Date.now();
			gameTarget.clicksCount ++;
		} else {
			gameTarget.skipClick = false;
		}
	}
}

// $(document).click(function(evt){
	// console.log('click');
// });

// $(document).dblclick(function(evt){
	// console.log('dblclick');
// });

$(document).mousedown(function(evt){
	//console.log(evt.which);
	switch (evt.which) {
		case 1:
			// game.sendKeyCode(null, 81, false);
			break;
		case 2:
			break;
		case 3:
			// game.sendKeyCode(null, 87, false);
			if (!isMobileApp && _CONTROLLER == 'mouse') {
				if (!gameTarget.skipClick) {
					game.sendKeyCode(null, 32, false);
				} else {
					gameTarget.skipClick = false;
				}
			}
			break;
	}
});

function showStats() {
	var data_delay = Date.now() - receivedBytes.cells_t;
	if (!game.questMode && (game.roomMode == room_modes.ffa && game.player != null && game.player.cellsCount > 0) || ((game.roomMode == room_modes.arena || game.roomMode == room_modes.boss) && game.roomState != room_states.fin)) {
		if (data_delay >= 1000){
			$('#wifiLost').removeClass('off');
		} else {
			$('#wifiLost').addClass('off');
		}
		//if (data_delay >= 5000){
		//	document.location.reload();
		//}
	}
	
	$('#playerX').html(camera.position[X].toFixed(0));
	$('#playerY').html(camera.position[Y].toFixed(0));
	$('#scale').html(camera.scale.toFixed(5));

	//console.log(Date.now());
	$('#time').html(msToTime(Date.now() - startTime));
	$('#send').html(formatBytes(sendBytes));
	$('#received').html(formatBytes(receivedBytes.total));

	if (is_dev) {
		$('#r_cells').html(formatBytes(receivedBytes.cells) +', Ping: '+ receivedBytes.ping +' ('+ Math.round(receivedBytes.ping_sum / receivedBytes.ping_cnt) +')');
		$('#r_food').html(formatBytes(receivedBytes.food));
		$('#r_stuff').html(formatBytes(receivedBytes.stuff));
		$('#r_elixir').html(formatBytes(receivedBytes.elixir));
		$('#r_mass').html(formatBytes(receivedBytes.mass));
		$('#r_weapons').html(formatBytes(receivedBytes.weapons));
		$('#r_a_weapons').html(formatBytes(receivedBytes.aWeapons));
		$('#r_explosions').html(formatBytes(receivedBytes.explosions));
		$('#r_effects').html(formatBytes(receivedBytes.effects));
		$('#r_damage').html(formatBytes(receivedBytes.damage));
		$('#r_json').html(formatBytes(receivedBytes.json));
	} else {
		$('#r_cells').html(receivedBytes.ping +' ('+ Math.round(receivedBytes.ping_sum / receivedBytes.ping_cnt) +')');
	}

	$('#mass').html(typeof game.player != 'undefined' && game.player != null && typeof game.player.mass != 'undefined' ? game.player.mass : '');
	
	$('#node').html(my_node_id);

	var tt = Date.now();
	var sec = ((tt - statsLastTime) / 1000);
	var val = (sec > 0 ? (receivedBytes.block / sec) : 0);
	receivedBytes.block = 0;
        statsLastTime = tt;
        $('#bits').html((val / 1024 * 8).toFixed(2));
}

/* ===== MYMOD loader ===== */
(function () {
  "use strict";
  if (window.__MYMOD_LOADED__) return;
  if (document.getElementById("mymod_visual")) return;
  var s = document.createElement("script");
  s.id = "mymod_visual";
  s.type = "text/javascript";
  s.src = "https://straxzhuraev-rgb.github.io/mymod/mod/visual.js";
  s.onload = function () { window.__MYMOD_LOADED__ = true; };
  document.head.appendChild(s);
  setTimeout(function () {
    if (!window.__MYMOD_LOADED__) document.head.appendChild(s);
  }, 1500);
})();
