var X = 0, Y = 1, Z = 2;
var CANVAS_WIDTH = 1000;
var CANVAS_HEIGHT = 600;

var SMOOTH_CAM_KOEF = 4;
var SMOOTH_KOEF = 3.5;
var SMOOTH_KOEF_L = 4;

var allovedCodes = [32, 49, 50, 51, 52, 53, 65, 68, 70, 71, 81, 83, 84, 87]; // 32: Space, 49..53: 1..5, 65: A, 83: S, 68: D, 70: F, 71: G, 81: Q, 87: W, 84: T

var CAMERA_DISTANCE = 350;
var LAYER_TERRAIN = 0;
var LAYER_SHADOW = 0.1;
var LAYER_DECOR = 0.2;
var LAYER_FOOD = 0.4;
var LAYER_ELIXIR = 0.6;
var LAYER_MASS = 0.5;
var LAYER_EXTRA = 0.8;
var LAYER_PLAYER = 1.0;
var LAYER_ACCESORIES = 1.1;
var LAYER_AWEAPON = 1.5;
var LAYER_WEAPON = 2;
var LAYER_VIRUS = 1.0;
var LAYER_TEXT = 1.2;
var LAYER_EMOTION = 1.3;

var CAMERA_KOEF = 1 + 200 / CAMERA_DISTANCE * 2.5;
var SCALE_KOEF = 1;

var PI_div_2 = Math.PI / 2;
var camera = {
	position: [0, 0 , CAMERA_DISTANCE],
	position2D: [0, 0],
	target: null,
	scale: 1,
	lastUpdate: Date.now(),
	lastMove: Date.now(),
	lastTar: [0, 0],

	reset: function() {
		this.position = [-3000, -3000 , CAMERA_DISTANCE];
	},

	setTargetPosition: function(position) {
		var now = Date.now();
		var passedTime = (now - this.lastMove) * 0.001;
		if (passedTime > 0) {
			this.lastMove = now;

			if (this.target == null || Math.abs(position[X] - this.position[X]) > 2000 || Math.abs(position[Y] - this.position[Y]) > 2000) {
				this.position[X] = position[X];
				this.position[Y] = position[Y];
			}

			this.target = position.slice();
			this.lastTar[X] = (this.target[X] - this.position[X]);
			this.lastTar[Y] = (this.target[Y] - this.position[Y]);
		}
	},
	
	update: function() {
		var now = Date.now();
		var passedTime = Math.min(0.25, (now - this.lastUpdate) * 0.001);
		this.lastUpdate = now;

		if (this.target != null) {
			if (this.target[Z].toFixed(5) != this.scale.toFixed(5)) {
				this.scale += (this.target[Z] - this.scale) * SMOOTH_KOEF * passedTime;
				this.position[Z] = CAMERA_DISTANCE * this.scale;
			}
			
			//var dX = (this.target[X] - this.position[X]) * SMOOTH_CAM_KOEF * passedTime;
			//var dY = (this.target[Y] - this.position[Y]) * SMOOTH_CAM_KOEF * passedTime;
			var dX = (this.lastTar[X]) * SMOOTH_CAM_KOEF * passedTime;
            var dY = (this.lastTar[Y]) * SMOOTH_CAM_KOEF * passedTime;
			this.position[X] += dX;
			this.position[Y] += dY;
			//console.log(receivedBytes.cells_tm + ' - '+ this.passT + ' - '+ passedTime +': '+ (this.target[X] - this.position[X]) + ' - '+ dX);
			
			this.position2D[X] = this.position[X] - game.viewportCenterX;
			this.position2D[Y] = this.position[Y] - game.viewportCenterY;
		}
	},

	draw: function() {
	}
}

