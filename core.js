///
///  GameClass: ゲームの描写の補佐などを担当
///
/* global $,performance */

///静的フィールドの宣言
var game_data;
var master;

class Game {
    
    constructor(name) {
        this.game_name = name;
        master = this;
    }

    Initialize() {
        //FPSによるループを設定する
        var that = this;
        //キャンバスの設定
        var cell_w = Number(game_data.size.w); //キャンバスのドット横幅
        var cell_h = Number(game_data.size.h); //キャンバスのドット縦幅
        var window_w = Number(game_data.size.ww); //キャンバスの横比率
        var window_h = Number(game_data.size.wh); //キャンバスの縦比率
        var window_max = Number(game_data.size.max); //キャンバスの比率の最大値、設定されていないと比率をそのまま大きさとしてみる。
        
        if (window_w != undefined && window_h != undefined ) {
            if (window_max != undefined ) {
                var rw = window_w > window_h ? window_max : (window_w / window_h) * window_max;
                var rh = window_h > window_w ? window_max : (window_h / window_w) * window_max;
                that.canvas.attr("width", rw);
                that.canvas.attr("height", rh);
            }
        }
        
        //各スプライトの画像保存と登録
        //レイヤーごとに処理
        $.each(game_data.layer, function(i, l) {
            //テンプレートキャンバス
            $("body").append("<canvas id='tempCanvas' style='display: hidden'></canvas>");
            var temp_canvas = $("#tempCanvas");
            var cell_size_set = false;
            //もし幅と高さが指定してあるならここで指定した幅と高さにする。
            if (l.cell_w != undefined && l.cell_h != undefined) {
                temp_canvas.attr('width', l.cell_w * cell_w);
                temp_canvas.attr('height', l.cell_h * cell_h);
                cell_size_set = true;
            }
            //レイヤーデータを読み込む
            var sprite_pixel_map;
            $.ajax({
                url: l.file + "." + that.layer_file_extention,
                async: false,
                success: function(mapdata){
                    sprite_pixel_map = mapdata;
                }
            });
            var sprite_name = l.name;
            var next_sprite_name = sprite_name;
            var prev_sprite_name = sprite_name;
            var multiMax = 1;
            var MultiMode = true;
            //マルチモードかどうか確認
            if (l.multi != undefined)
                multiMax = l.multi;
            else
                MultiMode = false;
            //スプライトの実体を登録
            for (var multiCount = 0; multiCount < multiMax; multiCount++) {
                sprite_name = l.name;
                next_sprite_name = sprite_name;
                if (multiMax - multiCount >= 1)
                    next_sprite_name = sprite_name + (multiCount + 1).toString();
                if (multiCount > 0) {
                    prev_sprite_name = sprite_name + (multiCount - 1).toString();
                    sprite_name += multiCount.toString();
                }
                if (that.Sprites == undefined) that.Sprites = {};
                that.Sprites[sprite_name] = {
                    SpriteName    : sprite_name,
                    NextSpriteName: next_sprite_name,
                    PrevSpriteName: prev_sprite_name,
                    BaseName      : l.name,
                    IsChild       : multiCount > 0,
                    IsLast        : multiCount + 1 == multiMax,
                    FileName      : l.file + "." + that.layer_file_extention,
                    ColorData     : game_data.color,
                    CanReuse      : true,
                    MultiMode     : multiMax > 0,
                    Usage         : true,
                    ImageURL      : "",
                    PixelConfig   : {
                        CellSize: {
                            width : cell_w,
                            height: cell_h
                        }
                    },
                    Loaded        : false,
                    User          : {},
                    Draw          : function() {
                        $('canvas').drawImage({
                            source: this.ImageURL,
                            x: this.Position.LF + this.Size.Width / 2,
                            y: this.Position.TP + this.Size.Height / 2
                        });
                    },
                    Update        : function(SpriteName) {
                        
                    },
                    Next          : function() { return that.Sprites[this.NextSpriteName]; },
                    Prev          : function() { return that.Sprites[this.PrevSpriteName]; },
                    Base          : function() { return that.Sprites[this.BaseName]; },
                    Size          : {
                        Width    : 0,
                        Height   : 0,
                        RawWidth : 0,
                        RawHeight: 0
                    },
                    Position      : {
                        SpriteSize : null,
                        LF         : 0,
                        TP         : 0,
                        CX         : function() { return this.LF + this.SpriteSize.Width / 2; },
                        CY         : function() { return this.TP + this.SpriteSize.Height / 2; },
                        RT         : function() { return this.LF + this.SpriteSize.Width; },
                        BM         : function() { return this.TP + this.SpriteSize.Height; }
                    }
                };
                if (cell_size_set) {
                    that.Sprites[sprite_name].Size.RawWidth = l.cell_w;
                    that.Sprites[sprite_name].Size.RawHeight = l.cell_h;
                    that.Sprites[sprite_name].Size.RawWidth = l.cell_w * cell_w;
                    that.Sprites[sprite_name].Size.RawHeight = l.cell_h * cell_h;
                    that.Sprites[sprite_name].Position.SpriteSize = Sprite.Size;
                }
            }
            //TODO: ピクセルマップの画像をテンポラリーキャンバスに描写して画像URLを得る。
            var lines = sprite_pixel_map.split(';');
            var cx = 0, cy = 0, c = 0;
            var mw = 0, mh = 0;
            var temp_cell = [];
            $.each(lines, function(j, line) {
                if (line != "") {
                    var cells = line.split(',');
                    cx = 0;
                    $.each(cells, function(k, cell) {
                        cell = cell.replace(/\r?\n/g , "");
                        if (cell_size_set) {
                            if (game_data.color[cell] != "null") {
                                temp_canvas.drawRect({
                                    fillStyle: game_data.color[cell],
                                    x: cell_w / 2 + cx * cell_w, y: cell_h / 2 + cy * cell_h,
                                    width: cell_w, height: cell_h
                                });
                            }
                        } else {
                            //セルの登録だけ
                            if (game_data.color[cell] != "null") {
                                temp_cell.push({
                                    cell: game_data.color[cell],
                                    celx: cell_w / 2 + cx * cell_w,
                                    cely: cell_h / 2 + cy * cell_h
                                });
                            }
                        }
                        cx++; c++; mw = mw >= cx ? mw : cx;
                    });
                    cy++; mh = mh >= cy ? mh : cy;
                }
            });
            sprite_name = l.name;
            if (!cell_size_set) {
                var Sprite = that.Sprites[sprite_name];
                if (MultiMode) {
                    while (!Sprite.IsLast) {
                        Sprite.Size.RawWidth = mw;
                        Sprite.Size.RawHeight = mh;
                        Sprite.Size.Width = mw * cell_w;
                        Sprite.Size.Height = mh * cell_h;
                        Sprite.Position.SpriteSize = Sprite.Size;
                        Sprite = Sprite.Next();
                    }
                    Sprite.Size.RawWidth = mw;
                    Sprite.Size.RawHeight = mh;
                    Sprite.Size.Width = mw * cell_w;
                    Sprite.Size.Height = mh * cell_h;
                    Sprite.Position.SpriteSize = Sprite.Size;
                } else {
                    Sprite.Size.RawWidth = mw;
                    Sprite.Size.RawHeight = mh;
                    Sprite.Size.Width = mw * cell_w;
                    Sprite.Size.Height = mh * cell_h;
                    Sprite.Position.SpriteSize = Sprite.Size;
                }
                temp_canvas.attr('width', mw * cell_w);
                temp_canvas.attr('height', mh * cell_h);
                $.each(temp_cell, function(k, cell) {
                    temp_canvas.drawRect({
                        fillStyle: cell.cell,
                        x: cell.celx, y: cell.cely,
                        width: cell_w, height: cell_h
                    });
                });
            }
            //キャンバスの画像をURLにする
            var temp_src = temp_canvas.get(0).toDataURL();
            //URLを設定
            Sprite = that.Sprites[sprite_name];
            if (MultiMode) {
                while (!Sprite.IsLast) {
                    Sprite.ImageURL = temp_src;
                    Sprite.Loaded = true;
                    Sprite = Sprite.Next();
                }
                Sprite.ImageURL = temp_src;
            } else {
                Sprite.ImageURL = temp_src;
                Sprite.Loaded = true;
            }
            temp_canvas.remove();
        });
        //キーイベントの設定
        $(window).keydown(this.Game_KeyDown);
        $(window).keyup(this.Game_KeyUp);
        
        that.lasttime = that.Now;
        var mainloop = function() {
            that.UpdateGameClass();
            that.updateGame();
            that.drawGame();
        };
        var animFrame = window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame    ||
                window.oRequestAnimationFrame      ||
                window.msRequestAnimationFrame     ||
                null ;
        
        if ( animFrame !== null ) {
            var recursiveAnim = function() {
                if (that.Now - that.lasttime > that.FPS) {
                    mainloop();
                    that.lasttime = that.Now;
                }
                animFrame(recursiveAnim, that.canvas);
            };
            // start the mainloop
            animFrame(recursiveAnim, that.canvas);
        } else {
            setInterval(mainloop, that.FPS);
        }
    }
    
