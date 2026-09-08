/**
 * ModelRegistry — Enhanced Local Model Registry with warm/cold state tracking,
 * health status, and auto-rotation.
 */

import { state } from '../../config/db.js';
import Model from '../../models/Model.js';

export class ModelRegistry {
  static async getAllModels() {
    if (state.isMongooseConnected) {
      return Model.find().sort({ name: 1 });
    }
    return state.memoryDb.models || [];
  }

  static async getActiveModels() {
    const models = await this.getAllModels();
    return models.filter(m => m.status === 'Active');
  }

  static async getModelByName(name) {
    const models = await this.getAllModels();
    return models.find(m => m.name.toLowerCase() === name.toLowerCase()) || null;
  }

  static async updateModelHealth(name, { healthStatus, latencyMs, errorRate }) {
    if (state.isMongooseConnected) {
      const model = await Model.findOne({ name });
      if (model) {
        if (healthStatus) model.healthStatus = healthStatus;
        if (latencyMs) {
          model.latencyMs = latencyMs;
          model.avgLatency = Math.round((model.avgLatency + latencyMs) / 2);
        }
        if (errorRate !== undefined) model.errorRate = errorRate;
        model.lastHealthCheck = new Date();
        await model.save();
        return model;
      }
    } else {
      const model = (state.memoryDb.models || []).find(m => m.name.toLowerCase() === name.toLowerCase());
      if (model) {
        if (healthStatus) model.healthStatus = healthStatus;
        if (latencyMs) {
          model.latencyMs = latencyMs;
          model.avgLatency = Math.round(((model.avgLatency || 120) + latencyMs) / 2);
        }
        if (errorRate !== undefined) model.errorRate = errorRate;
        model.lastHealthCheck = new Date();
        return model;
      }
    }
    return null;
  }
}