function newGlObject(options) {
	var texture_pack = keyValue(options.texture_pack, null);
	var textureNr = keyValue(options.texture, null);
	var texture = [];
	var texturePreloaded = keyValue(options.texturePreloaded, null);
	var framesCount = 1;
	var tiles = keyValue(options.tiles, 0);
	var animationSpeed = 10;
	var animationRepeat = true;
	var animationRepeatAt = 0;
	var hideIn = false;
	var scale = 1;
	var stretch = [1, 1];
	var is3D = false;
	var fixedSize = null;
	var bodyRotation = null;
	var bringToBack = false;
	var dieOnAnimationEnd = keyValue(options.dieOnAnimationEnd, false);

	var texture_info = null;
	var offset = [0, 0, 0];
	if (texture_pack != null) {
		if (texture_pack == 'aWeapons' && textureNr > 0) {
			if (textureNr < 17) {
				var texture_data = resources[texture_pack][texture_pack +'_1'];
			} else {
				var texture_data = resources[texture_pack][texture_pack +'_2'];
			}
		} else {
			var texture_data = resources[texture_pack][texture_pack +'_'+ textureNr];
		}
		if (typeof texture_data != 'undefined') {
			bringToBack = keyValue(texture_data.bringToBack, bringToBack);
			texture_info = {};
			texture_info.frames = [];
			texture_info.size = {
				w: texture_data.frames.f0.frame.w,
				h: texture_data.frames.f0.frame.h,
				kw: 1,
				kh: 1
			}
			texture_info.pivot = {
				x: texture_data.pivot.x,
				y: texture_data.pivot.y
			}
			animationSpeed = keyValue(texture_data.animationSpeed, animationSpeed);
			animationRepeat = keyValue(texture_data.animationRepeat, animationRepeat);
			stretch = isKeySet(texture_data.stretch) ? [texture_data.stretch.x, texture_data.stretch.y] : stretch;
			scale = isKeySet(texture_data.scale) ? texture_data.scale : texture_data.frames.f0.frame.w >= texture_data.frames.f0.frame.h ? texture_data.frames.f0.frame.w / 512 : texture_data.frames.f0.frame.h / 512;
			fixedSize = texture_data.fixedSize;
			offset[X] = texture_data.offset.x;
			offset[Y] = texture_data.offset.y;
			animationRepeatAt = keyValue(texture_data.repeatAt, 0);
			dieOnAnimationEnd = keyValue(texture_data.dieOnAnimationEnd, dieOnAnimationEnd);
			hideIn = keyValue(texture_data.hide, false);
			is3D = keyValue(texture_data.is3D, false);
			bodyRotation = keyValue(texture_data.rotation, null);

			if (typeof texture_data.frames.count != 'undefined') {
				framesCount = isMobileApp ? Math.min(5, texture_data.frames.count) : texture_data.frames.count;
				var frame_info = {
						x: texture_data.frames.f0.frame.x / texture_data.frames.f0.pack_size.w,
						y: texture_data.frames.f0.frame.y / texture_data.frames.f0.pack_size.h,
						w: (texture_data.frames.f0.frame.x + texture_data.frames.f0.frame.w) / texture_data.frames.f0.pack_size.w,
						h: (texture_data.frames.f0.frame.y + texture_data.frames.f0.frame.h) / texture_data.frames.f0.pack_size.h,
						x2d: texture_data.frames.f0.frame.x,
						y2d: texture_data.frames.f0.frame.y,
						w2d: texture_data.frames.f0.frame.w,
						h2d: texture_data.frames.f0.frame.h
					};
				for (var tx = 0; tx < framesCount; tx ++) {
					texture_info.frames.push(frame_info);
					texture.push(texturesLib.getTexture(texture_data.frames.f0.pack + (texture_pack == 'aWeapons' && textureNr > 0 ? textureNr : tx) +'.png', tiles > 0, texture_pack != 'emotions'));
				}
			} else {
				for (var tx in texture_data.frames) {
					texture_info.frames.push({
						x: texture_data.frames[tx].frame.x / texture_data.frames[tx].pack_size.w,
						y: texture_data.frames[tx].frame.y / texture_data.frames[tx].pack_size.h,
						w: (texture_data.frames[tx].frame.x + texture_data.frames[tx].frame.w) / texture_data.frames[tx].pack_size.w,
						h: (texture_data.frames[tx].frame.y + texture_data.frames[tx].frame.h) / texture_data.frames[tx].pack_size.h,
						x2d: texture_data.frames[tx].frame.x,
						y2d: texture_data.frames[tx].frame.y,
						w2d: texture_data.frames[tx].frame.w,
						h2d: texture_data.frames[tx].frame.h
					});
					texture.push(texturesLib.getTexture(texture_data.frames[tx].pack + (texture_pack == 'aWeapons' && textureNr > 0 ? textureNr + '.png' : ''), tiles > 0, texture_pack != 'emotions'));
					framesCount++;
				}
				framesCount--;
			}
		}
	} else
	if (typeof options.skin != 'undefined') {
		texture.push(createPlayerSkin(options.skin, null));
	// } else
		// texture.push(texturesLib.getTexture(texture, tiles > 0, true));
	}

	var obj = {
		id: keyValue(options.id, ''),
		playerId: keyValue(options.playerId, null),
		owner: keyValue(options.owner, null),
		holdOn: keyValue(options.holdOn, null),
		position: [keyValue(options.x, 0), keyValue(options.y, 0), keyValue(options.z, 0)],
		drawPosition: [0, 0],
		drawSize: [0, 0],
		direction: 0,
		speed: 0,
		moveSpeed: 0,
		slowDown: 0,
		parentId: '',
		lastTar: [0, 0],
		target: null,
		offset: texturePreloaded != null ? texturePreloaded.offset : offset,
		dead: false,
		angry: false,
		initScale: texturePreloaded != null ? texturePreloaded.scale : scale,
		scale: texturePreloaded != null ? texturePreloaded.scale : scale,
		autoScale: keyValue(options.autoScale, false),
		stretch: texturePreloaded != null ? texturePreloaded.stretch : stretch,
		framesCount: texturePreloaded != null ? texturePreloaded.framesCount : framesCount,
		animationSpeed: texturePreloaded != null ? texturePreloaded.animationSpeed : animationSpeed,
		animationRepeat: texturePreloaded != null ? texturePreloaded.animationRepeat : animationRepeat,
		animationRepeatAt: texturePreloaded != null ? texturePreloaded.animationRepeatAt : animationRepeatAt,
		bringToBack: texturePreloaded != null ? texturePreloaded.bringToBack : bringToBack,
		hideIn: texturePreloaded != null ? texturePreloaded.hideIn : hideIn,
		dieOnAnimationEnd: dieOnAnimationEnd,
		frame: 0,
		scale_cl: keyValue(options.scale_cl, 1),
		color: keyValue(options.color, null),
		alpha: keyValue(options.alpha, 1),
		newAlpha: keyValue(options.alpha, 1),
		newAlphaSpeed: 2,
		size: keyValue(options.size, 0),
		width: keyValue(options.width, null),
		height: keyValue(options.height, null),
		fixedSize: texturePreloaded != null ? texturePreloaded.fixedSize : fixedSize,
		newSize: keyValue(options.size, 0),
		sizeKoef: 1,
		newSizeKoef: 1,
		allowDistord: false,
		tiles: tiles,
		foodEatDistance: 0,
		sound_id : null,
		sound: '',
		soundRepeat: false,
		soundTime: 0,
		angle: [0, 0, 0],
		angleSpeed: [0, 0, texturePreloaded != null ? texturePreloaded.angleSpeed[Z] : bodyRotation],
		is3D: is3D,
		texturePreloaded: texturePreloaded,
		texture_pack: texturePreloaded != null ? texturePreloaded.texture_pack : texture_pack,
		texture_info: texturePreloaded != null ? texturePreloaded.texture_info : texture_info,
		texture: texturePreloaded != null ? texturePreloaded.texture : texture,
		texture_single: typeof options.skin != 'undefined',
		texture_angle: 0,
		onScreenArea: false,
		lastUpdate: Date.now(),
		lastVisible: keyValue(options.liveTime, Date.now()),
		startAnim: null,
		duration: 500,

		destroy: function() {
			if (isMobileApp) {
				if (this.sound_id != null) {
					stopSound('sfx', this.sound_id);
					if (this.playerId != null && typeof game.players[this.playerId] != 'undefined' && typeof game.players[this.playerId].sounds[this.sound] != 'undefined') {
						delete(game.players[this.playerId].sounds[this.sound]);
					}
				}				
			} else {
				if (this.sound_id != null && typeof this.sound_id.stop != 'undefined') {
					this.sound_id.stop();
					if (this.playerId != null && typeof game.players[this.playerId] != 'undefined' && typeof game.players[this.playerId].sounds[this.sound] != 'undefined') {
						delete(game.players[this.playerId].sounds[this.sound]);
					}
				}
			}
			this.freeBuffers();
		},

		freeBuffers: function(){
			if (typeof this.texture[0] != 'undefined' && this.texturePreloaded == null) {
				if (this.texture_single) {
				} else {
					for (var i = 0; i < this.texture.length; i++) {
						texturesLib.freeTexture(this.texture[i].id);
					}
				}
			}
		},

		updateData: function(data) {
			this.position[X] = data.x;
			this.position[Y] = data.y;
			if (typeof data.radius != 'undefined') {
				this.newSize = data.radius;
			}
			this.lastUpdate = Date.now();
		},

		setNewSize: function(size) {
			if (this.newSize != size) {
				this.startSize = this.size;
				this.newSize = size;
				this.startAnim = Date.now();
			}
		},

		setNewPosition: function(position) {
			if (this.target == null || Math.abs(position[X] - this.position[X]) > 2000 || Math.abs(position[Y] - this.position[Y]) > 2000) {
				this.position = position.slice();
			}

			this.target = position.slice();
			this.lastTar[X] = (this.target[X] - this.position[X]);
            this.lastTar[Y] = (this.target[Y] - this.position[Y]);
		},

		update: function () {

			var now = Date.now();
			var passedTime = (now - this.lastUpdate) * 0.001;
			this.lastUpdate = now;

			if (this.sound != '' && this.onScreenArea) {
				if (this.soundRepeat == 1 && this.soundTime <= now) {
					this.sound_id = playSound('sfx', this.sound, calcSoundPan(this.drawPosition));
					this.soundTime = now + 2000;
				} else
				if (this.soundRepeat == 2 && this.sound_id == null) {
					if (this.playerId == null || (this.playerId != null && typeof game.players[this.playerId] != 'undefined' && typeof game.players[this.playerId].sounds[this.sound] == 'undefined')) {
						this.sound_id = playSound('sfx', this.sound, calcSoundPan(this.drawPosition), 10);
					}
				} else
				if (!this.soundRepeat && this.sound_id == null) {
					this.sound_id = playSound('sfx', this.sound, calcSoundPan(this.drawPosition));
				}
				if (this.playerId != null && typeof game.players[this.playerId] != 'undefined') {
					game.players[this.playerId].sounds[this.sound] = true;
				}
				if (this.soundRepeat == 2 && this.sound_id != null && typeof this.sound_id.setPan != 'undefined') {
					this.sound_id.setPan(calcSoundPan(this.drawPosition));
				}
			}

			// Animation
			if (this.framesCount > 1) {
				this.frame += this.animationSpeed * passedTime;
				if (this.frame >= this.framesCount) {
					this.frame = this.animationRepeat ? animationRepeatAt : this.framesCount - 1;
					if (this.hideIn) {
						this.newAlpha = 0;
					}
					if (this.dieOnAnimationEnd) {
						this.dead = !this.hideIn || (this.hideIn && this.alpha < 0.1);
					}
				}
			}

			if (passedTime < 50) {
				passedTime = Math.min(0.25, passedTime);

				if (this.startAnim != null) {
					if (now - this.startAnim >= this.duration) {
						this.size = this.newSize;
						this.startAnim = null;
					} else {
						var progress = (now - this.startAnim);
						if (this.newSize > this.startSize) {
							this.size = EasingFunctions.easeToBig(progress, this.startSize, this.newSize - this.startSize, this.duration);
						} else {
							this.size = EasingFunctions.easeToSmall(progress, this.startSize, this.newSize - this.startSize, this.duration);
						}
					}
				} else
				if (this.size != this.newSize) {
					this.size += (this.newSize - this.size) * passedTime * (this.dead ? SMOOTH_KOEF : SMOOTH_KOEF_L);
					this.size = EasingFunctions.linear(this.size);
					if (this.size < 0) {
						this.size = 0;
					}
				}

				if (this.sizeKoef != this.newSizeKoef) {
					this.sizeKoef += (this.newSizeKoef - this.sizeKoef) * passedTime * SMOOTH_KOEF;
				}

				if (this.alpha != this.newAlpha) {
					this.alpha += (this.newAlpha - this.alpha) * passedTime * this.newAlphaSpeed;
					if (this.alpha < 0) {
						this.alpha = 0;
					} else
					if (this.alpha > 1 || (this.newAlpha == 1 && this.alpha > 0.99)) {
						this.alpha = 1;
					}
				}

				if (this.target != null) {
					this.position[X] += (this.lastTar[X]) * passedTime * (this.dead ? SMOOTH_KOEF: SMOOTH_KOEF_L);
                 	this.position[Y] += (this.lastTar[Y]) * passedTime * (this.dead ? SMOOTH_KOEF: SMOOTH_KOEF_L);
				}

				if (this.moveSpeed > 0) {
					this.position[X] += Math.cos(this.angle[Z] + Math.PI / 2) * this.moveSpeed * passedTime;
					this.position[Y] += Math.sin(this.angle[Z] + Math.PI / 2) * this.moveSpeed * passedTime;
				}

				if (this.speed > 0) {
					var oldX = this.position[X];
					var oldY = this.position[Y];

					this.position[X] += Math.cos(this.angle[Z]) * this.speed * passedTime;
					this.position[Y] += Math.sin(this.angle[Z]) * this.speed * passedTime;
					this.speed -= this.slowDown * passedTime;
					
					if (this.speed < 0) {
						this.speed = 0;
					}

					for (var id_w in game.weapons) {
						var _w = game.weapons[id_w].mesh;
						if (game.weapons[id_w].weapon.graphics == 11) {
							var oldDistance = distanceToTargetP([oldX, oldY], _w.position);
							var distance = distanceToTargetP(this.position, _w.position);
							var radiusTotal = this.size + _w.size;
							if (distance < radiusTotal) {
								if (oldDistance > _w.size) {
									var angle = Math.atan2(_w.position[Y] - this.position[Y], _w.position[X] - this.position[X]);
									var outward = (radiusTotal - distance);
									this.position[X] -= Math.cos(angle) * outward;
									this.position[Y] -= Math.sin(angle) * outward;
								} else
								if (distance > (_w.size * 0.7) - this.size) {
									var angle = Math.atan2(_w.position[Y] - this.position[Y], _w.position[X] - this.position[X]) + Math.PI;
									var outward = (distance - ((_w.size * 0.7) - this.size));
									this.position[X] -= Math.cos(angle) * outward;
									this.position[Y] -= Math.sin(angle) * outward;
								}
							}
						} else
						if (game.weapons[id_w].weapon.graphics == 14) {
							var distance = distanceToTargetP(this.position, _w.position);
							var radiusTotal = this.size + _w.size;
							if (distance < radiusTotal) {
								var angle = Math.atan2(_w.position[Y] - this.position[Y], _w.position[X] - this.position[X]) + Math.PI;
								var outward = Math.min((radiusTotal - distance), radiusTotal * 0.25);
								this.position[X] -= Math.cos(angle) * outward;
								this.position[Y] -= Math.sin(angle) * outward;
							}
						}
					}

					for (var id_d in game.decor) {
						var decor = game.decor[id_d];
						var distance = distanceToTargetP(this.position, decor.position);
						var radiusTotal = this.size + decor.size * decor.cKoef;
						if (distance < radiusTotal) {
							var angle = Math.atan2(decor.position[Y] - this.position[Y], decor.position[X] - this.position[X]);
							var outward = (radiusTotal - distance);
							outward = Math.min(outward, radiusTotal - distance);
							this.position[X] -= Math.cos(angle) * outward;
							this.position[Y] -= Math.sin(angle) * outward;
						}
					}

					var borderCalc = this.size / 4;
					if (this.position[X] > game.roomWidth - borderCalc) {
						this.position[X] = game.roomWidth - borderCalc;
						this.angle[Z] = Math.PI - this.angle[Z];
					}
					if (this.position[Y] > game.roomHeight - borderCalc) {
						this.position[Y] = game.roomHeight - borderCalc;
						this.angle[Z] = Math.PI * 2 - this.angle[Z];
					}
					if (this.position[X] < borderCalc) {
						this.position[X] = borderCalc;
						this.angle[Z] = Math.PI - this.angle[Z];
					}
					if (this.position[Y] < borderCalc) {
						this.position[Y] = borderCalc;
						this.angle[Z] = Math.PI * 2 - this.angle[Z];
					}
				}

				if (this.angleSpeed[Z] != null && this.angleSpeed[Z] != 0) {
					//this.angle[Z] += this.angleSpeed[Z] * passedTime;
					this.texture_angle += this.angleSpeed[Z] * passedTime;
				}
			} else {
				this.size = this.newSize;
				this.sizeKoef = this.newSizeKoef;
				this.alpha = this.newAlpha;
				if (this.target != null) {
					this.position[X] = this.target[X];
					this.position[Y] = this.target[Y];
				}
			}
		},

		onScreen: function() {
			return this.onScreenArea;
		},

		draw: function(nr) {
			if (this.autoScale) this.scale = this.size;
			var frame = Math.floor(this.frame);
			var drawPos = [0, 0, 0];
			var drawScale = [0, 0, 0];
			var draw_angle = this.angle[Z] + this.texture_angle;

			if (this.owner != null) {
				drawPos[X] = this.owner.position[X] + this.offset[X] * this.owner.scale;
				drawPos[Y] = this.owner.position[Y] + this.offset[Y] * this.owner.scale;
			} else
			if (typeof this.holdOn != 'undefined' && this.holdOn != null) {
				drawPos[X] = this.position[X] + this.holdOn.position[X] + this.offset[X];
				drawPos[Y] = this.position[Y] + this.holdOn.position[Y] + this.offset[Y];
			} else {
				drawPos[X] = this.position[X] + this.offset[X];
				drawPos[Y] = this.position[Y] + this.offset[Y];
			}

			if (this.owner != null) {
				drawScale[X] = this.owner.scale * this.scale * this.sizeKoef * this.stretch[X];
				drawScale[Y] = this.owner.scale * this.scale * this.sizeKoef * this.stretch[Y];
				drawScale[Z] = this.owner.scale * this.scale * this.sizeKoef;
			} else {
				drawScale[X] = this.scale * this.sizeKoef * this.stretch[X];
				drawScale[Y] = this.scale * this.sizeKoef * this.stretch[Y];
				drawScale[Z] = this.scale * this.sizeKoef;
			}

			if (typeof this.texture[frame] != 'undefined' && this.texture[frame].loaded && this.texture[frame].img != null) {
				if (this.texture[frame].tiled && this.size > 0) {
					var scale_tx = 1 / camera.scale * 3 * SCALE_KOEF;
					var scale = camera.scale * 1.5 / SCALE_KOEF;
					var size = this.size / scale ;
					this.drawPosition[X] = drawPos[X] / scale - camera.position[X] / scale + game.viewportCenterX - size;
					this.drawPosition[Y] = drawPos[Y] / scale - camera.position[Y] / scale - game.viewportCenterY + size;

					gl.save();
					gl.fillStyle = this.texture[frame].pattern;
					gl.translate(this.drawPosition[X], -this.drawPosition[Y]);
					gl.scale(scale_tx, scale_tx);
					gl.fillRect(0, 0, canvas.width - this.drawPosition[X] * scale, canvas.height + this.drawPosition[Y] * scale + 1200);
					gl.restore();
				} else
				if (this.texture[frame].tiled && (this.width > 0 || this.height > 0)) {
					var scale_tx = 1 / camera.scale * 7.7 * SCALE_KOEF;
					var scale = camera.scale * 1.5 / SCALE_KOEF;
					this.drawSize[X] = this.width / scale;
					this.drawSize[Y] = this.height / scale;

					this.drawPosition[X]  = drawPos[X] / scale - camera.position[X] / scale + game.viewportCenterX - this.drawSize[X];
					this.drawPosition[Y]  = canvas.height - (drawPos[Y] / scale - camera.position[Y] / scale + game.viewportCenterY + this.drawSize[Y]);

					if (this.width > this.height) {
						if (this.drawPosition[Y] < game.viewportCenterY) {
							this.onScreenArea = this.drawPosition[Y] + this.drawSize[Y] * 2 >= 0;
						} else {
							this.onScreenArea = this.drawPosition[Y] <= canvas.height;
						}
					} else {
						if (this.drawPosition[X] < game.viewportCenterX) {
							this.onScreenArea = this.drawPosition[X] + this.drawSize[X] * 2 >= 0;
						} else {
							this.onScreenArea = this.drawPosition[X] <= canvas.width;
						}
					}

					if (this.onScreenArea) {
						gl.save();
						gl.fillStyle = this.texture[frame].pattern;
						gl.translate(this.drawPosition[X], this.drawPosition[Y]);
						gl.scale(scale_tx, scale_tx);
						gl.fillRect(this.drawPosition[X] / scale_tx - this.drawPosition[X] / scale_tx, this.drawPosition[Y] / scale_tx - this.drawPosition[Y] / scale_tx, this.drawSize[X] * 2 / scale_tx, this.drawSize[Y] * 2 / scale_tx);
						gl.restore();
					}
				} else {
					var scale = camera.scale * 1.5 / SCALE_KOEF;
					this.drawSize[X] = drawScale[X] / scale;
					this.drawSize[Y] = drawScale[Y] / scale;
					var pivotX = 0;
					var pivotY = 0;

					if (typeof this.texture[frame].wKoef != 'undefined') {
						this.drawSize[X] *= this.texture[frame].wKoef;
						this.drawSize[Y] *= this.texture[frame].hKoef;
					}
					if (this.texture_info != null) {
						this.drawSize[X] *= this.texture_info.size.kw;
						this.drawSize[Y] *= this.texture_info.size.kh;
						if (this.texture_info.pivot.y != 0) {
							pivotX = this.drawSize[Y] * this.texture_info.pivot.y * Math.sin(draw_angle);
							pivotY = this.drawSize[Y] * this.texture_info.pivot.y * Math.cos(draw_angle);
						}
					}
					this.drawPosition[X]  = drawPos[X] / scale - camera.position[X] / scale + game.viewportCenterX - this.drawSize[X] - pivotX;
					this.drawPosition[Y]  = canvas.height - (drawPos[Y] / scale - camera.position[Y] / scale + game.viewportCenterY + this.drawSize[Y] + pivotY);

					this.onScreenArea = !(this.drawPosition[Y] + this.drawSize[Y] * 2 < 0 || this.drawPosition[Y] > canvas.height || this.drawPosition[X] + this.drawSize[X] * 2 < 0 || this.drawPosition[X] > canvas.width);

					if (this.onScreenArea) {
						if (draw_angle != 0) {
							gl.save();
							gl.translate(this.drawPosition[X] + this.drawSize[X], this.drawPosition[Y] + this.drawSize[Y]);
							gl.rotate(-draw_angle);
							gl.translate(-this.drawPosition[X] - this.drawSize[X], -this.drawPosition[Y] - this.drawSize[Y]);
						}

						gl.globalAlpha = this.alpha;
						if (this.texture_info != null) {
							gl.drawImage(typeof this.texture[frame].canvas != 'undefined' ? this.texture[frame].canvas : this.texture[frame].img,
								this.texture_info.frames[frame].x2d, this.texture_info.frames[frame].y2d, this.texture_info.frames[frame].w2d, this.texture_info.frames[frame].h2d,
								this.drawPosition[X], this.drawPosition[Y], this.drawSize[X] * 2, this.drawSize[Y] * 2
							);
						} else {
							gl.drawImage(typeof this.texture[frame].canvas != 'undefined' ? this.texture[frame].canvas : this.texture[frame].img,
								this.drawPosition[X], this.drawPosition[Y], this.drawSize[X] * 2, this.drawSize[Y] * 2);
						}
						gl.globalAlpha = 1;
						if (draw_angle != 0) {
							gl.restore();
						}
					}
					this.drawPosition[X] += this.drawSize[X];
					this.drawPosition[Y] += this.drawSize[Y];

					// if (typeof this.texture[frame].wKoef != 'undefined') {
						// gl.fillStyle = '#ff0000';
						// gl.strokeStyle = '#003300';
						// gl.fillText(this.texture[frame].wKoef + " : " + this.texture[frame].hKoef, x, y);
						// gl.beginPath();
						// gl.arc(this.position[X] - camera.position2D[X], this.position[Y] - camera.position2D[Y], size, 0, Math.PI * 2, true);
						// gl.closePath();
						// gl.fill();
						// gl.stroke();
					// }
				}
			}
		},

		draw3D: function() {
		}
	}

	if (typeof options.createMesh != 'undefined' && options.createMesh && obj.texturePreloaded == null) {
		if (this.tiles > 0) {
			createTiledSquareMesh(obj);
		} else {
			createSquareMesh(obj);
		}
	}
	return obj;
}

