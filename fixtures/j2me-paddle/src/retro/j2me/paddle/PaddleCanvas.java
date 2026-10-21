package retro.j2me.paddle;

import javax.microedition.lcdui.Canvas;
import javax.microedition.lcdui.Graphics;
import javax.microedition.rms.RecordStore;
import javax.microedition.rms.RecordStoreException;

/** First-party MIT paddle arcade: move paddle, bounce ball, persist high score via RMS. */
public class PaddleCanvas extends Canvas implements Runnable {
  private int paddleX = 80;
  private int ballX = 100;
  private int ballY = 40;
  private int vx = 3;
  private int vy = 2;
  private int score = 0;
  private int high = 0;
  private boolean running = true;
  private Thread loop;
  private static final int PW = 40;
  private static final int PH = 6;
  private static final String STORE = "paddleHi";

  public PaddleCanvas() {
    loadHigh();
    loop = new Thread(this);
    loop.start();
  }

  public int getHigh() {
    return high;
  }

  public int getScore() {
    return score;
  }

  public void run() {
    while (running) {
      tick();
      repaint();
      try {
        Thread.sleep(40);
      } catch (InterruptedException e) {
        running = false;
      }
    }
  }

  public void stopLoop() {
    running = false;
  }

  private void tick() {
    int w = getWidth();
    int h = getHeight();
    ballX += vx;
    ballY += vy;
    if (ballX <= 0 || ballX >= w - 6) vx = -vx;
    if (ballY <= 0) vy = -vy;
    int py = h - 20;
    if (ballY + 6 >= py && ballY <= py + PH && ballX + 6 >= paddleX && ballX <= paddleX + PW) {
      vy = -Math.abs(vy);
      score++;
      if (score > high) {
        high = score;
        saveHigh();
      }
    }
    if (ballY > h) {
      ballY = 20;
      ballX = w / 2;
      score = 0;
    }
  }

  protected void paint(Graphics g) {
    int w = getWidth();
    int h = getHeight();
    g.setColor(0x0a1020);
    g.fillRect(0, 0, w, h);
    g.setColor(0x44aaff);
    g.fillRect(paddleX, h - 20, PW, PH);
    g.setColor(0xffcc33);
    g.fillRect(ballX, ballY, 6, 6);
    g.setColor(0xffffff);
    g.drawString("S " + score + " Hi " + high, 4, 4, Graphics.TOP | Graphics.LEFT);
  }

  protected void keyPressed(int keyCode) {
    int action = getGameAction(keyCode);
    if (action == LEFT || keyCode == KEY_NUM4) {
      paddleX = Math.max(0, paddleX - 12);
    } else if (action == RIGHT || keyCode == KEY_NUM6) {
      paddleX = Math.min(getWidth() - PW, paddleX + 12);
    }
  }

  private void loadHigh() {
    try {
      RecordStore rs = RecordStore.openRecordStore(STORE, true);
      try {
        if (rs.getNumRecords() >= 1) {
          byte[] d = rs.getRecord(1);
          if (d != null && d.length >= 4) {
            high = ((d[0] & 0xff) << 24) | ((d[1] & 0xff) << 16) | ((d[2] & 0xff) << 8) | (d[3] & 0xff);
          }
        }
      } finally {
        rs.closeRecordStore();
      }
    } catch (RecordStoreException e) {
      high = 0;
    }
  }

  private void saveHigh() {
    try {
      RecordStore rs = RecordStore.openRecordStore(STORE, true);
      try {
        byte[] d =
            new byte[] {
              (byte) ((high >> 24) & 0xff),
              (byte) ((high >> 16) & 0xff),
              (byte) ((high >> 8) & 0xff),
              (byte) (high & 0xff)
            };
        if (rs.getNumRecords() >= 1) rs.setRecord(1, d, 0, d.length);
        else rs.addRecord(d, 0, d.length);
      } finally {
        rs.closeRecordStore();
      }
    } catch (RecordStoreException e) {
      /* keep playing */
    }
  }
}
