# jGame
jQuery+jCanvasでドット絵のゲームを作ろうという企画。jGradiusの方で使っているスプライト操作の部分だけ

## なんだこれ

HTML5にはキャンバスというのがあって、そこにいろいろ絵とか図形を描くことができます。

それを使ってゲームをしようということです。

## じゃあこれのおかげで何ができるんだよ？

これはもともとドット絵によるゲームを作ろうと考えて作り始めたものです。

しかし、ドット絵を画像として外部から読み込んでしまうといちいちピクセル単位の移動（それっぽく見せるため）
のためにピクセルサイズを計算したり、ドット絵の拡大をした時にラスタライズがかかってぼやけたりしてしまう
ので、それを避けるためにドットをデータから読み込んで任意の大きさのピクセルサイズの画像を自動生成
してしまうものを作ろうということになりました。

それと、ゲームを作るときに必要な更新ループと描写ループを任意のFPSで実行する仕組みや、キー入力の部分の
補正をする仕組みを追加したものです。

まとめると、jGameには以下の機能がついています。

1. ドットデータからドット画像を自動生成しスプライトとして登録する。
2. FPSの制限をつけたプログラムループ（いわゆる無限ループ）
3. キー入力の補正

## そもそもjCanvasってなんぞ？

jQueryというjavascriptのプラグインのようなものがあります。しかし、HTML5のキャンバスを扱うときには
あまりjQueryのような構文が使えません。そこで、Canvasの操作をjQueryライクに操作できるようにするためのプラグインが
jCanvasというものです。

## 機能を教えてくれい。