    get Now() {
        var now = window.performance && (
            performance.now || 
            performance.mozNow || 
            performance.msNow || 
            performance.oNow || 
            performance.webkitNow );
        return ( now && now.call( performance ) ) || ( new Date().getTime() );
    }
    
    get config() {
        if (game_data == undefined)
            return false;
        return game_data;
    }
    
    set config(file) {
        //設定を読み込む
        $.ajax({
            url: file,
            async: false,
            success: function(j){
                game_data = $.parseJSON(j);
            }
        });
        this.FPS = game_data.config.FPS;
        this.canvasName = game_data.config["canvas-name"];
        this.canvasId = "#" + game_data.config["canvas-id"];
        if (this.canvasId == undefined)
            this.canvas = $("canvas[name='" + this.canvasName + "']").get;
        else
            this.canvas = $(this.canvasId);
        this.bgcolor = game_data.config["background-color"];
        this.layer_file_extention = game_data.config["layer-file-extention"];
    }
    
    UpdateGameClass() {
        var that = this;
        this.canvas_size = {
            width: Number(that.canvas.attr('width')),
            height: Number(that.canvas.attr('height'))
        };
        $.each(that.Sprites, function(SpriteName, Sprite) {
            if (!Sprite.Update(SpriteName)) {
                Sprite.Update = function(SpriteName) {};
            }
        });
        
        this.ClearCanvas();
    }
    
