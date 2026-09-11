import RuntimeRecord from '../../models/RuntimeRecord.js';
import { state } from '../../config/db.js';

const PERSISTED_COLLECTIONS = ['networks', 'notifications', 'workflowRequests', 'aiHandoffEvents'];

const recordIdFor = (collection, payload) => String(payload?._id || payload?.id || `${collection}_${Date.now()}`);

export class RuntimeStateStore {
  static async load() {
    if (!state.isMongooseConnected) return { loaded: false, reason: 'memory-mode' };

    const records = await RuntimeRecord.find({ collectionName: { $in: PERSISTED_COLLECTIONS } })
      .sort({ createdAt: 1 })
      .lean();
    for (const collection of PERSISTED_COLLECTIONS) {
      state.memoryDb[collection] = records
        .filter(record => record.collectionName === collection)
        .map(record => record.payload);
    }
    return { loaded: true, records: records.length };
  }

  static async upsert(collection, payload) {
    if (!state.isMongooseConnected || !PERSISTED_COLLECTIONS.includes(collection) || !payload) return null;
    return RuntimeRecord.findOneAndUpdate(
      { collectionName: collection, recordId: recordIdFor(collection, payload) },
      { collectionName: collection, recordId: recordIdFor(collection, payload), payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  }

  static persist(collection, payload) {
    return this.upsert(collection, payload).catch(() => null);
  }

  static async remove(collection, recordId) {
    if (!state.isMongooseConnected || !PERSISTED_COLLECTIONS.includes(collection)) return;
    await RuntimeRecord.deleteOne({ collectionName: collection, recordId: String(recordId) });
  }
}
