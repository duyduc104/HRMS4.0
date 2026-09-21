const sequelize = require('../config/database');
const Department = require('./Department');
const Employee = require('./Employee');
const Attendance = require('./Attendance');
const Leave = require('./Leave');
const Payroll = require('./Payroll');
const Salary = require('./Salary');
const KPI = require('./KPI');
const AdvanceRequest = require('./AdvanceRequest');

const Role = require('./Role');
const EmployeeRole = require('./EmployeeRole');
const WebFilterRule = require('./WebFilterRule');
const WebAccessLog = require('./WebAccessLog');
const RuleExemption = require('./RuleExemption');
const RoleExtensionRequirement = require('./RoleExtensionRequirement');
const EmployeeExtensionRequirement = require('./EmployeeExtensionRequirement');
const ExtensionHeartbeat = require('./ExtensionHeartbeat');
const Message = require('./Message');
const AttendanceExplanation = require('./AttendanceExplanation');
const TelegramAccount = require('./TelegramAccount');
const Setting = require('./Setting');
const ScheduledEvent = require('./ScheduledEvent');
const OnboardingRecord = require('./OnboardingRecord');
const PolicyDocument = require('./PolicyDocument');
const MenuItem = require('./MenuItem');
const SecurityViolation = require('./SecurityViolation');
const Document = require('./Document');
const DocumentCategory = require('./DocumentCategory');

// Define Relationships
Employee.hasOne(OnboardingRecord, { foreignKey: 'employeeId', as: 'onboarding' });
OnboardingRecord.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.hasMany(PolicyDocument, { foreignKey: 'createdById', as: 'createdPolicies' });
PolicyDocument.belongsTo(Employee, { foreignKey: 'createdById', as: 'createdBy' });

Employee.hasMany(PolicyDocument, { foreignKey: 'contactEmployeeId', as: 'contactPolicies' });
PolicyDocument.belongsTo(Employee, { foreignKey: 'contactEmployeeId', as: 'contactPerson' });

Employee.hasMany(Document, { foreignKey: 'senderId', as: 'sentDocuments' });
Document.belongsTo(Employee, { foreignKey: 'senderId', as: 'sender' });

DocumentCategory.hasMany(Document, { foreignKey: 'categoryId', as: 'documents' });
Document.belongsTo(DocumentCategory, { foreignKey: 'categoryId', as: 'category' });

DocumentCategory.hasMany(DocumentCategory, { as: 'children', foreignKey: 'parentId' });
DocumentCategory.belongsTo(DocumentCategory, { as: 'parent', foreignKey: 'parentId' });

Employee.belongsToMany(Role, { through: EmployeeRole, foreignKey: 'employeeId', as: 'roles' });
Role.belongsToMany(Employee, { through: EmployeeRole, foreignKey: 'roleId', as: 'employees' });

Employee.hasMany(Attendance, { foreignKey: 'employeeId', as: 'attendances' });
Attendance.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.hasMany(Leave, { foreignKey: 'employeeId', as: 'leaves' });
Leave.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.hasMany(Payroll, { foreignKey: 'employeeId', as: 'payrolls' });
Payroll.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.hasOne(Salary, { foreignKey: 'employeeId', as: 'salaryInfo' });
Salary.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.hasOne(TelegramAccount, { foreignKey: 'employeeId', as: 'telegramAccount' });
TelegramAccount.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.hasMany(KPI, { foreignKey: 'employeeId', as: 'kpis' });
KPI.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.hasMany(AdvanceRequest, { foreignKey: 'employeeId', as: 'advanceRequests' });
AdvanceRequest.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// Web Filter Relationships
WebFilterRule.belongsToMany(Employee, { through: RuleExemption, as: 'exemptedEmployees', foreignKey: 'ruleId' });
Employee.belongsToMany(WebFilterRule, { through: RuleExemption, as: 'exemptedRules', foreignKey: 'employeeId' });

Employee.hasMany(WebAccessLog, { foreignKey: 'employeeId', as: 'accessLogs' });
WebAccessLog.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// Extension Requirement Relationships (Separate Tables)
Role.hasOne(RoleExtensionRequirement, { foreignKey: 'roleId', as: 'extensionRequirement' });
RoleExtensionRequirement.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

Employee.hasOne(EmployeeExtensionRequirement, { foreignKey: 'employeeId', as: 'extensionRequirement' });
EmployeeExtensionRequirement.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// Message Relationships
Message.belongsTo(Message, { as: 'replyTo', foreignKey: 'replyToId' });
Message.hasMany(Message, { as: 'replies', foreignKey: 'replyToId' });

// Attendance Explanation Relationships
Employee.hasMany(AttendanceExplanation, { foreignKey: 'employeeId', as: 'explanations' });
AttendanceExplanation.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// Scheduled Events Relationships
Employee.hasMany(ScheduledEvent, { foreignKey: 'creatorId', as: 'scheduledEvents' });
ScheduledEvent.belongsTo(Employee, { foreignKey: 'creatorId', as: 'creator' });

// Security Violation Relationships
Employee.hasMany(SecurityViolation, { foreignKey: 'employeeId', as: 'securityViolations' });
SecurityViolation.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

module.exports = {
  sequelize,
  Department,
  Employee,
  Attendance,
  Leave,
  Payroll,
  Salary,
  KPI,
  Role,
  EmployeeRole,
  WebFilterRule,
  WebAccessLog,
  RuleExemption,
  RoleExtensionRequirement,
  EmployeeExtensionRequirement,
  ExtensionHeartbeat,
  Message,
  AttendanceExplanation,
  TelegramAccount,
  Setting,
  ScheduledEvent,
  AdvanceRequest,
  OnboardingRecord,
  PolicyDocument,
  MenuItem,
  SecurityViolation,
  Document,
  DocumentCategory
};