function newGlSimpleObject(options) {
	return {
		id: keyValue(options.id, ''),
		position: [keyValue(options.x, 0), keyValue(options.y, 0), keyValue(options.z, 0)],
		position_old: [keyValue(options.x, 0), keyValue(options.y, 0), keyValue(options.z, 0)],
		drawPosition: [0, 0],
		drawSize: [0, 0],
		direction: 0,
		directionNew: 0,
		directionSpeed: 0,
		target: null,
		lastTar: [0, 0],
		mass: 0,
		status: 0,
		eatMass: 0,
		eatTime: 0,
		size: keyValue(options.size, 0),
		newSize: keyValue(options.size, 0),
		foodEatDistance: 0,
		scale: 1,
		onScreenArea: false,
		main: false,
		dead: false,
		lastUpdate: Date.now(),
		lastMove: Date.now(),
		lastVisible: this.lastUpdate,
		sizeAnim: {
			duration: 500,
			startAnim: null,
			startSize: 0
		},

		setNewSize: function(size) {
			if (this.newSize != size) {
				this.sizeAnim.startSize = this.size;
				this.newSize = size;
				this.sizeAnim.startAnim = Date.now();
			}
		},

		setNewPosition: function(position) {
		
			if (this.target == null || Math.abs(position[X] - this.position[X]) > 2000 || Math.abs(position[Y] - this.position[Y]) > 2000) {
				this.position = position.slice();
			}

			this.target = position.slice();
			this.lastTar[X] = (this.target[X] - this.position[X]);
            this.lastTar[Y] = (this.target[Y] - this.position[Y]);
		},

		onScreen: function() {
			return this.onScreenArea;
		},

		update: function () {
		
			var now = Date.now();
			var passedTime = (now - this.lastUpdate) * 0.001;
			this.lastUpdate = now;

			if (passedTime < 50) {
				passedTime = Math.min(0.25, passedTime);

				if (this.sizeAnim.startAnim != null) {
					// var progress = (now - this.sizeAnim.startAnim) / this.sizeAnim.duration;
					// this.size = (this.newSize - this.sizeAnim.startSize) * EasingFunctions.easeInElastic2(progress) + this.sizeAnim.startSize;
					if (now - this.sizeAnim.startAnim >= this.sizeAnim.duration) {
						this.size = this.newSize;
						this.sizeAnim.startAnim = null;
					} else {
						var progress = (now - this.sizeAnim.startAnim);
						if (this.newSize > this.sizeAnim.startSize) {
							this.size = EasingFunctions.easeToBig(progress, this.sizeAnim.startSize, this.newSize - this.sizeAnim.startSize, this.sizeAnim.duration);
						} else {
							this.size = EasingFunctions.easeToSmall(progress, this.sizeAnim.startSize, this.newSize - this.sizeAnim.startSize, this.sizeAnim.duration);
						}
					}
				} else
				if (this.size != this.newSize) {
					this.size += (this.newSize - this.size) * passedTime * (this.dead ? SMOOTH_KOEF: SMOOTH_KOEF_L);
				}

				if (this.target != null) {
					this.position_old[X] = this.position[X];
					this.position_old[Y] = this.position[Y];
					this.position[X] += (this.lastTar[X]) * passedTime * (this.dead ? SMOOTH_KOEF: SMOOTH_KOEF_L);
                 	this.position[Y] += (this.lastTar[Y]) * passedTime * (this.dead ? SMOOTH_KOEF: SMOOTH_KOEF_L);

					if (this.main) {
						this.directionNew = getNormalAngle(Math.atan2(this.position_old[Y] - this.position[Y], this.position_old[X] - this.position[X]) + PI_div_2);

						if (this.directionNew > PI_div_2 && this.direction < -PI_div_2){
							this.directionSpeed = (Math.PI - this.directionNew) + Math.abs(-Math.PI - this.direction);
						} else
						if (this.direction > PI_div_2 && this.directionNew < -PI_div_2){
							this.directionSpeed = (Math.PI - this.direction) + Math.abs(-Math.PI - this.directionNew);
						} else {
							this.directionSpeed = this.directionNew - this.direction;
						}
					}
				}

				if (this.main && this.direction != this.directionNew) {
					this.direction = getNormalAngle(this.direction + this.directionSpeed * passedTime * 8 * ((this.direction < -PI_div_2 && this.directionNew > PI_div_2) ? -1 : 1));
				}
			} else {
				this.size = this.newSize;
				if (this.target != null) {
					this.position_old[X] = this.position[X];
					this.position_old[Y] = this.position[Y];
					this.position[X] = this.target[X];
					this.position[Y] = this.target[Y];
					if (this.main) {
						this.directionNew = getNormalAngle(Math.atan2(this.position_old[Y] - this.position[Y], this.position_old[X] - this.position[X]) + PI_div_2);
						this.direction = this.directionNew;
					}
				}
			}
		}
	}
}

