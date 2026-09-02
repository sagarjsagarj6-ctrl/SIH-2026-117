import bcrypt from 'bcryptjs';
import { state } from './config/db.js';
import User from './models/User.js';
import Department from './models/Department.js';
import Model from './models/Model.js';
import KnowledgeDoc from './models/KnowledgeDoc.js';
import FineTuneJob from './models/FineTuneJob.js';
import AuditLog from './models/AuditLog.js';

export const seedInitialData = async () => {
  try {
    console.log('[Seed] Initializing enterprise seed dataset...');

    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('Admin@123', salt);
    const managerPass = await bcrypt.hash('Manager@123', salt);
    const empPass = await bcrypt.hash('Emp@123', salt);

    // Initial Users
    const seedUsers = [
      {
        name: 'System Admin',
        email: 'admin@sovereign.local',
        password: adminPass,
        role: 'Admin',
        department: 'Executive & Strategy',
        assignedAIProfile: 'Advanced',
        status: 'Active'
      },
      {
        name: 'Elena Vance (Finance Mgr)',
        email: 'manager.finance@sovereign.local',
        password: managerPass,
        role: 'Manager',
        department: 'Finance & Accounting',
        assignedAIProfile: 'Balanced',
        status: 'Active'
      },
      {
        name: 'Dr. Marcus Vance (R&D Lead)',
        email: 'employee.rd@sovereign.local',
        password: empPass,
        role: 'Employee',
        department: 'R&D / Engineering',
        assignedAIProfile: 'Advanced',
        status: 'Active'
      },
      {
        name: 'Sarah Connor (HR Specialist)',
        email: 'employee.hr@sovereign.local',
        password: empPass,
        role: 'Employee',
        department: 'Human Resources',
        assignedAIProfile: 'Fast',
        status: 'Active'
      },
      {
        name: 'David Sterling (Legal Director)',
        email: 'manager.legal@sovereign.local',
        password: managerPass,
        role: 'Manager',
        department: 'Legal & Compliance',
        assignedAIProfile: 'Balanced',
        status: 'Active'
      }
    ];

    // Initial Departments
    const seedDepartments = [
      {
        name: 'Finance & Accounting',
        code: 'FIN',
        description: 'Financial ledger, audit reports, quarterly filings, and payroll analytics.',
        securityLevel: 'Restricted',
        allowedAgents: ['RAG', 'DATA_SCIENCE', 'REPORTING'],
        memberCount: 8
      },
      {
        name: 'Legal & Compliance',
        code: 'LGL',
        description: 'Enterprise contracts, IP patents, regulatory compliance, and governance policies.',
        securityLevel: 'Top-Secret',
        allowedAgents: ['RAG', 'VISION', 'REPORTING'],
        memberCount: 5
      },
      {
        name: 'R&D / Engineering',
        code: 'RND',
        description: 'Source code repositories, product blueprints, hardware schematics, and AI research.',
        securityLevel: 'Confidential',
        allowedAgents: ['RAG', 'DATA_SCIENCE', 'VISION', 'REPORTING'],
        memberCount: 14
      },
      {
        name: 'Human Resources',
        code: 'HR',
        description: 'Employee records, talent acquisition, performance reviews, and compensation plans.',
        securityLevel: 'Restricted',
        allowedAgents: ['RAG', 'REPORTING'],
        memberCount: 6
      },
      {
        name: 'Executive & Strategy',
        code: 'EXEC',
        description: 'Board presentations, merger proposals, enterprise roadmap, and system governance.',
        securityLevel: 'Top-Secret',
        allowedAgents: ['RAG', 'DATA_SCIENCE', 'VISION', 'REPORTING'],
        memberCount: 3
      }
    ];

    // Initial Local AI Models
    const seedModels = [
      {
        name: 'Llama-3-8B-Instruct (Quantized)',
        version: 'v3.1.4',
        type: 'LLM',
        parameters: '8B',
        quantization: 'Q4_K_M',
        vramRequiredGB: 4.5,
        contextWindow: 8192,
        status: 'Active',
        tpsBench: 94.2,
        latencyMs: 82
      },
      {
        name: 'Mistral-7B-v0.3-Enterprise',
        version: 'v0.3.1',
        type: 'LLM',
        parameters: '7B',
        quantization: 'Q8_0',
        vramRequiredGB: 7.8,
        contextWindow: 16384,
        status: 'Active',
        tpsBench: 72.5,
        latencyMs: 110
      },
      {
        name: 'DeepSeek-R1-Distill-Qwen-14B',
        version: 'v1.0.2',
        type: 'LLM',
        parameters: '14B',
        quantization: 'Q4_K_S',
        vramRequiredGB: 9.6,
        contextWindow: 32768,
        status: 'Active',
        tpsBench: 58.1,
        latencyMs: 165
      },
      {
        name: 'Llama-3.3-70B-Instruct-AirGap',
        version: 'v3.3.0',
        type: 'LLM',
        parameters: '70B',
        quantization: 'Q4_K_M',
        vramRequiredGB: 18.5,
        contextWindow: 65536,
        status: 'Active',
        tpsBench: 34.0,
        latencyMs: 290
      },
      {
        name: 'NVIDIA-NeMo-Embed-Enterprise',
        version: 'v2.1',
        type: 'Embedding',
        parameters: '1.2B',
        quantization: 'FP16',
        vramRequiredGB: 2.2,
        contextWindow: 4096,
        status: 'Active',
        tpsBench: 450.0,
        latencyMs: 12
      },
      {
        name: 'Qwen2-VL-7B-VisionOCR',
        version: 'v2.0',
        type: 'Vision',
        parameters: '7B',
        quantization: 'Q4_K',
        vramRequiredGB: 6.4,
        contextWindow: 8192,
        status: 'Active',
        tpsBench: 48.0,
        latencyMs: 210
      }
    ];

    // Initial Knowledge Documents
    const seedDocs = [
      {
        title: 'Q3 Enterprise Financial Risk Audit',
        category: 'Financial Ledger',
        department: 'Finance & Accounting',
        fileType: 'PDF',
        sensitivity: 'Confidential',
        snippet: 'Summary of quarterly revenue variance, capital expenditure audit, and local tax compliance checks across regional divisions.',
        tokenCount: 1840,
        vectorIndexed: true,
        uploadedBy: 'Elena Vance'
      },
      {
        title: 'Corporate Intellectual Property & Patent Filings 2026',
        category: 'Legal Portfolio',
        department: 'Legal & Compliance',
        fileType: 'PDF',
        sensitivity: 'Top Secret',
        snippet: 'Comprehensive index of patent claims, air-gap software licenses, and non-disclosure governance terms for enterprise AI deployment.',
        tokenCount: 3200,
        vectorIndexed: true,
        uploadedBy: 'David Sterling'
      },
      {
        title: 'Air-Gapped Sovereign AI System Architecture Specs',
        category: 'Technical Schematic',
        department: 'R&D / Engineering',
        fileType: 'Markdown',
        sensitivity: 'Confidential',
        snippet: 'Technical specification for local LAN cluster orchestration, vLLM acceleration endpoints, and CUDA memory management.',
        tokenCount: 2450,
        vectorIndexed: true,
        uploadedBy: 'Dr. Marcus Vance'
      },
      {
        title: 'Enterprise Employee Compensation & Benefit Guidelines',
        category: 'HR Policy',
        department: 'Human Resources',
        fileType: 'DOCX',
        sensitivity: 'Restricted',
        snippet: 'Annual salary bands, remote work allowances, healthcare benefit structures, and employee performance review criteria.',
        tokenCount: 1600,
        vectorIndexed: true,
        uploadedBy: 'Sarah Connor'
      },
      {
        title: 'Sovereign AI Security Governance Charter',
        category: 'Enterprise Policy',
        department: 'All',
        fileType: 'PDF',
        sensitivity: 'Internal',
        snippet: 'Mandatory enterprise safety protocol prohibiting external cloud data transmission. Specifies zero-trust RBAC/ABAC rules.',
        tokenCount: 2100,
        vectorIndexed: true,
        uploadedBy: 'System Admin'
      }
    ];

    // Initial Fine-Tune Jobs
    const seedJobs = [
      {
        jobName: 'Finance_Domain_QLoRA_v2',
        baseModel: 'Mistral-7B-v0.3-Enterprise',
        department: 'Finance & Accounting',
        datasetName: 'Financial_Ledgers_2024_2025.jsonl',
        method: 'QLoRA',
        epochs: 3,
        learningRate: '2e-4',
        status: 'Completed',
        progressPercent: 100,
        currentLoss: 0.42
      },
      {
        jobName: 'Legal_Contract_Analysis_LoRA',
        baseModel: 'DeepSeek-R1-Distill-Qwen-14B',
        department: 'Legal & Compliance',
        datasetName: 'NDA_Patent_Corpus_v1.jsonl',
        method: 'LoRA',
        epochs: 5,
        learningRate: '1e-4',
        status: 'Training',
        progressPercent: 64,
        currentLoss: 0.89
      }
    ];

    // Initial Audit Logs
    const seedAuditLogs = [
      {
        userName: 'System Admin',
        role: 'Admin',
        department: 'Executive & Strategy',
        action: 'SYSTEM_BOOTSTRAP',
        resource: 'Air-Gap Cluster Manager',
        status: 'SUCCESS',
        ipAddress: '10.0.4.102',
        details: 'Air-gapped server initialized. Local MongoDB & GPU drivers connected successfully.'
      },
      {
        userName: 'Elena Vance (Finance Mgr)',
        role: 'Manager',
        department: 'Finance & Accounting',
        action: 'AGENT_EXECUTION_RAG',
        resource: 'Finance Knowledge Index',
        status: 'SUCCESS',
        ipAddress: '10.0.4.115',
        details: 'Executed RAG search query: "Q3 revenue variance audit summary"'
      },
      {
        userName: 'Sarah Connor (HR Specialist)',
        role: 'Employee',
        department: 'Human Resources',
        action: 'CROSS_DEPARTMENT_ACCESS_BLOCKED',
        resource: '/api/documents/finance-restricted',
        status: 'DENIED',
        ipAddress: '10.0.4.142',
        details: 'User from Human Resources denied access to Restricted Finance ledger'
      }
    ];

    if (state.isMongooseConnected) {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        await User.insertMany(seedUsers);
        await Department.insertMany(seedDepartments);
        await Model.insertMany(seedModels);
        await KnowledgeDoc.insertMany(seedDocs);
        await FineTuneJob.insertMany(seedJobs);
        await AuditLog.insertMany(seedAuditLogs);
        console.log('[Seed] MongoDB successfully populated with enterprise seed datasets!');
      } else {
        console.log('[Seed] MongoDB already contains user records. Skipping overwrite.');
      }
    } else {
      // In-Memory Populator
      if (state.memoryDb.users.length === 0) {
        state.memoryDb.users = seedUsers.map((u, i) => ({ _id: `usr_seed_${i+1}`, ...u }));
        state.memoryDb.departments = seedDepartments.map((d, i) => ({ _id: `dept_seed_${i+1}`, ...d }));
        state.memoryDb.models = seedModels.map((m, i) => ({ _id: `model_seed_${i+1}`, ...m }));
        state.memoryDb.knowledgeDocs = seedDocs.map((doc, i) => ({ _id: `doc_seed_${i+1}`, createdAt: new Date(), ...doc }));
        state.memoryDb.fineTuneJobs = seedJobs.map((j, i) => ({ _id: `job_seed_${i+1}`, createdAt: new Date(), ...j }));
        state.memoryDb.auditLogs = seedAuditLogs.map((a, i) => ({ _id: `audit_seed_${i+1}`, timestamp: new Date(), ...a }));
        console.log('[Seed] In-Memory DB populated with enterprise demo accounts and data!');
      }
    }
  } catch (err) {
    console.error('[Seed Error]', err);
  }
};
