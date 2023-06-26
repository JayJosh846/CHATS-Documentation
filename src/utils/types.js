const AclRoles = {
  SuperAdmin: 1,
  GodMode: 2,
  NgoAdmin: 3,
  NgoSubAdmin: 4,
  FieldAgent: 5,
  Vendor: 6,
  Beneficiary: 7,
  Donor: 8,
  Guest: 9
};

const OrgRoles = {
  Admin: 'admin',
  SubAdmin: 'subadmin',
  FieldAgent: 'fieldagent',
  Vendor: 'vendor',
  Member: 'member'
};

const OrgAdminRolesToAcl = {
  admin: AclRoles.NgoAdmin,
  subadmin: AclRoles.NgoSubAdmin,
  fieldagent: AclRoles.FieldAgent
};

const BeneficiarySource = {
  beneficiary: 'beneficiary app',
  agent: 'field app'
};

module.exports = {
  AclRoles,
  OrgRoles,
  OrgAdminRolesToAcl,
  BeneficiarySource
};
