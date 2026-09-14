import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { state } from '../config/db.js';
import { ImageModelService } from '../services/imageModel/ImageModelService.js';
import { NodeRegistry } from '../services/playground/NodeRegistry.js';
import { RBACEngine } from '../services/security/RBACEngine.js';

const admin = { _id: 'admin-1', role: 'Admin', department: 'Engineering', name: 'Admin' };
const manager = { _id: 'manager-1', role: 'Manager', department: 'Engineering', name: 'Manager' };
const employee = { _id: 'employee-1', role: 'Employee', department: 'Engineering', name: 'Employee' };
const offlineEmployee = { _id: 'offline-1', role: 'Employee', department: 'Engineering', name: 'Offline' };

const resetState = () => {
  state.isMongooseConnected = false;
  state.memoryDb.users = [admin, manager, employee, offlineEmployee, { _id: 'other-manager', role: 'Manager', department: 'Finance', status: 'Active' }];
  state.memoryDb.networks = [{
    _id: 'network-1',
    networkId: 'lan-engineering',
    name: 'Engineering Private LAN',
    status: 'Active',
    networkKey: 'LAN-ENGINEERING-KEY',
    members: [{ userId: admin._id }, { userId: manager._id }, { userId: employee._id }]
  }];
  state.memoryDb.imageModelJobs = [];
  state.memoryDb.imageModelUploads = [];
  state.memoryDb.notifications = [];
};

const run = async () => {
  resetState();

  assert(NodeRegistry.list('Manager').some((node) => node.type === 'agent.image-model'));
  assert(!NodeRegistry.list('Manager').some((node) => node.type === 'train.image-model'));
  assert(NodeRegistry.list('Admin').some((node) => node.type === 'train.image-model'));
  assert.equal(RBACEngine.can({ role: 'Auditor' }, 'imageModel', 'analyze'), false);

  const job = await ImageModelService.train({
    user: admin,
    jobName: 'Engineering Hardware Catalog',
    department: 'Engineering',
    manualText: 'Bearing housing: stainless steel, service life 8 years.',
    samples: [{ name: 'HX Bearing', category: 'bearing', metalType: 'stainless steel', lifespan: '8 years' }]
  });
  assert.equal(job.status, 'Completed');
  assert.equal(job.catalog.length, 2);

  const deployment = await ImageModelService.deploy({ user: admin, jobId: job._id, networkId: 'lan-engineering', networkKey: 'LAN-ENGINEERING-KEY' });
  assert.equal(deployment.notificationCount, 3);
  const modelNotifications = state.memoryDb.notifications.filter((notification) => notification.type === 'IMAGE_MODEL_DEPLOYED');
  assert.deepEqual(modelNotifications.map((notification) => notification.userId).sort(), ['employee-1', 'manager-1', 'offline-1']);
  assert.equal(modelNotifications[0].title, 'New image model — explore');
  assert(modelNotifications[0].message.includes('Open Creation Playground → Image Model, then add a photo.'));
  assert.equal(modelNotifications[0].metadata.openTab, 'creation-playground');
  assert.equal(modelNotifications[0].metadata.focusNode, 'image-model');

  await assert.rejects(
    () => ImageModelService.analyze({ user: offlineEmployee, query: 'identify the part', imageBuffer: Buffer.from('not-an-image') }),
    (error) => error.status === 403 && error.requiresLanMembership === true
  );

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const upload = await ImageModelService.saveUpload({ user: manager, buffer: png, originalname: 'unknown-part.png', mimetype: 'image/png' });
  const result = await ImageModelService.analyze({ user: manager, query: 'what is this?', uploadId: upload._id });
  assert.equal(result.lanConnected, true);
  assert.equal(result.agents.imageAnalysis.features.metalType, '', 'metal must remain unknown without observed/catalog evidence');
  assert.equal(result.agents.imageAnalysis.features.lifespan, '', 'lifespan must remain unknown without observed/catalog evidence');
  assert.equal(result.agents.comparison.prediction.metalType, '');

  await fs.unlink(upload.filePath).catch(() => {});
  console.log('Image model tests passed.');
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
