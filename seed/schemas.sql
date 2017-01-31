CREATE TABLE roles (
  id UUID PRIMARY KEY,
  owner_id varchar(255),
  owner_type varchar(255),
  name varchar(255),
  active boolean
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  permission VARCHAR(255),
  active BOOLEAN
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY,
  role_id UUID REFERENCES roles,
  permission_id UUID REFERENCES permissions
);

CREATE TABLE entity_roles (
  id UUID PRIMARY KEY,
  entity_id VARCHAR(255),
  entity_type VARCHAR(50),
  role_id UUID REFERENCES roles,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE entity_permissions (
  id UUID PRIMARY KEY,
  entity_id VARCHAR(255),
  entity_type VARCHAR(50),
  target_id VARCHAR(50),
  target_type VARCHAR(50),
  permission_id UUID REFERENCES permissions,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE templates (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations,
  name VARCHAR(255),
  content TEXT,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  password_hash VARCHAR(255),
  name VARCHAR(255),
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE memberships (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations,
  user_id UUID REFERENCES users
);