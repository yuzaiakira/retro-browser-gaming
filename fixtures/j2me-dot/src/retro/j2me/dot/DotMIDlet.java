package retro.j2me.dot;

import javax.microedition.lcdui.Display;
import javax.microedition.midlet.MIDlet;
import javax.microedition.midlet.MIDletStateChangeException;

/** First-party MIT CLDC/MIDP Dot game for Retro Browser Gaming J2ME verification. */
public class DotMIDlet extends MIDlet {
  private DotCanvas canvas;

  protected void startApp() throws MIDletStateChangeException {
    if (canvas == null) {
      canvas = new DotCanvas();
    }
    Display.getDisplay(this).setCurrent(canvas);
  }

  protected void pauseApp() {}

  protected void destroyApp(boolean unconditional) throws MIDletStateChangeException {}
}