    set updateFunction(fn) {
        this.updateGame = fn;
    }
    
    set drawFunction(fn) {
        this.drawGame = fn;
    }
    
    set KeyDown(fn) {
        this._KeyDown = fn;
    }
    
    set KeyUp(fn) {
        this._KeyUp = fn;
    }
    
    Game_KeyDown(KeyEventArgs) {
        if (master.PressedKey == undefined) master.PressedKey = {};
        master.PressedKey[KeyEventArgs.keyCode] = true;
        if (master._KeyDown != undefined)
            master._KeyDown(KeyEventArgs);
    }
    
    Game_KeyUp(KeyEventArgs) {
        if (master.PressedKey == undefined) this.PressedKey = {};
        master.PressedKey[KeyEventArgs.keyCode] = false;
        if (master._KeyUp != undefined)
            master._KeyUp(KeyEventArgs);
    }
    
    GetInputKeys() {
        var KeyList = {};
        $.each(game_data.keys, function(kn, kc) {
            KeyList[kc] = kn;
        });
        var PressedKeyName = [];
        $.each(master.PressedKey, function(i, IsPressed) {
            if (IsPressed)
                PressedKeyName.push(KeyList[i]);
        });
        return PressedKeyName;
    }
    
    IsKeyPressedByName(keyName) {
        var keyCode = game_data.keys[keyName];
        if (master.PressedKey == undefined)
            return false;
        if (master.PressedKey[keyCode] == undefined)
            return false;
        return master.PressedKey[keyCode];
    }
    
    IsKeyPressed(keyCode) {
        if (master.PressedKey == undefined)
            return false;
        if (master.PressedKey[keyCode] == undefined)
            return false;
        return master.PressedKey[keyCode];
    }
    