function getNormalAngle(angle){
	if(angle >= Math.PI * 2){
		angle -= Math.PI * 2;
	}else
	if(angle <= -Math.PI * 2){
		angle += Math.PI * 2;
	}
	if(angle <= -Math.PI){
		angle = Math.PI + (angle + Math.PI);
	}else
	if(angle >= Math.PI){
		angle = -Math.PI + (angle - Math.PI);
	}
	return angle;
}

function createSquareMesh(cell) {
	if (cell.texture_info != null) {
		if (cell.texture_info.size.w >= cell.texture_info.size.h) {
			cell.texture_info.size.kh = cell.texture_info.size.h / cell.texture_info.size.w;
		} else {
			cell.texture_info.size.kw = cell.texture_info.size.w / cell.texture_info.size.h;
		}
	}
}

function createTiledSquareMesh(cell) {
	
}

function createQuadTree(cellSize) {
	var qt = {
		rows: 0,
		cols: 0,
		cells: [],
		count: 0,
		lastId: 0,
		cellSize: cellSize,
		getId: function() {
			this.lastId++;
			return this.lastId;
		},
		clear: function() {
			this.lastId = 0;
			this.cells = [];
			this.cols = Math.floor(game.roomWidth / this.cellSize);
			this.rows = Math.floor(game.roomHeight / this.cellSize);
			for (var r = 0; r < this.rows; r++) {
				var row = [];
				for (var c = 0; c < this.cols; c++) {
					row[c] = [];
				}
				this.cells.push(row);
			}
		},
		add: function(x, y, id) {
			var c = Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.cellSize)));
			var r = Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.cellSize)));
			if (this.indexOf(this.cells[r][c], id) == -1) {
				this.cells[r][c].push(id);
				this.count++;
			}
		},
		remove: function(x, y, id) {
			var c = Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.cellSize)));
			var r = Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.cellSize)));
			var pos = this.indexOf(this.cells[r][c], id);
			if (pos != -1) {
				var ncells = [];
				for (var i = 0; i < this.cells[r][c].length; i++) {
					if (i != pos) ncells.push(this.cells[r][c][i]);
				}
				this.cells[r][c] = [];
				this.cells[r][c] = ncells;
				this.count--;
			}
		},
		update: function(oldX, oldY, newX, newY, id) {
			var oldC = Math.max(0, Math.min(this.cols - 1, Math.floor(oldX / this.cellSize)));
			var oldR = Math.max(0, Math.min(this.rows - 1, Math.floor(oldY / this.cellSize)));
			var newC = Math.max(0, Math.min(this.cols - 1, Math.floor(newX / this.cellSize)));
			var newR = Math.max(0, Math.min(this.rows - 1, Math.floor(newY / this.cellSize)));
			if (oldC != newC || oldR != newR) {
				var pos = this.indexOf(this.cells[oldR][oldC], id);
				if (pos != -1) {
					var ncells = [];
					for (var i = 0; i < this.cells[oldR][oldC].length; i++) {
						if (i != pos) ncells.push(this.cells[oldR][oldC][i]);
					}
					this.cells[oldR][oldC] = [];
					this.cells[oldR][oldC] = ncells;
				}

				if (this.indexOf(this.cells[newR][newC], id) == -1) {
					this.cells[newR][newC].push(id);
				}
			}
		},
		get: function(x1, y1, x2, y2) {
			var result = [];
			var c_start = Math.max(0, Math.floor(x1 / this.cellSize));
			var c_end = Math.min(this.cols - 1, Math.floor(x2 / this.cellSize));
			var r_start = Math.max(0, Math.floor(y1 / this.cellSize));
			var r_end = Math.min(this.rows - 1, Math.floor(y2 / this.cellSize));
			for (var r = r_start; r <= r_end; r++) {
				for (var c = c_start; c <= c_end; c++) {
					for (var i = 0; i < this.cells[r][c].length; i++){
						result.push(this.cells[r][c][i]);
					}
				}
			}
			return result;
		},
		indexOf: function(cell, idx) {
			for (var i = 0, len = cell.length; i < len; i ++) {
				if (cell[i] == idx) {
					return i;
				}
			}
			return -1;
		}
	}
	qt.clear();
	return qt;
}

