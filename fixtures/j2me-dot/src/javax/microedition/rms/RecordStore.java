package javax.microedition.rms;
public class RecordStore {
  public static RecordStore openRecordStore(String name, boolean createIfNecessary) throws RecordStoreException { return new RecordStore(); }
  public void closeRecordStore() throws RecordStoreException {}
  public int addRecord(byte[] data, int offset, int numBytes) throws RecordStoreException { return 1; }
  public void setRecord(int recordId, byte[] data, int offset, int numBytes) throws RecordStoreException {}
  public byte[] getRecord(int recordId) throws RecordStoreException { return new byte[0]; }
  public int getNumRecords() throws RecordStoreException { return 0; }
  public void deleteRecord(int recordId) throws RecordStoreException {}
  public static void deleteRecordStore(String name) throws RecordStoreException {}
}
