/*
  CanvasFilmMovie
  Copyright(c) 2015 SHIFTBRAIN - Tsukasa Tokura
  This software is released under the MIT License.
  http://opensource.org/licenses/mit-license.php
 */
var CanvasFilmMovie,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __slice = [].slice;

CanvasFilmMovie = (function() {
  CanvasFilmMovie.prototype.defaults = {
    acTime: 3,
    acEasing: $.easing.easeInSine,
    deTime: 2,
    deEasing: $.easing.easeOutSine,
    offsetValue: 1,
    targetImgArray: [],
    sceneWidth: false,
    sceneHeight: false,
    fps: 30
  };

  function CanvasFilmMovie(_$targetParent, options) {
    this.changeFps = __bind(this.changeFps, this);
    this.spriteClear = __bind(this.spriteClear, this);
    this._drawLoop = __bind(this._drawLoop, this);
    this.drawLoopStop = __bind(this.drawLoopStop, this);
    this.drawLoopStart = __bind(this.drawLoopStart, this);
    this.drawLoopSpeedDown = __bind(this.drawLoopSpeedDown, this);
    this.drawLoopSpeedUp = __bind(this.drawLoopSpeedUp, this);
    this._canvasResize = __bind(this._canvasResize, this);
    this.options = $.extend({}, this.defaults, options);
    this.imgWidth = null;
    this.imgHeight = null;
    this.canvasPointArray = [];
    this.imgPointArray = [];
    this.canvasPanelWidth = null;
    this.canvasXPanelNum = null;
    this.imgPanelresizedWidth = null;
    this.imgXPanelNum = null;
    this.imgYPanelNum = null;
    this.acSpeedArray = [];
    this.deSpeedArray = [];
    this.currentFrame = 0;
    this.vector = 1;
    this.nowSpeed = 0;
    this.stopping = false;
    this.isDrawed = false;
    this.$targetParent = _$targetParent;
    this.canvas = null;
    this.ctx = null;
    this.requestId = null;
    this.setTimerId = null;
    this.fpsInterval = 1000 / this.options.fps;
    this.timeLog = Date.now();
    this.requestAnimationFrame = (window.requestAnimationFrame && window.requestAnimationFrame.bind(window)) || (window.webkitRequestAnimationFrame && window.webkitRequestAnimationFrame.bind(window)) || (window.mozRequestAnimationFrame && window.mozRequestAnimationFrame.bind(window)) || (window.oRequestAnimationFrame && window.oRequestAnimationFrame.bind(window)) || (window.msRequestAnimationFrame && window.msRequestAnimationFrame.bind(window)) || function(callback, element) {
      return this.setTimerId = window.setTimeout(callback, 1000 / 60);
    };
    this.cancelAnimationFrame = (window.cancelAnimationFrame && window.cancelAnimationFrame.bind(window)) || (window.webkitCancelAnimationFrame && window.webkitCancelAnimationFrame.bind(window)) || (window.mozCancelAnimationFrame && window.mozCancelAnimationFrame.bind(window)) || (window.oCancelAnimationFrame && window.oCancelAnimationFrame.bind(window)) || (window.msCancelAnimationFrame && window.msCancelAnimationFrame.bind(window)) || function(callback, element) {
      return window.clearTimeout(this.setTimerId);
    };
    this._init();
  }

  CanvasFilmMovie.prototype._init = function() {
    var i, _i, _ref;
    if (this.options.targetImgArray.length === 0) {
      console.error('Image Array is empty.');
      return false;
    }
    for (i = _i = 0, _ref = this.options.targetImgArray.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      if (this.options.targetImgArray[i].width === 0 || !this.options.targetImgArray[i]) {
        console.error('Image not loaded.');
        return false;
      }
    }
    if (this.options.sceneWidth === false || this.options.sceneHeight === false) {
      console.error('Input Scene Size.');
      return false;
    }
    this.$targetParent.append('<canvas class="canvas-film-sprite"></canvas>');
    this.canvas = this.$targetParent.find('.canvas-film-sprite')[0];
    this.ctx = this.canvas.getContext("2d");
    this._canvasResize();
    $(window).on('resize', this._debounce((function(_this) {
      return function() {
        return _this._canvasResize();
      };
    })(this), 300));
  };

  CanvasFilmMovie.prototype._canvasResize = function() {
    var parentHeight, parentWidth;
    parentWidth = this.$targetParent.width();
    parentHeight = this.$targetParent.height();
    $(this.canvas).attr({
      'width': parentWidth,
      'height': parentHeight
    });
    this._createCuttPoint(this.options.targetImgObject);
    if (this.isDrawed) {
      if (this.nowSpeed >= this.canvasPanelWidth) {
        this.nowSpeed = this.canvasPanelWidth;
      }
    }
    if (!this.requestId) {
      this._setSpriteImg();
    }
    this._calculateSpeed();
  };

  CanvasFilmMovie.prototype._debounce = function(func, threshold, execAsap) {
    var timeout;
    timeout = null;
    return function() {
      var args, delayed, obj;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      obj = this;
      delayed = function() {
        if (!execAsap) {
          func.apply(obj, args);
        }
        timeout = null;
      };
      if (timeout) {
        clearTimeout(timeout);
      } else if (execAsap) {
        func.apply(obj, args);
      }
      return timeout = setTimeout(delayed, threshold || 100);
    };
  };

  CanvasFilmMovie.prototype._calculateSpeed = function() {
    var i, max, _i, _j;
    this.acSpeedArray = [];
    max = this.options.fps * this.options.acTime - 1;
    for (i = _i = 0; 0 <= max ? _i <= max : _i >= max; i = 0 <= max ? ++_i : --_i) {
      this.acSpeedArray[i] = this.options.acEasing(0, i, 0, this.canvasPanelWidth - this.options.offsetValue, max);
    }
    this.deSpeedArray = [];
    max = this.options.fps * this.options.deTime - 1;
    for (i = _j = 0; 0 <= max ? _j <= max : _j >= max; i = 0 <= max ? ++_j : --_j) {
      this.deSpeedArray[i] = this.options.deEasing(0, max - i, 0, this.canvasPanelWidth - this.options.offsetValue, max);
    }
  };

  CanvasFilmMovie.prototype._createCuttPoint = function() {
    var canvasHeight, canvasWidth, i, partsPointArray, _i, _j, _ref, _ref1;
    canvasWidth = this.canvas.width;
    canvasHeight = this.canvas.height;
    this.canvasPanelWidth = this.imgPanelresizedWidth = Math.ceil(this.options.sceneWidth * (canvasHeight / this.options.sceneHeight));
    this.canvasXPanelNum = Math.ceil(canvasWidth / this.imgPanelresizedWidth);
    if (this.imgPointArray.length === 0) {
      for (i = _i = 0, _ref = this.options.targetImgArray.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        partsPointArray = this._imgPointPush(this.options.targetImgArray[i]);
        for (i = _j = 0, _ref1 = partsPointArray.length; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
          this.imgPointArray.push(partsPointArray[i]);
        }
      }
    }
    this.canvasPointArray = this._canvasPointPush();
  };

  CanvasFilmMovie.prototype._canvasPointPush = function() {
    var i, pointArray, _i, _ref;
    pointArray = [];
    for (i = _i = 0, _ref = this.imgPointArray.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      pointArray.push({
        x: i * this.canvasPanelWidth,
        y: 0
      });
    }
    return pointArray;
  };

  CanvasFilmMovie.prototype._imgPointPush = function(targetImg) {
    var i, i2, imgHeight, imgWidth, imgXPanelNum, imgYPanelNum, nowPoint, pointArray, _i, _j;
    imgWidth = targetImg.width;
    imgHeight = targetImg.height;
    imgXPanelNum = Math.ceil(imgWidth / this.options.sceneWidth);
    imgYPanelNum = Math.ceil(imgHeight / this.options.sceneHeight);
    pointArray = [];
    nowPoint = 0;
    for (i = _i = 0; 0 <= imgYPanelNum ? _i < imgYPanelNum : _i > imgYPanelNum; i = 0 <= imgYPanelNum ? ++_i : --_i) {
      for (i2 = _j = 0; 0 <= imgXPanelNum ? _j < imgXPanelNum : _j > imgXPanelNum; i2 = 0 <= imgXPanelNum ? ++_j : --_j) {
        pointArray.push({
          x: i2 * this.options.sceneWidth,
          y: nowPoint,
          img: targetImg
        });
        if (i2 === imgXPanelNum - 1) {
          nowPoint += this.options.sceneHeight;
        }
      }
    }
    return pointArray;
  };

  CanvasFilmMovie.prototype._setSpriteImg = function() {
    var i, _i, _ref;
    this.isDrawed = true;
    for (i = _i = 0, _ref = this.canvasPointArray.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      this.ctx.drawImage(this.imgPointArray[i].img, this.imgPointArray[i].x, this.imgPointArray[i].y, this.options.sceneWidth, this.options.sceneHeight, this.canvasPointArray[i].x, this.canvasPointArray[i].y, this.canvasPanelWidth, this.canvas.height);
    }
  };

  CanvasFilmMovie.prototype._drawSpriteImg = function() {
    var elapsed, i, now, v, val, _i, _j, _k, _l, _len, _len1, _ref, _ref1, _ref2, _ref3;
    now = Date.now();
    elapsed = now - this.timeLog;
    if (elapsed > this.fpsInterval) {
      this.timeLog = now - (elapsed % this.fpsInterval);
      if (this.stopping) {
        if (this.vector > 0) {
          this.vector = -1;
          if (this.currentFrame < this.acSpeedArray.length) {
            val = this.acSpeedArray[this.currentFrame];
            _ref = this.deSpeedArray;
            for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
              v = _ref[i];
              if (val >= v) {
                this.currentFrame = i;
                break;
              }
            }
          } else {
            this.currentFrame = 0;
          }
        }
        if (this.currentFrame >= this.deSpeedArray.length) {
          this.currentFrame = this.deSpeedArray.length - 1;
        }
        this.nowSpeed = this.deSpeedArray[this.currentFrame];
        if (this.nowSpeed === 0) {
          this.vector = 1;
          this.nowSpeed = 0;
          this.currentFrame = 0;
          this.stopping = false;
          this.drawLoopStop();
          return;
        }
      } else {
        if (this.vector < 0) {
          this.vector = 1;
          if (this.currentFrame < this.deSpeedArray.length) {
            val = this.deSpeedArray[this.currentFrame];
            _ref1 = this.acSpeedArray;
            for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
              v = _ref1[i];
              if (val <= v) {
                this.currentFrame = i;
                break;
              }
            }
          } else {
            this.currentFrame = this.acSpeedArray.length - 1;
          }
        }
        if (this.currentFrame >= this.acSpeedArray.length) {
          this.currentFrame = this.acSpeedArray.length - 1;
        }
        this.nowSpeed = this.acSpeedArray[this.currentFrame];
      }
      this.currentFrame++;
      for (i = _k = 0, _ref2 = this.canvasPointArray.length; 0 <= _ref2 ? _k < _ref2 : _k > _ref2; i = 0 <= _ref2 ? ++_k : --_k) {
        this.canvasPointArray[i].x -= this.nowSpeed;
      }
      for (i = _l = 0, _ref3 = this.canvasPointArray.length; 0 <= _ref3 ? _l < _ref3 : _l > _ref3; i = 0 <= _ref3 ? ++_l : --_l) {
        if (this.canvasPointArray[i].x <= -this.canvasPanelWidth) {
          if (i === 0) {
            this.canvasPointArray[i].x = this.canvasPointArray[this.canvasPointArray.length - 1].x + this.canvasPanelWidth;
          } else {
            this.canvasPointArray[i].x = this.canvasPointArray[i - 1].x + this.canvasPanelWidth;
          }
        }
        if (this.canvasPointArray[i].x > -this.canvasPanelWidth && this.canvasPointArray[i].x < this.canvas.width) {
          this.ctx.drawImage(this.imgPointArray[i].img, this.imgPointArray[i].x, this.imgPointArray[i].y, this.options.sceneWidth, this.options.sceneHeight, this.canvasPointArray[i].x, this.canvasPointArray[i].y, this.canvasPanelWidth, this.canvas.height);
        }
      }
    }
  };

  CanvasFilmMovie.prototype.drawLoopSpeedUp = function() {
    this.stopping = false;
    if (!this.requestId) {
      this._drawLoop();
    }
  };

  CanvasFilmMovie.prototype.drawLoopSpeedDown = function() {
    this.stopping = true;
  };

  CanvasFilmMovie.prototype.drawLoopStart = function() {
    if (!this.requestId) {
      this._drawLoop();
    }
  };

  CanvasFilmMovie.prototype.drawLoopStop = function() {
    if (this.requestId) {
      this.cancelAnimationFrame(this.requestId);
      this.requestId = null;
    }
  };

  CanvasFilmMovie.prototype._drawLoop = function() {
    this.requestId = this.requestAnimationFrame(this._drawLoop);
    this._drawSpriteImg();
  };

  CanvasFilmMovie.prototype.spriteClear = function() {
    this.isDrawed = true;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  CanvasFilmMovie.prototype.changeFps = function(_changeFps) {
    if (_changeFps !== this.options.fps) {
      this.options.fps = _changeFps;
      this.fpsInterval = 1000 / this.options.fps;
      this._calculateSpeed();
    }
  };

  return CanvasFilmMovie;

})();

$.fn.CanvasFilmMovie = function(options) {
  return this.each(function(i, el) {
    var $el, FilmMovie;
    $el = $(el);
    FilmMovie = new CanvasFilmMovie($el, options);
    return $el.data('CanvasFilmMovie', FilmMovie);
  });
};