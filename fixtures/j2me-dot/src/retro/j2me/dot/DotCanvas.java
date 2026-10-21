package retro.j2me.dot;

import javax.microedition.lcdui.Canvas;
import javax.microedition.lcdui.Graphics;
import javax.microedition.rms.RecordStore;
import javax.microedition.rms.RecordStoreException;

/**
 * First-party MIT Dot MIDlet canvas: move a square, fire increments score, RMS persists score.
 */
public class DotCanvas extends Canvas {
  private int x = 40;
  private int y = 60;
  private int score = 0;
  private static final int SIZE = 12;
  private static final int STEP = 8;
  private static final String STORE = "dotScore";

  public DotCanvas() {
    loadScore();
  }

  public int getScore() {
    return score;
  }

  protected void paint(Graphics g) {
    int w = getWidth();
    int h = getHeight();
    g.setColor(0x101820);
    g.fillRect(0, 0, w, h);
    g.setColor(0x33cc66);
    g.fillRect(x, y, SIZE, SIZE);
    g.setColor(0xffffff);
    g.drawString("Score " + score, 4, 4, Graphics.TOP | Graphics.LEFT);
    g.drawString("2/4/6/8 move 5 fire", 4, h - 16, Graphics.TOP | Graphics.LEFT);
  }

  protected void keyPressed(int keyCode) {
    int action = getGameAction(keyCode);
    if (action == UP || keyCode == KEY_NUM2) {
      y = Math.max(0, y - STEP);
    } else if (action == DOWN || keyCode == KEY_NUM8) {
      y = Math.min(getHeight() - SIZE, y + STEP);
    } else if (action == LEFT || keyCode == KEY_NUM4) {
      x = Math.max(0, x - STEP);
    } else if (action == RIGHT || keyCode == KEY_NUM6) {
      x = Math.min(getWidth() - SIZE, x + STEP);
    } else if (action == FIRE || keyCode == KEY_NUM5) {
      score++;
      saveScore();
    }
    repaint();
  }

  private void loadScore() {
    try {
      RecordStore rs = RecordStore.openRecordStore(STORE, true);
      try {
        if (rs.getNumRecords() >= 1) {
          byte[] data = rs.getRecord(1);
          if (data != null && data.length >= 4) {
            score =
                ((data[0] & 0xff) << 24)
                    | ((data[1] & 0xff) << 16)
                    | ((data[2] & 0xff) << 8)
                    | (data[3] & 0xff);
          }
        }
      } finally {
        rs.closeRecordStore();
      }
    } catch (RecordStoreException e) {
      score = 0;
    }
  }

  private void saveScore() {
    try {
      RecordStore rs = RecordStore.openRecordStore(STORE, true);
      try {
        byte[] data =
            new byte[] {
              (byte) ((score >> 24) & 0xff),
              (byte) ((score >> 16) & 0xff),
              (byte) ((score >> 8) & 0xff),
              (byte) (score & 0xff)
            };
        if (rs.getNumRecords() >= 1) {
          rs.setRecord(1, data, 0, data.length);
        } else {
          rs.addRecord(data, 0, data.length);
        }
      } finally {
        rs.closeRecordStore();
      }
    } catch (RecordStoreException e) {
      // keep playing even if persistence fails
    }
  }
}
