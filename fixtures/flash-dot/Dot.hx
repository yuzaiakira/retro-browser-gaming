/**
 * MIT Flash Dot for Ruffle engineering acceptance.
 * Controllable rectangle + score; SharedObject persistence; Space fires; R resets.
 */
import flash.display.Sprite;
import flash.display.StageAlign;
import flash.display.StageScaleMode;
import flash.events.Event;
import flash.events.KeyboardEvent;
import flash.ui.Keyboard;
import flash.net.SharedObject;
import flash.text.TextField;
import flash.text.TextFormat;

class Dot extends Sprite {
  static inline var W = 320;
  static inline var H = 240;
  static inline var PW = 24;
  static inline var PH = 24;
  static inline var SPEED = 4;
  static inline var SO_NAME = "rbg_mit_flash_dot_v1";

  var player:Sprite;
  var hud:TextField;
  var score:Int = 0;
  var px:Float = (W - PW) / 2;
  var py:Float = (H - PH) / 2;
  var left = false;
  var right = false;
  var so:SharedObject;

  static function main() {
    var stage = flash.Lib.current.stage;
    stage.align = StageAlign.TOP_LEFT;
    stage.scaleMode = StageScaleMode.NO_SCALE;
    flash.Lib.current.addChild(new Dot());
  }

  public function new() {
    super();
    // Stage is null until ADDED_TO_STAGE — do not touch stage in constructor.
    addEventListener(Event.ADDED_TO_STAGE, onAdded);
  }

  function onAdded(_:Event) {
    removeEventListener(Event.ADDED_TO_STAGE, onAdded);

    graphics.beginFill(0x1a1a2e);
    graphics.drawRect(0, 0, W, H);
    graphics.endFill();

    player = new Sprite();
    player.graphics.beginFill(0xe94560);
    player.graphics.drawRect(0, 0, PW, PH);
    player.graphics.endFill();
    addChild(player);

    hud = new TextField();
    hud.defaultTextFormat = new TextFormat("_sans", 14, 0xffffff);
    hud.width = W;
    hud.height = 40;
    hud.x = 8;
    hud.y = 8;
    hud.selectable = false;
    addChild(hud);

    so = SharedObject.getLocal(SO_NAME);
    if (so.data != null && Reflect.hasField(so.data, "score") && Reflect.hasField(so.data, "px")) {
      score = Std.int(so.data.score);
      px = so.data.px;
      py = so.data.py;
    }
    applyPos();
    paintHud();

    stage.addEventListener(KeyboardEvent.KEY_DOWN, onDown);
    stage.addEventListener(KeyboardEvent.KEY_UP, onUp);
    addEventListener(Event.ENTER_FRAME, onFrame);
  }

  function onDown(e:KeyboardEvent) {
    if (e.keyCode == Keyboard.LEFT || e.keyCode == Keyboard.A) left = true;
    if (e.keyCode == Keyboard.RIGHT || e.keyCode == Keyboard.D) right = true;
    if (e.keyCode == Keyboard.SPACE || e.keyCode == Keyboard.ENTER) {
      score += 1;
      persist();
      paintHud();
    }
    if (e.keyCode == Keyboard.R) {
      score = 0;
      px = (W - PW) / 2;
      py = (H - PH) / 2;
      applyPos();
      persist();
      paintHud();
    }
  }

  function onUp(e:KeyboardEvent) {
    if (e.keyCode == Keyboard.LEFT || e.keyCode == Keyboard.A) left = false;
    if (e.keyCode == Keyboard.RIGHT || e.keyCode == Keyboard.D) right = false;
  }

  function onFrame(_:Event) {
    var moved = false;
    if (left) {
      px -= SPEED;
      moved = true;
    }
    if (right) {
      px += SPEED;
      moved = true;
    }
    if (px < 0) px = 0;
    if (px > W - PW) px = W - PW;
    if (moved) {
      applyPos();
      persist();
      paintHud();
    }
  }

  function applyPos() {
    player.x = px;
    player.y = py;
  }

  function persist() {
    so.data.score = score;
    so.data.px = px;
    so.data.py = py;
    so.flush();
  }

  function paintHud() {
    hud.text = "MIT Flash Dot  score=" + score + "  x=" + Std.int(px) + "  (Arrows/Space, R=reset)";
  }
}