    CanSpriteDo(SpriteName) {
        if (this.Sprites[SpriteName] != undefined && this.Sprites[SpriteName].Loaded){
            return true;
        }
        return false;
    }
    
    ClearCanvas() {
        var that = this;
        this.canvas.drawRect({
            fillStyle: this.bgcolor,
            x: that.canvas_size.width / 2, y: that.canvas_size.height / 2,
            width: that.canvas_size.width, height: that.canvas_size.height
        });
    }
    
    UpdateSprite(SpriteName, fn) {
        if (this.CanSpriteDo(SpriteName)) {
            var Sprite = this.Sprites[SpriteName];
            fn(Sprite);
            Sprite.Position.LF = Math.floor(Sprite.Position.LF / Sprite.PixelConfig.CellSize.width) * Sprite.PixelConfig.CellSize.width;
            Sprite.Position.TP = Math.floor(Sprite.Position.TP / Sprite.PixelConfig.CellSize.height) * Sprite.PixelConfig.CellSize.height;
        }
    }
    
    DrawSprite(SpriteName, fn) {
        var that = this;
        if (that.CanSpriteDo(SpriteName)) {
            var Sprite = that.Sprites[SpriteName];
            that.canvas.drawImage({
                source: Sprite.ImageURL,
                x: Sprite.Position.LF + Sprite.Size.Width / 2,
                y: Sprite.Position.TP + Sprite.Size.Height / 2,
                width: Sprite.Size.Width, height: Sprite.Size.Height
            });
            if (fn != undefined)
                fn(this.Sprites[SpriteName]);
        }
    }
    
    GetSprite(SpriteName) {
        if (this.CanSpriteDo(SpriteName))
            return this.Sprites[SpriteName];
        else
            return false;
    }
    
    GetValidMultiSprite(SpriteName) {
        var that = this;
        if (that.CanSpriteDo(SpriteName)) {
            var ValidSprite = that.Sprites[SpriteName];
            while (!ValidSprite.Usage) {
                if (that.CanSpriteDo(ValidSprite.Next().SpriteName)) {
                    ValidSprite = ValidSprite.Next();
                } else {
                    break;
                }
            }
            return ValidSprite;
        }
        else
            return false;
    }
    
    GetUserProperty(SpriteName, PropName) {
        var that = this;
        if (that.CanSpriteDo(SpriteName)) {
            var Sprite = this.Sprites[SpriteName];
            return Sprite.User[PropName];
        }
        return false;
    }
    
    SetUserProperty(SpriteName, PropName, Prop) {
        var that = this;
        if (that.CanSpriteDo(SpriteName)) {
            var Sprite = this.Sprites[SpriteName];
            Sprite.User[PropName] = Prop;
        }
    }
}

class Key {
    static get LEFT() { return 37; }
    static get RIGHT() { return 39; }
    static get UP() { return 38; }
    static get DOWN() { return 40; }
    static get ENTER() { return 13; }
    static get SPACE() { return 32; }
    static get BACKSPACE() { return 8; }
    static get Z() { return 90; }
    static get X() { return 88; }
    static get A() { return 65; }
    static get D() { return 68; }
    static get W() { return 87; }
    static get S() { return 83; }
    static get Q() { return 81; }
    static get E() { return 69; }
    static get NUMPAD0() { return 96; }
    static get NUMPAD1() { return 97; }
    static get NUMPAD2() { return 98; }
    static get NUMPAD3() { return 99; }
    static get NUMPAD4() { return 100; }
    static get NUMPAD5() { return 101; }
    static get NUMPAD6() { return 102; }
    static get NUMPAD7() { return 103; }
    static get NUMPAD8() { return 104; }
    static get NUMPAD9() { return 105; }
    static get D0() { return 48; }
    static get D1() { return 49; }
    static get D2() { return 50; }
    static get D3() { return 51; }
    static get D4() { return 52; }
    static get D5() { return 53; }
    static get D6() { return 54; }
    static get D7() { return 55; }
    static get D8() { return 56; }
    static get D9() { return 57; }
}