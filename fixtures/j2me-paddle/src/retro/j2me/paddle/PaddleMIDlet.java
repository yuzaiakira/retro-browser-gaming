package retro.j2me.paddle;

import javax.microedition.lcdui.Display;
import javax.microedition.midlet.MIDlet;
import javax.microedition.midlet.MIDletStateChangeException;

public class PaddleMIDlet extends MIDlet {
  private PaddleCanvas canvas;

  protected void startApp() throws MIDletStateChangeException {
    if (canvas == null) canvas = new PaddleCanvas();
    Display.getDisplay(this).setCurrent(canvas);
  }

  protected void pauseApp() {}

  protected void destroyApp(boolean unconditional) throws MIDletStateChangeException {
    if (canvas != null) canvas.stopLoop();
  }
}
