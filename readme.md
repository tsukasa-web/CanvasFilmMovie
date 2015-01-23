#CanvasFilmMovie

##概要

canvasを用いて手回しフィルムムービーを再現するjQueryプラグインです。横幅がぴったりでない時に途切れるのは仕様です。
あらかじめcanvasの大きさを計算して固定しておくと防げます。
イージングにjquery-easingを使用していますので、事前にjquery-easingを読み込んでおく必要があります。

**近似値を取る仕様のため、以下のイージングには対応していません。**

- easeInBack
- easeOutBack
- easeInOutBack
- easeInElastic
- easeOutElastic
- easeInOutElastic
- easeInBounce
- easeOutBounce
- easeInOutBounce

[jquery-easing](http://gsgd.co.uk/sandbox/jquery/easing/)

##UPDATE

- **2014.11.10** プロトタイプ作成
- **2014.11.14** Sprite分割読み込み機能追加（targetImgObjがtargetImgArrayに変更されました！）
- **2014.11.14** イージング機能付加
- **2015.01.08** 配布用に調整、サンプル追加

##使い方

あらかじめ使用するスプライト画像を別軸でloadする必要があります。

###loadの記述例

    url = "img/sprite.png";
    ImgData = new Image();
    ImgData.onload = (function() {
    	//処理内容を記述
    });
    ImgData.src = url;

##記述

第一引数でオプションを設定します。

###例(上記のload記述例のコメント部分に入る形になります)

	var targetCanvas = $('#film-canvas-parent');
	targetCanvas.CanvasFilmMovie({
		acTime : 3,
		acEasing : $.easing.easeInSine,
		deTime : 2,
		deEasing : $.easing.easeOutSine,
		offsetValue : 1,
		targetImgArray: [ImgData],
		sceneWidth: 240,
		sceneHeight: 296
	});
	FilmMovie = targetCanvas.data('CanvasFilmMovie');

- **acTime**：フィルムの最大速度到達時間（秒）です。default値は3です。
- **acEasing**：加速のイージングです。default値は$.easing.easeInSineです。[イージング一覧](http://easings.net/ja)
- **deTime**：フィルムの停止到達時間（秒）です。default値は2です。
- **decelaration**：減速のイージングです。default値は$.easing.easeOutSineです。[イージング一覧](http://easings.net/ja)
- **deEasing**：スピードMAX時のフィルムの移動方向・速度（正は右、負は逆）です。0だと静止した状態になります。
- **targetImgArray**：必須のオプションです。loadが終了したImageを格納した配列を渡します。配列順に結合されます。
- **sceneWidth**：必須のオプションです。読み込むスプライト画像の一つのシーンの横幅です。今回サンプルで使っているsprite.pngを見ていただければわかりやすいと思います。
- **sceneHeight**：必須のオプションです。読み込むスプライト画像の一つのシーンの縦幅です。今回サンプルで使っているsprite.pngを見ていただければわかりやすいと思います。
- **fps**：１秒あたりのコマ数になります。default値は30です。

##メソッド

###上記の記述例に合わせた形で書いています。

	FilmMovie.drawLoopSpeedUp();

ムービーの移動エフェクトをスタートして加速させます。最高速度に達すると加速が止まります。

	FilmMovie.drawLoopSpeedDown();

ムービーの移動エフェクトを減速します。速度が0になると停止します。

	FilmMovie.drawLoopStart();

ムービーの移動エフェクトを再開します。スピードが残っている状態ではこのメソッド自体はスピードの加減速は行いません。停止前のスピードが適用されます。しかし、止まった状態でスタートさせるとSpeedUpと同じ加速状態になります。

	FilmMovie.drawLoopStop();

ムービーの移動エフェクトを一時停止します。このメソッド自体はスピードの加減速は行いません。スピードは保存されたままです。

	FilmMovie.spriteClear();

canvasを初期化します。

	FilmMovie.changeFps(60);

動的にfpsを変更します。