package retro.j2me.notes;

import javax.microedition.lcdui.Command;
import javax.microedition.lcdui.CommandListener;
import javax.microedition.lcdui.Display;
import javax.microedition.lcdui.Displayable;
import javax.microedition.lcdui.Form;
import javax.microedition.lcdui.StringItem;
import javax.microedition.lcdui.TextField;
import javax.microedition.midlet.MIDlet;
import javax.microedition.midlet.MIDletStateChangeException;
import javax.microedition.rms.RecordStore;
import javax.microedition.rms.RecordStoreException;

/**
 * First-party MIT Notes MIDlet: Form + TextField + Save command, persist note text in RMS.
 * Single OK softkey so classic phones map Save without a multi-command menu.
 */
public class NotesMIDlet extends MIDlet implements CommandListener {
  private Form form;
  private TextField field;
  private StringItem status;
  private Command saveCmd;
  private Command clearCmd;
  private static final String STORE = "notesBody";

  protected void startApp() throws MIDletStateChangeException {
    if (form == null) {
      form = new Form("Notes");
      field = new TextField("Note", "", 64, TextField.ANY);
      status = new StringItem("Status", "ready");
      saveCmd = new Command("Save", Command.OK, 1);
      clearCmd = new Command("Clear", Command.BACK, 2);
      form.append(field);
      form.append(status);
      form.addCommand(saveCmd);
      form.addCommand(clearCmd);
      form.setCommandListener(this);
      loadNote();
    }
    Display.getDisplay(this).setCurrent(form);
  }

  protected void pauseApp() {}

  protected void destroyApp(boolean unconditional) throws MIDletStateChangeException {}

  public void commandAction(Command c, Displayable d) {
    if (c == saveCmd) {
      saveNote();
      status.setText("saved");
    } else if (c == clearCmd) {
      field.setString("");
      status.setText("cleared");
    }
  }

  private void loadNote() {
    try {
      RecordStore rs = RecordStore.openRecordStore(STORE, true);
      try {
        if (rs.getNumRecords() >= 1) {
          byte[] data = rs.getRecord(1);
          if (data != null) {
            char[] chars = new char[data.length];
            for (int i = 0; i < data.length; i++) {
              chars[i] = (char) (data[i] & 0xff);
            }
            field.setString(new String(chars));
          }
        }
      } finally {
        rs.closeRecordStore();
      }
    } catch (RecordStoreException e) {
      status.setText("load-err");
    }
  }

  private void saveNote() {
    try {
      String text = field.getString();
      if (text == null) text = "";
      byte[] data = new byte[text.length()];
      for (int i = 0; i < text.length(); i++) {
        data[i] = (byte) (text.charAt(i) & 0xff);
      }
      RecordStore rs = RecordStore.openRecordStore(STORE, true);
      try {
        if (rs.getNumRecords() >= 1) rs.setRecord(1, data, 0, data.length);
        else rs.addRecord(data, 0, data.length);
      } finally {
        rs.closeRecordStore();
      }
    } catch (RecordStoreException e) {
      status.setText("save-err");
    }
  }
}
