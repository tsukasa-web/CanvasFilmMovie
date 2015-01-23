###
  CanvasFilmMovie
  Copyright(c) 2015 SHIFTBRAIN - Tsukasa Tokura
  This software is released under the MIT License.
  http://opensource.org/licenses/mit-license.php
###

class CanvasFilmMovie
  defaults : 
    acTime : 3 #フィルムの最大速度到達時間
    acEasing : $.easing.easeInSine #加速のEasing
    deTime : 2 #フィルムの停止到達時間
    deEasing : $.easing.easeOutSine #減速のEasing
    offsetValue : 1 #MAX時の移動方向・速度（正は右、負は逆）
    targetImgArray : [] #使用画像が格納された配列
    sceneWidth : false #読み込んだ画像の1シーンの横幅
    sceneHeight : false #読み込んだ画像の1シーンの縦幅
    fps : 30 #1秒あたりのコマ数

  constructor : (_$targetParent, options) ->
    #optionのマージ
    @options = $.extend {}, @defaults, options

    @imgWidth = null #読み込んだ画像の全体横幅
    @imgHeight = null #読み込んだ画像の全体縦幅
    @canvasPointArray = [] #canvs上の各パネル座標を格納する配列
    @imgPointArray = [] #読み込んだ画像の各シーンの座標を格納する配列
    @canvasPanelWidth = null #canvasのパネルの横幅
    @canvasXPanelNum = null #canvasの横のパネル数
    @imgPanelresizedWidth = null #canvasの高さに合わせて画像の1シーンを拡縮した際の横幅
    @imgXPanelNum = null #読み込んだ画像の横のシーン数
    @imgYPanelNum = null #読み込んだ画像の縦のシーン数

    @acSpeedArray = [] #フレーム分割した加速度を格納する配列
    @deSpeedArray = [] #フレーム分割した減速度を格納する配列
    @currentFrame = 0 #現在のフレーム位置
    @vector = 1 #反転のフラグ

    @nowSpeed = 0 #現在の速度
    @stopping = false #減速中かどうかのフラグ
    @isDrawed = false #パネルが埋まっているかどうかのフラグ
    @$targetParent = _$targetParent #canvasの親になる生成先
    @canvas = null
    @ctx = null

    @requestId = null #RAFに使用するID
    @setTimerId = null #Timeoutに使用するID
    @fpsInterval = 1000 / @options.fps #RAFのfps調整に使用するフレーム間隔の変数
    @timeLog = Date.now() #RAFのfps調整に使用する変数

    #RAFの宣言（fallback付）
    @requestAnimationFrame =
      (window.requestAnimationFrame and window.requestAnimationFrame.bind(window)) or
      (window.webkitRequestAnimationFrame and window.webkitRequestAnimationFrame.bind(window)) or
      (window.mozRequestAnimationFrame and window.mozRequestAnimationFrame.bind(window)) or
      (window.oRequestAnimationFrame and window.oRequestAnimationFrame.bind(window)) or
      (window.msRequestAnimationFrame and window.msRequestAnimationFrame.bind(window)) or
      (callback,element) ->
        @setTimerId = window.setTimeout(callback, 1000 / 60)

    #キャンセル用RAFの宣言（fallback付）
    @cancelAnimationFrame =
      (window.cancelAnimationFrame and window.cancelAnimationFrame.bind(window)) or
      (window.webkitCancelAnimationFrame and window.webkitCancelAnimationFrame.bind(window)) or
      (window.mozCancelAnimationFrame and window.mozCancelAnimationFrame.bind(window)) or
      (window.oCancelAnimationFrame and window.oCancelAnimationFrame.bind(window)) or
      (window.msCancelAnimationFrame and window.msCancelAnimationFrame.bind(window)) or
      (callback,element) ->
        window.clearTimeout(@setTimerId)

    #初期処理
    @_init()

  _init: ->
    #渡されたImgArrayが空、中のImgがロードされてない、中のImgがそもそも渡されていないとエラー
    if @options.targetImgArray.length is 0
      console.error('Image Array is empty.')
      return false
    for i in [0...@options.targetImgArray.length]
      if @options.targetImgArray[i].width is 0 or !@options.targetImgArray[i]
        console.error('Image not loaded.')
        return false

    #オプションにシーンの横幅と縦幅がないとエラー
    if @options.sceneWidth is false or @options.sceneHeight is false
      console.error('Input Scene Size.')
      return false

    #canvasの生成、contextの宣言
    @$targetParent.append('<canvas class="canvas-film-sprite"></canvas>')
    @canvas = @$targetParent.find('.canvas-film-sprite')[0]
    @ctx = @canvas.getContext("2d")
    @_canvasResize()

    #liquid対応のリサイズイベント登録
    $(window).on('resize', @_debounce(
      ()=> @_canvasResize()
    ,300))
    return

  #canvasのリサイズ関数
  _canvasResize: =>
    parentWidth = @$targetParent.width()
    parentHeight = @$targetParent.height()

    $(@canvas).attr({'width':parentWidth,'height':parentHeight})
    #座標の計算
    @_createCuttPoint(@options.targetImgObject)

    #isDrawedなら最初から再描画、タイマーが回ってなければとりあえず再描画
    if @isDrawed
      if @nowSpeed >= @canvasPanelWidth
        @nowSpeed = @canvasPanelWidth

    if !@requestId
      @_setSpriteImg()

    @_calculateSpeed()
    return

  #実行回数の間引き
  _debounce: (func, threshold, execAsap) ->
    timeout = null
    (args...) ->
      obj = this
      delayed = ->
        func.apply(obj, args) unless execAsap
        timeout = null
        return
      if timeout
        clearTimeout(timeout)
      else if (execAsap)
        func.apply(obj, args)
      timeout = setTimeout delayed, threshold || 100

  #スピードフレームの計算
  _calculateSpeed: ->
    #フレーム分割した加速度の配列作成
    @acSpeedArray = []
    #（fps*到達までの時間）で全体フレーム数を算出
    max = @options.fps * @options.acTime - 1
    for i in [0..max]
      @acSpeedArray[i] = @options.acEasing 0, i, 0, @canvasPanelWidth - @options.offsetValue, max

    #フレーム分割した減速度の配列作成
    @deSpeedArray = []
    #（fps*到達までの時間）で全体フレーム数を算出
    max = @options.fps * @options.deTime - 1
    for i in [0..max]
      @deSpeedArray[i] = @options.deEasing 0, max - i, 0, @canvasPanelWidth - @options.offsetValue, max

    #console.log @acSpeedArray
    #console.log @deSpeedArray
    return

  #各種幅や座標の計算
  _createCuttPoint: ->
    canvasWidth = @canvas.width
    canvasHeight = @canvas.height

    #console.log('canvas width = ' + canvasWidth)
    #console.log('canvas height = ' + canvasHeight)

    @canvasPanelWidth = @imgPanelresizedWidth = Math.ceil(@options.sceneWidth*(canvasHeight / @options.sceneHeight))
    @canvasXPanelNum = Math.ceil(canvasWidth / @imgPanelresizedWidth)

    #console.log('canvas scene width = ' + @canvasPanelWidth)
    #console.log('canvas scene height = ' + canvasHeight)

    #targetImgArrayからイメージの座標を結合して一つの配列を作る
    if @imgPointArray.length is 0
      for i in [0...@options.targetImgArray.length]
        partsPointArray = @_imgPointPush(@options.targetImgArray[i])
        for i in [0...partsPointArray.length]
          @imgPointArray.push(partsPointArray[i])
    #console.log(@imgPointArray)
    @canvasPointArray = @_canvasPointPush()

    #console.log('canvasの横一列パネル数（はみ出てるのも含め） = ' + @canvasPointArray.length)
    #console.log('動画のシーン画像の数 = ' + @imgPointArray.length)

    return

  #canvas座標配列を返す関数
  _canvasPointPush: ->
    pointArray = []

    for i in [0...@imgPointArray.length]
      pointArray.push({x:i * @canvasPanelWidth, y:0})
    #console.log(pointArray)
    return pointArray

  #シーン座標配列を返す関数
  _imgPointPush: (targetImg)->
    imgWidth = targetImg.width
    imgHeight = targetImg.height
    imgXPanelNum = Math.ceil(imgWidth / @options.sceneWidth)
    imgYPanelNum = Math.ceil(imgHeight / @options.sceneHeight)
    pointArray = []
    nowPoint = 0

    for i in [0...imgYPanelNum]

      for i2 in [0...imgXPanelNum]
        pointArray.push({x:i2 * @options.sceneWidth, y:nowPoint, img:targetImg})

        if i2 is imgXPanelNum-1
          nowPoint += @options.sceneHeight

    #console.log(pointArray)
    return pointArray

  #スプライトの描画関数
  _setSpriteImg: ->
    #console.log('Single draw')
    @isDrawed = true

    for i in [0...@canvasPointArray.length]
      @ctx.drawImage(
        @imgPointArray[i].img
        @imgPointArray[i].x
        @imgPointArray[i].y
        @options.sceneWidth
        @options.sceneHeight
        @canvasPointArray[i].x
        @canvasPointArray[i].y
        @canvasPanelWidth
        @canvas.height
      )
    return

  #スプライトの描画関数
  _drawSpriteImg: ->
    #RAFのフレーム調整
    now = Date.now()
    elapsed = now - @timeLog
    if elapsed > @fpsInterval
      @timeLog = now - (elapsed % @fpsInterval)

      #------------ここからEasingの計算-----------------
      if @stopping
        if @vector > 0
          @vector = -1

          if @currentFrame < @acSpeedArray.length
            val = @acSpeedArray[@currentFrame]
            for v, i in @deSpeedArray
              if val >= v
                @currentFrame = i
                break
          else
            @currentFrame = 0

        @currentFrame = @deSpeedArray.length - 1 if @currentFrame >= @deSpeedArray.length
        @nowSpeed = @deSpeedArray[@currentFrame]

        if @nowSpeed == 0
          @vector = 1
          @nowSpeed = 0
          @currentFrame = 0
          @stopping = false
          @drawLoopStop()
          return

      else
        if @vector < 0
          @vector = 1

          if @currentFrame < @deSpeedArray.length
            val = @deSpeedArray[@currentFrame]
            for v, i in @acSpeedArray
              if val <= v
                @currentFrame = i
                break
          else
            @currentFrame = @acSpeedArray.length - 1

        @currentFrame = @acSpeedArray.length - 1 if @currentFrame >= @acSpeedArray.length
        @nowSpeed = @acSpeedArray[@currentFrame]

      @currentFrame++
      #------------ここまでEasingの計算-----------------

      #位置の計算
      for i in [0...@canvasPointArray.length]
        @canvasPointArray[i].x -= @nowSpeed

      #計算後の位置ではみ出ているものは後ろの位置へ移動し、描画
      for i in [0...@canvasPointArray.length]
        if @canvasPointArray[i].x <= -(@canvasPanelWidth)
          if i is 0
            @canvasPointArray[i].x = @canvasPointArray[@canvasPointArray.length-1].x + @canvasPanelWidth
            #console.log('before panel = ' + @canvasPointArray[@canvasPointArray.length-1][0])
          else
            @canvasPointArray[i].x = @canvasPointArray[i-1].x + @canvasPanelWidth
            #console.log('before panel = ' + @canvasPointArray[i-1][0])
          #console.log('this panel = ' + @canvasPointArray[i][0])

        if @canvasPointArray[i].x > -(@canvasPanelWidth) and @canvasPointArray[i].x < @canvas.width
          @ctx.drawImage(
            @imgPointArray[i].img
            @imgPointArray[i].x
            @imgPointArray[i].y
            @options.sceneWidth
            @options.sceneHeight
            @canvasPointArray[i].x
            @canvasPointArray[i].y
            @canvasPanelWidth
            @canvas.height
          )
    return

  #描画ループを加速
  drawLoopSpeedUp: =>
    #console.log('Loop Start + Speed Up')
    @stopping = false
    if !@requestId
      @_drawLoop()
    return

  #描画ループを減速
  drawLoopSpeedDown: =>
    #console.log('Loop Start + Speed Down')
    @stopping = true
    return

  #描画ループをスタート（加減速はしない）
  drawLoopStart: =>
    #console.log('Loop Start')
    if !@requestId
      @_drawLoop()
    return

  #描画ループをストップ
  drawLoopStop: =>
    #console.log('Loop Stop')
    if @requestId
      @cancelAnimationFrame(@requestId)
      @requestId = null
    return

  #ループ関数
  _drawLoop: =>
    @requestId = @requestAnimationFrame(@_drawLoop)
    @_drawSpriteImg()
    return

  #canvasの初期化
  spriteClear: =>
    #console.log('sprite clear')
    @isDrawed = true
    @ctx.clearRect(0, 0, @canvas.width, @canvas.height)
    return

  #fpsの変更
  changeFps: (_changeFps) =>
    if _changeFps isnt @options.fps
      #console.log('change Fps = ' + _changeFps)
      @options.fps = _changeFps
      @fpsInterval = 1000 / @options.fps
      @_calculateSpeed()
    return

$.fn.CanvasFilmMovie = (options) ->
  @each (i, el) ->
    $el = $(el)
    FilmMovie = new CanvasFilmMovie $el, options
    $el.data 'CanvasFilmMovie', FilmMovie