では、使うためのチュートリアルを兼ねて手順を記述します。なお、ソースコードは
[こちら](https://github.com/DN360/jGame/blob/master/core.js)

とはいえ、説明がへたっぴなので適宜解釈をお願いしますm(_ _)m

### 1.読み込む

とりあえず、読み込まないと何も始まりませんのだ。

    <script src="jquery-1.12.4.min.js"></script>
    <script src="jcanvas.min.js"></script>
    <script src="core.js"></script>

この順番で読み込んでください。なぜならjCanvasはjQueryに依存し、core.jsはjQueryとjCanvasに依存しているソースコードだからです。
また、スクリプトコードの場所は任意で変えてください。

### 2.いろいろ設定して描写！

jGameは外部からコンフィグファイルとドットマップだけを取得します。コンフィグファイルはjson形式で
書かれていることとします。コンフィグファイルの基本構成は以下になっています。
+ color
    + リテラルリスト            …   後述
+ size  
    + w                         …   1ドットの横幅
    + h                         …   1ドットの縦幅
    + ww                        …   キャンバスの横幅比率
    + wh                        …   キャンバスの縦幅比率
    + max                       …   比率の最大サイズ、指定がないと上２つがそのままサイズとして扱われる。
+ layer 
    + [レイヤー名]              …   レイヤー名
        + name                  …   ゲームで扱われるレイヤー名(上と一緒ではなくてもよい)
        + file                  …   ドットマップのパス。拡張子を*記述しない*(あとで記述する)
        + multi                 …   たくさん描写するときに数を指定する。指定しなくても良い。
+ config
    + background-color          …   キャンバスを塗りつぶす時の色
    + FPS                       …   ゲームの実行FPS
    + layer-file-extention      …   ドットマップデータの拡張子
    + canvas-name               …   キャンバスのname属性名を指定する。
    + canvas-id                 …   キャンバスのid属性を指定する。指定されていない場合はcanvas-nameを参照して探す。

リテラルリストというのは、ドットマップの文字列とその色を関連付けるために設定するリストです。

たとえば、ドットマップには以下のように記述します

    0,0,1,1,1,1,0,0;
    0,1,0,0,0,0,1,0;
    1,0,0,0,0,0,0,1;
    1,0,0,0,0,0,0,1;
    1,1,1,1,1,1,1,1;
    1,0,0,0,0,0,0,1;
    1,0,0,0,0,0,0,1;
    1,0,0,0,0,0,0,1;
    
ドットマップは1ドットの色をこのように文字列で指定し、1行をセミコロン";"で区切ります。

サンプルの設定ファイルをみると、

    {
        "color": {
            "0": "000",
            "1": "#fff",
            ...続く...

と書かれています。これはドットマップで"0"は色"#000"、つまり黒、また"1"は色"#fff"、つまり白
で表現しろという設定となっています。このように設定ファイルに関連付けていくとドットを打つことができるわけです。

ところでドットマップについてですが改行せずに一行で記述しても構いません。（可読性は落ちますが）
core.jsのソースコードをよーく凝らしてみるとドットマップを読み込む際に単純な条件で1つ1つを判断しているのがわかるはずです。

さらに、先程から1ドットを文字列として扱うと説明しています。なので、"0"や"1"といった一文字ではなく
"foo", "bar"といった文字列も可能だということです。

さて、設定ファイルを解説したところで、ようやく次が読み込みです。

まず、HTMLファイルの方にはCanvasがあり、以下のように記述されているとします。

    <canvas name="canvas" id="canvas"></canvas>
    
これだけで十分です。サンプルの設定ファイルにはこのnameとidが設定されているのを確認してください。

つぎに、画面を読み込んだ時にゲームクラスを作成し、初期化しましょう。scriptで以下のように記述するのが望ましいです。
以下はサンプル1のスクリプトコード部分の記述です。

    <script>
        var myGame;
        $(document).ready(function() {
            myGame = new Game("myGame");
            myGame.config = "config.conf";
            myGame.updateFunction = updateGame;
            myGame.drawFunction = drawGame;
            myGame.Initialize();
        });
        
        var updateGame = function() {
            //更新
        }
        
        var drawGame = function() {
            //描写
            myGame.DrawSprite("hoge");
        }
    </script>
    
では、このコードの説明をします。

まず

    myGame = new Game("myGame");
とこのようにゲームの実体を宣言します。
次に、設定ファイル、更新メソッド、描写メソッドを追加しています。

    myGame.config = "config.conf";
    myGame.updateFunction = updateGame;
    myGame.drawFunction = drawGame;
最後に初期化しています。        

    myGame.Initialize();
描写の部分では、設定ファイルのレイヤー名を呼び出して描写しています。

    myGame.DrawSprite("hoge");
hogeは先程のドットマップなのでAの文字がでるのです。

基本的には以上です。

### 3.動かす

スプライトは動かすことができます。サンプル2では8の字回転するふの文字がでてきます。

では、コードをみてみましょう。

    var myGame;
    $(document).ready(function() {
        myGame = new Game("myGame");
        myGame.config = "config.conf";
        myGame.updateFunction = updateGame;
        myGame.drawFunction = drawGame;
        myGame.Initialize();
        myGame.SetUserProperty("fuga", "time", 0);
    });
    
    var updateGame = function() {
        //更新
        myGame.UpdateSprite("fuga", function(Sprite) {
            Sprite.User.time += 0.05;
            Sprite.Position.LF = 400 + Math.cos(Sprite.User.time) * 200 - Sprite.Size.Width / 2;
            Sprite.Position.TP = 300 + Math.sin(Sprite.User.time * 2) * 100 - Sprite.Size.Height / 2;
        });
    };
    
    var drawGame = function() {
        //描写
        myGame.DrawSprite("fuga");
    };

まず、読み込み時にこのようなプロパティが増えました。

    myGame.SetUserProperty("fuga", "time", 0);
これは、スプライトにユーザーのプロパティを設定する文です。任意ですので、好きなプロパティを当ててください。
この場合、fugaスプライトのユーザプロパティとしてtimeというプロパティを指定しました。初期値は0です。

次にupdateGameの部分です。

    myGame.UpdateSprite("fuga", function(Sprite) {
        Sprite.User.time += 0.05;
        Sprite.Position.LF = 400 + Math.cos(Sprite.User.time) * 200 - Sprite.Size.Width / 2;
        Sprite.Position.TP = 300 + Math.sin(Sprite.User.time * 2) * 100 - Sprite.Size.Height / 2;
    });
    
設定したスプライトを更新する際には、UpdateSprite関数を呼び出すことを推奨します。引数はスプライト名とコールバック関数です。
コールバック関数では、スプライトの実体がSpriteで渡されます。

スプライトに設定したユーザプロパティは

    Sprite.User.time += 0.05;
というように設定、取得ができます。この命令文の場合timeに0.05だけ加算しています。

スプライトの位置はPosition、サイズはSizeプロパティに設定されています。Positionには以下のプロパティとメソッドが設定されています。

    Position.LF             ... 左座標（プロパティ）
    Position.TP             ... 上座標（プロパティ）
    Position.RT()           ... 右座標（メソッド）
    Position.BM()           ... 下座標（メソッド）
    Position.CX()           ... 中心X座標（メソッド）
    Position.CY()           ... 中心Y座標（メソッド）
またSizeには以下のプロパティが設定されています。

    Size.Width              ... スプライトの横幅
    Size.Height             ... スプライトの縦幅
    Size.RawWidth           ... スプライトの横ドット数
    Size.RawHeight          ... スプライトの縦ドット数
スプライトの位置はUpdateSpriteを実行した場合のみ自動的に指定ピクセル単位の座標に変換されます。サイズは設定を変えないでください。

### 4.いっぱいだす。

その名の通りです。スペースキーをおすと回転するふの文字が増えます。

ではコードをみてみましょう。

    var myGame;
    $(document).ready(function() {
        myGame = new Game("myGame");
        myGame.config = "config.conf";
        myGame.updateFunction = updateGame;
        myGame.drawFunction = drawGame;
        myGame.Initialize();
        myGame.SetUserProperty("fuga", "time", 0);
        myGame.FU = [];
        myGame.FU.push("fuga");
        myGame.UpdateSprite("fuga", function(Sprite) {
            Sprite.Usage = false;
        });
    });
    
    var updateGame = function() {
        //更新
        
        if (myGame.IsKeyPressed(Key.SPACE)) {
            var nextSprite = myGame.GetValidMultiSprite("fuga");
            myGame.FU.push(nextSprite.SpriteName);
            myGame.SetUserProperty(nextSprite.SpriteName, "time", 0);
            nextSprite.Usage = false;
        }
        $.each(myGame.FU, function(i, fuganame) {
            myGame.UpdateSprite(fuganame, function(Sprite) {
                Sprite.User.time += 0.05;
                Sprite.Position.LF = 400 + Math.cos(Sprite.User.time) * 200 - Sprite.Size.Width / 2;
                Sprite.Position.TP = 300 + Math.sin(Sprite.User.time * 2) * 100 - Sprite.Size.Height / 2;
            });
        });

    };
    
    var drawGame = function() {
        //描写
        $.each(myGame.FU, function(i, fuganame) {
            myGame.DrawSprite(fuganame);
        });
    };
    
まずは初期化の部分

    myGame.FU = [];
    myGame.FU.push("fuga");
    myGame.UpdateSprite("fuga", function(Sprite) {
        Sprite.Usage = false;
    });
Gameクラスは、動的な変数を割り当てることができます。今回はどれだけの「ふ」がでているかを保持するために
FUという配列を新たに動的に確保しました。さらに、最初の「ふ」として"fuga"を登録しています。
ここで、たくさんのスプライトを登録したときにつかうのがUsageプロパティです。このUsageプロパティが
falseの間、後述するGetValidMultiSpriteで生きてきます。

さて、次にupdateGameを見てみましょう。

    if (myGame.IsKeyPressed(Key.SPACE)) {
        var nextSprite = myGame.GetValidMultiSprite("fuga");
        myGame.FU.push(nextSprite.SpriteName);
        myGame.SetUserProperty(nextSprite.SpriteName, "time", 0);
        nextSprite.Usage = false;
    }
    $.each(myGame.FU, function(i, fuganame) {
        myGame.UpdateSprite(fuganame, function(Sprite) {
            Sprite.User.time += 0.05;
            Sprite.Position.LF = 400 + Math.cos(Sprite.User.time) * 200 - Sprite.Size.Width / 2;
            Sprite.Position.TP = 300 + Math.sin(Sprite.User.time * 2) * 100 - Sprite.Size.Height / 2;
        });
    });
まず、どのキーが押されているかをキーごとに取得するのが

    myGame.IsKeyPressed(Key.SPACE)
という関数です。Keyはcore.jsの中に記述されていて、キーネームとキーコードを関連付けた
静的変数を登録しています。もし、ないのであれば勝手に追加してかまわないです。追加するには

    static get SPACE() { return 32; }
というふうに登録してください。

次に複数存在するfugaスプライトのうち使うことのできるスプライトを取得するのが

    var nextSprite = myGame.GetValidMultiSprite("fuga");
という文です。このスプライトの名前はSpriteNameというプロパティに保持されています。
初期化の時と同じように、描写するので名前を配列にpushしています。
さらに、時間を設定し使用しているとしてUsageをfalseにしています。

次に、配列に保持された名前のスプライトの位置をそれぞれの持つ時間によって変更します。

では、drawGameを見てみましょう。

    var drawGame = function() {
        //描写
        $.each(myGame.FU, function(i, fuganame) {
            myGame.DrawSprite(fuganame);
        });
    };

といっても、updateGameと同じように配列中のスプライト名のスプライトをすべて描写しているだけです。

これで大体ゲームができるはずです。~~というかここまでしか実装していない~~

## おわりに

拙い文章でしたが、ぜひ活用していただけるとありがたいです。あ、ちなみにこれどんどん改変して構いません！

こんな感じにしたぞ！とかこの機能すっきりさせたぞとかコメントくれるとうれしいです。

DN360 ©MBSOFT 2016,2016