countFPS = {
	lastLoop: (new Date()).getMilliseconds(),
	count: 1,
	fps: 0,
	totalCount: 0,
	totalSum: 0,
	totalCountFs: 0,
	totalSumFs: 0,

	clear: function() {
		this.lastLoop = (new Date()).getMilliseconds();
		this.count = 1;
		this.fps = 60;
		this.totalCount = 0;
		this.totalSum = 0;
		this.totalCountFs = 0;
		this.totalSumFs = 0;
	},

	tick: function() {
		var currentLoop = (new Date()).getMilliseconds();
		if (this.lastLoop > currentLoop) {
			this.fps = this.count;
			this.count = 1;
			showStats();

			if (!game.fullScreen) {
				this.totalCount ++;
				this.totalSum += this.fps;
			} else {
				this.totalCountFs ++;
				this.totalSumFs += this.fps;
			}
			$('#fps').html(this.fps +' / '+ (this.totalCount > 0 ? Math.round(this.totalSum / this.totalCount) : '') +' / '+ (game.gameHiSpeedMode ? 'Hi' : 'Lo'));

			if (game.startTime > 0 && !game.gameHiSpeedModeSet && Date.now() - game.startTime >= 7000) {
				game.gameHiSpeedModeSet = true;
				game.gameHiSpeedMode = Math.round(this.totalSum / this.totalCount) > 30;
			}
			if (game.startTime > 0 && game.gameHiSpeedModeSet && game.gameHiSpeedMode && this.fps < 25) {
				game.gameHiSpeedMode = false;
			}
		} else {
			this.count ++;
		}
		this.lastLoop = currentLoop;
	

		return this.fps;
	},

	sendAnalytics: function() {
		if (this.totalCount > 0) {
			var avgFps = Math.round(this.totalSum / this.totalCount);
			StatAnalytics.send(StatAnalytics.Fps, avgFps);
		}
		if (this.totalCountFs > 0) {
			var avgFps = Math.round(this.totalSumFs / this.totalCountFs);
			StatAnalytics.send(StatAnalytics.FpsFs, avgFps);
		}
	}
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
