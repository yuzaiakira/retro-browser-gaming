package java.lang;

public class Thread {
  private final Runnable target;

  public Thread(Runnable target) {
    this.target = target;
  }

  public void start() {
    // Stub for javac only; js2me supplies Thread at runtime.
  }

  public static void sleep(long ms) throws InterruptedException {
    if (ms < 0) throw new InterruptedException();
  }
}
